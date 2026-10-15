import { describe, expect, it } from 'vitest';
import { difficultyAt } from '../src/core/difficulty';
import { comboMultiplier, orderScore } from '../src/core/scoring';
import { formatAccuracy, formatTime, shiftDurationFromSearch } from '../src/core/time';

describe('scoring and difficulty', () => {
  it('caps the combo multiplier at 2', () => {
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(2)).toBeCloseTo(1.2);
    expect(comboMultiplier(7)).toBe(2);
  });

  it('awards a full-patience jollof at combo 1 and combo 2', () => {
    expect(orderScore(100, 14_000, 14_000, 1)).toBe(150);
    expect(orderScore(100, 14_000, 14_000, 2)).toBe(180);
  });

  it('ramps patience and the gap across a shift', () => {
    expect(difficultyAt(0, 90_000)).toEqual({ patienceMs: 38_000, gapMs: 9_000 });
    expect(difficultyAt(90_000, 90_000)).toEqual({ patienceMs: 26_000, gapMs: 5_000 });
  });

  it('formats the clock, accuracy and test duration', () => {
    expect(formatTime(90_000)).toBe('1:30');
    expect(formatTime(1_500)).toBe('0:02');
    expect(formatAccuracy(null)).toBe('—');
    expect(formatAccuracy(0.5)).toBe('50%');
    expect(shiftDurationFromSearch('?duration=12', false)).toBe(12_000);
    expect(shiftDurationFromSearch('?duration=12', true)).toBe(90_000);
    expect(shiftDurationFromSearch('?duration=3', false)).toBe(90_000);
    expect(shiftDurationFromSearch('?duration=99', false)).toBe(90_000);
  });
});
