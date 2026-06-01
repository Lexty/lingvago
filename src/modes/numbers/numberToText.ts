// European-Portuguese numeral spelling (SPEC §1.2 NumbersMode — generative,
// production input, objective string check). Adapted from the proven v1
// mechanic (~/dev/personal/lingvago/src/modes/numbers/data.ts) into the v2
// architecture: pure, dependency-free, EP orthography ONLY (European, NOT
// Brazilian: `dezasseis`/`dezassete`/`dezanove`, `cem` vs `cento`, `e`
// connectors). Extended here with ORDINALS (Grupo III requirement), which v1
// did not have.

/** Cardinal units 0–19 (the EP-specific teens live here). */
const CARDINAL_UNITS: Record<number, string> = {
  0: 'zero',
  1: 'um',
  2: 'dois',
  3: 'três',
  4: 'quatro',
  5: 'cinco',
  6: 'seis',
  7: 'sete',
  8: 'oito',
  9: 'nove',
  10: 'dez',
  11: 'onze',
  12: 'doze',
  13: 'treze',
  14: 'catorze',
  15: 'quinze',
  // EP, NOT Brazilian: dezasseis / dezassete / dezanove.
  16: 'dezasseis',
  17: 'dezassete',
  18: 'dezoito',
  19: 'dezanove',
};

const CARDINAL_TENS: Record<number, string> = {
  20: 'vinte',
  30: 'trinta',
  40: 'quarenta',
  50: 'cinquenta',
  60: 'sessenta',
  70: 'setenta',
  80: 'oitenta',
  90: 'noventa',
};

const CARDINAL_HUNDREDS: Record<number, string> = {
  // 100 alone is `cem`; as a prefix to a remainder it is `cento` (handled below).
  100: 'cento',
  200: 'duzentos',
  300: 'trezentos',
  400: 'quatrocentos',
  500: 'quinhentos',
  600: 'seiscentos',
  700: 'setecentos',
  800: 'oitocentos',
  900: 'novecentos',
};

/** Largest cardinal the generator/spelling supports (inclusive). */
export const MAX_CARDINAL = 9_999_999;

/**
 * Convert a non-negative integer (0–9 999 999) to European-Portuguese text.
 *
 * `e` connector rules (EP):
 *  - tens + unit:                 `vinte e três`
 *  - hundreds + remainder:        always `e` (`cento e quarenta e cinco`)
 *  - after mil/milhão:            `e` when the remainder is < 100 OR an exact
 *                                 multiple of 100; a bare space otherwise
 *                                 (`mil e vinte`, `mil duzentos e dez`).
 *
 * Throws on non-integer / negative / out-of-range input so callers never get a
 * silently-wrong spelling (the session generator only ever passes valid ids).
 */
export function numberToText(n: number): string {
  if (!Number.isInteger(n)) {
    throw new RangeError(`numberToText expects an integer, got ${String(n)}`);
  }
  if (n < 0 || n > MAX_CARDINAL) {
    throw new RangeError(`numberToText out of range [0, ${MAX_CARDINAL}]: ${n}`);
  }
  return spellCardinal(n);
}

function spellCardinal(n: number): string {
  if (n <= 19) {
    return CARDINAL_UNITS[n];
  }
  if (n < 100) {
    const ten = Math.floor(n / 10) * 10;
    const unit = n % 10;
    return unit === 0
      ? CARDINAL_TENS[ten]
      : `${CARDINAL_TENS[ten]} e ${CARDINAL_UNITS[unit]}`;
  }
  if (n === 100) {
    return 'cem';
  }
  if (n < 1000) {
    const h = Math.floor(n / 100) * 100;
    const rem = n % 100;
    return rem === 0
      ? CARDINAL_HUNDREDS[h]
      : `${CARDINAL_HUNDREDS[h]} e ${spellCardinal(rem)}`;
  }
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    const prefix = thousands === 1 ? 'mil' : `${spellCardinal(thousands)} mil`;
    if (rem === 0) {
      return prefix;
    }
    const connector = rem < 100 || rem % 100 === 0 ? ' e ' : ' ';
    return prefix + connector + spellCardinal(rem);
  }
  const millions = Math.floor(n / 1_000_000);
  const rem = n % 1_000_000;
  const prefix =
    millions === 1 ? 'um milhão' : `${spellCardinal(millions)} milhões`;
  if (rem === 0) {
    return prefix;
  }
  const connector = rem < 100 || rem % 100 === 0 ? ' e ' : ' ';
  return prefix + connector + spellCardinal(rem);
}

// ---------------------------------------------------------------------------
// Ordinals (Grupo III requirement; absent from v1). Masculine singular form
// (primeiro, segundo, …) — the canonical citation form drilled here. Supported
// range is 1º–100º, which covers the exam's ordinal needs without inventing
// the higher compound forms no past variant exercises.
// ---------------------------------------------------------------------------

const ORDINAL_UNITS: Record<number, string> = {
  1: 'primeiro',
  2: 'segundo',
  3: 'terceiro',
  4: 'quarto',
  5: 'quinto',
  6: 'sexto',
  7: 'sétimo',
  8: 'oitavo',
  9: 'nono',
};

const ORDINAL_TENS: Record<number, string> = {
  10: 'décimo',
  20: 'vigésimo',
  30: 'trigésimo',
  40: 'quadragésimo',
  50: 'quinquagésimo',
  60: 'sexagésimo',
  70: 'septuagésimo',
  80: 'octogésimo',
  90: 'nonagésimo',
};

/** Largest ordinal the generator/spelling supports (inclusive). */
export const MAX_ORDINAL = 100;

/**
 * Convert a positive integer (1–100) to its European-Portuguese ordinal
 * (masculine singular: `primeiro`, `décimo`, `vigésimo primeiro`, `centésimo`).
 *
 * Tens + unit are juxtaposed WITHOUT an `e` (`vigésimo terceiro`), which is the
 * EP ordinal rule. Throws on out-of-range / non-integer input.
 */
export function ordinalToText(n: number): string {
  if (!Number.isInteger(n)) {
    throw new RangeError(`ordinalToText expects an integer, got ${String(n)}`);
  }
  if (n < 1 || n > MAX_ORDINAL) {
    throw new RangeError(`ordinalToText out of range [1, ${MAX_ORDINAL}]: ${n}`);
  }
  if (n === 100) {
    return 'centésimo';
  }
  if (n < 10) {
    return ORDINAL_UNITS[n];
  }
  const ten = Math.floor(n / 10) * 10;
  const unit = n % 10;
  return unit === 0
    ? ORDINAL_TENS[ten]
    : `${ORDINAL_TENS[ten]} ${ORDINAL_UNITS[unit]}`;
}
