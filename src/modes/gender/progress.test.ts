import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/index.ts';
import type { NounRecord } from '../../db/schema.ts';
import { generateSession } from './session.ts';
import {
  GENDER_REFERENCE_ID,
  GENDER_SKILL,
  recordGenderAttempt,
  referenceIdFor,
  subskillFor,
} from './progress.ts';

const NOUNS: NounRecord[] = [
  { contentId: 'noun:amigo', lemma: 'amigo', gender: 'm', article: 'o', en: null },
  { contentId: 'noun:casa', lemma: 'casa', gender: 'f', article: 'a', en: null },
];

describe('subskillFor — mastery sub-axis by kind/level/contraction (AC mastery)', () => {
  it('keys definite/indefinite by kind + level', () => {
    const [def] = generateSession('s', NOUNS, { count: 1, level: 'L1' });
    expect(subskillFor(def)).toBe(`${GENDER_SKILL}-definite-L1`);

    const l2 = generateSession('s', NOUNS, { count: 20, level: 'L2' });
    const indef = l2.find((i) => i.kind === 'indefinite')!;
    expect(subskillFor(indef)).toBe(`${GENDER_SKILL}-indefinite-L2`);
  });

  it('keys contractions by kind + preposition + level', () => {
    const items = generateSession('s', NOUNS, { count: 30, level: 'L3' });
    for (const item of items) {
      expect(subskillFor(item)).toBe(`${GENDER_SKILL}-contraction-${item.prep}-L3`);
    }
  });

  it('every subskill is prefixed by the skill id', () => {
    for (const level of ['L1', 'L2', 'L3'] as const) {
      const items = generateSession('p', NOUNS, { count: 10, level });
      for (const item of items) {
        expect(subskillFor(item).startsWith(`${GENDER_SKILL}-`)).toBe(true);
      }
    }
  });
});

describe('referenceIdFor — feedback deep-link target (AC6)', () => {
  it('always maps the gender drill to the single existing gender/article card', () => {
    expect(referenceIdFor()).toBe('ref-genero-artigo');
    expect(referenceIdFor()).toBe(GENDER_REFERENCE_ID);
  });
});

describe('recordGenderAttempt — additive §7.2 progress write', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });

  it('writes one attempt + folds a skillMastery roll-up in a single round-trip', async () => {
    const [item] = generateSession('s', NOUNS, { count: 1, level: 'L1' });
    const channel = item.drill.mode === 'mc' ? 'recognition' : 'production';
    const mastery = await recordGenderAttempt({
      sessionId: 'sess-1',
      item,
      userAnswer: item.drill.answer,
      correct: true,
      channel,
    });
    expect(mastery).toBe(1);

    expect(await db.attempts.count()).toBe(1);
    const row = (await db.attempts.toArray())[0];
    expect(row.skill).toBe(GENDER_SKILL);
    expect(row.subskill).toBe(subskillFor(item));
    expect(row.level).toBe(item.level);
    expect(row.channel).toBe(channel);
    expect(row.correctAnswer).toBe(item.drill.answer);
    expect(row.correct).toBe(true);

    expect(await db.skillMastery.count()).toBe(1);
    const m = (await db.skillMastery.toArray())[0];
    expect(m.skillId).toBe(GENDER_SKILL);
    expect(m.attempts).toBe(1);
    expect(m.mastery).toBe(1);
  });

  it('aggregates running share-correct across two attempts of the same subskill', async () => {
    const [item] = generateSession('s', NOUNS, { count: 1, level: 'L1' });
    const channel = item.drill.mode === 'mc' ? 'recognition' : 'production';
    await recordGenderAttempt({ sessionId: 's', item, userAnswer: 'x', correct: true, channel });
    const m2 = await recordGenderAttempt({
      sessionId: 's',
      item,
      userAnswer: 'x',
      correct: false,
      channel,
    });
    expect(m2).toBe(0.5);
    expect(await db.attempts.count()).toBe(2);
    expect(await db.skillMastery.count()).toBe(1);
  });
});

describe('graceful handling of invalid input (error path)', () => {
  it('a malformed noun row does not crash generation — it is excluded', () => {
    const dirty = [
      ...NOUNS,
      { contentId: 'noun:x', lemma: 'x', gender: 'z', article: '', en: null } as unknown as NounRecord,
      null as unknown as NounRecord,
    ];
    expect(() => generateSession('dirty', dirty, { count: 20, level: 'L1' })).not.toThrow();
    const items = generateSession('dirty', dirty, { count: 20, level: 'L1' });
    expect(items.some((i) => i.drill.sourceRef.id === 'noun:x')).toBe(false);
    // only the two verified nouns can appear
    const ids = new Set(items.map((i) => i.drill.sourceRef.id));
    expect([...ids].every((id) => id === 'noun:amigo' || id === 'noun:casa')).toBe(true);
  });
});
