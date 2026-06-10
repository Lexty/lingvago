import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import type { PossessiveContextRecord, PossessiveRecord } from '../db/schema.ts';
import PossessiveDrill, { buildPossessiveEntries } from './PossessiveDrill.tsx';

// A verified-eligible fixture spanning both families (determiner + dele) and
// several persons of the SAME gender+number (so a parity-feasible MC can
// assemble), with single `___` blanks (AC5). It yields BOTH production and MC
// items across the L1→L3 walk for the pinned seed.
const RECORDS: PossessiveRecord[] = [
  det('poss:0001', 'A ___ caneta é preta.', 'minha', 'eu', 'f', 'sg'),
  det('poss:0002', 'A ___ caneta é tua.', 'tua', 'tu', 'f', 'sg'),
  det('poss:0003', 'A ___ casa é grande.', 'nossa', 'nos', 'f', 'sg'),
  det('poss:0004', 'O ___ carro é novo.', 'meu', 'eu', 'm', 'sg'),
  det('poss:0005', 'O ___ carro é teu.', 'teu', 'tu', 'm', 'sg'),
  dele('poss:0006', 'A Fátima não gosta da rua ___.', 'dela'),
  dele('poss:0007', 'O João perdeu o livro ___.', 'dele'),
];

function det(
  contentId: string,
  blankSentence: string,
  answer: string,
  person: string,
  possessedGender: string,
  possessedNumber: string,
): PossessiveRecord {
  return {
    contentId,
    blankSentence,
    answer,
    person,
    kind: 'determiner',
    possessedGender,
    possessedNumber,
    hasArticle: true,
  };
}

function dele(contentId: string, blankSentence: string, answer: string): PossessiveRecord {
  return {
    contentId,
    blankSentence,
    answer,
    person: 'ele_ela_voce',
    kind: 'dele',
    possessedGender: 'f',
    possessedNumber: 'sg',
    hasArticle: true,
  };
}

// HARD L3 CONTEXT fixture (AC5/AC6): each dialogue is multi-line (`\n`), carries
// exactly one `___` blank, and its AUTHORED answer is a real possessive surface,
// so all are context-eligible. At L3 the generator draws ONLY from these (NO cue
// prefix; `production` mode). The pinned `SEED` makes the L3 walk deterministic.
const CONTEXT: PossessiveContextRecord[] = [
  ctx('ctx:0001', '— Este casaco é teu?\n— Sim, é ___.', 'meu', 'eu', 'determiner', 'eu', 'm', 'sg', 'casaco'),
  ctx('ctx:0002', '— De quem é esta mala?\n— A azul é ___, comprei-a no Porto.', 'minha', 'eu', 'determiner', 'eu', 'f', 'sg', 'mala'),
  ctx('ctx:0003', '— A irmã do João mora longe?\n— A casa ___ é em Faro.', 'dela', 'ele_ela_voce', 'dele', 'ela', 'f', 'sg', 'casa'),
];

function ctx(
  contentId: string,
  dialogue: string,
  answer: string,
  person: string,
  kind: string,
  ownerCue: string,
  possessedGender: string,
  possessedNumber: string,
  possessedNoun: string,
): PossessiveContextRecord {
  return {
    contentId,
    dialogue,
    answer,
    person,
    kind,
    ownerCue,
    possessedGender,
    possessedNumber,
    possessedNoun,
  };
}

const SEED = 'unit-poss-seed';

function entries() {
  return buildPossessiveEntries(SEED, RECORDS, CONTEXT);
}

function indexOfMode(mode: 'production' | 'mc') {
  const idx = entries().findIndex((e) => e.drill.mode === mode);
  if (idx < 0) {
    throw new Error(`fixture seed "${SEED}" produced no ${mode} item`);
  }
  return idx;
}

/** The first HARD L3 CONTEXT item (multi-line dialogue, no cue, production). */
function indexOfContext() {
  const idx = entries().findIndex((e) => e.item.isContext);
  if (idx < 0) {
    throw new Error(`fixture seed "${SEED}" produced no L3 context item`);
  }
  return idx;
}

function renderMode(seed = SEED) {
  return render(
    <MemoryRouter>
      <PossessiveDrill seed={seed} />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((tb) => tb.clear()));
  await db.possessives.bulkPut(RECORDS);
  await db.possessiveContext.bulkPut(CONTEXT);
});

afterEach(async () => {
  await Promise.all(db.tables.map((tb) => tb.clear()));
});

async function advanceBy(steps: number) {
  for (let i = 0; i < steps; i++) {
    const before = await db.attempts.count();
    if (screen.queryByTestId('possessive-drill-answer')) {
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    } else {
      fireEvent.click(screen.getAllByTestId('possessive-drill-option')[0]);
    }
    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  }
}

describe('PossessiveDrill screen', () => {
  it('renders the title, the level indicator, and the first deterministic cue prompt', async () => {
    renderMode();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Possessives' }),
    ).toBeInTheDocument();
    const [first] = entries();
    await waitFor(() => {
      expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(
        first.drill.prompt,
      );
    });
    expect(screen.getByTestId('possessive-drill-level')).toHaveTextContent(
      `Level ${first.level}`,
    );
  });

  it('grades a correct PRODUCTION answer, logs an attempt + mastery, and deep-links to ref-possessive', async () => {
    const idx = indexOfMode('production');
    const prod = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);
    expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    fireEvent.change(screen.getByTestId('possessive-drill-answer'), {
      target: { value: prod.drill.answer },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('possessive-drill-feedback')).toHaveTextContent('Correct');

    // Opening the rule shows the reference card as an IN-DRILL overlay (no route
    // navigation); the target is always ref-possessive. Closing returns to the
    // same drill item.
    const expectedRef = prod.referenceId;
    expect(expectedRef).toBe('ref-possessive');
    await db.referenceCards.put({
      contentId: expectedRef,
      topic: 'poss',
      title: 'Possessives rule card',
      body: 'The paradigm + rules.',
    });
    fireEvent.click(screen.getByTestId('possessive-drill-ref-link'));
    await waitFor(() => {
      expect(
        screen.getByTestId('possessive-drill-rule-overlay').querySelector('[data-content-id]'),
      ).toHaveAttribute('data-content-id', expectedRef);
    });
    fireEvent.click(screen.getByTestId('possessive-drill-rule-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('possessive-drill-rule-overlay')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    const row = (await db.attempts.toArray())[before];
    expect(row.correct).toBe(true);
    expect(row.skill).toBe('possessive');
    expect(row.channel).toBe('production');
    expect(['L1', 'L2', 'L3']).toContain(row.level);
    expect(await db.skillMastery.count()).toBeGreaterThanOrEqual(1);
  });

  it('grades an MC item via option click and records the recognition channel', async () => {
    const idx = indexOfMode('mc');
    const mc = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);
    expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(mc.drill.prompt);

    const options = screen.getAllByTestId('possessive-drill-option');
    const correctBtn = options.find((b) => b.getAttribute('data-correct') === 'true');
    expect(correctBtn).toBeDefined();
    const before = await db.attempts.count();
    fireEvent.click(correctBtn!);
    expect(screen.getByTestId('possessive-drill-feedback')).toHaveTextContent('Correct');

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
      expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);
    expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(prod.drill.prompt);

    fireEvent.change(screen.getByTestId('possessive-drill-answer'), {
      target: { value: 'definitely-wrong' },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('possessive-drill-feedback')).toHaveTextContent(prod.drill.answer);

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    expect((await db.attempts.toArray())[before].correct).toBe(false);
  });

  it('drives the L1→L3 walk to a HARD L3 CONTEXT item: renders the multi-line dialogue (no cue), grades it correct → attempt + mastery, and opens/closes the rule overlay to the same prompt', async () => {
    const idx = indexOfContext();
    const ctxEntry = entries()[idx];
    // The context item is a multi-line dialogue (carries `\n`) with NO cue prefix.
    expect(ctxEntry.item.isContext).toBe(true);
    expect(ctxEntry.level).toBe('L3');
    expect(ctxEntry.drill.mode).toBe('production');
    expect(ctxEntry.drill.prompt).toContain('\n');
    expect(ctxEntry.drill.prompt).not.toMatch(/^\(/); // no `(eu)`/`(tu)`/owner cue

    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);

    const promptEl = screen.getByTestId('possessive-drill-prompt');
    // Both dialogue turns are present (the multi-line dialogue rendered).
    const [turnA, turnB] = ctxEntry.drill.prompt.split('\n');
    expect(promptEl.textContent).toContain(turnA);
    expect(promptEl.textContent).toContain(turnB);
    expect(screen.getByTestId('possessive-drill-level')).toHaveTextContent('Level L3');

    fireEvent.change(screen.getByTestId('possessive-drill-answer'), {
      target: { value: ctxEntry.drill.answer },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('possessive-drill-feedback')).toHaveTextContent('Correct');

    // Rule overlay opens to ref-possessive and closing returns to the same prompt.
    const expectedRef = ctxEntry.referenceId;
    expect(expectedRef).toBe('ref-possessive');
    await db.referenceCards.put({
      contentId: expectedRef,
      topic: 'poss',
      title: 'Possessives rule card',
      body: 'The paradigm + rules.',
    });
    fireEvent.click(screen.getByTestId('possessive-drill-ref-link'));
    await waitFor(() => {
      expect(
        screen.getByTestId('possessive-drill-rule-overlay').querySelector('[data-content-id]'),
      ).toHaveAttribute('data-content-id', expectedRef);
    });
    fireEvent.click(screen.getByTestId('possessive-drill-rule-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('possessive-drill-rule-overlay')).not.toBeInTheDocument();
    });
    // Closing returns to the SAME context item (both dialogue turns still shown).
    const afterClose = screen.getByTestId('possessive-drill-prompt');
    expect(afterClose.textContent).toContain(turnA);
    expect(afterClose.textContent).toContain(turnB);

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    const row = (await db.attempts.toArray())[before];
    expect(row.correct).toBe(true);
    expect(row.skill).toBe('possessive');
    expect(row.channel).toBe('production');
    expect(row.level).toBe('L3');
    expect(await db.skillMastery.count()).toBeGreaterThanOrEqual(1);
  });

  it('rejects a WRONG answer on an L3 context item and reveals the canonical answer (error path)', async () => {
    const idx = indexOfContext();
    const ctxEntry = entries()[idx];
    renderMode();
    await waitFor(() => {
      expect(screen.getByTestId('possessive-drill-prompt')).toHaveTextContent(
        entries()[0].drill.prompt,
      );
    });
    await advanceBy(idx);

    fireEvent.change(screen.getByTestId('possessive-drill-answer'), {
      target: { value: 'definitely-wrong' },
    });
    const before = await db.attempts.count();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByTestId('possessive-drill-feedback')).toHaveTextContent(
      ctxEntry.drill.answer,
    );

    await waitFor(async () => {
      expect(await db.attempts.count()).toBe(before + 1);
    });
    const row = (await db.attempts.toArray())[before];
    expect(row.correct).toBe(false);
    expect(row.level).toBe('L3');
  });

  it('renders a graceful empty state when no content is loaded (error path)', async () => {
    await Promise.all(db.tables.map((tb) => tb.clear()));
    renderMode('empty-seed');
    const emptyState = await screen.findByText('No items in this session.');
    expect(emptyState).toBeInTheDocument();
    await waitFor(async () => {
      expect(await db.possessives.count()).toBe(0);
    });
  });
});
