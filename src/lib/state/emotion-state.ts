import type { EmotionType, EmotionState, EmotionConfig } from '@/lib/types/emotion';
import { computeDecayedIntensity } from '@/lib/types/emotion';
import { LIN_YU, GU_LIE, SU_CHEN, SHEN_MO } from '@/lib/characters';

const DEFAULT_DECAY_RATE = 2; // intensity points per minute

export const CHARACTER_EMOTION_CONFIGS: EmotionConfig[] = [
  {
    characterId: LIN_YU.id,
    defaultEmotion: 'gentle',
    tendencies: { gentle: 5, happy: 3, shy: 2 },
    decayMultiplier: 0.8, // emotions linger longer
    sensitivity: { shy: 1.3, jealous: 0.5 },
    transitions: [
      { from: 'neutral', to: 'gentle', trigger: 'default_warmth', decayRate: 1.5 },
      { from: 'gentle', to: 'shy', trigger: 'compliment_or_intimacy', decayRate: 2 },
      { from: 'gentle', to: 'jealous', trigger: 'mention_other_man', decayRate: 3 },
      { from: 'shy', to: 'gentle', trigger: 'comforting_words', decayRate: 1.5 },
      { from: 'happy', to: 'passionate', trigger: 'deep_emotional_share', decayRate: 2.5 },
    ],
  },
  {
    characterId: GU_LIE.id,
    defaultEmotion: 'cold',
    tendencies: { cold: 5, gentle: 1 },
    decayMultiplier: 1.2,
    sensitivity: { jealous: 2.0, angry: 1.5, gentle: 0.7 },
    transitions: [
      { from: 'neutral', to: 'cold', trigger: 'default_demeanor', decayRate: 2 },
      { from: 'cold', to: 'gentle', trigger: 'user_distress_or_vulnerability', decayRate: 3 },
      { from: 'cold', to: 'jealous', trigger: 'mention_other_man', decayRate: 2 },
      { from: 'gentle', to: 'cold', trigger: 'teasing_or_embarrassment', decayRate: 1.5 },
      { from: 'jealous', to: 'cold', trigger: 'deflection', decayRate: 2.5 },
    ],
  },
  {
    characterId: SU_CHEN.id,
    defaultEmotion: 'happy',
    tendencies: { happy: 5, passionate: 3, shy: 2 },
    decayMultiplier: 0.6, // emotions shift fast but also fade fast
    sensitivity: { happy: 1.5, shy: 1.2, jealous: 0.8 },
    transitions: [
      { from: 'neutral', to: 'happy', trigger: 'default_cheerfulness', decayRate: 3 },
      { from: 'happy', to: 'passionate', trigger: 'exciting_activity', decayRate: 2.5 },
      { from: 'happy', to: 'shy', trigger: 'romantic_advance', decayRate: 2 },
      { from: 'passionate', to: 'happy', trigger: 'calm_down', decayRate: 2 },
      { from: 'shy', to: 'happy', trigger: 'encouragement', decayRate: 2 },
    ],
  },
  {
    characterId: SHEN_MO.id,
    defaultEmotion: 'neutral',
    tendencies: { neutral: 4, sad: 2, gentle: 2 },
    decayMultiplier: 0.5, // emotions persist longest
    sensitivity: { passionate: 1.8, sad: 1.3, gentle: 1.0 },
    transitions: [
      { from: 'neutral', to: 'gentle', trigger: 'shared_artistic_moment', decayRate: 1 },
      { from: 'neutral', to: 'passionate', trigger: 'deep_emotional_connection', decayRate: 1.5 },
      { from: 'gentle', to: 'passionate', trigger: 'romantic_confession', decayRate: 1 },
      { from: 'passionate', to: 'neutral', trigger: 'withdrawal', decayRate: 1.5 },
      { from: 'sad', to: 'gentle', trigger: 'comfort', decayRate: 1 },
    ],
  },
];

function getCharacterConfig(characterId: string): EmotionConfig {
  return CHARACTER_EMOTION_CONFIGS.find((c) => c.characterId === characterId) ?? {
    characterId,
    defaultEmotion: 'neutral' as EmotionType,
    tendencies: {},
    decayMultiplier: 1.0,
    sensitivity: {},
    transitions: [],
  };
}

export function createDefaultEmotionState(characterId: string): EmotionState {
  const config = getCharacterConfig(characterId);
  return {
    type: config.defaultEmotion,
    intensity: 30,
    cause: '初始状态',
    timestamp: Date.now(),
  };
}

export function updateEmotion(
  current: EmotionState,
  characterId: string,
  targetEmotion: EmotionType,
  intensity: number,
  cause: string,
): EmotionState {
  const config = getCharacterConfig(characterId);
  const sensitivity = config.sensitivity[targetEmotion] ?? 1;
  const adjustedIntensity = Math.max(0, Math.min(100, Math.round(intensity * sensitivity)));
  return {
    type: targetEmotion,
    intensity: adjustedIntensity,
    cause,
    timestamp: Date.now(),
  };
}

export function getDecayedEmotion(
  state: EmotionState,
  characterId: string,
  now?: number,
): EmotionState {
  const timestamp = now ?? Date.now();
  if (timestamp <= state.timestamp) return state;

  const config = getCharacterConfig(characterId);
  const relevantTransition = config.transitions.find((t) => t.from === state.type);
  const decayRate = relevantTransition?.decayRate ?? DEFAULT_DECAY_RATE;
  const sensitivity = config.sensitivity[state.type] ?? 1;

  const decayedIntensity = computeDecayedIntensity(
    state,
    timestamp,
    decayRate,
    config.decayMultiplier,
    sensitivity,
  );

  if (decayedIntensity <= 0) {
    return {
      type: config.defaultEmotion,
      intensity: 10,
      cause: '情绪自然消退',
      timestamp,
    };
  }

  return {
    ...state,
    intensity: decayedIntensity,
    timestamp,
  };
}

export function getEmotionConfig(characterId: string): EmotionConfig {
  return getCharacterConfig(characterId);
}
