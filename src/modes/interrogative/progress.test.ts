import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/index.ts';
import type { InterrogativeRecord } from '../../db/schema.ts';
import {
  INT_REFERENCE_ID,
  INT_SKILL,
  loadInterrogativesFromDb,
  recordInterrogativeAttempt,
  referenceIdFor,
  subskillFor,
} from './progress.ts';
import { generateSession } from './session.ts';

function rec(over: Partial<InterrogativeRecord>): InterrogativeRecord {
  return {
    contentId: 'int:0000',
    blankSentence: '___ moras?',
    answer: 'onde',
    category: 'where',
    gloss_ru: 'где',
    gloss_en: 'where',
    source: 'test',
    sourceLine: 1,
    ...over,
  };
}

// A verified-eligible fixture spanning several categories (a wh meaning-confusion
// set + the quanto-family gender contrast + a multi-word form), with single `___`
// blanks. It yields BOTH production and MC items across the L1→L3 walk for a
// pinned seed.
const RECORDS: InterrogativeRecord[] = [
  rec({ contentId: 'int:onde', answer: 'onde', category: 'where', gloss_ru: 'где', gloss_en: 'where', blankSentence: '___ moras?' }),
  rec({ contentId: 'int:quem', answer: 'quem', category: 'who', gloss_ru: 'кто', gloss_en: 'who', blankSentence: '___ é ele?' }),
  rec({ contentId: 'int:como', answer: 'como', category: 'how', gloss_ru: 'как', gloss_en: 'how', blankSentence: '___ estás?' }),
  rec({
    contentId: 'int:qual',
    answer: 'qual',
    category: 'which',
    gloss_ru: 'какой',
    gloss_en: 'which',
    agreement: { number: 'sg' },
    blankSentence: '___ é a tua profissão?',
  }),
  rec({
    contentId: 'int:quantos',
    answer: 'quantos',
    category: 'how_much',
    gloss_ru: 'сколько',
    gloss_en: 'how many',
    agreement: { gender: 'm', number: 'pl', noun: 'anos' },
    blankSentence: '___ anos tens?',
  }),
  rec({
    contentId: 'int:deonde',
    answer: 'de onde',
    category: 'where_from',
    gloss_ru: 'откуда',
    gloss_en: 'where from',
    blankSentence: '___ és?',
  }),
];

describe('subskillFor — mastery sub-axis by category + level (AC7)', () => {
  it('keys each item by skill + category + level', () => {
    for (const level of ['L1', 'L2', 'L3'] as const) {
      const items = generateSession('s', RECORDS, { count: 30, level });
      for (const item of items) {
        expect(subskillFor(item)).toBe(`${INT_SKILL}-${item.category}-${level}`);
        expect(subskillFor(item).startsWith(`${INT_SKILL}-`)).toBe(true);
      }
    }
  });

  it('distinguishes the several semantic categories', () => {
    const items = generateSession('fam', RECORDS, { count: 120, level: 'L1' });
    const cats = new Set(items.map((i) => i.category));
    expect(cats.size).toBeGreaterThan(1);
  });
});

describe('referenceIdFor — feedback deep-link (AC6)', () => {
  it('always maps to the single ref-interrogative card', () => {
    const items = generateSession('cards', RECORDS, { count: 40, level: 'L1' });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(referenceIdFor(item)).toBe('ref-interrogative');
      expect(referenceIdFor(item)).toBe(INT_REFERENCE_ID);
    }
  });
});

describe('recordInterrogativeAttempt — additive §7.2 progress write', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });

  it('writes one attempt + folds a skillMastery roll-up in a single round-trip', async () => {
    const [item] = generateSession('s', RECORDS, { count: 1, level: 'L1' });
    const channel = item.drill.mode === 'mc' ? 'recognition' : 'production';
    const mastery = await recordInterrogativeAttempt({
      sessionId: 'sess-1',
      item,
      userAnswer: item.drill.answer,
      correct: true,
      channel,
    });
    expect(mastery).toBe(1);

    expect(await db.attempts.count()).toBe(1);
    const row = (await db.attempts.toArray())[0];
    expect(row.skill).toBe(INT_SKILL);
    expect(row.subskill).toBe(subskillFor(item));
    expect(row.level).toBe(item.level);
    expect(row.channel).toBe(channel);
    expect(row.correctAnswer).toBe(item.drill.answer);

    expect(await db.skillMastery.count()).toBe(1);
    const m = (await db.skillMastery.toArray())[0];
    expect(m.skillId).toBe(INT_SKILL);
    expect(m.attempts).toBe(1);
  });
});

describe('loadInterrogativesFromDb — read-only content source', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });

  it('returns [] before content is loaded (graceful empty state)', async () => {
    expect(await loadInterrogativesFromDb()).toEqual([]);
  });

  it('returns the loaded interrogative records', async () => {
    await db.interrogatives.bulkPut(RECORDS);
    const loaded = await loadInterrogativesFromDb();
    expect(loaded.length).toBe(RECORDS.length);
    expect(loaded.map((r) => r.contentId).sort()).toEqual(
      RECORDS.map((r) => r.contentId).sort(),
    );
  });
});
