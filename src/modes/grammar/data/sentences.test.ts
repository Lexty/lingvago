import { describe, it, expect } from 'vitest'
import { CONJUGATION_TEMPLATES, ARTICLE_TEMPLATES, PLURAL_TEMPLATES } from './sentences'
import type { Tense, Person } from './verbs'

const TENSES: Tense[] = ['presente', 'preterito_perfeito', 'preterito_imperfeito']
const PERSONS: Person[] = ['eu', 'tu', 'ele_ela', 'nos', 'eles_elas']

describe('conjugation templates', () => {
  it('has at least 2 templates for each person×tense combination', () => {
    for (const person of PERSONS) {
      for (const tense of TENSES) {
        const matching = CONJUGATION_TEMPLATES.filter(
          (t) => t.person === person && t.tense === tense,
        )
        expect(
          matching.length,
          `Need at least 2 templates for ${person} ${tense}, got ${matching.length}`,
        ).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('every template has {verb} placeholder and ___', () => {
    for (const t of CONJUGATION_TEMPLATES) {
      expect(t.template, `Missing {verb} in: ${t.template}`).toContain('{verb}')
      expect(t.template, `Missing ___ in: ${t.template}`).toContain('___')
      expect(t.translation.ru).toBeDefined()
      expect(t.translation.en).toBeDefined()
    }
  })
})

describe('article templates', () => {
  it('has templates for all article types', () => {
    const types = new Set(ARTICLE_TEMPLATES.map((t) => t.articleType))
    expect(types).toContain('def')
    expect(types).toContain('indef')
    expect(types).toContain('defPl')
    expect(types).toContain('indefPl')
  })

  it('every template has {noun} placeholder and ___', () => {
    for (const t of ARTICLE_TEMPLATES) {
      expect(t.template, `Missing {noun} in: ${t.template}`).toContain('{noun}')
      expect(t.template, `Missing ___ in: ${t.template}`).toContain('___')
      expect(t.translation.ru).toBeDefined()
      expect(t.translation.en).toBeDefined()
    }
  })
})

describe('plural templates', () => {
  it('has at least 8 templates', () => {
    expect(PLURAL_TEMPLATES.length).toBeGreaterThanOrEqual(8)
  })

  it('every template has {noun} placeholder and ___', () => {
    for (const t of PLURAL_TEMPLATES) {
      expect(t.template, `Missing {noun} in: ${t.template}`).toContain('{noun}')
      expect(t.template, `Missing ___ in: ${t.template}`).toContain('___')
      expect(t.translation.ru).toBeDefined()
      expect(t.translation.en).toBeDefined()
    }
  })
})
