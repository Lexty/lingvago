// Build the app content bundle (SPEC §7.3 pipeline) from
// extraction/normalized/*.json + authored reference cards.
//
// Output: public/content.v<CONTENT_VERSION>.json (currently content.v7.json) —
// a versioned, READ-ONLY artifact loaded into IndexedDB content stores
// (SPEC §7.1) at first run / on contentVersion change.
//
// Invariants (contract T6):
//  - DETERMINISTIC: stable key order, sorted arrays, NO Date.now()/Math.random()
//    in the output (so one input ⇒ byte-identical output).
//  - Minimal real payload: referenceCards + verbs + nouns + prepositions.
//  - Fails LOUDLY on a missing/corrupt input file (never emits empty content
//    silently).
//
// Runnable with Node's native TypeScript stripping (`node scripts/build-content.ts`);
// keep syntax erasable (no enums / namespaces / parameter properties).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Content schema version embedded in the artifact (SPEC §7.3 contentVersion).
// v2 ADDS the verified present-tense conjugation tables + the
// `needsTableReview` verb flag (contract T8 Task 1) — a bump so any install
// already at content v1 reloads and materializes the new conjugationTables
// store. The bundle remains additive (no existing field removed/renamed).
// v3 ADDS the `possessives` content store + the authored `ref-possessive`
// reference card (EP possessive drill) — another additive bump so any install
// reloads and materializes the new possessives store.
// v4 ADDS the `interrogatives` content store + the authored `ref-interrogative`
// reference card (EP interrogative drill: the 17-row table + 6 rules) — another
// additive bump so any install reloads and materializes the new interrogatives
// store. The bundle remains additive (no existing field removed/renamed).
// v5 ADDS the `possessiveContext` content store (the HARDER L3 tier of the
// possessive drill: 24 verified dialogue cloze items where the owner is inferred
// from the conversation, NOT a person cue) — another additive bump so any
// install reloads and materializes the new possessiveContext store. The bundle
// remains additive (no existing field removed/renamed).
// v6 RELABELS the `vos` possessive person on the `ref-possessive` card row from
// `vós` to `vocês` (the living possessive of `vocês`; `vós` the subject pronoun
// is archaic in modern continental EP) and adds a short note explaining that
// `vós` is the archaic equivalent of `vocês`. The possessive FORMS are unchanged
// (vosso/vossa/…) — only the human-facing person LABEL + a note change. Body-only
// edit, so installed PWAs reload the updated card on the version bump.
// v7 REALIGNS the `ref-possessive` card's 3rd-person framing to the VERIFIED
// canon (`gram:possessivos-singular` + `gram:possessivos-plural` in
// grammar_full.json). The card paradigm is now SOURCED FROM that canon (not
// re-derived): the determiner agreement table lists only the persons that truly
// agree in gender+number (`eu/tu/você/nós/vocês`, with `seu/sua` belonging to
// `você`), and a separate 3rd-person block lists the invariable owner-forms
// `ele→dele / ela→dela / eles→deles / elas→delas`. The old `ele·ela·você → seu`
// lump is gone. Body-only edit, so installed PWAs reload the card on the bump.
export const CONTENT_VERSION = 7;

/** Output artifact name — `content.v<CONTENT_VERSION>.json` (SPEC §10.3). */
export const CONTENT_FILENAME = `content.v${CONTENT_VERSION}.json`;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
// Input dir is overridable (BUILD_CONTENT_INPUT_DIR) so tests can drive the
// pipeline against fixture/broken inputs; defaults to the committed data.
const normalizedDir = process.env.BUILD_CONTENT_INPUT_DIR ?? join(root, 'extraction', 'normalized');
// Output dir is overridable (BUILD_CONTENT_OUT_DIR) so tests don't clobber the
// real artifact; defaults to public/.
const outDir = process.env.BUILD_CONTENT_OUT_DIR ?? join(root, 'public');

// These record shapes intentionally MIRROR src/db/schema.ts (ReferenceCardRecord
// / VerbRecord / NounRecord / PrepositionRecord) but are declared independently
// so this node-run build script never imports the app schema. Keep the two in
// sync: any field change here must be mirrored in src/db/schema.ts (and vice
// versa) — the content stores load this exact shape.

/** A single content record carries a stable `contentId` (SPEC §7.1). */
export interface ReferenceCard {
  contentId: string;
  topic: string;
  title: string;
  body: string;
}

export interface VerbRecord {
  contentId: string;
  infinitive: string;
  group: string;
  reflexive: boolean;
  regular: boolean;
  hasTable: boolean;
  /**
   * Caverdyne / stem-shift verb without a verified table — EXCLUDED from
   * exam/production drills until a verified table exists (SPEC §6.5, contract
   * T8 AC3). Carried verbatim from verbs_inventory.json.
   */
  needsTableReview: boolean;
}

/**
 * The five canonical A1 persons (vós is archaic and intentionally DROPPED —
 * contract plan-review note 1). `voce_ele_ela` covers você/ele/ela;
 * `voces_eles_elas` covers vocês/eles/elas.
 */
export interface ConjugationForms {
  eu: string;
  tu: string;
  voce_ele_ela: string;
  nos: string;
  voces_eles_elas: string;
}

/**
 * A verified present-tense conjugation table (verbs_teacher.json), copied
 * verbatim from the teacher handout. Only `presente` tables are emitted (A1
 * scope); pps/imperfeito are intentionally ignored (contract T8 In-scope).
 */
export interface ConjugationTableRecord {
  /** Stable content id (`conj:<infinitive>:presente`); primary key. */
  contentId: string;
  infinitive: string;
  /** Always `presente` in this bundle (present-tense only). */
  tense: string;
  /** Conjugation group (`-ar` / `-er` / `-ir` / `-or`). */
  group: string;
  /** Whether the verb conjugates by the regular endings rule. */
  regular: boolean;
  /** The 5 canonical persons (vós dropped). */
  forms: ConjugationForms;
}

export interface NounRecord {
  contentId: string;
  lemma: string;
  gender: 'm' | 'f';
  article: 'o' | 'a';
  en: string | null;
}

export interface PrepositionRecord {
  contentId: string;
  category: string;
  prep: string;
  use: string;
  examples: string[];
}

/**
 * A single verified EP possessive cloze item (from possessives.json). Carries
 * the cue/grading fields the possessive drill mode needs: the cloze sentence,
 * the canonical answer, the grammatical person, the item `kind`
 * (`determiner` agrees with the possessed noun, `dele` is the invariable
 * dele/dela/deles/delas family), and the possessed noun's gender/number.
 */
export interface PossessiveRecord {
  contentId: string;
  blankSentence: string;
  answer: string;
  person: string;
  kind: string;
  possessedGender: string;
  possessedNumber: string;
  hasArticle: boolean;
}

/**
 * A single verified EP possessive CONTEXT cloze item (from
 * possessives_context.json). The HARDER L3 tier: the owner is inferred from a
 * short two-turn `dialogue` (carrying exactly one `___` blank), NOT a person
 * cue. Carries the same grading fields as a PossessiveRecord plus the
 * multi-line `dialogue`, the (informational-only) `ownerCue`, and the
 * `possessedNoun`. The `answer` is AUTHORED + adversarially verified for
 * uniqueness (it is NOT derivable from person+gender+number — e.g. vosso/seu
 * are context-decided), so it is graded exact-match against this single string.
 */
export interface PossessiveContextRecord {
  contentId: string;
  dialogue: string;
  answer: string;
  person: string;
  kind: string;
  ownerCue: string;
  possessedGender: string;
  possessedNumber: string;
  possessedNoun: string;
}

/** Agreement features carried by an interrogative (mirror src/db/schema.ts). */
export interface InterrogativeAgreement {
  gender?: string;
  number?: string;
  noun?: string;
}

/**
 * A single verified EP interrogative cloze item (from interrogatives.json).
 * Carries the gloss-cue/grading fields the interrogative drill mode needs: the
 * cloze sentence, the canonical answer (possibly multi-word, e.g. `o que`), the
 * semantic category, both gloss languages (the language-aware meaning cue), the
 * optional agreement features (qual/quais NUMBER; quanto-family GENDER+NUMBER),
 * and provenance (source/sourceLine).
 */
export interface InterrogativeRecord {
  contentId: string;
  blankSentence: string;
  answer: string;
  category: string;
  gloss_ru: string;
  gloss_en: string;
  agreement?: InterrogativeAgreement;
  source: string;
  sourceLine: number;
}

export interface ContentBundle {
  contentVersion: number;
  referenceCards: ReferenceCard[];
  verbs: VerbRecord[];
  nouns: NounRecord[];
  prepositions: PrepositionRecord[];
  conjugationTables: ConjugationTableRecord[];
  possessives: PossessiveRecord[];
  possessiveContext: PossessiveContextRecord[];
  interrogatives: InterrogativeRecord[];
}

/** Read + parse a normalized input file, failing loudly with file context. */
function readNormalized(file: string): unknown {
  const path = join(normalizedDir, file);
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (cause) {
    throw new Error(`build-content: missing input file ${file} (${path})`, { cause });
  }
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new Error(`build-content: invalid JSON in input file ${file} (${path})`, { cause });
  }
}

function asRecord(value: unknown, file: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`build-content: ${file} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, file: string, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`build-content: ${file} field "${field}" must be a JSON array`);
  }
  return value;
}

/** Zero-padded index → stable, sortable id segment (deterministic ordering). */
function pad(n: number): string {
  return String(n).padStart(4, '0');
}

// ---- nouns with gender/article (gender→article drills) -----------------------
function cleanLemma(s: string): string {
  return s
    .replace(/^(o|a|os|as)\s+/i, '') // strip leading article
    .replace(/\(-?([^)]*)\)/g, '$1') // "segunda(-feira)" -> "segunda-feira"
    .replace(/\s+/g, ' ')
    .trim();
}

function buildNouns(): NounRecord[] {
  const vocabFull = asRecord(readNormalized('vocab_full.json'), 'vocab_full.json');
  const entries = asArray(vocabFull.vocabulary, 'vocab_full.json', 'vocabulary');

  const seen = new Map<string, NounRecord>();
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (e.pos !== 'noun') continue;
    // The normalized vocab record stores the Portuguese lemma under `pt`
    // (extraction/normalized/SCHEMA.md); fall back to `lemma` for forward-compat.
    const rawPt = typeof e.pt === 'string' ? e.pt : typeof e.lemma === 'string' ? e.lemma : '';
    const lemma = cleanLemma(rawPt);
    const gender = e.gender;
    const article = e.article;
    if (!lemma) continue;
    if (gender !== 'm' && gender !== 'f') continue;
    if (article !== 'o' && article !== 'a') continue;
    const key = lemma.toLowerCase();
    if (seen.has(key)) continue;
    const translation = e.translation;
    let en: string | null = null;
    if (typeof translation === 'object' && translation !== null) {
      const t = translation as Record<string, unknown>;
      if (typeof t.en === 'string') en = t.en;
    }
    seen.set(key, {
      contentId: `noun:${key}`,
      lemma,
      gender,
      article,
      en,
    });
  }
  return [...seen.values()].sort((a, b) => a.contentId.localeCompare(b.contentId, 'en'));
}

// ---- verbs (from verbs_inventory) -------------------------------------------
function buildVerbs(): VerbRecord[] {
  const inv = asRecord(readNormalized('verbs_inventory.json'), 'verbs_inventory.json');
  const list = asArray(inv.verbs, 'verbs_inventory.json', 'verbs');

  const seen = new Map<string, VerbRecord>();
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const v = item as Record<string, unknown>;
    if (typeof v.infinitive !== 'string' || v.infinitive.length === 0) continue;
    const key = v.infinitive.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      contentId: `verb:${key}`,
      infinitive: v.infinitive,
      group: typeof v.group === 'string' ? v.group : '',
      reflexive: v.reflexive === true,
      regular: v.regular === true,
      hasTable: v.hasTable === true,
      needsTableReview: v.needsTableReview === true,
    });
  }
  return [...seen.values()].sort((a, b) => a.contentId.localeCompare(b.contentId, 'en'));
}

// ---- verified present-tense conjugation tables (from verbs_teacher) ----------
// Emit ONLY `presente` tables (A1 scope — pps/imperfeito ignored). Each table is
// copied verbatim from the teacher handout and reduced to the 5 canonical
// persons; the archaic `vós` form is intentionally STRIPPED (contract T8
// plan-review note 1 — vós is out of A1 scope).
const CONJ_TENSE_PRESENTE = 'presente';
const CONJ_PERSONS = ['eu', 'tu', 'voce_ele_ela', 'nos', 'voces_eles_elas'] as const;

function buildConjugationTables(): ConjugationTableRecord[] {
  const data = asRecord(readNormalized('verbs_teacher.json'), 'verbs_teacher.json');
  const list = asArray(data.verbs, 'verbs_teacher.json', 'verbs');

  const seen = new Map<string, ConjugationTableRecord>();
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;
    // Present tense ONLY — skip pps/imperfeito verbatim (contract In-scope).
    if (rec.tense !== CONJ_TENSE_PRESENTE) continue;
    if (typeof rec.verb !== 'string' || rec.verb.length === 0) {
      throw new Error('build-content: verbs_teacher.json present record missing "verb"');
    }
    const verb = rec.verb;
    const key = verb.toLowerCase();
    if (seen.has(key)) continue; // one table per (verb, presente)

    const rawForms = rec.forms;
    if (typeof rawForms !== 'object' || rawForms === null || Array.isArray(rawForms)) {
      throw new Error(`build-content: verbs_teacher.json verb "${verb}" missing "forms" object`);
    }
    const fr = rawForms as Record<string, unknown>;
    // Require all 5 canonical persons; the `vós` form (if any) is dropped here.
    const forms = {} as ConjugationForms;
    for (const person of CONJ_PERSONS) {
      const value = fr[person];
      if (typeof value !== 'string' || value.length === 0) {
        throw new Error(
          `build-content: verbs_teacher.json verb "${verb}" missing form "${person}"`,
        );
      }
      forms[person] = value;
    }

    seen.set(key, {
      contentId: `conj:${key}:${CONJ_TENSE_PRESENTE}`,
      infinitive: verb,
      tense: CONJ_TENSE_PRESENTE,
      group: typeof rec.group === 'string' ? rec.group : '',
      regular: rec.regular === true,
      forms,
    });
  }
  return [...seen.values()].sort((a, b) => a.contentId.localeCompare(b.contentId, 'en'));
}

// ---- prepositions (from prepositions_teacher) -------------------------------
// The array-shaped categories are emitted: tempo / movimento (keyed `prep`) and
// lugar (keyed `locucao` — compound place locuções; mapped onto `prep`). The
// single-object categories (movimento_casos_especiais / transporte /
// costumar_infinitivo) are intentionally skipped — they are not array-shaped
// and not part of the minimal payload.
const PREP_CATEGORIES = ['tempo', 'movimento', 'lugar'] as const;

function buildPrepositions(): PrepositionRecord[] {
  const data = asRecord(readNormalized('prepositions_teacher.json'), 'prepositions_teacher.json');
  const out: PrepositionRecord[] = [];
  for (const category of PREP_CATEGORIES) {
    const list = asArray(data[category], 'prepositions_teacher.json', category);
    list.forEach((item, idx) => {
      if (typeof item !== 'object' || item === null) return;
      const it = item as Record<string, unknown>;
      // `lugar` entries key the preposition under `locucao` (compound place
      // locuções); tempo/movimento use `prep`. Accept either.
      const prep =
        typeof it.prep === 'string'
          ? it.prep
          : typeof it.locucao === 'string'
            ? it.locucao
            : '';
      const use = typeof it.use === 'string' ? it.use : '';
      const examplesRaw = Array.isArray(it.examples) ? it.examples : [];
      const examples = examplesRaw.filter((x): x is string => typeof x === 'string');
      if (!prep) return;
      out.push({
        contentId: `prep:${category}:${pad(idx)}`,
        category,
        prep,
        use,
        examples,
      });
    });
  }
  return out.sort((a, b) => a.contentId.localeCompare(b.contentId, 'en'));
}

// ---- possessives (from possessives.json) ------------------------------------
// Each verified cloze item is emitted as a PossessiveRecord keyed by its stable
// dataset `id` (`poss:NNNN`). The cue/grading fields (person, kind, possessed
// gender/number) are carried verbatim so the possessive mode can compute the
// per-kind cue + grade exactly. Fails loudly on a missing/empty array or a
// malformed item (no silent empty store).
function asString(value: unknown, file: string, ctx: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`build-content: ${file} ${ctx} must be a non-empty string`);
  }
  return value;
}

function buildPossessives(): PossessiveRecord[] {
  const data = asRecord(readNormalized('possessives.json'), 'possessives.json');
  const items = asArray(data.items, 'possessives.json', 'items');
  if (items.length === 0) {
    throw new Error('build-content: possessives.json field "items" must not be empty');
  }

  const seen = new Map<string, PossessiveRecord>();
  for (const item of items) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('build-content: possessives.json item must be a JSON object');
    }
    const it = item as Record<string, unknown>;
    const contentId = asString(it.id, 'possessives.json', 'item "id"');
    if (seen.has(contentId)) {
      throw new Error(`build-content: possessives.json has duplicate item id "${contentId}"`);
    }
    seen.set(contentId, {
      contentId,
      blankSentence: asString(it.blankSentence, 'possessives.json', `item ${contentId} "blankSentence"`),
      answer: asString(it.answer, 'possessives.json', `item ${contentId} "answer"`),
      person: asString(it.person, 'possessives.json', `item ${contentId} "person"`),
      kind: asString(it.kind, 'possessives.json', `item ${contentId} "kind"`),
      possessedGender: asString(
        it.possessedGender,
        'possessives.json',
        `item ${contentId} "possessedGender"`,
      ),
      possessedNumber: asString(
        it.possessedNumber,
        'possessives.json',
        `item ${contentId} "possessedNumber"`,
      ),
      hasArticle: it.hasArticle === true,
    });
  }
  return [...seen.values()].sort((a, b) => a.contentId.localeCompare(b.contentId, 'en'));
}

// ---- possessive context (from possessives_context.json) ---------------------
// The HARDER L3 tier: each verified DIALOGUE cloze item is emitted as a
// PossessiveContextRecord keyed by its stable dataset `id` (`ctxNNNN`). Unlike
// the cue-based possessives, the answer is AUTHORED + adversarially verified
// (NOT reconstructable from person+gender+number — vosso/seu are context-decided)
// so the runtime grades it exact-match. To keep a bad authored row from ever
// shipping, the builder ALSO asserts (fail-loud) that every record has EXACTLY
// one `___` blank in its dialogue AND an `answer` inside the closed possessive
// inventory (the determiner + dele/dela family). Fails loudly on a
// missing/empty array or a duplicate id (no silent empty store).
//
// The closed EP possessive inventory (determiner forms + the invariable
// dele/dela/deles/delas family). Mirrors the paradigm the cue-based mode uses;
// declared inline here so this node-run build script never imports the app.
const POSSESSIVE_INVENTORY: ReadonlySet<string> = new Set([
  'meu', 'minha', 'meus', 'minhas',
  'teu', 'tua', 'teus', 'tuas',
  'seu', 'sua', 'seus', 'suas',
  'nosso', 'nossa', 'nossos', 'nossas',
  'vosso', 'vossa', 'vossos', 'vossas',
  'dele', 'dela', 'deles', 'delas',
]);

function countBlanks(s: string): number {
  // Count occurrences of the literal `___` blank marker.
  return s.split('___').length - 1;
}

function buildPossessiveContext(): PossessiveContextRecord[] {
  const data = asRecord(readNormalized('possessives_context.json'), 'possessives_context.json');
  const items = asArray(data.items, 'possessives_context.json', 'items');
  if (items.length === 0) {
    throw new Error('build-content: possessives_context.json field "items" must not be empty');
  }

  const seen = new Map<string, PossessiveContextRecord>();
  for (const item of items) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('build-content: possessives_context.json item must be a JSON object');
    }
    const it = item as Record<string, unknown>;
    const contentId = asString(it.id, 'possessives_context.json', 'item "id"');
    if (seen.has(contentId)) {
      throw new Error(
        `build-content: possessives_context.json has duplicate item id "${contentId}"`,
      );
    }
    const dialogue = asString(
      it.dialogue,
      'possessives_context.json',
      `item ${contentId} "dialogue"`,
    );
    // Fail-loud: exactly one `___` blank (a bad authored row never ships).
    const blanks = countBlanks(dialogue);
    if (blanks !== 1) {
      throw new Error(
        `build-content: possessives_context.json item ${contentId} "dialogue" must contain exactly one "___" blank (found ${blanks})`,
      );
    }
    const answer = asString(it.answer, 'possessives_context.json', `item ${contentId} "answer"`);
    // Fail-loud: the authored answer must be inside the closed possessive
    // inventory (determiner + dele family) — a typo'd/out-of-paradigm answer
    // would be ungradeable, so it never ships.
    if (!POSSESSIVE_INVENTORY.has(answer)) {
      throw new Error(
        `build-content: possessives_context.json item ${contentId} "answer" ("${answer}") is not in the possessive inventory`,
      );
    }
    seen.set(contentId, {
      contentId,
      dialogue,
      answer,
      person: asString(it.person, 'possessives_context.json', `item ${contentId} "person"`),
      kind: asString(it.kind, 'possessives_context.json', `item ${contentId} "kind"`),
      ownerCue: asString(it.ownerCue, 'possessives_context.json', `item ${contentId} "ownerCue"`),
      possessedGender: asString(
        it.possessedGender,
        'possessives_context.json',
        `item ${contentId} "possessedGender"`,
      ),
      possessedNumber: asString(
        it.possessedNumber,
        'possessives_context.json',
        `item ${contentId} "possessedNumber"`,
      ),
      possessedNoun: asString(
        it.possessedNoun,
        'possessives_context.json',
        `item ${contentId} "possessedNoun"`,
      ),
    });
  }
  return [...seen.values()].sort((a, b) => a.contentId.localeCompare(b.contentId, 'en'));
}

// ---- interrogatives (from interrogatives.json) ------------------------------
// Each verified cloze item is emitted as an InterrogativeRecord keyed by its
// stable dataset `id` (`int:NNNN`). The gloss-cue/grading fields (category, both
// glosses, the optional agreement features, source/sourceLine) are carried
// verbatim so the interrogative mode can compute the language-aware cue + grade
// exactly. Fails loudly on a missing/empty array or a duplicate id (no silent
// empty store).
function asAgreement(value: unknown): InterrogativeAgreement | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('build-content: interrogatives.json item "agreement" must be an object or null');
  }
  const a = value as Record<string, unknown>;
  const out: InterrogativeAgreement = {};
  if (typeof a.gender === 'string') out.gender = a.gender;
  if (typeof a.number === 'string') out.number = a.number;
  if (typeof a.noun === 'string') out.noun = a.noun;
  return out;
}

function buildInterrogatives(): InterrogativeRecord[] {
  const data = asRecord(readNormalized('interrogatives.json'), 'interrogatives.json');
  const items = asArray(data.items, 'interrogatives.json', 'items');
  if (items.length === 0) {
    throw new Error('build-content: interrogatives.json field "items" must not be empty');
  }

  const seen = new Map<string, InterrogativeRecord>();
  for (const item of items) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('build-content: interrogatives.json item must be a JSON object');
    }
    const it = item as Record<string, unknown>;
    const contentId = asString(it.id, 'interrogatives.json', 'item "id"');
    if (seen.has(contentId)) {
      throw new Error(`build-content: interrogatives.json has duplicate item id "${contentId}"`);
    }
    if (typeof it.sourceLine !== 'number') {
      throw new Error(
        `build-content: interrogatives.json item ${contentId} "sourceLine" must be a number`,
      );
    }
    const record: InterrogativeRecord = {
      contentId,
      blankSentence: asString(
        it.blankSentence,
        'interrogatives.json',
        `item ${contentId} "blankSentence"`,
      ),
      answer: asString(it.answer, 'interrogatives.json', `item ${contentId} "answer"`),
      category: asString(it.category, 'interrogatives.json', `item ${contentId} "category"`),
      gloss_ru: asString(it.gloss_ru, 'interrogatives.json', `item ${contentId} "gloss_ru"`),
      gloss_en: asString(it.gloss_en, 'interrogatives.json', `item ${contentId} "gloss_en"`),
      source: asString(it.source, 'interrogatives.json', `item ${contentId} "source"`),
      sourceLine: it.sourceLine,
    };
    const agreement = asAgreement(it.agreement);
    if (agreement) record.agreement = agreement;
    seen.set(contentId, record);
  }
  return [...seen.values()].sort((a, b) => a.contentId.localeCompare(b.contentId, 'en'));
}

// ---- authored reference cards (verified didactic material, WP-B) ------------
// Stable, hand-authored; `contentId` is the authored id.
const referenceCards: ReferenceCard[] = [
  {
    contentId: 'ref-genero-artigo',
    topic: 'Род и артикль',
    title: 'Род существительного → артикль (o / a)',
    body: [
      '**Определённый артикль:** мужской → **o**, женский → **a** (мн.: os / as).',
      '',
      '**Подсказки по окончанию (не правило, но помогают):**',
      '• Обычно **-o → m** (o carro, o livro), **-a → f** (a casa, a mesa).',
      '• **-ção, -são, -dade, -agem, -ície → f** (a estação, a cidade, a viagem).',
      '• **-ma (греч.) → m** (o problema, o programa, o tema).',
      '• **-ão**: чаще m (o coração), но a mão, a razão — f. Учить отдельно.',
      '',
      '⚠️ Исключения учим как факт: **a mão, o dia, o mapa, a tribo**.',
      '',
      '**С именами/странами** артикль ставится при *ser*/как подлежащее (Sou **o** Paulo), но НЕ при *chamar-se* (Chamo-me Paulo).',
    ].join('\n'),
  },
  {
    contentId: 'ref-prep-de-em',
    topic: 'Предлоги',
    title: 'Откуда / где: de + em + страна (контракции)',
    body: [
      '**Откуда (origem): «De onde é? — Sou ___»** → de + артикль:',
      '• de + o = **do** · de + a = **da** · de + os = **dos**',
      '• без артикля: **de**',
      'Sou **do** Brasil · **da** Rússia · **dos** Estados Unidos · **de** Portugal.',
      '',
      '**Где (localização): «Onde fica? — Fica ___»** → em + артикль:',
      '• em + o = **no** · em + a = **na** · em + os = **nos**',
      '• без артикля: **em**',
      'Fica **no** Japão · **na** Grécia · **nos** EUA · **em** Marrocos.',
      '',
      '**Ключ:** сначала вспомни РОД/артикль страны (o Brasil → do/no; a Rússia → da/na), потом собери контракцию.',
      '',
      '⚠️ Без артикля: **Portugal, Marrocos, Angola**. Опц.: (a) Espanha/Itália/França — чаще без артикля: de Espanha, em Itália.',
    ].join('\n'),
  },
  {
    contentId: 'ref-prep-a-para',
    topic: 'Предлоги',
    title: 'Движение: a vs para (и a casa / para casa)',
    body: [
      '**a** — короткое перемещение / ненадолго: «Vou **a** Paris» (съездил и вернулся).',
      '**para** — длительное / насовсем / пункт назначения: «Vou **para** o Brasil».',
      '',
      '**a casa / para casa:**',
      '• **ir a casa** — домой ненадолго (к себе, по делу и обратно).',
      '• **ir para casa** — домой (остаться), как конечный пункт.',
      '',
      '**chegar a** (прибыть куда): chego **a** casa, **ao** trabalho.',
      '**sair de** (уйти откуда): saio **de** casa; но **sair para** (уйти куда): saio **para** a escola.',
      '',
      '**Транспорт:** **de** carro / comboio / autocarro / avião; **a** pé.',
    ].join('\n'),
  },
  {
    contentId: 'ref-prep-tempo',
    topic: 'Предлоги',
    title: 'Предлоги времени: a / de / em',
    body: [
      '**a +** часть дня/время: **à** tarde, **à** noite, **ao** meio-dia; às oito horas; à(s) segunda(s).',
      '**de +** часть дня (привычка): **de** manhã (apanho o metro); de segunda a sexta.',
      '**em +** месяц/год/время года/день недели (разово): **em** maio, em 1990, **no** verão, **na** terça-feira.',
      '',
      '«vinte **e** três», «oitenta **e** sete» — союз *e* между десятками и единицами.',
    ].join('\n'),
  },
  {
    contentId: 'ref-prep-lugar',
    topic: 'Предлоги',
    title: 'Предлоги места (locuções) + контракция с артиклем',
    body: [
      'Все сочетаются с **de** (+ артикль → do/da/dos/das):',
      '• **em cima de** (на) — em cima **da** mesa',
      '• **debaixo de** (под) — debaixo **da** cama',
      '• **ao lado de** (рядом) — ao lado **do** banco',
      '• **em frente de / a** (напротив)',
      '• **atrás de** (за) · **dentro de** (внутри) · **perto de** (близко) · **longe de** (далеко)',
      '• **entre** (между) — без de.',
    ].join('\n'),
  },
  {
    contentId: 'ref-ser-estar',
    topic: 'Глаголы',
    title: 'SER vs ESTAR',
    body: [
      '**SER** — постоянное/сущность: профессия, национальность, характер, время, происхождение.',
      'Eu **sou** russo. Ela **é** médica. **São** três horas. Sou **do** Brasil.',
      '',
      '**ESTAR** — состояние/местоположение/временное:',
      'Eu **estou** cansado. O livro **está** na mesa. **Está** frio hoje.',
      '',
      '**Локализация городов** — ser и ficar взаимозаменяемы: «Lisboa **é/fica** em Portugal».',
      '',
      'SER: sou / és / é / somos / são. ESTAR: estou / estás / está / estamos / estão.',
    ].join('\n'),
  },
  {
    contentId: 'ref-verbos-presente',
    topic: 'Глаголы',
    title: 'Presente do Indicativo — окончания',
    body: [
      '**-AR** (falar): falo / falas / fala / falamos / falam.',
      '**-ER** (comer): como / comes / come / comemos / comem.',
      '**-IR** (partir): parto / partes / parte / partimos / partem.',
      '',
      '**Неправильные (учить):**',
      'ter: tenho / tens / tem / temos / têm',
      'ir: vou / vais / vai / vamos / vão',
      'fazer: faço / fazes / faz / fazemos / fazem',
      'pôr: ponho / pões / põe / pomos / põem',
      'ver: vejo / vês / vê / vemos / veem · ler: leio / lês / lê / lemos / leem',
      '',
      '**Возвратные:** chamar-se → chamo-**me**, chamas-**te**, chama-**se**, chamamo-**nos**, chamam-**se**.',
    ].join('\n'),
  },
];

// ---- authored possessive reference card (paradigm + rules, canon-sourced) ----
// The `ref-possessive` card body is SOURCED FROM the VERIFIED canon in
// grammar_full.json (`gram:possessivos-singular` + `gram:possessivos-plural`),
// NOT re-derived. The canon frames modern EP accurately: `seu/sua` is the formal
// possessive of `você`; `ele/ela/eles/elas` use the invariable
// `dele/dela/deles/delas`. So the card shows (a) a determiner AGREEMENT table for
// the persons that truly agree in gender+number (`eu/tu/você/nós/vocês`) and (b)
// a separate 3rd-person possession block for the invariable owner-forms.
// (The machine-readable distractor paradigm for the drill mode is a separate
// static const in src/modes/possessive/possData.ts — contract AC4 — not parsed
// from here.)

// The persons whose possessive truly AGREES in gender+number, in canon order.
// `você` carries `seu/sua` (formal "your"); `ele/ela/…` are handled by the
// invariable dele-block, NOT this table.
const POSS_AGREEING_PERSONS: readonly string[] = ['eu', 'tu', 'você', 'nós', 'vocês'];

// The invariable 3rd-person owner→form mapping, in canon order.
const POSS_DELE_OWNERS: readonly string[] = ['ele', 'ela', 'eles', 'elas'];

/** Read a canon entry's `data.table` rows ({pessoa, masculino, feminino}). */
function readPossCanonTable(grammar: Record<string, unknown>, id: string): Record<string, string>[] {
  const entries = asArray(grammar.grammar, 'grammar_full.json', 'grammar');
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (e.id !== id) continue;
    const data = asRecord(e.data, 'grammar_full.json');
    const table = asArray(data.table, 'grammar_full.json', `${id}.data.table`);
    const rows: Record<string, string>[] = [];
    for (const r of table) {
      if (typeof r !== 'object' || r === null) continue;
      const rr = r as Record<string, unknown>;
      rows.push({
        pessoa: typeof rr.pessoa === 'string' ? rr.pessoa : '',
        masculino: typeof rr.masculino === 'string' ? rr.masculino : '',
        feminino: typeof rr.feminino === 'string' ? rr.feminino : '',
      });
    }
    return rows;
  }
  throw new Error(`build-content: grammar_full.json missing canon entry "${id}"`);
}

/** Find a canon row by its `pessoa` label (the plural canon may suffix it). */
function findCanonRow(rows: Record<string, string>[], pessoa: string): Record<string, string> | undefined {
  return rows.find((r) => r.pessoa === pessoa || r.pessoa.split('/')[0].trim() === pessoa);
}

function buildPossessiveCard(): ReferenceCard {
  const grammar = asRecord(readNormalized('grammar_full.json'), 'grammar_full.json');
  const singular = readPossCanonTable(grammar, 'gram:possessivos-singular');
  const plural = readPossCanonTable(grammar, 'gram:possessivos-plural');

  // (a) Determiner AGREEMENT table — join the singular table (sg columns) with
  // the plural table (pl columns) per agreeing person, sourced from the canon.
  const determinerRows: string[] = [
    '| Pessoa | m. sg. | m. pl. | f. sg. | f. pl. |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const pessoa of POSS_AGREEING_PERSONS) {
    const sg = findCanonRow(singular, pessoa);
    const pl = findCanonRow(plural, pessoa);
    determinerRows.push(
      `| ${pessoa} | ${sg?.masculino ?? '—'} | ${pl?.masculino ?? '—'} | ${sg?.feminino ?? '—'} | ${pl?.feminino ?? '—'} |`,
    );
  }

  // (b) 3rd-person possession block — the invariable owner→form mapping, sourced
  // from the canon (singular table gives the sg owner-forms; plural the pl).
  const deleLines: string[] = [];
  for (const owner of POSS_DELE_OWNERS) {
    const isPlural = owner === 'eles' || owner === 'elas';
    const row = findCanonRow(isPlural ? plural : singular, owner);
    const form = row?.masculino ?? '—';
    deleLines.push(`${owner} → ${form}`);
  }

  // Core rules — phrasing kept from the prior card, with the canon's own notes
  // (article + dele-after-the-noun) as their grammatical source.
  const ruleLines = [
    '1. O possessivo concorda com o NOME possuído (género + número), não com o dono.',
    '2. Usa-se o artigo definido antes do possessivo: `o meu relógio`, `a minha caneta`.',
    '3. Em EP prefere-se `dele/dela/deles/delas` (depois do nome) a `seu/sua` para "his/her/their": `o relógio dele`.',
  ];

  const body = [
    '**Possessive determiners** — agree with the POSSESSED noun (gender + number):',
    '',
    ...determinerRows,
    '',
    '**3rd person (after the noun, invariable owner-forms):**',
    ...deleLines.map((l) => `• ${l}`),
    '',
    '**Core rules:**',
    ...ruleLines,
    '',
    '**Nota:** `vocês` é o "you, plural" do dia-a-dia; o possessivo `vosso/vossa` é o seu possessivo vivo. `vós` (o pronome sujeito) é o equivalente arcaico de `vocês`.',
  ].join('\n');

  return {
    contentId: 'ref-possessive',
    topic: 'Possessivos',
    title: 'Possessivos: paradigma + regras',
    body,
  };
}

// ---- authored interrogative reference card (table + rules, data-derived) ----
// The `ref-interrogative` card body is RENDERED from interrogatives.json's
// `table` (the 17 interrogative forms with category/gloss/agreement) and `notes`
// (the 6 core EP rules) so the human-facing card stays in lock-step with the
// verified dataset. (The machine-readable distractor table for the mode is a
// separate static const in src/modes/interrogative/intData.ts — not parsed from
// here.)
function agreementLabel(agreement: unknown): string {
  if (agreement === null || agreement === undefined) return '—';
  if (typeof agreement !== 'object' || Array.isArray(agreement)) return '—';
  const a = agreement as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof a.gender === 'string') parts.push(a.gender);
  if (typeof a.number === 'string') parts.push(a.number);
  return parts.length ? parts.join(' ') : '—';
}

function buildInterrogativeCard(): ReferenceCard {
  const data = asRecord(readNormalized('interrogatives.json'), 'interrogatives.json');
  const table = asArray(data.table, 'interrogatives.json', 'table');
  const notes = asArray(data.notes, 'interrogatives.json', 'notes');

  const tableRows: string[] = [
    '| Form | Meaning | RU | Agreement |',
    '| --- | --- | --- | --- |',
  ];
  for (const entry of table) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const form = typeof e.form === 'string' ? e.form : '';
    if (!form) continue;
    const category = typeof e.category === 'string' ? e.category : '';
    const glossEn = typeof e.gloss_en === 'string' ? e.gloss_en : '';
    const glossRu = typeof e.gloss_ru === 'string' ? e.gloss_ru : '';
    const meaning = glossEn || category;
    tableRows.push(`| ${form} | ${meaning} | ${glossRu} | ${agreementLabel(e.agreement)} |`);
  }

  const ruleLines = notes
    .filter((n): n is string => typeof n === 'string')
    .map((n, idx) => `${idx + 1}. ${n}`);

  const body = [
    '**Interrogativos** — EP question words (the blank replaces the interrogative):',
    '',
    ...tableRows,
    '',
    '**Core rules:**',
    ...ruleLines,
  ].join('\n');

  return {
    contentId: 'ref-interrogative',
    topic: 'Interrogativos',
    title: 'Interrogativos: tabela (17 formas) + regras',
    body,
  };
}

/**
 * Pure builder: assemble the full content bundle from disk inputs.
 *
 * Deterministic — given identical input files it returns an identical object
 * (stable key order via the literal below; arrays are sorted by contentId).
 */
export function buildContent(): ContentBundle {
  return {
    contentVersion: CONTENT_VERSION,
    referenceCards: [
      ...referenceCards.map((c) => ({ ...c })),
      buildPossessiveCard(),
      buildInterrogativeCard(),
    ],
    verbs: buildVerbs(),
    nouns: buildNouns(),
    prepositions: buildPrepositions(),
    conjugationTables: buildConjugationTables(),
    possessives: buildPossessives(),
    possessiveContext: buildPossessiveContext(),
    interrogatives: buildInterrogatives(),
  };
}

/** Serialize deterministically (2-space pretty JSON, stable insertion order). */
export function serializeContent(bundle: ContentBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

function main(): void {
  const bundle = buildContent();
  const json = serializeContent(bundle);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, CONTENT_FILENAME), json);
  // Stderr is fine for a build log; output file content stays deterministic.
  process.stderr.write(
    `${CONTENT_FILENAME}: ${bundle.referenceCards.length} cards · ${bundle.verbs.length} verbs · ${bundle.nouns.length} nouns · ${bundle.prepositions.length} prepositions · ${bundle.conjugationTables.length} conj-tables · ${bundle.possessives.length} possessives · ${bundle.possessiveContext.length} possessive-context · ${bundle.interrogatives.length} interrogatives\n`,
  );
}

// Run only when executed as a script (not when imported by tests).
const isMain = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
