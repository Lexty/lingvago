import { describe, expect, it } from 'vitest';
import type { ConjugationForms } from '../../db/schema.ts';
import {
  ConjugationError,
  conjugate,
  conjugateRegular,
  conjugateTable,
  isRegularGroup,
  type VerbData,
} from './conjugate.ts';
import { isExamEligible } from './eligibility.ts';
import { PERSONS, type Person } from './persons.ts';
import { loadTeacherTables, loadVerbData } from './fixtures.test-helper.ts';

// EP present endings, reproduced here independently as the test oracle so the
// rule under test is checked against a SEPARATE statement of the same rule.
const ENDINGS = {
  '-ar': { eu: 'o', tu: 'as', voce_ele_ela: 'a', nos: 'amos', voces_eles_elas: 'am' },
  '-er': { eu: 'o', tu: 'es', voce_ele_ela: 'e', nos: 'emos', voces_eles_elas: 'em' },
  '-ir': { eu: 'o', tu: 'es', voce_ele_ela: 'e', nos: 'imos', voces_eles_elas: 'em' },
} as const;

// ≥6 regular verbs PER GROUP (the rule is pure, so these exercise it directly;
// the inventory does not itself carry 6 regular verbs in every group).
const REGULAR_BY_GROUP: Record<'-ar' | '-er' | '-ir', string[]> = {
  '-ar': ['falar', 'andar', 'passar', 'morar', 'estudar', 'trabalhar', 'gostar'],
  '-er': ['comer', 'beber', 'aprender', 'vender', 'correr', 'escrever', 'viver'],
  '-ir': ['abrir', 'partir', 'decidir', 'assistir', 'dividir', 'discutir', 'permitir'],
};

describe('isRegularGroup', () => {
  it('accepts the three rule-eligible groups only', () => {
    expect(isRegularGroup('-ar')).toBe(true);
    expect(isRegularGroup('-er')).toBe(true);
    expect(isRegularGroup('-ir')).toBe(true);
    expect(isRegularGroup('-or')).toBe(false);
    expect(isRegularGroup('')).toBe(false);
  });
});

describe('conjugateRegular — rule per group (≥6 verbs/group)', () => {
  for (const group of ['-ar', '-er', '-ir'] as const) {
    const verbs = REGULAR_BY_GROUP[group];
    it(`${group}: conjugates ${verbs.length} verbs across all 5 persons`, () => {
      expect(verbs.length).toBeGreaterThanOrEqual(6);
      for (const inf of verbs) {
        const stem = inf.slice(0, -2);
        for (const person of PERSONS) {
          expect(conjugateRegular(inf, person)).toBe(stem + ENDINGS[group][person]);
        }
      }
    });
  }

  it('applies the EP present orthographic eu spelling change (never a misspelled form)', () => {
    // The eu form changes the stem's final consonant before the back vowel `o`
    // so the rule never emits a misspelled form (conheco / protego / dirigo).
    expect(conjugateRegular('conhecer', 'eu')).toBe('conheço'); // -cer → -ço
    expect(conjugateRegular('proteger', 'eu')).toBe('protejo'); // -ger → -jo
    expect(conjugateRegular('dirigir', 'eu')).toBe('dirijo'); // -gir → -jo
    expect(conjugateRegular('distinguir', 'eu')).toBe('distingo'); // -guir → -go (drop u)
    // Only the eu form changes; the other persons keep the plain rule endings.
    expect(conjugateRegular('conhecer', 'tu')).toBe('conheces');
    expect(conjugateRegular('proteger', 'voce_ele_ela')).toBe('protege');
    expect(conjugateRegular('dirigir', 'nos')).toBe('dirigimos');
    expect(conjugateRegular('distinguir', 'voces_eles_elas')).toBe('distinguem');
  });

  it('refuses a non-regular group (-or / pôr) — never guesses', () => {
    expect(() => conjugateRegular('pôr', 'eu')).toThrow(ConjugationError);
  });

  it('throws on an invalid person and an empty infinitive', () => {
    expect(() => conjugateRegular('falar', 'vos' as unknown as Person)).toThrow(ConjugationError);
    expect(() => conjugateRegular('', 'eu')).toThrow(ConjugationError);
  });
});

describe('conjugate — table verbatim for irregulars', () => {
  const tables = loadTeacherTables();

  it.each(['ser', 'estar', 'ter', 'fazer', 'poder', 'dizer'])(
    'returns the verified table form verbatim for %s',
    (inf) => {
      const table = tables.get(inf);
      expect(table).toBeDefined();
      const verb: VerbData = { infinitive: inf, group: '-er', regular: false, table };
      for (const person of PERSONS) {
        expect(conjugate(verb, person)).toBe((table as ConjugationForms)[person]);
      }
    },
  );

  it('refuses an irregular verb WITHOUT a verified table — never guesses', () => {
    const verb: VerbData = { infinitive: 'inventar-nonsense', group: '-ar', regular: false };
    expect(() => conjugate(verb, 'eu')).toThrow(/refusing to guess/);
  });

  it('refuses a needsTableReview verb even if a table is somehow present', () => {
    const verb: VerbData = {
      infinitive: 'conhecer',
      group: '-er',
      regular: false,
      needsTableReview: true,
      table: { eu: 'x', tu: 'x', voce_ele_ela: 'x', nos: 'x', voces_eles_elas: 'x' },
    };
    expect(() => conjugate(verb, 'eu')).toThrow(/table review/);
  });

  it('throws on an invalid person', () => {
    const verb: VerbData = { infinitive: 'falar', group: '-ar', regular: true };
    expect(() => conjugate(verb, 'foo' as unknown as Person)).toThrow(ConjugationError);
  });
});

describe('rule == verified table where BOTH exist (AC3 consistency)', () => {
  it('every regular verb that also has a verified table agrees form-by-form', () => {
    const verbs = loadVerbData();
    const checked: string[] = [];
    for (const v of verbs) {
      if (v.regular && isRegularGroup(v.group) && v.table && !v.infinitive.includes('-')) {
        for (const person of PERSONS) {
          expect(conjugateRegular(v.infinitive, person)).toBe(v.table[person]);
        }
        checked.push(v.infinitive);
      }
    }
    // Must actually have exercised the overlap (e.g. falar, andar, abrir…).
    expect(checked.length).toBeGreaterThanOrEqual(5);
  });
});

describe('no exam-eligible verb is mis-conjugated (AC1/§6.5 safety)', () => {
  it('produces a form for every eligible verb on every person, never a guessed throw', () => {
    const verbs = loadVerbData();
    const eligible = verbs.filter(isExamEligible);
    expect(eligible.length).toBeGreaterThan(0);
    for (const v of eligible) {
      for (const person of PERSONS) {
        expect(() => conjugate(v, person)).not.toThrow();
      }
    }
  });

  it('any eligible RULE-path verb (no table) with a -cer/-ger/-gir/-guir ending has a correctly-spelled eu form', () => {
    // Defense-in-depth against future inventory drift: if a verb is ever routed
    // through the rule (regular, no verified table) and ends in an
    // orthographically-changing group, its eu form must NOT be the naive
    // stem+`o` spelling (conheco/protego/dirigo).
    const verbs = loadVerbData();
    for (const v of verbs) {
      if (!isExamEligible(v) || v.table) {
        continue; // table verbs are verbatim; only the rule path is at risk
      }
      const inf = v.infinitive.toLowerCase();
      if (/(cer|ger|gir|guir)$/.test(inf)) {
        const eu = conjugate(v, 'eu');
        const naive = inf.slice(0, -2) + 'o';
        expect(eu).not.toBe(naive);
      }
    }
  });
});

describe('conjugateTable', () => {
  it('builds all 5 persons for a regular verb by rule', () => {
    const verb: VerbData = { infinitive: 'falar', group: '-ar', regular: true };
    expect(conjugateTable(verb)).toEqual({
      eu: 'falo',
      tu: 'falas',
      voce_ele_ela: 'fala',
      nos: 'falamos',
      voces_eles_elas: 'falam',
    });
  });

  it('propagates the refusal for an ineligible verb', () => {
    const verb: VerbData = { infinitive: 'haver', group: '-er', regular: false, needsTableReview: true };
    expect(() => conjugateTable(verb)).toThrow(ConjugationError);
  });
});
