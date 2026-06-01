// Shared test fixtures for the telemetry export/restore suites: seed every
// §7.2 progress store with Date-bearing records so round-trip / rehydration is
// exercised across all stores.

import type { Lingvago2Db } from '../db/index.ts';
import { newCard, toCardStateRecord } from '../db/fsrs.ts';
import { PROGRESS_STORES } from './bundle.ts';

/** Fixed injected export timestamp — keeps the bundle deterministic. */
export const EXPORTED_AT = new Date('2026-05-31T12:34:56.000Z');

/**
 * Clear every §7.2 progress store. Derived from the canonical PROGRESS_STORES
 * list so the test helper can't drift from the production store set (SM003).
 */
export async function clearProgress(db: Lingvago2Db): Promise<void> {
  await Promise.all(PROGRESS_STORES.map((store) => db[store].clear()));
}

const NOW = new Date('2026-05-30T09:00:00.000Z');

export interface SeedOptions {
  /** Seed the `app` settings row with a userAlias (default true). */
  withAlias?: boolean;
}

/**
 * Seed all seven progress stores with representative records. Includes Dexie-
 * indexed Date fields (`cardStates.due`, `attempts.ts`, `sessions.startedAt`,
 * `annotations.ts`) and nested FSRS card snapshots so restore rehydration is
 * fully covered.
 */
export async function seedProgress(db: Lingvago2Db, opts: SeedOptions = {}): Promise<void> {
  const cardA = newCard(NOW);
  const card = toCardStateRecord('word:casa:recognition', cardA, NOW);

  await db.cardStates.bulkPut([card]);

  await db.skillMastery.bulkPut([
    {
      id: 'nouns:gender',
      skillId: 'nouns',
      subskillId: 'gender',
      mastery: 0.42,
      attempts: 3,
      updatedAt: NOW,
    },
  ]);

  await db.attempts.bulkPut([
    {
      sessionId: 'sess-1',
      ts: new Date('2026-05-30T09:05:00.000Z'),
      modeId: 'drill',
      skill: 'nouns',
      subskill: 'gender',
      level: 'A1',
      channel: 'recognition',
      taskId: 'task-1',
      userAnswer: 'a',
      correctAnswer: 'a',
      correct: true,
      responseMs: 1200,
      fsrsBefore: newCard(NOW),
      fsrsAfter: cardA,
      masteryBefore: 0.4,
      masteryAfter: 0.42,
    },
  ]);

  await db.sessions.bulkPut([
    {
      id: 'sess-1',
      startedAt: new Date('2026-05-30T09:00:00.000Z'),
      endedAt: new Date('2026-05-30T09:10:00.000Z'),
      durationMs: 600000,
      accuracy: 1,
    },
  ]);

  await db.annotations.bulkPut([
    {
      ts: new Date('2026-05-30T09:06:00.000Z'),
      targetType: 'item',
      targetId: 'word:casa',
      note: 'tricky gender',
    },
  ]);

  await db.orphanedProgress.bulkPut([
    {
      store: 'cardStates',
      originalId: 'word:old:recognition',
      payload: toCardStateRecord('word:old:recognition', newCard(NOW), NOW),
      removedAtVersion: 6,
      archivedAt: new Date('2026-05-29T00:00:00.000Z'),
    },
  ]);

  if (opts.withAlias !== false) {
    await db.settings.bulkPut([{ key: 'app', userAlias: 'tester', value: { theme: 'dark' } }]);
  }
}
