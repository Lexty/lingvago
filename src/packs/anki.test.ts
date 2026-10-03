import { unzipSync, strFromU8 } from 'fflate';
import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';
import { buildApkg } from '../../scripts/build-anki.ts';
import {
  ANKI_NOTETYPE,
  ankiDeckName,
  ankiFields,
  ankiFilename,
  ankiGuid,
  ankiLang,
} from './anki.ts';
import { PACKS, findPack } from './index.ts';

const unit18 = findPack('unit-18')!;
const unit19 = findPack('unit-19')!;

describe('pack vocabulary', () => {
  it('every pack ships a checked word list', () => {
    for (const pack of PACKS) {
      expect(pack.vocab, pack.id).toBeDefined();
      expect(pack.vocab!.cards.length, pack.id).toBeGreaterThan(0);
      expect(pack.vocab!.sources.length, pack.id).toBeGreaterThan(0);
      expect(pack.vocab!.reviewedOn, pack.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('ids are unique inside a pack and safe to put in a GUID', () => {
    for (const pack of PACKS) {
      const ids = (pack.vocab?.cards ?? []).map((card) => card.id);
      expect(new Set(ids).size, pack.id).toBe(ids.length);
      for (const id of ids) expect(id, pack.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('a Portuguese word appears once inside a pack', () => {
    for (const pack of PACKS) {
      const pts = (pack.vocab?.cards ?? []).map((card) => card.pt);
      expect(new Set(pts).size, pack.id).toBe(pts.length);
    }
  });

  it('keeps the ids already shipped (a changed id would orphan the learner\'s notes)', () => {
    const ids = (packId: string) => findPack(packId)!.vocab!.cards.map((card) => card.id);
    expect(ids('unit-18')).toEqual(expect.arrayContaining(['viagem', 'agencia-de-viagens', 'lago', 'capital', 'mais-do-que', 'varios-varias']));
    expect(ids('unit-19')).toEqual(expect.arrayContaining(['ninguem', 'segunda-feira', 'tirar-uma-senha', 'que-bom']));
  });

  it('every card has both meanings and a tag-safe topic', () => {
    for (const pack of PACKS) {
      for (const card of pack.vocab?.cards ?? []) {
        expect(card.pt.trim(), card.pt).toBe(card.pt);
        expect(card.ru.trim().length, card.pt).toBeGreaterThan(0);
        expect(card.en.trim().length, card.pt).toBeGreaterThan(0);
        expect(card.topic, card.pt).toMatch(/^[a-z-]+$/);
      }
    }
  });

  it('no meaning gives away its own Portuguese word (it is the question of card 2)', () => {
    for (const pack of PACKS) {
      for (const card of pack.vocab?.cards ?? []) {
        expect(card.ru.toLowerCase(), card.pt).not.toContain(card.pt.toLowerCase());
        expect(card.en.toLowerCase(), card.pt).not.toContain(card.pt.toLowerCase());
      }
    }
  });
});

describe('anki helpers', () => {
  it('names the deck, the file and the note GUID after the unit', () => {
    expect(ankiDeckName(unit18)).toBe('Lingvago::Unidade 18');
    expect(ankiFilename(unit18, 'ru')).toBe('lingvago-unidade-18.ru.apkg');
    expect(ankiFilename(unit18, 'en')).toBe('lingvago-unidade-18.en.apkg');
    expect(ankiGuid(unit19, { id: 'ninguem', pt: 'ninguém', ru: '', en: '', topic: 'x' })).toBe('lingvago:unit-19:ninguem');
  });

  it('maps the interface language to a package language', () => {
    expect(ankiLang('ru')).toBe('ru');
    expect(ankiLang('ru-RU')).toBe('ru');
    expect(ankiLang('en')).toBe('en');
    expect(ankiLang(undefined)).toBe('en');
  });

  it('fills Portuguese, meaning and note, escaping HTML', () => {
    const card = { id: 'b', pt: 'a <b>', ru: 'x & y', en: 'z', note: { ru: 'n', en: 'm' }, topic: 't' };
    expect(ankiFields(card, 'ru')).toEqual(['a &lt;b&gt;', 'x &amp; y', 'n']);
    expect(ankiFields({ ...card, note: undefined }, 'en')).toEqual(['a &lt;b&gt;', 'z', '']);
  });

  it('shows the note only with the answer, on both cards', () => {
    for (const template of ANKI_NOTETYPE.templates) {
      expect(template.qfmt).not.toContain('{{Note}}');
      expect(template.afmt).toContain('{{Note}}');
    }
  });
});

describe('buildApkg', () => {
  async function open(bytes: Uint8Array) {
    const files = unzipSync(bytes);
    expect(Object.keys(files).sort()).toEqual(['collection.anki2', 'media']);
    expect(strFromU8(files.media)).toBe('{}');
    const SQL = await initSqlJs();
    return new SQL.Database(files['collection.anki2']);
  }

  it('holds one note per word and one card each way, in the unit deck', async () => {
    const db = await open(await buildApkg(unit19, 'ru', 1_791_000_000_000));
    const count = (sql: string) => db.exec(sql)[0].values[0][0];
    expect(count('SELECT count(*) FROM notes')).toBe(unit19.vocab!.cards.length);
    expect(count('SELECT count(*) FROM cards')).toBe(unit19.vocab!.cards.length * 2);
    expect(count('SELECT count(DISTINCT guid) FROM notes')).toBe(unit19.vocab!.cards.length);

    const [col] = db.exec('SELECT ver, models, decks FROM col')[0].values;
    expect(col[0]).toBe(11);
    const models = JSON.parse(col[1] as string);
    expect(models[ANKI_NOTETYPE.id].name).toBe(ANKI_NOTETYPE.name);
    expect(models[ANKI_NOTETYPE.id].tmpls).toHaveLength(2);
    const decks = Object.values(JSON.parse(col[2] as string)).map((d) => (d as { name: string }).name);
    expect(decks).toContain('Lingvago::Unidade 19');

    const [note] = db.exec("SELECT guid, tags, flds FROM notes WHERE guid = 'lingvago:unit-19:ninguem'")[0].values;
    expect(note[1]).toBe(' lingvago unidade-19 pronomes ');
    const [pt, meaning, tip] = (note[2] as string).split('\x1f');
    expect([pt, meaning]).toEqual(['ninguém', 'никто']);
    expect(tip).toContain('Ninguém quer café.');
    db.close();
  });

  it('writes the meanings in the requested language under the same GUIDs', async () => {
    const guidsAndMeaning = async (lang: 'ru' | 'en') => {
      const db = await open(await buildApkg(unit18, lang, 1_791_000_000_000));
      const rows = db.exec("SELECT guid, flds FROM notes WHERE guid = 'lingvago:unit-18:lago'")[0].values;
      db.close();
      return rows.map(([guid, flds]) => [guid, (flds as string).split('\x1f')[1]]);
    };
    expect(await guidsAndMeaning('ru')).toEqual([['lingvago:unit-18:lago', 'озеро']]);
    expect(await guidsAndMeaning('en')).toEqual([['lingvago:unit-18:lago', 'lake']]);
  });
});
