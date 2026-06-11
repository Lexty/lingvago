// The closed-class EP possessive paradigm as a STATIC, typed constant (SPEC §6.3
// / AC4). This is the MACHINE source the session generator synthesizes
// same-gender/number, different-person MC distractor surfaces from — it is NOT
// parsed from the human-facing `ref-possessive` markdown card. The card body
// stays prose; this const is invariant grammatical content shipped in code.
//
// The paradigm mirrors `extraction/normalized/possessives.json` `paradigm`
// (24 determiner cells: 6 persons × 2 genders × 2 numbers, + the 4-form dele
// family) but is hand-authored here as the authoritative typed source so the
// pure mode (which e2e imports in a Node process) has NO content/db dependency.
//
// NOTE Re-exports the db `PossessiveRecord` shape so the mode's public surface
// is a single import site (mirrors how preposition re-exports its record type
// via the shared modules), while keeping db as the single schema owner.

export type { PossessiveContextRecord, PossessiveRecord } from '../../db/schema.ts';

/** The six grammatical persons of the EP possessive system (closed class). */
export const POSS_PERSONS = ['eu', 'tu', 'ele_ela_voce', 'nos', 'vos', 'eles_elas'] as const;

/** A grammatical person key (matches `PossessiveRecord.person`). */
export type PossPerson = (typeof POSS_PERSONS)[number];

/** Possessed-noun gender (the determiner agrees with the POSSESSED noun). */
export type PossGender = 'm' | 'f';

/** Possessed-noun number. */
export type PossNumber = 'sg' | 'pl';

/** The two possessive families: agreeing determiner vs. invariable dele. */
export type PossKind = 'determiner' | 'dele';

/** One determiner paradigm cell: (person × gender × number) → agreeing form. */
export interface DeterminerCell {
  person: PossPerson;
  gender: PossGender;
  number: PossNumber;
  /** The agreeing determiner surface (e.g. `meu`, `minha`, `nossos`). */
  form: string;
}

/**
 * The 24 determiner cells of the EP possessive paradigm. `seu/sua/seus/suas` is
 * shared by `ele_ela_voce` and `eles_elas` (both 3rd person) — exactly as the
 * source data encodes it. This is the source for both the §6.5 verified-key
 * reconstruction (forward: cell → form) and the §6.3 same-gender/number
 * distractor synthesis (sibling persons of the same gender+number).
 */
export const DETERMINER_PARADIGM: readonly DeterminerCell[] = [
  { person: 'eu', gender: 'm', number: 'sg', form: 'meu' },
  { person: 'eu', gender: 'm', number: 'pl', form: 'meus' },
  { person: 'eu', gender: 'f', number: 'sg', form: 'minha' },
  { person: 'eu', gender: 'f', number: 'pl', form: 'minhas' },
  { person: 'tu', gender: 'm', number: 'sg', form: 'teu' },
  { person: 'tu', gender: 'm', number: 'pl', form: 'teus' },
  { person: 'tu', gender: 'f', number: 'sg', form: 'tua' },
  { person: 'tu', gender: 'f', number: 'pl', form: 'tuas' },
  { person: 'ele_ela_voce', gender: 'm', number: 'sg', form: 'seu' },
  { person: 'ele_ela_voce', gender: 'm', number: 'pl', form: 'seus' },
  { person: 'ele_ela_voce', gender: 'f', number: 'sg', form: 'sua' },
  { person: 'ele_ela_voce', gender: 'f', number: 'pl', form: 'suas' },
  { person: 'nos', gender: 'm', number: 'sg', form: 'nosso' },
  { person: 'nos', gender: 'm', number: 'pl', form: 'nossos' },
  { person: 'nos', gender: 'f', number: 'sg', form: 'nossa' },
  { person: 'nos', gender: 'f', number: 'pl', form: 'nossas' },
  { person: 'vos', gender: 'm', number: 'sg', form: 'vosso' },
  { person: 'vos', gender: 'm', number: 'pl', form: 'vossos' },
  { person: 'vos', gender: 'f', number: 'sg', form: 'vossa' },
  { person: 'vos', gender: 'f', number: 'pl', form: 'vossas' },
  { person: 'eles_elas', gender: 'm', number: 'sg', form: 'seu' },
  { person: 'eles_elas', gender: 'm', number: 'pl', form: 'seus' },
  { person: 'eles_elas', gender: 'f', number: 'sg', form: 'sua' },
  { person: 'eles_elas', gender: 'f', number: 'pl', form: 'suas' },
] as const;

/**
 * The invariable dele family (AC4 / AC5): one form per OWNER. The owner cue
 * (`ele`/`ela`/`eles`/`elas`) reconstructs the form, resolving the his-vs-her
 * ambiguity the bare sentence cannot.
 */
export const DELE_FAMILY = [
  { owner: 'ele', form: 'dele' },
  { owner: 'ela', form: 'dela' },
  { owner: 'eles', form: 'deles' },
  { owner: 'elas', form: 'delas' },
] as const;

/** A dele-family owner cue. */
export type DeleOwner = (typeof DELE_FAMILY)[number]['owner'];

/** All dele surfaces, for membership checks against arbitrary strings. */
export const DELE_FORMS: readonly string[] = DELE_FAMILY.map((d) => d.form);

/**
 * The full closed-class possessive INVENTORY: every determiner surface (the 24
 * paradigm cells, de-duped — `seu/sua/…` collapse) PLUS the four dele forms.
 *
 * This is the membership set the §6.5 CONTEXT eligibility path checks against
 * (AC4): a context record's AUTHORED answer must be one of these forms to be
 * shown. Unlike the cue-based gate, context answers are NOT reconstructed from
 * person+gender+number (vosso/seu etc. are dialogue-decided), so the only
 * runtime guard is that the answer is a real possessive surface — the deeper
 * "this is the UNIQUE answer" guarantee rests on the OFFLINE codex verification
 * of the dataset, not on runtime reconstruction.
 */
export const POSSESSIVE_INVENTORY: ReadonlySet<string> = new Set<string>([
  ...DETERMINER_PARADIGM.map((c) => c.form),
  ...DELE_FORMS,
]);

/** Is `form` a recognized possessive surface (determiner or dele)? */
export function isInPossessiveInventory(form: unknown): boolean {
  return typeof form === 'string' && POSSESSIVE_INVENTORY.has(form.trim().toLowerCase());
}

/**
 * The Portuguese person CUE displayed in the prompt for a DETERMINER item
 * (AC3). 3rd person collapses `ele·ela·você` because the agreeing determiner is
 * the same for all of them — the gender/number of the POSSESSED noun (not the
 * owner) decides the form, so no owner disambiguation is needed.
 */
export const PERSON_CUE: Readonly<Record<PossPerson, string>> = {
  eu: 'eu',
  tu: 'tu',
  ele_ela_voce: 'ele·ela·você',
  nos: 'nós',
  // `vós` (the subject pronoun) is archaic in modern continental EP, but the
  // possessive `vosso/vossa` is the LIVING possessive of `vocês` ("you, plural"),
  // so the learner-facing person LABEL is `vocês` (the data `person` key stays `vos`).
  vos: 'vocês',
  eles_elas: 'eles·elas',
};

/**
 * Forward reconstruction (§6.5): the agreeing determiner for a paradigm cell, or
 * `null` if the (person, gender, number) triple is not in the closed class. The
 * verified-key gate uses this to prove every determiner item is gradeable.
 */
export function determinerForm(
  person: string,
  gender: string,
  number: string,
): string | null {
  const cell = DETERMINER_PARADIGM.find(
    (c) => c.person === person && c.gender === gender && c.number === number,
  );
  return cell?.form ?? null;
}

/**
 * The OWNER cue for a dele-family answer (AC3): `dele`→`ele`, `dela`→`ela`,
 * `deles`→`eles`, `delas`→`elas`. Returns `null` for a non-dele surface.
 */
export function ownerForDele(form: string): DeleOwner | null {
  const entry = DELE_FAMILY.find((d) => d.form === form);
  return entry?.owner ?? null;
}

/** Is `kind` a recognized possessive family? */
export function isPossKind(kind: unknown): kind is PossKind {
  return kind === 'determiner' || kind === 'dele';
}
