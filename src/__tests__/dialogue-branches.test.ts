import { describe, it, expect } from 'vitest';
import { EMOTION_TYPES } from '@/lib/types/emotion';
import type { EmotionType } from '@/lib/types/emotion';
import {
  getLevelFromScore,
} from '@/lib/favorability';
import type { EmotionTrigger, DialogueBranch, DialogueCondition, DialogueContext } from '@/lib/types/conversation';
import type { EmotionState } from '@/lib/types/emotion';
import type { Character, Message } from '@/lib/characters';

// --- Helper functions that mirror the expected runtime logic ---

function matchesKeyword(userMessage: string, condition: DialogueCondition): boolean {
  if (condition.type !== 'keyword' || !condition.value) return false;
  const values = Array.isArray(condition.value) ? condition.value : [condition.value];
  return values.some((kw) => userMessage.includes(kw));
}

function matchesFavorabilityRange(score: number, condition: DialogueCondition): boolean {
  if (condition.type !== 'favorability_range' || !condition.range) return false;
  return score >= condition.range.min && score <= condition.range.max;
}

function matchesEmotion(currentEmotion: EmotionType, condition: DialogueCondition): boolean {
  if (condition.type !== 'emotion') return false;
  const values = Array.isArray(condition.value) ? condition.value : [condition.value];
  return values.includes(currentEmotion);
}

function matchesRoundNumber(round: number, condition: DialogueCondition): boolean {
  if (condition.type !== 'round_number' || !condition.range) return false;
  return round >= condition.range.min && round <= condition.range.max;
}

function matchesTopic(topics: string[], condition: DialogueCondition): boolean {
  if (condition.type !== 'topic' || !condition.value) return false;
  const values = Array.isArray(condition.value) ? condition.value : [condition.value];
  return values.some((v) => topics.includes(v));
}

function evaluateCondition(condition: DialogueCondition, context: DialogueContext): boolean {
  switch (condition.type) {
    case 'keyword':
      // Check the latest user message
      const lastUserMsg = [...context.recentMessages].reverse().find((m) => m.role === 'user');
      if (!lastUserMsg) return false;
      return matchesKeyword(lastUserMsg.content, condition);
    case 'favorability_range':
      return matchesFavorabilityRange(context.favorabilityScore, condition);
    case 'emotion':
      return matchesEmotion(context.emotion.type, condition);
    case 'round_number':
      return matchesRoundNumber(context.roundNumber, condition);
    case 'topic':
      return matchesTopic(context.topics, condition);
    default:
      return false;
  }
}

function evaluateBranch(branch: DialogueBranch, context: DialogueContext): boolean {
  // Check character filter
  if (branch.characterIds && branch.characterIds.length > 0) {
    if (!branch.characterIds.includes(context.character.id)) return false;
  }
  // All conditions must match
  return branch.conditions.every((c) => evaluateCondition(c, context));
}

function checkEmotionTrigger(trigger: EmotionTrigger, userMessage: string, favorabilityScore: number, currentEmotion: EmotionType, characterId: string): boolean {
  // Character filter
  if (trigger.characterIds && trigger.characterIds.length > 0) {
    if (!trigger.characterIds.includes(characterId)) return false;
  }
  // Favorability range
  if (favorabilityScore < trigger.favorabilityRange.min || favorabilityScore > trigger.favorabilityRange.max) {
    return false;
  }
  // Emotion filter
  if (trigger.activeWhenEmotion && trigger.activeWhenEmotion.length > 0) {
    if (!trigger.activeWhenEmotion.includes(currentEmotion)) return false;
  }
  // Keyword match
  return trigger.keywords.some((kw) => userMessage.includes(kw));
}

// --- Test fixtures ---

const mockCharacter: Character = {
  id: 'lin_yu',
  name: '林屿',
  title: '温柔学长',
  personality: '温柔体贴',
  traits: ['温柔'],
  speakingStyle: '温柔',
  catchphrases: ['没关系'],
  appearance: '帅气',
  appearancePrompt: 'handsome',
  voiceId: 'test-voice',
  avatarUrl: '/avatars/lin-yu.jpg',
  background: '学长',
  emotionReactions: [],
  favorabilityStyles: [],
};

const baseEmotion: EmotionState = {
  type: 'neutral',
  intensity: 30,
  cause: 'idle',
  timestamp: Date.now() - 60_000,
};

function makeContext(overrides: Partial<DialogueContext> = {}): DialogueContext {
  return {
    character: mockCharacter,
    userMemory: {},
    recentMessages: [],
    roundNumber: 1,
    emotion: { ...baseEmotion },
    favorabilityScore: 50,
    favorabilityLevel: getLevelFromScore(50),
    branchHistory: [],
    topics: [],
    userId: 'user-1',
    conversationId: 'conv-1',
    ...overrides,
  };
}

// --- Tests ---

describe('EmotionTrigger keyword matching', () => {
  it('matches when any keyword is found in user message', () => {
    const trigger: EmotionTrigger = {
      id: 't1',
      keywords: ['喜欢你', 'love you', '表白'],
      favorabilityRange: { min: 0, max: 100 },
      targetEmotion: 'shy',
      intensity: 80,
    };
    expect(checkEmotionTrigger(trigger, '我真的很喜欢你', 50, 'neutral', 'lin_yu')).toBe(true);
  });

  it('matches partial keyword in message', () => {
    const trigger: EmotionTrigger = {
      id: 't2',
      keywords: ['早安', '早上好'],
      favorabilityRange: { min: 0, max: 100 },
      targetEmotion: 'happy',
      intensity: 60,
    };
    expect(checkEmotionTrigger(trigger, '早安呀林屿！', 50, 'neutral', 'lin_yu')).toBe(true);
  });

  it('does not match when no keywords are found', () => {
    const trigger: EmotionTrigger = {
      id: 't3',
      keywords: ['喜欢你'],
      favorabilityRange: { min: 0, max: 100 },
      targetEmotion: 'shy',
      intensity: 80,
    };
    expect(checkEmotionTrigger(trigger, '今天天气不错', 50, 'neutral', 'lin_yu')).toBe(false);
  });

  it('respects favorability range filter', () => {
    const trigger: EmotionTrigger = {
      id: 't4',
      keywords: ['喜欢你'],
      favorabilityRange: { min: 61, max: 100 },
      targetEmotion: 'shy',
      intensity: 80,
    };
    // Score 30 is outside 61-100 range
    expect(checkEmotionTrigger(trigger, '喜欢你', 30, 'neutral', 'lin_yu')).toBe(false);
    // Score 70 is within range
    expect(checkEmotionTrigger(trigger, '喜欢你', 70, 'neutral', 'lin_yu')).toBe(true);
  });

  it('respects favorability lower boundary (inclusive)', () => {
    const trigger: EmotionTrigger = {
      id: 't5',
      keywords: ['喜欢你'],
      favorabilityRange: { min: 61, max: 100 },
      targetEmotion: 'shy',
      intensity: 80,
    };
    expect(checkEmotionTrigger(trigger, '喜欢你', 61, 'neutral', 'lin_yu')).toBe(true);
  });

  it('respects favorability upper boundary (inclusive)', () => {
    const trigger: EmotionTrigger = {
      id: 't6',
      keywords: ['喜欢你'],
      favorabilityRange: { min: 0, max: 20 },
      targetEmotion: 'shy',
      intensity: 30,
    };
    expect(checkEmotionTrigger(trigger, '喜欢你', 20, 'neutral', 'lin_yu')).toBe(true);
    expect(checkEmotionTrigger(trigger, '喜欢你', 21, 'neutral', 'lin_yu')).toBe(false);
  });

  it('respects activeWhenEmotion filter', () => {
    const trigger: EmotionTrigger = {
      id: 't7',
      keywords: ['哼'],
      favorabilityRange: { min: 0, max: 100 },
      activeWhenEmotion: ['angry'],
      targetEmotion: 'cold',
      intensity: 70,
    };
    expect(checkEmotionTrigger(trigger, '哼！', 50, 'angry', 'lin_yu')).toBe(true);
    expect(checkEmotionTrigger(trigger, '哼！', 50, 'happy', 'lin_yu')).toBe(false);
  });

  it('is always active when activeWhenEmotion is empty', () => {
    const trigger: EmotionTrigger = {
      id: 't8',
      keywords: ['你好'],
      favorabilityRange: { min: 0, max: 100 },
      targetEmotion: 'gentle',
      intensity: 40,
    };
    expect(checkEmotionTrigger(trigger, '你好', 50, 'angry', 'lin_yu')).toBe(true);
    expect(checkEmotionTrigger(trigger, '你好', 50, 'happy', 'lin_yu')).toBe(true);
  });

  it('respects character ID filter', () => {
    const trigger: EmotionTrigger = {
      id: 't9',
      keywords: ['笨蛋'],
      favorabilityRange: { min: 0, max: 100 },
      targetEmotion: 'cold',
      intensity: 60,
      characterIds: ['gu_lie'],
    };
    expect(checkEmotionTrigger(trigger, '笨蛋', 50, 'neutral', 'gu_lie')).toBe(true);
    expect(checkEmotionTrigger(trigger, '笨蛋', 50, 'neutral', 'lin_yu')).toBe(false);
  });

  it('applies to all characters when characterIds is empty', () => {
    const trigger: EmotionTrigger = {
      id: 't10',
      keywords: ['你好'],
      favorabilityRange: { min: 0, max: 100 },
      targetEmotion: 'gentle',
      intensity: 40,
    };
    expect(checkEmotionTrigger(trigger, '你好', 50, 'neutral', 'lin_yu')).toBe(true);
    expect(checkEmotionTrigger(trigger, '你好', 50, 'neutral', 'gu_lie')).toBe(true);
    expect(checkEmotionTrigger(trigger, '你好', 50, 'neutral', 'su_chen')).toBe(true);
    expect(checkEmotionTrigger(trigger, '你好', 50, 'neutral', 'shen_mo')).toBe(true);
  });
});

describe('DialogueCondition matching', () => {
  it('keyword condition matches against user message content', () => {
    const ctx = makeContext({
      recentMessages: [
        { id: '1', role: 'assistant', content: '你好呀', timestamp: 0 },
        { id: '2', role: 'user', content: '今天心情怎么样', timestamp: 0 },
      ],
    });
    const condition: DialogueCondition = { type: 'keyword', value: '心情' };
    expect(evaluateCondition(condition, ctx)).toBe(true);
  });

  it('keyword condition supports array of values', () => {
    const ctx = makeContext({
      recentMessages: [
        { id: '1', role: 'user', content: '你吃饭了吗', timestamp: 0 },
      ],
    });
    const condition: DialogueCondition = { type: 'keyword', value: ['心情', '吃饭', '开心'] };
    expect(evaluateCondition(condition, ctx)).toBe(true);
  });

  it('keyword condition returns false when no user messages exist', () => {
    const ctx = makeContext({
      recentMessages: [
        { id: '1', role: 'assistant', content: '你好', timestamp: 0 },
      ],
    });
    const condition: DialogueCondition = { type: 'keyword', value: '你好' };
    expect(evaluateCondition(condition, ctx)).toBe(false);
  });

  it('favorability_range condition checks current score', () => {
    const ctx = makeContext({ favorabilityScore: 50 });
    const condition: DialogueCondition = { type: 'favorability_range', range: { min: 41, max: 60 } };
    expect(evaluateCondition(condition, ctx)).toBe(true);
  });

  it('favorability_range condition returns false when score is outside range', () => {
    const ctx = makeContext({ favorabilityScore: 50 });
    const condition: DialogueCondition = { type: 'favorability_range', range: { min: 61, max: 80 } };
    expect(evaluateCondition(condition, ctx)).toBe(false);
  });

  it('emotion condition matches current emotion type', () => {
    const ctx = makeContext({ emotion: { ...baseEmotion, type: 'happy' } });
    const condition: DialogueCondition = { type: 'emotion', value: 'happy' };
    expect(evaluateCondition(condition, ctx)).toBe(true);
  });

  it('emotion condition supports array of emotion types', () => {
    const ctx = makeContext({ emotion: { ...baseEmotion, type: 'shy' } });
    const condition: DialogueCondition = { type: 'emotion', value: ['happy', 'shy'] };
    expect(evaluateCondition(condition, ctx)).toBe(true);
  });

  it('round_number condition checks current round', () => {
    const ctx = makeContext({ roundNumber: 5 });
    const condition: DialogueCondition = { type: 'round_number', range: { min: 1, max: 10 } };
    expect(evaluateCondition(condition, ctx)).toBe(true);
  });

  it('topic condition checks conversation topics', () => {
    const ctx = makeContext({ topics: ['music', 'love'] });
    const condition: DialogueCondition = { type: 'topic', value: 'love' };
    expect(evaluateCondition(condition, ctx)).toBe(true);
  });

  it('topic condition supports array of topics', () => {
    const ctx = makeContext({ topics: ['music', 'love'] });
    const condition: DialogueCondition = { type: 'topic', value: ['work', 'travel'] };
    expect(evaluateCondition(condition, ctx)).toBe(false);
  });
});

describe('DialogueBranch evaluation', () => {
  it('selects branch when all conditions are met', () => {
    const branch: DialogueBranch = {
      id: 'b1',
      label: 'greeting',
      conditions: [
        { type: 'keyword', value: '你好' },
        { type: 'favorability_range', range: { min: 0, max: 100 } },
      ],
      replyTemplates: ['你好呀～'],
      nextBranchIds: [],
    };
    const ctx = makeContext({
      recentMessages: [{ id: '1', role: 'user', content: '你好', timestamp: 0 }],
      favorabilityScore: 50,
    });
    expect(evaluateBranch(branch, ctx)).toBe(true);
  });

  it('rejects branch when any condition is not met', () => {
    const branch: DialogueBranch = {
      id: 'b2',
      label: 'flirty-response',
      conditions: [
        { type: 'keyword', value: '喜欢你' },
        { type: 'favorability_range', range: { min: 61, max: 100 } },
      ],
      replyTemplates: ['你...也很喜欢你'],
      nextBranchIds: [],
    };
    const ctx = makeContext({
      recentMessages: [{ id: '1', role: 'user', content: '喜欢你', timestamp: 0 }],
      favorabilityScore: 30, // Below the 61-100 range
    });
    expect(evaluateBranch(branch, ctx)).toBe(false);
  });

  it('filters by character ID', () => {
    const branch: DialogueBranch = {
      id: 'b3',
      label: 'gu-lie-special',
      conditions: [{ type: 'keyword', value: '工作' }],
      replyTemplates: ['工作做完了吗'],
      nextBranchIds: [],
      characterIds: ['gu_lie'],
    };
    const linYuCtx = makeContext({
      character: mockCharacter, // lin_yu
      recentMessages: [{ id: '1', role: 'user', content: '工作好累', timestamp: 0 }],
    });
    expect(evaluateBranch(branch, linYuCtx)).toBe(false);

    const guLieCtx = makeContext({
      character: { ...mockCharacter, id: 'gu_lie', name: '顾冽' },
      recentMessages: [{ id: '1', role: 'user', content: '工作好累', timestamp: 0 }],
    });
    expect(evaluateBranch(branch, guLieCtx)).toBe(true);
  });

  it('applies to all characters when characterIds is empty', () => {
    const branch: DialogueBranch = {
      id: 'b4',
      label: 'universal-greeting',
      conditions: [{ type: 'keyword', value: '你好' }],
      replyTemplates: ['你好！'],
      nextBranchIds: [],
    };
    const ctx = makeContext({
      recentMessages: [{ id: '1', role: 'user', content: '你好', timestamp: 0 }],
    });
    expect(evaluateBranch(branch, ctx)).toBe(true);
  });
});

describe('Favorability level influence on branch selection', () => {
  it('different branches activate at different favorability levels', () => {
    const strangerBranch: DialogueBranch = {
      id: 'stranger-b',
      label: 'stranger-greeting',
      conditions: [{ type: 'favorability_range', range: { min: 0, max: 20 } }],
      replyTemplates: ['你好，请问你是？'],
      nextBranchIds: [],
    };
    const loverBranch: DialogueBranch = {
      id: 'lover-b',
      label: 'lover-greeting',
      conditions: [{ type: 'favorability_range', range: { min: 81, max: 100 } }],
      replyTemplates: ['宝贝，你回来啦！'],
      nextBranchIds: [],
    };

    const lowScoreCtx = makeContext({ favorabilityScore: 10, favorabilityLevel: getLevelFromScore(10) });
    const highScoreCtx = makeContext({ favorabilityScore: 90, favorabilityLevel: getLevelFromScore(90) });

    expect(evaluateBranch(strangerBranch, lowScoreCtx)).toBe(true);
    expect(evaluateBranch(loverBranch, lowScoreCtx)).toBe(false);

    expect(evaluateBranch(strangerBranch, highScoreCtx)).toBe(false);
    expect(evaluateBranch(loverBranch, highScoreCtx)).toBe(true);
  });

  it('mid-range favorability selects friend-level branch', () => {
    const friendBranch: DialogueBranch = {
      id: 'friend-b',
      label: 'friend-chat',
      conditions: [{ type: 'favorability_range', range: { min: 41, max: 60 } }],
      replyTemplates: ['嘿，最近怎么样？'],
      nextBranchIds: [],
    };

    const midCtx = makeContext({ favorabilityScore: 50, favorabilityLevel: getLevelFromScore(50) });
    expect(evaluateBranch(friendBranch, midCtx)).toBe(true);

    const lowCtx = makeContext({ favorabilityScore: 20, favorabilityLevel: getLevelFromScore(20) });
    expect(evaluateBranch(friendBranch, lowCtx)).toBe(false);

    const highCtx = makeContext({ favorabilityScore: 85, favorabilityLevel: getLevelFromScore(85) });
    expect(evaluateBranch(friendBranch, highCtx)).toBe(false);
  });
});

describe('DialogueCondition type exhaustiveness', () => {
  it('all emotion types are valid for emotion condition', () => {
    const ctx = makeContext({ emotion: { ...baseEmotion, type: 'passionate' } });
    const condition: DialogueCondition = { type: 'emotion', value: 'passionate' };
    expect(evaluateCondition(condition, ctx)).toBe(true);
  });

  it('unknown condition type returns false', () => {
    const ctx = makeContext();
    const condition = { type: 'unknown_type', value: 'test' } as unknown as DialogueCondition;
    expect(evaluateCondition(condition, ctx)).toBe(false);
  });
});
