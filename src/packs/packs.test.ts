import { describe, expect, it } from 'vitest';
import { buildContent } from '../../scripts/build-content.ts';
import {
  MIX_GROUP_ID,
  PACKS,
  acceptedAnswers,
  buildSession,
  checkExercise,
  findGroup,
  findPack,
  localized,
  normalizeAnswer,
} from './index.ts';
import type { PackExercise } from './index.ts';

const ex = (answer: string, accept?: string[]): PackExercise => ({
  id: 't',
  answer,
  accept,
  why: { ru: '', en: '' },
});

describe('checkExercise', () => {
  it('ignores case, spacing and the final full stop', () => {
    const e = ex('Lisboa é a maior cidade do país.');
    expect(checkExercise('lisboa é  a maior cidade do país', e)).toBe('correct');
    expect(checkExercise('  Lisboa é a maior cidade do país.  ', e)).toBe('correct');
  });

  it('tells a missing accent from a wrong answer', () => {
    const e = ex('Lisboa é a maior cidade do país.');
    // `e` for `é`, `pais` for `país`: the words are there, the accents are not.
    expect(checkExercise('Lisboa e a maior cidade do pais', e)).toBe('accent');
    expect(checkExercise('tao', ex('tão'))).toBe('accent');
    expect(checkExercise('como', ex('tão'))).toBe('wrong');
  });

  it('never forgives a missing function word', () => {
    const e = ex('Lisboa é a maior cidade do país.');
    expect(checkExercise('Lisboa é maior cidade do país', e)).toBe('wrong');
    expect(checkExercise('Lisboa é a maior cidade de país', e)).toBe('wrong');
  });

  it('accepts the variants found in the blind review of unit 18', () => {
    const find = (id: string) =>
      PACKS.flatMap((p) => p.groups.flatMap((g) => g.exercises)).find((e) => e.id === id)!;
    expect(checkExercise('quanto', find('u18-comp-04'))).toBe('correct');
    expect(checkExercise('o litoral', find('u18-geo-05'))).toBe('correct');
    expect(checkExercise('comprido', find('u18-opp-03'))).toBe('correct');
    expect(checkExercise('ruidoso', find('u18-opp-02'))).toBe('correct');
  });

  it('accepts every listed variant of the norm', () => {
    const e = ex('do que', ['que']);
    expect(checkExercise('do que', e)).toBe('correct');
    expect(checkExercise('que', e)).toBe('correct');
    expect(checkExercise('como', e)).toBe('wrong');
    expect(acceptedAnswers(e)).toEqual(['do que', 'que']);
  });

  it('treats an empty answer as wrong, never as a crash', () => {
    expect(checkExercise('', ex('mais'))).toBe('wrong');
    expect(checkExercise('   ', ex('mais'))).toBe('wrong');
  });

  it('normalizes composed and decomposed accents alike', () => {
    expect(normalizeAnswer('país')).toBe(normalizeAnswer('país'));
  });
});

describe('shipped packs — data integrity', () => {
  const cardIds = new Set(buildContent().referenceCards.map((c) => c.contentId));
  const groups = PACKS.flatMap((pack) => pack.groups.map((group) => ({ pack, group })));
  const exercises = groups.flatMap(({ group }) => group.exercises.map((e) => ({ group, e })));

  it('has unique pack, group and exercise ids', () => {
    expect(new Set(PACKS.map((p) => p.id)).size).toBe(PACKS.length);
    for (const pack of PACKS) {
      expect(new Set(pack.groups.map((g) => g.id)).size).toBe(pack.groups.length);
      expect(pack.groups.some((g) => g.id === MIX_GROUP_ID)).toBe(false);
    }
    const ids = exercises.map(({ e }) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every group is sourced, non-empty, and points at a real rule card', () => {
    for (const { group } of groups) {
      expect(group.exercises.length).toBeGreaterThan(0);
      expect(group.sources.length).toBeGreaterThan(0);
      expect(group.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const url of group.sources) {
        // A specific page, not a site's home page.
        expect(new URL(url).pathname.length).toBeGreaterThan(1);
      }
      if (group.ruleId !== undefined) {
        expect(cardIds.has(group.ruleId)).toBe(true);
      }
    }
  });

  it('every exercise has something to show, both explanations, and a self-consistent key', () => {
    for (const { group, e } of exercises) {
      expect(e.prompt ?? e.cue?.ru ?? '').not.toBe('');
      expect(e.why.ru).not.toBe('');
      expect(e.why.en).not.toBe('');
      // The model answer and every variant are themselves graded correct…
      for (const answer of acceptedAnswers(e)) {
        expect(checkExercise(answer, e)).toBe('correct');
      }
      // …and no variant duplicates another.
      const keys = acceptedAnswers(e).map(normalizeAnswer);
      expect(new Set(keys).size).toBe(keys.length);
      if (group.kind === 'cloze') {
        expect(e.prompt).toContain('___');
      }
      if (group.kind === 'build') {
        expect(e.prompt).toContain(' / ');
      }
    }
  });

  it('a build answer keeps the order of its cue words', () => {
    for (const { group, e } of exercises) {
      if (group.kind !== 'build') continue;
      // Each cue survives in order; the verbs to conjugate are the exception.
      const conjugated = new Set(['ser', 'ter de', 'precisar de', 'querer', 'custar']);
      const answer = normalizeAnswer(e.answer);
      let from = 0;
      for (const cue of (e.prompt ?? '').split(' / ')) {
        if (conjugated.has(cue)) continue;
        const at = answer.indexOf(cue.toLowerCase(), from);
        expect(at, `${e.id}: «${cue}» out of order in «${e.answer}»`).toBeGreaterThanOrEqual(from);
        from = at + cue.length;
      }
    }
  });
});

describe('sessions', () => {
  const pack = findPack('unit-18')!;

  it('a group session holds exactly that group, in a seeded order', () => {
    const group = findGroup(pack, 'comparisons')!;
    const a = buildSession(pack, 'comparisons', 's1');
    expect(a).toHaveLength(group.exercises.length);
    expect(a.every((entry) => entry.group.id === 'comparisons')).toBe(true);
    expect(buildSession(pack, 'comparisons', 's1')).toEqual(a);
    expect(buildSession(pack, 'comparisons', 's2').map((x) => x.exercise.id)).not.toEqual(
      a.map((x) => x.exercise.id),
    );
  });

  it('the mix holds every exercise of the pack and really interleaves the groups', () => {
    const mix = buildSession(pack, MIX_GROUP_ID, 's1');
    const total = pack.groups.reduce((n, g) => n + g.exercises.length, 0);
    expect(mix).toHaveLength(total);
    expect(new Set(mix.map((x) => x.exercise.id)).size).toBe(total);
    // Not group after group: the group changes far more often than (groups − 1) times.
    const switches = mix.filter((x, i) => i > 0 && x.group.id !== mix[i - 1].group.id).length;
    expect(switches).toBeGreaterThan(pack.groups.length * 2);
  });

  it('an unknown group or pack is empty, not a crash', () => {
    expect(buildSession(pack, 'nope', 's1')).toEqual([]);
    expect(findPack('nope')).toBeUndefined();
  });

  it('localized picks Russian for ru and English otherwise', () => {
    expect(localized({ ru: 'р', en: 'e' }, 'ru-RU')).toBe('р');
    expect(localized({ ru: 'р', en: 'e' }, 'en')).toBe('e');
    expect(localized({ ru: 'р', en: 'e' }, undefined)).toBe('e');
  });
});
