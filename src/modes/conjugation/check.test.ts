import { describe, expect, it } from 'vitest';
import { canonicalize, checkAnswer, normalizeSpacing, stripDiacritics } from './check.ts';

describe('normalizeSpacing', () => {
  it('lowercases, trims, and collapses internal whitespace', () => {
    expect(normalizeSpacing('  Eu   FALO ')).toBe('eu falo');
    expect(normalizeSpacing('Está')).toBe('está');
  });
});

describe('stripDiacritics', () => {
  it('folds EP combining marks', () => {
    expect(stripDiacritics('és')).toBe('es');
    expect(stripDiacritics('está')).toBe('esta');
    expect(stripDiacritics('põe')).toBe('poe');
    expect(stripDiacritics('têm')).toBe('tem');
  });
});

describe('canonicalize', () => {
  it('applies spacing-normalization AND accent-folding uniformly', () => {
    expect(canonicalize('  ÉS ')).toBe('es');
    expect(canonicalize('Está')).toBe('esta');
  });
});

describe('checkAnswer — shipped diacritic policy (pinned)', () => {
  it('accepts the canonical accented EP form', () => {
    expect(checkAnswer('és', 'és')).toBe(true);
    expect(checkAnswer('está', 'está')).toBe(true);
  });

  it('ALSO accepts an accent-stripped answer against an accented reference', () => {
    expect(checkAnswer('es', 'és')).toBe(true);
    expect(checkAnswer('esta', 'está')).toBe(true);
    expect(checkAnswer('poe', 'põe')).toBe(true);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(checkAnswer('  FALO ', 'falo')).toBe(true);
  });

  it('rejects a genuinely wrong form', () => {
    expect(checkAnswer('falas', 'falo')).toBe(false);
    expect(checkAnswer('sou', 'és')).toBe(false);
  });

  it('treats empty / whitespace / non-string input as wrong (never throws)', () => {
    expect(checkAnswer('', 'falo')).toBe(false);
    expect(checkAnswer('   ', 'falo')).toBe(false);
    expect(checkAnswer(undefined as unknown as string, 'falo')).toBe(false);
  });
});
