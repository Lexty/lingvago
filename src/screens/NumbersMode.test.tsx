import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import { generateSession } from '../modes/numbers/index.ts';
import NumbersMode from './NumbersMode.tsx';

const SEED = 'unit-seed';

function renderMode(seed = SEED) {
  return render(
    <MemoryRouter>
      <NumbersMode seed={seed} />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});

afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('NumbersMode screen', () => {
  it('renders the title and the first deterministic prompt', () => {
    renderMode();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Numbers' }),
    ).toBeInTheDocument();
    const [first] = generateSession(SEED, { count: 10 });
    expect(screen.getByTestId('numbers-prompt')).toHaveTextContent(first.prompt);
  });

  it('accepts a correct answer, shows positive feedback, and logs an attempt', async () => {
    renderMode();
    const [first] = generateSession(SEED, { count: 10 });

    fireEvent.change(screen.getByLabelText('Your answer'), {
      target: { value: first.expected },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByTestId('numbers-feedback')).toHaveTextContent('Correct');

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(1);
    });
    const row = (await db.attempts.toArray())[0];
    expect(row.correct).toBe(true);
    expect(row.skill).toBe('numbers');
    expect(row.channel).toBe('production');
  });

  it('rejects a wrong answer and reveals the reference answer', async () => {
    renderMode();
    const [first] = generateSession(SEED, { count: 10 });

    fireEvent.change(screen.getByLabelText('Your answer'), {
      target: { value: 'definitely-wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    const feedback = screen.getByTestId('numbers-feedback');
    expect(feedback).toHaveTextContent(first.expected);

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(1);
    });
    expect((await db.attempts.toArray())[0].correct).toBe(false);
  });

  it('advances to the next item on Next', () => {
    renderMode();
    const items = generateSession(SEED, { count: 10 });

    fireEvent.change(screen.getByLabelText('Your answer'), {
      target: { value: items[0].expected },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByTestId('numbers-prompt')).toHaveTextContent(items[1].prompt);
  });

  it('empty answer is wrong and does not crash (error path)', async () => {
    renderMode();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('numbers-feedback')).toBeInTheDocument();
    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(1);
    });
    expect((await db.attempts.toArray())[0].correct).toBe(false);
  });
});
