import { describe, expect, it } from 'vitest';
import {
  MAX_CARDINAL,
  MAX_ORDINAL,
  numberToText,
  ordinalToText,
} from './numberToText.ts';

describe('numberToText (EP cardinals)', () => {
  // EP-canon spelling table (AC8). Note the European forms: dezasseis (NOT
  // Brazilian dezesseis), cem vs cento, the `e` connectors.
  const cases: Array<[number, string]> = [
    [0, 'zero'],
    [1, 'um'],
    [15, 'quinze'],
    [16, 'dezasseis'],
    [17, 'dezassete'],
    [19, 'dezanove'],
    [21, 'vinte e um'],
    [23, 'vinte e três'],
    [100, 'cem'],
    [101, 'cento e um'],
    [145, 'cento e quarenta e cinco'],
    [200, 'duzentos'],
    [999, 'novecentos e noventa e nove'],
    [1000, 'mil'],
    [1020, 'mil e vinte'],
    [1210, 'mil duzentos e dez'],
    [2000, 'dois mil'],
    [1_000_000, 'um milhão'],
  ];

  it.each(cases)('spells %i as "%s"', (n, expected) => {
    expect(numberToText(n)).toBe(expected);
  });

  it('uses the European, NOT Brazilian, teen forms', () => {
    expect(numberToText(16)).not.toBe('dezesseis');
    expect(numberToText(17)).not.toBe('dezessete');
    expect(numberToText(19)).not.toBe('dezenove');
  });

  it('throws on negative, non-integer, or out-of-range input', () => {
    expect(() => numberToText(-1)).toThrow(RangeError);
    expect(() => numberToText(1.5)).toThrow(RangeError);
    expect(() => numberToText(MAX_CARDINAL + 1)).toThrow(RangeError);
  });
});

describe('ordinalToText (EP ordinals)', () => {
  const cases: Array<[number, string]> = [
    [1, 'primeiro'],
    [2, 'segundo'],
    [3, 'terceiro'],
    [7, 'sétimo'],
    [10, 'décimo'],
    [11, 'décimo primeiro'],
    [20, 'vigésimo'],
    [23, 'vigésimo terceiro'],
    [100, 'centésimo'],
  ];

  it.each(cases)('spells %iº as "%s"', (n, expected) => {
    expect(ordinalToText(n)).toBe(expected);
  });

  it('throws on 0, non-integer, or out-of-range input', () => {
    expect(() => ordinalToText(0)).toThrow(RangeError);
    expect(() => ordinalToText(2.5)).toThrow(RangeError);
    expect(() => ordinalToText(MAX_ORDINAL + 1)).toThrow(RangeError);
  });
});
