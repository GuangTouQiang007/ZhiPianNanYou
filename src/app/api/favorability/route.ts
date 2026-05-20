import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { db, characterFavorability, characterEmotions } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { getLevelFromScore } from '@/lib/favorability';
import { getDecayedEmotion } from '@/lib/state/emotion-state';
import { deserializeEmotionState } from '@/lib/types/emotion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, _context, userId) => {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (characterId) {
      const [row] = await db.select()
        .from(characterFavorability)
        .where(and(eq(characterFavorability.userId, userId), eq(characterFavorability.characterId, characterId)))
        .limit(1);

      const score = row?.score ?? 0;

      const [emoRow] = await db.select()
        .from(characterEmotions)
        .where(and(eq(characterEmotions.userId, userId), eq(characterEmotions.characterId, characterId)))
        .limit(1);

      const emotion = emoRow
        ? getDecayedEmotion(deserializeEmotionState(emoRow.emotionData), characterId)
        : null;

      return NextResponse.json({
        characterId,
        score,
        level: getLevelFromScore(score),
        emotion,
      });
    }

    const rows = await db.select()
      .from(characterFavorability)
      .where(eq(characterFavorability.userId, userId));

    const emoRows = await db.select()
      .from(characterEmotions)
      .where(eq(characterEmotions.userId, userId));

    const emoMap = new Map(emoRows.map((r) => [r.characterId, r.emotionData]));

    return NextResponse.json({
      favorabilities: rows.map((r) => {
        const rawEmo = emoMap.get(r.characterId);
        const emotion = rawEmo
          ? getDecayedEmotion(deserializeEmotionState(rawEmo), r.characterId)
          : null;
        return {
          characterId: r.characterId,
          score: r.score,
          level: getLevelFromScore(r.score),
          emotion,
        };
      }),
    });
  } catch (error) {
    console.error('Favorability API error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
});
