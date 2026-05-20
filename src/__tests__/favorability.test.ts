import { describe, it, expect } from 'vitest';
import {
  getLevelFromScore,
  clampScore,
  applyDelta,
  didLevelChange,
  FAVORABILITY_LEVELS,
} from '@/lib/favorability';

describe('getLevelFromScore', () => {
  it('returns 陌生人 (stranger) for score 0', () => {
    const level = getLevelFromScore(0);
    expect(level.name).toBe('陌生人');
    expect(level.nameEn).toBe('stranger');
  });

  it('returns 陌生人 for score 20 (upper boundary)', () => {
    const level = getLevelFromScore(20);
    expect(level.name).toBe('陌生人');
  });

  it('returns 熟人 (acquaintance) for score 21 (lower boundary)', () => {
    const level = getLevelFromScore(21);
    expect(level.name).toBe('熟人');
    expect(level.nameEn).toBe('acquaintance');
  });

  it('returns 熟人 for score 40 (upper boundary)', () => {
    const level = getLevelFromScore(40);
    expect(level.name).toBe('熟人');
  });

  it('returns 朋友 (friend) for score 41 (lower boundary)', () => {
    const level = getLevelFromScore(41);
    expect(level.name).toBe('朋友');
    expect(level.nameEn).toBe('friend');
  });

  it('returns 朋友 for score 60 (upper boundary)', () => {
    const level = getLevelFromScore(60);
    expect(level.name).toBe('朋友');
  });

  it('returns 暧昧 (flirtatious) for score 61 (lower boundary)', () => {
    const level = getLevelFromScore(61);
    expect(level.name).toBe('暧昧');
    expect(level.nameEn).toBe('flirtatious');
  });

  it('returns 暧昧 for score 80 (upper boundary)', () => {
    const level = getLevelFromScore(80);
    expect(level.name).toBe('暧昧');
  });

  it('returns 恋人 (lover) for score 81 (lower boundary)', () => {
    const level = getLevelFromScore(81);
    expect(level.name).toBe('恋人');
    expect(level.nameEn).toBe('lover');
  });

  it('returns 恋人 for score 100 (max boundary)', () => {
    const level = getLevelFromScore(100);
    expect(level.name).toBe('恋人');
  });

  it('returns 陌生人 for negative scores (out of range fallback)', () => {
    const level = getLevelFromScore(-10);
    expect(level.name).toBe('陌生人');
  });

  it('returns 陌生人 for scores above 100 (out of range fallback)', () => {
    const level = getLevelFromScore(999);
    expect(level.name).toBe('陌生人');
  });

  it('returns 陌生人 for mid-range stranger score (10)', () => {
    const level = getLevelFromScore(10);
    expect(level.name).toBe('陌生人');
  });

  it('returns 熟人 for mid-range acquaintance score (30)', () => {
    const level = getLevelFromScore(30);
    expect(level.name).toBe('熟人');
  });

  it('returns 朋友 for mid-range friend score (50)', () => {
    const level = getLevelFromScore(50);
    expect(level.name).toBe('朋友');
  });

  it('returns 暧昧 for mid-range flirtatious score (70)', () => {
    const level = getLevelFromScore(70);
    expect(level.name).toBe('暧昧');
  });

  it('returns 恋人 for mid-range lover score (90)', () => {
    const level = getLevelFromScore(90);
    expect(level.name).toBe('恋人');
  });
});

describe('clampScore', () => {
  it('clamps negative values to 0', () => {
    expect(clampScore(-50)).toBe(0);
  });

  it('clamps negative values to 0 (edge case -1)', () => {
    expect(clampScore(-1)).toBe(0);
  });

  it('returns 0 unchanged', () => {
    expect(clampScore(0)).toBe(0);
  });

  it('returns mid-range values unchanged', () => {
    expect(clampScore(50)).toBe(50);
  });

  it('returns 100 unchanged', () => {
    expect(clampScore(100)).toBe(100);
  });

  it('clamps values above 100 to 100', () => {
    expect(clampScore(150)).toBe(100);
  });

  it('clamps values far above 100 to 100', () => {
    expect(clampScore(99999)).toBe(100);
  });

  it('returns 1 unchanged', () => {
    expect(clampScore(1)).toBe(1);
  });

  it('returns 99 unchanged', () => {
    expect(clampScore(99)).toBe(99);
  });
});

describe('applyDelta', () => {
  it('applies positive delta correctly', () => {
    expect(applyDelta(50, 10)).toBe(60);
  });

  it('applies negative delta correctly', () => {
    expect(applyDelta(50, -10)).toBe(40);
  });

  it('clamps result to 100 when exceeding upper bound', () => {
    expect(applyDelta(95, 10)).toBe(100);
  });

  it('clamps result to 0 when exceeding lower bound', () => {
    expect(applyDelta(5, -10)).toBe(0);
  });

  it('handles zero delta', () => {
    expect(applyDelta(50, 0)).toBe(50);
  });

  it('handles large positive delta', () => {
    expect(applyDelta(0, 999)).toBe(100);
  });

  it('handles large negative delta', () => {
    expect(applyDelta(100, -999)).toBe(0);
  });

  it('handles max possible positive from max score', () => {
    expect(applyDelta(100, 5)).toBe(100);
  });

  it('handles max possible negative from zero', () => {
    expect(applyDelta(0, -5)).toBe(0);
  });
});

describe('didLevelChange', () => {
  it('detects change from 陌生人 to 熟人', () => {
    expect(didLevelChange(20, 21)).toBe(true);
  });

  it('detects change from 熟人 to 朋友', () => {
    expect(didLevelChange(40, 41)).toBe(true);
  });

  it('detects change from 朋友 to 暧昧', () => {
    expect(didLevelChange(60, 61)).toBe(true);
  });

  it('detects change from 暧昧 to 恋人', () => {
    expect(didLevelChange(80, 81)).toBe(true);
  });

  it('detects change across multiple levels', () => {
    expect(didLevelChange(10, 90)).toBe(true);
  });

  it('returns false when staying in same level', () => {
    expect(didLevelChange(5, 15)).toBe(false);
  });

  it('returns false when staying in same level (熟人)', () => {
    expect(didLevelChange(25, 35)).toBe(false);
  });

  it('returns false when score does not change', () => {
    expect(didLevelChange(50, 50)).toBe(false);
  });

  it('detects downgrade from 朋友 to 陌生人', () => {
    expect(didLevelChange(50, 10)).toBe(true);
  });

  it('detects downgrade from 恋人 to 暧昧', () => {
    expect(didLevelChange(85, 75)).toBe(true);
  });

  it('returns false when both scores are in the same level at boundaries', () => {
    expect(didLevelChange(20, 20)).toBe(false);
  });
});

describe('FAVORABILITY_LEVELS', () => {
  it('has exactly 5 levels', () => {
    expect(FAVORABILITY_LEVELS).toHaveLength(5);
  });

  it('covers the full 0-100 range without gaps', () => {
    for (let score = 0; score <= 100; score++) {
      const level = getLevelFromScore(score);
      expect(level).toBeDefined();
      expect(score).toBeGreaterThanOrEqual(level.min);
      expect(score).toBeLessThanOrEqual(level.max);
    }
  });
});
