import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/index.ts';
import type { PrepositionRecord } from '../../db/schema.ts';
import {
  PREP_SKILL,
  recordPrepositionAttempt,
  referenceIdFor,
  subskillFor,
} from './progress.ts';
import { generateSession } from './session.ts';

const RECORDS: PrepositionRecord[] = [
  {
    contentId: 'prep:tempo:0001',
    category: 'tempo',
    prep: 'de',
    use: 'data',
    examples: ['De manhã apanho o metro.'],
  },
  {
    contentId: 'prep:movimento:0001',
    category: 'movimento',
    prep: 'a',
    use: 'destino',
    examples: ['Eu vou a Paris.'],
  },
  {
    contentId: 'prep:lugar:0001',
    category: 'lugar',
    prep: 'longe de',
    use: 'lugar',
    examples: ['Trabalho longe de Lisboa.'],
  },
];

describe('subskillFor — mastery sub-axis by category + level (AC mastery)', () => {
  it('keys each item by skill + category + level', () => {
    for (const level of ['L1', 'L2', 'L3'] as const) {
      const items = generateSession('s', RECORDS, { count: 30, level });
      for (const item of items) {
        expect(subskillFor(item)).toBe(`${PREP_SKILL}-${item.category}-${level}`);
        expect(subskillFor(item).startsWith(`${PREP_SKILL}-`)).toBe(true);
      }
    }
  });

  it('distinguishes the three category sub-skills', () => {
    const items = generateSession('cats', RECORDS, { count: 40, level: 'L1' });
    const subskills = new Set(items.map(subskillFor));
    expect(subskills).toEqual(
      new Set([
        `${PREP_SKILL}-tempo-L1`,
        `${PREP_SKILL}-movimento-L1`,
        `${PREP_SKILL}-lugar-L1`,
      ]),
    );
  });
});

describe('referenceIdFor — feedback deep-link by category (AC6)', () => {
  it('maps each category to its existing reference card id', () => {
    const items = generateSession('cats', RECORDS, { count: 40, level: 'L1' });
    const map = { tempo: 'ref-prep-tempo', lugar: 'ref-prep-lugar', movimento: 'ref-prep-a-para' };
    for (const item of items) {
      expect(referenceIdFor(item)).toBe(map[item.category]);
    }
    // All three targets are exercised by the fixture.
    expect(new Set(items.map(referenceIdFor))).toEqual(
      new Set(['ref-prep-tempo', 'ref-prep-lugar', 'ref-prep-a-para']),
    );
  });
});

describe('recordPrepositionAttempt — additive §7.2 progress write', () => {
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
    const mastery = await recordPrepositionAttempt({
      sessionId: 'sess-1',
      item,
      userAnswer: item.drill.answer,
      correct: true,
      channel,
    });
    expect(mastery).toBe(1);

    expect(await db.attempts.count()).toBe(1);
    const row = (await db.attempts.toArray())[0];
    expect(row.skill).toBe(PREP_SKILL);
    expect(row.subskill).toBe(subskillFor(item));
    expect(row.level).toBe(item.level);
    expect(row.channel).toBe(channel);
    expect(row.correctAnswer).toBe(item.drill.answer);

    expect(await db.skillMastery.count()).toBe(1);
    const m = (await db.skillMastery.toArray())[0];
    expect(m.skillId).toBe(PREP_SKILL);
    expect(m.attempts).toBe(1);
  });
});
