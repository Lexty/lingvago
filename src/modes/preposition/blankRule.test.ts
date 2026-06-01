import { describe, expect, it } from 'vitest';
import {
  BLANK,
  buildCloze,
  chooseBlankExample,
  cleanTokenOccurrences,
  cleanTokens,
  isBlankable,
} from './blankRule.ts';

describe('cleanTokens — accent-/case-folded, punctuation-bounded tokens', () => {
  it('folds accents + case and splits on non-alphanumerics', () => {
    expect(cleanTokens('À segunda-feira, vou!')).toEqual([
      'a',
      'segunda',
      'feira',
      'vou',
    ]);
  });

  it('treats hyphen and punctuation as token boundaries', () => {
    expect(cleanTokens('meio-dia.')).toEqual(['meio', 'dia']);
  });

  it('returns [] for non-string / empty input rather than throwing', () => {
    expect(cleanTokens('')).toEqual([]);
    expect(cleanTokens(null as unknown as string)).toEqual([]);
  });
});

describe('cleanTokenOccurrences — the AC3 clean-token count (the crux)', () => {
  it('counts a single-word prep by WHOLE-WORD match (accent-folded)', () => {
    expect(cleanTokenOccurrences('de', 'De manhã apanho sempre o metro.')).toBe(1);
    expect(cleanTokenOccurrences('a', 'À segunda-feira eu vou sempre ao cinema.')).toBe(1);
  });

  it('counts MULTIPLE clean-token occurrences (≠ 1 ⇒ not blankable)', () => {
    expect(cleanTokenOccurrences('de', 'Hoje é dia 16 de março de 2005.')).toBe(2);
    expect(cleanTokenOccurrences('a', 'À tarde vou ao cinema e à noite vou jantar.')).toBe(2);
  });

  it('does NOT match a prep embedded in a larger word (word-boundary)', () => {
    // `de` must not match the `de` inside `desde` or `cidade`.
    expect(cleanTokenOccurrences('de', 'Trabalho aqui desde a cidade nova.')).toBe(0);
  });

  it('matches a MULTI-WORD locução only as a contiguous whole-token run', () => {
    expect(cleanTokenOccurrences('longe de', 'Trabalho longe de Lisboa.')).toBe(1);
    expect(cleanTokenOccurrences('em cima de', 'A caneta está em cima da secretária.')).toBe(0);
  });

  it('EXCLUDES a compound locução whose example uses the contracted form (AC3)', () => {
    // `em frente de` vs the example's `em frente da` — the contracted `da` ≠ `de`.
    expect(
      cleanTokenOccurrences('em frente de', 'Na Rua … em frente da Faculdade.'),
    ).toBe(0);
  });

  it('returns 0 for empty prep / empty example (graceful)', () => {
    expect(cleanTokenOccurrences('', 'qualquer coisa')).toBe(0);
    expect(cleanTokenOccurrences('de', '')).toBe(0);
  });
});

describe('isBlankable — occurrence-count == 1', () => {
  it('true iff exactly one clean-token occurrence', () => {
    expect(isBlankable('de', 'De manhã apanho o metro.')).toBe(true);
    expect(isBlankable('de', 'Hoje é dia 16 de março de 2005.')).toBe(false); // 2
    expect(isBlankable('em', 'Estamos no verão.')).toBe(false); // 0
  });
});

describe('chooseBlankExample — deterministic first blankable example', () => {
  it('picks the FIRST example with exactly one clean-token occurrence', () => {
    const examples = [
      'Hoje é dia 16 de março de 2005.', // 2 → skip
      'De manhã apanho o metro.', // 1 → chosen
      'Ele sai de casa às sete.', // also 1, but later
    ];
    expect(chooseBlankExample('de', examples)).toBe('De manhã apanho o metro.');
  });

  it('returns null when NO example yields a single blank (record excluded)', () => {
    expect(
      chooseBlankExample('em frente de', [
        'Na Rua … em frente da Faculdade.',
        'É mesmo em frente da estação.',
      ]),
    ).toBeNull();
    expect(chooseBlankExample('de', [])).toBeNull();
    expect(chooseBlankExample('de', null as unknown as string[])).toBeNull();
  });
});

describe('buildCloze — blanks the single occurrence, preserving surroundings', () => {
  it('replaces the one clean-token occurrence with the blank', () => {
    const built = buildCloze('de', 'Ele sai de casa às sete e meia da manhã.');
    expect(built).not.toBeNull();
    expect(built?.answer).toBe('de');
    expect(built?.cloze).toBe(`Ele sai ${BLANK} casa às sete e meia da manhã.`);
    // the blank text no longer contains a bare `de` token, but `da` survives
    expect(cleanTokenOccurrences('de', built!.cloze)).toBe(0);
  });

  it('blanks an accented occurrence (`à` for prep `a`) preserving the surface', () => {
    const built = buildCloze('a', 'À segunda-feira eu vou sempre ao cinema.');
    expect(built?.cloze).toBe(`${BLANK} segunda-feira eu vou sempre ao cinema.`);
    expect(built?.answer).toBe('a');
  });

  it('blanks a multi-word locução as a contiguous run', () => {
    const built = buildCloze('longe de', 'Trabalho longe de Lisboa.');
    expect(built?.cloze).toBe(`Trabalho ${BLANK} Lisboa.`);
  });

  it('returns null when the prep is not blankable (≠ 1 occurrence)', () => {
    expect(buildCloze('de', 'Hoje é dia 16 de março de 2005.')).toBeNull();
    expect(buildCloze('em frente de', 'Na Rua … em frente da Faculdade.')).toBeNull();
  });
});
