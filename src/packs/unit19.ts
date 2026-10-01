import type { Pack, PackExercise } from './types.ts';

// Unidade 19 — money, obligations, needs.
//
// The sentences are our own (not copied from the coursebook).

const PRIBERAM = 'https://dicionario.priberam.org/';

/** `meaning → verb / collocation`. */
function word(
  id: string,
  answer: string,
  ru: string,
  en: string,
  accept?: readonly string[],
): PackExercise {
  return {
    id,
    cue: { ru, en },
    answer,
    accept,
    why: { ru: `${ru} — ${answer}.`, en: `${en} — ${answer}.` },
  };
}

/** A verb given as an infinitive, to be written in the form the sentence needs. */
function form(
  id: string,
  prompt: string,
  verb: string,
  answer: string,
  ru: string,
  en: string,
): PackExercise {
  return { id, prompt, cue: { ru: verb, en: verb }, answer, why: { ru, en } };
}

/** No lemma is given: the verb is chosen by meaning from the group's list. */
function pick(id: string, prompt: string, answer: string, ru: string, en: string): PackExercise {
  return { id, prompt, answer, why: { ru, en } };
}

const FINITE = (subject: string, answer: string): [string, string] => [
  `Действие относится к ${subject} → личная форма: ${answer}.`,
  `The action belongs to ${subject} → a personal form: ${answer}.`,
];
const INFINITIVE = (after: string): [string, string] => [
  `После ${after} глагол остаётся в инфинитиве (querer / gostar de / precisar de + инфинитив).`,
  `After ${after} the verb stays in the infinitive (querer / gostar de / precisar de + infinitive).`,
];

export const UNIT_19: Pack = {
  id: 'unit-19',
  unit: 19,
  title: { ru: 'Деньги, обязанности и нужды', en: 'Money, obligations and needs' },
  summary: {
    ru: 'Глаголы про деньги, личная форма или инфинитив, ter de и precisar de.',
    en: 'Money verbs, personal form or infinitive, ter de and precisar de.',
  },
  groups: [
    {
      id: 'money-words',
      kind: 'recall',
      title: { ru: 'Деньги: глаголы', en: 'Money: verbs' },
      instruction: {
        ru: 'Напишите по-португальски. Сочетания запоминайте целиком.',
        en: 'Write it in Portuguese. Learn the collocations as a whole.',
      },
      example: 'ganhar dinheiro · gastar dinheiro · poupar dinheiro',
      reviewedOn: '2026-10-01',
      sources: [
        `${PRIBERAM}ganhar`,
        `${PRIBERAM}gastar`,
        `${PRIBERAM}poupar`,
        `${PRIBERAM}pagar`,
        `${PRIBERAM}comprar`,
        `${PRIBERAM}custar`,
      ],
      exercises: [
        word('u19-mw-01', 'ganhar dinheiro', 'зарабатывать деньги', 'to earn money', ['ganhar']),
        word('u19-mw-02', 'gastar dinheiro', 'тратить деньги', 'to spend money', ['gastar']),
        word('u19-mw-03', 'poupar dinheiro', 'экономить, откладывать деньги', 'to save money', [
          'poupar',
          'economizar dinheiro',
          'economizar',
        ]),
        word('u19-mw-04', 'pagar', 'платить', 'to pay'),
        word('u19-mw-05', 'comprar', 'покупать', 'to buy'),
        word('u19-mw-06', 'custar', 'стоить', 'to cost'),
      ],
    },
    {
      id: 'money-forms',
      kind: 'cloze',
      title: { ru: 'Личная форма или инфинитив', en: 'Personal form or infinitive' },
      instruction: {
        ru: 'Поставьте глагол из подсказки в нужную форму настоящего времени — или оставьте в инфинитиве, если он стоит после querer, gostar de или precisar de.',
        en: 'Put the verb from the hint in the right present-tense form — or leave it in the infinitive when it follows querer, gostar de or precisar de.',
      },
      example: 'Eu gasto muito. · Quero pagar com cartão.',
      ruleId: 'ref-verbos-presente',
      reviewedOn: '2026-10-01',
      sources: [
        `${PRIBERAM}conjugar/gastar`,
        `${PRIBERAM}conjugar/custar`,
        `${PRIBERAM}conjugar/pagar`,
        `${PRIBERAM}conjugar/poupar`,
        `${PRIBERAM}conjugar/ganhar`,
        `${PRIBERAM}conjugar/comprar`,
      ],
      exercises: [
        form('u19-mf-01', 'Eu ___ muito dinheiro em livros.', 'gastar', 'gasto', ...FINITE('eu', 'gasto')),
        form('u19-mf-02', 'Quanto ___ este casaco?', 'custar', 'custa', ...FINITE('este casaco', 'custa')),
        form('u19-mf-03', 'Tu queres ___ com cartão?', 'pagar', 'pagar', ...INFINITIVE('queres')),
        form('u19-mf-04', 'Nós ___ dinheiro para as férias.', 'poupar', 'poupamos', ...FINITE('nós', 'poupamos')),
        form('u19-mf-05', 'Ela ___ bem no novo emprego.', 'ganhar', 'ganha', ...FINITE('ela', 'ganha')),
        form('u19-mf-06', 'Eles gostam de ___ roupa nova.', 'comprar', 'comprar', ...INFINITIVE('gostam de')),
        form('u19-mf-07', 'Vocês ___ sempre o jantar.', 'pagar', 'pagam', ...FINITE('vocês', 'pagam')),
        form('u19-mf-08', 'Eu preciso de ___ dinheiro este mês.', 'poupar', 'poupar', ...INFINITIVE('preciso de')),
        form('u19-mf-09', 'Estes sapatos ___ cinquenta euros.', 'custar', 'custam', ...FINITE('estes sapatos', 'custam')),
        form('u19-mf-10', 'Tu ___ pouco, mas gastas muito.', 'ganhar', 'ganhas', ...FINITE('tu', 'ganhas')),
      ],
    },
    {
      id: 'money-choice',
      kind: 'cloze',
      title: { ru: 'Какой глагол и в какой форме', en: 'Which verb, and in which form' },
      instruction: {
        ru: 'Выберите по смыслу один из глаголов: pagar, gastar, ganhar, poupar, custar, comprar — и напишите его в настоящем времени или в инфинитиве, если этого требует фраза.',
        en: 'Choose one of the verbs by meaning: pagar, gastar, ganhar, poupar, custar, comprar — and write it in the present tense, or in the infinitive when the sentence requires it.',
      },
      example: 'Quanto custam os bilhetes? · Quero pagar com cartão.',
      ruleId: 'ref-verbos-presente',
      reviewedOn: '2026-10-01',
      sources: [
        `${PRIBERAM}ganhar`,
        `${PRIBERAM}poupar`,
        `${PRIBERAM}gastar`,
        `${PRIBERAM}comprar`,
        `${PRIBERAM}pagar`,
        `${PRIBERAM}custar`,
        `${PRIBERAM}conjugar/ganhar`,
        `${PRIBERAM}conjugar/custar`,
        `${PRIBERAM}conjugar/comprar`,
        `${PRIBERAM}conjugar/poupar`,
        `${PRIBERAM}conjugar/pagar`,
        `${PRIBERAM}conjugar/gastar`,
      ],
      exercises: [
        pick('u19-mc-01', 'No meu trabalho, eu ___ dois mil euros de salário por mês.', 'ganho', 'Получаю как зарплату — зарабатываю: eu → ganho.', 'I get it as a salary — I earn: eu → ganho.'),
        pick('u19-mc-02', 'Este telemóvel ___ trezentos euros.', 'custa', 'Цена вещи — стоит: este telemóvel → custa.', 'The price of a thing — it costs: este telemóvel → custa.'),
        pick('u19-mc-03', 'Ao sábado, nós ___ fruta no mercado.', 'compramos', 'Отдаём деньги и получаем товар — покупаем: nós → compramos.', 'We give money and get goods — we buy: nós → compramos.'),
        pick('u19-mc-04', 'Eles não ___ dinheiro: gastam tudo.', 'poupam', 'Тратят всё, значит не откладывают: eles → poupam.', 'They spend everything, so they do not save: eles → poupam.'),
        pick('u19-mc-05', 'Vocês querem ___ em dinheiro ou com cartão?', 'pagar', 'Наличными или картой — платить; после querem — инфинитив.', 'In cash or by card — to pay; after querem the infinitive.'),
        pick('u19-mc-06', 'Tu ___ demasiado dinheiro em roupa: não poupas nada.', 'gastas', 'Ничего не откладываешь, значит тратишь: tu → gastas.', 'You save nothing, so you spend: tu → gastas.'),
        pick('u19-mc-07', 'Ela gosta de ___ livros naquela livraria.', 'comprar', 'Получать товар за деньги — покупать; после gosta de — инфинитив.', 'To get goods for money — to buy; after gosta de the infinitive.'),
        pick('u19-mc-08', 'Quanto ___ os bilhetes?', 'custam', 'Вопрос о цене — стоят: os bilhetes → custam.', 'A question about the price — they cost: os bilhetes → custam.'),
      ],
    },
    {
      id: 'ter-de',
      kind: 'cloze',
      title: { ru: 'Ter de: должен, нужно', en: 'Ter de: have to' },
      instruction: {
        ru: 'Заполните пропуск оборотом ter de в нужной форме настоящего времени.',
        en: 'Fill the gap with ter de in the right present-tense form.',
      },
      example: 'Tenho de trabalhar. · Vocês têm de pagar.',
      ruleId: 'ref-ter-de-precisar-de',
      reviewedOn: '2026-10-01',
      sources: [
        `${PRIBERAM}conjugar/ter`,
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/ter-de-vs-ter-que/34000',
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/duvidas-sobre-o-ter-de-e-o-ter-que/14247',
      ],
      exercises: [
        form('u19-td-01', 'Eu ___ trabalhar amanhã.', 'ter de', 'tenho de', 'eu → tenho de.', 'eu → tenho de.'),
        form('u19-td-02', 'Tu ___ pagar na caixa.', 'ter de', 'tens de', 'tu → tens de.', 'tu → tens de.'),
        form('u19-td-03', 'O senhor ___ pôr o cinto.', 'ter de', 'tem de', 'o senhor (= ele) → tem de.', 'o senhor (= ele) → tem de.'),
        form('u19-td-04', 'Nós ___ acordar cedo.', 'ter de', 'temos de', 'nós → temos de.', 'nós → temos de.'),
        form(
          'u19-td-05',
          'Vocês ___ desligar o telemóvel.',
          'ter de',
          'têm de',
          'vocês → têm de, с крышечкой: tem — это «он», têm — «они, вы».',
          'vocês → têm de, with the circumflex: tem is "he", têm is "they, you".',
        ),
        form(
          'u19-td-06',
          'Eles ___ estudar para o teste.',
          'ter de',
          'têm de',
          'eles → têm de, с крышечкой.',
          'eles → têm de, with the circumflex.',
        ),
        form(
          'u19-td-07',
          'Ela não ___ trabalhar ao sábado.',
          'ter de',
          'tem de',
          'ela → tem de; не обязана — não перед глаголом.',
          'ela → tem de; "does not have to" puts não before the verb.',
        ),
        form('u19-td-08', 'A Ana ___ comprar um bilhete.', 'ter de', 'tem de', 'a Ana (= ela) → tem de.', 'a Ana (= ela) → tem de.'),
      ],
    },
    {
      id: 'precisar-de',
      kind: 'cloze',
      title: { ru: 'Precisar de: нужно, нуждаться', en: 'Precisar de: need' },
      instruction: {
        ru: 'Заполните пропуск оборотом precisar de в нужной форме настоящего времени.',
        en: 'Fill the gap with precisar de in the right present-tense form.',
      },
      example: 'Preciso de descansar. · Esta planta precisa de água.',
      ruleId: 'ref-ter-de-precisar-de',
      reviewedOn: '2026-10-01',
      sources: [
        `${PRIBERAM}conjugar/precisar`,
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/a-regencia-de-precisar-novamente/29947',
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/a-regencia-do-verbo-precisar/16327',
      ],
      exercises: [
        form('u19-pd-01', 'Esta planta ___ água.', 'precisar de', 'precisa de', 'esta planta (= ela) → precisa de + существительное.', 'esta planta (= ela) → precisa de + noun.'),
        form('u19-pd-02', 'Eu ___ descansar.', 'precisar de', 'preciso de', 'eu → preciso de + инфинитив.', 'eu → preciso de + infinitive.'),
        form('u19-pd-03', 'Tu ___ dormir mais.', 'precisar de', 'precisas de', 'tu → precisas de + инфинитив.', 'tu → precisas de + infinitive.'),
        form('u19-pd-04', 'Nós ___ um táxi.', 'precisar de', 'precisamos de', 'nós → precisamos de + существительное.', 'nós → precisamos de + noun.'),
        form('u19-pd-05', 'Eles ___ estudar mais.', 'precisar de', 'precisam de', 'eles → precisam de + инфинитив.', 'eles → precisam de + infinitive.'),
        form('u19-pd-06', 'Vocês ___ ajuda?', 'precisar de', 'precisam de', 'vocês → precisam de + существительное.', 'vocês → precisam de + noun.'),
        form('u19-pd-07', 'O gato ___ comer.', 'precisar de', 'precisa de', 'o gato (= ele) → precisa de + инфинитив.', 'o gato (= ele) → precisa de + infinitive.'),
        form('u19-pd-08', 'Eu não ___ nada.', 'precisar de', 'preciso de', 'eu → preciso de; não стоит перед глаголом.', 'eu → preciso de; não goes before the verb.'),
      ],
    },
    {
      id: 'sentences',
      kind: 'build',
      title: { ru: 'Фраза по опорам', en: 'A sentence from cue words' },
      instruction: {
        ru: 'Напишите предложение целиком в настоящем времени. Порядок слов не меняйте; поставьте первый глагол в нужную форму. Артикли уже даны в опорах.',
        en: 'Write the whole sentence in the present tense. Keep the word order; put the first verb in the right form. The articles are already given in the cue words.',
      },
      example: 'eu / ter de / pagar / a conta',
      ruleId: 'ref-ter-de-precisar-de',
      reviewedOn: '2026-10-01',
      sources: [
        `${PRIBERAM}conjugar/ter`,
        `${PRIBERAM}conjugar/precisar`,
        `${PRIBERAM}conjugar/querer`,
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/a-regencia-de-precisar-novamente/29947',
      ],
      exercises: [
        {
          id: 'u19-sent-01',
          prompt: 'eu / ter de / pagar / a conta',
          answer: 'Eu tenho de pagar a conta.',
          why: {
            ru: 'eu → tenho de + инфинитив.',
            en: 'eu → tenho de + infinitive.',
          },
        },
        {
          id: 'u19-sent-02',
          prompt: 'este / cão / precisar de / comer',
          answer: 'Este cão precisa de comer.',
          why: {
            ru: 'este cão (= ele) → precisa de + инфинитив.',
            en: 'este cão (= ele) → precisa de + infinitive.',
          },
        },
        {
          id: 'u19-sent-03',
          prompt: 'nós / ter de / comprar / bilhetes',
          answer: 'Nós temos de comprar bilhetes.',
          accept: ['Nós temos de comprar os bilhetes.', 'Nós temos de comprar uns bilhetes.'],
          why: {
            ru: 'nós → temos de + инфинитив. С артиклем тоже верно: os bilhetes — те самые, uns bilhetes — какие-то.',
            en: 'nós → temos de + infinitive. An article is also fine: os bilhetes — those ones, uns bilhetes — some.',
          },
        },
        {
          id: 'u19-sent-04',
          prompt: 'tu / não / precisar de / gastar / tanto / dinheiro',
          answer: 'Tu não precisas de gastar tanto dinheiro.',
          why: {
            ru: 'tu → precisas de; não — перед глаголом; второй глагол в инфинитиве.',
            en: 'tu → precisas de; não goes before the verb; the second verb stays in the infinitive.',
          },
        },
        {
          id: 'u19-sent-05',
          prompt: 'eles / querer / poupar / dinheiro',
          answer: 'Eles querem poupar dinheiro.',
          accept: ['Eles querem poupar o dinheiro.'],
          why: {
            ru: 'eles → querem; после querer глагол в инфинитиве.',
            en: 'eles → querem; after querer the verb stays in the infinitive.',
          },
        },
        {
          id: 'u19-sent-06',
          prompt: 'aquela / casa / custar / muito / dinheiro',
          answer: 'Aquela casa custa muito dinheiro.',
          why: {
            ru: 'aquela casa (= ela) → custa.',
            en: 'aquela casa (= ela) → custa.',
          },
        },
        {
          id: 'u19-sent-07',
          prompt: 'vocês / ter de / desligar / o telemóvel',
          answer: 'Vocês têm de desligar o telemóvel.',
          why: {
            ru: 'vocês → têm de, с крышечкой.',
            en: 'vocês → têm de, with the circumflex.',
          },
        },
        {
          id: 'u19-sent-08',
          prompt: 'esta / flor / precisar de / água',
          answer: 'Esta flor precisa de água.',
          why: {
            ru: 'esta flor (= ela) → precisa de + существительное, без артикля: вода вообще.',
            en: 'esta flor (= ela) → precisa de + noun, no article: water in general.',
          },
        },
      ],
    },
  ],
  drills: [
    {
      to: '/drill/conjugation',
      title: { ru: 'Спряжение: pagar, gastar, poupar, precisar…', en: 'Conjugation: pagar, gastar, poupar, precisar…' },
      example: 'eu pago · tu gastas · nós poupamos',
    },
  ],
};
