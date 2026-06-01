// Build the app content bundle (SPEC §7.3 pipeline) from
// extraction/normalized/*.json + authored reference cards.
//
// Output: public/content.v<CONTENT_VERSION>.json (currently content.v2.json) —
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
export const CONTENT_VERSION = 2;

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

export interface ContentBundle {
  contentVersion: number;
  referenceCards: ReferenceCard[];
  verbs: VerbRecord[];
  nouns: NounRecord[];
  prepositions: PrepositionRecord[];
  conjugationTables: ConjugationTableRecord[];
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

/**
 * Pure builder: assemble the full content bundle from disk inputs.
 *
 * Deterministic — given identical input files it returns an identical object
 * (stable key order via the literal below; arrays are sorted by contentId).
 */
export function buildContent(): ContentBundle {
  return {
    contentVersion: CONTENT_VERSION,
    referenceCards: referenceCards.map((c) => ({ ...c })),
    verbs: buildVerbs(),
    nouns: buildNouns(),
    prepositions: buildPrepositions(),
    conjugationTables: buildConjugationTables(),
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
    `${CONTENT_FILENAME}: ${bundle.referenceCards.length} cards · ${bundle.verbs.length} verbs · ${bundle.nouns.length} nouns · ${bundle.prepositions.length} prepositions · ${bundle.conjugationTables.length} conj-tables\n`,
  );
}

// Run only when executed as a script (not when imported by tests).
const isMain = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
