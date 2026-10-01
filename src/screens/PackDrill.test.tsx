import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import { buildSession, findPack } from '../packs/index.ts';
import Pack from './Pack.tsx';
import PackDrill from './PackDrill.tsx';

const SEED = 'unit-pack-seed';
const pack = findPack('unit-18')!;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pack/:packId" element={<Pack />} />
        <Route path="/pack/:packId/:groupId" element={<PackDrill />} />
      </Routes>
    </MemoryRouter>,
  );
}

function type(value: string) {
  fireEvent.change(screen.getByTestId('pack-drill-answer'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((tb) => tb.clear()));
});

afterEach(async () => {
  await Promise.all(db.tables.map((tb) => tb.clear()));
});

describe('Pack overview', () => {
  it('lists every mechanic of the unit, the linked drill and the mix', () => {
    renderAt('/pack/unit-18');
    expect(screen.getByRole('heading', { level: 1, name: 'Comparisons and trips' })).toBeInTheDocument();
    for (const group of pack.groups) {
      expect(screen.getByTestId(`pack-group-${group.id}`)).toHaveAttribute(
        'href',
        `/pack/unit-18/${group.id}`,
      );
    }
    expect(screen.getByTestId('pack-group-mix')).toHaveAttribute('href', '/pack/unit-18/mix');
    expect(screen.getByRole('link', { name: /vários \/ várias/ })).toHaveAttribute(
      'href',
      '/drill/gender',
    );
  });

  it('shows a not-found state for an unknown pack', () => {
    renderAt('/pack/unit-99');
    expect(screen.getByRole('heading', { level: 1, name: 'No such lesson' })).toBeInTheDocument();
  });
});

describe('PackDrill', () => {
  it('grades a right answer, logs it, and moves on', async () => {
    const [first, second] = buildSession(pack, 'sentences', SEED);
    renderAt(`/pack/unit-18/sentences?seed=${SEED}`);
    expect(screen.getByTestId('pack-drill-prompt')).toHaveTextContent(first.exercise.prompt!);

    type(first.exercise.answer);
    expect(screen.getByTestId('pack-drill-feedback')).toHaveAttribute('data-outcome', 'correct');
    expect(screen.getByTestId('pack-drill-why')).toHaveTextContent(first.exercise.why.en);
    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(1);
    });
    const row = (await db.attempts.toArray())[0];
    expect(row).toMatchObject({
      modeId: 'pack',
      skill: 'pack:unit-18',
      subskill: 'sentences',
      taskId: first.exercise.id,
      correct: true,
      channel: 'production',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('pack-drill-prompt')).toHaveTextContent(second.exercise.prompt!);
    expect(screen.queryByTestId('pack-drill-feedback')).not.toBeInTheDocument();
    // A sentence is typed in a wrapping field, and the keyboard is back in it.
    const field = screen.getByTestId('pack-drill-answer');
    expect(field.tagName).toBe('TEXTAREA');
    await waitFor(() => {
      expect(field).toHaveFocus();
    });
  });

  it('a wrong answer shows the model answer and the reason', async () => {
    const [first] = buildSession(pack, 'sentences', SEED);
    renderAt(`/pack/unit-18/sentences?seed=${SEED}`);
    type('não sei');
    expect(screen.getByTestId('pack-drill-feedback')).toHaveAttribute('data-outcome', 'wrong');
    expect(screen.getByTestId('pack-drill-expected')).toHaveTextContent(first.exercise.answer);
    expect(screen.getByTestId('pack-drill-why')).toHaveTextContent(first.exercise.why.en);
    await waitFor(async () => {
      expect((await db.attempts.toArray())[0]).toMatchObject({ correct: false });
    });
  });

  it('right words without their accents are an accent slip, logged as such', async () => {
    const session = buildSession(pack, 'comparisons', SEED);
    const index = session.findIndex((e) => e.exercise.answer === 'tão');
    expect(index).toBeGreaterThanOrEqual(0);
    const entry = session[index];
    renderAt(`/pack/unit-18/comparisons?seed=${SEED}`);
    for (let i = 0; i < index; i++) {
      type('x');
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
    expect(screen.getByTestId('pack-drill-prompt')).toHaveTextContent(entry.exercise.prompt!);
    type('tao');
    expect(screen.getByTestId('pack-drill-feedback')).toHaveAttribute('data-outcome', 'accent');
    expect(screen.getByTestId('pack-drill-expected')).toHaveTextContent('tão');
    await waitFor(async () => {
      const rows = await db.attempts.toArray();
      expect(rows[rows.length - 1]).toMatchObject({ correct: false, errorType: 'accent' });
    });
  });

  it('accepts a valid variant and still shows the model form', async () => {
    const session = buildSession(pack, 'comparisons', SEED);
    const index = session.findIndex((e) => e.exercise.id === 'u18-comp-05');
    renderAt(`/pack/unit-18/comparisons?seed=${SEED}`);
    for (let i = 0; i < index; i++) {
      type('x');
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
    type('que');
    const feedback = screen.getByTestId('pack-drill-feedback');
    expect(feedback).toHaveAttribute('data-outcome', 'correct');
    expect(screen.getByTestId('pack-drill-expected')).toHaveTextContent('do que');
    expect(feedback).toHaveTextContent('Also correct: que');
  });

  it('a recall exercise shows the meaning as its prompt', () => {
    const [first] = buildSession(pack, 'geography', SEED);
    renderAt(`/pack/unit-18/geography?seed=${SEED}`);
    expect(screen.getByTestId('pack-drill-cue')).toHaveTextContent(first.exercise.cue!.en);
    expect(screen.queryByTestId('pack-drill-prompt')).not.toBeInTheDocument();
  });

  it('the mix runs over every group of the pack', () => {
    renderAt(`/pack/unit-18/mix?seed=${SEED}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Everything mixed' })).toBeInTheDocument();
    const [first] = buildSession(pack, 'mix', SEED);
    expect(screen.getByTestId('pack-drill-group')).toHaveTextContent(first.group.title.en);
  });

  it('an unknown group shows the empty state, not a crash', () => {
    renderAt('/pack/unit-18/nope');
    expect(screen.getByTestId('pack-drill-empty')).toBeInTheDocument();
  });
});
