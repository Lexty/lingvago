import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import type { NounRecord } from '../db/schema.ts';
import GenderDrill, { buildGenderEntries } from './GenderDrill.tsx';

// A small, fully verified-eligible noun fixture spanning both genders, so the
// L1→L3 walk produces definite/indefinite/contraction items with both MC and
// production modes for the pinned seed.
const NOUNS: NounRecord[] = [
  nr('noun:livro', 'livro', 'm', 'o'),
  nr('noun:casa', 'casa', 'f', 'a'),
  nr('noun:gato', 'gato', 'm', 'o'),
  nr('noun:mesa', 'mesa', 'f', 'a'),
  nr('noun:carro', 'carro', 'm', 'o'),
];

function nr(
  contentId: string,
  lemma: string,
  gender: 'm' | 'f',
  article: 'o' | 'a',
): NounRecord {
  return { contentId, lemma, gender, article, en: null };
}

const SEED = 'unit-gender-seed';

function entries() {
  return buildGenderEntries(SEED, NOUNS);
}

/** Index of the first entry of a given drill mode (both exist for this seed). */
function indexOfMode(mode: 'production' | 'mc') {
  const idx = entries().findIndex((e) => e.drill.mode === mode);
  if (idx < 0) {
    throw new Error(`fixture seed "${SEED}" produced no ${mode} item`);
  }
  return idx;
}

function renderMode(seed = SEED) {
  return render(
    <MemoryRouter>
      <GenderDrill seed={seed} />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((tb) => tb.clear()));
  await db.nouns.bulkPut(NOUNS);
});

afterEach(async () => {
  await Promise.all(db.tables.map((tb) => tb.clear()));
});

/** Play `steps` items (Check/option-click → Next), flushing each attempt write. */
async function advanceBy(steps: number) {
  for (let i = 0; i < steps; i++) {
    const before = await db.attempts.count();
    // Submit *something* to grade the current item, regardless of its mode.
    if (screen.queryByTestId('gender-drill-answer')) {
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    } else {
      fireEvent.click(screen.getAllByTestId('gender-drill-option')[0]);
    }
    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  }
}

describe('GenderDrill screen', () => {
  it('renders the title, the level indicator, and the first deterministic prompt', async () => {
    renderMode();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Gender & articles' }),
    ).toBeInTheDocument();
    const [first] = entries();
    await waitFor(() => {
      expect(screen.getByTestId('gender-drill-prompt')).toHaveTextContent(first.drill.prompt);
    });
    expect(screen.getByTestId('gender-drill-level')).toHaveTextContent(`Level ${first.level}`);
  });

  it('grades a correct PRODUCTION answer, logs an attempt + mastery, and shows the deep-link', async () => {
    const idx = indexOfMode('production');
    const prod = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('gender-drill-prompt')).toHaveTextContent(entries()[0].drill.prompt);
    });
    await advanceBy(idx);
    expect(screen.getByTestId('gender-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    fireEvent.change(screen.getByTestId('gender-drill-answer'), {
      target: { value: prod.drill.answer },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('gender-drill-feedback')).toHaveTextContent('Correct');

    // Opening the rule shows the reference card as an IN-DRILL overlay (no route
    // navigation), so closing it returns to the exact same drill item.
    await db.referenceCards.put({
      contentId: 'ref-genero-artigo',
      topic: 'gender',
      title: 'Gender rule',
      body: 'The rule.',
    });
    fireEvent.click(screen.getByTestId('gender-drill-ref-link'));
    await waitFor(() => {
      expect(
        screen.getByTestId('gender-drill-rule-overlay').querySelector('[data-content-id]'),
      ).toHaveAttribute('data-content-id', 'ref-genero-artigo');
    });
    fireEvent.click(screen.getByTestId('gender-drill-rule-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('gender-drill-rule-overlay')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('gender-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    const row = (await db.attempts.toArray())[before];
    expect(row.correct).toBe(true);
    expect(row.skill).toBe('gender-article');
    expect(row.channel).toBe('production');
    expect(['L1', 'L2', 'L3']).toContain(row.level);
    expect(await db.skillMastery.count()).toBeGreaterThanOrEqual(1);
  });

  it('grades an MC item via option click and records the recognition channel', async () => {
    const idx = indexOfMode('mc');
    const mc = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('gender-drill-prompt')).toHaveTextContent(entries()[0].drill.prompt);
    });
    await advanceBy(idx);
    expect(screen.getByTestId('gender-drill-prompt')).toHaveTextContent(mc.drill.prompt);

    // Click the correct option (data-correct="true").
    const options = screen.getAllByTestId('gender-drill-option');
    const correctBtn = options.find((b) => b.getAttribute('data-correct') === 'true');
    expect(correctBtn).toBeDefined();
    const before = await db.attempts.count();
    fireEvent.click(correctBtn!);
    expect(screen.getByTestId('gender-drill-feedback')).toHaveTextContent('Correct');

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    const row = (await db.attempts.toArray())[before];
    expect(row.correct).toBe(true);
    expect(row.channel).toBe('recognition');
    expect(row.shownOptions?.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects a wrong PRODUCTION answer and reveals the reference answer', async () => {
    const idx = indexOfMode('production');
    const prod = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('gender-drill-prompt')).toHaveTextContent(entries()[0].drill.prompt);
    });
    await advanceBy(idx);
    expect(screen.getByTestId('gender-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    fireEvent.change(screen.getByTestId('gender-drill-answer'), {
      target: { value: 'definitely-wrong' },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('gender-drill-feedback')).toHaveTextContent(prod.drill.answer);

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    expect((await db.attempts.toArray())[before].correct).toBe(false);
  });

  it('renders a graceful empty state when no content is loaded (error path)', async () => {
    await Promise.all(db.tables.map((tb) => tb.clear()));
    renderMode('empty-seed');
    const emptyState = await screen.findByText('No items in this session.');
    expect(emptyState).toBeInTheDocument();
    await waitFor(async () => {
      expect(await db.nouns.count()).toBe(0);
    });
  });
});
