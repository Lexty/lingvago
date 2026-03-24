import { db } from './index'
import { addWordWithCards } from './operations'

const STARTER_WORDS: Array<{ pt: string; ru: string }> = [
  { pt: 'olá', ru: 'привет' },
  { pt: 'obrigado', ru: 'спасибо' },
  { pt: 'por favor', ru: 'пожалуйста' },
  { pt: 'sim', ru: 'да' },
  { pt: 'não', ru: 'нет' },
  { pt: 'bom dia', ru: 'доброе утро' },
  { pt: 'água', ru: 'вода' },
  { pt: 'café', ru: 'кофе' },
  { pt: 'pão', ru: 'хлеб' },
  { pt: 'leite', ru: 'молоко' },
  { pt: 'fruta', ru: 'фрукт' },
  { pt: 'mãe', ru: 'мать' },
  { pt: 'pai', ru: 'отец' },
  { pt: 'filho', ru: 'сын' },
  { pt: 'filha', ru: 'дочь' },
  { pt: 'amigo', ru: 'друг' },
  { pt: 'casa', ru: 'дом' },
  { pt: 'escola', ru: 'школа' },
  { pt: 'trabalho', ru: 'работа' },
  { pt: 'rua', ru: 'улица' },
  { pt: 'cidade', ru: 'город' },
  { pt: 'um', ru: 'один' },
  { pt: 'dois', ru: 'два' },
  { pt: 'três', ru: 'три' },
  { pt: 'quatro', ru: 'четыре' },
  { pt: 'cinco', ru: 'пять' },
]

export async function seedDatabase() {
  const deckCount = await db.decks.count()
  if (deckCount > 0) return

  const studyLanguage = 'ru'

  const deckId = (await db.decks.add({
    name: 'Starter',
    description: 'Базовые слова',
    isActive: true,
    createdAt: Date.now(),
  })) as number

  for (const word of STARTER_WORDS) {
    await addWordWithCards(
      {
        pt: word.pt,
        translations: { ru: word.ru },
        deckId,
        createdAt: Date.now(),
      },
      studyLanguage,
    )
  }
}
