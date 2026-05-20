import { FavorabilityLevel } from '@/lib/favorability';

export const EMOTION_TYPES = [
  'happy',
  'sad',
  'angry',
  'shy',
  'jealous',
  'gentle',
  'cold',
  'passionate',
  'neutral',
] as const;

export type EmotionType = (typeof EMOTION_TYPES)[number];

export interface EmotionState {
  type: EmotionType;
  intensity: number; // 0-100
  cause: string; // what triggered this emotion
  timestamp: number; // epoch ms, for decay calculation
}

export interface EmotionTransition {
  from: EmotionType;
  to: EmotionType;
  trigger: string; // natural language description or keyword pattern
  decayRate: number; // intensity loss per minute when idle
}

export interface EmotionConfig {
  characterId: string;
  defaultEmotion: EmotionType;
  /** probability weights for spontaneous emotion shifts, keyed by target emotion */
  tendencies: Partial<Record<EmotionType, number>>;
  /** how quickly emotions decay for this character (multiplier, 1.0 = normal) */
  decayMultiplier: number;
  /** emotion-specific sensitivity: e.g. { jealous: 1.5 } makes jealousy 50% stronger */
  sensitivity: Partial<Record<EmotionType, number>>;
  /** defined transition rules ordered by priority */
  transitions: EmotionTransition[];
}

export interface StateSnapshot {
  characterId: string;
  userId: string;
  conversationId: string;
  emotion: EmotionState;
  favorability: {
    score: number;
    level: FavorabilityLevel;
  };
  /** last N messages for context restoration */
  recentMessages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  /** round number within the conversation */
  roundNumber: number;
  /** when this snapshot was taken */
  snapshotAt: number;
}

export function serializeEmotionState(state: EmotionState): string {
  return JSON.stringify(state);
}

export function deserializeEmotionState(raw: string): EmotionState {
  const parsed = JSON.parse(raw);
  return {
    type: parsed.type,
    intensity: Math.max(0, Math.min(100, Number(parsed.intensity) || 0)),
    cause: String(parsed.cause ?? ''),
    timestamp: Number(parsed.timestamp) || Date.now(),
  };
}

export function computeDecayedIntensity(
  state: EmotionState,
  now: number,
  baseDecayRate: number,
  characterMultiplier: number,
  characterSensitivity?: number,
): number {
  const elapsed = (now - state.timestamp) / 60_000; // minutes
  const sensitivity = characterSensitivity ?? 1;
  const decayed = state.intensity - elapsed * baseDecayRate * characterMultiplier * sensitivity;
  return Math.max(0, Math.min(100, Math.round(decayed)));
}
