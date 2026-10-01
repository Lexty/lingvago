import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { PACKS } from '../packs/index.ts';
import Home, { HOME_VIEW_STORAGE_KEY, TOPICS } from './Home.tsx';

function renderHome() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Home', () => {
  it('opens by lesson: the unit packs first, then the library of drills', () => {
    renderHome();
    expect(screen.getByTestId('home-view-lessons')).toHaveAttribute('aria-pressed', 'true');
    for (const pack of PACKS) {
      expect(screen.getByTestId(`home-pack-${pack.id}`)).toHaveAttribute('href', `/pack/${pack.id}`);
    }
    expect(screen.getByRole('heading', { level: 2, name: 'Lessons' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'All mechanics' })).toBeInTheDocument();
  });

  it('switches to a flat list of mechanics tagged by unit, and remembers the choice', () => {
    renderHome();
    fireEvent.click(screen.getByTestId('home-view-mechanics'));
    expect(screen.getByTestId('home-view-mechanics')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('home-pack-unit-18')).not.toBeInTheDocument();
    for (const group of PACKS[0].groups) {
      expect(screen.getByTestId(`home-group-unit-18-${group.id}`)).toHaveAttribute(
        'href',
        `/pack/unit-18/${group.id}`,
      );
    }
    // The six drills are in both views.
    for (const topic of TOPICS) {
      expect(screen.getByTestId(`home-topic-${topic.id}`)).toBeInTheDocument();
    }
    expect(localStorage.getItem(HOME_VIEW_STORAGE_KEY)).toBe('mechanics');
  });

  it('falls back to the lesson view for an unknown stored value', () => {
    localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'nonsense');
    renderHome();
    expect(screen.getByTestId('home-view-lessons')).toHaveAttribute('aria-pressed', 'true');
  });

  it('lists every mechanic as a link to its drill', () => {
    renderHome();
    expect(TOPICS).toHaveLength(6);
    for (const topic of TOPICS) {
      expect(screen.getByTestId(`home-topic-${topic.id}`)).toHaveAttribute('href', topic.to);
    }
  });

  it('links to the reference and the settings', () => {
    renderHome();
    expect(screen.getByRole('link', { name: 'Reference' })).toHaveAttribute('href', '/reference');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it('has no exam surface: no scores, thresholds, verdict or mock', () => {
    renderHome();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/exam|mock|verdict|score/i);
  });
});
