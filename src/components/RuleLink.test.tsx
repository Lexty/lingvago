import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import * as selectors from '../reference/selectors.ts';
import RuleLink from './RuleLink.tsx';

const CARD = { contentId: 'ref-x', topic: 'x', title: 'The rule', body: 'Body.' };

function renderRule() {
  return render(
    <>
      <input data-testid="behind" />
      <RuleLink referenceId="ref-x" testIdBase="t" />
    </>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((tb) => tb.clear()));
  await db.referenceCards.put(CARD);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(db.tables.map((tb) => tb.clear()));
});

describe('RuleLink', () => {
  it('opens the card, and closing returns focus to the button', async () => {
    renderRule();
    fireEvent.click(screen.getByTestId('t-ref-link'));
    await screen.findByRole('heading', { name: 'The rule' });
    expect(screen.getByTestId('t-rule-close')).toHaveFocus();

    fireEvent.click(screen.getByTestId('t-rule-close'));
    expect(screen.queryByTestId('t-rule-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('t-ref-link')).toHaveFocus();
  });

  it('closes on Escape', async () => {
    renderRule();
    fireEvent.click(screen.getByTestId('t-ref-link'));
    await screen.findByRole('heading', { name: 'The rule' });
    fireEvent.keyDown(screen.getByTestId('t-rule-close'), { key: 'Escape' });
    expect(screen.queryByTestId('t-rule-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('t-ref-link')).toHaveFocus();
  });

  it('keeps Tab inside the dialog (the drill behind cannot be reached)', async () => {
    renderRule();
    fireEvent.click(screen.getByTestId('t-ref-link'));
    await screen.findByRole('heading', { name: 'The rule' });
    const close = screen.getByTestId('t-rule-close');
    // The close button is the only control: Tab and Shift+Tab both stay on it.
    expect(fireEvent.keyDown(close, { key: 'Tab' })).toBe(false);
    expect(close).toHaveFocus();
    expect(fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(close).toHaveFocus();
    expect(screen.getByTestId('behind')).not.toHaveFocus();
  });

  it('does not re-open when the card arrives after the rule was closed', async () => {
    let resolve: (card: typeof CARD) => void = () => {};
    vi.spyOn(selectors, 'getReferenceCard').mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderRule();
    fireEvent.click(screen.getByTestId('t-ref-link'));
    fireEvent.click(screen.getByTestId('t-rule-close'));
    expect(screen.queryByTestId('t-rule-overlay')).not.toBeInTheDocument();

    await act(async () => {
      resolve(CARD);
      await Promise.resolve();
    });
    expect(screen.queryByTestId('t-rule-overlay')).not.toBeInTheDocument();
  });

  it('explains a failed load and retries', async () => {
    await db.referenceCards.clear();
    renderRule();
    fireEvent.click(screen.getByTestId('t-ref-link'));
    expect(await screen.findByText("Couldn't load the rule.")).toBeInTheDocument();

    await db.referenceCards.put(CARD);
    fireEvent.click(screen.getByTestId('t-rule-retry'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'The rule' })).toBeInTheDocument();
    });
  });

  it('keeps focus and the keyboard inside the dialog across a retry', async () => {
    let resolve: (card: typeof CARD) => void = () => {};
    vi.spyOn(selectors, 'getReferenceCard')
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        }),
      );
    renderRule();
    fireEvent.click(screen.getByTestId('t-ref-link'));
    const retry = await screen.findByTestId('t-rule-retry');
    retry.focus();
    fireEvent.click(retry);

    // Loading: the retry button is gone, focus stayed in the dialog.
    const overlay = screen.getByTestId('t-rule-overlay');
    expect(screen.queryByTestId('t-rule-retry')).not.toBeInTheDocument();
    expect(overlay.contains(document.activeElement)).toBe(true);

    await act(async () => {
      resolve(CARD);
      await Promise.resolve();
    });
    expect(screen.getByRole('heading', { name: 'The rule' })).toBeInTheDocument();
    expect(overlay.contains(document.activeElement)).toBe(true);
  });

  it('still owns Escape and Tab when focus is outside the dialog', async () => {
    renderRule();
    fireEvent.click(screen.getByTestId('t-ref-link'));
    await screen.findByRole('heading', { name: 'The rule' });

    // Focus ends up behind the overlay: Tab pulls it back into the dialog…
    const behind = screen.getByTestId('behind');
    behind.focus();
    expect(fireEvent.keyDown(behind, { key: 'Tab' })).toBe(false);
    expect(screen.getByTestId('t-rule-close')).toHaveFocus();

    // …and Escape pressed there still closes the rule.
    behind.focus();
    fireEvent.keyDown(behind, { key: 'Escape' });
    expect(screen.queryByTestId('t-rule-overlay')).not.toBeInTheDocument();
  });
});
