import { describe, expect, it } from 'vitest';
import type { VerbData } from './conjugate.ts';
import { checkAnswer } from './check.ts';
import { DEFAULT_SESSION_CONFIG, generateSession } from './session.ts';
import { PERSONS } from './persons.ts';
import { loadVerbData } from './fixtures.test-helper.ts';

const VERBS = loadVerbData();

describe('generateSession — seeded determinism (§6.1)', () => {
  it('same seed + same verbs ⇒ byte-identical item list', () => {
    const a = generateSession('exam-7', VERBS, { count: 12 });
    const b = generateSession('exam-7', VERBS, { count: 12 });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds generally diverge', () => {
    const a = generateSession('seed-a', VERBS, { count: 12 });
    const b = generateSession('seed-b', VERBS, { count: 12 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('respects the requested count (clamped to ≥ 1)', () => {
    expect(generateSession(1, VERBS, { count: 8 })).toHaveLength(8);
    expect(generateSession(1, VERBS, { count: 0 })).toHaveLength(1);
  });
});

describe('generateSession — both task types (AC4)', () => {
  it('emits assemble-table items when tableShare is high, fill-form when low', () => {
    const tables = generateSession('t', VERBS, { count: 20, tableShare: 1 });
    expect(tables.every((i) => i.type === 'assemble-table')).toBe(true);
    const fills = generateSession('f', VERBS, { count: 20, tableShare: 0 });
    expect(fills.every((i) => i.type === 'fill-form')).toBe(true);
  });

  it('assemble-table items carry all 5 persons and a full expected table', () => {
    const [item] = generateSession('tbl', VERBS, { count: 1, tableShare: 1 });
    expect(item.type).toBe('assemble-table');
    if (item.type !== 'assemble-table') throw new Error('expected assemble-table');
    expect(item.persons).toEqual(PERSONS);
    expect(Object.keys(item.expected).sort()).toEqual([...PERSONS].sort());
  });

  it('fill-form items target a single valid person', () => {
    const [item] = generateSession('frm', VERBS, { count: 1, tableShare: 0 });
    expect(item.type).toBe('fill-form');
    if (item.type !== 'fill-form') throw new Error('expected fill-form');
    expect(PERSONS).toContain(item.person);
  });
});

describe('generateSession — grounded prompts (plan-review note 2 / AC5)', () => {
  it('every item carries a source ref tying it to a real verb', () => {
    const items = generateSession('grounded', VERBS, { count: 30 });
    const infs = new Set(VERBS.map((v) => v.infinitive));
    for (const item of items) {
      expect(item.source.verbId).toBe(`verb:${item.infinitive}`);
      expect(infs.has(item.source.infinitive)).toBe(true);
      expect(['table', 'rule']).toContain(item.source.derivation);
      // The prompt mentions the verb — not random nonsense.
      expect(item.prompt).toContain(item.infinitive);
    }
  });

  it('the expected answer is the objectively-checkable reference form', () => {
    const items = generateSession('ans', VERBS, { count: 20 });
    for (const item of items) {
      if (item.type === 'fill-form') {
        expect(checkAnswer(item.expected, item.expected)).toBe(true);
      } else {
        for (const person of item.persons) {
          expect(checkAnswer(item.expected[person], item.expected[person])).toBe(true);
        }
      }
    }
  });
});

describe('generateSession — §6.5 gate applied (AC3)', () => {
  it('NEVER includes a needsTableReview or irregular-without-table verb', () => {
    const items = generateSession('gate', VERBS, { count: 200 });
    const eligibleInfs = new Set(
      VERBS.filter((v) => v.table || (v.regular && !v.infinitive.includes('-'))).map(
        (v) => v.infinitive,
      ),
    );
    const reviewInfs = new Set(VERBS.filter((v) => v.needsTableReview).map((v) => v.infinitive));
    for (const item of items) {
      expect(reviewInfs.has(item.infinitive)).toBe(false);
      expect(eligibleInfs.has(item.infinitive)).toBe(true);
    }
  });

  it('returns an empty session gracefully when no verb is eligible', () => {
    const noneEligible: VerbData[] = [
      { infinitive: 'haver', group: '-er', regular: false, needsTableReview: true },
      { infinitive: 'foo', group: '-ar', regular: false },
    ];
    expect(generateSession('x', noneEligible, { count: 5 })).toEqual([]);
    expect(generateSession('x', [], { count: 5 })).toEqual([]);
  });
});

describe('DEFAULT_SESSION_CONFIG', () => {
  it('is a sane mixed default', () => {
    expect(DEFAULT_SESSION_CONFIG.count).toBeGreaterThan(0);
    expect(DEFAULT_SESSION_CONFIG.tableShare).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SESSION_CONFIG.tableShare).toBeLessThanOrEqual(1);
  });
});
