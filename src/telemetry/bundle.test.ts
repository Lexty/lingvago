// Export-domain tests (contract Task 1 / AC1–AC2): the bundle carries all three
// real versions, is valid + deterministic JSON, and snapshots ONLY the §7.2
// progress stores.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/index.ts';
import {
  BUNDLE_SCHEMA_VERSION,
  buildBundle,
  exportBundleJson,
  getAppVersion,
  serializeBundle,
  stableStringify,
} from './bundle.ts';
import { clearProgress, seedProgress, EXPORTED_AT } from './testFixtures.ts';

describe('telemetry/bundle (export domain)', () => {
  beforeEach(async () => {
    await db.open();
    await clearProgress(db);
    await Promise.all([db.contentMeta.clear(), db.nouns.clear()]);
  });
  afterEach(async () => {
    await clearProgress(db);
    await Promise.all([db.contentMeta.clear(), db.nouns.clear()]);
  });

  it('carries all three real versions (schema/app/content)', async () => {
    await db.contentMeta.put({
      key: 'content',
      contentVersion: 7,
      loadedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    await seedProgress(db);

    const bundle = await buildBundle(db, { exportedAt: EXPORTED_AT });

    expect(bundle.schemaVersion).toBe(BUNDLE_SCHEMA_VERSION);
    expect(bundle.appVersion).toBe(getAppVersion());
    expect(bundle.appVersion).toBeTypeOf('string');
    expect(bundle.appVersion.length).toBeGreaterThan(0);
    expect(bundle.contentVersion).toBe(7);
    expect(bundle.exportedAt).toBe(EXPORTED_AT.toISOString());
  });

  it('contentVersion is null when no content is loaded', async () => {
    await seedProgress(db);
    const bundle = await buildBundle(db, { exportedAt: EXPORTED_AT });
    expect(bundle.contentVersion).toBeNull();
  });

  it('defaults userAlias from the app settings row', async () => {
    await seedProgress(db);
    const bundle = await buildBundle(db, { exportedAt: EXPORTED_AT });
    expect(bundle.userAlias).toBe('tester');
  });

  it('omits userAlias entirely when no alias is set', async () => {
    await seedProgress(db, { withAlias: false });
    const bundle = await buildBundle(db, { exportedAt: EXPORTED_AT });
    expect('userAlias' in bundle).toBe(false);
    expect(serializeBundle(bundle)).not.toContain('userAlias');
  });

  it('serializes to valid JSON', async () => {
    await seedProgress(db);
    const json = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(BUNDLE_SCHEMA_VERSION);
    expect(Array.isArray(parsed.data.cardStates)).toBe(true);
  });

  it('is deterministic: same snapshot + same exportedAt → identical JSON', async () => {
    await seedProgress(db);
    const a = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
    const b = await exportBundleJson(db, { exportedAt: EXPORTED_AT });
    expect(a).toBe(b);
  });

  it('exportedAt is injected (not derived from the clock)', async () => {
    await seedProgress(db);
    const t1 = new Date('2020-01-01T00:00:00.000Z');
    const t2 = new Date('2030-12-31T23:59:59.000Z');
    const b1 = await buildBundle(db, { exportedAt: t1 });
    const b2 = await buildBundle(db, { exportedAt: t2 });
    expect(b1.exportedAt).toBe(t1.toISOString());
    expect(b2.exportedAt).toBe(t2.toISOString());
  });

  it('exports ONLY the seven progress stores (no content stores)', async () => {
    await db.nouns.put({
      contentId: 'noun:casa',
      lemma: 'casa',
      gender: 'f',
      article: 'a',
      en: 'house',
    });
    await seedProgress(db);
    const bundle = await buildBundle(db, { exportedAt: EXPORTED_AT });
    const keys = Object.keys(bundle.data).sort();
    expect(keys).toEqual(
      [
        'annotations',
        'attempts',
        'cardStates',
        'orphanedProgress',
        'sessions',
        'settings',
        'skillMastery',
      ].sort(),
    );
    const json = serializeBundle(bundle);
    expect(json).not.toContain('noun:casa');
  });

  describe('stableStringify', () => {
    it('sorts object keys recursively (key order does not matter)', () => {
      const a = stableStringify({ b: 1, a: { d: 4, c: 3 } });
      const b = stableStringify({ a: { c: 3, d: 4 }, b: 1 });
      expect(a).toBe(b);
      expect(a).toBe('{"a":{"c":3,"d":4},"b":1}');
    });

    it('preserves array order (arrays are data)', () => {
      expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
    });

    it('renders Date as an ISO string and drops undefined props', () => {
      const out = stableStringify({ d: new Date('2026-05-31T00:00:00.000Z'), u: undefined });
      expect(out).toBe('{"d":"2026-05-31T00:00:00.000Z"}');
    });
  });
});
