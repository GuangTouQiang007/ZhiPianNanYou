import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { db, characterEmotions } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { getDecayedEmotion } from '@/lib/state/emotion-state';
import { serializeEmotionState, deserializeEmotionState } from '@/lib/types/emotion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, _context, userId) => {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (!characterId) {
      return NextResponse.json({ error: '缺少角色ID' }, { status: 400 });
    }

    const [row] = await db.select()
      .from(characterEmotions)
      .where(and(eq(characterEmotions.userId, userId), eq(characterEmotions.characterId, characterId)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ characterId, emotion: null });
    }

    const raw = deserializeEmotionState(row.emotionData);
    const decayed = getDecayedEmotion(raw, characterId);

    return NextResponse.json({
      characterId,
      emotion: decayed,
    });
  } catch (error) {
    console.error('Emotion API GET error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
});

export const POST = withAuth(async (request, _context, userId) => {
  try {
    const body = await request.json();
    const { characterId, emotion } = body;

    if (!characterId || !emotion?.type) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const emotionData = serializeEmotionState({
      type: emotion.type,
      intensity: Math.max(0, Math.min(100, Number(emotion.intensity) || 0)),
      cause: String(emotion.cause ?? ''),
      timestamp: Number(emotion.timestamp) || Date.now(),
    });

    const existing = await db.select()
      .from(characterEmotions)
      .where(and(eq(characterEmotions.userId, userId), eq(characterEmotions.characterId, characterId)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(characterEmotions)
        .set({ emotionData, updatedAt: new Date() })
        .where(and(eq(characterEmotions.userId, userId), eq(characterEmotions.characterId, characterId)));
    } else {
      await db.insert(characterEmotions).values({
        userId,
        characterId,
        emotionData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Emotion API PUT error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
});
