export interface WordOrderSentence {
  /** All valid correct orderings. First is used as primary (for scrambling & display). */
  answers: string[]
  translation: Record<string, string>
  rule?: Record<string, string>
}

export const WORD_ORDER_SENTENCES: WordOrderSentence[] = [
  // ── Articles + basic SVO ────────────────────────────────────────────
  {
    answers: ['O Pedro come uma maçã.'],
    translation: { ru: 'Педру ест яблоко.', en: 'Pedro eats an apple.' },
  },
  {
    answers: ['A Maria lê um livro.'],
    translation: { ru: 'Мария читает книгу.', en: 'Maria reads a book.' },
  },
  {
    answers: ['Os alunos estudam português.'],
    translation: { ru: 'Ученики изучают португальский.', en: 'The students study Portuguese.' },
  },
  {
    answers: ['As crianças brincam no parque.'],
    translation: { ru: 'Дети играют в парке.', en: 'The children play in the park.' },
  },
  {
    answers: ['O gato dorme na cozinha.'],
    translation: { ru: 'Кот спит на кухне.', en: 'The cat sleeps in the kitchen.' },
  },
  {
    answers: ['A professora ensina os alunos.'],
    translation: { ru: 'Учительница учит учеников.', en: 'The teacher teaches the students.' },
  },

  // ── Negation ────────────────────────────────────────────────────────
  {
    answers: ['A Fátima não gosta da rua dela.'],
    translation: { ru: 'Фатима не любит свою улицу.', en: "Fatima doesn't like her street." },
    rule: { ru: 'não стоит перед глаголом', en: 'não goes before the verb' },
  },
  {
    answers: ['Eu não falo inglês.'],
    translation: { ru: 'Я не говорю по-английски.', en: "I don't speak English." },
    rule: { ru: 'não стоит перед глаголом', en: 'não goes before the verb' },
  },
  {
    answers: ['Eles não moram em Lisboa.'],
    translation: { ru: 'Они не живут в Лиссабоне.', en: "They don't live in Lisbon." },
    rule: { ru: 'não стоит перед глаголом', en: 'não goes before the verb' },
  },
  {
    answers: ['Nós não temos tempo.'],
    translation: { ru: 'У нас нет времени.', en: "We don't have time." },
    rule: { ru: 'não стоит перед глаголом', en: 'não goes before the verb' },
  },
  {
    answers: ['O João não trabalha ao sábado.'],
    translation: { ru: 'Жуан не работает по субботам.', en: "João doesn't work on Saturday." },
    rule: { ru: 'não стоит перед глаголом', en: 'não goes before the verb' },
  },

  // ── Preposition contractions ────────────────────────────────────────
  {
    answers: ['Eu vou ao supermercado.'],
    translation: { ru: 'Я иду в супермаркет.', en: 'I go to the supermarket.' },
    rule: { ru: 'a + o = ao', en: 'a + o = ao' },
  },
  {
    answers: ['Ela mora no centro da cidade.'],
    translation: { ru: 'Она живёт в центре города.', en: 'She lives in the city center.' },
    rule: { ru: 'em + o = no, de + a = da', en: 'em + o = no, de + a = da' },
  },
  {
    answers: ['Os livros estão na mesa.'],
    translation: { ru: 'Книги на столе.', en: 'The books are on the table.' },
    rule: { ru: 'em + a = na', en: 'em + a = na' },
  },
  {
    answers: ['Eles gostam do café português.'],
    translation: { ru: 'Они любят португальский кофе.', en: 'They like Portuguese coffee.' },
    rule: { ru: 'de + o = do', en: 'de + o = do' },
  },
  {
    answers: ['Nós vamos à praia no verão.'],
    translation: { ru: 'Мы ходим на пляж летом.', en: 'We go to the beach in summer.' },
    rule: { ru: 'a + a = à, em + o = no', en: 'a + a = à, em + o = no' },
  },

  // ── Adjective placement ─────────────────────────────────────────────
  {
    answers: ['Ele tem um carro novo.'],
    translation: { ru: 'У него новая машина.', en: 'He has a new car.' },
    rule: { ru: 'Прилагательное после существительного', en: 'Adjective after the noun' },
  },
  {
    answers: ['A cidade é muito bonita.'],
    translation: { ru: 'Город очень красивый.', en: 'The city is very beautiful.' },
  },
  {
    answers: ['Eu quero uma casa grande.'],
    translation: { ru: 'Я хочу большой дом.', en: 'I want a big house.' },
    rule: { ru: 'Прилагательное после существительного', en: 'Adjective after the noun' },
  },
  {
    answers: ['Ela tem olhos bonitos.'],
    translation: { ru: 'У неё красивые глаза.', en: 'She has beautiful eyes.' },
    rule: { ru: 'Прилагательное после существительного', en: 'Adjective after the noun' },
  },

  // ── Questions ───────────────────────────────────────────────────────
  {
    answers: ['Onde é a estação de comboios?'],
    translation: { ru: 'Где вокзал?', en: 'Where is the train station?' },
  },
  {
    answers: ['Quando começa a aula?'],
    translation: { ru: 'Когда начинается урок?', en: 'When does the class start?' },
  },
  {
    answers: ['Como se chama o teu irmão?'],
    translation: { ru: 'Как зовут твоего брата?', en: "What's your brother's name?" },
  },
  {
    answers: ['Quanto custa este livro?'],
    translation: { ru: 'Сколько стоит эта книга?', en: 'How much does this book cost?' },
  },

  // ── Time expressions ────────────────────────────────────────────────
  {
    answers: [
      'Eu acordo todos os dias às sete.',
      'Todos os dias eu acordo às sete.',
    ],
    translation: { ru: 'Я просыпаюсь каждый день в семь.', en: 'I wake up every day at seven.' },
  },
  {
    answers: ['Eles chegam amanhã de manhã.'],
    translation: { ru: 'Они приезжают завтра утром.', en: 'They arrive tomorrow morning.' },
  },
  {
    answers: [
      'Nós jantamos sempre às oito.',
      'Nós sempre jantamos às oito.',
    ],
    translation: { ru: 'Мы всегда ужинаем в восемь.', en: 'We always have dinner at eight.' },
  },

  // ── Complex structures ──────────────────────────────────────────────
  {
    answers: ['Eu preciso de ir ao médico.'],
    translation: { ru: 'Мне нужно сходить к врачу.', en: 'I need to go to the doctor.' },
    rule: { ru: 'precisar de + infinitivo', en: 'precisar de + infinitive' },
  },
  {
    answers: ['Ela quer aprender a falar português.'],
    translation: { ru: 'Она хочет научиться говорить по-португальски.', en: 'She wants to learn to speak Portuguese.' },
    rule: { ru: 'aprender a + infinitivo', en: 'aprender a + infinitive' },
  },
  {
    answers: ['O autocarro para o Porto sai às três.'],
    translation: { ru: 'Автобус до Порту отправляется в три.', en: 'The bus to Porto leaves at three.' },
  },
]
