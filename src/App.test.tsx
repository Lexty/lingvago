import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders dashboard title', () => {
    render(<App />)
    expect(screen.getByText('Lingvago')).toBeInTheDocument()
  })
})
