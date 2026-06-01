// Restore-domain tests (contract Task 1 / AC3–AC4): transactional round-trip
// identity (incl. Date rehydration), content stores left untouched, and error
// cases that REFUSE without corrupting existing progress.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/index.ts';
import { BUNDLE_SCHEMA_VERSION, buildBundle, exportBundleJson } from './bundle.ts';
import {
  BundleValidationError,
  parseBundle,
  restoreBundle,
  restoreBundleJson,
} from './restore.ts';
import { clearProgress, seedProgress, EXPORTED_AT } from './testFixtures.ts';

const PROGRESS_TABLES = [
  db.attempts,
  db.sessions,
  db.cardStates,
  db.skillMastery,
  db.annotations,
  db.settings,
  db.orphanedProgress,
] as const;

async function clearContent(): Promise<void> {
  await Promise.all([db.nouns.clear(), db.contentMeta.clear()]);
}

describe('telemetry/restore (restore domain)', () => {
  beforeEach(async () => {
    await db.open();
    await clearProgress(db);
    await clearContent();
  });
  afterEach(async () => {
    await clearProgress(db);
    await clearContent();
  });

  describe('round-trip (export → wipe → restore ⇒ identical)', () => {
    it('restores every progress store identically', async () => {
      await seedProgress(db);
      const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });

      await clearProgress(db);
      for (const t of PROGRESS_TABLES) expect(await t.count()).toBe(0);

      await restoreBundleJson(db, json);

      // A second export of the restored DB must be byte-identical (full identity).
      const json2 = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
      expect(json2).toBe(json);
    });

    it('rehydrates indexed Date fields to real Date instances', async () => {
      await seedProgress(db);
      const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
      const originalDue = (await db.cardStates.get('word:casa:recognition'))!.due;

      await clearProgress(db);
      await restoreBundleJson(db, json);

      const card = await db.cardStates.get('word:casa:recognition');
      expect(card).toBeDefined();
      expect(card!.due).toBeInstanceOf(Date);
      expect(card!.due.getTime()).toBe(originalDue.getTime());
      // Nested FSRS card date too.
      expect(card!.card.due).toBeInstanceOf(Date);

      const attempt = (await db.attempts.toArray())[0];
      expect(attempt.ts).toBeInstanceOf(Date);
      expect(attempt.fsrsBefore?.due).toBeInstanceOf(Date);
      expect(attempt.fsrsAfter?.due).toBeInstanceOf(Date);

      const session = (await db.sessions.toArray())[0];
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.endedAt).toBeInstanceOf(Date);

      const ann = (await db.annotations.toArray())[0];
      expect(ann.ts).toBeInstanceOf(Date);

      const sm = (await db.skillMastery.toArray())[0];
      expect(sm.updatedAt).toBeInstanceOf(Date);

      const orph = (await db.orphanedProgress.toArray())[0];
      expect(orph.archivedAt).toBeInstanceOf(Date);
      // Nested payload (a cardStates record) is rehydrated too.
      expect((orph.payload as { due: Date }).due).toBeInstanceOf(Date);
    });

    it('the indexed due-date query works after restore (index not corrupted)', async () => {
      await seedProgress(db);
      const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
      await clearProgress(db);
      await restoreBundleJson(db, json);

      // A range query over the `due` index only resolves if `due` is a real Date.
      const all = await db.cardStates.where('due').belowOrEqual(new Date('2100-01-01')).toArray();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe('word:casa:recognition');
    });

    it('skillMastery is restored DIRECTLY from the bundle (not recomputed)', async () => {
      await seedProgress(db);
      const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
      await clearProgress(db);
      await restoreBundleJson(db, json);

      const sm = await db.skillMastery.get('nouns:gender');
      expect(sm).toBeDefined();
      expect(sm!.mastery).toBe(0.42);
      expect(sm!.attempts).toBe(3);
    });

    it('overwrites pre-existing progress (clear + bulkPut, not merge)', async () => {
      await seedProgress(db);
      const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });

      // Mutate / add stray progress that restore must wipe.
      await db.cardStates.put({
        ...(await db.cardStates.get('word:casa:recognition'))!,
        id: 'word:stray:recognition',
      });
      expect(await db.cardStates.count()).toBe(2);

      await restoreBundleJson(db, json);

      expect(await db.cardStates.count()).toBe(1);
      expect(await db.cardStates.get('word:stray:recognition')).toBeUndefined();
    });
  });

  describe('content stores are never touched by restore', () => {
    it('leaves a seeded content store unchanged', async () => {
      await db.nouns.put({
        contentId: 'noun:casa',
        lemma: 'casa',
        gender: 'f',
        article: 'a',
        en: 'house',
      });
      await db.contentMeta.put({
        key: 'content',
        contentVersion: 9,
        loadedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await seedProgress(db);
      const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
      await clearProgress(db);
      await restoreBundleJson(db, json);

      const noun = await db.nouns.get('noun:casa');
      expect(noun).toBeDefined();
      expect(noun!.lemma).toBe('casa');
      expect(await db.nouns.count()).toBe(1);
      // contentMeta (a content store) is untouched.
      expect((await db.contentMeta.get('content'))!.contentVersion).toBe(9);
    });
  });

  describe('error cases REFUSE without corrupting existing progress', () => {
    async function expectProgressUnchanged(): Promise<void> {
      // The seeded card must still be exactly as seeded.
      const card = await db.cardStates.get('word:casa:recognition');
      expect(card).toBeDefined();
      expect(await db.cardStates.count()).toBe(1);
      expect(await db.skillMastery.get('nouns:gender')).toBeDefined();
    }

    it('rejects an incompatible schemaVersion (no mutation)', async () => {
      await seedProgress(db);
      const good = await buildBundle(db, { exportedAt: EXPORTED_AT });
      const bad = { ...good, schemaVersion: BUNDLE_SCHEMA_VERSION + 99 };

      await expect(restoreBundle(db, bad as never)).rejects.toBeInstanceOf(
        BundleValidationError,
      );
      await expectProgressUnchanged();
    });

    it('rejects malformed JSON (no mutation)', async () => {
      await seedProgress(db);
      await expect(restoreBundleJson(db, '{ not valid json ]')).rejects.toBeInstanceOf(
        BundleValidationError,
      );
      await expectProgressUnchanged();
    });

    it('rejects a bundle missing data (no mutation)', async () => {
      await seedProgress(db);
      const bundle = await buildBundle(db, { exportedAt: EXPORTED_AT });
      const { data: _omitted, ...noData } = bundle;
      void _omitted;
      await expect(restoreBundle(db, noData as never)).rejects.toBeInstanceOf(
        BundleValidationError,
      );
      await expectProgressUnchanged();
    });

    it('rejects a bundle with a missing progress store in data (no mutation)', async () => {
      await seedProgress(db);
      const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
      const parsed = JSON.parse(json);
      delete parsed.data.cardStates;
      await expect(
        restoreBundleJson(db, JSON.stringify(parsed)),
      ).rejects.toBeInstanceOf(BundleValidationError);
      await expectProgressUnchanged();
    });

    it('rejects a non-array progress store in data (no mutation)', async () => {
      await seedProgress(db);
      const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
      const parsed = JSON.parse(json);
      parsed.data.attempts = { not: 'an array' };
      await expect(
        restoreBundleJson(db, JSON.stringify(parsed)),
      ).rejects.toBeInstanceOf(BundleValidationError);
      await expectProgressUnchanged();
    });

    it('rejects a record carrying a malformed date value (no mutation)', async () => {
      await seedProgress(db);
      const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
      const parsed = JSON.parse(json);
      // Envelope-level validation passes (it is a non-empty array), but the
      // row carries a garbage `ts` that would coerce to an Invalid Date — that
      // must REFUSE the restore rather than persist an unindexable Date.
      parsed.data.attempts[0].ts = 'not-a-real-date';
      await expect(
        restoreBundleJson(db, JSON.stringify(parsed)),
      ).rejects.toBeInstanceOf(BundleValidationError);
      await expectProgressUnchanged();
    });

    it('parseBundle surfaces a clear reason on incompatible version', () => {
      const json = JSON.stringify({ schemaVersion: 999, data: {} });
      expect(() => parseBundle(json)).toThrow(/incompatible schemaVersion/);
    });
  });
});
