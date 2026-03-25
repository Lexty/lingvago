import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/index'
import { GrammarMode } from './GrammarMode'
import { setCategories, setTenses } from './state'
import type { Tense } from './state'

const mode = new GrammarMode()

beforeEach(async () => {
  await db.sessions.clear()
  // Reset to defaults
  setCategories(['conjugation'])
  setTenses(['presente'])
})

describe('GrammarMode.getSessionItems', () => {
  it('generates conjugation items with correct structure', async () => {
    setCategories(['conjugation'])
    setTenses(['presente'])

    const items = await mode.getSessionItems(5)
    expect(items.length).toBe(5)

    for (const item of items) {
      expect(item.exerciseType).toBe('grammar-input')
      expect(item.payload.category).toBe('conjugation')
      expect(item.payload.tense).toBe('presente')
      expect(typeof item.payload.person).toBe('string')
      expect(typeof item.payload.personLabel).toBe('string')
      expect(item.question.length).toBeGreaterThan(0)
      expect(item.correctAnswer.length).toBeGreaterThan(0)
    }
  })

  it('generates gender items as multiple-choice with 2 options', async () => {
    setCategories(['gender'])

    const items = await mode.getSessionItems(5)
    expect(items.length).toBe(5)

    for (const item of items) {
      expect(item.exerciseType).toBe('multiple-choice')
      expect(item.payload.category).toBe('gender')
      expect(item.options).toBeDefined()
      expect(item.options!.length).toBe(2)
      expect(item.options).toContain('masculino')
      expect(item.options).toContain('feminino')
      expect(['masculino', 'feminino']).toContain(item.correctAnswer)
    }
  })

  it('generates article items as multiple-choice with 2 options', async () => {
    setCategories(['articles'])

    const items = await mode.getSessionItems(5)
    expect(items.length).toBe(5)

    for (const item of items) {
      expect(item.exerciseType).toBe('multiple-choice')
      expect(item.payload.category).toBe('articles')
      expect(item.options).toBeDefined()
      expect(item.options!.length).toBe(2)
    }
  })

  it('generates plural items as grammar-input', async () => {
    setCategories(['plural'])

    const items = await mode.getSessionItems(5)
    expect(items.length).toBe(5)

    for (const item of items) {
      expect(item.exerciseType).toBe('grammar-input')
      expect(item.payload.category).toBe('plural')
      expect(item.question.length).toBeGreaterThan(0)
      expect(item.correctAnswer.length).toBeGreaterThan(0)
    }
  })

  it('generates preposition items as multiple-choice with 4 options', async () => {
    setCategories(['prepositions'])

    const items = await mode.getSessionItems(5)
    expect(items.length).toBe(5)

    for (const item of items) {
      expect(item.exerciseType).toBe('multiple-choice')
      expect(item.payload.category).toBe('prepositions')
      expect(item.options).toBeDefined()
      expect(item.options!.length).toBe(4)
      expect(item.options).toContain(item.correctAnswer)
    }
  })

  it('distributes items across multiple categories', async () => {
    setCategories(['conjugation', 'gender', 'plural'])
    setTenses(['presente'])

    const items = await mode.getSessionItems(9)
    expect(items.length).toBe(9)

    const categories = items.map((i) => i.payload.category)
    expect(categories).toContain('conjugation')
    expect(categories).toContain('gender')
    expect(categories).toContain('plural')
  })

  it('respects tense selection for conjugation', async () => {
    setCategories(['conjugation'])
    setTenses(['preterito_perfeito'])

    const items = await mode.getSessionItems(10)

    for (const item of items) {
      expect(item.payload.tense).toBe('preterito_perfeito')
    }
  })

  it('uses multiple tenses when selected', async () => {
    setCategories(['conjugation'])
    const tenses: Tense[] = ['presente', 'preterito_perfeito', 'preterito_imperfeito']
    setTenses(tenses)

    const items = await mode.getSessionItems(30)
    const usedTenses = new Set(items.map((i) => i.payload.tense as string))

    // With 30 items and 3 tenses, at least 2 should be used
    expect(usedTenses.size).toBeGreaterThanOrEqual(2)
  })
})

describe('GrammarMode.getDueCount', () => {
  it('returns -1 (always available)', async () => {
    expect(await mode.getDueCount()).toBe(-1)
  })
})

describe('GrammarMode.getStats', () => {
  it('returns zero stats with no sessions', async () => {
    const stats = await mode.getStats()
    expect(stats.totalItems).toBe(0)
    expect(stats.totalReviews).toBe(0)
    expect(stats.averageRetention).toBe(0)
  })

  it('aggregates stats from sessions', async () => {
    await db.sessions.add({
      modeId: 'grammar',
      startedAt: Date.now() - 10000,
      finishedAt: Date.now(),
      totalCards: 10,
      correctCards: 8,
    })

    const stats = await mode.getStats()
    expect(stats.totalReviews).toBe(10)
    expect(stats.averageRetention).toBe(0.8)
  })
})

describe('GrammarMode.exerciseComponents', () => {
  it('has grammar-input and multiple-choice components', () => {
    expect(mode.exerciseComponents['grammar-input']).toBeDefined()
    expect(mode.exerciseComponents['multiple-choice']).toBeDefined()
  })
})

describe('GrammarMode.setupComponent', () => {
  it('has a setup component', () => {
    expect(mode.setupComponent).toBeDefined()
  })
})
