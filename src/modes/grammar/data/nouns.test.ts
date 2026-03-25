import { describe, it, expect } from 'vitest'
import { NOUNS } from './nouns'

describe('nouns data', () => {
  it('has at least 40 nouns', () => {
    expect(NOUNS.length).toBeGreaterThanOrEqual(40)
  })

  it('every noun has all required fields', () => {
    for (const noun of NOUNS) {
      expect(noun.word.length, `word is empty`).toBeGreaterThan(0)
      expect(noun.translation.ru, `${noun.word} missing ru`).toBeDefined()
      expect(noun.translation.en, `${noun.word} missing en`).toBeDefined()
      expect(['masculino', 'feminino']).toContain(noun.gender)
      expect(noun.plural.length, `${noun.word} plural is empty`).toBeGreaterThan(0)
    }
  })

  it('articles match gender', () => {
    for (const noun of NOUNS) {
      if (noun.gender === 'masculino') {
        expect(noun.articles.def, `${noun.word} def`).toBe('o')
        expect(noun.articles.indef, `${noun.word} indef`).toBe('um')
        expect(noun.articles.defPl, `${noun.word} defPl`).toBe('os')
        expect(noun.articles.indefPl, `${noun.word} indefPl`).toBe('uns')
      } else {
        expect(noun.articles.def, `${noun.word} def`).toBe('a')
        expect(noun.articles.indef, `${noun.word} indef`).toBe('uma')
        expect(noun.articles.defPl, `${noun.word} defPl`).toBe('as')
        expect(noun.articles.indefPl, `${noun.word} indefPl`).toBe('umas')
      }
    }
  })

  it('no duplicate words', () => {
    const words = NOUNS.map((n) => n.word)
    expect(new Set(words).size).toBe(words.length)
  })

  it('includes both genders', () => {
    const masc = NOUNS.filter((n) => n.gender === 'masculino')
    const fem = NOUNS.filter((n) => n.gender === 'feminino')
    expect(masc.length).toBeGreaterThan(5)
    expect(fem.length).toBeGreaterThan(5)
  })

  it('includes gender exceptions (masculine ending in -a)', () => {
    const mascInA = NOUNS.filter(
      (n) => n.gender === 'masculino' && n.word.endsWith('a'),
    )
    expect(mascInA.length).toBeGreaterThan(0)
  })
})
