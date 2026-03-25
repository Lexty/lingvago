/**
 * Extract displayable translation text from exercise payload.
 *
 * Supports multiple payload shapes:
 * - { translation: Record<string, string> } — direct word/sentence translation
 * - { translation: Record<string, string>, verbTranslation: Record<string, string> }
 *   — conjugation template with verb substitution
 *
 * Returns null if no translation data is present.
 */
export function getTranslationText(
  payload: Record<string, unknown>,
  language: string,
): string | null {
  const translation = payload.translation as Record<string, string> | undefined
  if (!translation) return null

  let text = translation[language] ?? translation.en ?? translation.ru
  if (!text) return null

  // For conjugation: substitute verb translation into template
  const verbTranslation = payload.verbTranslation as Record<string, string> | undefined
  if (verbTranslation) {
    const verbText = verbTranslation[language] ?? verbTranslation.en ?? verbTranslation.ru
    if (verbText) {
      text = text.replace('{verb}', verbText)
    }
  }

  return text
}
