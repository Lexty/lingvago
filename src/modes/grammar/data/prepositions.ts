export interface PrepositionItem {
  sentence: string
  answer: string
  translation: Record<string, string>
  distractors: string[]
}

export const PREPOSITIONS: PrepositionItem[] = [
  // ── a (direction / destination) ───────────────────────────────────
  {
    sentence: 'Eu vou ___ Lisboa.',
    answer: 'a',
    translation: { ru: 'Я еду в Лиссабон.', en: 'I go to Lisbon.' },
    distractors: ['de', 'em', 'por'],
  },
  {
    sentence: 'Ela chegou ___ casa às sete.',
    answer: 'a',
    translation: { ru: 'Она пришла домой в семь.', en: 'She arrived home at seven.' },
    distractors: ['em', 'para', 'de'],
  },
  {
    sentence: 'Vamos ___ praia amanhã.',
    answer: 'à',
    translation: { ru: 'Мы пойдём на пляж завтра.', en: 'We go to the beach tomorrow.' },
    distractors: ['na', 'da', 'pela'],
  },
  {
    sentence: 'Eu vou ___ supermercado.',
    answer: 'ao',
    translation: { ru: 'Я иду в супермаркет.', en: 'I go to the supermarket.' },
    distractors: ['no', 'do', 'pelo'],
  },

  // ── de (origin / possession) ──────────────────────────────────────
  {
    sentence: 'Eu sou ___ Portugal.',
    answer: 'de',
    translation: { ru: 'Я из Португалии.', en: 'I am from Portugal.' },
    distractors: ['em', 'a', 'para'],
  },
  {
    sentence: 'Ele gosta ___ música.',
    answer: 'de',
    translation: { ru: 'Он любит музыку.', en: 'He likes music.' },
    distractors: ['a', 'com', 'por'],
  },
  {
    sentence: 'Este é o carro ___ meu pai.',
    answer: 'do',
    translation: { ru: 'Это машина моего отца.', en: 'This is my father\'s car.' },
    distractors: ['no', 'ao', 'pelo'],
  },
  {
    sentence: 'A cor ___ casa é branca.',
    answer: 'da',
    translation: { ru: 'Цвет дома — белый.', en: 'The color of the house is white.' },
    distractors: ['na', 'à', 'pela'],
  },
  {
    sentence: 'Os livros ___ alunos estão na mesa.',
    answer: 'dos',
    translation: { ru: 'Книги учеников на столе.', en: 'The students\' books are on the table.' },
    distractors: ['nos', 'aos', 'pelos'],
  },
  {
    sentence: 'As chaves ___ portas estão aqui.',
    answer: 'das',
    translation: { ru: 'Ключи от дверей здесь.', en: 'The keys to the doors are here.' },
    distractors: ['nas', 'às', 'pelas'],
  },

  // ── em (location) ─────────────────────────────────────────────────
  {
    sentence: 'Eu moro ___ Lisboa.',
    answer: 'em',
    translation: { ru: 'Я живу в Лиссабоне.', en: 'I live in Lisbon.' },
    distractors: ['a', 'de', 'para'],
  },
  {
    sentence: 'Ela está ___ escritório.',
    answer: 'no',
    translation: { ru: 'Она в офисе.', en: 'She is at the office.' },
    distractors: ['do', 'ao', 'pelo'],
  },
  {
    sentence: 'O gato está ___ cozinha.',
    answer: 'na',
    translation: { ru: 'Кот на кухне.', en: 'The cat is in the kitchen.' },
    distractors: ['da', 'à', 'pela'],
  },
  {
    sentence: 'As crianças brincam ___ jardins.',
    answer: 'nos',
    translation: { ru: 'Дети играют в садах.', en: 'The children play in the gardens.' },
    distractors: ['dos', 'aos', 'pelos'],
  },
  {
    sentence: 'Há flores ___ janelas.',
    answer: 'nas',
    translation: { ru: 'На окнах есть цветы.', en: 'There are flowers on the windows.' },
    distractors: ['das', 'às', 'pelas'],
  },
  {
    sentence: 'Eu penso ___ ti todos os dias.',
    answer: 'em',
    translation: { ru: 'Я думаю о тебе каждый день.', en: 'I think about you every day.' },
    distractors: ['de', 'a', 'com'],
  },

  // ── para (purpose / direction) ────────────────────────────────────
  {
    sentence: 'Este presente é ___ ti.',
    answer: 'para',
    translation: { ru: 'Этот подарок для тебя.', en: 'This gift is for you.' },
    distractors: ['com', 'de', 'a'],
  },
  {
    sentence: 'Eu trabalho ___ uma empresa grande.',
    answer: 'para',
    translation: { ru: 'Я работаю на большую компанию.', en: 'I work for a big company.' },
    distractors: ['com', 'em', 'de'],
  },
  {
    sentence: 'Eles vão ___ o Porto amanhã.',
    answer: 'para',
    translation: { ru: 'Они едут в Порту завтра.', en: 'They go to Porto tomorrow.' },
    distractors: ['com', 'por', 'de'],
  },
  {
    sentence: 'Eu estudo ___ aprender português.',
    answer: 'para',
    translation: { ru: 'Я учусь, чтобы выучить португальский.', en: 'I study to learn Portuguese.' },
    distractors: ['por', 'de', 'com'],
  },

  // ── por (through / by / reason) ───────────────────────────────────
  {
    sentence: 'Nós passámos ___ centro da cidade.',
    answer: 'pelo',
    translation: { ru: 'Мы прошли через центр города.', en: 'We passed through the city center.' },
    distractors: ['no', 'do', 'ao'],
  },
  {
    sentence: 'Obrigado ___ ajuda!',
    answer: 'pela',
    translation: { ru: 'Спасибо за помощь!', en: 'Thanks for the help!' },
    distractors: ['na', 'da', 'à'],
  },
  {
    sentence: 'Ele viajou ___ todo o país.',
    answer: 'por',
    translation: { ru: 'Он путешествовал по всей стране.', en: 'He traveled through the whole country.' },
    distractors: ['em', 'de', 'para'],
  },
  {
    sentence: 'O bolo foi feito ___ minha mãe.',
    answer: 'pela',
    translation: { ru: 'Торт был сделан моей мамой.', en: 'The cake was made by my mother.' },
    distractors: ['na', 'da', 'à'],
  },
  {
    sentence: 'Eu faço isto ___ amor.',
    answer: 'por',
    translation: { ru: 'Я делаю это ради любви.', en: 'I do this for love.' },
    distractors: ['para', 'com', 'de'],
  },

  // ── com (with) ────────────────────────────────────────────────────
  {
    sentence: 'Eu falo ___ a minha mãe todos os dias.',
    answer: 'com',
    translation: { ru: 'Я разговариваю с мамой каждый день.', en: 'I talk with my mother every day.' },
    distractors: ['de', 'para', 'a'],
  },
  {
    sentence: 'Ela vive ___ o marido e dois filhos.',
    answer: 'com',
    translation: { ru: 'Она живёт с мужем и двумя детьми.', en: 'She lives with her husband and two children.' },
    distractors: ['para', 'por', 'de'],
  },
  {
    sentence: 'Queres ir ___ nós ao cinema?',
    answer: 'com',
    translation: { ru: 'Хочешь пойти с нами в кино?', en: 'Do you want to go with us to the cinema?' },
    distractors: ['para', 'a', 'por'],
  },
  {
    sentence: 'Eu como pão ___ manteiga.',
    answer: 'com',
    translation: { ru: 'Я ем хлеб с маслом.', en: 'I eat bread with butter.' },
    distractors: ['de', 'em', 'a'],
  },

  // ── Mixed contractions ────────────────────────────────────────────
  {
    sentence: 'O João mora ___ terceiro andar.',
    answer: 'no',
    translation: { ru: 'Жуан живёт на третьем этаже.', en: 'João lives on the third floor.' },
    distractors: ['do', 'ao', 'pelo'],
  },
  {
    sentence: 'Eu preciso ___ ir ao médico.',
    answer: 'de',
    translation: { ru: 'Мне нужно пойти к врачу.', en: 'I need to go to the doctor.' },
    distractors: ['a', 'para', 'com'],
  },
  {
    sentence: 'Eles foram ___ restaurante ontem.',
    answer: 'ao',
    translation: { ru: 'Они ходили в ресторан вчера.', en: 'They went to the restaurant yesterday.' },
    distractors: ['no', 'do', 'pelo'],
  },
  {
    sentence: 'A Maria saiu ___ banco há cinco minutos.',
    answer: 'do',
    translation: { ru: 'Мария вышла из банка пять минут назад.', en: 'Maria left the bank five minutes ago.' },
    distractors: ['no', 'ao', 'pelo'],
  },
  {
    sentence: 'O avião passou ___ cima das nuvens.',
    answer: 'por',
    translation: { ru: 'Самолёт пролетел над облаками.', en: 'The airplane flew above the clouds.' },
    distractors: ['de', 'em', 'a'],
  },
  {
    sentence: 'Nós estamos ___ espera do autocarro.',
    answer: 'à',
    translation: { ru: 'Мы ждём автобус.', en: 'We are waiting for the bus.' },
    distractors: ['na', 'da', 'pela'],
  },
  {
    sentence: 'Eu entreguei o livro ___ professora.',
    answer: 'à',
    translation: { ru: 'Я отдал книгу учительнице.', en: 'I gave the book to the teacher.' },
    distractors: ['na', 'da', 'pela'],
  },
  {
    sentence: 'A loja fica ___ fim da rua.',
    answer: 'no',
    translation: { ru: 'Магазин находится в конце улицы.', en: 'The shop is at the end of the street.' },
    distractors: ['do', 'ao', 'pelo'],
  },
  {
    sentence: 'Ele voltou ___ trabalho às duas.',
    answer: 'ao',
    translation: { ru: 'Он вернулся на работу в два часа.', en: 'He returned to work at two.' },
    distractors: ['no', 'do', 'pelo'],
  },
  {
    sentence: 'As crianças gostam ___ brincar ___ parque.',
    answer: 'de',
    translation: { ru: 'Дети любят играть в парке.', en: 'The children like to play in the park.' },
    distractors: ['em', 'a', 'para'],
  },
]
