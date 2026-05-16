import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getCharacterById, generateSystemPrompt, UserMemory, Message, IMAGE_TRIGGER_KEYWORDS } from '@/lib/characters';
import { promptCache, hashKey } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 对话上下文存储（简单内存存储，刷新后清空）
const conversationStore = new Map<string, { messages: Message[], memory: UserMemory, roundNumber: number }>();

/**
 * 清理回复中的动作描述和特殊标记
 * 用于TTS语音生成和最终显示
 */
function cleanReplyContent(content: string): string {
  let cleaned = content;
  
  // 1. 移除动作描述（先保存特殊指令）
  // 移除中文括号内的动作描述：（微笑）、（叹气）等
  cleaned = cleaned.replace(/（[^）]*）/g, '');
  // 移除英文括号内的动作描述：(smile)、(sigh)等
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  // 移除星号包裹的动作描述：*微笑*、*叹气*等
  cleaned = cleaned.replace(/\*[^*]+\*/g, '');
  // 移除【】内的动作描述（但要保留[IMAGE:...]和[MEMORY:...]）
  cleaned = cleaned.replace(/【[^】]*】/g, '');
  
  // 2. 移除系统指令标记
  cleaned = cleaned.replace(/\[MEMORY:\s*[^\]]+\]/g, '');
  cleaned = cleaned.replace(/\[IMAGE:\s*[^\]]+\]/g, '');
  
  // 3. 清理多余空白
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // 4. 清理开头结尾的标点符号问题
  cleaned = cleaned.replace(/^[，。、；：！？\s]+/, '');
  cleaned = cleaned.replace(/[，。、；：！？\s]+$/, '');
  
  return cleaned;
}

// 导出清理函数供TTS使用
export { cleanReplyContent };

export async function POST(request: NextRequest) {
  try {
    const { characterId, userMessage, sessionId } = await request.json();

    if (!characterId || !userMessage || !sessionId) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const character = getCharacterById(characterId);
    if (!character) {
      return new Response(JSON.stringify({ error: '角色不存在' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取或创建会话
    let session = conversationStore.get(sessionId);
    if (!session) {
      session = { 
        messages: [], 
        memory: {} as UserMemory, 
        roundNumber: 0 
      };
      conversationStore.set(sessionId, session);
    }

    // 添加用户消息
    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    session.messages.push(userMsg);
    session.roundNumber += 1;

    // 检测用户消息是否包含触发图片的关键词
    const hasKeywordTrigger = IMAGE_TRIGGER_KEYWORDS.some(keyword => 
      userMessage.includes(keyword)
    );

    // 构建消息历史（滑动窗口：最近15轮）
    const recentMessages = session.messages.slice(-30);

    // 缓存 System Prompt 生成结果
    const promptCacheKey = hashKey(characterId, JSON.stringify(session.memory), String(session.roundNumber), String(hasKeywordTrigger));
    let systemPrompt = promptCache.get(promptCacheKey);
    if (!systemPrompt) {
      systemPrompt = generateSystemPrompt(character, session.memory, session.roundNumber, hasKeywordTrigger);
      promptCache.set(promptCacheKey, systemPrompt);
    }

    // 构建LLM消息
    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    ];

    // 创建LLM客户端
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    // 创建流式响应
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
              
              // 发送SSE格式数据
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`));
            }
          }

          // 解析记忆和图片指令
          const memoryMatch = fullContent.match(/\[MEMORY:\s*(\w+)=([^\]]+)\]/);
          const imageMatch = fullContent.match(/\[IMAGE:\s*([^\]]+)\]/);

          // 更新记忆
          if (memoryMatch && session) {
            const [, key, value] = memoryMatch;
            (session.memory as Record<string, string>)[key] = value.trim();
          }

          // 清理回复：移除动作描述和特殊标记
          const cleanContent = cleanReplyContent(fullContent);

          // 发送完成信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done', 
            content: cleanContent,
            hasImage: !!imageMatch,
            imagePrompt: imageMatch ? imageMatch[1].trim() : null
          })}\n\n`));

          // 保存助手消息
          if (session) {
            session.messages.push({
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: cleanContent,
              timestamp: Date.now()
            });
          }

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
    return new Response(JSON.stringify({ error: '服务器错误' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
