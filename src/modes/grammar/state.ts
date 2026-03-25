export type GrammarCategory = 'conjugation' | 'gender' | 'articles' | 'plural' | 'prepositions'
export type Tense = 'presente' | 'preterito_perfeito' | 'preterito_imperfeito'

let currentCategories: GrammarCategory[] = ['conjugation']
let currentTenses: Tense[] = ['presente']

export function setCategories(categories: GrammarCategory[]): void {
  currentCategories = categories
}

export function getCategories(): GrammarCategory[] {
  return currentCategories
}

export function setTenses(tenses: Tense[]): void {
  currentTenses = tenses
}

export function getTenses(): Tense[] {
  return currentTenses
}
