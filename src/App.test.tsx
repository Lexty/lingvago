import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.tsx';

describe('App', () => {
  it('renders the home screen (the list of mechanics) at / without crashing', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'What shall we practise?', level: 1 }),
    ).toBeInTheDocument();
  });
});
