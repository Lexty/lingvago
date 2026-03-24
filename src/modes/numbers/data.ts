/** Portuguese European numerals 0–9 999 999 */

const UNITS: Record<number, string> = {
  0: 'zero',
  1: 'um',
  2: 'dois',
  3: 'três',
  4: 'quatro',
  5: 'cinco',
  6: 'seis',
  7: 'sete',
  8: 'oito',
  9: 'nove',
  10: 'dez',
  11: 'onze',
  12: 'doze',
  13: 'treze',
  14: 'catorze',
  15: 'quinze',
  16: 'dezasseis',
  17: 'dezassete',
  18: 'dezoito',
  19: 'dezanove',
}

const TENS: Record<number, string> = {
  20: 'vinte',
  30: 'trinta',
  40: 'quarenta',
  50: 'cinquenta',
  60: 'sessenta',
  70: 'setenta',
  80: 'oitenta',
  90: 'noventa',
}

const HUNDREDS: Record<number, string> = {
  100: 'cento',
  200: 'duzentos',
  300: 'trezentos',
  400: 'quatrocentos',
  500: 'quinhentos',
  600: 'seiscentos',
  700: 'setecentos',
  800: 'oitocentos',
  900: 'novecentos',
}

/**
 * Convert a number (0–9 999 999) to European Portuguese text.
 *
 * "e" rules:
 * - Between hundreds and the rest: always
 * - After mil/milhão: when remainder < 100 or remainder is exact hundreds
 */
export function numberToText(n: number): string {
  if (n < 0) return 'menos ' + numberToText(-n)
  if (n <= 19) return UNITS[n]
  if (n < 100) {
    const ten = Math.floor(n / 10) * 10
    const unit = n % 10
    return unit === 0 ? TENS[ten] : `${TENS[ten]} e ${UNITS[unit]}`
  }
  if (n === 100) return 'cem'
  if (n < 1000) {
    const h = Math.floor(n / 100) * 100
    const rem = n % 100
    return rem === 0 ? HUNDREDS[h] : `${HUNDREDS[h]} e ${numberToText(rem)}`
  }
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000)
    const rem = n % 1000
    const prefix = thousands === 1 ? 'mil' : `${numberToText(thousands)} mil`
    if (rem === 0) return prefix
    const connector = rem < 100 || rem % 100 === 0 ? ' e ' : ' '
    return prefix + connector + numberToText(rem)
  }
  const millions = Math.floor(n / 1_000_000)
  const rem = n % 1_000_000
  const prefix = millions === 1 ? 'um milhão' : `${numberToText(millions)} milhões`
  if (rem === 0) return prefix
  const connector = rem < 100 || rem % 100 === 0 ? ' e ' : ' '
  return prefix + connector + numberToText(rem)
}

/** Normalize text for comparison: lowercase, trim, collapse spaces */
export function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

// ── Levels ──────────────────────────────────────────────

export type NumberLevel = 'hundred' | 'thousand' | 'million'

interface WeightedRange {
  min: number
  max: number
  weight: number
}

export function getRangesForLevel(level: NumberLevel): WeightedRange[] {
  switch (level) {
    case 'hundred':
      return [
        { min: 0, max: 20, weight: 3 },
        { min: 21, max: 100, weight: 3 },
      ]
    case 'thousand':
      return [
        { min: 0, max: 20, weight: 1 },
        { min: 21, max: 100, weight: 2 },
        { min: 101, max: 1_000, weight: 3 },
      ]
    case 'million':
      return [
        { min: 0, max: 100, weight: 1 },
        { min: 101, max: 1_000, weight: 2 },
        { min: 1_001, max: 10_000, weight: 2 },
        { min: 10_001, max: 1_000_000, weight: 3 },
      ]
  }
}

// Module-level state for current session level
let currentLevel: NumberLevel = 'hundred'
export function setLevel(level: NumberLevel): void {
  currentLevel = level
}
export function getLevel(): NumberLevel {
  return currentLevel
}

// ── Cheat sheet ─────────────────────────────────────────

export interface CheatGroup {
  numbers: Array<{ n: number; text: string }>
}

export function getCheatSheet(level: NumberLevel): CheatGroup[] {
  const groups: CheatGroup[] = []

  const toEntries = (nums: number[]) => nums.map((n) => ({ n, text: numberToText(n) }))

  groups.push({ numbers: toEntries([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) })
  groups.push({ numbers: toEntries([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) })
  groups.push({ numbers: toEntries([30, 40, 50, 60, 70, 80, 90, 100]) })

  if (level !== 'hundred') {
    groups.push({ numbers: toEntries([200, 300, 400, 500, 600, 700, 800, 900]) })
    groups.push({ numbers: toEntries([1_000]) })
  }

  if (level === 'million') {
    groups.push({ numbers: toEntries([1_000_000]) })
  }

  return groups
}

/** Generate a random integer in [min, max] */
export function randomInRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}
