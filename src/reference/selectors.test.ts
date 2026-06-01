import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/index.ts';
import type { ReferenceCardRecord } from '../db/schema.ts';
// Drive the "real bundle" assertions off buildContent() output (the authored
// source of truth) rather than the generated, non-committed public/content.v2.json.
import { buildContent } from '../../scripts/build-content.ts';
import {
  getReferenceCard,
  listReferenceCards,
  sortReferenceCards,
} from './selectors.ts';

const FIXTURES: ReferenceCardRecord[] = [
  { contentId: 'ref-b', topic: 'Глаголы', title: 'B card', body: 'beta' },
  { contentId: 'ref-a', topic: 'Артикли', title: 'A card', body: 'alpha' },
];

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});

afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('sortReferenceCards', () => {
  it('orders by topic, then title, then contentId (deterministic)', () => {
    const sorted = sortReferenceCards(FIXTURES);
    expect(sorted.map((c) => c.contentId)).toEqual(['ref-a', 'ref-b']);
  });
});

describe('listReferenceCards', () => {
  it('returns the stored cards in stable display order', async () => {
    await db.referenceCards.bulkPut(FIXTURES);
    const cards = await listReferenceCards(db);
    expect(cards.map((c) => c.contentId)).toEqual(['ref-a', 'ref-b']);
  });

  it('returns an empty list when the content store is empty (no crash)', async () => {
    const cards = await listReferenceCards(db);
    expect(cards).toEqual([]);
  });

  it('lists ≥6 reference cards from the real authored bundle', async () => {
    const { referenceCards } = buildContent();
    expect(referenceCards.length).toBeGreaterThanOrEqual(6);
    await db.referenceCards.bulkPut(referenceCards);
    const cards = await listReferenceCards(db);
    expect(cards.length).toBe(referenceCards.length);
    // Every card carries a stable deep-link anchor (its contentId).
    for (const card of cards) {
      expect(card.contentId.length).toBeGreaterThan(0);
    }
    // WP-B topic coverage: prepositions, articles+gender, ser/estar, verbs.
    const ids = cards.map((c) => c.contentId);
    expect(ids).toContain('ref-genero-artigo');
    expect(ids).toContain('ref-ser-estar');
    expect(ids).toContain('ref-verbos-presente');
    expect(ids.some((id) => id.startsWith('ref-prep-'))).toBe(true);
  });
});

describe('getReferenceCard', () => {
  it('returns the matching card by its deep-link anchor (contentId)', async () => {
    await db.referenceCards.bulkPut(FIXTURES);
    const card = await getReferenceCard(db, 'ref-a');
    expect(card?.title).toBe('A card');
  });

  it('returns null for an unknown contentId (not-found, not a crash)', async () => {
    await db.referenceCards.bulkPut(FIXTURES);
    const card = await getReferenceCard(db, 'does-not-exist');
    expect(card).toBeNull();
  });
});
