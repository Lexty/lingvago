// Anki export of a pack's vocabulary: what goes into the deck.
//
// The deck ships as an Anki package (`.apkg`) built at build time by
// scripts/build-anki.ts into public/anki/. A package carries its own note type,
// so the import does not depend on the language of the learner's Anki: a plain
// text import names the stock "Basic (and reversed card)" type, which a
// Russian-language Anki calls «Простая (с обратной карточкой)» and silently
// replaces with a one-way type (checked with the anki 26.09 engine).
//
// This module is shared by the app (file names, the word list) and the build
// script (note type, fields, GUIDs), so the two cannot drift apart.

import { localized } from './index.ts';
import type { Pack, VocabCard } from './types.ts';

export const ANKI_LANGS = ['ru', 'en'] as const;
export type AnkiLang = (typeof ANKI_LANGS)[number];

export function ankiLang(lang: string | undefined): AnkiLang {
  return lang?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

/** `unidade-18`: the unit tag shared by every note of the pack. */
export function unitTag(pack: Pack): string {
  return `unidade-${String(pack.unit).padStart(2, '0')}`;
}

export function ankiDeckName(pack: Pack): string {
  return `Lingvago::Unidade ${pack.unit}`;
}

/** `lingvago-unidade-18.ru.apkg` — served from `/anki/`. */
export function ankiFilename(pack: Pack, lang: AnkiLang): string {
  return `lingvago-${unitTag(pack)}.${lang}.apkg`;
}

export const ANKI_DIR = 'anki';

/**
 * `lingvago:unit-19:ninguem` — from the card's frozen id, not its Portuguese
 * text, so editing the text updates the note. Anki recognises an imported note by its GUID, so
 * re-importing the deck from a LATER build updates the notes the learner
 * already has, with their review history, instead of adding copies. Anki
 * updates a note only when the file's modification time differs from (default:
 * is newer than) the one it has; the ru and en packages of one build share it,
 * so importing the other language of the same build changes nothing (checked
 * with anki 26.09, also with "update: always"). Both languages share GUIDs.
 */
export function ankiGuid(pack: Pack, card: VocabCard): string {
  return `lingvago:${pack.id}:${card.id}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The note's fields, in {@link ANKI_NOTETYPE} order: Portuguese, Meaning, Note. */
export function ankiFields(card: VocabCard, lang: AnkiLang): [string, string, string] {
  return [
    escapeHtml(card.pt),
    escapeHtml(localized({ ru: card.ru, en: card.en }, lang)),
    card.note ? escapeHtml(localized(card.note, lang)) : '',
  ];
}

export function ankiTags(pack: Pack, card: VocabCard): string[] {
  return ['lingvago', unitTag(pack), card.topic];
}

const NOTE = '{{#Note}}<div class="note">{{Note}}</div>{{/Note}}';

/**
 * The note type: one card each way. The note is shown only with the answer —
 * it often quotes the word in use (`Ninguém quer café.`) and would give the
 * answer away on the meaning → Portuguese card.
 */
export const ANKI_NOTETYPE = {
  /** Fixed: Anki matches the note type of a re-imported deck by this id. */
  id: 1_759_500_000_018,
  name: 'Lingvago (português)',
  fields: ['Portuguese', 'Meaning', 'Note'],
  templates: [
    {
      name: 'Português → significado',
      qfmt: '<div class="pt">{{Portuguese}}</div>',
      afmt: `{{FrontSide}}<hr id="answer"><div class="meaning">{{Meaning}}</div>${NOTE}`,
    },
    {
      name: 'Significado → português',
      qfmt: '<div class="meaning">{{Meaning}}</div>',
      afmt: `{{FrontSide}}<hr id="answer"><div class="pt">{{Portuguese}}</div>${NOTE}`,
    },
  ],
  css: [
    '.card { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 24px; text-align: center; color: #1d2433; background: #fbf8f3; }',
    '.nightMode.card, .night_mode .card { color: #e8e6e3; background: #1e1f26; }',
    '.pt { font-size: 30px; font-weight: 600; }',
    '.note { margin-top: 18px; font-size: 18px; color: #6b7280; }',
  ].join('\n'),
} as const;

/** A fixed deck id per unit, so the same deck is found again on re-import. */
export function ankiDeckId(pack: Pack): number {
  return 1_759_500_000_000 + pack.unit * 100;
}
