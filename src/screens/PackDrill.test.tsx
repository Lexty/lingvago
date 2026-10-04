import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('downloads the prebuilt Anki package in the interface language', async () => {
    const files: File[] = [];
    const original = URL.createObjectURL;
    URL.createObjectURL = vi.fn((file: Blob) => {
      files.push(file as File);
      return 'blob:anki';
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([80, 75, 3, 4])));
    try {
      renderAt('/pack/unit-18');
      expect(screen.getByText(`Words: ${pack.vocab!.cards.length}`)).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('pack-anki-download'));
      await waitFor(() =>
        expect(screen.getByTestId('pack-anki-status')).toHaveTextContent('File saved: lingvago-unidade-18.en.apkg'),
      );
      expect(fetchMock).toHaveBeenCalledWith('/anki/lingvago-unidade-18.en.apkg');
      expect(click).toHaveBeenCalledOnce();
      expect(files[0].name).toBe('lingvago-unidade-18.en.apkg');
    } finally {
      URL.createObjectURL = original;
      click.mockRestore();
      fetchMock.mockRestore();
    }
  });

  it('says so when the package cannot be fetched', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
    try {
      renderAt('/pack/unit-18');
      fireEvent.click(screen.getByTestId('pack-anki-download'));
      await waitFor(() => expect(screen.getByTestId('pack-anki-status')).toHaveTextContent('Could not save the file.'));
    } finally {
      fetchMock.mockRestore();
    }
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

describe('choose exercises', () => {
  it('a tap checks the meaning, marks the options and explains', async () => {
    const unit19 = findPack('unit-19')!;
    const [first] = buildSession(unit19, 'sentido', SEED);
    renderAt(`/pack/unit-19/sentido?seed=${SEED}`);
    expect(screen.getByTestId('pack-drill-prompt')).toHaveTextContent(first.exercise.prompt!);
    expect(screen.queryByTestId('pack-drill-answer')).toBeNull();
    const wrong = first.exercise.options!.find((o) => o.id !== first.exercise.answer)!;
    fireEvent.click(screen.getByTestId(`pack-drill-option-${wrong.id}`));
    const feedback = await screen.findByTestId('pack-drill-feedback');
    expect(feedback).toHaveAttribute('data-outcome', 'wrong');
    const right = first.exercise.options!.find((o) => o.id === first.exercise.answer)!;
    expect(screen.getByTestId('pack-drill-expected')).toHaveTextContent(right.text.en);
    expect(screen.getByTestId(`pack-drill-option-${right.id}`)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.queryByTestId('pack-drill-feedback')).toBeNull());
  });

  it('the lesson screen offers a mix for each block', () => {
    renderAt('/pack/unit-19');
    expect(screen.getByTestId('pack-group-mix-indefinidos')).toHaveAttribute('href', '/pack/unit-19/mix-indefinidos');
    expect(screen.queryByTestId('pack-group-mix-frases')).toBeNull();
  });

  it('after Next, the keyboard lands on the first option of the next choose exercise', async () => {
    const unit19 = findPack('unit-19')!;
    const [first, second] = buildSession(unit19, 'sentido', SEED);
    renderAt(`/pack/unit-19/sentido?seed=${SEED}`);
    fireEvent.click(screen.getByTestId(`pack-drill-option-${first.exercise.answer}`));
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByTestId('pack-drill-prompt')).toHaveTextContent(second.exercise.prompt!));
    expect(document.activeElement).toBe(screen.getByTestId(`pack-drill-option-${second.exercise.options![0].id}`));
  });

  it('from a typed exercise to a choose one, focus moves to the first option', async () => {
    const unit19 = findPack('unit-19')!;
    const block = unit19.blocks!.find((b) => b.groupIds.includes('sentido'))!;
    // Find a seed whose round has a typed exercise right before a choose one.
    const seed = Array.from({ length: 200 }, (_, i) => `f${i}`).find((candidate) => {
      const [a, b] = buildSession(unit19, `mix-${block.id}`, candidate);
      return a.group.kind !== 'choose' && b.group.kind === 'choose';
    })!;
    const [, next] = buildSession(unit19, `mix-${block.id}`, seed);
    renderAt(`/pack/unit-19/mix-${block.id}?seed=${seed}`);
    fireEvent.change(screen.getByTestId('pack-drill-answer'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByTestId('pack-drill-prompt')).toHaveTextContent(next.exercise.prompt!));
    expect(document.activeElement).toBe(screen.getByTestId(`pack-drill-option-${next.exercise.options![0].id}`));
  });

  it('many accepted answers wait behind a toggle; one or two stay inline', async () => {
    renderAt('/pack/unit-19/saber-fazer?seed=variants');
    fireEvent.change(screen.getByTestId('pack-drill-answer'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    await screen.findByTestId('pack-drill-feedback');
    const exercise = buildSession(findPack('unit-19')!, 'saber-fazer', 'variants')[0].exercise;
    const count = (exercise.accept ?? []).length;
    if (count > 2) {
      expect(screen.getByTestId('pack-drill-variants')).toHaveTextContent(`Other correct answers (${count})`);
    } else {
      expect(screen.queryByTestId('pack-drill-variants')).toBeNull();
    }
  });
});

describe('"I don\'t understand" help', () => {
  const unit19 = findPack('unit-19')!;
  const seedFor = (id: string) =>
    Array.from({ length: 300 }, (_, i) => `h${i}`).find((seed) => buildSession(unit19, 'indefinidos', seed)[0].exercise.id === id)!;

  it('opens the word meanings without checking, then the answer counts as helped', async () => {
    const seed = seedFor('u19-in-04');
    renderAt(`/pack/unit-19/indefinidos?seed=${seed}`);
    fireEvent.change(screen.getByTestId('pack-drill-answer'), { target: { value: 'na' } });
    fireEvent.click(screen.getByTestId('pack-drill-help'));
    const glosses = screen.getByTestId('pack-drill-glosses');
    expect(glosses).toHaveTextContent('frigorífico — fridge');
    expect(glosses).toHaveTextContent('vazio — empty');
    expect(glosses).not.toHaveTextContent('nothing');
    expect(screen.getByTestId('pack-drill-answer')).toHaveValue('na');
    expect(screen.queryByTestId('pack-drill-feedback')).toBeNull();
    fireEvent.change(screen.getByTestId('pack-drill-answer'), { target: { value: 'nada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    await screen.findByTestId('pack-drill-feedback');
    expect(screen.getByTestId('pack-drill-meaning')).toHaveAttribute('open');
    expect(screen.getByTestId('pack-drill-meaning')).toHaveTextContent('The fridge is empty: there is nothing to eat.');
    await waitFor(async () => expect((await db.attempts.toArray())[0]?.support).toBe('gloss'));
  });

  it('«show the answer» shows the key and meaning, logged as viewed', async () => {
    const seed = seedFor('u19-in-04');
    renderAt(`/pack/unit-19/indefinidos?seed=${seed}`);
    fireEvent.click(screen.getByTestId('pack-drill-help'));
    fireEvent.click(screen.getByTestId('pack-drill-reveal'));
    const feedback = await screen.findByTestId('pack-drill-feedback');
    expect(feedback).toHaveAttribute('data-outcome', 'revealed');
    expect(screen.getByTestId('pack-drill-expected')).toHaveTextContent('nada');
    await waitFor(async () => expect((await db.attempts.toArray())[0]?.support).toBe('answerShown'));
  });

  it('after a wrong answer the learner can say the sentence was not understood', async () => {
    const seed = seedFor('u19-in-04');
    renderAt(`/pack/unit-19/indefinidos?seed=${seed}`);
    type('ninguém');
    await screen.findByTestId('pack-drill-feedback');
    expect(screen.getByTestId('pack-drill-meaning')).not.toHaveAttribute('open');
    await waitFor(async () => expect(await db.attempts.count()).toBe(1));
    fireEvent.click(screen.getByTestId('pack-drill-self-report'));
    expect(screen.getByTestId('pack-drill-glosses')).toHaveTextContent('frigorífico — fridge');
    expect(screen.getByTestId('pack-drill-meaning')).toHaveAttribute('open');
    await waitFor(async () => expect((await db.attempts.toArray())[0]?.selfReport).toBe('didNotUnderstand'));
    expect((await db.attempts.toArray())[0]?.correct).toBe(false);
  });
});

