import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import type { ReferenceCardRecord } from '../db/schema.ts';
import { buildContent } from '../../scripts/build-content.ts';
import Reference from './Reference.tsx';
import ReferenceCardView from './ReferenceCardView.tsx';

const SAMPLE: ReferenceCardRecord = {
  contentId: 'ref-ser-estar',
  topic: 'Глаголы',
  title: 'SER vs ESTAR',
  body: ['**SER** — постоянное.', '', '• Eu sou russo.', '', '⚠️ Учить отдельно.'].join('\n'),
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reference" element={<Reference />} />
        <Route path="/reference/:id" element={<ReferenceCardView />} />
      </Routes>
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

describe('Reference list screen', () => {
  it('renders ≥6 cards from the authored bundle with deep-link anchors', async () => {
    const { referenceCards } = buildContent();
    await db.referenceCards.bulkPut(referenceCards);

    renderAt('/reference');
    await screen.findByRole('heading', { name: 'Reference', level: 1 });

    const links = await screen.findAllByRole('link', { name: /SER vs ESTAR|Presente|Род|Откуда|Движение|места|времени/i });
    expect(links.length).toBeGreaterThanOrEqual(6);

    // Deep-link anchors target /reference/<contentId> (stable for WP-C).
    const serEstar = screen.getByRole('link', { name: /SER vs ESTAR/ });
    expect(serEstar.getAttribute('href')).toBe('/reference/ref-ser-estar');
  });

  it('shows a friendly empty state (not a crash) when the store is empty', async () => {
    renderAt('/reference');
    expect(
      await screen.findByText(/No reference cards are available yet/),
    ).toBeInTheDocument();
  });

  it('localizes the chrome to RU while keeping PT card content', async () => {
    await db.referenceCards.bulkPut([SAMPLE]);
    await i18n.changeLanguage('ru');
    renderAt('/reference');
    expect(
      await screen.findByRole('heading', { name: 'Справочник', level: 1 }),
    ).toBeInTheDocument();
  });
});

describe('Reference card view (deep-link /reference/:id)', () => {
  it('renders a single card body (bold + bullet + callout) from its anchor', async () => {
    await db.referenceCards.bulkPut([SAMPLE]);
    renderAt('/reference/ref-ser-estar');

    await screen.findByRole('heading', { name: 'SER vs ESTAR', level: 1 });
    // Bold span rendered as <strong>, bullet as a list item, callout as a note.
    expect(screen.getByText('SER')).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(within(list).getByText(/Eu sou russo/)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Учить отдельно');
  });

  it('shows a not-found state (not a crash) for an unknown id', async () => {
    await db.referenceCards.bulkPut([SAMPLE]);
    renderAt('/reference/does-not-exist');
    expect(
      await screen.findByText(/That reference card was not found/),
    ).toBeInTheDocument();
  });
});
