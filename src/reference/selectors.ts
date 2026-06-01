// Read-only selectors over the §7.1 `referenceCards` content store (WP-B).
//
// The Reference screen renders STATIC reference cards loaded by the T6 content
// loader; this module is the only place that reads them, so the screen never
// touches Dexie directly and never mutates content. Cards come from IndexedDB
// (precached/offline) — no network. Ordering is stabilized here so the list and
// deep-links are deterministic regardless of IndexedDB key-iteration order.

import type { Lingvago2Db } from '../db/index.ts';
import type { ReferenceCardRecord } from '../db/schema.ts';

/** A reference card together with its deep-link anchor (its stable contentId). */
export type ReferenceCard = ReferenceCardRecord;

/**
 * Deterministic display order: group by `topic`, then by `title`, then by the
 * stable `contentId` as a final tiebreaker. Sorting in-memory (the content store
 * has only ~7 cards) keeps the list and `/reference/:id` anchors stable across
 * runs without adding a secondary IndexedDB index (read-only store; YAGNI).
 */
export function sortReferenceCards(cards: readonly ReferenceCard[]): ReferenceCard[] {
  return [...cards].sort((a, b) => {
    const byTopic = a.topic.localeCompare(b.topic, 'pt');
    if (byTopic !== 0) return byTopic;
    const byTitle = a.title.localeCompare(b.title, 'pt');
    if (byTitle !== 0) return byTitle;
    return a.contentId.localeCompare(b.contentId, 'en');
  });
}

/** Load all reference cards from the content store, in stable display order. */
export async function listReferenceCards(db: Lingvago2Db): Promise<ReferenceCard[]> {
  const cards = await db.referenceCards.toArray();
  return sortReferenceCards(cards);
}

/**
 * Load a single reference card by its `contentId` (the deep-link anchor), or
 * `null` when no such card exists (unknown `/reference/:id` → not-found, not a
 * crash).
 */
export async function getReferenceCard(
  db: Lingvago2Db,
  contentId: string,
): Promise<ReferenceCard | null> {
  const card = await db.referenceCards.get(contentId);
  return card ?? null;
}
