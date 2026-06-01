import { describe, expect, it } from 'vitest';
import type { DrillSourceRef, McDrillItem } from './drillItem.ts';
import {
  assembleMcOrProduction,
  canAssembleParity,
  isParityEqual,
  MIN_MC_OPTIONS,
  parityShapeOf,
  qualifyingDistractors,
  type AssembleInput,
  type DistractorCandidate,
} from './parity.ts';

const SOURCE: DrillSourceRef = { store: 'nouns', id: 'noun:casa' };

/** A minimal valid MC input: answer `a` (def-fem article) with parity peers. */
function genderInput(overrides: Partial<AssembleInput> = {}): AssembleInput {
  return {
    seed: 'seed-1',
    prompt: 'casa → ___',
    answer: 'a',
    answerExplanation: 'feminine singular definite article',
    parityClass: 'article-def',
    candidates: [
      { surface: 'o', explanation: 'opposite article (masculine)' },
    ],
    sourceRef: SOURCE,
    ...overrides,
  };
}

describe('parityShapeOf / isParityEqual', () => {
  it('measures length and word-count on the canonical (accent-folded) key', () => {
    // `à` folds to a single char `a`, matching `o`/`a`.
    expect(parityShapeOf('à', 'c')).toEqual({ length: 1, wordCount: 1, parityClass: 'c' });
    expect(parityShapeOf('do', 'c')).toEqual({ length: 2, wordCount: 1, parityClass: 'c' });
    expect(parityShapeOf('em casa', 'c')).toEqual({
      length: 7,
      wordCount: 2,
      parityClass: 'c',
    });
  });

  it('treats equal length + word-count + class as parity-equal', () => {
    expect(isParityEqual(parityShapeOf('o', 'x'), parityShapeOf('a', 'x'))).toBe(true);
    expect(isParityEqual(parityShapeOf('do', 'x'), parityShapeOf('da', 'x'))).toBe(true);
  });

  it('rejects parity across different length, word-count, OR class', () => {
    // different length
    expect(isParityEqual(parityShapeOf('o', 'x'), parityShapeOf('do', 'x'))).toBe(false);
    // different word-count
    expect(
      isParityEqual(parityShapeOf('a', 'x'), parityShapeOf('a a', 'x')),
    ).toBe(false);
    // different class (same length/word-count) — keeps articles from mixing
    // with bare prepositions even at identical surface length.
    expect(isParityEqual(parityShapeOf('o', 'article'), parityShapeOf('a', 'prep'))).toBe(
      false,
    );
  });
});

describe('qualifyingDistractors', () => {
  it('keeps only parity-equal candidates', () => {
    const candidates: DistractorCandidate[] = [
      { surface: 'o', explanation: 'opposite article' }, // length 1 → ok
      { surface: 'do', explanation: 'wrong shape' }, // length 2 → rejected
      { surface: 'os', explanation: 'plural, wrong shape' }, // length 2 → rejected
    ];
    const out = qualifyingDistractors('a', 'article-def', candidates);
    expect(out.map((c) => c.surface)).toEqual(['o']);
  });

  it('drops a duplicate-correct candidate (no duplicate-correct, §6.3)', () => {
    const candidates: DistractorCandidate[] = [
      { surface: 'a', explanation: 'same as correct' }, // duplicate-correct
      { surface: 'A', explanation: 'duplicate-correct, different case' },
      { surface: 'o', explanation: 'opposite article' },
    ];
    const out = qualifyingDistractors('a', 'article-def', candidates);
    expect(out.map((c) => c.surface)).toEqual(['o']);
  });

  it('de-dups distractors by canonical key', () => {
    const candidates: DistractorCandidate[] = [
      { surface: 'o', explanation: 'first' },
      { surface: 'O', explanation: 'duplicate of o' },
    ];
    const out = qualifyingDistractors('a', 'article-def', candidates);
    expect(out).toHaveLength(1);
  });

  it('ignores empty / whitespace candidate surfaces', () => {
    const candidates: DistractorCandidate[] = [
      { surface: '', explanation: 'empty' },
      { surface: '   ', explanation: 'whitespace' },
      { surface: 'o', explanation: 'opposite article' },
    ];
    const out = qualifyingDistractors('a', 'article-def', candidates);
    expect(out.map((c) => c.surface)).toEqual(['o']);
  });

  it('preserves input order (no randomisation here)', () => {
    const candidates: DistractorCandidate[] = [
      { surface: 'o', explanation: 'a' },
      { surface: 'e', explanation: 'b' },
      { surface: 'u', explanation: 'c' },
    ];
    const out = qualifyingDistractors('a', 'x', candidates);
    expect(out.map((c) => c.surface)).toEqual(['o', 'e', 'u']);
  });
});

describe('canAssembleParity — the deterministic fallback decision', () => {
  it('needs at least MIN_MC_OPTIONS total options (correct + distractors)', () => {
    expect(MIN_MC_OPTIONS).toBe(2);
    expect(canAssembleParity(0)).toBe(false); // only the correct option → not a choice
    expect(canAssembleParity(1)).toBe(true); // correct + 1 distractor → MC
    expect(canAssembleParity(3)).toBe(true);
  });
});

describe('assembleMcOrProduction — success path (parity assembles → MC)', () => {
  it('builds an MC item with the correct option + a competitive distractor', () => {
    const item = assembleMcOrProduction(genderInput());
    expect(item.mode).toBe('mc');
    const mc = item as McDrillItem;
    expect(mc.options).toHaveLength(2);
    const correct = mc.options.filter((o) => o.correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].surface).toBe('a');
    // The competitive (opposite-article) distractor is present...
    const distractor = mc.options.find((o) => !o.correct);
    expect(distractor?.surface).toBe('o');
    // ...and carries its typical-error explanation.
    expect(distractor?.explanation).toContain('opposite article');
  });

  it('every option (correct + distractors) carries a non-empty explanation', () => {
    const item = assembleMcOrProduction(
      genderInput({
        candidates: [
          { surface: 'o', explanation: 'opposite article' },
          { surface: 'e', explanation: 'neighbouring vowel' },
        ],
      }),
    ) as McDrillItem;
    for (const opt of item.options) {
      expect(opt.explanation.length).toBeGreaterThan(0);
    }
  });

  it('contains no duplicate-correct option among the rendered options', () => {
    const item = assembleMcOrProduction(
      genderInput({
        candidates: [
          { surface: 'a', explanation: 'duplicate-correct (filtered)' },
          { surface: 'o', explanation: 'opposite article' },
        ],
      }),
    ) as McDrillItem;
    const correctSurfaces = item.options.filter((o) => o.correct);
    expect(correctSurfaces).toHaveLength(1);
    // `a` must appear exactly once total (the correct option), never as a
    // distractor.
    const aCount = item.options.filter((o) => o.surface.toLowerCase() === 'a').length;
    expect(aCount).toBe(1);
  });

  it('keeps all options parity-equal (length / word-count / class)', () => {
    const item = assembleMcOrProduction(
      genderInput({
        candidates: [
          { surface: 'o', explanation: 'opposite article' },
          { surface: 'do', explanation: 'wrong shape — must be filtered out' },
        ],
      }),
    ) as McDrillItem;
    const shapes = item.options.map((o) => parityShapeOf(o.surface, 'article-def'));
    const first = shapes[0];
    for (const s of shapes) {
      expect(isParityEqual(s, first)).toBe(true);
    }
    // The wrong-shape `do` was excluded → only correct + `o`.
    expect(item.options).toHaveLength(2);
  });

  it('keeps the correct option plus ALL qualifying distractors', () => {
    const item = assembleMcOrProduction(
      genderInput({
        candidates: [
          { surface: 'o', explanation: 'opposite' },
          { surface: 'e', explanation: 'vowel' },
          { surface: 'u', explanation: 'vowel' },
        ],
      }),
    ) as McDrillItem;
    expect(item.options).toHaveLength(4); // 1 correct + 3 distractors
    expect(item.options.filter((o) => o.correct)).toHaveLength(1);
  });
});

describe('assembleMcOrProduction — fallback → production (§6.3 invariant)', () => {
  it('falls back to production when there are NO candidates', () => {
    const item = assembleMcOrProduction(genderInput({ candidates: [] }));
    expect(item.mode).toBe('production');
    expect('options' in item).toBe(false);
    expect(item.answer).toBe('a');
  });

  it('falls back to production when NO candidate passes the parity filter', () => {
    const item = assembleMcOrProduction(
      genderInput({
        candidates: [
          { surface: 'do', explanation: 'wrong shape' },
          { surface: 'os', explanation: 'wrong shape' },
        ],
      }),
    );
    expect(item.mode).toBe('production');
  });

  it('falls back to production when the only candidate duplicates the correct answer', () => {
    const item = assembleMcOrProduction(
      genderInput({ candidates: [{ surface: 'a', explanation: 'duplicate-correct' }] }),
    );
    expect(item.mode).toBe('production');
  });

  it('never throws on empty/insufficient input — returns a production item', () => {
    expect(() => assembleMcOrProduction(genderInput({ candidates: [] }))).not.toThrow();
    const item = assembleMcOrProduction(genderInput({ candidates: [] }));
    expect(item.sourceRef).toEqual(SOURCE);
    expect(item.prompt).toBe('casa → ___');
  });
});

describe('assembleMcOrProduction — single qualifying candidate (boundary)', () => {
  it('exactly one qualifying distractor → MC (correct + 1)', () => {
    const item = assembleMcOrProduction(
      genderInput({ candidates: [{ surface: 'o', explanation: 'opposite article' }] }),
    );
    expect(item.mode).toBe('mc');
    expect((item as McDrillItem).options).toHaveLength(2);
  });
});

describe('assembleMcOrProduction — seeded determinism (§6.1)', () => {
  const manyCandidates: DistractorCandidate[] = [
    { surface: 'o', explanation: 'd1' },
    { surface: 'e', explanation: 'd2' },
    { surface: 'u', explanation: 'd3' },
    { surface: 'i', explanation: 'd4' },
  ];

  it('same seed → identical option order AND selection', () => {
    const a = assembleMcOrProduction(
      genderInput({ seed: 'fixed', candidates: manyCandidates }),
    ) as McDrillItem;
    const b = assembleMcOrProduction(
      genderInput({ seed: 'fixed', candidates: manyCandidates }),
    ) as McDrillItem;
    expect(a.options.map((o) => o.surface)).toEqual(b.options.map((o) => o.surface));
  });

  it('different seeds CAN produce a different layout (uses the PRNG, not Math.random)', () => {
    const seeds = ['s0', 's1', 's2', 's3', 's4', 's5'];
    const layouts = seeds.map(
      (seed) =>
        (
          assembleMcOrProduction(
            genderInput({ seed, candidates: manyCandidates }),
          ) as McDrillItem
        ).options
          .map((o) => o.surface)
          .join(','),
    );
    // At least two distinct layouts across seeds ⇒ ordering is seed-driven, not
    // constant (and not a single frozen order).
    expect(new Set(layouts).size).toBeGreaterThan(1);
  });
});
