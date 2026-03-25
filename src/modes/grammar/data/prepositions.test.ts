import { describe, it, expect } from 'vitest'
import { PREPOSITIONS } from './prepositions'

describe('prepositions data', () => {
  it('has at least 30 sentences', () => {
    expect(PREPOSITIONS.length).toBeGreaterThanOrEqual(30)
  })

  it('every item has required fields', () => {
    for (const item of PREPOSITIONS) {
      expect(item.sentence.length, 'empty sentence').toBeGreaterThan(0)
      expect(item.sentence).toContain('___')
      expect(item.answer.length, 'empty answer').toBeGreaterThan(0)
      expect(item.translation.ru, 'missing ru').toBeDefined()
      expect(item.translation.en, 'missing en').toBeDefined()
      expect(item.distractors.length, 'need exactly 3 distractors').toBe(3)
    }
  })

  it('answer is not among distractors', () => {
    for (const item of PREPOSITIONS) {
      expect(
        item.distractors,
        `answer "${item.answer}" is in distractors for "${item.sentence}"`,
      ).not.toContain(item.answer)
    }
  })

  it('covers multiple prepositions', () => {
    const answers = new Set(PREPOSITIONS.map((p) => p.answer))
    // Should cover at least a few different prepositions/contractions
    expect(answers.size).toBeGreaterThanOrEqual(5)
  })
})
