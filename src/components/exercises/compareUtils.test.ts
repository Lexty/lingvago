import { describe, it, expect } from 'vitest'
import { normalize, stripAccents, levenshtein, fuzzyCompare } from './compareUtils'

describe('normalize', () => {
  it('trims and lowercases', () => {
    expect(normalize('  Hello World  ')).toBe('hello world')
  })

  it('collapses multiple spaces', () => {
    expect(normalize('a   b  c')).toBe('a b c')
  })
})

describe('stripAccents', () => {
  it('strips Portuguese diacritics', () => {
    expect(stripAccents('informação')).toBe('informacao')
    expect(stripAccents('café')).toBe('cafe')
    expect(stripAccents('avô')).toBe('avo')
  })

  it('strips Russian ё → е', () => {
    expect(stripAccents('ёлка')).toBe('елка')
  })

  it('leaves plain ASCII unchanged', () => {
    expect(stripAccents('hello')).toBe('hello')
  })
})

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0)
  })

  it('returns length for empty vs non-empty', () => {
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
  })

  it('returns 1 for single insertion', () => {
    expect(levenshtein('casa', 'casas')).toBe(1)
  })

  it('returns 1 for single substitution', () => {
    expect(levenshtein('casa', 'caso')).toBe(1)
  })

  it('returns correct distance for longer strings', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
  })
})

describe('fuzzyCompare', () => {
  it('returns exact for identical strings', () => {
    expect(fuzzyCompare('casa', 'casa')).toBe('exact')
  })

  it('returns exact case-insensitive', () => {
    expect(fuzzyCompare('Casa', 'casa')).toBe('exact')
  })

  it('returns exact with extra whitespace', () => {
    expect(fuzzyCompare('  casa  ', 'casa')).toBe('exact')
  })

  it('returns close for accent-only difference', () => {
    expect(fuzzyCompare('informacao', 'informação')).toBe('close')
    expect(fuzzyCompare('cafe', 'café')).toBe('close')
  })

  it('returns close for Russian ё vs е', () => {
    expect(fuzzyCompare('елка', 'ёлка')).toBe('close')
  })

  it('returns close for single-char typo on words > 2 chars', () => {
    expect(fuzzyCompare('casas', 'casa')).toBe('close') // 1 insertion
    expect(fuzzyCompare('caso', 'casa')).toBe('close')  // 1 substitution
  })

  it('returns wrong for completely different strings', () => {
    expect(fuzzyCompare('gato', 'casa')).toBe('wrong')
  })

  it('returns wrong for short strings with typo (length ≤ 2)', () => {
    expect(fuzzyCompare('ab', 'ac')).toBe('wrong')
  })

  it('returns wrong for multi-char differences', () => {
    expect(fuzzyCompare('falar', 'comer')).toBe('wrong')
  })
})
