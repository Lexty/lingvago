import { describe, expect, it } from 'vitest';
import type { NounRecord } from '../../db/schema.ts';
import { filterGenderEligible, isGenderEligible } from './eligibility.ts';

function noun(over: Partial<NounRecord>): NounRecord {
  return {
    contentId: 'noun:x',
    lemma: 'x',
    gender: 'm',
    article: 'o',
    en: null,
    ...over,
  };
}

describe('isGenderEligible — the §6.5 verified-key gate', () => {
  it('accepts a verified masculine (m/o) and feminine (f/a) noun', () => {
    expect(isGenderEligible(noun({ gender: 'm', article: 'o' }))).toBe(true);
    expect(isGenderEligible(noun({ gender: 'f', article: 'a' }))).toBe(true);
  });

  it('EXCLUDES a noun whose gender is not m/f', () => {
    expect(isGenderEligible({ ...noun({}), gender: 'n' as unknown as 'm' })).toBe(false);
    expect(isGenderEligible({ ...noun({}), gender: undefined as unknown as 'm' })).toBe(false);
  });

  it('EXCLUDES a noun whose article is not o/a (no verified key)', () => {
    expect(isGenderEligible({ ...noun({}), article: 'os' as unknown as 'o' })).toBe(false);
    expect(isGenderEligible({ ...noun({}), article: undefined as unknown as 'o' })).toBe(false);
  });

  it('EXCLUDES a noun whose gender and article DISAGREE (inconsistent key)', () => {
    expect(isGenderEligible(noun({ gender: 'm', article: 'a' }))).toBe(false);
    expect(isGenderEligible(noun({ gender: 'f', article: 'o' }))).toBe(false);
  });

  it('EXCLUDES null/undefined rather than throwing', () => {
    expect(isGenderEligible(null)).toBe(false);
    expect(isGenderEligible(undefined)).toBe(false);
  });
});

describe('filterGenderEligible (the gate, applied)', () => {
  it('keeps only verified rows and drops the rest', () => {
    const rows: NounRecord[] = [
      noun({ contentId: 'noun:a', gender: 'm', article: 'o' }),
      noun({ contentId: 'noun:b', gender: 'f', article: 'a' }),
      noun({ contentId: 'noun:bad', gender: 'm', article: 'a' }), // disagree
      { ...noun({ contentId: 'noun:nokey' }), article: '' as unknown as 'o' },
    ];
    const kept = filterGenderEligible(rows).map((n) => n.contentId);
    expect(kept).toEqual(['noun:a', 'noun:b']);
  });
});
