import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.tsx';

describe('App', () => {
  it('renders the Survival Kit landing page at / without crashing', async () => {
    render(<App />);
    // Route `/` is the Exam Survival Kit (WP-A landing page).
    expect(
      await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 }),
    ).toBeInTheDocument();
  });
});
