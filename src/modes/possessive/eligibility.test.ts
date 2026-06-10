import { describe, expect, it } from 'vitest';
import type { PossessiveContextRecord, PossessiveRecord } from '../../db/schema.ts';
import {
  filterContextEligible,
  filterPossessiveEligible,
  isContextEligible,
  isPossessiveEligible,
  isPossPerson,
  reconstructAnswer,
} from './eligibility.ts';
import { ownerForDele } from './possData.ts';

function rec(over: Partial<PossessiveRecord>): PossessiveRecord {
  return {
    contentId: 'poss:0000',
    blankSentence: 'A ___ caneta é preta.',
    answer: 'minha',
    person: 'eu',
    kind: 'determiner',
    possessedGender: 'f',
    possessedNumber: 'sg',
    hasArticle: true,
    ...over,
  };
}

describe('isPossPerson — the six closed-class persons', () => {
  it('accepts the verified persons, rejects others', () => {
    for (const p of ['eu', 'tu', 'ele_ela_voce', 'nos', 'vos', 'eles_elas']) {
      expect(isPossPerson(p)).toBe(true);
    }
    expect(isPossPerson('voce')).toBe(false);
    expect(isPossPerson('ele')).toBe(false);
    expect(isPossPerson(undefined)).toBe(false);
  });
});

describe('reconstructAnswer — §6.5 verified key, never guessed', () => {
  it('reconstructs a determiner from (person, possessedGender, possessedNumber)', () => {
    expect(reconstructAnswer(rec({ person: 'eu', possessedGender: 'f', possessedNumber: 'sg' }))).toBe(
      'minha',
    );
    expect(
      reconstructAnswer(rec({ answer: 'meus', person: 'eu', possessedGender: 'm', possessedNumber: 'pl' })),
    ).toBe('meus');
    expect(
      reconstructAnswer(rec({ answer: 'nossas', person: 'nos', possessedGender: 'f', possessedNumber: 'pl' })),
    ).toBe('nossas');
  });

  it('reconstructs a dele-family form FROM THE OWNER named by the answer (his vs her)', () => {
    expect(reconstructAnswer(rec({ kind: 'dele', answer: 'dele' }))).toBe('dele');
    expect(reconstructAnswer(rec({ kind: 'dele', answer: 'dela' }))).toBe('dela');
  });

  it('returns null for a non-reconstructible row', () => {
    expect(reconstructAnswer(null)).toBeNull();
    expect(reconstructAnswer(rec({ kind: 'bogus' as unknown as string }))).toBeNull();
    expect(reconstructAnswer(rec({ person: 'voce' as unknown as string }))).toBeNull();
    expect(reconstructAnswer(rec({ possessedGender: 'x' as unknown as string }))).toBeNull();
    expect(reconstructAnswer(rec({ kind: 'dele', answer: 'sua' }))).toBeNull();
    expect(reconstructAnswer(rec({ answer: '' }))).toBeNull();
  });
});

describe('the §6.5 (cue,…)-key has NO collision — the dele-owner cue fixes his-vs-her', () => {
  it('dele and dela map to DIFFERENT answers via the owner cue (no single key → two answers)', () => {
    const dele = rec({ contentId: 'poss:d1', kind: 'dele', answer: 'dele', person: 'ele_ela_voce' });
    const dela = rec({ contentId: 'poss:d2', kind: 'dele', answer: 'dela', person: 'ele_ela_voce' });
    // Same source person, but the OWNER cue (derived from the answer) differs,
    // so the reconstructed answers differ — proving no (cue,…) collision.
    expect(reconstructAnswer(dele)).toBe('dele');
    expect(reconstructAnswer(dela)).toBe('dela');
    expect(reconstructAnswer(dele)).not.toBe(reconstructAnswer(dela));
  });

  it('distinct owner cues yield DISTINCT dele answers (ele→dele, ela→dela)', () => {
    // Positive AC5 assertion: the OWNER cue the prompt displays — not the answer —
    // is the key, and ele vs ela map to genuinely different forms.
    const dele = rec({ contentId: 'poss:d1', kind: 'dele', answer: 'dele', person: 'ele_ela_voce' });
    const dela = rec({ contentId: 'poss:d2', kind: 'dele', answer: 'dela', person: 'ele_ela_voce' });
    expect(ownerForDele(reconstructAnswer(dele)!)).toBe('ele');
    expect(ownerForDele(reconstructAnswer(dela)!)).toBe('ela');
    expect(ownerForDele(reconstructAnswer(dele)!)).not.toBe(ownerForDele(reconstructAnswer(dela)!));
    expect(reconstructAnswer(dele)).not.toBe(reconstructAnswer(dela));
  });

  it('every eligible item maps its (cue,…) key to EXACTLY ONE answer (no collision)', () => {
    const fixture: PossessiveRecord[] = [
      rec({ contentId: 'poss:a', answer: 'meu', person: 'eu', possessedGender: 'm', possessedNumber: 'sg' }),
      rec({ contentId: 'poss:b', answer: 'minha', person: 'eu', possessedGender: 'f', possessedNumber: 'sg' }),
      rec({ contentId: 'poss:c', answer: 'teus', person: 'tu', possessedGender: 'm', possessedNumber: 'pl' }),
      rec({ contentId: 'poss:d', kind: 'dele', answer: 'dele', person: 'ele_ela_voce' }),
      rec({ contentId: 'poss:e', kind: 'dele', answer: 'dela', person: 'ele_ela_voce' }),
    ];
    const byKey = new Map<string, Set<string>>();
    for (const r of filterPossessiveEligible(fixture)) {
      const answer = reconstructAnswer(r)!;
      // The (cue,…) key is the DISPLAYED cue, never the answer. For a dele item the
      // cue the prompt shows is the OWNER (ele/ela/eles/elas) derived from the
      // answer — NOT the answer itself; keying by the answer would be tautological
      // and could never detect a collision. With the owner cue, two rows whose
      // owner collides but whose answers differ would make answers.size > 1 and
      // FAIL — which is exactly the his-vs-her property AC5 guarantees.
      const key =
        r.kind === 'dele'
          ? `dele:${ownerForDele(answer)}` // the dele cue IS the owner the prompt shows
          : `det:${r.person}:${r.possessedGender}:${r.possessedNumber}`;
      const set = byKey.get(key) ?? new Set<string>();
      set.add(answer);
      byKey.set(key, set);
    }
    // The fixture must actually exercise both channels, else the gate is vacuous.
    expect(byKey.has('dele:ele')).toBe(true);
    expect(byKey.has('dele:ela')).toBe(true);
    for (const [, answers] of byKey) {
      expect(answers.size).toBe(1);
    }
  });
});

describe('isPossessiveEligible — the verified-key gate (AC5)', () => {
  it('accepts a reconstructible determiner whose stored answer matches', () => {
    expect(isPossessiveEligible(rec({}))).toBe(true);
  });

  it('accepts a reconstructible dele item', () => {
    expect(isPossessiveEligible(rec({ kind: 'dele', answer: 'dela' }))).toBe(true);
  });

  it('EXCLUDES a row whose blank sentence has no ___ slot', () => {
    expect(isPossessiveEligible(rec({ blankSentence: 'A minha caneta é preta.' }))).toBe(false);
  });

  it('EXCLUDES a MISLABELED determiner (stored answer ≠ reconstructed form)', () => {
    // person/gender/number say `minha` but the row stored `meu` → data error, dropped.
    expect(
      isPossessiveEligible(rec({ answer: 'meu', person: 'eu', possessedGender: 'f', possessedNumber: 'sg' })),
    ).toBe(false);
  });

  it('EXCLUDES null/undefined/malformed rows rather than throwing', () => {
    expect(isPossessiveEligible(null)).toBe(false);
    expect(isPossessiveEligible(undefined)).toBe(false);
    expect(isPossessiveEligible(rec({ kind: 'bogus' as unknown as string }))).toBe(false);
  });
});

function ctx(over: Partial<PossessiveContextRecord>): PossessiveContextRecord {
  return {
    contentId: 'ctx0001',
    dialogue: '— Comprei este casaco. — Que bonito! Então é ___?',
    answer: 'teu',
    person: 'tu',
    kind: 'determiner',
    ownerCue: 'tu',
    possessedGender: 'm',
    possessedNumber: 'sg',
    possessedNoun: 'casaco',
    ...over,
  };
}

describe('isContextEligible — the SEPARATE L3 context gate (AC4)', () => {
  it('accepts a valid context record (one ___ blank, answer in the inventory)', () => {
    expect(isContextEligible(ctx({}))).toBe(true);
    // a context-decided dele answer is also a valid inventory surface
    expect(isContextEligible(ctx({ answer: 'dela', kind: 'dele' }))).toBe(true);
    // vosso/seu are dialogue-decided (NOT reconstructible) but ARE in the inventory
    expect(isContextEligible(ctx({ answer: 'vosso' }))).toBe(true);
    expect(isContextEligible(ctx({ answer: 'seu' }))).toBe(true);
  });

  it('EXCLUDES a record with NO ___ blank', () => {
    expect(isContextEligible(ctx({ dialogue: '— Olá. — É bonito!' }))).toBe(false);
  });

  it('EXCLUDES a record with MORE THAN ONE ___ blank', () => {
    expect(isContextEligible(ctx({ dialogue: '— É ___ ou ___?' }))).toBe(false);
  });

  it('EXCLUDES a record with an empty answer', () => {
    expect(isContextEligible(ctx({ answer: '' }))).toBe(false);
    expect(isContextEligible(ctx({ answer: '   ' }))).toBe(false);
  });

  it('EXCLUDES a record whose answer is NOT in the possessive inventory', () => {
    expect(isContextEligible(ctx({ answer: 'xyz' }))).toBe(false);
    expect(isContextEligible(ctx({ answer: 'gato' }))).toBe(false);
  });

  it('EXCLUDES null/undefined/malformed rather than throwing', () => {
    expect(isContextEligible(null)).toBe(false);
    expect(isContextEligible(undefined)).toBe(false);
    expect(isContextEligible({} as Partial<PossessiveContextRecord>)).toBe(false);
  });
});

describe('filterContextEligible (the context gate, applied)', () => {
  it('keeps only the valid context rows and drops the malformed ones', () => {
    const rows: PossessiveContextRecord[] = [
      ctx({ contentId: 'ctx-keep1', answer: 'teu' }),
      ctx({ contentId: 'ctx-keep2', answer: 'dela', kind: 'dele' }),
      ctx({ contentId: 'ctx-drop-noblank', dialogue: 'no slot here' }),
      ctx({ contentId: 'ctx-drop-empty', answer: '' }),
      ctx({ contentId: 'ctx-drop-bogus', answer: 'xyz' }),
    ];
    const kept = filterContextEligible(rows).map((r) => r.contentId);
    expect(kept).toEqual(['ctx-keep1', 'ctx-keep2']);
  });
});

describe('filterPossessiveEligible (the gate, applied)', () => {
  it('keeps only reconstructible rows and drops the rest', () => {
    const rows: PossessiveRecord[] = [
      rec({ contentId: 'poss:keep1', answer: 'minha' }),
      rec({ contentId: 'poss:keep2', kind: 'dele', answer: 'dele' }),
      rec({ contentId: 'poss:drop-mislabeled', answer: 'meu', possessedGender: 'f', possessedNumber: 'sg' }),
      rec({ contentId: 'poss:drop-noblank', blankSentence: 'no slot here' }),
    ];
    const kept = filterPossessiveEligible(rows).map((r) => r.contentId);
    expect(kept).toEqual(['poss:keep1', 'poss:keep2']);
  });
});
