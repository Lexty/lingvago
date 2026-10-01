import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import Home, { TOPICS } from './Home.tsx';

function renderHome() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home', () => {
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
