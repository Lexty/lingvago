// Builds the Anki packages (`public/anki/lingvago-unidade-NN.<lang>.apkg`) from
// the packs' vocabulary. Runs with `pnpm content`, before every dev/build, like
// the content bundle; the output is derived and not committed.
//
// An .apkg is a zip holding `collection.anki2` (an SQLite database in Anki's
// schema 11) and a `media` map. The schema and the collection row follow
// genanki (MIT, https://github.com/kerrickstaley/genanki), which Anki imports;
// the result was checked by importing it with the anki 26.09 Python engine.

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';
import initSqlJs from 'sql.js';
import {
  ANKI_DIR,
  ANKI_LANGS,
  ANKI_NOTETYPE,
  ankiDeckId,
  ankiDeckName,
  ankiFields,
  ankiFilename,
  ankiGuid,
  ankiTags,
  type AnkiLang,
} from '../src/packs/anki.ts';
import { PACKS } from '../src/packs/index.ts';
import type { Pack } from '../src/packs/types.ts';

const SCHEMA = `
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null,
  ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null,
  models text not null, decks text not null, dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null,
  usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null,
  flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null,
  mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null,
  ivl integer not null, factor integer not null, reps integer not null, lapses integer not null,
  left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null,
  ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`;

const DECK_CONF = {
  1: {
    autoplay: true,
    id: 1,
    lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
    maxTaken: 60,
    mod: 0,
    name: 'Default',
    new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20, separate: true },
    replayq: true,
    rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 100 },
    timer: 0,
    usn: 0,
  },
};

const COL_CONF = {
  activeDecks: [1],
  addToCur: true,
  collapseTime: 1200,
  curDeck: 1,
  curModel: String(ANKI_NOTETYPE.id),
  dueCounts: true,
  estTimes: true,
  newBury: true,
  newSpread: 0,
  nextPos: 1,
  sortBackwards: false,
  sortType: 'noteFld',
  timeLim: 0,
};

function deckJson(id: number, name: string, modSec: number) {
  return {
    collapsed: false,
    conf: 1,
    desc: '',
    dyn: 0,
    extendNew: 0,
    extendRev: 50,
    id,
    lrnToday: [0, 0],
    mod: modSec,
    name,
    newToday: [0, 0],
    revToday: [0, 0],
    timeToday: [0, 0],
    usn: -1,
  };
}

function notetypeJson(deckId: number, modSec: number) {
  return {
    css: ANKI_NOTETYPE.css,
    did: deckId,
    flds: ANKI_NOTETYPE.fields.map((name, ord) => ({
      name,
      ord,
      font: 'Arial',
      media: [],
      rtl: false,
      size: 20,
      sticky: false,
    })),
    id: String(ANKI_NOTETYPE.id),
    latexPost: '\\end{document}',
    latexPre:
      '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n' +
      '\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
    latexsvg: false,
    mod: modSec,
    name: ANKI_NOTETYPE.name,
    // Card 1 needs Portuguese, card 2 needs Meaning (each one's question field).
    req: [
      [0, 'any', [0]],
      [1, 'any', [1]],
    ],
    sortf: 0,
    tags: [],
    tmpls: ANKI_NOTETYPE.templates.map((t, ord) => ({
      name: t.name,
      ord,
      qfmt: t.qfmt,
      afmt: t.afmt,
      bqfmt: '',
      bafmt: '',
      bfont: '',
      bsize: 0,
      did: null,
    })),
    type: 0,
    usn: -1,
    vers: [],
  };
}

/** Anki's duplicate checksum: the first 8 hex digits of SHA-1 of the stripped sort field. */
function checksum(field: string): number {
  const text = field.replace(/<[^>]*>/g, '');
  return parseInt(createHash('sha1').update(text, 'utf8').digest('hex').slice(0, 8), 16);
}

/** The package for one pack in one meaning language. `nowMs` stamps ids and modification times. */
export async function buildApkg(pack: Pack, lang: AnkiLang, nowMs: number): Promise<Uint8Array> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const modSec = Math.floor(nowMs / 1000);
  const deckId = ankiDeckId(pack);
  const parentId = ankiDeckId({ ...pack, unit: 0 });
  const [parentName] = ankiDeckName(pack).split('::');

  db.exec(SCHEMA);
  db.run('INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, ?)', [
    modSec,
    nowMs,
    nowMs,
    JSON.stringify(COL_CONF),
    JSON.stringify({ [ANKI_NOTETYPE.id]: notetypeJson(deckId, modSec) }),
    JSON.stringify({
      1: deckJson(1, 'Default', modSec),
      [parentId]: deckJson(parentId, parentName, modSec),
      [deckId]: deckJson(deckId, ankiDeckName(pack), modSec),
    }),
    JSON.stringify(DECK_CONF),
    '{}',
  ]);

  let nextId = nowMs;
  (pack.vocab?.cards ?? []).forEach((card, index) => {
    const fields = ankiFields(card, lang);
    const noteId = nextId++;
    db.run('INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, ?)', [
      noteId,
      ankiGuid(pack, card),
      ANKI_NOTETYPE.id,
      modSec,
      ` ${ankiTags(pack, card).join(' ')} `,
      fields.join('\x1f'),
      fields[0],
      checksum(fields[0]),
      '',
    ]);
    for (let ord = 0; ord < ANKI_NOTETYPE.templates.length; ord++) {
      db.run('INSERT INTO cards VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, ?)', [
        nextId++,
        noteId,
        deckId,
        ord,
        modSec,
        index,
        '',
      ]);
    }
  });

  const collection = db.export();
  db.close();
  return zipSync({ 'collection.anki2': collection, media: strToU8('{}') });
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = process.env.BUILD_ANKI_OUT_DIR ?? join(root, 'public', ANKI_DIR);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const now = Date.now();
  let count = 0;
  for (const pack of PACKS) {
    if (!pack.vocab?.cards.length) continue;
    for (const lang of ANKI_LANGS) {
      writeFileSync(join(outDir, ankiFilename(pack, lang)), await buildApkg(pack, lang, now));
      count++;
    }
  }
  console.log(`build-anki: wrote ${count} packages to ${outDir}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
