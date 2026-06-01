import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from './check.ts';

describe('normalizeSpacing', () => {
  it('lowercases, trims, and collapses internal whitespace', () => {
    expect(normalizeSpacing('  Vinte   E  Três ')).toBe('vinte e três');
  });
});

describe('stripDiacritics', () => {
  it('folds combining accents (três → tres, sétimo → setimo)', () => {
    expect(stripDiacritics('três')).toBe('tres');
    expect(stripDiacritics('sétimo')).toBe('setimo');
  });
});

describe('canonicalize', () => {
  it('is spacing- AND accent-normalized', () => {
    expect(canonicalize('  Vinte E  TRÊS ')).toBe('vinte e tres');
  });
});

describe('checkAnswer — diacritic policy (AC4, pinned)', () => {
  // Reference answer is the canonical EP spelling WITH diacritics.
  const expected = 'vinte e três';

  it('accepts the canonical answer WITH diacritics (correct)', () => {
    expect(checkAnswer('vinte e três', expected)).toBe(true);
  });

  it('accepts the accent-STRIPPED answer (also correct, uniform policy)', () => {
    expect(checkAnswer('vinte e tres', expected)).toBe(true);
  });

  it('is case-insensitive and whitespace-tolerant', () => {
    expect(checkAnswer('  VINTE  e   Três ', expected)).toBe(true);
  });

  it('rejects a genuinely wrong spelling', () => {
    expect(checkAnswer('vinte e quatro', expected)).toBe(false);
  });
});

describe('checkAnswer — invalid input (error path)', () => {
  it('treats empty / whitespace-only input as wrong without throwing', () => {
    expect(checkAnswer('', 'cem')).toBe(false);
    expect(checkAnswer('   ', 'cem')).toBe(false);
  });

  it('treats a non-numeric / garbage answer as wrong', () => {
    expect(checkAnswer('banana', 'cem')).toBe(false);
  });

  it('matches a digit answer exactly after trimming (word→digit)', () => {
    expect(checkAnswer(' 145 ', '145')).toBe(true);
    expect(checkAnswer('145 cards', '145')).toBe(false);
  });
});
