/** Shared text comparison utilities for exercise components. */

export function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Strip diacritics for close-match detection */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []
  for (let i = 0; i <= a.length; i++) matrix[i] = [i]
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[a.length][b.length]
}

export function fuzzyCompare(
  input: string,
  correct: string,
  options?: { allowTypos?: boolean },
): 'exact' | 'close' | 'wrong' {
  const normInput = normalize(input)
  const normCorrect = normalize(correct)

  if (normInput === normCorrect) return 'exact'

  // Close match: same letters but different accents
  if (stripAccents(normInput) === stripAccents(normCorrect)) return 'close'

  // Close match: Levenshtein distance ≤ 1 (opt-out for vocabulary where 1-char
  // differences like gata/gato, falo/fala are distinct words, not typos)
  if (options?.allowTypos !== false && normInput.length > 2 && levenshtein(normInput, normCorrect) <= 1) return 'close'

  return 'wrong'
}
