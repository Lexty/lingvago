import { describe, expect, it } from 'vitest';
import { canonicalize, checkAnswer } from '../shared/check.ts';

// Pins the diacritic policy for the GenderArticle drill (plan-review note: pin
// the accent semantics where answers are compared). The `a + a = à` contraction
// is the load-bearing case: `à` must canonicalize to `a` so the objective check
// accepts both `à` and an accent-stripped `a`, and so the parity module measures
// it as length-1.

describe('GenderArticle objective check — accent semantics (à)', () => {
  it('canonicalizes à → a (fold applied to the contraction surface)', () => {
    expect(canonicalize('à')).toBe('a');
    expect(canonicalize('à').length).toBe(1);
  });

  it('accepts the canonical contraction WITH its diacritic', () => {
    expect(checkAnswer('à', 'à')).toBe(true);
  });

  it('ALSO accepts the accent-STRIPPED answer (not an orthography test)', () => {
    // a learner who typed `a` for the contraction `à` is not penalised
    expect(checkAnswer('a', 'à')).toBe(true);
    expect(checkAnswer('à', 'a')).toBe(true);
  });

  it('still rejects a genuinely wrong contraction', () => {
    expect(checkAnswer('ao', 'à')).toBe(false);
    expect(checkAnswer('do', 'da')).toBe(false);
  });

  it('treats empty / whitespace input as wrong, never throws', () => {
    expect(checkAnswer('', 'a')).toBe(false);
    expect(checkAnswer('   ', 'a')).toBe(false);
  });
});
