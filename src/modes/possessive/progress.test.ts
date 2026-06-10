import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/index.ts';
import type { PossessiveRecord } from '../../db/schema.ts';
import {
  POSS_REFERENCE_ID,
  POSS_SKILL,
  loadPossessivesFromDb,
  recordPossessiveAttempt,
  referenceIdFor,
  subskillFor,
} from './progress.ts';
import { generateSession } from './session.ts';

// A verified-eligible fixture spanning both families (determiner + dele) and
// several persons/genders, with single `___` blanks. It yields BOTH production
// and MC items across the L1→L3 walk for a pinned seed.
const RECORDS: PossessiveRecord[] = [
  det('poss:0001', 'A ___ caneta é preta.', 'minha', 'eu', 'f', 'sg'),
  det('poss:0002', 'O ___ carro é novo.', 'meu', 'eu', 'm', 'sg'),
  det('poss:0003', 'A ___ caneta é tua.', 'tua', 'tu', 'f', 'sg'),
  det('poss:0004', 'O ___ carro é teu.', 'teu', 'tu', 'm', 'sg'),
  det('poss:0005', 'A ___ casa é grande.', 'nossa', 'nos', 'f', 'sg'),
  dele('poss:0006', 'A Fátima não gosta da rua ___.', 'dela'),
  dele('poss:0007', 'O João perdeu o livro ___.', 'dele'),
];

function det(
  contentId: string,
  blankSentence: string,
  answer: string,
  person: string,
  possessedGender: string,
  possessedNumber: string,
): PossessiveRecord {
  return {
    contentId,
    blankSentence,
    answer,
    person,
    kind: 'determiner',
    possessedGender,
    possessedNumber,
    hasArticle: true,
  };
}

function dele(contentId: string, blankSentence: string, answer: string): PossessiveRecord {
  return {
    contentId,
    blankSentence,
    answer,
    person: 'ele_ela_voce',
    kind: 'dele',
    possessedGender: 'f',
    possessedNumber: 'sg',
    hasArticle: true,
  };
}

describe('subskillFor — mastery sub-axis by kind + person + level (AC7)', () => {
  it('keys each item by skill + kind + person + level', () => {
    for (const level of ['L1', 'L2', 'L3'] as const) {
      const items = generateSession('s', RECORDS, { count: 30, level });
      for (const item of items) {
        expect(subskillFor(item)).toBe(
          `${POSS_SKILL}-${item.kind}-${item.person}-${level}`,
        );
        expect(subskillFor(item).startsWith(`${POSS_SKILL}-`)).toBe(true);
      }
    }
  });

  it('distinguishes the determiner and dele sub-families', () => {
    const items = generateSession('fam', RECORDS, { count: 60, level: 'L1' });
    const kinds = new Set(items.map((i) => i.kind));
    expect(kinds).toEqual(new Set(['determiner', 'dele']));
  });
});

describe('referenceIdFor — feedback deep-link (AC6)', () => {
  it('always maps to the single ref-possessive card', () => {
    const items = generateSession('cards', RECORDS, { count: 40, level: 'L1' });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(referenceIdFor(item)).toBe('ref-possessive');
      expect(referenceIdFor(item)).toBe(POSS_REFERENCE_ID);
    }
  });
});

describe('recordPossessiveAttempt — additive §7.2 progress write', () => {
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
    const mastery = await recordPossessiveAttempt({
      sessionId: 'sess-1',
      item,
      userAnswer: item.drill.answer,
      correct: true,
      channel,
    });
    expect(mastery).toBe(1);

    expect(await db.attempts.count()).toBe(1);
    const row = (await db.attempts.toArray())[0];
    expect(row.skill).toBe(POSS_SKILL);
    expect(row.subskill).toBe(subskillFor(item));
    expect(row.level).toBe(item.level);
    expect(row.channel).toBe(channel);
    expect(row.correctAnswer).toBe(item.drill.answer);

    expect(await db.skillMastery.count()).toBe(1);
    const m = (await db.skillMastery.toArray())[0];
    expect(m.skillId).toBe(POSS_SKILL);
    expect(m.attempts).toBe(1);
  });
});

describe('loadPossessivesFromDb — read-only content source', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });

  it('returns [] before content is loaded (graceful empty state)', async () => {
    expect(await loadPossessivesFromDb()).toEqual([]);
  });

  it('returns the loaded possessive records', async () => {
    await db.possessives.bulkPut(RECORDS);
    const loaded = await loadPossessivesFromDb();
    expect(loaded.length).toBe(RECORDS.length);
    expect(loaded.map((r) => r.contentId).sort()).toEqual(
      RECORDS.map((r) => r.contentId).sort(),
    );
  });
});
