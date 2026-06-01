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
});
