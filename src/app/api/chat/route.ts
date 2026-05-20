import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getCharacterById, generateSystemPrompt, UserMemory, IMAGE_TRIGGER_KEYWORDS } from '@/lib/characters';
import { promptCache, hashKey } from '@/lib/cache';
import { withAuth } from '@/lib/auth/api-auth';
import { db, conversations, messages, userMemories, profiles, characterFavorability } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
import { getLevelFromScore, applyDelta, didLevelChange, FavorabilityData } from '@/lib/favorability';
import { findMatchingBranch, detectUserEmotion, computeCharacterEmotion, generateEmotionPromptFragment, extractTopics } from '@/lib/dialogue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanReplyContent(content: string): string {
  let cleaned = content;
  cleaned = cleaned.replace(/（[^）]*）/g, '');
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  cleaned = cleaned.replace(/\*[^*]+\*/g, '');
  cleaned = cleaned.replace(/【[^】]*】/g, '');
  cleaned = cleaned.replace(/\[MEMORY:\s*[^\]]+\]/g, '');
  cleaned = cleaned.replace(/\[IMAGE:\s*[^\]]+\]/g, '');
  cleaned = cleaned.replace(/\[AFFECTION:\s*[^\]]+\]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^[，。、；：！？\s]+/, '');
  cleaned = cleaned.replace(/[，。、；：！？\s]+$/, '');
  return cleaned;
}

export { cleanReplyContent };

export const POST = withAuth(async (request, _context, userId) => {
  try {
    const { characterId, userMessage, conversationId } = await request.json();

    if (!characterId || !userMessage || !conversationId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const character = getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: '角色不存在' }, { status: 400 });
    }

    const [conv] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv || conv.userId !== userId) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    const dbMessages = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(30);

    const recentMessages = dbMessages.reverse();

    const memRows = await db.select()
      .from(userMemories)
      .where(eq(userMemories.conversationId, conversationId));
    const memoryMap: Record<string, string> = {};
    for (const row of memRows) {
      memoryMap[row.key] = row.value;
    }
    const userMemory = memoryMap as unknown as UserMemory;

    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (profile?.displayName && !userMemory.name) {
      userMemory.name = profile.displayName;
    }

    // 查询好感度
    const [favRow] = await db.select()
      .from(characterFavorability)
      .where(and(eq(characterFavorability.userId, userId), eq(characterFavorability.characterId, characterId)))
      .limit(1);
    const favScore = favRow?.score ?? 0;
    const favLevel = getLevelFromScore(favScore);

    await db.insert(messages).values({
      conversationId,
      role: 'user',
      content: userMessage,
    });

    const newRoundNumber = conv.roundNumber + 1;
    await db.update(conversations)
      .set({ roundNumber: newRoundNumber, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    const hasKeywordTrigger = IMAGE_TRIGGER_KEYWORDS.some(keyword =>
      userMessage.includes(keyword)
    );

    const llmMessagesList = recentMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

    // Emotion & dialogue branch system
    const userEmotion = detectUserEmotion(userMessage);
    const defaultEmotion = { type: 'neutral' as const, intensity: 0, cause: '', timestamp: Date.now() };
    const characterEmotion = computeCharacterEmotion(characterId, userEmotion, favScore, defaultEmotion);
    const emotionFragment = generateEmotionPromptFragment(characterEmotion, characterId);

    const topics = extractTopics(llmMessagesList);
    const matchedBranch = findMatchingBranch(characterId, userMessage, favScore, characterEmotion.type, newRoundNumber, topics, []);

    let branchFragment = '';
    if (matchedBranch) {
      const templates = matchedBranch.replyTemplates;
      branchFragment = `\n### 当前对话情境\n根据当前对话氛围，参考以下回复方向（但不要生硬照搬）：
${templates.map(t => `- "${t}"`).join('\n')}`;
    }

    // Favorability style description
    const favStyle = character.favorabilityStyles?.find(s =>
      favScore >= s.minScore && favScore <= s.maxScore
    );
    let favStyleFragment = '';
    if (favStyle) {
      favStyleFragment = `\n### 当前称呼方式\n对用户的称呼：${favStyle.addressForm}\n对话态度：${favStyle.styleDescription}`;
    }

    const promptCacheKey = hashKey(characterId, JSON.stringify(userMemory), String(newRoundNumber), String(hasKeywordTrigger), String(favScore), userEmotion, matchedBranch?.id ?? '');
    let systemPrompt = promptCache.get(promptCacheKey);
    if (!systemPrompt) {
      systemPrompt = generateSystemPrompt(character, userMemory, newRoundNumber, hasKeywordTrigger, favScore, favLevel.name);
      // Append emotion, branch, and favorability style fragments
      systemPrompt += emotionFragment + branchFragment + favStyleFragment;
      promptCache.set(promptCacheKey, systemPrompt);
    }

    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...llmMessagesList,
    ];

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const encoder = new TextEncoder();
    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(llmMessages, {
            temperature: 0.8,
            model: 'doubao-seed-1-8-251228'
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`));
            }
          }

          const memoryMatch = fullContent.match(/\[MEMORY:\s*(\w+)=([^\]]+)\]/);
          const imageMatch = fullContent.match(/\[IMAGE:\s*([^\]]+)\]/);
          const affectionMatch = fullContent.match(/\[AFFECTION:\s*([+-]\d+)(?:\s+([^\]]+))?\]/);

          if (memoryMatch) {
            const [, key, value] = memoryMatch;
            await db.insert(userMemories).values({
              conversationId,
              key,
              value: value.trim(),
            }).onConflictDoUpdate({
              target: [userMemories.conversationId, userMemories.key],
              set: { value: value.trim() },
            });
          }

          // 处理好感度变化
          let newFavScore = favScore;
          let favDelta = 0;
          let favReason: string | null = null;
          if (affectionMatch) {
            favDelta = parseInt(affectionMatch[1]);
            favReason = affectionMatch[2]?.trim() ?? null;
            newFavScore = applyDelta(favScore, favDelta);
            await db.insert(characterFavorability).values({
              userId,
              characterId,
              score: newFavScore,
            }).onConflictDoUpdate({
              target: [characterFavorability.userId, characterFavorability.characterId],
              set: { score: newFavScore, updatedAt: new Date() },
            });
          }

          const cleanContent = cleanReplyContent(fullContent);

          await db.insert(messages).values({
            conversationId,
            role: 'assistant',
            content: cleanContent,
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            content: cleanContent,
            hasImage: !!imageMatch,
            imagePrompt: imageMatch ? imageMatch[1].trim() : null,
            favorability: {
              score: newFavScore,
              delta: favDelta,
              level: getLevelFromScore(newFavScore),
              levelChanged: didLevelChange(favScore, newFavScore),
              reason: favReason,
            } as FavorabilityData,
            emotion: characterEmotion,
            branchId: matchedBranch?.id ?? null,
          })}\n\n`));

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: '生成回复时出错' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
});
