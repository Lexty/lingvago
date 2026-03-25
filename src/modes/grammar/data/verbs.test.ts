import { describe, it, expect } from 'vitest'
import { VERBS, PERSON_LABELS, TENSE_LABELS, type Tense, type Person } from './verbs'

const TENSES: Tense[] = ['presente', 'preterito_perfeito', 'preterito_imperfeito']
const PERSONS: Person[] = ['eu', 'tu', 'ele_ela', 'nos', 'eles_elas']

describe('verbs data', () => {
  it('has at least 20 verbs', () => {
    expect(VERBS.length).toBeGreaterThanOrEqual(20)
  })

  it('every verb has all required fields', () => {
    for (const verb of VERBS) {
      expect(verb.infinitive.length).toBeGreaterThan(0)
      expect(verb.translation.ru).toBeDefined()
      expect(verb.translation.en).toBeDefined()
    }
  })

  it('every verb has all 3 tenses × 5 persons', () => {
    for (const verb of VERBS) {
      for (const tense of TENSES) {
        expect(verb.conjugations[tense]).toBeDefined()
        for (const person of PERSONS) {
          const form = verb.conjugations[tense][person]
          expect(form, `${verb.infinitive} ${tense} ${person}`).toBeDefined()
          expect(form.length, `${verb.infinitive} ${tense} ${person} is empty`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('no duplicate infinitives', () => {
    const infinitives = VERBS.map((v) => v.infinitive)
    expect(new Set(infinitives).size).toBe(infinitives.length)
  })

  it('spot-check known conjugations', () => {
    const falar = VERBS.find((v) => v.infinitive === 'falar')!
    expect(falar).toBeDefined()
    expect(falar.conjugations.presente.eu).toBe('falo')
    expect(falar.conjugations.presente.nos).toBe('falamos')
    expect(falar.conjugations.preterito_perfeito.eu).toBe('falei')

    const ser = VERBS.find((v) => v.infinitive === 'ser')!
    expect(ser).toBeDefined()
    expect(ser.conjugations.presente.eu).toBe('sou')
    expect(ser.conjugations.presente.tu).toBe('és')
    expect(ser.conjugations.presente.eles_elas).toBe('são')

    const ter = VERBS.find((v) => v.infinitive === 'ter')!
    expect(ter).toBeDefined()
    expect(ter.conjugations.presente.eu).toBe('tenho')
    expect(ter.conjugations.preterito_perfeito.eu).toBe('tive')
  })

  it('PERSON_LABELS covers all persons', () => {
    for (const person of PERSONS) {
      expect(PERSON_LABELS[person]).toBeDefined()
    }
  })

  it('TENSE_LABELS covers all tenses', () => {
    for (const tense of TENSES) {
      expect(TENSE_LABELS[tense]).toBeDefined()
    }
  })
})
