import type { Character, UserMemory, Message } from '@/lib/characters';
import type { FavorabilityLevel } from '@/lib/favorability';
import type { EmotionType, EmotionState } from './emotion';

// -- 情感触发条件 --

export interface EmotionTrigger {
  id: string;
  /** Keywords to match in user message (any match triggers) */
  keywords: string[];
  /** Favorability score range that enables this trigger (inclusive) */
  favorabilityRange: { min: number; max: number };
  /** Current emotion(s) this trigger is active under; empty = always active */
  activeWhenEmotion?: EmotionType[];
  /** The emotion this trigger produces */
  targetEmotion: EmotionType;
  /** Intensity of the resulting emotion (0-100) */
  intensity: number;
  /** Character IDs this trigger applies to; empty = all characters */
  characterIds?: string[];
}

// -- 对话分支 --

export interface DialogueBranch {
  id: string;
  /** Human-readable label for this branch */
  label: string;
  /** Conditions that must all be true for this branch to be selected */
  conditions: DialogueCondition[];
  /** Reply templates the LLM can draw from (role-specific interpolation supported) */
  replyTemplates: string[];
  /** Emotion to set when this branch fires */
  emotion?: EmotionState;
  /** Optional favorability delta applied when this branch is used */
  favorabilityDelta?: number;
  /** IDs of branches that can follow this one (ordered by priority) */
  nextBranchIds: string[];
  /** Character IDs this branch applies to; empty = all characters */
  characterIds?: string[];
}

export interface DialogueCondition {
  type: 'keyword' | 'favorability_range' | 'emotion' | 'round_number' | 'topic';
  /** For keyword/emotion/topic: string or string[] to match. Optional for range-based types. */
  value?: string | string[];
  /** Numeric range for favorability_range / round_number conditions */
  range?: { min: number; max: number };
}

// -- 对话节点 --

export interface DialogueNode {
  id: string;
  /** The branch that produced this node */
  branchId: string;
  /** Character ID */
  characterId: string;
  /** Conversation ID */
  conversationId: string;
  /** The actual reply text sent to user */
  content: string;
  /** Emotion state at the time of this reply */
  emotion: EmotionState;
  /** Favorability score at the time of this reply */
  favorabilityScore: number;
  /** Favorability level at the time of this reply */
  favorabilityLevel: FavorabilityLevel;
  /** Round number in the conversation */
  roundNumber: number;
  /** Timestamp */
  timestamp: number;
}

// -- 扩展对话上下文 --

export interface DialogueContext {
  /** The character being chatted with */
  character: Character;
  /** User memory (name, job, etc.) */
  userMemory: UserMemory;
  /** Recent messages in the conversation */
  recentMessages: Message[];
  /** Current conversation round number */
  roundNumber: number;
  /** Current emotion state */
  emotion: EmotionState;
  /** Current favorability score (0-100) */
  favorabilityScore: number;
  /** Current favorability level */
  favorabilityLevel: FavorabilityLevel;
  /** History of branch IDs taken in this conversation (enables path tracking) */
  branchHistory: string[];
  /** Current conversation topic tags derived from recent messages */
  topics: string[];
  /** User ID */
  userId: string;
  /** Conversation ID */
  conversationId: string;
}

// -- 好感度变化事件 --

export interface FavorabilityEvent {
  /** Source trigger: 'keyword' | 'branch' | 'llm_affection' | 'topic_depth' */
  source: string;
  /** Numeric delta (-5 to +5) */
  delta: number;
  /** Favorability score before the change */
  scoreBefore: number;
  /** Favorability score after the change */
  scoreAfter: number;
  /** Level before the change */
  levelBefore: FavorabilityLevel;
  /** Level after the change */
  levelAfter: FavorabilityLevel;
  /** Whether the level changed */
  levelChanged: boolean;
  /** Human-readable reason */
  reason: string;
  /** Timestamp */
  timestamp: number;
  /** Associated dialogue branch ID, if any */
  branchId?: string;
  /** Associated dialogue node ID, if any */
  nodeId?: string;
}
