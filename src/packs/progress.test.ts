import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/index.ts';
import { findGroup, findPack } from './index.ts';
import { recordPackAttempt, recordPackSelfReport } from './progress.ts';

const pack = findPack('unit-19')!;
const group = findGroup(pack, 'indefinidos')!;
const exercise = group.exercises.find((e) => e.id === 'u19-in-04')!;
const base = { sessionId: 's', pack, group, exercise };

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((tb) => tb.clear()));
});
afterEach(async () => {
  await Promise.all(db.tables.map((tb) => tb.clear()));
});

const mastery = () => db.skillMastery.get('pack:unit-19:indefinidos');

describe('recordPackAttempt and help', () => {
  it('an answer given alone counts toward mastery', async () => {
    const id = await recordPackAttempt({ ...base, userAnswer: 'nada', outcome: 'correct' });
    const attempt = await db.attempts.get(id);
    expect(attempt?.correct).toBe(true);
    expect(attempt?.support).toBeUndefined();
    expect((await mastery())?.attempts).toBe(1);
  });

  it('an answer after the word meanings is logged with support and kept out of mastery', async () => {
    const id = await recordPackAttempt({ ...base, userAnswer: 'nada', outcome: 'correct', support: 'gloss' });
    expect((await db.attempts.get(id))?.support).toBe('gloss');
    expect(await mastery()).toBeUndefined();
  });

  it('«show the answer» is logged as viewed, never as a wrong answer counted in mastery', async () => {
    const id = await recordPackAttempt({ ...base, userAnswer: '', outcome: 'revealed' });
    const attempt = await db.attempts.get(id);
    expect(attempt?.support).toBe('answerShown');
    expect(attempt?.errorType).toBeUndefined();
    expect(await mastery()).toBeUndefined();
  });

  it('a self-report marks the wrong answer without making it correct', async () => {
    const id = await recordPackAttempt({ ...base, userAnswer: 'ninguém', outcome: 'wrong' });
    await recordPackSelfReport(id);
    const attempt = await db.attempts.get(id);
    expect(attempt?.selfReport).toBe('didNotUnderstand');
    expect(attempt?.correct).toBe(false);
    expect((await mastery())?.attempts).toBe(1);
  });
});
