import { describe, expect, it } from 'vitest';
import { buildContent, readVerifiedRegulars } from '../../../scripts/build-content.ts';
import { conjugateRegular } from './conjugate.ts';
import { filterExamEligible } from './eligibility.ts';
import { PERSONS } from './persons.ts';
import { projectVerbData } from './index.ts';

const VERIFIED = readVerifiedRegulars();

describe('verified regular verbs', () => {
  it('the rule reproduces every dictionary-checked form', () => {
    expect(Object.keys(VERIFIED).length).toBeGreaterThanOrEqual(70);
    for (const [infinitive, forms] of Object.entries(VERIFIED)) {
      for (const person of PERSONS) {
        expect(conjugateRegular(infinitive, person), `${infinitive} · ${person}`).toBe(forms[person]);
      }
    }
  });

  it('are eligible for the conjugation drill in the shipped content', () => {
    const { verbs, conjugationTables } = buildContent();
    const eligible = new Set(
      filterExamEligible(projectVerbData(verbs, conjugationTables)).map((v) => v.infinitive),
    );
    for (const infinitive of ['pagar', 'comprar', 'ganhar', 'gostar', 'gastar', 'poupar', 'precisar', 'conhecer']) {
      expect(eligible.has(infinitive), infinitive).toBe(true);
    }
  });

  it('look-alike irregular verbs stay out until they have a verified table', () => {
    const { verbs, conjugationTables } = buildContent();
    const eligible = new Set(
      filterExamEligible(projectVerbData(verbs, conjugationTables)).map((v) => v.infinitive),
    );
    for (const infinitive of ['passear', 'valer', 'haver']) {
      expect(eligible.has(infinitive), infinitive).toBe(false);
    }
    expect(VERIFIED.dormir).toBeUndefined();
    expect(VERIFIED.vestir).toBeUndefined();
  });
});
