export type Tense = 'presente' | 'preterito_perfeito' | 'preterito_imperfeito'
export type Person = 'eu' | 'tu' | 'ele_ela' | 'nos' | 'eles_elas'

export interface VerbData {
  infinitive: string
  translation: Record<string, string>
  group: 'ar' | 'er' | 'ir' | 'irregular'
  conjugations: Record<Tense, Record<Person, string>>
}

export const PERSON_LABELS: Record<Person, string> = {
  eu: 'eu',
  tu: 'tu',
  ele_ela: 'ele/ela',
  nos: 'nós',
  eles_elas: 'eles/elas',
}

export const TENSE_LABELS: Record<Tense, string> = {
  presente: 'Presente',
  preterito_perfeito: 'Pretérito Perfeito',
  preterito_imperfeito: 'Pretérito Imperfeito',
}

export const VERBS: VerbData[] = [
  // ──────────────────────────────────────────────
  // Regular -ar verbs
  // ──────────────────────────────────────────────
  {
    infinitive: 'falar',
    translation: { ru: 'говорить', en: 'to speak' },
    group: 'ar',
    conjugations: {
      presente: {
        eu: 'falo',
        tu: 'falas',
        ele_ela: 'fala',
        nos: 'falamos',
        eles_elas: 'falam',
      },
      preterito_perfeito: {
        eu: 'falei',
        tu: 'falaste',
        ele_ela: 'falou',
        nos: 'falámos',
        eles_elas: 'falaram',
      },
      preterito_imperfeito: {
        eu: 'falava',
        tu: 'falavas',
        ele_ela: 'falava',
        nos: 'falávamos',
        eles_elas: 'falavam',
      },
    },
  },
  {
    infinitive: 'morar',
    translation: { ru: 'жить, проживать', en: 'to live (reside)' },
    group: 'ar',
    conjugations: {
      presente: {
        eu: 'moro',
        tu: 'moras',
        ele_ela: 'mora',
        nos: 'moramos',
        eles_elas: 'moram',
      },
      preterito_perfeito: {
        eu: 'morei',
        tu: 'moraste',
        ele_ela: 'morou',
        nos: 'morámos',
        eles_elas: 'moraram',
      },
      preterito_imperfeito: {
        eu: 'morava',
        tu: 'moravas',
        ele_ela: 'morava',
        nos: 'morávamos',
        eles_elas: 'moravam',
      },
    },
  },
  {
    infinitive: 'trabalhar',
    translation: { ru: 'работать', en: 'to work' },
    group: 'ar',
    conjugations: {
      presente: {
        eu: 'trabalho',
        tu: 'trabalhas',
        ele_ela: 'trabalha',
        nos: 'trabalhamos',
        eles_elas: 'trabalham',
      },
      preterito_perfeito: {
        eu: 'trabalhei',
        tu: 'trabalhaste',
        ele_ela: 'trabalhou',
        nos: 'trabalhámos',
        eles_elas: 'trabalharam',
      },
      preterito_imperfeito: {
        eu: 'trabalhava',
        tu: 'trabalhavas',
        ele_ela: 'trabalhava',
        nos: 'trabalhávamos',
        eles_elas: 'trabalhavam',
      },
    },
  },
  {
    infinitive: 'estudar',
    translation: { ru: 'учиться, изучать', en: 'to study' },
    group: 'ar',
    conjugations: {
      presente: {
        eu: 'estudo',
        tu: 'estudas',
        ele_ela: 'estuda',
        nos: 'estudamos',
        eles_elas: 'estudam',
      },
      preterito_perfeito: {
        eu: 'estudei',
        tu: 'estudaste',
        ele_ela: 'estudou',
        nos: 'estudámos',
        eles_elas: 'estudaram',
      },
      preterito_imperfeito: {
        eu: 'estudava',
        tu: 'estudavas',
        ele_ela: 'estudava',
        nos: 'estudávamos',
        eles_elas: 'estudavam',
      },
    },
  },
  {
    infinitive: 'gostar',
    translation: { ru: 'нравиться, любить', en: 'to like' },
    group: 'ar',
    conjugations: {
      presente: {
        eu: 'gosto',
        tu: 'gostas',
        ele_ela: 'gosta',
        nos: 'gostamos',
        eles_elas: 'gostam',
      },
      preterito_perfeito: {
        eu: 'gostei',
        tu: 'gostaste',
        ele_ela: 'gostou',
        nos: 'gostámos',
        eles_elas: 'gostaram',
      },
      preterito_imperfeito: {
        eu: 'gostava',
        tu: 'gostavas',
        ele_ela: 'gostava',
        nos: 'gostávamos',
        eles_elas: 'gostavam',
      },
    },
  },
  {
    infinitive: 'comprar',
    translation: { ru: 'покупать', en: 'to buy' },
    group: 'ar',
    conjugations: {
      presente: {
        eu: 'compro',
        tu: 'compras',
        ele_ela: 'compra',
        nos: 'compramos',
        eles_elas: 'compram',
      },
      preterito_perfeito: {
        eu: 'comprei',
        tu: 'compraste',
        ele_ela: 'comprou',
        nos: 'comprámos',
        eles_elas: 'compraram',
      },
      preterito_imperfeito: {
        eu: 'comprava',
        tu: 'compravas',
        ele_ela: 'comprava',
        nos: 'comprávamos',
        eles_elas: 'compravam',
      },
    },
  },
  {
    infinitive: 'andar',
    translation: { ru: 'ходить, идти', en: 'to walk' },
    group: 'ar',
    conjugations: {
      presente: {
        eu: 'ando',
        tu: 'andas',
        ele_ela: 'anda',
        nos: 'andamos',
        eles_elas: 'andam',
      },
      preterito_perfeito: {
        eu: 'andei',
        tu: 'andaste',
        ele_ela: 'andou',
        nos: 'andámos',
        eles_elas: 'andaram',
      },
      preterito_imperfeito: {
        eu: 'andava',
        tu: 'andavas',
        ele_ela: 'andava',
        nos: 'andávamos',
        eles_elas: 'andavam',
      },
    },
  },
  {
    infinitive: 'chamar',
    translation: { ru: 'звать, называть', en: 'to call' },
    group: 'ar',
    conjugations: {
      presente: {
        eu: 'chamo',
        tu: 'chamas',
        ele_ela: 'chama',
        nos: 'chamamos',
        eles_elas: 'chamam',
      },
      preterito_perfeito: {
        eu: 'chamei',
        tu: 'chamaste',
        ele_ela: 'chamou',
        nos: 'chamámos',
        eles_elas: 'chamaram',
      },
      preterito_imperfeito: {
        eu: 'chamava',
        tu: 'chamavas',
        ele_ela: 'chamava',
        nos: 'chamávamos',
        eles_elas: 'chamavam',
      },
    },
  },

  // ──────────────────────────────────────────────
  // Regular -er verbs
  // ──────────────────────────────────────────────
  {
    infinitive: 'comer',
    translation: { ru: 'есть, кушать', en: 'to eat' },
    group: 'er',
    conjugations: {
      presente: {
        eu: 'como',
        tu: 'comes',
        ele_ela: 'come',
        nos: 'comemos',
        eles_elas: 'comem',
      },
      preterito_perfeito: {
        eu: 'comi',
        tu: 'comeste',
        ele_ela: 'comeu',
        nos: 'comemos',
        eles_elas: 'comeram',
      },
      preterito_imperfeito: {
        eu: 'comia',
        tu: 'comias',
        ele_ela: 'comia',
        nos: 'comíamos',
        eles_elas: 'comiam',
      },
    },
  },
  {
    infinitive: 'beber',
    translation: { ru: 'пить', en: 'to drink' },
    group: 'er',
    conjugations: {
      presente: {
        eu: 'bebo',
        tu: 'bebes',
        ele_ela: 'bebe',
        nos: 'bebemos',
        eles_elas: 'bebem',
      },
      preterito_perfeito: {
        eu: 'bebi',
        tu: 'bebeste',
        ele_ela: 'bebeu',
        nos: 'bebemos',
        eles_elas: 'beberam',
      },
      preterito_imperfeito: {
        eu: 'bebia',
        tu: 'bebias',
        ele_ela: 'bebia',
        nos: 'bebíamos',
        eles_elas: 'bebiam',
      },
    },
  },
  {
    infinitive: 'viver',
    translation: { ru: 'жить', en: 'to live' },
    group: 'er',
    conjugations: {
      presente: {
        eu: 'vivo',
        tu: 'vives',
        ele_ela: 'vive',
        nos: 'vivemos',
        eles_elas: 'vivem',
      },
      preterito_perfeito: {
        eu: 'vivi',
        tu: 'viveste',
        ele_ela: 'viveu',
        nos: 'vivemos',
        eles_elas: 'viveram',
      },
      preterito_imperfeito: {
        eu: 'vivia',
        tu: 'vivias',
        ele_ela: 'vivia',
        nos: 'vivíamos',
        eles_elas: 'viviam',
      },
    },
  },
  {
    infinitive: 'aprender',
    translation: { ru: 'учить, изучать', en: 'to learn' },
    group: 'er',
    conjugations: {
      presente: {
        eu: 'aprendo',
        tu: 'aprendes',
        ele_ela: 'aprende',
        nos: 'aprendemos',
        eles_elas: 'aprendem',
      },
      preterito_perfeito: {
        eu: 'aprendi',
        tu: 'aprendeste',
        ele_ela: 'aprendeu',
        nos: 'aprendemos',
        eles_elas: 'aprenderam',
      },
      preterito_imperfeito: {
        eu: 'aprendia',
        tu: 'aprendias',
        ele_ela: 'aprendia',
        nos: 'aprendíamos',
        eles_elas: 'aprendiam',
      },
    },
  },

  // ──────────────────────────────────────────────
  // Regular -ir verbs
  // ──────────────────────────────────────────────
  {
    infinitive: 'partir',
    translation: { ru: 'уезжать, отправляться', en: 'to leave, to depart' },
    group: 'ir',
    conjugations: {
      presente: {
        eu: 'parto',
        tu: 'partes',
        ele_ela: 'parte',
        nos: 'partimos',
        eles_elas: 'partem',
      },
      preterito_perfeito: {
        eu: 'parti',
        tu: 'partiste',
        ele_ela: 'partiu',
        nos: 'partimos',
        eles_elas: 'partiram',
      },
      preterito_imperfeito: {
        eu: 'partia',
        tu: 'partias',
        ele_ela: 'partia',
        nos: 'partíamos',
        eles_elas: 'partiam',
      },
    },
  },
  {
    infinitive: 'abrir',
    translation: { ru: 'открывать', en: 'to open' },
    group: 'ir',
    conjugations: {
      presente: {
        eu: 'abro',
        tu: 'abres',
        ele_ela: 'abre',
        nos: 'abrimos',
        eles_elas: 'abrem',
      },
      preterito_perfeito: {
        eu: 'abri',
        tu: 'abriste',
        ele_ela: 'abriu',
        nos: 'abrimos',
        eles_elas: 'abriram',
      },
      preterito_imperfeito: {
        eu: 'abria',
        tu: 'abrias',
        ele_ela: 'abria',
        nos: 'abríamos',
        eles_elas: 'abriam',
      },
    },
  },
  {
    infinitive: 'decidir',
    translation: { ru: 'решать', en: 'to decide' },
    group: 'ir',
    conjugations: {
      presente: {
        eu: 'decido',
        tu: 'decides',
        ele_ela: 'decide',
        nos: 'decidimos',
        eles_elas: 'decidem',
      },
      preterito_perfeito: {
        eu: 'decidi',
        tu: 'decidiste',
        ele_ela: 'decidiu',
        nos: 'decidimos',
        eles_elas: 'decidiram',
      },
      preterito_imperfeito: {
        eu: 'decidia',
        tu: 'decidias',
        ele_ela: 'decidia',
        nos: 'decidíamos',
        eles_elas: 'decidiam',
      },
    },
  },

  // ──────────────────────────────────────────────
  // Key irregular verbs
  // ──────────────────────────────────────────────
  {
    infinitive: 'ser',
    translation: { ru: 'быть (постоянно)', en: 'to be (permanent)' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'sou',
        tu: 'és',
        ele_ela: 'é',
        nos: 'somos',
        eles_elas: 'são',
      },
      preterito_perfeito: {
        eu: 'fui',
        tu: 'foste',
        ele_ela: 'foi',
        nos: 'fomos',
        eles_elas: 'foram',
      },
      preterito_imperfeito: {
        eu: 'era',
        tu: 'eras',
        ele_ela: 'era',
        nos: 'éramos',
        eles_elas: 'eram',
      },
    },
  },
  {
    infinitive: 'estar',
    translation: { ru: 'быть (временно), находиться', en: 'to be (temporary)' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'estou',
        tu: 'estás',
        ele_ela: 'está',
        nos: 'estamos',
        eles_elas: 'estão',
      },
      preterito_perfeito: {
        eu: 'estive',
        tu: 'estiveste',
        ele_ela: 'esteve',
        nos: 'estivemos',
        eles_elas: 'estiveram',
      },
      preterito_imperfeito: {
        eu: 'estava',
        tu: 'estavas',
        ele_ela: 'estava',
        nos: 'estávamos',
        eles_elas: 'estavam',
      },
    },
  },
  {
    infinitive: 'ter',
    translation: { ru: 'иметь', en: 'to have' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'tenho',
        tu: 'tens',
        ele_ela: 'tem',
        nos: 'temos',
        eles_elas: 'têm',
      },
      preterito_perfeito: {
        eu: 'tive',
        tu: 'tiveste',
        ele_ela: 'teve',
        nos: 'tivemos',
        eles_elas: 'tiveram',
      },
      preterito_imperfeito: {
        eu: 'tinha',
        tu: 'tinhas',
        ele_ela: 'tinha',
        nos: 'tínhamos',
        eles_elas: 'tinham',
      },
    },
  },
  {
    infinitive: 'ir',
    translation: { ru: 'идти, ехать', en: 'to go' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'vou',
        tu: 'vais',
        ele_ela: 'vai',
        nos: 'vamos',
        eles_elas: 'vão',
      },
      preterito_perfeito: {
        eu: 'fui',
        tu: 'foste',
        ele_ela: 'foi',
        nos: 'fomos',
        eles_elas: 'foram',
      },
      preterito_imperfeito: {
        eu: 'ia',
        tu: 'ias',
        ele_ela: 'ia',
        nos: 'íamos',
        eles_elas: 'iam',
      },
    },
  },
  {
    infinitive: 'fazer',
    translation: { ru: 'делать', en: 'to do, to make' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'faço',
        tu: 'fazes',
        ele_ela: 'faz',
        nos: 'fazemos',
        eles_elas: 'fazem',
      },
      preterito_perfeito: {
        eu: 'fiz',
        tu: 'fizeste',
        ele_ela: 'fez',
        nos: 'fizemos',
        eles_elas: 'fizeram',
      },
      preterito_imperfeito: {
        eu: 'fazia',
        tu: 'fazias',
        ele_ela: 'fazia',
        nos: 'fazíamos',
        eles_elas: 'faziam',
      },
    },
  },
  {
    infinitive: 'poder',
    translation: { ru: 'мочь', en: 'to be able to, can' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'posso',
        tu: 'podes',
        ele_ela: 'pode',
        nos: 'podemos',
        eles_elas: 'podem',
      },
      preterito_perfeito: {
        eu: 'pude',
        tu: 'pudeste',
        ele_ela: 'pôde',
        nos: 'pudemos',
        eles_elas: 'puderam',
      },
      preterito_imperfeito: {
        eu: 'podia',
        tu: 'podias',
        ele_ela: 'podia',
        nos: 'podíamos',
        eles_elas: 'podiam',
      },
    },
  },
  {
    infinitive: 'querer',
    translation: { ru: 'хотеть', en: 'to want' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'quero',
        tu: 'queres',
        ele_ela: 'quer',
        nos: 'queremos',
        eles_elas: 'querem',
      },
      preterito_perfeito: {
        eu: 'quis',
        tu: 'quiseste',
        ele_ela: 'quis',
        nos: 'quisemos',
        eles_elas: 'quiseram',
      },
      preterito_imperfeito: {
        eu: 'queria',
        tu: 'querias',
        ele_ela: 'queria',
        nos: 'queríamos',
        eles_elas: 'queriam',
      },
    },
  },
  {
    infinitive: 'saber',
    translation: { ru: 'знать, уметь', en: 'to know' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'sei',
        tu: 'sabes',
        ele_ela: 'sabe',
        nos: 'sabemos',
        eles_elas: 'sabem',
      },
      preterito_perfeito: {
        eu: 'soube',
        tu: 'soubeste',
        ele_ela: 'soube',
        nos: 'soubemos',
        eles_elas: 'souberam',
      },
      preterito_imperfeito: {
        eu: 'sabia',
        tu: 'sabias',
        ele_ela: 'sabia',
        nos: 'sabíamos',
        eles_elas: 'sabiam',
      },
    },
  },
  {
    infinitive: 'dizer',
    translation: { ru: 'говорить, сказать', en: 'to say, to tell' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'digo',
        tu: 'dizes',
        ele_ela: 'diz',
        nos: 'dizemos',
        eles_elas: 'dizem',
      },
      preterito_perfeito: {
        eu: 'disse',
        tu: 'disseste',
        ele_ela: 'disse',
        nos: 'dissemos',
        eles_elas: 'disseram',
      },
      preterito_imperfeito: {
        eu: 'dizia',
        tu: 'dizias',
        ele_ela: 'dizia',
        nos: 'dizíamos',
        eles_elas: 'diziam',
      },
    },
  },
  {
    infinitive: 'vir',
    translation: { ru: 'приходить', en: 'to come' },
    group: 'irregular',
    conjugations: {
      presente: {
        eu: 'venho',
        tu: 'vens',
        ele_ela: 'vem',
        nos: 'vimos',
        eles_elas: 'vêm',
      },
      preterito_perfeito: {
        eu: 'vim',
        tu: 'vieste',
        ele_ela: 'veio',
        nos: 'viemos',
        eles_elas: 'vieram',
      },
      preterito_imperfeito: {
        eu: 'vinha',
        tu: 'vinhas',
        ele_ela: 'vinha',
        nos: 'vínhamos',
        eles_elas: 'vinham',
      },
    },
  },
]
