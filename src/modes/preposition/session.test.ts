import { describe, expect, it } from 'vitest';
import type { PrepositionRecord } from '../../db/schema.ts';
import { buildCloze } from './blankRule.ts';
import { checkAnswer } from '../shared/check.ts';
import {
  DEFAULT_PREP_SESSION_CONFIG,
  generateSession,
  PREP_LEVELS,
  type PrepositionItem,
} from './session.ts';

/** A verified fixture spanning the three categories + parity-relevant shapes. */
const RECORDS: PrepositionRecord[] = [
  // length-2 single-word prep → parity-equal to a neighbouring contraction (MC)
  {
    contentId: 'prep:tempo:0001',
    category: 'tempo',
    prep: 'de',
    use: 'data',
    examples: ['De manhã apanho sempre o metro.'],
  },
  {
    contentId: 'prep:tempo:0002',
    category: 'tempo',
    prep: 'em',
    use: 'mês',
    examples: ['Estamos em maio.'],
  },
  // length-1 prep → no length-parity peer (production even at L3)
  {
    contentId: 'prep:movimento:0001',
    category: 'movimento',
    prep: 'a',
    use: 'destino',
    examples: ['Eu vou a Paris.'],
  },
  // length-4 prep → no parity peer (production)
  {
    contentId: 'prep:movimento:0002',
    category: 'movimento',
    prep: 'para',
    use: 'direção',
    examples: ['Eu vou para o Brasil.'],
  },
  // multi-word locução → no parity peer (production)
  {
    contentId: 'prep:lugar:0001',
    category: 'lugar',
    prep: 'longe de',
    use: 'lugar',
    examples: ['Trabalho longe de Lisboa.'],
  },
];

/** A record with NO unambiguous blank — must never seed an item (§6.5 / AC3). */
const EXCLUDED: PrepositionRecord = {
  contentId: 'prep:lugar:0099',
  category: 'lugar',
  prep: 'em frente de',
  use: 'lugar',
  examples: ['Na Rua … em frente da Faculdade.', 'É mesmo em frente da estação.'],
};

function byPrep(items: PrepositionItem[], prep: string): PrepositionItem[] {
  return items.filter((i) => i.prep === prep);
}

describe('generateSession — seeded determinism (§6.1 / AC seeded)', () => {
  it('same seed + same records + same config ⇒ byte-identical list', () => {
    const a = generateSession('p-7', RECORDS, { count: 12, level: 'L3' });
    const b = generateSession('p-7', RECORDS, { count: 12, level: 'L3' });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds generally diverge', () => {
    const a = generateSession('seed-a', RECORDS, { count: 12, level: 'L2' });
    const b = generateSession('seed-b', RECORDS, { count: 12, level: 'L2' });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('respects the requested count (clamped to ≥ 1)', () => {
    expect(generateSession(1, RECORDS, { count: 8 })).toHaveLength(8);
    expect(generateSession(1, RECORDS, { count: 0 })).toHaveLength(1);
  });

  it('defaults to a short L1 session', () => {
    const items = generateSession('def', RECORDS);
    expect(items).toHaveLength(DEFAULT_PREP_SESSION_CONFIG.count);
    expect(items.every((i) => i.level === 'L1')).toBe(true);
  });
});

describe('verified key from prepositions.prep via the AC3 blank rule (§6.5)', () => {
  it('every item answer IS the source record prep, and the prompt is its cloze', () => {
    const items = generateSession('keys', RECORDS, { count: 30, level: 'L1' });
    const byId = new Map(RECORDS.map((r) => [r.contentId, r]));
    for (const item of items) {
      const src = byId.get(item.drill.sourceRef.id);
      expect(src).toBeDefined();
      // the verified key is the prep — never guessed
      expect(item.drill.answer).toBe(src?.prep);
      expect(item.prep).toBe(src?.prep);
      expect(checkAnswer(item.drill.answer, src!.prep)).toBe(true);
      // the prompt is the chosen example with the single occurrence blanked
      const cloze = buildCloze(src!.prep, item.example)?.cloze;
      expect(item.drill.prompt).toBe(cloze);
      expect(item.drill.prompt).toContain('___');
    }
  });

  it('the §6.5 / AC3 gate keeps an unblankable record OUT of the session (QA gate)', () => {
    const items = generateSession('gate', [...RECORDS, EXCLUDED], { count: 60, level: 'L1' });
    expect(items.some((i) => i.drill.sourceRef.id === EXCLUDED.contentId)).toBe(false);
  });

  it('returns [] (graceful) when no record is verified-eligible', () => {
    expect(generateSession('empty', [EXCLUDED], { count: 5 })).toEqual([]);
    expect(generateSession('empty', [], { count: 5 })).toEqual([]);
  });
});

describe('§6.3 mode decision — neighbouring-contraction parity, else production', () => {
  it('L1 offers NO competitive distractor ⇒ every item is production', () => {
    const items = generateSession('l1', RECORDS, { count: 30, level: 'L1' });
    expect(items.every((i) => i.drill.mode === 'production')).toBe(true);
  });

  it('L2 length-2 prep (de/em) ⇒ MC with a neighbouring-contraction distractor', () => {
    const items = generateSession('l2', RECORDS, { count: 60, level: 'L2' });
    const de = byPrep(items, 'de');
    expect(de.length).toBeGreaterThan(0);
    for (const item of de) {
      expect(item.drill.mode).toBe('mc');
      if (item.drill.mode !== 'mc') throw new Error('expected mc');
      // exactly one correct, no duplicate-correct, all carry explanations
      const surfaces = item.drill.options.map((o) => o.surface);
      expect(new Set(surfaces).size).toBe(surfaces.length);
      expect(item.drill.options.filter((o) => o.correct)).toHaveLength(1);
      expect(item.drill.options.every((o) => o.explanation.length > 0)).toBe(true);
      // distractor is a neighbouring contraction, parity-equal (length-2)
      const distractor = item.drill.options.find((o) => !o.correct)!;
      expect(['da', 'na', 'no']).toContain(distractor.surface);
      expect(distractor.surface).not.toBe(item.drill.answer);
      expect(distractor.surface.length).toBe(item.drill.answer.length);
    }
  });

  it('L2 single-word `a` / `para` / `longe de` (no parity peer) ⇒ production', () => {
    const items = generateSession('l2b', RECORDS, { count: 80, level: 'L2' });
    for (const prep of ['a', 'para', 'longe de']) {
      const sub = byPrep(items, prep);
      expect(sub.length).toBeGreaterThan(0);
      expect(sub.every((i) => i.drill.mode === 'production')).toBe(true);
    }
  });

  it('L3 length-2 prep ⇒ MC with MULTIPLE neighbouring-contraction traps', () => {
    const items = generateSession('l3', RECORDS, { count: 80, level: 'L3' });
    const em = byPrep(items, 'em');
    expect(em.length).toBeGreaterThan(0);
    for (const item of em) {
      expect(item.drill.mode).toBe('mc');
      if (item.drill.mode !== 'mc') throw new Error('expected mc');
      // `em` is not itself a contraction, so all four da/de/na/no survive as
      // length-2 traps ⇒ 1 correct + 4 distractors = 5 options.
      expect(item.drill.options.length).toBe(5);
      expect(item.drill.options.filter((o) => o.correct)).toHaveLength(1);
      const distractors = item.drill.options.filter((o) => !o.correct).map((o) => o.surface);
      expect(new Set(distractors)).toEqual(new Set(['da', 'de', 'na', 'no']));
    }
  });

  it('L3 prep `de` excludes itself from the trap pool (no duplicate-correct)', () => {
    const items = generateSession('l3de', RECORDS, { count: 80, level: 'L3' });
    const de = byPrep(items, 'de');
    expect(de.length).toBeGreaterThan(0);
    for (const item of de) {
      expect(item.drill.mode).toBe('mc');
      if (item.drill.mode !== 'mc') throw new Error('expected mc');
      // `de` is removed from da/de/na/no ⇒ 1 correct + 3 distractors = 4 options
      expect(item.drill.options.length).toBe(4);
      const distractors = item.drill.options.filter((o) => !o.correct).map((o) => o.surface);
      expect(new Set(distractors)).toEqual(new Set(['da', 'na', 'no']));
      expect(distractors).not.toContain('de');
    }
  });
});

describe('category sub-skills + L1–L3 curve (§4.8) — deterministic', () => {
  it('declares exactly L1, L2, L3', () => {
    expect([...PREP_LEVELS]).toEqual(['L1', 'L2', 'L3']);
  });

  it('every item carries its source category and the requested level', () => {
    for (const level of PREP_LEVELS) {
      const items = generateSession('curve', RECORDS, { count: 20, level });
      const byId = new Map(RECORDS.map((r) => [r.contentId, r]));
      expect(items.every((i) => i.level === level)).toBe(true);
      for (const item of items) {
        expect(item.category).toBe(byId.get(item.drill.sourceRef.id)?.category);
      }
    }
  });

  it('covers all three categories across a long session', () => {
    const items = generateSession('cats', RECORDS, { count: 60, level: 'L1' });
    const cats = new Set(items.map((i) => i.category));
    expect(cats).toEqual(new Set(['tempo', 'movimento', 'lugar']));
  });

  it('the same prep at L1 (production) vs L3 (MC where parity) drills a harder channel', () => {
    const l1 = generateSession('de-only', [RECORDS[0]], { count: 1, level: 'L1' })[0];
    const l3 = generateSession('de-only', [RECORDS[0]], { count: 1, level: 'L3' })[0];
    expect(l1.drill.mode).toBe('production');
    expect(l3.drill.mode).toBe('mc');
  });
});

describe('graceful handling of invalid input (error path)', () => {
  it('a malformed record does not crash generation — it is excluded', () => {
    const dirty = [
      ...RECORDS,
      EXCLUDED,
      { contentId: 'prep:bad', category: 'bogus', prep: '', examples: null } as unknown as PrepositionRecord,
      null as unknown as PrepositionRecord,
    ];
    expect(() => generateSession('dirty', dirty, { count: 40, level: 'L2' })).not.toThrow();
    const items = generateSession('dirty', dirty, { count: 40, level: 'L2' });
    const ids = new Set(items.map((i) => i.drill.sourceRef.id));
    expect(ids.has('prep:bad')).toBe(false);
    expect(ids.has(EXCLUDED.contentId)).toBe(false);
    expect([...ids].every((id) => RECORDS.some((r) => r.contentId === id))).toBe(true);
  });
});
