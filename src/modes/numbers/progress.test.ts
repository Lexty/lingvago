import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/index.ts';
import { generateSession } from './session.ts';
import {
  NUMBERS_GENERATOR_CLASS,
  NUMBERS_LEVEL,
  NUMBERS_MODE_ID,
  readNumbersMastery,
  recordNumbersAttempt,
  subskillFor,
} from './progress.ts';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});

afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

const [cardinalItem] = generateSession('p-card', { count: 1, ordinalShare: 0 });
const [ordinalItem] = generateSession('p-ord', { count: 1, ordinalShare: 1 });

describe('recordNumbersAttempt — writes attempts (AC6, §13.1)', () => {
  it('persists a production attempt with the required fields incl. level', async () => {
    await recordNumbersAttempt({
      sessionId: 'sess-1',
      item: cardinalItem,
      userAnswer: cardinalItem.expected,
      correct: true,
      responseMs: 1200,
    });

    const rows = await db.attempts.where('skill').equals('numbers').toArray();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.modeId).toBe(NUMBERS_MODE_ID);
    expect(row.channel).toBe('production');
    // Plan-review note 1: `level` is REQUIRED and must be set.
    expect(row.level).toBe(NUMBERS_LEVEL);
    expect(row.level).toBeTruthy();
    expect(row.generatorClass).toBe(NUMBERS_GENERATOR_CLASS);
    expect(row.subskill).toBe('numbers-cardinal');
    expect(row.taskId).toBe(cardinalItem.id);
    expect(row.correctAnswer).toBe(cardinalItem.expected);
    expect(row.correct).toBe(true);
    expect(row.responseMs).toBe(1200);
    expect(row.ts).toBeInstanceOf(Date);
  });

  it('queries attempts by sessionId (compound index)', async () => {
    await recordNumbersAttempt({
      sessionId: 'sess-2',
      item: cardinalItem,
      userAnswer: 'wrong',
      correct: false,
    });
    const count = await db.attempts.where('sessionId').equals('sess-2').count();
    expect(count).toBe(1);
  });
});

describe('skillMastery roll-up (AC6 simple share-correct)', () => {
  it('folds correct/incorrect into a running per-subskill share', async () => {
    await recordNumbersAttempt({
      sessionId: 's',
      item: cardinalItem,
      userAnswer: cardinalItem.expected,
      correct: true,
    });
    await recordNumbersAttempt({
      sessionId: 's',
      item: cardinalItem,
      userAnswer: 'x',
      correct: false,
    });

    const m = await readNumbersMastery('cardinal');
    expect(m.attempts).toBe(2);
    expect(m.mastery).toBeCloseTo(0.5, 5);

    const row = await db.skillMastery.get('numbers:numbers-cardinal');
    expect(row?.skillId).toBe('numbers');
    expect(row?.subskillId).toBe('numbers-cardinal');
  });

  it('keeps cardinal and ordinal subskills independent', async () => {
    await recordNumbersAttempt({
      sessionId: 's',
      item: ordinalItem,
      userAnswer: ordinalItem.expected,
      correct: true,
    });
    const ord = await readNumbersMastery('ordinal');
    const card = await readNumbersMastery('cardinal');
    expect(ord.attempts).toBe(1);
    expect(ord.mastery).toBe(1);
    expect(card.attempts).toBe(0);
    expect(card.mastery).toBe(0);
  });
});

describe('subskillFor', () => {
  it('maps numeral kind → mastery subskill', () => {
    expect(subskillFor('cardinal')).toBe('numbers-cardinal');
    expect(subskillFor('ordinal')).toBe('numbers-ordinal');
  });
});
