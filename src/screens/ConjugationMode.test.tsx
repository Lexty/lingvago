import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import type { ConjugationTableRecord, VerbRecord } from '../db/schema.ts';
import {
  generateSession,
  projectVerbData,
} from '../modes/conjugation/index.ts';
import ConjugationMode from './ConjugationMode.tsx';

const SEED = 'unit-conj-seed';

// A small, fully exam-eligible content fixture: regular -ar/-er/-ir verbs (rule
// path) + one verified-table irregular (`ser`). Mirrors the shipped store shape.
const VERBS: VerbRecord[] = [
  vr('falar', '-ar', true, false, false),
  vr('comer', '-er', true, false, false),
  vr('abrir', '-ir', true, true, false),
  vr('ser', '-er', false, true, false),
];
const TABLES: ConjugationTableRecord[] = [
  ct('ser', '-er', false, {
    eu: 'sou',
    tu: 'és',
    voce_ele_ela: 'é',
    nos: 'somos',
    voces_eles_elas: 'são',
  }),
];

function vr(
  infinitive: string,
  group: string,
  regular: boolean,
  hasTable: boolean,
  needsTableReview: boolean,
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

function ct(
  infinitive: string,
  group: string,
  regular: boolean,
  forms: ConjugationTableRecord['forms'],
): ConjugationTableRecord {
  return { contentId: `conj:${infinitive}:presente`, infinitive, tense: 'presente', group, regular, forms };
}

function expectedItems() {
  return generateSession(SEED, projectVerbData(VERBS, TABLES), { count: 10 });
}

/** The first generated item of each task type (both must exist for this seed). */
function itemOfType<T extends 'fill-form' | 'assemble-table'>(type: T) {
  const item = expectedItems().find((i) => i.type === type);
  if (!item) {
    throw new Error(`fixture seed "${SEED}" produced no ${type} item`);
  }
  return item as Extract<ReturnType<typeof expectedItems>[number], { type: T }>;
}

function renderMode(seed = SEED) {
  return render(
    <MemoryRouter>
      <ConjugationMode seed={seed} />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
  await db.verbs.bulkPut(VERBS);
  await db.conjugationTables.bulkPut(TABLES);
});

afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('ConjugationMode screen', () => {
  it('renders the title and the first deterministic prompt', async () => {
    renderMode();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Conjugation' }),
    ).toBeInTheDocument();
    const [first] = expectedItems();
    await waitFor(() => {
      expect(screen.getByTestId('conjugation-prompt')).toHaveTextContent(first.prompt);
    });
  });

  it('accepts a correct answer, shows positive feedback, and logs an attempt', async () => {
    renderMode();
    const [first] = expectedItems();
    await waitFor(() => {
      expect(screen.getByTestId('conjugation-prompt')).toHaveTextContent(first.prompt);
    });

    if (first.type === 'fill-form') {
      fireEvent.change(screen.getByLabelText('Your answer'), {
        target: { value: first.expected },
      });
    } else {
      for (const person of first.persons) {
        fireEvent.change(screen.getByTestId(`conjugation-input-${person}`), {
          target: { value: first.expected[person] },
        });
      }
    }
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByTestId('conjugation-feedback')).toHaveTextContent('Correct');

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(1);
    });
    const row = (await db.attempts.toArray())[0];
    expect(row.correct).toBe(true);
    expect(row.skill).toBe('conjugation');
    expect(row.channel).toBe('production');
    expect(row.level).toBe('present');
    // mastery roll-up was written for this attempt's subskill.
    expect(await db.skillMastery.count()).toBe(1);
  });

  it('rejects a wrong answer and reveals the reference answer', async () => {
    renderMode();
    const [first] = expectedItems();
    await waitFor(() => {
      expect(screen.getByTestId('conjugation-prompt')).toHaveTextContent(first.prompt);
    });

    if (first.type === 'fill-form') {
      fireEvent.change(screen.getByLabelText('Your answer'), {
        target: { value: 'definitely-wrong' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
      expect(screen.getByTestId('conjugation-feedback')).toHaveTextContent(first.expected);
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
      // The full reference table is revealed (first person's form appears).
      expect(screen.getByTestId('conjugation-feedback')).toHaveTextContent(
        first.expected[first.persons[0]],
      );
    }

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(1);
    });
    expect((await db.attempts.toArray())[0].correct).toBe(false);
  });

  it('advances to the next item on Next (and persists the checked attempt)', async () => {
    renderMode();
    const items = expectedItems();
    await waitFor(() => {
      expect(screen.getByTestId('conjugation-prompt')).toHaveTextContent(items[0].prompt);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    // The Check fires an async attempt write — flush it INSIDE act() (await the
    // persisted row) before navigating, so there is no un-act()-wrapped update
    // and the Check→Next logging path is actually asserted.
    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByTestId('conjugation-prompt')).toHaveTextContent(items[1].prompt);
  });

  // Advance from the current item to the FIRST item whose prompt is `prompt`,
  // playing each intervening item (Check → flush the async attempt write inside
  // act() via waitFor → Next) so there is no un-act()-wrapped state update.
  async function advanceToPrompt(prompt: string) {
    while (screen.getByTestId('conjugation-prompt').textContent !== prompt) {
      const before = await db.attempts.count();
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
      await waitFor(async () => {
        expect(await db.attempts.count()).toBe(before + 1);
      });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
  }

  it('deterministically exercises BOTH task types end-to-end (fill-form + assemble-table)', async () => {
    // The fixture seed must produce at least one of each type so neither the
    // single-form input nor the 5-person assemble-table grid path goes untested.
    const types = expectedItems().map((i) => i.type);
    expect(types).toContain('fill-form');
    expect(types).toContain('assemble-table');

    // Drive the FILL-FORM path: advance to the first fill-form item, answer it
    // correctly, and assert positive feedback (production single-input flow).
    const fill = itemOfType('fill-form');
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('conjugation-prompt')).toHaveTextContent(
        expectedItems()[0].prompt,
      );
    });
    await advanceToPrompt(fill.prompt);
    fireEvent.change(screen.getByLabelText('Your answer'), {
      target: { value: fill.expected },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('conjugation-feedback')).toHaveTextContent('Correct');
    // Flush the final attempt write inside act() so no update leaks past the test.
    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
  });

  it('drives the assemble-table 5-person grid with correct production input', async () => {
    // The first item for this seed is an assemble-table task; type all 5 forms.
    const table = itemOfType('assemble-table');
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('conjugation-prompt')).toHaveTextContent(
        expectedItems()[0].prompt,
      );
    });
    await advanceToPrompt(table.prompt);
    // Five distinct person inputs must be present and individually fillable.
    for (const person of table.persons) {
      fireEvent.change(screen.getByTestId(`conjugation-input-${person}`), {
        target: { value: table.expected[person] },
      });
    }
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('conjugation-feedback')).toHaveTextContent('Correct');
    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
  });

  it('renders a graceful empty state when no content is loaded (error path)', async () => {
    // No verbs / tables in the stores → empty session, no crash.
    await Promise.all(db.tables.map((t) => t.clear()));
    renderMode('empty-seed');
    // The empty state shows immediately (verbs undefined → no items), but the
    // useLiveQuery still resolves to [] asynchronously; await that settle so its
    // state update happens inside act() (no leaked un-act()-wrapped warning).
    const emptyState = await screen.findByText('No items in this session.');
    expect(emptyState).toBeInTheDocument();
    // Await a DB round-trip inside act() so the pending useLiveQuery resolution
    // (undefined → []) settles here rather than leaking an un-act()-wrapped
    // update after the test body returns.
    await waitFor(async () => {
      expect(await db.verbs.count()).toBe(0);
      expect(screen.getByRole('status')).toHaveTextContent('No items in this session.');
    });
  });
});
