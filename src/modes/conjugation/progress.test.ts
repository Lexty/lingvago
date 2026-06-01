import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/index.ts';
import { generateSession } from './session.ts';
import { loadVerbData } from './fixtures.test-helper.ts';
import {
  CONJUGATION_LEVEL,
  CONJUGATION_SKILL,
  recordConjugationAttempt,
  subskillFor,
} from './progress.ts';

const SEED = 'progress-conj-seed';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});

afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('recordConjugationAttempt (§7.2 additive progress)', () => {
  it('writes an attempt with the required level/skill/channel axes', async () => {
    const [item] = generateSession(SEED, loadVerbData(), { count: 5 });
    await recordConjugationAttempt({
      sessionId: SEED,
      item,
      userAnswer: 'x',
      correct: true,
    });

    const rows = await db.attempts.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].skill).toBe(CONJUGATION_SKILL);
    expect(rows[0].channel).toBe('production');
    expect(rows[0].level).toBe(CONJUGATION_LEVEL);
    expect(rows[0].subskill).toBe(subskillFor(item));
    expect(rows[0].sourceRef).toBe(item.source.verbId);
  });

  it('folds correctness into a running per-subskill mastery roll-up', async () => {
    const items = generateSession(SEED, loadVerbData(), { count: 5 });
    // Pick two items sharing one subskill so the roll-up is over the same key.
    const a = items[0];
    const sub = subskillFor(a);
    const sameSub = items.find((it) => it !== a && subskillFor(it) === sub) ?? items[0];

    await recordConjugationAttempt({ sessionId: SEED, item: a, userAnswer: 'x', correct: true });
    const second = await recordConjugationAttempt({
      sessionId: SEED,
      item: sameSub,
      userAnswer: 'y',
      correct: false,
    });

    const row = await db.skillMastery.get(`${CONJUGATION_SKILL}:${sub}`);
    expect(row).toBeDefined();
    expect(row?.attempts).toBe(2);
    expect(row?.mastery).toBeCloseTo(0.5, 5);
    expect(second).toBeCloseTo(0.5, 5);
  });

  it('subskill mixes group and task type (AC8)', () => {
    const items = generateSession(SEED, loadVerbData(), { count: 20 });
    for (const item of items) {
      const sub = subskillFor(item);
      expect(sub.startsWith(`${CONJUGATION_SKILL}-`)).toBe(true);
      expect(sub.endsWith(item.type)).toBe(true);
    }
  });
});
