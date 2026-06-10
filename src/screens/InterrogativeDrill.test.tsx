import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import type { InterrogativeRecord } from '../db/schema.ts';
import InterrogativeDrill, {
  buildInterrogativeEntries,
  glossLangFor,
} from './InterrogativeDrill.tsx';

function rec(over: Partial<InterrogativeRecord>): InterrogativeRecord {
  return {
    contentId: 'int:0000',
    blankSentence: '___ moras?',
    answer: 'onde',
    category: 'where',
    gloss_ru: 'где',
    gloss_en: 'where',
    source: 'test',
    sourceLine: 1,
    ...over,
  };
}

// A verified-eligible fixture spanning a wh meaning-confusion set (so a
// parity-feasible MC can assemble) + the quanto-family gender contrast + a
// multi-word production-only form, with single `___` blanks (AC5). It yields BOTH
// production and MC items across the L1→L3 walk for the pinned seed.
const RECORDS: InterrogativeRecord[] = [
  rec({ contentId: 'int:onde', answer: 'onde', category: 'where', gloss_ru: 'где', gloss_en: 'where', blankSentence: '___ moras?' }),
  rec({ contentId: 'int:quem', answer: 'quem', category: 'who', gloss_ru: 'кто', gloss_en: 'who', blankSentence: '___ é ele?' }),
  rec({ contentId: 'int:como', answer: 'como', category: 'how', gloss_ru: 'как', gloss_en: 'how', blankSentence: '___ estás?' }),
  rec({
    contentId: 'int:qual',
    answer: 'qual',
    category: 'which',
    gloss_ru: 'какой',
    gloss_en: 'which',
    agreement: { number: 'sg' },
    blankSentence: '___ é a tua profissão?',
  }),
  rec({
    contentId: 'int:quantos',
    answer: 'quantos',
    category: 'how_much',
    gloss_ru: 'сколько',
    gloss_en: 'how many',
    agreement: { gender: 'm', number: 'pl', noun: 'anos' },
    blankSentence: '___ anos tens?',
  }),
  rec({
    contentId: 'int:deonde',
    answer: 'de onde',
    category: 'where_from',
    gloss_ru: 'откуда',
    gloss_en: 'where from',
    blankSentence: '___ és?',
  }),
];

const SEED = 'unit-int-seed';
const GLOSS_LANG = 'en' as const;

function entries() {
  return buildInterrogativeEntries(SEED, RECORDS, GLOSS_LANG);
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
      <InterrogativeDrill seed={seed} />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((tb) => tb.clear()));
  await db.interrogatives.bulkPut(RECORDS);
});

afterEach(async () => {
  await Promise.all(db.tables.map((tb) => tb.clear()));
});

async function advanceBy(steps: number) {
  for (let i = 0; i < steps; i++) {
    const before = await db.attempts.count();
    if (screen.queryByTestId('interrogative-drill-answer')) {
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    } else {
      fireEvent.click(screen.getAllByTestId('interrogative-drill-option')[0]);
    }
    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  }
}

describe('glossLangFor — maps the UI language to the gloss language', () => {
  it('returns ru only for a ru… tag, else en', () => {
    expect(glossLangFor('ru')).toBe('ru');
    expect(glossLangFor('ru-RU')).toBe('ru');
    expect(glossLangFor('en')).toBe('en');
    expect(glossLangFor('en-GB')).toBe('en');
    expect(glossLangFor('fr')).toBe('en');
    expect(glossLangFor(undefined)).toBe('en');
  });
});

describe('InterrogativeDrill screen', () => {
  it('renders the title, the level indicator, and the first deterministic cue prompt', async () => {
    renderMode();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Question words' }),
    ).toBeInTheDocument();
    const [first] = entries();
    await waitFor(() => {
      expect(screen.getByTestId('interrogative-drill-prompt')).toHaveTextContent(
        first.drill.prompt,
      );
    });
    expect(screen.getByTestId('interrogative-drill-level')).toHaveTextContent(
      `Level ${first.level}`,
    );
  });

  it('grades a correct PRODUCTION answer, logs an attempt + mastery, and deep-links to ref-interrogative', async () => {
    const idx = indexOfMode('production');
    const prod = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('interrogative-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);
    expect(screen.getByTestId('interrogative-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    fireEvent.change(screen.getByTestId('interrogative-drill-answer'), {
      target: { value: prod.drill.answer },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('interrogative-drill-feedback')).toHaveTextContent('Correct');

    // Opening the rule shows the reference card as an IN-DRILL overlay (no route
    // navigation); the target is always ref-interrogative. Closing returns to the
    // same drill item.
    const expectedRef = prod.referenceId;
    expect(expectedRef).toBe('ref-interrogative');
    await db.referenceCards.put({
      contentId: expectedRef,
      topic: 'interrogative',
      title: 'Question words rule card',
      body: 'The table + rules.',
    });
    fireEvent.click(screen.getByTestId('interrogative-drill-ref-link'));
    await waitFor(() => {
      expect(
        screen.getByTestId('interrogative-drill-rule-overlay').querySelector('[data-content-id]'),
      ).toHaveAttribute('data-content-id', expectedRef);
    });
    fireEvent.click(screen.getByTestId('interrogative-drill-rule-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('interrogative-drill-rule-overlay')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('interrogative-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    const row = (await db.attempts.toArray())[before];
    expect(row.correct).toBe(true);
    expect(row.skill).toBe('interrogative');
    expect(row.channel).toBe('production');
    expect(['L1', 'L2', 'L3']).toContain(row.level);
    expect(await db.skillMastery.count()).toBeGreaterThanOrEqual(1);
  });

  it('grades an MC item via option click and records the recognition channel', async () => {
    const idx = indexOfMode('mc');
    const mc = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('interrogative-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);
    expect(screen.getByTestId('interrogative-drill-prompt')).toHaveTextContent(mc.drill.prompt);

    const options = screen.getAllByTestId('interrogative-drill-option');
    const correctBtn = options.find((b) => b.getAttribute('data-correct') === 'true');
    expect(correctBtn).toBeDefined();
    const before = await db.attempts.count();
    fireEvent.click(correctBtn!);
    expect(screen.getByTestId('interrogative-drill-feedback')).toHaveTextContent('Correct');

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
      expect(screen.getByTestId('interrogative-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);
    expect(screen.getByTestId('interrogative-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    fireEvent.change(screen.getByTestId('interrogative-drill-answer'), {
      target: { value: 'definitely-wrong' },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('interrogative-drill-feedback')).toHaveTextContent(prod.drill.answer);

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
      expect(await db.interrogatives.count()).toBe(0);
    });
  });
});
