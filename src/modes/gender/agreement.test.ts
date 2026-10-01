import { describe, expect, it } from 'vitest';
import type { NounRecord } from '../../db/schema.ts';
import { buildContent } from '../../../scripts/build-content.ts';
import { checkAnswer } from '../shared/index.ts';
import { filterAgreementEligible, isAgreementEligible } from './eligibility.ts';
import { AGREEING_DETERMINERS, generateSession } from './session.ts';

const NOUNS: NounRecord[] = [
  { contentId: 'noun:viagem', lemma: 'viagem', gender: 'f', article: 'a', en: null, plural: 'viagens' },
  { contentId: 'noun:lago', lemma: 'lago', gender: 'm', article: 'o', en: null, plural: 'lagos' },
  { contentId: 'noun:flor', lemma: 'flor', gender: 'f', article: 'a', en: null, plural: 'flores' },
  // No authored plural → never used for agreement.
  { contentId: 'noun:leite', lemma: 'leite', gender: 'm', article: 'o', en: null },
];

describe('plural-agreement eligibility', () => {
  it('needs a verified gender AND an authored plural', () => {
    expect(isAgreementEligible(NOUNS[0])).toBe(true);
    expect(isAgreementEligible(NOUNS[3])).toBe(false);
    expect(isAgreementEligible({ ...NOUNS[0], plural: '  ' })).toBe(false);
    // gender/article disagree → not trusted, even with a plural.
    expect(isAgreementEligible({ ...NOUNS[0], article: 'o' })).toBe(false);
    expect(filterAgreementEligible(NOUNS).map((n) => n.lemma)).toEqual(['viagem', 'lago', 'flor']);
  });
});

describe('plural-agreement items (L4)', () => {
  const items = generateSession('agr', NOUNS, { count: 60, level: 'L4' });

  it('is deterministic for a seed', () => {
    expect(generateSession('agr', NOUNS, { count: 60, level: 'L4' })).toEqual(items);
  });

  it('are typed items: dictionary form in the prompt, agreeing form as the answer', () => {
    expect(items).toHaveLength(60);
    for (const item of items) {
      expect(item.kind).toBe('agreement');
      expect(item.level).toBe('L4');
      expect(item.drill.mode).toBe('production');
      const noun = NOUNS.find((n) => n.contentId === item.drill.sourceRef.id)!;
      const forms = AGREEING_DETERMINERS.find(([m]) => m === item.determiner)!;
      expect(item.drill.prompt).toBe(`(${forms[0]}) ___ ${noun.plural}`);
      expect(item.drill.answer).toBe(noun.gender === 'm' ? forms[0] : forms[1]);
    }
  });

  it('never uses a noun without an authored plural', () => {
    expect(items.some((i) => i.lemma === 'leite')).toBe(false);
  });

  it('covers the textbook exercise: várias viagens, vários lagos, várias flores', () => {
    const by = (lemma: string) =>
      items.find((i) => i.lemma === lemma && i.determiner === 'vários')?.drill.answer;
    expect(by('viagem')).toBe('várias');
    expect(by('lago')).toBe('vários');
    expect(by('flor')).toBe('várias');
  });

  it('the wrong gender is graded wrong, the right one right', () => {
    const item = items.find((i) => i.lemma === 'flor' && i.determiner === 'vários')!;
    expect(checkAnswer('várias', item.drill.answer)).toBe(true);
    expect(checkAnswer('vários', item.drill.answer)).toBe(false);
  });

  it('yields nothing (not hint-less guesses) when no noun has a plural', () => {
    expect(generateSession('agr', [NOUNS[3]], { count: 5, level: 'L4' })).toEqual([]);
  });
});

describe('shipped content', () => {
  const { nouns, referenceCards } = buildContent();
  const byLemma = new Map(nouns.map((n) => [n.lemma, n]));

  it('has every noun of the textbook exercise with its gender and plural', () => {
    const expected: Array<[string, 'm' | 'f', string]> = [
      ['praia', 'f', 'praias'],
      ['viagem', 'f', 'viagens'],
      ['ilha', 'f', 'ilhas'],
      ['loja', 'f', 'lojas'],
      ['lago', 'm', 'lagos'],
      ['flor', 'f', 'flores'],
    ];
    for (const [lemma, gender, plural] of expected) {
      expect(byLemma.get(lemma)).toMatchObject({ gender, plural });
    }
  });

  it('every authored plural sits on a gender-consistent noun', () => {
    const withPlural = nouns.filter((n) => n.plural !== undefined);
    expect(withPlural.length).toBeGreaterThanOrEqual(50);
    expect(filterAgreementEligible(withPlural)).toHaveLength(withPlural.length);
  });

  it('the rule card explains the agreement and the -or exceptions', () => {
    const card = referenceCards.find((c) => c.contentId === 'ref-genero-artigo')!;
    expect(card.body).toContain('vários / várias');
    expect(card.body).toContain('a flor');
  });
});
