// The closed-class EP interrogative table as a STATIC, typed constant (SPEC §6.3
// / AC4). This is the MACHINE source the session generator synthesizes MC
// distractor surfaces from — it is NOT parsed from the human-facing
// `ref-interrogative` markdown card. The card body stays prose; this const is
// invariant grammatical content shipped in code.
//
// The table mirrors `extraction/normalized/interrogatives.json` `table`
// (17 rows: the closed class of EP question words, each with category +
// agreement) but is hand-authored here as the authoritative typed source so the
// pure mode (which e2e imports in a Node process) has NO content/db dependency.
//
// Agreement is NORMALIZED to `{gender?: 'm'|'f', number?: 'sg'|'pl'}` — the
// SINGLE vocabulary the §6.5 verified-key gate compares item agreement against.
//
// PARITY CLASS (AC4): parity keys on length+wordCount+parityClass, NOT category,
// so without explicit classes a `quanto` answer (len 6) would wrongly pull the
// len-6 `quando`/`porque`/`porquê` as distractors. We mirror how possessive uses
// distinct DETERMINER vs DELE classes: assign `quant` to the GENDER+NUMBER
// quanto-family {quanto, quanta, quantos, quantas} and `wh` to every other
// interrogative. Then within `quant` only same-family forms co-assemble (the
// gender contrast quanto↔quanta len6, quantos↔quantas len7); within `wh` the
// equal-length single-word forms co-assemble (quem/onde/como/qual len4). Never
// cross-class.
//
// NOTE Re-exports the db `InterrogativeRecord` shape so the mode's public
// surface is a single import site (mirrors possessive re-exporting its record
// type via possData), while keeping db as the single schema owner.

export type {
  InterrogativeAgreement,
  InterrogativeRecord,
} from '../../db/schema.ts';

/** Counted/agreeing-noun gender for an agreeing interrogative. */
export type IntGender = 'm' | 'f';

/** Counted/agreeing-noun number for an agreeing interrogative. */
export type IntNumber = 'sg' | 'pl';

/**
 * The §6.3 parity class for an interrogative answer. `quant` isolates the
 * GENDER+NUMBER quanto-family; `wh` covers every other interrogative. Two
 * surfaces co-assemble in MC only within the same class (and at equal
 * length+word-count), so a `quanto` (quant) answer can never pull `quando` (wh).
 */
export type IntParityClass = 'quant' | 'wh';

/** Normalized agreement vocabulary — the SINGLE shape the §6.5 gate compares. */
export interface NormalizedAgreement {
  gender?: IntGender;
  number?: IntNumber;
}

/** One closed-class interrogative table row (the machine source for the drill). */
export interface IntFormEntry {
  /** The interrogative surface (e.g. `quem`, `o que`, `de onde`). */
  form: string;
  /** Semantic category (`who` / `what` / `where` / `how_much` / …). */
  category: string;
  /** Russian meaning cue. */
  gloss_ru: string;
  /** English meaning cue. */
  gloss_en: string;
  /** Normalized agreement (absent ⇒ invariable). */
  agreement?: NormalizedAgreement;
  /** The §6.3 parity class (`quant` for the quanto-family, else `wh`). */
  parityClass: IntParityClass;
}

/**
 * The closed class of EP interrogatives (17 rows, mirroring the dataset table).
 * The quanto-family carries `parityClass: 'quant'`; everything else `'wh'`.
 * `quanta` has ZERO cloze items in the corpus, so it only ever appears as a
 * DISTRACTOR drawn from this table (the quanto↔quanta gender contrast), never as
 * a session answer.
 */
export const INTERROGATIVE_TABLE: readonly IntFormEntry[] = [
  { form: 'quem', category: 'who', gloss_ru: 'кто', gloss_en: 'who', parityClass: 'wh' },
  {
    form: 'que',
    category: 'what',
    gloss_ru: 'что / какой (перед существительным)',
    gloss_en: 'what / which (before a noun)',
    parityClass: 'wh',
  },
  { form: 'o que', category: 'what', gloss_ru: 'что', gloss_en: 'what', parityClass: 'wh' },
  { form: 'onde', category: 'where', gloss_ru: 'где', gloss_en: 'where', parityClass: 'wh' },
  {
    form: 'aonde',
    category: 'where_to',
    gloss_ru: 'куда',
    gloss_en: 'where to',
    parityClass: 'wh',
  },
  {
    form: 'para onde',
    category: 'where_to',
    gloss_ru: 'куда',
    gloss_en: 'where to',
    parityClass: 'wh',
  },
  {
    form: 'de onde',
    category: 'where_from',
    gloss_ru: 'откуда',
    gloss_en: 'where from',
    parityClass: 'wh',
  },
  { form: 'quando', category: 'when', gloss_ru: 'когда', gloss_en: 'when', parityClass: 'wh' },
  { form: 'como', category: 'how', gloss_ru: 'как', gloss_en: 'how', parityClass: 'wh' },
  {
    form: 'porque',
    category: 'why',
    gloss_ru: 'почему',
    gloss_en: 'why',
    parityClass: 'wh',
  },
  {
    form: 'porquê',
    category: 'why',
    gloss_ru: 'почему',
    gloss_en: 'why',
    parityClass: 'wh',
  },
  {
    form: 'qual',
    category: 'which',
    gloss_ru: 'какой / который',
    gloss_en: 'which',
    agreement: { number: 'sg' },
    parityClass: 'wh',
  },
  {
    form: 'quais',
    category: 'which',
    gloss_ru: 'какие / которые',
    gloss_en: 'which',
    agreement: { number: 'pl' },
    parityClass: 'wh',
  },
  {
    form: 'quanto',
    category: 'how_much',
    gloss_ru: 'сколько',
    gloss_en: 'how much',
    agreement: { gender: 'm', number: 'sg' },
    parityClass: 'quant',
  },
  {
    form: 'quanta',
    category: 'how_much',
    gloss_ru: 'сколько',
    gloss_en: 'how much',
    agreement: { gender: 'f', number: 'sg' },
    parityClass: 'quant',
  },
  {
    form: 'quantos',
    category: 'how_much',
    gloss_ru: 'сколько',
    gloss_en: 'how many',
    agreement: { gender: 'm', number: 'pl' },
    parityClass: 'quant',
  },
  {
    form: 'quantas',
    category: 'how_much',
    gloss_ru: 'сколько',
    gloss_en: 'how many',
    agreement: { gender: 'f', number: 'pl' },
    parityClass: 'quant',
  },
] as const;

/** The gloss language an interrogative session is generated for (AC3). */
export type GlossLang = 'ru' | 'en';

/** Look up a table row by exact surface form (the machine answer key). */
export function tableEntryFor(form: string): IntFormEntry | null {
  const key = form.trim().toLowerCase();
  return INTERROGATIVE_TABLE.find((e) => e.form.toLowerCase() === key) ?? null;
}

/** The §6.3 parity class for an interrogative surface (`quant` vs `wh`). */
export function parityClassFor(form: string): IntParityClass {
  return tableEntryFor(form)?.parityClass ?? 'wh';
}

/** The language-aware meaning cue (gloss) for a table row (AC3). */
export function glossFor(entry: IntFormEntry, glossLang: GlossLang): string {
  return glossLang === 'ru' ? entry.gloss_ru : entry.gloss_en;
}

/**
 * Normalize an arbitrary agreement-ish object to `{gender?, number?}` over the
 * SINGLE vocabulary `m|f` / `sg|pl` (AC5). Unknown values are dropped; the
 * informational `noun` field is ignored. Returns `{}` for an absent/empty
 * agreement (e.g. int:0015 carries no `noun`, which never breaks eligibility).
 */
export function normalizeAgreement(
  agreement: { gender?: unknown; number?: unknown; noun?: unknown } | null | undefined,
): NormalizedAgreement {
  const out: NormalizedAgreement = {};
  if (agreement == null) {
    return out;
  }
  if (agreement.gender === 'm' || agreement.gender === 'f') {
    out.gender = agreement.gender;
  }
  if (agreement.number === 'sg' || agreement.number === 'pl') {
    out.number = agreement.number;
  }
  return out;
}

/** Are two normalized agreements equal under the single `m/f`,`sg/pl` vocabulary? */
export function agreementEquals(a: NormalizedAgreement, b: NormalizedAgreement): boolean {
  return a.gender === b.gender && a.number === b.number;
}
