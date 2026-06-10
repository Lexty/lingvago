import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DB_NAME, Lingvago2Db, db } from './index.ts';
import { useLiveQuery } from './index.ts';
import { createEmptyCard, toCardStateRecord } from './fsrs.ts';
import type { CardStateRecord } from './schema.ts';

const here = dirname(fileURLToPath(import.meta.url));

/** Minimal cardState fixture keyed by a content-derived id. */
function toCardStateRecordFixture(id: string): CardStateRecord {
  return toCardStateRecord(id, createEmptyCard(new Date('2026-01-01T00:00:00Z')));
}

describe('lingvago2 progress database', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    // Clear all stores between tests so CRUD assertions are independent.
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  // Runtime (behavioral) isolation assertion (SPEC §10.6): the live database
  // handle's name is EXACTLY `lingvago2` — never the v1 name `lingvago`.
  it('opens an IndexedDB named exactly lingvago2', () => {
    expect(db.name).toBe(DB_NAME);
    expect(db.name).toBe('lingvago2');
    expect(db.isOpen()).toBe(true);
  });

  it('never reports the v1 database name lingvago', () => {
    expect(db.name).not.toBe('lingvago');
    // A fresh instance must also bind to the isolated v2 name.
    const fresh = new Lingvago2Db();
    expect(fresh.name).toBe('lingvago2');
    expect(fresh.name).not.toBe('lingvago');
  });

  it('exposes all §7.2 progress stores (preserved across the v2 content bump)', () => {
    const names = db.tables.map((t) => t.name);
    // The v2 ADDITIVE bump must keep every §7.2 progress store present.
    for (const store of [
      'annotations',
      'attempts',
      'cardStates',
      'sessions',
      'settings',
      'skillMastery',
    ]) {
      expect(names).toContain(store);
    }
  });

  it('adds §7.1 read-only content stores + content-version meta (v2 additive)', () => {
    const names = db.tables.map((t) => t.name);
    for (const store of [
      'referenceCards',
      'verbs',
      'nouns',
      'prepositions',
      'contentMeta',
      'orphanedProgress',
    ]) {
      expect(names).toContain(store);
    }
    // The dedicated v2 db name is unchanged by the additive bump (§10.6).
    expect(db.name).toBe('lingvago2');
  });

  it('declares EXACTLY the 14 expected stores — no stray/duplicate/typo store', () => {
    // Exact-set guard over ALL stores (restores the strength of the pre-v2
    // `toEqual` check): an accidental extra store, a duplicate, or a misspelled
    // name (e.g. `verb` vs `verbs`) fails here. 6 §7.2 progress stores +
    // 6 §7.1 content stores (incl. v3 conjugationTables + v4 possessives) +
    // contentMeta + orphanedProgress = 14.
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'annotations',
        'attempts',
        'cardStates',
        'conjugationTables',
        'contentMeta',
        'nouns',
        'orphanedProgress',
        'possessives',
        'prepositions',
        'referenceCards',
        'sessions',
        'settings',
        'skillMastery',
        'verbs',
      ].sort(),
    );
  });

  it('v2 content bump does not lose §7.2 progress data on an existing db', async () => {
    // Write progress through the (already v2-bumped) handle, reopen a fresh
    // handle bound to the same IndexedDB, and assert the data is intact — the
    // additive version(2) must not drop/clear v1 progress stores.
    await db.cardStates.put(
      toCardStateRecordFixture('card:verb:ser:recognition'),
    );
    await db.settings.put({ key: 'app', userAlias: 'persist-me' });

    const fresh = new Lingvago2Db();
    await fresh.open();
    try {
      expect(await fresh.cardStates.get('card:verb:ser:recognition')).toBeDefined();
      expect((await fresh.settings.get('app'))?.userAlias).toBe('persist-me');
    } finally {
      fresh.close();
    }
  });

  it('CRUDs settings including userAlias', async () => {
    await db.settings.put({ key: 'app', userAlias: 'alex', value: { theme: 'dark' } });

    const read = await db.settings.get('app');
    expect(read?.userAlias).toBe('alex');
    expect(read?.value).toEqual({ theme: 'dark' });

    await db.settings.update('app', { userAlias: 'wife' });
    expect((await db.settings.get('app'))?.userAlias).toBe('wife');

    await db.settings.delete('app');
    expect(await db.settings.get('app')).toBeUndefined();
  });

  it('CRUDs attempts and queries them by sessionId/skill', async () => {
    const base = {
      ts: new Date(),
      modeId: 'vocab',
      level: 'A1',
      channel: 'recognition' as const,
      taskId: 't1',
      userAnswer: 'a',
      correctAnswer: 'a',
      correct: true,
    };
    await db.attempts.bulkAdd([
      { ...base, sessionId: 's1', skill: 'vocab' },
      { ...base, sessionId: 's1', skill: 'gender' },
      { ...base, sessionId: 's2', skill: 'vocab' },
    ]);

    expect(await db.attempts.count()).toBe(3);
    expect(await db.attempts.where('sessionId').equals('s1').count()).toBe(2);
    expect(await db.attempts.where('skill').equals('vocab').count()).toBe(2);
    const compound = await db.attempts
      .where('[sessionId+skill]')
      .equals(['s1', 'vocab'])
      .toArray();
    expect(compound).toHaveLength(1);
    expect(compound[0].id).toBeTypeOf('number');
  });

  it('re-exports useLiveQuery from dexie-react-hooks', () => {
    expect(useLiveQuery).toBeTypeOf('function');
  });
});

// Source-level guard: NO code in src/db opens/constructs a v1 `lingvago`
// database. This fails loudly if anyone later introduces `new Dexie('lingvago')`
// or a 'lingvago' string used as a database name (SPEC §10.6, §7.2).
describe('v1 database isolation (source guard)', () => {
  const files = ['index.ts', 'schema.ts', 'fsrs.ts'];

  it.each(files)('%s contains no v1 lingvago database reference', (file) => {
    // Read unconditionally: all guarded files MUST exist in this WP. If one is
    // removed/renamed, let readFileSync throw and fail the test loudly rather
    // than silently skipping — the §10.6 isolation guard must never go vacuous.
    const src = readFileSync(join(here, file), 'utf8');
    // Strip comments so prose mentioning v1 isolation doesn't trip the guard.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    // Any quoted bare 'lingvago' (not 'lingvago2') would be a v1 db name.
    expect(code).not.toMatch(/['"`]lingvago['"`]/);
    expect(code).not.toMatch(/new\s+Dexie\(\s*['"`]lingvago['"`]/);
  });
});
