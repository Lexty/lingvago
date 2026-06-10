import { describe, expect, it } from 'vitest';
import type { InterrogativeRecord } from '../../db/schema.ts';
import { canonicalize } from '../shared/check.ts';
import {
  filterInterrogativeEligible,
  gradeableFill,
  isInterrogativeEligible,
  reconstructAnswer,
} from './eligibility.ts';
import {
  agreementEquals,
  INTERROGATIVE_TABLE,
  normalizeAgreement,
  parityClassFor,
  tableEntryFor,
} from './intData.ts';

function rec(over: Partial<InterrogativeRecord>): InterrogativeRecord {
  return {
    contentId: 'int:0000',
    blankSentence: '___ moras?',
    answer: 'onde',
    category: 'where',
    gloss_ru: 'где',
    gloss_en: 'where',
    source: 'test',
    sourceLine: 1,
    ...over,
  };
}

/**
 * A small fixture spanning the shapes that matter: an invariable wh form, the
 * qual NUMBER-agreeing form, and the quanto-family GENDER+NUMBER forms — each
 * reduced to the SINGLE normalized agreement vocabulary before compare.
 */
const FIXTURE: InterrogativeRecord[] = [
  rec({ contentId: 'int:a', answer: 'onde', category: 'where', blankSentence: '___ moras?' }),
  rec({
    contentId: 'int:b',
    answer: 'quem',
    category: 'who',
    gloss_ru: 'кто',
    gloss_en: 'who',
    blankSentence: '___ é ele?',
  }),
  rec({
    contentId: 'int:c',
    answer: 'qual',
    category: 'which',
    gloss_ru: 'какой',
    gloss_en: 'which',
    agreement: { number: 'sg' },
    blankSentence: '___ é a tua profissão?',
  }),
  rec({
    contentId: 'int:d',
    answer: 'quantos',
    category: 'how_much',
    gloss_ru: 'сколько',
    gloss_en: 'how many',
    agreement: { gender: 'm', number: 'pl', noun: 'anos' },
    blankSentence: '___ anos tens?',
  }),
  rec({
    contentId: 'int:e',
    answer: 'quanto',
    category: 'how_much',
    gloss_ru: 'сколько',
    gloss_en: 'how much',
    // int:0015-style: NO `noun` field — informational only, must not break gate.
    agreement: { gender: 'm', number: 'sg' },
    blankSentence: '___ custa um quilo de maçãs?',
  }),
  rec({
    contentId: 'int:f',
    answer: 'de onde',
    category: 'where_from',
    gloss_ru: 'откуда',
    gloss_en: 'where from',
    // Correctly blanked: the whole `de onde` is the blank.
    blankSentence: '___ és?',
  }),
];

describe('tableEntryFor / parityClass — the static closed-class table', () => {
  it('the quanto-family carries parityClass `quant`, everything else `wh`', () => {
    for (const form of ['quanto', 'quanta', 'quantos', 'quantas']) {
      expect(tableEntryFor(form)?.parityClass).toBe('quant');
      expect(parityClassFor(form)).toBe('quant');
    }
    for (const form of ['quem', 'onde', 'como', 'qual', 'quais', 'quando', 'de onde']) {
      expect(tableEntryFor(form)?.parityClass).toBe('wh');
      expect(parityClassFor(form)).toBe('wh');
    }
  });

  it('`quanta` is in the table (a distractor source) — its gender contrast is f/sg', () => {
    const quanta = tableEntryFor('quanta');
    expect(quanta).not.toBeNull();
    expect(normalizeAgreement(quanta?.agreement)).toEqual({ gender: 'f', number: 'sg' });
  });
});

describe('normalizeAgreement — the SINGLE vocabulary (m/f, sg/pl)', () => {
  it('reduces to {gender?, number?}, dropping unknowns and the informational noun', () => {
    expect(normalizeAgreement({ gender: 'm', number: 'pl', noun: 'anos' })).toEqual({
      gender: 'm',
      number: 'pl',
    });
    expect(normalizeAgreement({ number: 'sg' })).toEqual({ number: 'sg' });
    expect(normalizeAgreement(null)).toEqual({});
    expect(normalizeAgreement({ gender: 'x', number: 'y' })).toEqual({});
  });

  it('agreementEquals compares under that one vocabulary', () => {
    expect(agreementEquals({ gender: 'm', number: 'pl' }, { gender: 'm', number: 'pl' })).toBe(true);
    expect(agreementEquals({ number: 'sg' }, { number: 'pl' })).toBe(false);
    expect(agreementEquals({}, {})).toBe(true);
  });
});

describe('reconstructAnswer — §6.5 (a) answer↔category↔agreement consistency', () => {
  it('reconstructs a known interrogative whose category + agreement match the table', () => {
    expect(reconstructAnswer(FIXTURE[0])).toBe('onde');
    expect(reconstructAnswer(FIXTURE[2])).toBe('qual');
    expect(reconstructAnswer(FIXTURE[3])).toBe('quantos');
    expect(reconstructAnswer(FIXTURE[5])).toBe('de onde');
  });

  it('the absent `noun` field never breaks reconstruction (int:0015 style)', () => {
    expect(reconstructAnswer(FIXTURE[4])).toBe('quanto');
  });

  it('returns null for unknown / mislabeled / agreement-mismatched rows', () => {
    expect(reconstructAnswer(null)).toBeNull();
    expect(reconstructAnswer(rec({ answer: 'wat' }))).toBeNull();
    // category disagrees with the table (`onde` is `where`, not `how`).
    expect(reconstructAnswer(rec({ answer: 'onde', category: 'how' }))).toBeNull();
    // agreement disagrees: `qual` is sg, this claims pl.
    expect(
      reconstructAnswer(rec({ answer: 'qual', category: 'which', agreement: { number: 'pl' } })),
    ).toBeNull();
    // quanto claimed with f gender (that is `quanta`) → mismatch.
    expect(
      reconstructAnswer(
        rec({ answer: 'quanto', category: 'how_much', agreement: { gender: 'f', number: 'sg' } }),
      ),
    ).toBeNull();
    expect(reconstructAnswer(rec({ answer: '' }))).toBeNull();
  });
});

describe('§6.5 (a) — every agreeing form matches its declared agreement (one vocab)', () => {
  it('qual/quais NUMBER and quanto-family GENDER+NUMBER reduce identically', () => {
    for (const r of FIXTURE) {
      const entry = tableEntryFor(r.answer);
      expect(entry).not.toBeNull();
      expect(agreementEquals(normalizeAgreement(r.agreement), normalizeAgreement(entry!.agreement))).toBe(
        true,
      );
    }
  });

  it('the normalized-vocab compare DISCRIMINATES a corrupted agreement (not tautological)', () => {
    // A deliberately corrupted row: `quantos` is m/pl in the table, but here the
    // item claims f/sg. Under the SINGLE normalized vocabulary the compare must
    // be FALSE — proving the loop above is a real discriminator, not a tautology.
    const entry = tableEntryFor('quantos');
    expect(entry).not.toBeNull();
    const corrupted = normalizeAgreement({ gender: 'f', number: 'sg' });
    expect(agreementEquals(corrupted, normalizeAgreement(entry!.agreement))).toBe(false);
    // And the gate rejects it (reconstructAnswer returns null for the mismatch).
    expect(
      reconstructAnswer(
        rec({ answer: 'quantos', category: 'how_much', agreement: { gender: 'f', number: 'sg' } }),
      ),
    ).toBeNull();
  });
});

describe('gradeableFill — §6.5 (b) prefix/suffix-duplication guard', () => {
  it('a correctly-blanked multi-word item yields the full answer span', () => {
    expect(gradeableFill('___ és?', 'de onde')).toBe('de onde');
    expect(gradeableFill('___ é que ele toca?', 'o que')).toBe('o que');
  });

  it('a single-word item yields the answer', () => {
    expect(gradeableFill('___ moras?', 'onde')).toBe('onde');
  });

  it('a 4+-underscore blank behaves IDENTICALLY to a 3-underscore blank (no stray `_`)', () => {
    // The corpus mixes `___` and `____`; both denote the same single slot. The
    // gate keys on a 3+-underscore RUN, so no stray underscore can leak into the
    // gradeable fill regardless of underscore count.
    expect(gradeableFill('____ moras?', 'onde')).toBe('onde');
    expect(gradeableFill('____ é que ele toca?', 'o que')).toBe('o que');
    expect(gradeableFill('_____ és?', 'de onde')).toBe('de onde');
    // Identical to the 3-underscore forms.
    expect(gradeableFill('____ moras?', 'onde')).toBe(gradeableFill('___ moras?', 'onde'));
    expect(gradeableFill('____ é que ele toca?', 'o que')).toBe(
      gradeableFill('___ é que ele toca?', 'o que'),
    );
  });

  it('a `De ___ és?` cloze (lead token duplicates `de`) collapses the fill', () => {
    // The learner only types `onde` here, which is NOT `de onde`.
    expect(gradeableFill('De ___ és?', 'de onde')).toBe('onde');
  });

  // §6.5 (b) SUFFIX branch (the `trailDup` loop): a token printed AFTER the
  // blank that duplicates the answer's trailing word collapses the fill. These
  // cases make the suffix branch load-bearing — deleting/inverting `trailDup`
  // makes them fail.
  it('a trailing pre-printed answer word (suffix dup) collapses the fill', () => {
    // `___ onde és?` for `de onde`: the printed `onde` AFTER the blank duplicates
    // the answer's trailing word ⇒ the learner only types `de`, not `de onde`.
    expect(gradeableFill('___ onde és?', 'de onde')).toBe('de');
  });

  it('a multi-word `o que` suffix dup collapses the trailing token', () => {
    // `___ que é que ele toca?` for `o que`: the printed `que` AFTER the blank
    // duplicates the answer's trailing word ⇒ the learner only types `o`.
    expect(gradeableFill('___ que é que ele toca?', 'o que')).toBe('o');
  });

  it('a trailing answer word followed by punctuation is still detected (Q001)', () => {
    // `de onde` with `onde,` printed after: the comma must NOT hide the dup.
    expect(gradeableFill('___ onde, és?', 'de onde')).toBe('de');
    expect(gradeableFill('___ onde — és?', 'de onde')).toBe('de');
  });

  it('null when there is no blank slot', () => {
    expect(gradeableFill('De onde és?', 'de onde')).toBeNull();
  });
});

describe('isInterrogativeEligible — the verified-key gate (AC5)', () => {
  it('accepts every well-formed fixture row', () => {
    for (const r of FIXTURE) {
      expect(isInterrogativeEligible(r)).toBe(true);
    }
  });

  it('REJECTS a synthetic `De ___ és?` / `de onde` prefix-duplication item', () => {
    const synthetic = rec({
      contentId: 'int:synthetic',
      answer: 'de onde',
      category: 'where_from',
      gloss_ru: 'откуда',
      gloss_en: 'where from',
      blankSentence: 'De ___ és?', // lead `De` duplicates the answer's leading word
    });
    // The fill derived from the cloze is `onde`, not `de onde` ⇒ ungradeable.
    expect(canonicalize(gradeableFill(synthetic.blankSentence, 'de onde')!)).not.toBe(
      canonicalize('de onde'),
    );
    expect(isInterrogativeEligible(synthetic)).toBe(false);
  });

  it('REJECTS a synthetic `___ onde és?` / `de onde` SUFFIX-duplication item', () => {
    // The §6.5 (b) suffix branch (`trailDup`): the printed `onde` AFTER the blank
    // duplicates the answer's trailing word, so the learner only types `de` —
    // NOT `de onde`. This depends on the suffix branch: without `trailDup` the
    // fill would be `de onde` and the item would WRONGLY be eligible.
    const synthetic = rec({
      contentId: 'int:suffix',
      answer: 'de onde',
      category: 'where_from',
      gloss_ru: 'откуда',
      gloss_en: 'where from',
      blankSentence: '___ onde és?', // trailing `onde` duplicates the answer's trailing word
    });
    expect(gradeableFill(synthetic.blankSentence, 'de onde')).toBe('de');
    expect(canonicalize(gradeableFill(synthetic.blankSentence, 'de onde')!)).not.toBe(
      canonicalize('de onde'),
    );
    expect(isInterrogativeEligible(synthetic)).toBe(false);
  });

  it('EXCLUDES no-blank, unknown-answer, and mislabeled rows', () => {
    expect(isInterrogativeEligible(rec({ blankSentence: 'Onde moras?' }))).toBe(false);
    expect(isInterrogativeEligible(rec({ answer: 'wat' }))).toBe(false);
    expect(isInterrogativeEligible(rec({ answer: 'onde', category: 'how' }))).toBe(false);
    expect(isInterrogativeEligible(null)).toBe(false);
    expect(isInterrogativeEligible(undefined)).toBe(false);
  });
});

describe('filterInterrogativeEligible — applied to the WHOLE corpus', () => {
  it('keeps only verified rows; drops the synthetic prefix-dup row', () => {
    const synthetic = rec({
      contentId: 'int:synthetic',
      answer: 'de onde',
      category: 'where_from',
      gloss_ru: 'откуда',
      gloss_en: 'where from',
      blankSentence: 'De ___ és?',
    });
    const kept = filterInterrogativeEligible([...FIXTURE, synthetic]).map((r) => r.contentId);
    expect(kept).toEqual(FIXTURE.map((r) => r.contentId));
  });

  it('all closed-class table forms are self-consistent (category + agreement)', () => {
    // Sanity: each table form, used as an answer with its own category/agreement,
    // reconstructs to itself under the single normalized vocabulary.
    for (const entry of INTERROGATIVE_TABLE) {
      const synthetic = rec({
        contentId: `int:tbl-${entry.form}`,
        answer: entry.form,
        category: entry.category,
        agreement: entry.agreement
          ? { gender: entry.agreement.gender, number: entry.agreement.number }
          : undefined,
        blankSentence: '___ x?',
      });
      expect(reconstructAnswer(synthetic)).toBe(entry.form);
    }
  });
});
