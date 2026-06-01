import { describe, expect, it } from 'vitest';
import type { NounRecord } from '../../db/schema.ts';
import { checkAnswer } from '../shared/check.ts';
import { contract } from './contractions.ts';
import {
  DEFAULT_GENDER_SESSION_CONFIG,
  GENDER_LEVELS,
  generateSession,
  type GenderItem,
} from './session.ts';

/** A small verified noun fixture (mix of m/f) plus deliberately bad rows. */
const NOUNS: NounRecord[] = [
  { contentId: 'noun:amigo', lemma: 'amigo', gender: 'm', article: 'o', en: 'friend' },
  { contentId: 'noun:casa', lemma: 'casa', gender: 'f', article: 'a', en: 'house' },
  { contentId: 'noun:livro', lemma: 'livro', gender: 'm', article: 'o', en: 'book' },
  { contentId: 'noun:mesa', lemma: 'mesa', gender: 'f', article: 'a', en: 'table' },
  { contentId: 'noun:água', lemma: 'água', gender: 'f', article: 'a', en: 'water' },
];

/** A row whose article key is NOT verified — must never seed an item (§6.5). */
const UNVERIFIED: NounRecord = {
  contentId: 'noun:bad',
  lemma: 'bad',
  gender: 'm',
  article: 'a', // disagrees with gender → no trusted key
  en: null,
};

describe('generateSession — seeded determinism (§6.1 / AC seeded)', () => {
  it('same seed + same nouns + same config ⇒ byte-identical list', () => {
    const a = generateSession('g-7', NOUNS, { count: 12, level: 'L3' });
    const b = generateSession('g-7', NOUNS, { count: 12, level: 'L3' });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds generally diverge', () => {
    const a = generateSession('seed-a', NOUNS, { count: 12, level: 'L1' });
    const b = generateSession('seed-b', NOUNS, { count: 12, level: 'L1' });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('respects the requested count (clamped to ≥ 1)', () => {
    expect(generateSession(1, NOUNS, { count: 8 })).toHaveLength(8);
    expect(generateSession(1, NOUNS, { count: 0 })).toHaveLength(1);
  });

  it('defaults to a short L1 definite session', () => {
    const items = generateSession('def', NOUNS);
    expect(items).toHaveLength(DEFAULT_GENDER_SESSION_CONFIG.count);
    expect(items.every((i) => i.level === 'L1')).toBe(true);
  });
});

describe('verified key from nouns.article (AC2 / §6.5)', () => {
  it('every item answer derives from the source noun, never guessed', () => {
    const items = generateSession('keys', NOUNS, { count: 30, level: 'L1' });
    const byId = new Map(NOUNS.map((n) => [n.contentId, n]));
    for (const item of items) {
      const src = byId.get(item.drill.sourceRef.id);
      expect(src).toBeDefined();
      // L1 definite: the answer IS the noun's verified article.
      expect(item.drill.answer).toBe(src?.article);
      expect(checkAnswer(item.drill.answer, src!.article)).toBe(true);
    }
  });

  it('the §6.5 gate keeps an unverified noun OUT of the session (QA gate)', () => {
    const items = generateSession('gate', [...NOUNS, UNVERIFIED], { count: 40, level: 'L1' });
    expect(items.some((i) => i.drill.sourceRef.id === UNVERIFIED.contentId)).toBe(false);
  });

  it('returns [] (graceful) when no noun is verified-eligible', () => {
    expect(generateSession('empty', [UNVERIFIED], { count: 5 })).toEqual([]);
    expect(generateSession('empty', [], { count: 5 })).toEqual([]);
  });
});

describe('§6.3 mode decision — MC where parity assembles, else production', () => {
  it('L1 definite (o/a parity-equal) ⇒ MC with the opposite-article distractor', () => {
    const items = generateSession('l1', NOUNS, { count: 20, level: 'L1' });
    for (const item of items) {
      expect(item.drill.mode).toBe('mc');
      if (item.drill.mode !== 'mc') throw new Error('expected mc');
      expect(item.drill.options).toHaveLength(2);
      // exactly one correct, all carry explanations, no duplicate-correct
      const surfaces = item.drill.options.map((o) => o.surface);
      expect(new Set(surfaces).size).toBe(surfaces.length);
      expect(item.drill.options.filter((o) => o.correct)).toHaveLength(1);
      expect(item.drill.options.every((o) => o.explanation.length > 0)).toBe(true);
      // the distractor is the OPPOSITE article (competitive, §6.3)
      const distractor = item.drill.options.find((o) => !o.correct)!;
      expect(distractor.surface).toBe(item.drill.answer === 'o' ? 'a' : 'o');
    }
  });

  it('L2 indefinite (um/uma NOT parity-equal) ⇒ production fallback', () => {
    const items = generateSession('l2', NOUNS, { count: 40, level: 'L2' });
    const indef = items.filter((i) => i.kind === 'indefinite');
    const def = items.filter((i) => i.kind === 'definite');
    expect(indef.length).toBeGreaterThan(0);
    expect(def.length).toBeGreaterThan(0);
    // indefinite has no length-parity peer (um≠uma) ⇒ production
    expect(indef.every((i) => i.drill.mode === 'production')).toBe(true);
    // the definite half still assembles MC
    expect(def.every((i) => i.drill.mode === 'mc')).toBe(true);
  });

  it('L3 de/em contractions (do/da, no/na parity-equal) ⇒ MC with the trap', () => {
    const items = generateSession('l3', NOUNS, { count: 60, level: 'L3' });
    const deEm = items.filter((i) => i.prep === 'de' || i.prep === 'em');
    expect(deEm.length).toBeGreaterThan(0);
    for (const item of deEm) {
      expect(item.drill.mode).toBe('mc');
      if (item.drill.mode !== 'mc') throw new Error('expected mc');
      // answer is the by-rule contraction; distractor is the opposite one
      const trap = item.drill.options.find((o) => !o.correct)!;
      expect(trap.surface).not.toBe(item.drill.answer);
      expect(trap.surface.length).toBe(item.drill.answer.length); // parity
    }
  });

  it('L3 a+article (à folds to length-1, no peer) ⇒ production fallback', () => {
    const items = generateSession('l3a', NOUNS, { count: 60, level: 'L3' });
    const aPrep = items.filter((i) => i.prep === 'a');
    expect(aPrep.length).toBeGreaterThan(0);
    expect(aPrep.every((i) => i.drill.mode === 'production')).toBe(true);
  });
});

describe('L1–L3 curve (§4.8) — deterministic by level', () => {
  it('declares exactly L1, L2, L3', () => {
    expect(GENDER_LEVELS).toEqual(['L1', 'L2', 'L3']);
  });

  it('every item carries the requested level and a grounded answer', () => {
    for (const level of GENDER_LEVELS) {
      const items = generateSession('curve', NOUNS, { count: 15, level });
      expect(items.every((i) => i.level === level)).toBe(true);
      for (const item of items) {
        // contraction answers match the by-rule table for the source article
        if (item.kind === 'contraction' && item.prep) {
          const src = NOUNS.find((n) => n.contentId === item.drill.sourceRef.id)!;
          expect(item.drill.answer).toBe(contract(item.prep, src.article));
        }
      }
    }
  });

  it('the same noun at L1 vs L3 drills a different (harder) key', () => {
    const l1 = generateSession('x', NOUNS, { count: 1, level: 'L1' })[0] as GenderItem;
    const l3 = generateSession('x', NOUNS, { count: 1, level: 'L3' })[0] as GenderItem;
    expect(l1.kind).toBe('definite');
    expect(l3.kind).toBe('contraction');
  });
});
