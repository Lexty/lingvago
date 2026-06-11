import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  buildContent,
  serializeContent,
  CONTENT_VERSION,
  CONTENT_FILENAME,
  type ContentBundle,
} from './build-content.ts';

// Vitest runs with cwd = worktree root; resolve fixture/script paths from there
// (import.meta.url is not a usable file:// URL under the vitest module wrapper).
const projectRoot = process.cwd();
function scriptPath(): string {
  return join(projectRoot, 'scripts', 'build-content.ts');
}
function normalizedInputDir(): string {
  return join(projectRoot, 'extraction', 'normalized');
}

describe('build-content — deterministic content pipeline (AC1, AC6a)', () => {
  it('produces a valid bundle with contentVersion and stable contentIds', () => {
    const bundle = buildContent();
    expect(bundle.contentVersion).toBe(CONTENT_VERSION);
    expect(CONTENT_FILENAME).toBe(`content.v${CONTENT_VERSION}.json`);

    // Minimal real payload: all groups non-empty (AC1).
    expect(bundle.referenceCards.length).toBeGreaterThan(0);
    expect(bundle.verbs.length).toBeGreaterThan(0);
    expect(bundle.nouns.length).toBeGreaterThan(0);
    expect(bundle.prepositions.length).toBeGreaterThan(0);
    expect(bundle.conjugationTables.length).toBeGreaterThan(0);

    // Every record carries a non-empty contentId (SPEC §7.1).
    const allIds = [
      ...bundle.referenceCards,
      ...bundle.verbs,
      ...bundle.nouns,
      ...bundle.prepositions,
      ...bundle.conjugationTables,
    ].map((r) => r.contentId);
    expect(allIds.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    // contentIds are globally unique across the bundle.
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('serializes to valid JSON round-tripping to the same bundle', () => {
    const bundle = buildContent();
    const json = serializeContent(bundle);
    const parsed = JSON.parse(json) as ContentBundle;
    expect(parsed).toEqual(bundle);
  });

  it('is deterministic: two builds yield byte-identical output (AC6a)', () => {
    const a = serializeContent(buildContent());
    const b = serializeContent(buildContent());
    expect(a).toBe(b);
    // No volatile values (dates / random) leaked into the artifact.
    expect(a).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/); // ISO timestamp
  });

  it('emits arrays in stable contentId order (AC6a)', () => {
    const bundle = buildContent();
    for (const arr of [
      bundle.verbs,
      bundle.nouns,
      bundle.prepositions,
      bundle.conjugationTables,
    ]) {
      const ids = arr.map((r) => r.contentId);
      const sorted = [...ids].sort((x, y) => x.localeCompare(y, 'en'));
      expect(ids).toEqual(sorted);
    }
  });

  it('CLI writes content.v<N>.json identical to the in-process build (AC2)', () => {
    // Write to a throwaway out dir so the test never clobbers the real artifact.
    const out = mkdtempSync(join(tmpdir(), 'bc-out-'));
    try {
      execFileSync('node', [scriptPath()], {
        stdio: 'pipe',
        env: { ...process.env, BUILD_CONTENT_OUT_DIR: out },
      });
      const onDisk = readFileSync(join(out, CONTENT_FILENAME), 'utf8');
      expect(onDisk).toBe(serializeContent(buildContent()));
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe('build-content — verified conjugation tables + needsTableReview (T8 Task 1)', () => {
  it('emits ≥41 present-tense conjugation tables, present-only, 5 persons (vós dropped)', () => {
    const bundle = buildContent();
    // verbs_teacher.json has 41 distinct verbs with a `presente` table.
    expect(bundle.conjugationTables.length).toBeGreaterThanOrEqual(41);

    for (const table of bundle.conjugationTables) {
      // Present-tense ONLY (pps/imperfeito ignored, contract In-scope).
      expect(table.tense).toBe('presente');
      // contentId follows the stable `conj:<infinitive>:presente` convention.
      expect(table.contentId).toBe(`conj:${table.infinitive.toLowerCase()}:presente`);
      // Exactly the 5 canonical persons — vós is stripped (plan-review note 1).
      expect(Object.keys(table.forms).sort()).toEqual([
        'eu',
        'nos',
        'tu',
        'voce_ele_ela',
        'voces_eles_elas',
      ]);
      // Every form is a non-empty string.
      for (const form of Object.values(table.forms)) {
        expect(typeof form).toBe('string');
        expect(form.length).toBeGreaterThan(0);
      }
      expect(typeof table.regular).toBe('boolean');
      expect(table.group.length).toBeGreaterThan(0);
    }
  });

  it('table forms match verbs_teacher verbatim for a sample (ser, falar)', () => {
    const bundle = buildContent();
    const ser = bundle.conjugationTables.find((t) => t.infinitive === 'ser');
    expect(ser?.forms).toEqual({
      eu: 'sou',
      tu: 'és',
      voce_ele_ela: 'é',
      nos: 'somos',
      voces_eles_elas: 'são',
    });
    const falar = bundle.conjugationTables.find((t) => t.infinitive === 'falar');
    expect(falar?.regular).toBe(true);
    expect(falar?.forms).toEqual({
      eu: 'falo',
      tu: 'falas',
      voce_ele_ela: 'fala',
      nos: 'falamos',
      voces_eles_elas: 'falam',
    });
  });

  it('carries the needsTableReview flag on every verb; the 9 flagged verbs are marked', () => {
    const bundle = buildContent();
    // Flag is present (boolean) on every verb record.
    for (const verb of bundle.verbs) {
      expect(typeof verb.needsTableReview).toBe('boolean');
    }
    // The 9 caverdyne/stem-shift verbs from verbs_inventory are flagged true.
    const flagged = bundle.verbs.filter((v) => v.needsTableReview).map((v) => v.infinitive).sort();
    expect(flagged).toEqual(
      [
        'acontecer',
        'agradecer',
        'conhecer',
        'desaparecer',
        'haver',
        'oferecer',
        'sentir-se',
        'valer',
        'vestir',
      ].sort(),
    );
  });
});

describe('build-content — possessives store + ref-possessive card (AC1)', () => {
  it('emits the 59 possessive cloze items with the cue/grading fields', () => {
    const bundle = buildContent();
    // possessives.json ships 59 verified items.
    expect(bundle.possessives.length).toBe(59);

    for (const rec of bundle.possessives) {
      // Stable `poss:NNNN` contentId carried from the dataset id.
      expect(rec.contentId).toMatch(/^poss:\d{4}$/);
      expect(typeof rec.blankSentence).toBe('string');
      expect(rec.blankSentence.length).toBeGreaterThan(0);
      expect(typeof rec.answer).toBe('string');
      expect(rec.answer.length).toBeGreaterThan(0);
      // kind is one of the two families; person/gender/number carried verbatim.
      expect(['determiner', 'dele']).toContain(rec.kind);
      expect(rec.person.length).toBeGreaterThan(0);
      expect(['m', 'f']).toContain(rec.possessedGender);
      expect(['sg', 'pl']).toContain(rec.possessedNumber);
      expect(typeof rec.hasArticle).toBe('boolean');
    }

    // Emitted in stable contentId order.
    const ids = bundle.possessives.map((r) => r.contentId);
    expect(ids).toEqual([...ids].sort((x, y) => x.localeCompare(y, 'en')));
  });

  it('authors the ref-possessive card with the 28-cell paradigm + 3 rules', () => {
    const bundle = buildContent();
    const card = bundle.referenceCards.find((c) => c.contentId === 'ref-possessive');
    expect(card).toBeDefined();
    const body = card?.body ?? '';
    // Determiner paradigm forms (a sample across persons/genders/numbers).
    for (const form of ['meu', 'minha', 'teus', 'nossa', 'vossos', 'suas']) {
      expect(body).toContain(form);
    }
    // The invariable dele-family row.
    for (const form of ['dele', 'dela', 'deles', 'delas']) {
      expect(body).toContain(form);
    }
    // The 3 core EP rules are numbered into the body.
    expect(body).toMatch(/1\. /);
    expect(body).toMatch(/2\. /);
    expect(body).toMatch(/3\. /);
  });

  it('AC3: labels the `vos` paradigm row `vocês` (not `vós`) and notes vós is archaic', () => {
    const bundle = buildContent();
    const card = bundle.referenceCards.find((c) => c.contentId === 'ref-possessive');
    const body = card?.body ?? '';
    // The person-column LABEL for the vos row is `vocês`, shown in a table row.
    expect(body).toMatch(/\|\s*vocês\s*\|/);
    // The vós-archaic note answers the learner's question in-app.
    expect(body).toContain('vocês');
    expect(body).toContain('vós');
    expect(body.toLowerCase()).toContain('arcaic');
    // The FORMS are unchanged (still vosso/vossa/vossos/vossas).
    for (const form of ['vosso', 'vossa', 'vossos', 'vossas']) {
      expect(body).toContain(form);
    }
    // The vos row is NOT labelled `vós` in the person column (only the note may
    // mention `vós`); assert no table row uses `| vós |` as a label cell.
    expect(body).not.toMatch(/\|\s*vós\s*\|/);
  });
});

describe('build-content — possessiveContext store (Task 1 / AC1)', () => {
  it('emits the 24 possessive-context dialogue items with the grading fields', () => {
    const bundle = buildContent();
    // possessives_context.json ships 24 verified dialogue items.
    expect(bundle.possessiveContext.length).toBe(24);

    const inventory = new Set([
      'meu', 'minha', 'meus', 'minhas',
      'teu', 'tua', 'teus', 'tuas',
      'seu', 'sua', 'seus', 'suas',
      'nosso', 'nossa', 'nossos', 'nossas',
      'vosso', 'vossa', 'vossos', 'vossas',
      'dele', 'dela', 'deles', 'delas',
    ]);

    for (const rec of bundle.possessiveContext) {
      // Stable `ctxNNNN` contentId carried from the dataset id.
      expect(rec.contentId).toMatch(/^ctx\d{4}$/);
      // The dialogue carries EXACTLY one `___` blank (no cue — the hard tier).
      expect(typeof rec.dialogue).toBe('string');
      expect(rec.dialogue.split('___').length - 1).toBe(1);
      // The authored answer is in the closed possessive inventory.
      expect(inventory.has(rec.answer)).toBe(true);
      // kind/person/gender/number carried verbatim.
      expect(['determiner', 'dele']).toContain(rec.kind);
      expect(rec.person.length).toBeGreaterThan(0);
      expect(rec.ownerCue.length).toBeGreaterThan(0);
      expect(['m', 'f']).toContain(rec.possessedGender);
      expect(['sg', 'pl']).toContain(rec.possessedNumber);
      expect(rec.possessedNoun.length).toBeGreaterThan(0);
    }

    // Emitted in stable contentId order.
    const ids = bundle.possessiveContext.map((r) => r.contentId);
    expect(ids).toEqual([...ids].sort((x, y) => x.localeCompare(y, 'en')));
  });
});

describe('build-content — interrogatives store + ref-interrogative card (AC1)', () => {
  it('emits the 90 interrogative cloze items with the gloss-cue/grading fields', () => {
    const bundle = buildContent();
    // interrogatives.json ships 90 verified items.
    expect(bundle.interrogatives.length).toBe(90);

    for (const rec of bundle.interrogatives) {
      // Stable `int:NNNN` contentId carried from the dataset id.
      expect(rec.contentId).toMatch(/^int:\d{4}$/);
      expect(typeof rec.blankSentence).toBe('string');
      expect(rec.blankSentence.length).toBeGreaterThan(0);
      expect(typeof rec.answer).toBe('string');
      expect(rec.answer.length).toBeGreaterThan(0);
      expect(rec.category.length).toBeGreaterThan(0);
      // Both language glosses (the language-aware meaning cue) are carried.
      expect(rec.gloss_ru.length).toBeGreaterThan(0);
      expect(rec.gloss_en.length).toBeGreaterThan(0);
      expect(rec.source.length).toBeGreaterThan(0);
      expect(typeof rec.sourceLine).toBe('number');
      // Agreement, when present, carries only string fields.
      if (rec.agreement) {
        for (const v of Object.values(rec.agreement)) {
          expect(typeof v).toBe('string');
        }
      }
    }

    // At least one quanto-family item carries gender+number agreement.
    const agreeing = bundle.interrogatives.filter(
      (r) => r.agreement?.gender && r.agreement?.number,
    );
    expect(agreeing.length).toBeGreaterThan(0);

    // Emitted in stable contentId order.
    const ids = bundle.interrogatives.map((r) => r.contentId);
    expect(ids).toEqual([...ids].sort((x, y) => x.localeCompare(y, 'en')));
  });

  it('authors the ref-interrogative card with the 17-row table + 6 rules', () => {
    const bundle = buildContent();
    const card = bundle.referenceCards.find((c) => c.contentId === 'ref-interrogative');
    expect(card).toBeDefined();
    const body = card?.body ?? '';
    // A sample of the 17 interrogative forms across the families.
    for (const form of ['quem', 'o que', 'onde', 'de onde', 'qual', 'quais', 'quanto', 'quantas']) {
      expect(body).toContain(form);
    }
    // The 6 core EP rules are numbered into the body.
    for (let n = 1; n <= 6; n += 1) {
      expect(body).toMatch(new RegExp(`${n}\\. `));
    }
  });
});

describe('build-content — fails loudly on bad input (AC6 error case)', () => {
  // Drive the REAL CLI against a poisoned copy of the normalized inputs; it must
  // exit non-zero with a meaningful message (never emit empty content silently).
  function runWithInput(inputDir: string): { code: number | null; stderr: string } {
    const out = mkdtempSync(join(tmpdir(), 'bc-err-out-'));
    try {
      execFileSync('node', [scriptPath()], {
        stdio: 'pipe',
        env: {
          ...process.env,
          BUILD_CONTENT_INPUT_DIR: inputDir,
          BUILD_CONTENT_OUT_DIR: out,
        },
      });
      return { code: 0, stderr: '' };
    } catch (err) {
      const e = err as { status?: number | null; stderr?: Buffer };
      return { code: e.status ?? 1, stderr: e.stderr?.toString() ?? '' };
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }

  it('exits non-zero with a clear message on CORRUPT input JSON', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-corrupt-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    writeFileSync(join(bad, 'verbs_inventory.json'), '{ this is : not json');
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/invalid JSON in input file verbs_inventory\.json/);
  });

  it('exits non-zero with a clear message on a MISSING input file', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-missing-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    rmSync(join(bad, 'vocab_full.json'));
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/missing input file vocab_full\.json/);
  });

  it('exits non-zero on a MISSING verbs_teacher.json (no silent empty tables)', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-vt-missing-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    rmSync(join(bad, 'verbs_teacher.json'));
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/missing input file verbs_teacher\.json/);
  });

  it('exits non-zero on a CORRUPT verbs_teacher.json', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-vt-corrupt-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    writeFileSync(join(bad, 'verbs_teacher.json'), '{ broken : json,,');
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/invalid JSON in input file verbs_teacher\.json/);
  });

  it('exits non-zero on a MISSING possessives.json (no silent empty store)', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-poss-missing-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    rmSync(join(bad, 'possessives.json'));
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/missing input file possessives\.json/);
  });

  it('exits non-zero on an EMPTY possessives items array (no silent empty store)', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-poss-empty-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    writeFileSync(
      join(bad, 'possessives.json'),
      JSON.stringify({ paradigm: [], notes: [], items: [] }),
    );
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/possessives\.json field "items" must not be empty/);
  });

  it('exits non-zero on a MISSING interrogatives.json (no silent empty store)', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-int-missing-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    rmSync(join(bad, 'interrogatives.json'));
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/missing input file interrogatives\.json/);
  });

  it('exits non-zero on an EMPTY interrogatives items array (no silent empty store)', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-int-empty-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    writeFileSync(
      join(bad, 'interrogatives.json'),
      JSON.stringify({ table: [], notes: [], items: [] }),
    );
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/interrogatives\.json field "items" must not be empty/);
  });

  it('exits non-zero on a DUPLICATE interrogatives item id (no silent overwrite)', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-int-dup-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    const dup = {
      id: 'int:0001',
      blankSentence: 'Olá! ___ te chamas?',
      answer: 'como',
      category: 'how',
      gloss_ru: 'как',
      gloss_en: 'how',
      agreement: null,
      source: 'livro_unit01',
      sourceLine: 39,
    };
    writeFileSync(
      join(bad, 'interrogatives.json'),
      JSON.stringify({ table: [], notes: [], items: [dup, { ...dup }] }),
    );
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/interrogatives\.json has duplicate item id "int:0001"/);
  });

  it('exits non-zero on a MISSING possessives_context.json (no silent empty store)', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-ctx-missing-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    rmSync(join(bad, 'possessives_context.json'));
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/missing input file possessives_context\.json/);
  });

  it('exits non-zero on an EMPTY possessives_context items array', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-ctx-empty-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    writeFileSync(join(bad, 'possessives_context.json'), JSON.stringify({ items: [] }));
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/possessives_context\.json field "items" must not be empty/);
  });

  it('exits non-zero on a DUPLICATE possessives_context item id (no silent overwrite)', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-ctx-dup-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    const dup = {
      id: 'ctx0001',
      dialogue: '— Comprei este casaco ontem.\n— Que bonito! Então é ___?',
      answer: 'teu',
      person: 'tu',
      kind: 'determiner',
      ownerCue: 'tu',
      possessedGender: 'm',
      possessedNumber: 'sg',
      possessedNoun: 'casaco',
    };
    writeFileSync(
      join(bad, 'possessives_context.json'),
      JSON.stringify({ items: [dup, { ...dup }] }),
    );
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/possessives_context\.json has duplicate item id "ctx0001"/);
  });

  it('exits non-zero on a context item with NO ___ blank (bad authored row)', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-ctx-noblank-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    writeFileSync(
      join(bad, 'possessives_context.json'),
      JSON.stringify({
        items: [
          {
            id: 'ctx0001',
            dialogue: '— Comprei este casaco ontem.\n— Que bonito! Então é teu?',
            answer: 'teu',
            person: 'tu',
            kind: 'determiner',
            ownerCue: 'tu',
            possessedGender: 'm',
            possessedNumber: 'sg',
            possessedNoun: 'casaco',
          },
        ],
      }),
    );
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/must contain exactly one "___" blank/);
  });

  it('exits non-zero on a context item whose answer is OUTSIDE the inventory', () => {
    const bad = mkdtempSync(join(tmpdir(), 'bc-ctx-badans-'));
    cpSync(normalizedInputDir(), bad, { recursive: true });
    writeFileSync(
      join(bad, 'possessives_context.json'),
      JSON.stringify({
        items: [
          {
            id: 'ctx0001',
            dialogue: '— Comprei este casaco ontem.\n— Que bonito! Então é ___?',
            answer: 'mine',
            person: 'tu',
            kind: 'determiner',
            ownerCue: 'tu',
            possessedGender: 'm',
            possessedNumber: 'sg',
            possessedNoun: 'casaco',
          },
        ],
      }),
    );
    const { code, stderr } = runWithInput(bad);
    rmSync(bad, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/is not in the possessive inventory/);
  });
});
