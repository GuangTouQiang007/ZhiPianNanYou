import type { EmotionState, EmotionType, StateSnapshot } from '@/lib/types/emotion';
import { serializeEmotionState } from '@/lib/types/emotion';
import type { FavorabilityEvent } from '@/lib/types/conversation';
import { FavorabilityLevel, getLevelFromScore, clampScore, didLevelChange, checkAndFireLevelChange } from '@/lib/favorability';
import { createDefaultEmotionState, updateEmotion, getDecayedEmotion } from './emotion-state';

type StateChangeListener = (event: FavorabilityEvent, snapshot: StateSnapshot) => void;

interface ConversationState {
  characterId: string;
  userId: string;
  conversationId: string;
  emotion: EmotionState;
  favorabilityScore: number;
  roundNumber: number;
  recentMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }>;
}

const stateStore = new Map<string, ConversationState>();
const listeners: StateChangeListener[] = [];

function stateKey(conversationId: string): string {
  return `conv:${conversationId}`;
}

export function getOrCreateState(
  conversationId: string,
  userId: string,
  characterId: string,
): ConversationState {
  const key = stateKey(conversationId);
  let state = stateStore.get(key);
  if (!state) {
    state = {
      characterId,
      userId,
      conversationId,
      emotion: createDefaultEmotionState(characterId),
      favorabilityScore: 0,
      roundNumber: 0,
      recentMessages: [],
    };
    stateStore.set(key, state);
  }
  return state;
}

export function restoreState(
  conversationId: string,
  userId: string,
  characterId: string,
  options: {
    emotion?: EmotionState;
    favorabilityScore?: number;
    roundNumber?: number;
    recentMessages?: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }>;
  },
): ConversationState {
  const key = stateKey(conversationId);
  const state: ConversationState = {
    characterId,
    userId,
    conversationId,
    emotion: options.emotion ?? createDefaultEmotionState(characterId),
    favorabilityScore: options.favorabilityScore ?? 0,
    roundNumber: options.roundNumber ?? 0,
    recentMessages: options.recentMessages ?? [],
  };
  stateStore.set(key, state);
  return state;
}

export function getState(conversationId: string): ConversationState | undefined {
  return stateStore.get(stateKey(conversationId));
}

export function removeState(conversationId: string): void {
  stateStore.delete(stateKey(conversationId));
}

export function applyFavorabilityDelta(
  conversationId: string,
  delta: number,
  reason: string,
  source: string,
  branchId?: string,
  nodeId?: string,
): FavorabilityEvent {
  const state = stateStore.get(stateKey(conversationId));
  if (!state) throw new Error(`No state found for conversation ${conversationId}`);

  const scoreBefore = state.favorabilityScore;
  const scoreAfter = clampScore(scoreBefore + delta);
  const levelBefore = getLevelFromScore(scoreBefore);
  const levelAfter = getLevelFromScore(scoreAfter);
  const levelChanged = didLevelChange(scoreBefore, scoreAfter);

  state.favorabilityScore = scoreAfter;
  checkAndFireLevelChange(state.characterId, scoreBefore, scoreAfter);

  const event: FavorabilityEvent = {
    source,
    delta,
    scoreBefore,
    scoreAfter,
    levelBefore,
    levelAfter,
    levelChanged,
    reason,
    timestamp: Date.now(),
    branchId,
    nodeId,
  };

  const snapshot = takeSnapshot(conversationId);
  if (snapshot) {
    for (const listener of listeners) {
      try { listener(event, snapshot); } catch { /* swallow listener errors */ }
    }
  }

  return event;
}

export function setEmotion(
  conversationId: string,
  targetEmotion: EmotionType,
  intensity: number,
  cause: string,
): EmotionState {
  const state = stateStore.get(stateKey(conversationId));
  if (!state) throw new Error(`No state found for conversation ${conversationId}`);

  state.emotion = updateEmotion(state.emotion, state.characterId, targetEmotion, intensity, cause);
  return state.emotion;
}

export function getEmotion(conversationId: string): EmotionState | undefined {
  const state = stateStore.get(stateKey(conversationId));
  if (!state) return undefined;
  return getDecayedEmotion(state.emotion, state.characterId);
}

export function pushMessage(
  conversationId: string,
  message: { id: string; role: 'user' | 'assistant'; content: string; timestamp: number },
): void {
  const state = stateStore.get(stateKey(conversationId));
  if (!state) return;

  state.recentMessages.push(message);
  if (state.recentMessages.length > 30) {
    state.recentMessages = state.recentMessages.slice(-30);
  }

  if (message.role === 'assistant') {
    state.roundNumber++;
  }
}

export function takeSnapshot(conversationId: string): StateSnapshot | undefined {
  const state = stateStore.get(stateKey(conversationId));
  if (!state) return undefined;

  return {
    characterId: state.characterId,
    userId: state.userId,
    conversationId: state.conversationId,
    emotion: getDecayedEmotion(state.emotion, state.characterId),
    favorability: {
      score: state.favorabilityScore,
      level: getLevelFromScore(state.favorabilityScore),
    },
    recentMessages: [...state.recentMessages],
    roundNumber: state.roundNumber,
    snapshotAt: Date.now(),
  };
}

export function getSerializedEmotion(conversationId: string): string | undefined {
  const state = stateStore.get(stateKey(conversationId));
  if (!state) return undefined;
  return serializeEmotionState(getDecayedEmotion(state.emotion, state.characterId));
}

export function onStateChange(listener: StateChangeListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
