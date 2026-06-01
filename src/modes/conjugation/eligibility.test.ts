import { describe, expect, it } from 'vitest';
import type { VerbData } from './conjugate.ts';
import { filterExamEligible, isExamEligible } from './eligibility.ts';
import { loadInventory, loadVerbData } from './fixtures.test-helper.ts';

describe('isExamEligible — the §6.5 content-QA gate', () => {
  it('accepts a regular -ar/-er/-ir verb with a known group', () => {
    expect(isExamEligible({ infinitive: 'falar', group: '-ar', regular: true })).toBe(true);
    expect(isExamEligible({ infinitive: 'comer', group: '-er', regular: true })).toBe(true);
    expect(isExamEligible({ infinitive: 'abrir', group: '-ir', regular: true })).toBe(true);
  });

  it('accepts an irregular verb that HAS a verified table', () => {
    const verb: VerbData = {
      infinitive: 'ser',
      group: '-er',
      regular: false,
      table: { eu: 'sou', tu: 'és', voce_ele_ela: 'é', nos: 'somos', voces_eles_elas: 'são' },
    };
    expect(isExamEligible(verb)).toBe(true);
  });

  it('EXCLUDES a needsTableReview verb even with a table', () => {
    const verb: VerbData = {
      infinitive: 'conhecer',
      group: '-er',
      regular: false,
      needsTableReview: true,
      table: { eu: 'x', tu: 'x', voce_ele_ela: 'x', nos: 'x', voces_eles_elas: 'x' },
    };
    expect(isExamEligible(verb)).toBe(false);
  });

  it('EXCLUDES an irregular verb WITHOUT a verified table', () => {
    expect(isExamEligible({ infinitive: 'foo', group: '-ar', regular: false })).toBe(false);
  });

  it('EXCLUDES a -or verb (pôr) with no table (rule cannot handle it)', () => {
    expect(isExamEligible({ infinitive: 'pôr', group: '-or', regular: false })).toBe(false);
  });

  it('EXCLUDES a reflexive verb with no table (rule path rejects -se)', () => {
    expect(isExamEligible({ infinitive: 'sentir-se', group: '-ir', regular: true })).toBe(false);
  });
});

describe('the gate applied to REAL extraction data', () => {
  const verbs = loadVerbData();
  const inventory = loadInventory();

  it('never lets a needsTableReview verb through (all 9)', () => {
    const eligibleInfs = new Set(filterExamEligible(verbs).map((v) => v.infinitive));
    const flagged = inventory.filter((v) => v.needsTableReview).map((v) => v.infinitive);
    expect(flagged.length).toBe(9);
    for (const inf of flagged) {
      expect(eligibleInfs.has(inf)).toBe(false);
    }
  });

  it('never lets an irregular-without-table verb through', () => {
    const tableInfs = new Set(verbs.filter((v) => v.table).map((v) => v.infinitive));
    const eligible = filterExamEligible(verbs);
    for (const v of eligible) {
      const trusted = (v.regular && !v.infinitive.includes('-')) || tableInfs.has(v.infinitive);
      expect(trusted).toBe(true);
    }
  });

  it('produces a non-empty eligible set (sanity: the gate is not over-zealous)', () => {
    const eligible = filterExamEligible(verbs);
    expect(eligible.length).toBeGreaterThanOrEqual(20);
    // pôr is eligible via its verified table even though regular is null/-or.
    expect(eligible.some((v) => v.infinitive === 'pôr')).toBe(true);
  });
});
