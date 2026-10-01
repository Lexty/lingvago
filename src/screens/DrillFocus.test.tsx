import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import type {
  NounRecord,
  PossessiveContextRecord,
  PossessiveRecord,
  PrepositionRecord,
} from '../db/schema.ts';
import { buildGenderEntries } from './GenderDrill.tsx';
import PossessiveDrill, { buildPossessiveEntries } from './PossessiveDrill.tsx';
import PrepositionDrill, { buildPrepositionEntries } from './PrepositionDrill.tsx';

const SEED = 'unit-focus-seed';

const PREPS: PrepositionRecord[] = [
  { contentId: 'prep:tempo:t1', category: 'tempo', prep: 'a', use: '', examples: ['Trabalho de segunda a sexta.'] },
  { contentId: 'prep:tempo:t2', category: 'tempo', prep: 'em', use: '', examples: ['Estamos em maio.'] },
  { contentId: 'prep:movimento:m1', category: 'movimento', prep: 'para', use: '', examples: ['Eu vou para o Brasil.'] },
  { contentId: 'prep:lugar:l1', category: 'lugar', prep: 'em', use: '', examples: ['Moro em Lisboa.'] },
];

const NOUNS: NounRecord[] = [
  { contentId: 'noun:livro', lemma: 'livro', gender: 'm', article: 'o', en: null },
  { contentId: 'noun:casa', lemma: 'casa', gender: 'f', article: 'a', en: null },
  { contentId: 'noun:carro', lemma: 'carro', gender: 'm', article: 'o', en: null },
  { contentId: 'noun:mesa', lemma: 'mesa', gender: 'f', article: 'a', en: null },
];

const POSS: PossessiveRecord[] = [
  {
    contentId: 'poss:0001',
    blankSentence: 'O ___ livro é novo.',
    answer: 'meu',
    person: 'eu',
    kind: 'determiner',
    possessedGender: 'm',
    possessedNumber: 'sg',
    hasArticle: true,
  },
  {
    contentId: 'poss:0002',
    blankSentence: 'A ___ casa é grande.',
    answer: 'tua',
    person: 'tu',
    kind: 'determiner',
    possessedGender: 'f',
    possessedNumber: 'sg',
    hasArticle: true,
  },
];

const CONTEXT: PossessiveContextRecord[] = [
  {
    contentId: 'ctx:0001',
    dialogue: '— Este casaco é teu?\n— Sim, é ___.',
    answer: 'meu',
    person: 'eu',
    kind: 'determiner',
    ownerCue: 'eu',
    possessedGender: 'm',
    possessedNumber: 'sg',
    possessedNoun: 'casaco',
  },
];

describe('drill focus — session builders', () => {
  it('prepositions: a chosen category keeps only that category, at full length', () => {
    const all = buildPrepositionEntries(SEED, PREPS);
    const tempo = buildPrepositionEntries(SEED, PREPS, 'tempo');
    expect(new Set(all.map((e) => e.item.category)).size).toBeGreaterThan(1);
    expect(tempo.length).toBe(all.length);
    expect(tempo.every((e) => e.item.category === 'tempo')).toBe(true);
    expect(tempo.every((e) => e.labelKey === 'preposition.category.tempo')).toBe(true);
  });

  it('prepositions: the default mix is unchanged by the focus parameter', () => {
    expect(buildPrepositionEntries(SEED, PREPS, 'all')).toEqual(
      buildPrepositionEntries(SEED, PREPS),
    );
  });

  it('gender: each focus yields only its article mechanic, at full length', () => {
    const all = buildGenderEntries(SEED, NOUNS);
    const definite = buildGenderEntries(SEED, NOUNS, 'definite');
    const contraction = buildGenderEntries(SEED, NOUNS, 'contraction');
    expect(definite.length).toBe(all.length);
    expect(definite.every((e) => e.item.kind === 'definite')).toBe(true);
    expect(contraction.every((e) => e.item.kind === 'contraction')).toBe(true);
    expect(contraction.every((e) => e.labelKey === 'gender.kind.contraction')).toBe(true);
    // "o / a + um / uma" draws from both article forms and nothing else.
    const both = new Set(buildGenderEntries(SEED, NOUNS, 'both').map((e) => e.item.kind));
    expect([...both].every((k) => k === 'definite' || k === 'indefinite')).toBe(true);
  });

  it('possessives: hint and dialogue are separate sub-topics', () => {
    const all = buildPossessiveEntries(SEED, POSS, CONTEXT);
    const cue = buildPossessiveEntries(SEED, POSS, CONTEXT, 'cue');
    const context = buildPossessiveEntries(SEED, POSS, CONTEXT, 'context');
    expect(cue.length).toBe(all.length);
    expect(context.length).toBe(all.length);
    expect(cue.every((e) => !e.item.isContext)).toBe(true);
    expect(context.every((e) => e.item.isContext)).toBe(true);
    expect(context.every((e) => e.labelKey === 'possessive.kind.context')).toBe(true);
  });

  it('possessives: "from a dialogue" with no dialogues is empty, never hint items', () => {
    expect(buildPossessiveEntries(SEED, POSS, [], 'context')).toEqual([]);
    // The mix keeps its fallback to hint items when there are no dialogues.
    const mix = buildPossessiveEntries(SEED, POSS, [], 'all');
    expect(mix.length).toBeGreaterThan(0);
    expect(mix.every((e) => !e.item.isContext)).toBe(true);
  });
});

describe('drill focus — picker on the preposition drill', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
    await db.open();
    await Promise.all(db.tables.map((tb) => tb.clear()));
    await db.prepositions.bulkPut(PREPS);
  });

  afterEach(async () => {
    localStorage.clear();
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });

  /** `null` = a normal visit with no pinned seed. */
  function renderDrill(seed: string | null = SEED) {
    return render(
      <MemoryRouter>
        <PrepositionDrill seed={seed ?? undefined} />
      </MemoryRouter>,
    );
  }

  it('starts on the mix, names the mechanic of the item, and shows no level', async () => {
    renderDrill();
    const [first] = buildPrepositionEntries(SEED, PREPS);
    await waitFor(() => {
      expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(first.drill.prompt);
    });
    expect(screen.getByTestId('preposition-drill-focus-all')).toHaveAttribute('aria-pressed', 'true');
    const label = screen.getByTestId('preposition-drill-level');
    expect(['Time', 'Place', 'Movement']).toContain(label.textContent);
    expect(document.body.textContent).not.toMatch(/Level|L[123]\b/);
  });

  it('switches to one category and restarts the session there', async () => {
    renderDrill();
    await screen.findByTestId('preposition-drill-prompt');
    fireEvent.click(screen.getByTestId('preposition-drill-focus-movimento'));

    const [movimento] = buildPrepositionEntries(SEED, PREPS, 'movimento');
    await waitFor(() => {
      expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(
        movimento.drill.prompt,
      );
    });
    expect(screen.getByTestId('preposition-drill-level')).toHaveTextContent('Movement');
    expect(screen.getByTestId('preposition-drill-focus-movimento')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('remembers the choice on a normal (unseeded) visit', async () => {
    const first = renderDrill(null);
    await screen.findByTestId('preposition-drill-prompt');
    fireEvent.click(screen.getByTestId('preposition-drill-focus-movimento'));
    expect(localStorage.getItem('lg.focus.preposition')).toBe('movimento');

    // Coming back to the drill continues the same mechanic.
    first.unmount();
    renderDrill(null);
    await waitFor(() => {
      expect(screen.getByTestId('preposition-drill-level')).toHaveTextContent('Movement');
    });
    expect(screen.getByTestId('preposition-drill-focus-movimento')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('a pinned seed neither reads nor writes the remembered choice', async () => {
    localStorage.setItem('lg.focus.preposition', 'movimento');
    renderDrill();
    const [first] = buildPrepositionEntries(SEED, PREPS);
    await waitFor(() => {
      expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(first.drill.prompt);
    });
    expect(screen.getByTestId('preposition-drill-focus-all')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('preposition-drill-focus-tempo'));
    expect(screen.getByTestId('preposition-drill-focus-tempo')).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('lg.focus.preposition')).toBe('movimento');
  });

  it('ignores a stored focus it does not know', async () => {
    localStorage.setItem('lg.focus.preposition', 'nonsense');
    renderDrill(null);
    await screen.findByTestId('preposition-drill-prompt');
    expect(screen.getByTestId('preposition-drill-focus-all')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('drill focus — possessives wait for the dialogues', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
    await db.open();
    await Promise.all(db.tables.map((tb) => tb.clear()));
    await db.possessives.bulkPut(POSS);
  });

  afterEach(async () => {
    localStorage.clear();
    await Promise.all(db.tables.map((tb) => tb.clear()));
  });

  it('shows the empty state for "from a dialogue" when there are no dialogues', async () => {
    localStorage.setItem('lg.focus.possessive', 'context');
    render(
      <MemoryRouter>
        <PossessiveDrill />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('possessive-drill-empty')).toBeInTheDocument();
    expect(screen.getByTestId('possessive-drill-focus-context')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByTestId('possessive-drill-prompt')).not.toBeInTheDocument();
  });

  it('shows only dialogue items for "from a dialogue" once dialogues exist', async () => {
    await db.possessiveContext.bulkPut(CONTEXT);
    localStorage.setItem('lg.focus.possessive', 'context');
    render(
      <MemoryRouter>
        <PossessiveDrill />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('possessive-drill-level')).toHaveTextContent('From a dialogue');
    });
  });
});
