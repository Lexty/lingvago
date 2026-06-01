import { describe, expect, it } from 'vitest';
import type { ConjugationTableRecord, VerbRecord } from '../../db/schema.ts';
import { conjugate } from './conjugate.ts';
import { projectVerbData } from './projectVerbData.ts';
import { PERSONS } from './persons.ts';

function vr(
  infinitive: string,
  group: string,
  regular: boolean,
  hasTable: boolean,
  needsTableReview = false,
): VerbRecord {
  return {
    contentId: `verb:${infinitive}`,
    infinitive,
    group,
    reflexive: false,
    regular,
    hasTable,
    needsTableReview,
  };
}

const serTable: ConjugationTableRecord = {
  contentId: 'conj:ser:presente',
  infinitive: 'ser',
  tense: 'presente',
  group: '-er',
  regular: false,
  forms: { eu: 'sou', tu: 'és', voce_ele_ela: 'é', nos: 'somos', voces_eles_elas: 'são' },
};

describe('projectVerbData (verbs ⨝ conjugationTables)', () => {
  it('joins a verified present table onto its verb by infinitive', () => {
    const [ser] = projectVerbData([vr('ser', '-er', false, true)], [serTable]);
    expect(ser.table).toEqual(serTable.forms);
    // and the engine reads the irregular form verbatim from that table.
    expect(conjugate(ser, 'eu')).toBe('sou');
  });

  it('leaves a regular verb table-less so the rule path conjugates it', () => {
    const [falar] = projectVerbData([vr('falar', '-ar', true, false)], []);
    expect(falar.table).toBeUndefined();
    expect(falar.regular).toBe(true);
    expect(conjugate(falar, 'nos')).toBe('falamos');
  });

  it('carries the needsTableReview flag through (so the §6.5 gate can exclude it)', () => {
    const [pôr] = projectVerbData([vr('pôr', '-or', false, false, true)], []);
    expect(pôr.needsTableReview).toBe(true);
  });

  it('ignores a non-present table when joining (present-tense only)', () => {
    const past: ConjugationTableRecord = { ...serTable, tense: 'pps' };
    const [ser] = projectVerbData([vr('ser', '-er', false, true)], [past]);
    expect(ser.table).toBeUndefined();
  });

  it('sorts by infinitive regardless of input order (storage-order independent)', () => {
    const forward = projectVerbData(
      [vr('falar', '-ar', true, false), vr('abrir', '-ir', true, true), vr('ser', '-er', false, true)],
      [serTable],
    );
    const shuffled = projectVerbData(
      [vr('ser', '-er', false, true), vr('falar', '-ar', true, false), vr('abrir', '-ir', true, true)],
      [serTable],
    );
    expect(forward.map((v) => v.infinitive)).toEqual(['abrir', 'falar', 'ser']);
    expect(shuffled.map((v) => v.infinitive)).toEqual(forward.map((v) => v.infinitive));
    // A full table for the irregular is reconstructable across all 5 persons.
    const ser = forward.find((v) => v.infinitive === 'ser')!;
    for (const p of PERSONS) {
      expect(typeof conjugate(ser, p)).toBe('string');
    }
  });
});
