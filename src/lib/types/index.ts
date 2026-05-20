// Canonical emotion types (teammate B)
export {
  EMOTION_TYPES,
  type EmotionType,
  type EmotionState,
  type EmotionTransition,
  type EmotionConfig,
  type StateSnapshot,
  serializeEmotionState,
  deserializeEmotionState,
  computeDecayedIntensity,
} from './emotion';

// Dialogue & conversation types (teammate A)
export {
  type EmotionTrigger,
  type DialogueBranch,
  type DialogueCondition,
  type DialogueNode,
  type DialogueContext,
  type FavorabilityEvent,
} from './conversation';
