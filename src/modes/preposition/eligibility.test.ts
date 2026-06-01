import { describe, expect, it } from 'vitest';
import type { PrepositionRecord } from '../../db/schema.ts';
import {
  filterPrepositionEligible,
  isPrepCategory,
  isPrepositionEligible,
  PREP_CATEGORIES,
} from './eligibility.ts';

function rec(over: Partial<PrepositionRecord>): PrepositionRecord {
  return {
    contentId: 'prep:tempo:0000',
    category: 'tempo',
    prep: 'de',
    use: 'tempo',
    examples: ['De manhã apanho o metro.'],
    ...over,
  };
}

describe('isPrepCategory — the three verified sub-skills', () => {
  it('declares exactly tempo/movimento/lugar (no transporte)', () => {
    expect([...PREP_CATEGORIES]).toEqual(['tempo', 'movimento', 'lugar']);
    expect(isPrepCategory('transporte')).toBe(false);
  });

  it('accepts the verified categories, rejects others', () => {
    expect(isPrepCategory('tempo')).toBe(true);
    expect(isPrepCategory('lugar')).toBe(true);
    expect(isPrepCategory('bogus')).toBe(false);
    expect(isPrepCategory(undefined)).toBe(false);
  });
});

describe('isPrepositionEligible — the §6.5 / AC3 verified-key gate', () => {
  it('accepts a record with a verified category + blankable example', () => {
    expect(isPrepositionEligible(rec({}))).toBe(true);
  });

  it('EXCLUDES a record whose category is not a verified sub-skill', () => {
    expect(isPrepositionEligible(rec({ category: 'transporte' }))).toBe(false);
  });

  it('EXCLUDES a record with an empty/missing prep', () => {
    expect(isPrepositionEligible(rec({ prep: '' }))).toBe(false);
    expect(isPrepositionEligible(rec({ prep: undefined as unknown as string }))).toBe(false);
  });

  it('EXCLUDES a record whose prep never occurs exactly once (≠ 1)', () => {
    // 2 occurrences → not blankable
    expect(
      isPrepositionEligible(rec({ prep: 'de', examples: ['Hoje é dia 16 de março de 2005.'] })),
    ).toBe(false);
    // 0 occurrences → not blankable
    expect(
      isPrepositionEligible(rec({ prep: 'em', examples: ['Estamos no verão.'] })),
    ).toBe(false);
  });

  it('EXCLUDES a compound locução whose examples use the contracted form (AC3)', () => {
    expect(
      isPrepositionEligible(
        rec({
          category: 'lugar',
          prep: 'em frente de',
          examples: ['Na Rua … em frente da Faculdade.', 'É mesmo em frente da estação.'],
        }),
      ),
    ).toBe(false);
  });

  it('EXCLUDES null/undefined/malformed examples rather than throwing', () => {
    expect(isPrepositionEligible(null)).toBe(false);
    expect(isPrepositionEligible(undefined)).toBe(false);
    expect(
      isPrepositionEligible(rec({ examples: undefined as unknown as string[] })),
    ).toBe(false);
  });
});

describe('filterPrepositionEligible (the gate, applied)', () => {
  it('keeps only verified-blankable rows and drops the rest', () => {
    const rows: PrepositionRecord[] = [
      rec({ contentId: 'prep:tempo:0001', prep: 'de', examples: ['De manhã apanho o metro.'] }),
      rec({ contentId: 'prep:tempo:0002', prep: 'de', examples: ['Hoje é dia 16 de março de 2005.'] }), // 2 occ
      rec({
        contentId: 'prep:lugar:0000',
        category: 'lugar',
        prep: 'em frente de',
        examples: ['Na Rua … em frente da Faculdade.'],
      }), // compound
      rec({ contentId: 'prep:transporte:0000', category: 'transporte' }), // bad category
    ];
    const kept = filterPrepositionEligible(rows).map((r) => r.contentId);
    expect(kept).toEqual(['prep:tempo:0001']);
  });
});
