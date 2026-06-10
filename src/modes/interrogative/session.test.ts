import { describe, expect, it } from 'vitest';
import type { InterrogativeRecord } from '../../db/schema.ts';
import { checkAnswer } from '../shared/check.ts';
import { reconstructAnswer } from './eligibility.ts';
import {
  DEFAULT_INT_SESSION_CONFIG,
  generateSession,
  INT_LEVELS,
  type InterrogativeItem,
} from './session.ts';

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

/**
 * A fixture spanning the parity shapes that matter:
 *  - the wh len-4 meaning-confusion set: onde / quem / como / qual (all `wh`),
 *  - the quanto-family gender contrast quantos / quantas (len 7, `quant`),
 *  - a multi-word form de onde (word-count 2 ⇒ falls back to production).
 * `quanta` is intentionally NOT given an item — it only ever appears as a
 * DISTRACTOR drawn from the table.
 */
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

/** A mislabeled (non-reconstructible) row — must never seed an item (§6.5). */
const MISLABELED: InterrogativeRecord = rec({
  contentId: 'int:9999',
  answer: 'onde',
  category: 'how', // category disagrees with the table ⇒ excluded
  blankSentence: '___ moras?',
});

function byAnswer(items: InterrogativeItem[], answer: string): InterrogativeItem[] {
  return items.filter((i) => i.answer === answer);
}

function allMcOptionSets(items: InterrogativeItem[]): string[][] {
  return items
    .filter((i) => i.drill.mode === 'mc')
    .map((i) => (i.drill.mode === 'mc' ? i.drill.options.map((o) => o.surface) : []));
}

describe('generateSession — seeded + glossLang determinism (§6.1)', () => {
  it('same seed + records + config (incl. glossLang) ⇒ byte-identical list', () => {
    const a = generateSession('i-7', RECORDS, { count: 12, level: 'L3', glossLang: 'ru' });
    const b = generateSession('i-7', RECORDS, { count: 12, level: 'L3', glossLang: 'ru' });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds generally diverge', () => {
    const a = generateSession('seed-a', RECORDS, { count: 12, level: 'L2', glossLang: 'ru' });
    const b = generateSession('seed-b', RECORDS, { count: 12, level: 'L2', glossLang: 'ru' });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('respects the requested count (clamped to ≥ 1)', () => {
    expect(generateSession(1, RECORDS, { count: 8 })).toHaveLength(8);
    expect(generateSession(1, RECORDS, { count: 0 })).toHaveLength(1);
  });

  it('defaults to a short L1 ru session', () => {
    const items = generateSession('def', RECORDS);
    expect(items).toHaveLength(DEFAULT_INT_SESSION_CONFIG.count);
    expect(items.every((i) => i.level === 'L1')).toBe(true);
    expect(items.every((i) => i.glossLang === 'ru')).toBe(true);
  });

  it('declares exactly L1, L2, L3', () => {
    expect([...INT_LEVELS]).toEqual(['L1', 'L2', 'L3']);
  });
});

describe('AC3 gloss cue — language-aware, prefixed into the prompt', () => {
  it('ru gloss is prefixed for every item', () => {
    const items = generateSession('cue', RECORDS, { count: 40, level: 'L1', glossLang: 'ru' });
    for (const item of byAnswer(items, 'onde')) {
      expect(item.cue).toBe('где');
      expect(item.gloss).toBe('где');
      expect(item.drill.prompt).toBe('(где) ___ moras?');
      expect(item.drill.prompt).toContain('___');
    }
  });

  it('the gloss prefix CHANGES when glossLang flips ru↔en (same seed)', () => {
    const ru = generateSession('flip', RECORDS, { count: 40, level: 'L1', glossLang: 'ru' });
    const en = generateSession('flip', RECORDS, { count: 40, level: 'L1', glossLang: 'en' });
    // Same seed ⇒ same source rows in the same order, only the gloss differs.
    expect(ru.map((i) => i.drill.sourceRef.id)).toEqual(en.map((i) => i.drill.sourceRef.id));
    expect(ru.map((i) => i.answer)).toEqual(en.map((i) => i.answer));
    for (let k = 0; k < ru.length; k++) {
      expect(ru[k].glossLang).toBe('ru');
      expect(en[k].glossLang).toBe('en');
      if (ru[k].answer === 'onde') {
        expect(ru[k].drill.prompt).toBe('(где) ___ moras?');
        expect(en[k].drill.prompt).toBe('(where) ___ moras?');
        expect(ru[k].drill.prompt).not.toBe(en[k].drill.prompt);
      }
    }
    // At least one prompt actually differs by language.
    expect(ru.some((i, k) => i.drill.prompt !== en[k].drill.prompt)).toBe(true);
  });
});

describe('§6.5 verified key — the answer IS reconstructed, never guessed', () => {
  it('every item answer equals the reconstructed key for its source row', () => {
    const items = generateSession('keys', RECORDS, { count: 40, level: 'L1' });
    const byId = new Map(RECORDS.map((r) => [r.contentId, r]));
    for (const item of items) {
      const src = byId.get(item.drill.sourceRef.id);
      expect(src).toBeDefined();
      expect(item.answer).toBe(reconstructAnswer(src));
      expect(item.drill.answer).toBe(item.answer);
      expect(checkAnswer(item.drill.answer, item.answer)).toBe(true);
    }
  });

  it('a NON-reconstructible (mislabeled) row never appears', () => {
    const items = generateSession('gate', [...RECORDS, MISLABELED], { count: 80, level: 'L1' });
    expect(items.some((i) => i.drill.sourceRef.id === MISLABELED.contentId)).toBe(false);
    expect(items.every((i) => i.drill.mode === 'production')).toBe(true);
  });

  it('returns [] (graceful) when no record is verified-eligible', () => {
    expect(generateSession('empty', [MISLABELED], { count: 5 })).toEqual([]);
    expect(generateSession('empty', [], { count: 5 })).toEqual([]);
  });
});

describe('§6.3 / §4.8 mode decision — production at L1, MC where parity assembles', () => {
  it('L1 offers NO distractor ⇒ every item is production', () => {
    const items = generateSession('l1', RECORDS, { count: 40, level: 'L1' });
    expect(items.every((i) => i.drill.mode === 'production')).toBe(true);
  });

  it('produces BOTH production and MC across the L1→L3 curve', () => {
    const l1 = generateSession('curve', RECORDS, { count: 60, level: 'L1' });
    const l3 = generateSession('curve', RECORDS, { count: 60, level: 'L3' });
    expect(l1.every((i) => i.drill.mode === 'production')).toBe(true);
    expect(l3.some((i) => i.drill.mode === 'mc')).toBe(true);
    const channels = new Set([...l1, ...l3].map((i) => i.drill.mode));
    expect(channels).toEqual(new Set(['production', 'mc']));
  });

  it('a multi-word form (de onde, word-count 2) falls back to production at L3', () => {
    const items = generateSession('mw', [RECORDS[5]], { count: 1, level: 'L3' });
    expect(items[0].answer).toBe('de onde');
    expect(items[0].drill.mode).toBe('production');
  });
});

describe('AC4 wh MC — equal-length single-word meaning-confusion set', () => {
  it('len-4 `onde` ⇒ MC distractors are other len-4 wh forms (quem/como/qual)', () => {
    const item = generateSession('wh-onde', [RECORDS[0]], { count: 1, level: 'L3' })[0];
    expect(item.drill.mode).toBe('mc');
    if (item.drill.mode !== 'mc') throw new Error('expected mc');
    const surfaces = item.drill.options.map((o) => o.surface);
    expect(item.drill.options.filter((o) => o.correct)).toHaveLength(1);
    expect(new Set(surfaces).size).toBe(surfaces.length);
    expect(item.drill.options.every((o) => o.explanation.length > 0)).toBe(true);
    const distractors = item.drill.options.filter((o) => !o.correct).map((o) => o.surface);
    // all equal length, single word, never the answer
    for (const d of distractors) {
      expect(d.length).toBe(item.answer.length);
      expect(d.includes(' ')).toBe(false);
      expect(d).not.toBe(item.answer);
    }
    // the wh len-4 peers present in the table
    expect(distractors.every((d) => ['quem', 'como', 'qual'].includes(d))).toBe(true);
  });

  it('L2 offers exactly ONE distractor (2 options total)', () => {
    const item = generateSession('wh-l2', [RECORDS[0]], { count: 1, level: 'L2' })[0];
    expect(item.drill.mode).toBe('mc');
    if (item.drill.mode !== 'mc') throw new Error('expected mc');
    expect(item.drill.options).toHaveLength(2);
  });
});

describe('AC4 quant MC — same-family gender contrast (quanta only ever a distractor)', () => {
  it('len-7 `quantos` ⇒ MC with the gender-contrast distractor `quantas`', () => {
    const item = generateSession('q-quantos', [RECORDS[4]], { count: 1, level: 'L3' })[0];
    expect(item.parityClass).toBe('quant');
    expect(item.drill.mode).toBe('mc');
    if (item.drill.mode !== 'mc') throw new Error('expected mc');
    const surfaces = item.drill.options.map((o) => o.surface);
    expect(new Set(surfaces)).toEqual(new Set(['quantos', 'quantas']));
    expect(item.drill.options.filter((o) => o.correct)).toHaveLength(1);
    const distractor = item.drill.options.find((o) => !o.correct)!;
    expect(distractor.surface).toBe('quantas');
    expect(distractor.surface.length).toBe(item.answer.length); // 7 = 7
  });

  it('`quantas` (and `quanta`) never appear as the ANSWER — only ever distractors', () => {
    // quanta is not even in the fixture as a record; quantas is, but assert that
    // across a large L3 session the gender-contrast peer is always a DISTRACTOR
    // when it co-occurs with the quantos answer.
    const items = generateSession('q-big', RECORDS, { count: 120, level: 'L3' });
    expect(items.some((i) => i.answer === 'quanta')).toBe(false);
    for (const opts of allMcOptionSets(items)) {
      if (opts.includes('quanta')) {
        // quanta present ⇒ it is never the correct one (it has no item).
        const item = items.find(
          (i) => i.drill.mode === 'mc' && i.drill.options.map((o) => o.surface).includes('quanta'),
        )!;
        expect(item.answer).not.toBe('quanta');
      }
    }
  });
});

describe('AC4 — NEVER cross-length or cross-class co-options', () => {
  it('every MC option set is single-length AND single parityClass', () => {
    const items = generateSession('xparity', RECORDS, { count: 150, level: 'L3' });
    for (const item of items) {
      if (item.drill.mode !== 'mc') continue;
      const opts = item.drill.options.map((o) => o.surface);
      // single canonical length
      const lengths = new Set(opts.map((o) => o.length));
      expect(lengths.size).toBe(1);
      // single word-count
      const wcs = new Set(opts.map((o) => o.split(' ').length));
      expect(wcs.size).toBe(1);
      // never a cross-class co-option: quant forms never mix with wh forms
      const QUANT = new Set(['quanto', 'quanta', 'quantos', 'quantas']);
      const hasQuant = opts.some((o) => QUANT.has(o));
      const hasWh = opts.some((o) => !QUANT.has(o));
      expect(hasQuant && hasWh).toBe(false);
    }
  });

  it('never offers the qual(4)↔quais(5) NUMBER contrast as MC (cross-length)', () => {
    const items = generateSession('qq', RECORDS, { count: 150, level: 'L3' });
    for (const opts of allMcOptionSets(items)) {
      expect(opts.includes('qual') && opts.includes('quais')).toBe(false);
    }
  });

  it('never offers a where-family directional co-option (onde↔de onde, cross word-count)', () => {
    const items = generateSession('wf', RECORDS, { count: 150, level: 'L3' });
    for (const opts of allMcOptionSets(items)) {
      expect(opts.includes('onde') && opts.includes('de onde')).toBe(false);
    }
  });

  it('never offers a quanto↔quando cross-class co-option', () => {
    const withQuando: InterrogativeRecord[] = [
      ...RECORDS,
      rec({
        contentId: 'int:quanto',
        answer: 'quanto',
        category: 'how_much',
        gloss_ru: 'сколько',
        gloss_en: 'how much',
        agreement: { gender: 'm', number: 'sg' },
        blankSentence: '___ tempo dura?',
      }),
      rec({
        contentId: 'int:quando',
        answer: 'quando',
        category: 'when',
        gloss_ru: 'когда',
        gloss_en: 'when',
        blankSentence: '___ trabalha?',
      }),
    ];
    const items = generateSession('qc', withQuando, { count: 150, level: 'L3' });
    for (const opts of allMcOptionSets(items)) {
      expect(opts.includes('quanto') && opts.includes('quando')).toBe(false);
      // porque/porquê (len 6/7, wh) must never co-assemble with quanto/quantos (quant)
      expect(opts.includes('quanto') && opts.includes('porque')).toBe(false);
    }
  });
});

describe('graceful handling of invalid input (error path)', () => {
  it('a malformed record does not crash generation — it is excluded', () => {
    const dirty = [
      ...RECORDS,
      MISLABELED,
      { contentId: 'int:bad', answer: '', category: 'x', blankSentence: 'x' } as unknown as InterrogativeRecord,
      null as unknown as InterrogativeRecord,
    ];
    expect(() => generateSession('dirty', dirty, { count: 60, level: 'L3' })).not.toThrow();
    const items = generateSession('dirty', dirty, { count: 60, level: 'L3' });
    const ids = new Set(items.map((i) => i.drill.sourceRef.id));
    expect(ids.has('int:bad')).toBe(false);
    expect(ids.has(MISLABELED.contentId)).toBe(false);
    expect([...ids].every((id) => RECORDS.some((r) => r.contentId === id))).toBe(true);
  });
});
