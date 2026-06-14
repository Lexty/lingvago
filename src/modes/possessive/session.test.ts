import { describe, expect, it } from 'vitest';
import type { PossessiveContextRecord, PossessiveRecord } from '../../db/schema.ts';
import { checkAnswer } from '../shared/check.ts';
import { reconstructAnswer } from './eligibility.ts';
import { DELE_FORMS } from './possData.ts';
import {
  DEFAULT_POSS_SESSION_CONFIG,
  generateSession,
  POSS_LEVELS,
  type PossessiveItem,
} from './session.ts';

/**
 * A fixture spanning both families, both genders/numbers, and the parity-shapes
 * that matter: m/sg `meu`/`teu`/`seu` (all length 3 ⇒ parity-feasible peers),
 * f/sg `minha`/`nossa` (length 5), and the dele owner contrast `dele`/`dela`.
 */
const RECORDS: PossessiveRecord[] = [
  {
    contentId: 'poss:0001',
    blankSentence: 'A ___ caneta é preta.',
    answer: 'minha',
    person: 'eu',
    kind: 'determiner',
    possessedGender: 'f',
    possessedNumber: 'sg',
    hasArticle: true,
  },
  {
    contentId: 'poss:0002',
    blankSentence: 'O ___ carro é novo.',
    answer: 'meu',
    person: 'eu',
    kind: 'determiner',
    possessedGender: 'm',
    possessedNumber: 'sg',
    hasArticle: true,
  },
  {
    contentId: 'poss:0003',
    blankSentence: 'O ___ livro está aqui.',
    answer: 'teu',
    person: 'tu',
    kind: 'determiner',
    possessedGender: 'm',
    possessedNumber: 'sg',
    hasArticle: true,
  },
  {
    contentId: 'poss:0004',
    blankSentence: 'A ___ casa é grande.',
    answer: 'nossa',
    person: 'nos',
    kind: 'determiner',
    possessedGender: 'f',
    possessedNumber: 'sg',
    hasArticle: true,
  },
  {
    contentId: 'poss:0005',
    blankSentence: 'Os ___ amigos chegaram.',
    answer: 'meus',
    person: 'eu',
    kind: 'determiner',
    possessedGender: 'm',
    possessedNumber: 'pl',
    hasArticle: true,
  },
  {
    contentId: 'poss:0006',
    blankSentence: 'O carro ___ é azul.',
    answer: 'dele',
    person: 'ele_ela_voce',
    kind: 'dele',
    possessedGender: 'm',
    possessedNumber: 'sg',
    hasArticle: false,
  },
  {
    contentId: 'poss:0007',
    blankSentence: 'A casa ___ é grande.',
    answer: 'dela',
    person: 'ele_ela_voce',
    kind: 'dele',
    possessedGender: 'f',
    possessedNumber: 'sg',
    hasArticle: false,
  },
  {
    // The `vos` person (appended last so existing index-based RECORDS[n]
    // references are unaffected): the FORM is `vossa` (alive), but the
    // learner-facing person LABEL is `vocês` (`vós` the subject pronoun is
    // archaic in modern continental EP). f/sg so it is parity-feasible against
    // the other length-5 f/sg forms (minha/tua/nossa/…), giving us an MC item
    // whose explanations we can assert show «vocês», never «vos»/«vós».
    contentId: 'poss:0008',
    blankSentence: 'A ___ casa fica perto.',
    answer: 'vossa',
    person: 'vos',
    kind: 'determiner',
    possessedGender: 'f',
    possessedNumber: 'sg',
    hasArticle: true,
  },
];

/** The single appended `vos` record, addressed by content id (not index). */
const VOS_RECORD = RECORDS.find((r) => r.person === 'vos')!;

/** A mislabeled (non-reconstructible) row — must never seed an item (§6.5). */
const MISLABELED: PossessiveRecord = {
  contentId: 'poss:9999',
  blankSentence: 'O ___ carro.',
  answer: 'minha', // f/sg form on an m/sg label → not reconstructible
  person: 'eu',
  kind: 'determiner',
  possessedGender: 'm',
  possessedNumber: 'sg',
  hasArticle: true,
};

/**
 * A small HARD L3 context fixture: a two-turn dialogue with a single `___`
 * blank whose owner is inferred from the conversation (NOT a cue). One
 * determiner answer (`teu`) and one dele answer (`dela`) so both families are
 * exercised. The multi-line `\n` is part of the prompt the screen renders.
 */
const CONTEXT: PossessiveContextRecord[] = [
  {
    contentId: 'ctx0001',
    dialogue: '— Comprei este casaco ontem, custou pouco.\n— Que bonito! Então é ___?',
    answer: 'teu',
    person: 'tu',
    kind: 'determiner',
    ownerCue: 'tu',
    possessedGender: 'm',
    possessedNumber: 'sg',
    possessedNoun: 'casaco',
  },
  {
    contentId: 'ctx0002',
    dialogue: '— A irmã do João mora longe?\n— A casa ___ é em Faro.',
    answer: 'dela',
    person: 'ele_ela_voce',
    kind: 'dele',
    ownerCue: 'ela',
    possessedGender: 'f',
    possessedNumber: 'sg',
    possessedNoun: 'casa',
  },
];

function byAnswer(items: PossessiveItem[], answer: string): PossessiveItem[] {
  return items.filter((i) => i.answer === answer);
}

/** All MC option surfaces across the session (for cross-pair assertions). */
function allMcOptionSets(items: PossessiveItem[]): string[][] {
  return items
    .filter((i) => i.drill.mode === 'mc')
    .map((i) => (i.drill.mode === 'mc' ? i.drill.options.map((o) => o.surface) : []));
}

describe('generateSession — seeded determinism (§6.1)', () => {
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
    expect(items).toHaveLength(DEFAULT_POSS_SESSION_CONFIG.count);
    expect(items.every((i) => i.level === 'L1')).toBe(true);
  });

  it('declares exactly L1, L2, L3', () => {
    expect([...POSS_LEVELS]).toEqual(['L1', 'L2', 'L3']);
  });
});

describe('AC3 cue — well-determined prompt for every item', () => {
  it('determiner items carry the PERSON cue, prefixed into the prompt', () => {
    const items = generateSession('cue', RECORDS, { count: 60, level: 'L1' });
    const minhas = byAnswer(items, 'minha');
    expect(minhas.length).toBeGreaterThan(0);
    for (const item of minhas) {
      expect(item.kind).toBe('determiner');
      expect(item.cue).toBe('eu');
      expect(item.drill.prompt).toBe('(eu) A ___ caneta é preta.');
      expect(item.drill.prompt).toContain('___');
    }
  });

  it('dele items carry the OWNER cue (derived from the answer), prefixed in', () => {
    const items = generateSession('cue2', RECORDS, { count: 80, level: 'L1' });
    for (const item of byAnswer(items, 'dele')) {
      expect(item.kind).toBe('dele');
      expect(item.cue).toBe('ele');
      expect(item.drill.prompt.startsWith('(ele) ')).toBe(true);
    }
    for (const item of byAnswer(items, 'dela')) {
      expect(item.cue).toBe('ela');
      expect(item.drill.prompt.startsWith('(ela) ')).toBe(true);
    }
  });
});

describe('AC3 vós→vocês — the `vos` person is LABELLED `vocês` for the learner', () => {
  it('the `vos` cue renders `(vocês)`, never `(vós)`/`(vos)`; the FORM stays `vosso/vossa`', () => {
    const items = generateSession('vos-cue', [VOS_RECORD], { count: 1, level: 'L1' });
    const item = items[0];
    expect(item.person).toBe('vos'); // the DATA key is unchanged
    expect(item.cue).toBe('vocês'); // the LABEL the learner sees
    expect(item.answer).toBe('vossa'); // the FORM is unchanged
    expect(item.drill.prompt).toBe('(vocês) A ___ casa fica perto.');
    expect(item.drill.prompt).not.toContain('vós');
    expect(item.drill.prompt).not.toContain('(vos)');
  });

  it('the right-answer feedback for a `vos` item says «vocês», never «vos»/«vós»', () => {
    // L3 ⇒ MC item, so the correct option carries the answerExplanation text.
    const items = generateSession('vos-right', RECORDS, { count: 60, level: 'L3' });
    const mc = byAnswer(items, 'vossa').filter((i) => i.drill.mode === 'mc');
    expect(mc.length).toBeGreaterThan(0);
    for (const item of mc) {
      if (item.drill.mode !== 'mc') throw new Error('expected mc');
      const correct = item.drill.options.find((o) => o.correct)!;
      expect(correct.explanation).toContain('«vocês»');
      expect(correct.explanation).not.toContain('«vos»');
      expect(correct.explanation).not.toContain('«vós»');
    }
  });

  it('the wrong-person feedback that points AT a `vos` peer says «vocês», never «vos»/«vós»', () => {
    // A non-vos f/sg item (e.g. `minha`) at L3 offers `vossa` as a distractor;
    // its explanation names the `vos` person — assert it reads «vocês».
    const items = generateSession('vos-wrong', RECORDS, { count: 120, level: 'L3' });
    let sawVossaDistractor = false;
    for (const item of items) {
      if (item.drill.mode !== 'mc') continue;
      for (const opt of item.drill.options) {
        if (opt.correct) continue;
        if (opt.surface === 'vossa') {
          sawVossaDistractor = true;
          expect(opt.explanation).toContain('«vocês»');
          expect(opt.explanation).not.toContain('«vos»');
          expect(opt.explanation).not.toContain('«vós»');
        }
      }
    }
    expect(sawVossaDistractor).toBe(true);
  });

  it('REGRESSION: the OTHER persons keep their cue/feedback labels (você, nós)', () => {
    const items = generateSession('others', RECORDS, { count: 120, level: 'L3' });
    // `nossa` (nos) item ⇒ cue `nós`.
    for (const item of byAnswer(items, 'nossa')) {
      expect(item.cue).toBe('nós');
    }
    // A `seu`/`sua` determiner item (the `ele_ela_voce` person) now cues `você`,
    // matching the canon (você → seu/sua); the `ele·ela·você` lump is gone.
    for (const item of [...byAnswer(items, 'seu'), ...byAnswer(items, 'sua')]) {
      expect(item.kind).toBe('determiner');
      expect(item.cue).toBe('você');
    }
    // wherever a 3rd-person determiner is named in feedback it reads `você`.
    for (const item of items) {
      if (item.drill.mode !== 'mc') continue;
      for (const opt of item.drill.options) {
        // the underscore key must never leak into any explanation.
        expect(opt.explanation).not.toContain('ele_ela_voce');
        expect(opt.explanation).not.toContain('ele·ela·você');
        expect(opt.explanation).not.toContain('«vos»');
      }
    }
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

  it('a NON-reconstructible (mislabeled) row never appears as a production prompt', () => {
    const items = generateSession('gate', [...RECORDS, MISLABELED], { count: 80, level: 'L1' });
    expect(items.some((i) => i.drill.sourceRef.id === MISLABELED.contentId)).toBe(false);
    expect(items.every((i) => i.drill.mode === 'production')).toBe(true); // L1 ⇒ all production, all gradeable
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
    const l1 = generateSession('curve', RECORDS, { count: 40, level: 'L1' });
    const l3 = generateSession('curve', RECORDS, { count: 40, level: 'L3' });
    // L1 is pure production recall; L3 surfaces MC wherever a parity peer exists.
    expect(l1.every((i) => i.drill.mode === 'production')).toBe(true);
    expect(l3.some((i) => i.drill.mode === 'mc')).toBe(true);
    // Across the whole curve both channels are exercised (production at L1, MC at L3).
    const channels = new Set([...l1, ...l3].map((i) => i.drill.mode));
    expect(channels).toEqual(new Set(['production', 'mc']));
  });

  it('falls back to production when the single L2 candidate is parity-rejected (no degenerate MC)', () => {
    // `nosso` (m/sg, length 5). At L2 only ONE candidate is offered, and in
    // paradigm order that is `meu` (length 3) — parity-rejected (5 ≠ 3). With no
    // qualifying distractor the item degrades to PRODUCTION, never a 1-option MC.
    const nosso: PossessiveRecord = {
      contentId: 'poss:8001',
      blankSentence: 'O ___ jardim é bonito.',
      answer: 'nosso',
      person: 'nos',
      kind: 'determiner',
      possessedGender: 'm',
      possessedNumber: 'sg',
      hasArticle: true,
    };
    const l2 = generateSession('nosso-l2', [nosso], { count: 1, level: 'L2' })[0];
    expect(l2.drill.mode).toBe('production');
    // At L3 the FULL same-gender/number pool is offered; `vosso` (length 5) then
    // survives parity ⇒ MC with exactly the length-5 peer.
    const l3 = generateSession('nosso-l3', [nosso], { count: 1, level: 'L3' })[0];
    expect(l3.drill.mode).toBe('mc');
    if (l3.drill.mode === 'mc') {
      expect(l3.drill.options.map((o) => o.surface).sort()).toEqual(['nosso', 'vosso']);
    }
  });

  it('the same determiner at L1 (production) vs L3 (MC) drills a harder channel', () => {
    const l1 = generateSession('meu-only', [RECORDS[1]], { count: 1, level: 'L1' })[0];
    const l3 = generateSession('meu-only', [RECORDS[1]], { count: 1, level: 'L3' })[0];
    expect(l1.drill.mode).toBe('production');
    expect(l3.drill.mode).toBe('mc');
  });
});

describe('AC4 determiner MC — same gender+number, DIFFERENT person, parity-feasible', () => {
  it('m/sg `meu` ⇒ MC distractors are other m/sg length-3 forms (teu/seu), different person', () => {
    const items = generateSession('det-meu', [RECORDS[1]], { count: 1, level: 'L3' });
    const item = items[0];
    expect(item.drill.mode).toBe('mc');
    if (item.drill.mode !== 'mc') throw new Error('expected mc');
    const surfaces = item.drill.options.map((o) => o.surface);
    // exactly one correct, no duplicates
    expect(item.drill.options.filter((o) => o.correct)).toHaveLength(1);
    expect(new Set(surfaces).size).toBe(surfaces.length);
    expect(item.drill.options.every((o) => o.explanation.length > 0)).toBe(true);
    const distractors = item.drill.options.filter((o) => !o.correct).map((o) => o.surface);
    expect(new Set(distractors)).toEqual(new Set(['teu', 'seu']));
    // all parity-feasible: same length as the answer, never the answer itself
    for (const d of distractors) {
      expect(d.length).toBe(item.answer.length);
      expect(d).not.toBe(item.answer);
    }
  });

  it('NEVER offers a cross-gender co-option (minha↔meu) — different length, parity rejects', () => {
    const items = generateSession('xg', RECORDS, { count: 120, level: 'L3' });
    for (const opts of allMcOptionSets(items)) {
      const hasMinha = opts.includes('minha');
      const hasMeu = opts.includes('meu');
      expect(hasMinha && hasMeu).toBe(false);
      // no determiner option set mixes a length-5 f form with a length-3 m form
      const lengths = new Set(opts.map((o) => o.length));
      expect(lengths.size).toBe(1);
    }
  });

  it('NEVER offers a cross-family co-option (seu↔dele): determiner and dele never co-occur', () => {
    const items = generateSession('xf', RECORDS, { count: 120, level: 'L3' });
    for (const opts of allMcOptionSets(items)) {
      const hasDele = opts.some((o) => DELE_FORMS.includes(o));
      const hasDeterminer = opts.some((o) => !DELE_FORMS.includes(o));
      expect(hasDele && hasDeterminer).toBe(false);
    }
  });
});

describe('AC4 dele MC — the owner contrast dele↔dela (4=4)', () => {
  it('a `dele` item ⇒ MC with the single owner-contrast distractor `dela`', () => {
    const items = generateSession('dele', [RECORDS[5]], { count: 1, level: 'L3' });
    const item = items[0];
    expect(item.drill.mode).toBe('mc');
    if (item.drill.mode !== 'mc') throw new Error('expected mc');
    const surfaces = item.drill.options.map((o) => o.surface);
    expect(new Set(surfaces)).toEqual(new Set(['dele', 'dela']));
    expect(item.drill.options.filter((o) => o.correct)).toHaveLength(1);
    const distractor = item.drill.options.find((o) => !o.correct)!;
    expect(distractor.surface).toBe('dela');
    expect(distractor.surface.length).toBe(item.answer.length); // 4 = 4
  });

  it('a `dela` item ⇒ owner-contrast distractor is `dele`', () => {
    const items = generateSession('dela', [RECORDS[6]], { count: 1, level: 'L3' });
    const item = items[0];
    expect(item.drill.mode).toBe('mc');
    if (item.drill.mode !== 'mc') throw new Error('expected mc');
    const distractor = item.drill.options.find((o) => !o.correct)!;
    expect(distractor.surface).toBe('dele');
  });

  it('L2 offers exactly ONE distractor (1 correct + 1 distractor = 2 options)', () => {
    const items = generateSession('dele-l2', [RECORDS[5]], { count: 1, level: 'L2' });
    const item = items[0];
    expect(item.drill.mode).toBe('mc');
    if (item.drill.mode !== 'mc') throw new Error('expected mc');
    expect(item.drill.options).toHaveLength(2);
  });
});

describe('AC2/AC3 — HARD L3 context tier (dialogue prompt, no cue, production-only)', () => {
  it('L3 with a context pool yields context items: prompt === dialogue, NO cue prefix, production', () => {
    const items = generateSession('ctx-l3', RECORDS, {
      count: 20,
      level: 'L3',
      context: CONTEXT,
    });
    expect(items.length).toBe(20);
    const byId = new Map(CONTEXT.map((r) => [r.contentId, r]));
    for (const item of items) {
      // drawn from the context store, flagged as context
      expect(item.isContext).toBe(true);
      expect(item.drill.sourceRef.store).toBe('possessiveContext');
      const src = byId.get(item.drill.sourceRef.id);
      expect(src).toBeDefined();
      // AC3: the prompt is the multi-line dialogue EXACTLY — no cue token, no `(`.
      expect(item.drill.prompt).toBe(src!.dialogue);
      expect(item.cue).toBe('');
      expect(item.drill.prompt.startsWith('(')).toBe(false);
      expect(item.drill.prompt).not.toMatch(/^\([^)]*\)/);
      expect(item.drill.prompt).toContain('___');
      expect(item.drill.prompt).toContain('\n'); // multi-line dialogue
      // AC3: context items are production-only (never MC).
      expect(item.drill.mode).toBe('production');
      // exact-match grading against the authored answer (shared normalization).
      expect(item.drill.answer).toBe(src!.answer);
      expect(checkAnswer(item.drill.answer, src!.answer)).toBe(true);
    }
    // both authored answers reachable across the session
    expect(byAnswer(items, 'teu').length).toBeGreaterThan(0);
    expect(byAnswer(items, 'dela').length).toBeGreaterThan(0);
  });

  it('the SAME seed at L3 with context ⇒ byte-identical session (determinism)', () => {
    const a = generateSession('ctx-det', RECORDS, { count: 12, level: 'L3', context: CONTEXT });
    const b = generateSession('ctx-det', RECORDS, { count: 12, level: 'L3', context: CONTEXT });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('L1 and L2 still yield CUE-BASED items even when a context pool is present', () => {
    for (const level of ['L1', 'L2'] as const) {
      const items = generateSession('ctx-lower', RECORDS, { count: 30, level, context: CONTEXT });
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.isContext).toBe(false);
        expect(item.drill.sourceRef.store).toBe('possessives');
        // cue is prefixed — the lower tiers are cue-based, unchanged.
        expect(item.cue).not.toBe('');
        expect(item.drill.prompt.startsWith(`(${item.cue})`)).toBe(true);
      }
    }
  });

  it('REGRESSION: a 3-arg L3 call (no context input) behaves exactly as before — cue-based', () => {
    // Backward-compatibility (AC2): an existing 3-arg call site (or empty context)
    // must keep producing cue-based items, never context items.
    const threeArg = generateSession('compat', RECORDS, { count: 20, level: 'L3' });
    const emptyCtx = generateSession('compat', RECORDS, { count: 20, level: 'L3', context: [] });
    expect(threeArg.every((i) => i.isContext === false)).toBe(true);
    expect(threeArg.every((i) => i.drill.sourceRef.store === 'possessives')).toBe(true);
    // empty context input ⇒ identical to the 3-arg call (L3 falls back to cue-based).
    expect(JSON.stringify(emptyCtx)).toBe(JSON.stringify(threeArg));
  });

  it('a malformed context record is SKIPPED — never produced as a prompt', () => {
    const malformed: PossessiveContextRecord[] = [
      // no ___ blank
      { ...CONTEXT[0], contentId: 'ctx-noblank', dialogue: '— Olá. — É bonito!' },
      // two blanks
      { ...CONTEXT[0], contentId: 'ctx-twoblank', dialogue: '— ___ ou ___?' },
      // empty answer
      { ...CONTEXT[0], contentId: 'ctx-empty', answer: '' },
      // answer outside the possessive inventory
      { ...CONTEXT[0], contentId: 'ctx-bogus', answer: 'xyz' },
    ];
    const items = generateSession('ctx-bad', RECORDS, {
      count: 40,
      level: 'L3',
      context: [...malformed, CONTEXT[0]],
    });
    const ids = new Set(items.map((i) => i.drill.sourceRef.id));
    expect(ids.has('ctx-noblank')).toBe(false);
    expect(ids.has('ctx-twoblank')).toBe(false);
    expect(ids.has('ctx-empty')).toBe(false);
    expect(ids.has('ctx-bogus')).toBe(false);
    // the single valid record is the only one shown
    expect([...ids]).toEqual(['ctx0001']);
  });

  it('EXPLICITLY-supplied all-malformed context pool ⇒ L3 returns [] — it does NOT silently degrade to cue-based', () => {
    // A NON-EMPTY context pool means the caller asked for the HARD tier. If every
    // supplied row is malformed (the context data is corrupt / failed to load),
    // L3 must NOT silently fall through to the easy cue-based tier — that would
    // hide the data-integrity failure behind a happy-looking session. The honest
    // behavior is a graceful empty state, distinguishing this from the AC2
    // OMITTED/empty backward-compat fallback (covered by the REGRESSION test above).
    const allBad: PossessiveContextRecord[] = [
      { ...CONTEXT[0], contentId: 'ctx-bad1', answer: '' },
      { ...CONTEXT[0], contentId: 'ctx-bad2', dialogue: 'no blank here' },
    ];
    const items = generateSession('ctx-allbad', RECORDS, {
      count: 15,
      level: 'L3',
      context: allBad,
    });
    expect(items).toEqual([]);
  });
});

describe('graceful handling of invalid input (error path)', () => {
  it('a malformed record does not crash generation — it is excluded', () => {
    const dirty = [
      ...RECORDS,
      MISLABELED,
      { contentId: 'poss:bad', kind: 'bogus', answer: '', blankSentence: 'x' } as unknown as PossessiveRecord,
      null as unknown as PossessiveRecord,
    ];
    expect(() => generateSession('dirty', dirty, { count: 60, level: 'L3' })).not.toThrow();
    const items = generateSession('dirty', dirty, { count: 60, level: 'L3' });
    const ids = new Set(items.map((i) => i.drill.sourceRef.id));
    expect(ids.has('poss:bad')).toBe(false);
    expect(ids.has(MISLABELED.contentId)).toBe(false);
    expect([...ids].every((id) => RECORDS.some((r) => r.contentId === id))).toBe(true);
  });
});
