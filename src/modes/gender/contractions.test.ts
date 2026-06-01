import { describe, expect, it } from 'vitest';
import {
  articleFormsFor,
  contract,
  indefiniteFor,
  oppositeArticle,
  oppositeContraction,
  type Contractable,
  type DefiniteArticle,
} from './contractions.ts';

describe('contract — de/em/a + o/a contractions BY RULE (AC2)', () => {
  it('produces do/da/no/na/ao/à exactly per the closed table', () => {
    expect(contract('de', 'o')).toBe('do');
    expect(contract('de', 'a')).toBe('da');
    expect(contract('em', 'o')).toBe('no');
    expect(contract('em', 'a')).toBe('na');
    expect(contract('a', 'o')).toBe('ao');
    expect(contract('a', 'a')).toBe('à');
  });

  it('is total over the closed (prep × article) domain', () => {
    const preps: Contractable[] = ['de', 'em', 'a'];
    const arts: DefiniteArticle[] = ['o', 'a'];
    for (const p of preps) {
      for (const art of arts) {
        expect(typeof contract(p, art)).toBe('string');
        expect(contract(p, art).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('indefinite + opposite derivation (verified, never guessed)', () => {
  it('maps o→um, a→uma', () => {
    expect(indefiniteFor('o')).toBe('um');
    expect(indefiniteFor('a')).toBe('uma');
    expect(articleFormsFor('o')).toEqual({ definite: 'o', indefinite: 'um' });
    expect(articleFormsFor('a')).toEqual({ definite: 'a', indefinite: 'uma' });
  });

  it('opposite article is the competitive gender distractor (o↔a)', () => {
    expect(oppositeArticle('o')).toBe('a');
    expect(oppositeArticle('a')).toBe('o');
  });

  it('opposite contraction is the neighbouring-contraction trap', () => {
    // de+o=do → opposite (de+a) = da
    expect(oppositeContraction('de', 'o')).toBe('da');
    expect(oppositeContraction('em', 'a')).toBe('no');
    expect(oppositeContraction('a', 'a')).toBe('ao');
    expect(oppositeContraction('a', 'o')).toBe('à');
  });
});
