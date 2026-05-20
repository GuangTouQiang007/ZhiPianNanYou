import { describe, it, expect } from 'vitest';
import {
  serializeEmotionState,
  deserializeEmotionState,
  computeDecayedIntensity,
  EMOTION_TYPES,
} from '@/lib/types/emotion';
import type { EmotionState } from '@/lib/types/emotion';

describe('serializeEmotionState', () => {
  const baseState: EmotionState = {
    type: 'happy',
    intensity: 80,
    cause: 'user complimented me',
    timestamp: 1700000000000,
  };

  it('produces a valid JSON string', () => {
    const result = serializeEmotionState(baseState);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(baseState);
  });

  it('serializes all emotion types correctly', () => {
    for (const type of EMOTION_TYPES) {
      const state: EmotionState = { ...baseState, type };
      const result = serializeEmotionState(state);
      expect(JSON.parse(result).type).toBe(type);
    }
  });

  it('serializes zero intensity', () => {
    const state: EmotionState = { ...baseState, intensity: 0 };
    const result = serializeEmotionState(state);
    expect(JSON.parse(result).intensity).toBe(0);
  });

  it('serializes max intensity', () => {
    const state: EmotionState = { ...baseState, intensity: 100 };
    const result = serializeEmotionState(state);
    expect(JSON.parse(result).intensity).toBe(100);
  });
});

describe('deserializeEmotionState', () => {
  it('round-trips through serialize/deserialize', () => {
    const original: EmotionState = {
      type: 'jealous',
      intensity: 65,
      cause: 'user mentioned another guy',
      timestamp: 1700000000000,
    };
    const serialized = serializeEmotionState(original);
    const deserialized = deserializeEmotionState(serialized);
    expect(deserialized).toEqual(original);
  });

  it('clamps intensity to 0-100 range', () => {
    const raw = JSON.stringify({
      type: 'happy',
      intensity: 150,
      cause: 'test',
      timestamp: 1700000000000,
    });
    const result = deserializeEmotionState(raw);
    expect(result.intensity).toBe(100);
  });

  it('clamps negative intensity to 0', () => {
    const raw = JSON.stringify({
      type: 'sad',
      intensity: -50,
      cause: 'test',
      timestamp: 1700000000000,
    });
    const result = deserializeEmotionState(raw);
    expect(result.intensity).toBe(0);
  });

  it('defaults intensity to 0 for non-numeric values', () => {
    const raw = JSON.stringify({
      type: 'angry',
      intensity: 'not-a-number',
      cause: 'test',
      timestamp: 1700000000000,
    });
    const result = deserializeEmotionState(raw);
    expect(result.intensity).toBe(0);
  });

  it('defaults cause to empty string when missing', () => {
    const raw = JSON.stringify({
      type: 'happy',
      intensity: 50,
      timestamp: 1700000000000,
    });
    const result = deserializeEmotionState(raw);
    expect(result.cause).toBe('');
  });

  it('defaults timestamp to current time when missing', () => {
    const before = Date.now();
    const raw = JSON.stringify({
      type: 'happy',
      intensity: 50,
      cause: 'test',
    });
    const result = deserializeEmotionState(raw);
    const after = Date.now();
    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });

  it('defaults timestamp to current time when non-numeric', () => {
    const before = Date.now();
    const raw = JSON.stringify({
      type: 'happy',
      intensity: 50,
      cause: 'test',
      timestamp: 'invalid',
    });
    const result = deserializeEmotionState(raw);
    const after = Date.now();
    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });

  it('round-trips all emotion types', () => {
    for (const type of EMOTION_TYPES) {
      const state: EmotionState = {
        type,
        intensity: 50,
        cause: 'round-trip test',
        timestamp: 1700000000000,
      };
      const result = deserializeEmotionState(serializeEmotionState(state));
      expect(result.type).toBe(type);
      expect(result.intensity).toBe(50);
      expect(result.cause).toBe('round-trip test');
    }
  });
});

describe('computeDecayedIntensity', () => {
  const baseState: EmotionState = {
    type: 'happy',
    intensity: 80,
    cause: 'test',
    timestamp: 1700000000000,
  };

  it('returns original intensity when no time has passed', () => {
    const now = baseState.timestamp;
    const result = computeDecayedIntensity(baseState, now, 5, 1.0);
    expect(result).toBe(80);
  });

  it('decays intensity over time', () => {
    // 1 minute elapsed, baseDecayRate=5, multiplier=1.0
    const now = baseState.timestamp + 60_000; // 1 minute
    const result = computeDecayedIntensity(baseState, now, 5, 1.0);
    expect(result).toBe(75); // 80 - 1*5*1.0*1.0
  });

  it('decays faster with higher decay rate', () => {
    const now = baseState.timestamp + 60_000;
    const result = computeDecayedIntensity(baseState, now, 10, 1.0);
    expect(result).toBe(70); // 80 - 1*10*1.0*1.0
  });

  it('decays faster with character multiplier', () => {
    const now = baseState.timestamp + 60_000;
    const result = computeDecayedIntensity(baseState, now, 5, 2.0);
    expect(result).toBe(70); // 80 - 1*5*2.0*1.0
  });

  it('decays faster with emotion sensitivity', () => {
    const now = baseState.timestamp + 60_000;
    const result = computeDecayedIntensity(baseState, now, 5, 1.0, 2.0);
    expect(result).toBe(70); // 80 - 1*5*1.0*2.0
  });

  it('does not decay below 0', () => {
    // 20 minutes elapsed, baseDecayRate=5, multiplier=1.0 => decay = 100
    const now = baseState.timestamp + 20 * 60_000;
    const result = computeDecayedIntensity(baseState, now, 5, 1.0);
    expect(result).toBe(0);
  });

  it('does not decay below 0 with extreme time', () => {
    const now = baseState.timestamp + 999 * 60_000;
    const result = computeDecayedIntensity(baseState, now, 5, 1.0);
    expect(result).toBe(0);
  });

  it('handles zero base decay rate (no decay)', () => {
    const now = baseState.timestamp + 60 * 60_000; // 1 hour
    const result = computeDecayedIntensity(baseState, now, 0, 1.0);
    expect(result).toBe(80);
  });

  it('handles zero character multiplier (no decay)', () => {
    const now = baseState.timestamp + 60 * 60_000;
    const result = computeDecayedIntensity(baseState, now, 5, 0);
    expect(result).toBe(80);
  });

  it('handles zero sensitivity (no decay)', () => {
    const now = baseState.timestamp + 60 * 60_000;
    const result = computeDecayedIntensity(baseState, now, 5, 1.0, 0);
    expect(result).toBe(80);
  });

  it('defaults sensitivity to 1.0 when not provided', () => {
    const now = baseState.timestamp + 60_000;
    const withDefault = computeDecayedIntensity(baseState, now, 5, 2.0);
    const explicit = computeDecayedIntensity(baseState, now, 5, 2.0, 1.0);
    expect(withDefault).toBe(explicit);
  });

  it('handles sub-minute elapsed time (rounds correctly)', () => {
    // 30 seconds = 0.5 minutes
    const now = baseState.timestamp + 30_000;
    const result = computeDecayedIntensity(baseState, now, 5, 1.0);
    // 80 - 0.5*5*1.0*1.0 = 77.5, rounds to 78
    expect(result).toBe(78);
  });

  it('starts from zero intensity and stays at zero', () => {
    const zeroState: EmotionState = { ...baseState, intensity: 0 };
    const now = baseState.timestamp + 60_000;
    const result = computeDecayedIntensity(zeroState, now, 5, 1.0);
    expect(result).toBe(0);
  });

  it('decays from intensity 100 correctly', () => {
    const maxState: EmotionState = { ...baseState, intensity: 100 };
    const now = baseState.timestamp + 60_000;
    const result = computeDecayedIntensity(maxState, now, 10, 1.0);
    expect(result).toBe(90); // 100 - 1*10*1.0*1.0
  });

  it('handles combined high multiplier and high sensitivity', () => {
    const now = baseState.timestamp + 60_000;
    const result = computeDecayedIntensity(baseState, now, 5, 3.0, 3.0);
    expect(result).toBe(35); // 80 - 1*5*3.0*3.0 = 80 - 45 = 35
  });
});

describe('EMOTION_TYPES', () => {
  it('contains all 9 expected emotion types', () => {
    expect(EMOTION_TYPES).toHaveLength(9);
  });

  it('includes expected emotion types', () => {
    expect(EMOTION_TYPES).toContain('happy');
    expect(EMOTION_TYPES).toContain('sad');
    expect(EMOTION_TYPES).toContain('angry');
    expect(EMOTION_TYPES).toContain('shy');
    expect(EMOTION_TYPES).toContain('jealous');
    expect(EMOTION_TYPES).toContain('gentle');
    expect(EMOTION_TYPES).toContain('cold');
    expect(EMOTION_TYPES).toContain('passionate');
    expect(EMOTION_TYPES).toContain('neutral');
  });
});
