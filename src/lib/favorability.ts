import type { EmotionType } from '@/lib/types/emotion';

// 好感度等级定义
export const FAVORABILITY_LEVELS = [
  { min: 0, max: 20, name: '陌生人', nameEn: 'stranger' },
  { min: 21, max: 40, name: '熟人', nameEn: 'acquaintance' },
  { min: 41, max: 60, name: '朋友', nameEn: 'friend' },
  { min: 61, max: 80, name: '暧昧', nameEn: 'flirtatious' },
  { min: 81, max: 100, name: '恋人', nameEn: 'lover' },
] as const;

export type FavorabilityLevel = (typeof FAVORABILITY_LEVELS)[number];

export function getLevelFromScore(score: number): FavorabilityLevel {
  return FAVORABILITY_LEVELS.find((l) => score >= l.min && score <= l.max) ?? FAVORABILITY_LEVELS[0];
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function applyDelta(currentScore: number, delta: number): number {
  return clampScore(currentScore + delta);
}

export function didLevelChange(oldScore: number, newScore: number): boolean {
  return getLevelFromScore(oldScore).name !== getLevelFromScore(newScore).name;
}

export interface FavorabilityData {
  score: number;
  delta: number;
  level: FavorabilityLevel;
  levelChanged: boolean;
  reason: string | null;
}

export type FavorabilityCallback = (data: FavorabilityData) => void;

const EMOTION_FAVORABILITY_MULTIPLIER: Record<EmotionType, number> = {
  happy: 1.2,
  gentle: 1.3,
  passionate: 1.5,
  shy: 1.1,
  neutral: 1.0,
  cold: 0.7,
  sad: 0.8,
  angry: 0.5,
  jealous: 0.9,
};

export function emotionAdjustedDelta(
  baseDelta: number,
  emotionType: EmotionType,
  emotionIntensity: number,
): number {
  const multiplier = EMOTION_FAVORABILITY_MULTIPLIER[emotionType] ?? 1.0;
  const intensityFactor = 1 + ((emotionIntensity - 50) / 200); // intensity 50 = neutral, 100 = +0.25, 0 = -0.25
  return Math.round(baseDelta * multiplier * intensityFactor);
}

const levelChangeCallbacks = new Map<string, FavorabilityCallback>();

export function onLevelChange(characterId: string, callback: FavorabilityCallback): () => void {
  levelChangeCallbacks.set(characterId, callback);
  return () => { levelChangeCallbacks.delete(characterId); };
}

export function checkAndFireLevelChange(
  characterId: string,
  scoreBefore: number,
  scoreAfter: number,
): void {
  if (didLevelChange(scoreBefore, scoreAfter)) {
    const data: FavorabilityData = {
      score: scoreAfter,
      delta: scoreAfter - scoreBefore,
      level: getLevelFromScore(scoreAfter),
      levelChanged: true,
      reason: `等级变化: ${getLevelFromScore(scoreBefore).name} → ${getLevelFromScore(scoreAfter).name}`,
    };
    const cb = levelChangeCallbacks.get(characterId);
    if (cb) cb(data);
  }
}
