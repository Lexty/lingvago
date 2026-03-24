import { db } from './index'
import { addWordWithCards } from './operations'
import { PASSAPORTE_U1_U4 } from './decks/passaporte-u1-u4'

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

interface DeckDef {
  name: string
  description: string
  words: Array<{ pt: string; ru: string }>
}

const SEED_DECKS: DeckDef[] = [
  { name: 'Starter', description: 'Базовые слова', words: STARTER_WORDS },
  { name: 'Passaporte U1–U4', description: 'Passaporte para Português, Unidades 1–4', words: PASSAPORTE_U1_U4 },
]

export async function seedDatabase() {
  const deckCount = await db.decks.count()
  if (deckCount > 0) return

  const studyLanguage = 'ru'

  for (const deck of SEED_DECKS) {
    const deckId = (await db.decks.add({
      name: deck.name,
      description: deck.description,
      isActive: true,
      createdAt: Date.now(),
    })) as number

    for (const word of deck.words) {
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
}
