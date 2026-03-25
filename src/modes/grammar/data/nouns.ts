export interface NounData {
  word: string
  translation: Record<string, string>
  gender: 'masculino' | 'feminino'
  plural: string
  articles: {
    def: string
    indef: string
    defPl: string
    indefPl: string
  }
}

export const NOUNS: NounData[] = [
  // ── Regular masculine (-o → -os) ──────────────────────────────────
  {
    word: 'livro',
    translation: { ru: 'книга', en: 'book' },
    gender: 'masculino',
    plural: 'livros',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'gato',
    translation: { ru: 'кот', en: 'cat' },
    gender: 'masculino',
    plural: 'gatos',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'carro',
    translation: { ru: 'машина', en: 'car' },
    gender: 'masculino',
    plural: 'carros',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'sapato',
    translation: { ru: 'ботинок', en: 'shoe' },
    gender: 'masculino',
    plural: 'sapatos',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'banco',
    translation: { ru: 'банк', en: 'bank' },
    gender: 'masculino',
    plural: 'bancos',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'prato',
    translation: { ru: 'тарелка', en: 'plate' },
    gender: 'masculino',
    plural: 'pratos',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'braço',
    translation: { ru: 'рука (от плеча)', en: 'arm' },
    gender: 'masculino',
    plural: 'braços',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'copo',
    translation: { ru: 'стакан', en: 'glass' },
    gender: 'masculino',
    plural: 'copos',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'ovo',
    translation: { ru: 'яйцо', en: 'egg' },
    gender: 'masculino',
    plural: 'ovos',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'quarto',
    translation: { ru: 'комната', en: 'room' },
    gender: 'masculino',
    plural: 'quartos',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'mercado',
    translation: { ru: 'рынок', en: 'market' },
    gender: 'masculino',
    plural: 'mercados',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },

  // ── Regular feminine (-a → -as) ───────────────────────────────────
  {
    word: 'casa',
    translation: { ru: 'дом', en: 'house' },
    gender: 'feminino',
    plural: 'casas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'mesa',
    translation: { ru: 'стол', en: 'table' },
    gender: 'feminino',
    plural: 'mesas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'porta',
    translation: { ru: 'дверь', en: 'door' },
    gender: 'feminino',
    plural: 'portas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'janela',
    translation: { ru: 'окно', en: 'window' },
    gender: 'feminino',
    plural: 'janelas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'escola',
    translation: { ru: 'школа', en: 'school' },
    gender: 'feminino',
    plural: 'escolas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'água',
    translation: { ru: 'вода', en: 'water' },
    gender: 'feminino',
    plural: 'águas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'pessoa',
    translation: { ru: 'человек', en: 'person' },
    gender: 'feminino',
    plural: 'pessoas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'cadeira',
    translation: { ru: 'стул', en: 'chair' },
    gender: 'feminino',
    plural: 'cadeiras',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'comida',
    translation: { ru: 'еда', en: 'food' },
    gender: 'feminino',
    plural: 'comidas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'rua',
    translation: { ru: 'улица', en: 'street' },
    gender: 'feminino',
    plural: 'ruas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'cama',
    translation: { ru: 'кровать', en: 'bed' },
    gender: 'feminino',
    plural: 'camas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'loja',
    translation: { ru: 'магазин', en: 'shop' },
    gender: 'feminino',
    plural: 'lojas',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },

  // ── Masculine ending in -a (exceptions) ───────────────────────────
  {
    word: 'dia',
    translation: { ru: 'день', en: 'day' },
    gender: 'masculino',
    plural: 'dias',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'mapa',
    translation: { ru: 'карта', en: 'map' },
    gender: 'masculino',
    plural: 'mapas',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'problema',
    translation: { ru: 'проблема', en: 'problem' },
    gender: 'masculino',
    plural: 'problemas',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'sistema',
    translation: { ru: 'система', en: 'system' },
    gender: 'masculino',
    plural: 'sistemas',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'programa',
    translation: { ru: 'программа', en: 'program' },
    gender: 'masculino',
    plural: 'programas',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },

  // ── Masculine not ending in -o (exceptions) ──────────────────────
  {
    word: 'café',
    translation: { ru: 'кофе', en: 'coffee' },
    gender: 'masculino',
    plural: 'cafés',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'leite',
    translation: { ru: 'молоко', en: 'milk' },
    gender: 'masculino',
    plural: 'leites',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'pão',
    translation: { ru: 'хлеб', en: 'bread' },
    gender: 'masculino',
    plural: 'pães',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'hotel',
    translation: { ru: 'отель', en: 'hotel' },
    gender: 'masculino',
    plural: 'hotéis',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'sol',
    translation: { ru: 'солнце', en: 'sun' },
    gender: 'masculino',
    plural: 'sóis',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'mar',
    translation: { ru: 'море', en: 'sea' },
    gender: 'masculino',
    plural: 'mares',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'nome',
    translation: { ru: 'имя', en: 'name' },
    gender: 'masculino',
    plural: 'nomes',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },

  // ── Feminine not ending in -a (exceptions) ────────────────────────
  {
    word: 'cidade',
    translation: { ru: 'город', en: 'city' },
    gender: 'feminino',
    plural: 'cidades',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'noite',
    translation: { ru: 'ночь', en: 'night' },
    gender: 'feminino',
    plural: 'noites',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'chave',
    translation: { ru: 'ключ', en: 'key' },
    gender: 'feminino',
    plural: 'chaves',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'viagem',
    translation: { ru: 'путешествие', en: 'trip' },
    gender: 'feminino',
    plural: 'viagens',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'cor',
    translation: { ru: 'цвет', en: 'color' },
    gender: 'feminino',
    plural: 'cores',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'flor',
    translation: { ru: 'цветок', en: 'flower' },
    gender: 'feminino',
    plural: 'flores',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'luz',
    translation: { ru: 'свет', en: 'light' },
    gender: 'feminino',
    plural: 'luzes',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'voz',
    translation: { ru: 'голос', en: 'voice' },
    gender: 'feminino',
    plural: 'vozes',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },

  // ── Irregular plurals: -ão → -ões ─────────────────────────────────
  {
    word: 'avião',
    translation: { ru: 'самолёт', en: 'airplane' },
    gender: 'masculino',
    plural: 'aviões',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'coração',
    translation: { ru: 'сердце', en: 'heart' },
    gender: 'masculino',
    plural: 'corações',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'estação',
    translation: { ru: 'станция', en: 'station' },
    gender: 'feminino',
    plural: 'estações',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'lição',
    translation: { ru: 'урок', en: 'lesson' },
    gender: 'feminino',
    plural: 'lições',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },

  // ── Irregular plurals: -ão → -ães ─────────────────────────────────
  {
    word: 'cão',
    translation: { ru: 'собака', en: 'dog' },
    gender: 'masculino',
    plural: 'cães',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },

  // ── Irregular plurals: -ão → -ãos (exception!) ────────────────────
  {
    word: 'mão',
    translation: { ru: 'рука (кисть)', en: 'hand' },
    gender: 'feminino',
    plural: 'mãos',
    articles: { def: 'a', indef: 'uma', defPl: 'as', indefPl: 'umas' },
  },
  {
    word: 'irmão',
    translation: { ru: 'брат', en: 'brother' },
    gender: 'masculino',
    plural: 'irmãos',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },

  // ── Irregular plurals: -l → -is ───────────────────────────────────
  {
    word: 'animal',
    translation: { ru: 'животное', en: 'animal' },
    gender: 'masculino',
    plural: 'animais',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'papel',
    translation: { ru: 'бумага', en: 'paper' },
    gender: 'masculino',
    plural: 'papéis',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },

  // ── Irregular plurals: -m → -ns ───────────────────────────────────
  {
    word: 'homem',
    translation: { ru: 'мужчина', en: 'man' },
    gender: 'masculino',
    plural: 'homens',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
  {
    word: 'jardim',
    translation: { ru: 'сад', en: 'garden' },
    gender: 'masculino',
    plural: 'jardins',
    articles: { def: 'o', indef: 'um', defPl: 'os', indefPl: 'uns' },
  },
]
