import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import type { PrepositionRecord } from '../db/schema.ts';
import PrepositionDrill, { buildPrepositionEntries } from './PrepositionDrill.tsx';

// A verified-eligible fixture spanning all three categories with single
// clean-token blanks (AC3). It yields BOTH production and MC items across the
// L1→L3 walk for the pinned seed.
const RECORDS: PrepositionRecord[] = [
  pr('prep:tempo:t1', 'tempo', 'a', ['Trabalho de segunda a sexta.']),
  pr('prep:tempo:t2', 'tempo', 'em', ['Estamos em maio.']),
  pr('prep:movimento:m1', 'movimento', 'para', ['Eu vou para o Brasil.']),
  pr('prep:movimento:m2', 'movimento', 'de', ['Eu saio de casa cedo.']),
  pr('prep:lugar:l1', 'lugar', 'em', ['Moro em Lisboa.']),
  pr('prep:lugar:l2', 'lugar', 'entre', ['Fica entre dois cafés.']),
];

function pr(
  contentId: string,
  category: PrepositionRecord['category'],
  prep: string,
  examples: string[],
): PrepositionRecord {
  return { contentId, category, prep, use: '', examples };
}

const SEED = 'unit-prep-seed';

function entries() {
  return buildPrepositionEntries(SEED, RECORDS);
}

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
      <PrepositionDrill seed={seed} />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((tb) => tb.clear()));
  await db.prepositions.bulkPut(RECORDS);
});

afterEach(async () => {
  await Promise.all(db.tables.map((tb) => tb.clear()));
});

async function advanceBy(steps: number) {
  for (let i = 0; i < steps; i++) {
    const before = await db.attempts.count();
    if (screen.queryByTestId('preposition-drill-answer')) {
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    } else {
      fireEvent.click(screen.getAllByTestId('preposition-drill-option')[0]);
    }
    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  }
}

describe('PrepositionDrill screen', () => {
  it('renders the title, the level indicator, and the first deterministic cloze prompt', async () => {
    renderMode();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Prepositions' }),
    ).toBeInTheDocument();
    const [first] = entries();
    await waitFor(() => {
      expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(
        first.drill.prompt,
      );
    });
    expect(screen.getByTestId('preposition-drill-level')).toHaveTextContent(
      `Level ${first.level}`,
    );
  });

  it('grades a correct PRODUCTION answer, logs an attempt + mastery, and deep-links by category', async () => {
    const idx = indexOfMode('production');
    const prod = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);
    expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    fireEvent.change(screen.getByTestId('preposition-drill-answer'), {
      target: { value: prod.drill.answer },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('preposition-drill-feedback')).toHaveTextContent('Correct');

    // Opening the rule shows the reference card as an IN-DRILL overlay (no route
    // navigation); the target id is whatever referenceIdFor computed for the item
    // (category mapping, or ref-prep-a-para for a casa idiom). Closing returns to
    // the same drill item.
    const expectedRef = prod.referenceId;
    await db.referenceCards.put({
      contentId: expectedRef,
      topic: 'prep',
      title: 'Rule card',
      body: 'The rule.',
    });
    fireEvent.click(screen.getByTestId('preposition-drill-ref-link'));
    await waitFor(() => {
      expect(
        screen.getByTestId('preposition-drill-rule-overlay').querySelector('[data-content-id]'),
      ).toHaveAttribute('data-content-id', expectedRef);
    });
    fireEvent.click(screen.getByTestId('preposition-drill-rule-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('preposition-drill-rule-overlay')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    const row = (await db.attempts.toArray())[before];
    expect(row.correct).toBe(true);
    expect(row.skill).toBe('preposition');
    expect(row.channel).toBe('production');
    expect(['L1', 'L2', 'L3']).toContain(row.level);
    expect(await db.skillMastery.count()).toBeGreaterThanOrEqual(1);
  });

  it('grades an MC item via option click and records the recognition channel', async () => {
    const idx = indexOfMode('mc');
    const mc = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);
    expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(mc.drill.prompt);

    const options = screen.getAllByTestId('preposition-drill-option');
    const correctBtn = options.find((b) => b.getAttribute('data-correct') === 'true');
    expect(correctBtn).toBeDefined();
    const before = await db.attempts.count();
    fireEvent.click(correctBtn!);
    expect(screen.getByTestId('preposition-drill-feedback')).toHaveTextContent('Correct');

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
      expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);
    expect(screen.getByTestId('preposition-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    fireEvent.change(screen.getByTestId('preposition-drill-answer'), {
      target: { value: 'definitely-wrong' },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('preposition-drill-feedback')).toHaveTextContent(prod.drill.answer);

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
      expect(await db.prepositions.count()).toBe(0);
    });
  });
});
