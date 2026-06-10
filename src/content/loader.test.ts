import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/index.ts';
import { createEmptyCard, toCardStateRecord } from '../db/fsrs.ts';
import type { SkillMasteryRecord } from '../db/schema.ts';
import {
  getLoadedContentVersion,
  loadContentIntoDb,
  remapProgressId,
} from './loader.ts';
import type { ContentBundle } from './types.ts';

function bundle(version: number): ContentBundle {
  return {
    contentVersion: version,
    referenceCards: [{ contentId: 'ref-a', topic: 'T', title: 'A', body: 'b' }],
    verbs: [
      {
        contentId: 'verb:ser',
        infinitive: 'ser',
        group: '-er',
        reflexive: false,
        regular: false,
        hasTable: true,
        needsTableReview: false,
      },
    ],
    nouns: [{ contentId: 'noun:casa', lemma: 'casa', gender: 'f', article: 'a', en: 'house' }],
    prepositions: [
      { contentId: 'prep:tempo:0000', category: 'tempo', prep: 'a', use: 'horas', examples: [] },
    ],
    conjugationTables: [
      {
        contentId: 'conj:ser:presente',
        infinitive: 'ser',
        tense: 'presente',
        group: '-er',
        regular: false,
        forms: {
          eu: 'sou',
          tu: 'és',
          voce_ele_ela: 'é',
          nos: 'somos',
          voces_eles_elas: 'são',
        },
      },
    ],
    possessives: [
      {
        contentId: 'poss:0001',
        blankSentence: 'A ___ caneta é preta.',
        answer: 'minha',
        person: 'eu',
        kind: 'determiner',
        possessedGender: 'f',
        possessedNumber: 'sg',
        hasArticle: true,
      },
    ],
    possessiveContext: [
      {
        contentId: 'ctx0001',
        dialogue: '— Comprei este casaco ontem.\n— Que bonito! Então é ___?',
        answer: 'teu',
        person: 'tu',
        kind: 'determiner',
        ownerCue: 'tu',
        possessedGender: 'm',
        possessedNumber: 'sg',
        possessedNoun: 'casaco',
      },
    ],
    interrogatives: [
      {
        contentId: 'int:0001',
        blankSentence: 'Olá! ___ te chamas?',
        answer: 'como',
        category: 'how',
        gloss_ru: 'как',
        gloss_en: 'how',
        source: 'livro_unit01',
        sourceLine: 39,
      },
    ],
  };
}

/** Seed a cardState whose id embeds a contentId segment. */
async function seedCard(id: string): Promise<void> {
  await db.cardStates.put(toCardStateRecord(id, createEmptyCard(new Date('2026-01-01T00:00:00Z'))));
}

async function seedMastery(id: string): Promise<void> {
  const rec: SkillMasteryRecord = {
    id,
    skillId: id.split(':')[0] ?? id,
    mastery: 0.5,
    attempts: 3,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
  await db.skillMastery.put(rec);
}

describe('content loader — version-gated load (AC3, AC6 b/c)', () => {
  beforeEach(async () => {
    await db.open();
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('first run loads content and records the version (AC6b)', async () => {
    expect(await getLoadedContentVersion(db)).toBeNull();

    const result = await loadContentIntoDb(db, bundle(1));
    expect(result.loaded).toBe(true);
    expect(result.previousVersion).toBeNull();
    expect(result.contentVersion).toBe(1);

    expect(await db.referenceCards.count()).toBe(1);
    expect(await db.verbs.get('verb:ser')).toMatchObject({ infinitive: 'ser' });
    expect(await db.nouns.get('noun:casa')).toMatchObject({ gender: 'f' });
    expect(await db.prepositions.count()).toBe(1);
    // Conjugation-tables content store loads (read-only, contract T8 Task 1).
    expect(await db.conjugationTables.count()).toBe(1);
    expect(await db.conjugationTables.get('conj:ser:presente')).toMatchObject({
      infinitive: 'ser',
      tense: 'presente',
      forms: { eu: 'sou', voces_eles_elas: 'são' },
    });
    // Possessives content store loads (read-only, contract Task 1 / AC1).
    expect(await db.possessives.count()).toBe(1);
    expect(await db.possessives.get('poss:0001')).toMatchObject({
      answer: 'minha',
      kind: 'determiner',
      person: 'eu',
      possessedGender: 'f',
      possessedNumber: 'sg',
    });
    // Interrogatives content store loads (read-only, contract Task 1 / AC1).
    expect(await db.interrogatives.count()).toBe(1);
    expect(await db.interrogatives.get('int:0001')).toMatchObject({
      answer: 'como',
      category: 'how',
      gloss_ru: 'как',
      gloss_en: 'how',
    });
    // PossessiveContext content store loads (read-only, contract Task 1 / AC1).
    expect(await db.possessiveContext.count()).toBe(1);
    expect(await db.possessiveContext.get('ctx0001')).toMatchObject({
      answer: 'teu',
      kind: 'determiner',
      person: 'tu',
      possessedGender: 'm',
      possessedNumber: 'sg',
      possessedNoun: 'casaco',
    });
    expect(await getLoadedContentVersion(db)).toBe(1);
  });

  it('same contentVersion is a no-op — does not reload (AC6c)', async () => {
    await loadContentIntoDb(db, bundle(1));
    // Mutate a content store, then reload SAME version: must NOT be overwritten.
    await db.verbs.put({
      contentId: 'verb:ser',
      infinitive: 'MUTATED',
      group: '',
      reflexive: false,
      regular: false,
      hasTable: false,
      needsTableReview: false,
    });

    const result = await loadContentIntoDb(db, bundle(1));
    expect(result.loaded).toBe(false);
    expect(await db.verbs.get('verb:ser')).toMatchObject({ infinitive: 'MUTATED' });
  });

  it('a different version replaces content (read-only stores refreshed)', async () => {
    await loadContentIntoDb(db, bundle(1));
    const v2 = bundle(2);
    v2.verbs = [
      {
        contentId: 'verb:estar',
        infinitive: 'estar',
        group: '-ar',
        reflexive: false,
        regular: false,
        hasTable: true,
        needsTableReview: false,
      },
    ];
    const result = await loadContentIntoDb(db, v2);
    expect(result.loaded).toBe(true);
    expect(result.previousVersion).toBe(1);
    // Old verb gone, new verb present (full replace of read-only content).
    expect(await db.verbs.get('verb:ser')).toBeUndefined();
    expect(await db.verbs.get('verb:estar')).toMatchObject({ infinitive: 'estar' });
  });

  it('refuses a DOWNGRADE: older bundle does not replace newer content (Q004)', async () => {
    // Load v2, then try to (re)load the older v1 — e.g. an SW serving a stale
    // precache. The newer content + version must be kept; no reconcile runs.
    await loadContentIntoDb(db, bundle(2));
    await seedCard('card:verb:ser:recognition');

    const result = await loadContentIntoDb(db, bundle(1), { 'verb:ser': 'removed' });
    expect(result.loaded).toBe(false);
    expect(result.skippedDowngrade).toBe(true);
    expect(result.contentVersion).toBe(2);
    expect(result.archived).toBe(0);

    // Newer version stays loaded; the alias-driven removal did NOT run backwards.
    expect(await getLoadedContentVersion(db)).toBe(2);
    expect(await db.cardStates.get('card:verb:ser:recognition')).toBeDefined();
    expect(await db.orphanedProgress.count()).toBe(0);
  });
});

describe('content loader — version-bump preserves §7.2 progress (AC6d)', () => {
  beforeEach(async () => {
    await db.open();
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('progress survives a content version-bump untouched', async () => {
    await loadContentIntoDb(db, bundle(1));
    await seedCard('card:verb:ser:recognition');
    await db.settings.put({ key: 'app', userAlias: 'alex' });
    await db.attempts.add({
      sessionId: 's1',
      ts: new Date(),
      modeId: 'm',
      skill: 'verb',
      level: 'A1',
      channel: 'recognition',
      taskId: 't',
      userAnswer: 'a',
      correctAnswer: 'a',
      correct: true,
    });

    // No aliases → progress is left exactly as-is across the bump.
    await loadContentIntoDb(db, bundle(2));

    expect(await db.cardStates.get('card:verb:ser:recognition')).toBeDefined();
    expect((await db.settings.get('app'))?.userAlias).toBe('alex');
    expect(await db.attempts.count()).toBe(1);
  });
});

describe('content loader — alias migration (AC4, AC6e)', () => {
  beforeEach(async () => {
    await db.open();
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('rename alias re-keys progress to the new contentId', async () => {
    await loadContentIntoDb(db, bundle(1));
    await seedCard('card:verb:ser:recognition');
    await seedMastery('verb:ser');

    const result = await loadContentIntoDb(db, bundle(2), { 'verb:ser': 'verb:serr' });
    expect(result.renamed).toBe(2);
    expect(result.archived).toBe(0);

    // Old keys removed, progress moved to the renamed contentId.
    expect(await db.cardStates.get('card:verb:ser:recognition')).toBeUndefined();
    expect(await db.cardStates.get('card:verb:serr:recognition')).toBeDefined();
    expect(await db.skillMastery.get('verb:ser')).toBeUndefined();
    expect(await db.skillMastery.get('verb:serr')).toMatchObject({ mastery: 0.5 });
    expect(await db.orphanedProgress.count()).toBe(0);
  });

  it('rename onto an OCCUPIED target archives the displaced record (no silent loss)', async () => {
    // verb:ser already has its own mastery; verb:estar renames ONTO verb:ser.
    // The pre-existing verb:ser mastery must not be silently clobbered.
    await loadContentIntoDb(db, bundle(1));
    await seedMastery('verb:ser'); // untouched occupant of the rename target
    await seedMastery('verb:estar'); // will be renamed onto verb:ser

    // Make both skill ids distinguishable so we can prove which one survives.
    await db.skillMastery.update('verb:ser', { mastery: 0.11 });
    await db.skillMastery.update('verb:estar', { mastery: 0.99 });

    const result = await loadContentIntoDb(db, bundle(2), { 'verb:estar': 'verb:ser' });
    expect(result.renamed).toBe(1);
    expect(result.archived).toBe(1);

    // The renamed record now occupies verb:ser; the displaced original is gone
    // from the live store but ARCHIVED (recoverable) — nothing silently lost.
    expect(await db.skillMastery.get('verb:ser')).toMatchObject({ mastery: 0.99 });
    expect(await db.skillMastery.get('verb:estar')).toBeUndefined();
    const archived = await db.orphanedProgress.toArray();
    expect(archived).toHaveLength(1);
    expect(archived[0]).toMatchObject({
      store: 'skillMastery',
      originalId: 'verb:ser',
      removedAtVersion: 2,
    });
    expect(archived[0].payload).toMatchObject({ mastery: 0.11 });
  });

  it('two renames colliding on one target archive the loser (no silent loss)', async () => {
    await loadContentIntoDb(db, bundle(1));
    await seedMastery('verb:a');
    await seedMastery('verb:b');
    await db.skillMastery.update('verb:a', { mastery: 0.1 });
    await db.skillMastery.update('verb:b', { mastery: 0.2 });

    // Both old ids alias onto the SAME new id verb:merged.
    const result = await loadContentIntoDb(db, bundle(2), {
      'verb:a': 'verb:merged',
      'verb:b': 'verb:merged',
    });
    expect(result.renamed).toBe(2);
    expect(result.archived).toBe(1);

    // One winner lives at the merged id; both originals are gone; the loser is
    // archived (recoverable). Exactly one mastery survives + one archived.
    expect(await db.skillMastery.get('verb:a')).toBeUndefined();
    expect(await db.skillMastery.get('verb:b')).toBeUndefined();
    expect(await db.skillMastery.get('verb:merged')).toBeDefined();
    const archived = await db.orphanedProgress.toArray();
    expect(archived).toHaveLength(1);
    expect(archived[0]).toMatchObject({ store: 'skillMastery', removedAtVersion: 2 });
    // The surviving mastery + the archived mastery together cover both originals.
    const survivor = (await db.skillMastery.get('verb:merged'))?.mastery;
    const archivedMastery = (archived[0].payload as { mastery: number }).mastery;
    expect([survivor, archivedMastery].sort()).toEqual([0.1, 0.2]);
  });
});

describe('content loader — orphaned-progress archive (AC4, AC6f error case)', () => {
  beforeEach(async () => {
    await db.open();
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('removed contentId archives progress and does NOT throw', async () => {
    await loadContentIntoDb(db, bundle(1));
    await seedCard('card:verb:ser:recognition');
    await seedMastery('verb:ser');

    // The removal must not throw and must not silently drop progress.
    const result = await loadContentIntoDb(db, bundle(2), { 'verb:ser': 'removed' });
    expect(result.archived).toBe(2);
    expect(result.renamed).toBe(0);

    // Originals removed from the live progress stores...
    expect(await db.cardStates.get('card:verb:ser:recognition')).toBeUndefined();
    expect(await db.skillMastery.get('verb:ser')).toBeUndefined();
    // ...but ARCHIVED (recoverable), tagged with the removing version.
    const archived = await db.orphanedProgress.toArray();
    expect(archived).toHaveLength(2);
    expect(archived.every((a) => a.removedAtVersion === 2)).toBe(true);
    expect(archived.map((a) => a.store).sort()).toEqual(['cardStates', 'skillMastery']);
    // The live content load still succeeded.
    expect(await getLoadedContentVersion(db)).toBe(2);
  });

  it('an unrelated progress id is left untouched by an alias bump', async () => {
    await loadContentIntoDb(db, bundle(1));
    await seedCard('card:noun:casa:recognition');

    await loadContentIntoDb(db, bundle(2), { 'verb:ser': 'removed' });
    // The noun card is unaffected by the verb alias.
    expect(await db.cardStates.get('card:noun:casa:recognition')).toBeDefined();
    expect(await db.orphanedProgress.count()).toBe(0);
  });
});

describe('remapProgressId — segment-aware alias resolution (unit)', () => {
  it('renames a matching segment, returns null on removal, passes through misses', () => {
    expect(remapProgressId('card:verb:ser:recognition', { 'verb:ser': 'verb:serr' })).toBe(
      'card:verb:serr:recognition',
    );
    expect(remapProgressId('card:verb:ser:recognition', { 'verb:ser': 'removed' })).toBeNull();
    expect(remapProgressId('card:noun:casa:recognition', { 'verb:ser': 'removed' })).toBe(
      'card:noun:casa:recognition',
    );
    // Whole-id (single segment) rename also works.
    expect(remapProgressId('verb:ser', { 'verb:ser': 'verb:serr' })).toBe('verb:serr');
  });

  it('applies ALL matching alias entries, order-independently (Q002)', () => {
    // Two independent segments of one composite id are both aliased; BOTH must
    // be applied regardless of alias key insertion order.
    const aliasA = { 'verb:ser': 'verb:serr', recognition: 'review' };
    const aliasB = { recognition: 'review', 'verb:ser': 'verb:serr' };
    expect(remapProgressId('card:verb:ser:recognition', aliasA)).toBe('card:verb:serr:review');
    expect(remapProgressId('card:verb:ser:recognition', aliasB)).toBe('card:verb:serr:review');
  });

  it('a REMOVED match orphans even when another segment is renamed (Q002)', () => {
    // If any matching alias entry is `removed`, the whole record is orphaned.
    expect(
      remapProgressId('card:verb:ser:recognition', {
        'verb:ser': 'verb:serr',
        recognition: 'removed',
      }),
    ).toBeNull();
  });
});
