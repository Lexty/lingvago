import { describe, it, expect } from 'vitest'
import { WORD_ORDER_SENTENCES } from './word-order'

describe('word-order data', () => {
  it('has at least 25 sentences', () => {
    expect(WORD_ORDER_SENTENCES.length).toBeGreaterThanOrEqual(25)
  })

  it('every sentence has required fields', () => {
    for (const sentence of WORD_ORDER_SENTENCES) {
      expect(sentence.answers.length, 'at least one answer').toBeGreaterThanOrEqual(1)
      expect(sentence.translation.ru, 'missing ru').toBeDefined()
      expect(sentence.translation.en, 'missing en').toBeDefined()
    }
  })

  it('every answer has at least 4 words', () => {
    for (const sentence of WORD_ORDER_SENTENCES) {
      for (const answer of sentence.answers) {
        const words = answer.replace(/[.!?]+$/, '').trim().split(/\s+/)
        expect(words.length, `too short: "${answer}"`).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('every answer ends with punctuation', () => {
    for (const sentence of WORD_ORDER_SENTENCES) {
      for (const answer of sentence.answers) {
        expect(answer, `no punctuation: "${answer}"`).toMatch(/[.!?]$/)
      }
    }
  })

  it('no duplicate primary answers', () => {
    const primaries = WORD_ORDER_SENTENCES.map((s) => s.answers[0].toLowerCase())
    expect(new Set(primaries).size).toBe(primaries.length)
  })

  it('alternate answers differ from primary', () => {
    for (const sentence of WORD_ORDER_SENTENCES) {
      const primary = sentence.answers[0].toLowerCase()
      for (const alt of sentence.answers.slice(1)) {
        expect(alt.toLowerCase(), `alternate same as primary: "${alt}"`).not.toBe(primary)
      }
    }
  })
})
