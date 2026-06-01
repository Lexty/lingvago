import { describe, expect, it } from 'vitest';
import { PERSONS, isPerson, pronounFor } from './persons.ts';

describe('PERSONS', () => {
  it('is exactly the 5 canonical A1 persons in fixed order (no vós)', () => {
    expect(PERSONS).toEqual(['eu', 'tu', 'voce_ele_ela', 'nos', 'voces_eles_elas']);
    expect(PERSONS).not.toContain('vos');
  });
});

describe('isPerson', () => {
  it('accepts the 5 person keys and rejects everything else', () => {
    for (const p of PERSONS) expect(isPerson(p)).toBe(true);
    expect(isPerson('vos')).toBe(false);
    expect(isPerson('')).toBe(false);
    expect(isPerson(42)).toBe(false);
    expect(isPerson(undefined)).toBe(false);
  });
});

describe('pronounFor', () => {
  it('maps each person to a natural subject pronoun', () => {
    expect(pronounFor('eu')).toBe('eu');
    expect(pronounFor('tu')).toBe('tu');
    expect(pronounFor('voce_ele_ela')).toBe('você');
    expect(pronounFor('nos')).toBe('nós');
    expect(pronounFor('voces_eles_elas')).toBe('eles');
  });
});
