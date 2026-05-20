import { describe, it, expect } from 'vitest';
import {
  serializeEmotionState,
  deserializeEmotionState,
} from '@/lib/types/emotion';
import { getLevelFromScore } from '@/lib/favorability';
import type { EmotionState, StateSnapshot } from '@/lib/types/emotion';

// --- StateSnapshot serialization/deserialization ---

function serializeStateSnapshot(snapshot: StateSnapshot): string {
  return JSON.stringify(snapshot);
}

function deserializeStateSnapshot(raw: string): StateSnapshot {
  return JSON.parse(raw) as StateSnapshot;
}

// --- Test data ---

const emotionFixture: EmotionState = {
  type: 'happy',
  intensity: 75,
  cause: 'user praised my poem',
  timestamp: 1700000000000,
};

function makeSnapshot(overrides: Partial<StateSnapshot> = {}): StateSnapshot {
  return {
    characterId: 'lin_yu',
    userId: 'user-123',
    conversationId: 'conv-456',
    emotion: { ...emotionFixture },
    favorability: {
      score: 65,
      level: getLevelFromScore(65),
    },
    recentMessages: [
      { id: 'm1', role: 'user', content: '你今天心情怎么样？', timestamp: 1700000000000 },
      { id: 'm2', role: 'assistant', content: '还不错呀～你呢？', timestamp: 1700000001000 },
      { id: 'm3', role: 'user', content: '我也很好！', timestamp: 1700000002000 },
    ],
    roundNumber: 3,
    snapshotAt: 1700000003000,
    ...overrides,
  };
}

// --- Tests ---

describe('StateSnapshot serialization', () => {
  it('round-trips through JSON serialize/deserialize', () => {
    const original = makeSnapshot();
    const serialized = serializeStateSnapshot(original);
    const deserialized = deserializeStateSnapshot(serialized);

    expect(deserialized).toEqual(original);
  });

  it('preserves all scalar fields', () => {
    const snapshot = makeSnapshot();
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.characterId).toBe('lin_yu');
    expect(deserialized.userId).toBe('user-123');
    expect(deserialized.conversationId).toBe('conv-456');
    expect(deserialized.roundNumber).toBe(3);
    expect(deserialized.snapshotAt).toBe(1700000003000);
  });

  it('preserves emotion state', () => {
    const snapshot = makeSnapshot();
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.emotion.type).toBe('happy');
    expect(deserialized.emotion.intensity).toBe(75);
    expect(deserialized.emotion.cause).toBe('user praised my poem');
    expect(deserialized.emotion.timestamp).toBe(1700000000000);
  });

  it('preserves favorability data', () => {
    const snapshot = makeSnapshot();
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.favorability.score).toBe(65);
    expect(deserialized.favorability.level.name).toBe('暧昧');
    expect(deserialized.favorability.level.nameEn).toBe('flirtatious');
  });

  it('preserves recent messages', () => {
    const snapshot = makeSnapshot();
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.recentMessages).toHaveLength(3);
    expect(deserialized.recentMessages[0].content).toBe('你今天心情怎么样？');
    expect(deserialized.recentMessages[1].role).toBe('assistant');
    expect(deserialized.recentMessages[2].id).toBe('m3');
  });

  it('handles empty recent messages', () => {
    const snapshot = makeSnapshot({ recentMessages: [] });
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.recentMessages).toHaveLength(0);
  });

  it('handles round number 0 (start of conversation)', () => {
    const snapshot = makeSnapshot({ roundNumber: 0 });
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.roundNumber).toBe(0);
  });

  it('handles large round numbers', () => {
    const snapshot = makeSnapshot({ roundNumber: 9999 });
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.roundNumber).toBe(9999);
  });
});

describe('EmotionState serialization within StateSnapshot', () => {
  it('nested emotion survives round-trip', () => {
    const snapshot = makeSnapshot({
      emotion: {
        type: 'jealous',
        intensity: 90,
        cause: 'user mentioned another character',
        timestamp: 1700000000000,
      },
    });
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.emotion.type).toBe('jealous');
    expect(deserialized.emotion.intensity).toBe(90);
    expect(deserialized.emotion.cause).toBe('user mentioned another character');
  });

  it('uses serializeEmotionState/deserializeEmotionState for emotion field independently', () => {
    const emotion: EmotionState = {
      type: 'passionate',
      intensity: 100,
      cause: 'deep romantic confession',
      timestamp: 1700000000000,
    };

    const serialized = serializeEmotionState(emotion);
    const deserialized = deserializeEmotionState(serialized);

    expect(deserialized).toEqual(emotion);
  });

  it('deserialized emotion from snapshot matches independently deserialized emotion', () => {
    const emotion: EmotionState = {
      type: 'cold',
      intensity: 45,
      cause: 'user was dismissive',
      timestamp: 1700000000000,
    };
    const snapshot = makeSnapshot({ emotion });

    // From snapshot
    const fromSnapshot = deserializeStateSnapshot(serializeStateSnapshot(snapshot)).emotion;
    // Independent
    const independent = deserializeEmotionState(serializeEmotionState(emotion));

    expect(fromSnapshot).toEqual(independent);
    expect(fromSnapshot).toEqual(emotion);
  });
});

describe('StateSnapshot with different favorability levels', () => {
  const testCases = [
    { score: 0, expectedLevel: '陌生人' },
    { score: 10, expectedLevel: '陌生人' },
    { score: 21, expectedLevel: '熟人' },
    { score: 35, expectedLevel: '熟人' },
    { score: 41, expectedLevel: '朋友' },
    { score: 55, expectedLevel: '朋友' },
    { score: 61, expectedLevel: '暧昧' },
    { score: 75, expectedLevel: '暧昧' },
    { score: 81, expectedLevel: '恋人' },
    { score: 95, expectedLevel: '恋人' },
    { score: 100, expectedLevel: '恋人' },
  ];

  it.each(testCases)('preserves favorability level for score $score', ({ score, expectedLevel }) => {
    const snapshot = makeSnapshot({
      favorability: {
        score,
        level: getLevelFromScore(score),
      },
    });
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.favorability.score).toBe(score);
    expect(deserialized.favorability.level.name).toBe(expectedLevel);
  });
});

describe('StateSnapshot with different characters', () => {
  const characterIds = ['lin_yu', 'gu_lie', 'su_chen', 'shen_mo'];

  it.each(characterIds)('round-trips for character %s', (characterId) => {
    const snapshot = makeSnapshot({ characterId });
    const deserialized = deserializeStateSnapshot(serializeStateSnapshot(snapshot));

    expect(deserialized.characterId).toBe(characterId);
  });
});

describe('StateSnapshot corruption resilience', () => {
  it('produces valid JSON that can be parsed', () => {
    const snapshot = makeSnapshot();
    const serialized = serializeStateSnapshot(snapshot);
    // Should not throw
    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it('serialized output is a string', () => {
    const snapshot = makeSnapshot();
    const serialized = serializeStateSnapshot(snapshot);
    expect(typeof serialized).toBe('string');
  });
});
