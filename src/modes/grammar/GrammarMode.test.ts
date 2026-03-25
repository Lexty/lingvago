import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/index'
import { GrammarMode } from './GrammarMode'
import type { Tense } from './state'

let mode: GrammarMode

beforeEach(async () => {
  await db.sessions.clear()
  await db.grammarCardStates.clear()
  mode = new GrammarMode()
  mode.setCategories(['conjugation'])
  mode.setTenses(['presente'])
})

describe('GrammarMode.getSessionItems', () => {
  it('generates conjugation items as sentences with blanks', async () => {
    mode.setCategories(['conjugation'])
    mode.setTenses(['presente'])

    const items = await mode.getSessionItems(5)
    expect(items.length).toBe(5)

    for (const item of items) {
      expect(item.exerciseType).toBe('grammar-input')
      expect(item.payload.category).toBe('conjugation')
      expect(item.question).toContain('___')
      expect(item.question).toContain('(')
      expect(item.correctAnswer.length).toBeGreaterThan(0)
      expect(item.payload.grammarCardId).toBeDefined()
    }
  })

  it('generates gender items as multiple-choice with 2 options', async () => {
    mode.setCategories(['gender'])

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
      expect(item.payload.grammarCardId).toBeDefined()
    }
  })

  it('generates article items as sentences with 4 options', async () => {
    mode.setCategories(['articles'])

    const items = await mode.getSessionItems(5)
    expect(items.length).toBe(5)

    for (const item of items) {
      expect(item.exerciseType).toBe('multiple-choice')
      expect(item.payload.category).toBe('articles')
      expect(item.question).toContain('___')
      expect(item.options).toBeDefined()
      expect(item.options!.length).toBe(4)
    }
  })

  it('generates plural items as sentences with blanks', async () => {
    mode.setCategories(['plural'])

    const items = await mode.getSessionItems(5)
    expect(items.length).toBe(5)

    for (const item of items) {
      expect(item.exerciseType).toBe('grammar-input')
      expect(item.payload.category).toBe('plural')
      expect(item.question).toContain('___')
      expect(item.question).toContain('(')
      expect(item.correctAnswer.length).toBeGreaterThan(0)
    }
  })

  it('generates preposition items as multiple-choice with 4 options', async () => {
    mode.setCategories(['prepositions'])

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
    mode.setCategories(['conjugation', 'gender', 'plural'])
    mode.setTenses(['presente'])

    const items = await mode.getSessionItems(9)
    expect(items.length).toBe(9)

    const categories = items.map((i) => i.payload.category)
    expect(categories).toContain('conjugation')
    expect(categories).toContain('gender')
    expect(categories).toContain('plural')
  })

  it('respects tense selection for conjugation', async () => {
    mode.setCategories(['conjugation'])
    mode.setTenses(['preterito_perfeito'])

    const items = await mode.getSessionItems(10)

    for (const item of items) {
      expect(item.payload.tense).toBe('preterito_perfeito')
    }
  })

  it('uses multiple tenses when selected', async () => {
    mode.setCategories(['conjugation'])
    const tenses: Tense[] = ['presente', 'preterito_perfeito', 'preterito_imperfeito']
    mode.setTenses(tenses)

    const items = await mode.getSessionItems(30)
    const usedTenses = new Set(items.map((i) => i.payload.tense as string))

    expect(usedTenses.size).toBeGreaterThanOrEqual(2)
  })

  it('seeds grammar card states on first session', async () => {
    mode.setCategories(['gender'])

    const before = await db.grammarCardStates.where('category').equals('gender').count()
    expect(before).toBe(0)

    await mode.getSessionItems(5)

    const after = await db.grammarCardStates.where('category').equals('gender').count()
    expect(after).toBeGreaterThan(0)
  })
})

describe('GrammarMode.submitAnswer', () => {
  it('updates FSRS state on correct answer', async () => {
    mode.setCategories(['gender'])
    const items = await mode.getSessionItems(1)
    const item = items[0]
    const cardId = item.payload.grammarCardId as number

    const before = await db.grammarCardStates.get(cardId)
    expect(before!.reps).toBe(0)

    await mode.submitAnswer(item, {
      value: item.correctAnswer,
      correct: true,
      timeMs: 2000,
    })

    const after = await db.grammarCardStates.get(cardId)
    expect(after!.reps).toBe(1)
    expect(after!.due).toBeGreaterThan(before!.due)
  })

  it('updates FSRS state on wrong answer', async () => {
    mode.setCategories(['gender'])
    const items = await mode.getSessionItems(1)
    const item = items[0]
    const cardId = item.payload.grammarCardId as number

    const before = await db.grammarCardStates.get(cardId)
    expect(before!.state).toBe(0) // New

    await mode.submitAnswer(item, {
      value: 'wrong',
      correct: false,
      timeMs: 5000,
    })

    const after = await db.grammarCardStates.get(cardId)
    expect(after!.reps).toBe(1)
    expect(after!.state).not.toBe(0) // No longer New
  })
})

describe('GrammarMode.getDueCount', () => {
  it('returns 0 when no cards seeded', async () => {
    expect(await mode.getDueCount()).toBe(0)
  })

  it('returns count of due cards after seeding', async () => {
    mode.setCategories(['gender'])
    await mode.getSessionItems(5) // seeds + creates due cards

    const count = await mode.getDueCount()
    // New cards are due immediately (due = now at creation)
    expect(count).toBeGreaterThan(0)
  })
})

describe('GrammarMode.getStats', () => {
  it('returns zero stats with no sessions', async () => {
    const stats = await mode.getStats()
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
    expect(stats.averageRetention).toBe(0.8)
  })
})

describe('GrammarMode rule hints in payload', () => {
  it('conjugation items have rule in payload', async () => {
    mode.setCategories(['conjugation'])
    mode.setTenses(['presente'])

    const items = await mode.getSessionItems(5)
    for (const item of items) {
      expect(item.payload.rule).toBeDefined()
      const rule = item.payload.rule as Record<string, string>
      expect(rule.ru).toBeDefined()
      expect(rule.en).toBeDefined()
    }
  })

  it('article items have rule in payload', async () => {
    mode.setCategories(['articles'])

    const items = await mode.getSessionItems(5)
    for (const item of items) {
      expect(item.payload.rule).toBeDefined()
    }
  })

  it('gender items have hint in payload', async () => {
    mode.setCategories(['gender'])

    const items = await mode.getSessionItems(5)
    for (const item of items) {
      expect(item.payload.hint).toBe('grammar.genderQuestion')
    }
  })

  it('preposition items have hint in payload', async () => {
    mode.setCategories(['prepositions'])

    const items = await mode.getSessionItems(5)
    for (const item of items) {
      expect(item.payload.hint).toBe('grammar.prepositionQuestion')
    }
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
