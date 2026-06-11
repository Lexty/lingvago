// Possessive cue-production session generator (SPEC §1.2 production-first, §4.8
// L1→L3 curve, §6.1 seeded determinism, §6.3 parity-or-production, AC2–AC5).
//
// HARD L3 CONTEXT TIER (AC2/AC3/AC4): when the caller supplies CONTEXT records
// (`config.context`) AND the requested level is L3, the session is generated
// from those `PossessiveContextRecord`s instead of the cue-based paradigm rows.
// A context item shows the multi-line `dialogue` (with the single `___`) as its
// `drill.prompt` with NO `(eu)`/`(tu)`/owner cue prefixed — the whole point of
// the hard tier — and is ALWAYS `production` (typed answer; no MC, since
// recognition options would trivialize the inference). The answer is the
// AUTHORED form, graded exact-match by the SAME shared check; it travels a
// SEPARATE eligibility path (`filterContextEligible`) that does NOT reconstruct
// from the labels (see `eligibility.ts` for the honesty story). L1/L2 — and an
// L3 with NO context input — keep generating from the cue-based records, exactly
// as before (backward-compatible: `config.context` DEFAULTS to empty).
//
// A seed → a reproducible sequence of cue-prefixed cloze DrillItems over the
// VERIFIED-eligible possessive items only (the §6.5 verified-key gate is applied
// up front, so a row whose answer is not reconstructible from its cue can NEVER
// appear). Each item:
//
//  - carries a structured `cue` (AC3): for a `determiner` item the grammatical
//    PERSON (`eu` / `tu` / `ele·ela·você` / `nós` / `vocês` / `eles·elas`); for a
//    `dele` item the OWNER (`ele`/`ela`/`eles`/`elas`) derived from the answer.
//    The cue is what makes the production answer well-determined.
//  - prefixes that cue into the visible `drill.prompt`, e.g.
//    `(eu) A ___ caneta é preta.`, so the shared GrammarDrill needs NO change.
//
// MODE is decided by the SHARED parity module, not here (AC4): the generator
// feeds the correct answer + the §6.3 COMPETITIVE distractors to
// `assembleMcOrProduction`; if a parity set assembles the item is MC, else it
// falls back to PRODUCTION (typed input). Distractors are ONLY parity-feasible
// contrasts the shared `parity.ts` can actually assemble:
//
//   - determiner item → other determiners of the SAME possessedGender+Number,
//     DIFFERENT person (e.g. m/sg meu/teu/seu all length 3; f/sg minha/nossa/
//     vossa all length 5). Trains the PERSON confusion via recognition.
//   - dele item → the owner contrast (`dele`↔`dela`, 4=4). Trains his-vs-her.
//
// Cross-gender (`minha`↔`meu`) and cross-family (`seu`↔`dele`) pairs differ in
// length and are NOT offered (parity rejects them anyway). The agreement
// confusion (`meu`↔`minha`) is trained ON PURPOSE via the production channel
// (typing the gender-wrong form is graded wrong, revealing the canonical answer)
// plus the `ref-possessive` card — never as an MC option, so do NOT add a
// cross-gender distractor (AC4). The §4.8 curve only varies HOW MANY competitive
// traps are offered; parity then decides the channel from the answer's shape. The
// deterministic path uses ONLY the seeded PRNG.

import type { PossessiveContextRecord, PossessiveRecord } from '../../db/schema.ts';
import { createPrng } from '../numbers/prng.ts';
import {
  assembleMcOrProduction,
  type DistractorCandidate,
  type DrillItem,
  type DrillSourceRef,
} from '../shared/index.ts';
import {
  filterContextEligible,
  filterPossessiveEligible,
  reconstructAnswer,
} from './eligibility.ts';
import {
  DELE_FAMILY,
  DETERMINER_PARADIGM,
  ownerForDele,
  PERSON_CUE,
  type PossKind,
  type PossPerson,
} from './possData.ts';

/** The §4.8 difficulty levels this skill declares (L1→L3, AC2). */
export const POSS_LEVELS = ['L1', 'L2', 'L3'] as const;

/** A graded difficulty level of the Possessive curve (§4.8). */
export type PossLevel = (typeof POSS_LEVELS)[number];

/** The parity class for a possessive determiner answer (keeps families apart). */
const DETERMINER_PARITY_CLASS = 'possessive-determiner';

/** The parity class for a dele-family answer (never mixes with determiners). */
const DELE_PARITY_CLASS = 'possessive-dele';

/**
 * A generated Possessive item: the shared `DrillItem` (mode decided by the
 * parity module) plus the grounding metadata a screen / mastery roll-up needs.
 */
export interface PossessiveItem {
  /** Stable per-session id (`<seed>-<index>`). */
  id: string;
  /** The §4.8 level this item was generated at. */
  level: PossLevel;
  /** Which possessive family this item drills (mastery sub-axis). */
  kind: PossKind;
  /** The grammatical person of the source row (mastery sub-axis). */
  person: PossPerson;
  /**
   * The structured cue (AC3): the displayed Portuguese cue token. For a
   * determiner this is the PERSON cue; for a dele item it is the OWNER cue. For
   * a CONTEXT (L3) item there is NO cue (the owner is inferred from the
   * dialogue), so this is the empty string `''`.
   */
  cue: string;
  /** The verified possessive form being drilled (the answer key). */
  answer: string;
  /**
   * True for a HARD L3 CONTEXT item (prompt = the dialogue, no cue, always
   * `production`); false for a cue-based L1/L2/L3 item. Lets the screen / tests
   * distinguish the tier without re-parsing the prompt.
   */
  isContext: boolean;
  /** The shared drill item (production-first; MC only when parity assembled). */
  drill: DrillItem;
}

/** Tunable session shape; safe default covers a short single-level drill. */
export interface PossSessionConfig {
  /** Number of items to generate (clamped to ≥ 1). */
  count: number;
  /** The §4.8 level to generate at. */
  level: PossLevel;
  /**
   * The HARD L3 context pool (AC2/AC4). OPTIONAL and DEFAULTS to empty so every
   * existing 3-arg `generateSession(seed, records, config)` call site keeps
   * compiling and behaving identically. Consulted ONLY at level L3, where it has
   * THREE distinct outcomes:
   *   - OMITTED (`undefined`) or EMPTY (`[]`) ⇒ the AC2 backward-compat fallback:
   *     L3 stays on the cue-based path, exactly as before (no regression).
   *   - SUPPLIED + at least one CONTEXT-eligible record ⇒ the L3 session is drawn
   *     from the dialogues (the HARD tier).
   *   - SUPPLIED but NON-EMPTY with ZERO eligible records (all rows malformed —
   *     corrupt/failed-to-load context data) ⇒ L3 returns `[]` (graceful empty
   *     state). It does NOT silently degrade to the easy cue-based tier, which
   *     would hide the data-integrity failure behind a happy-looking session.
   * Ignored at L1/L2.
   */
  context?: readonly PossessiveContextRecord[];
}

/** Default session: a short L1 (production recall) drill. */
export const DEFAULT_POSS_SESSION_CONFIG: PossSessionConfig = {
  count: 10,
  level: 'L1',
};

function sourceOf(record: PossessiveRecord): DrillSourceRef {
  return { store: 'possessives', id: record.contentId };
}

function contextSourceOf(record: PossessiveContextRecord): DrillSourceRef {
  return { store: 'possessiveContext', id: record.contentId };
}

/**
 * Build one HARD L3 CONTEXT item from a context-eligible record (AC3/AC4).
 *
 * The prompt is the multi-line `dialogue` EXACTLY (with the single `___`),
 * with NO cue prefixed — the owner is inferred from the conversation, which is
 * the whole point of the hard tier. The item is ALWAYS `production` (no
 * candidates ⇒ `assembleMcOrProduction` returns a production item): recognition
 * MC options would trivialize the inference. The answer is the AUTHORED form,
 * graded exact-match by the same shared check; its gradeability rests on the
 * OFFLINE codex uniqueness verification of the dataset, not on reconstruction
 * (see `eligibility.ts`). Callers pass only context-eligible records, so this
 * never sees a malformed row.
 */
function buildContextItem(
  itemSeed: string,
  record: PossessiveContextRecord,
): PossessiveItem {
  const answer = record.answer.trim().toLowerCase();
  return {
    id: itemSeed,
    level: 'L3',
    kind: record.kind as PossKind,
    person: record.person as PossPerson,
    cue: '',
    answer,
    isContext: true,
    drill: assembleMcOrProduction({
      seed: itemSeed,
      prompt: record.dialogue,
      answer,
      answerExplanation: `«${answer}» — inferred from the dialogue (the owner is decided by the conversation, not a person cue)`,
      parityClass: 'possessive-context',
      // No candidates ⇒ production-only (AC3): an L3 context item is typed, never MC.
      candidates: [],
      sourceRef: contextSourceOf(record),
    }),
  };
}

/**
 * The human-facing LABEL for a grammatical person (AC3): the same cue token the
 * prompt shows (`ele·ela·você`, `nós`, `vocês`, …), so feedback never leaks the
 * raw `person` KEY (`vos`, `ele_ela_voce`). Falls back to the key with `_`→`·`
 * for any unmapped value (defensive — all closed-class persons are in the map).
 */
function personLabel(person: string): string {
  return PERSON_CUE[person as PossPerson] ?? person.replace(/_/g, '·');
}

/**
 * The cue token for a record (AC3). Determiner → the person cue; dele → the
 * owner derived from the (already reconstructed) answer. Returns `null` only for
 * a non-reconstructible dele surface (caller has already gated eligibility, so
 * this is defensive).
 */
function cueFor(record: PossessiveRecord, answer: string): string | null {
  if (record.kind === 'dele') {
    return ownerForDele(answer);
  }
  return PERSON_CUE[record.person as PossPerson] ?? null;
}

/**
 * The §6.3 competitive distractor pool for a record at `level`.
 *
 *  - determiner → sibling paradigm forms of the SAME gender+number, DIFFERENT
 *    person, the answer itself removed, de-duped by surface (so the shared
 *    `seu`/`sua` 3rd-person twins collapse to one). All same-gender/number forms
 *    are parity-feasible by construction; parity re-checks anyway.
 *  - dele → the owner-contrast forms of the SAME word-length (so `dele`↔`dela`
 *    but never `deles`/`delas`, which differ in length), the answer removed.
 *
 * L1 offers NONE (⇒ production); L2 offers exactly one; L3 offers the full set.
 * Returned in a STABLE order (paradigm / family order) so selection is
 * reproducible before the parity module's seeded shuffle.
 */
function candidatesFor(
  record: PossessiveRecord,
  answer: string,
  level: PossLevel,
): DistractorCandidate[] {
  if (level === 'L1') {
    return [];
  }

  let pool: DistractorCandidate[];
  if (record.kind === 'determiner') {
    const seen = new Set<string>([answer]);
    pool = [];
    for (const cell of DETERMINER_PARADIGM) {
      if (cell.gender !== record.possessedGender || cell.number !== record.possessedNumber) {
        continue;
      }
      if (seen.has(cell.form)) {
        continue;
      }
      seen.add(cell.form);
      pool.push({
        surface: cell.form,
        explanation: `wrong person — «${cell.form}» is the «${personLabel(cell.person)}» form; here the «${personLabel(record.person)}» form «${answer}» is required (it agrees with the possessed noun's ${record.possessedGender}/${record.possessedNumber})`,
      });
    }
  } else {
    // dele: only the equal-length owner contrast(s) (dele↔dela / deles↔delas).
    pool = DELE_FAMILY.filter((d) => d.form !== answer && d.form.length === answer.length).map(
      (d) => ({
        surface: d.form,
        explanation: `wrong owner — «${d.form}» means «${d.owner}»; here the owner is «${ownerForDele(answer) ?? answer}» ⇒ «${answer}»`,
      }),
    );
  }

  if (level === 'L2') {
    return pool.slice(0, 1);
  }
  return pool;
}

/**
 * Build one cue-prefixed item for a verified-eligible record at `level`. The
 * answer is reconstructed via the §6.5 gate (never read blindly); the prompt is
 * the blank sentence prefixed with the structured cue (AC3).
 *
 * Returns `null` if the record is somehow not reconstructible (defensive —
 * callers pass only eligible records, so this never happens on the happy path).
 */
function buildItem(
  itemSeed: string,
  record: PossessiveRecord,
  level: PossLevel,
): PossessiveItem | null {
  const answer = reconstructAnswer(record);
  if (answer === null) {
    return null;
  }
  const cue = cueFor(record, answer);
  if (cue === null) {
    return null;
  }
  const prompt = `(${cue}) ${record.blankSentence}`;
  const candidates = candidatesFor(record, answer, level);
  const parityClass =
    record.kind === 'dele' ? DELE_PARITY_CLASS : DETERMINER_PARITY_CLASS;

  return {
    id: itemSeed,
    level,
    kind: record.kind as PossKind,
    person: record.person as PossPerson,
    cue,
    answer,
    isContext: false,
    drill: assembleMcOrProduction({
      seed: itemSeed,
      prompt,
      answer,
      answerExplanation:
        record.kind === 'dele'
          ? `«${answer}» — invariable, follows the noun and names the owner «${cue}»`
          : `«${answer}» — the «${personLabel(record.person)}» possessive agreeing with the possessed noun (${record.possessedGender}/${record.possessedNumber})`,
      parityClass,
      candidates,
      sourceRef: sourceOf(record),
    }),
  };
}

/**
 * Generate a deterministic Possessive session for `seed` at the requested §4.8
 * level.
 *
 * L1/L2 (and L3 with NO/empty context input) draw from the cue-based `records`,
 * applying the §6.5 verified-key gate. At L3, if `config.context` is SUPPLIED and
 * non-empty, the session is drawn from those dialogues (the HARD tier: prompt =
 * the dialogue, no cue, production-only) via the SEPARATE context eligibility
 * path — and if every supplied row is ineligible (corrupt context data) L3
 * returns `[]` rather than silently degrading to the easy cue-based tier.
 * `config.context` is OPTIONAL and defaults to empty, so every existing 3-arg
 * call site behaves identically (L3 stays cue-based, backward-compatible).
 *
 * Same `seed` + same inputs + same `config` ⇒ byte-identical item list (no
 * `Math.random()`). Ineligible records (non-reconstructible cue rows; malformed
 * context rows) are dropped before any item is built, so an ungradeable prompt
 * can never appear. Returns `[]` when no record is eligible, so the caller
 * renders a graceful empty state (error path).
 */
export function generateSession(
  seed: string | number,
  records: readonly PossessiveRecord[],
  config: Partial<PossSessionConfig> = {},
): PossessiveItem[] {
  const cfg: PossSessionConfig = { ...DEFAULT_POSS_SESSION_CONFIG, ...config };
  const count = Math.max(1, Math.floor(cfg.count));

  // HARD L3 CONTEXT tier (AC2/AC3/AC4). Two distinct cases must NOT be conflated:
  //
  //  1. context OMITTED or EMPTY (`undefined` / `[]`) — the AC2 backward-compat
  //     case: every existing 3-arg call site (and an explicit empty pool) keeps
  //     L3 on the cue-based path, exactly as before. This is the blessed
  //     no-regression fallback, so we fall through to the cue-based path below.
  //  2. context EXPLICITLY SUPPLIED and NON-EMPTY — the caller is asking for the
  //     HARD tier. We DRAW from the context-eligible dialogues. If filtering
  //     yields zero eligible records (every supplied row is malformed — i.e. the
  //     context data failed to load or is corrupt), we DO NOT silently degrade to
  //     an easy cue-based L3 (that would hide a data-integrity bug behind a
  //     happy-looking session). Instead we return `[]`, so the screen renders its
  //     graceful empty state and the failure is visible rather than masked.
  if (cfg.level === 'L3' && cfg.context !== undefined && cfg.context.length > 0) {
    const contextEligible = filterContextEligible([...cfg.context]).sort((a, b) =>
      a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0,
    );
    if (contextEligible.length === 0) {
      // Explicitly-supplied pool, all rows ineligible ⇒ surface the failure (do
      // NOT fall through to cue-based, which would silently hide corrupt data).
      return [];
    }
    const ctxPrng = createPrng(seed);
    const ctxItems: PossessiveItem[] = [];
    for (let i = 0; i < count; i++) {
      const record =
        contextEligible[ctxPrng.intBetween(0, contextEligible.length - 1)];
      ctxItems.push(buildContextItem(`${String(seed)}-${i}`, record));
    }
    return ctxItems;
  }

  const eligible = filterPossessiveEligible([...records]).sort((a, b) =>
    a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0,
  );
  if (eligible.length === 0) {
    return [];
  }

  const prng = createPrng(seed);
  const items: PossessiveItem[] = [];

  for (let i = 0; i < count; i++) {
    const record = eligible[prng.intBetween(0, eligible.length - 1)];
    const itemSeed = `${String(seed)}-${i}`;
    const item = buildItem(itemSeed, record, cfg.level);
    if (item !== null) {
      items.push(item);
    }
  }

  return items;
}
