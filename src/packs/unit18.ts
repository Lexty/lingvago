import type { Pack, PackExercise } from './types.ts';
import { UNIT_18_VOCAB } from './unit18.vocab.ts';

// Unidade 18 — comparing things, geography, trips.
//
// The sentences are our own (not copied from the coursebook): the point is to
// practise the mechanic on new material, not to memorise the homework key.

const PRIBERAM = 'https://dicionario.priberam.org/';

/** `gloss → o/a noun`: the word is learned together with its article. */
function noun(
  id: string,
  answer: string,
  ru: string,
  en: string,
  accept?: readonly string[],
): PackExercise {
  const feminine = answer.startsWith('a ');
  return {
    id,
    cue: { ru, en },
    answer,
    accept,
    why: {
      ru: `${answer.split(' ')[1]} — ${feminine ? 'женский' : 'мужской'} род: ${answer}.`,
      en: `${answer.split(' ')[1]} is ${feminine ? 'feminine' : 'masculine'}: ${answer}.`,
    },
  };
}

/** `word ↔ ___`: write the opposite. */
function opposite(
  id: string,
  given: string,
  answer: string,
  ru: string,
  en: string,
  accept?: readonly string[],
): PackExercise {
  return {
    id,
    prompt: `${given} ↔ ___`,
    cue: { ru, en },
    answer,
    accept,
    why: {
      ru: `${given} ↔ ${answer}.`,
      en: `${given} ↔ ${answer}.`,
    },
  };
}

/** `saber / conhecer`: the verb is chosen by what follows the gap. */
function sc(id: string, prompt: string, answer: string, ru: string, en: string): PackExercise {
  const verb = answer.startsWith('s') ? 'saber' : 'conhecer';
  return {
    id,
    prompt,
    cue: { ru: 'saber / conhecer', en: 'saber / conhecer' },
    answer,
    why: { ru: `${verb}: ${ru}.`, en: `${verb}: ${en}.` },
  };
}

export const UNIT_18: Pack = {
  id: 'unit-18',
  unit: 18,
  title: { ru: 'Сравнения и поездки', en: 'Comparisons and trips' },
  summary: {
    ru: 'География, слова-противоположности, «больше / меньше / такой же», «самый», saber и conhecer.',
    en: 'Geography, opposites, "more / less / as … as", "the most", saber and conhecer.',
  },
  groups: [
    {
      id: 'geography',
      kind: 'recall',
      title: { ru: 'География: слова с артиклем', en: 'Geography: words with their article' },
      instruction: {
        ru: 'Напишите слово по-португальски вместе с артиклем: o или a.',
        en: 'Write the Portuguese word together with its article: o or a.',
      },
      example: 'o lago · a ilha · a capital',
      ruleId: 'ref-genero-artigo',
      reviewedOn: '2026-10-01',
      sources: [
        `${PRIBERAM}lago`,
        `${PRIBERAM}rio`,
        `${PRIBERAM}oceano`,
        `${PRIBERAM}capital`,
        `${PRIBERAM}costa`,
        `${PRIBERAM}mar`,
        `${PRIBERAM}montanha`,
        `${PRIBERAM}ilha`,
        `${PRIBERAM}pa%C3%ADs`,
        `${PRIBERAM}cidade`,
        `${PRIBERAM}litoral`,
      ],
      exercises: [
        noun('u18-geo-01', 'o lago', 'озеро', 'lake'),
        noun('u18-geo-02', 'o rio', 'река', 'river'),
        noun('u18-geo-03', 'o oceano', 'океан', 'ocean'),
        noun('u18-geo-04', 'a capital', 'столица', 'capital city'),
        noun('u18-geo-05', 'a costa', 'побережье', 'coast', ['o litoral']),
        noun('u18-geo-06', 'o mar', 'море', 'sea'),
        noun('u18-geo-07', 'a montanha', 'гора', 'mountain'),
        noun('u18-geo-08', 'a ilha', 'остров', 'island'),
        noun('u18-geo-09', 'o país', 'страна', 'country'),
        noun('u18-geo-10', 'a cidade', 'город', 'city'),
      ],
    },
    {
      id: 'opposites',
      kind: 'recall',
      title: { ru: 'Противоположности', en: 'Opposites' },
      instruction: {
        ru: 'Напишите слово с противоположным значением.',
        en: 'Write the word with the opposite meaning.',
      },
      example: 'barato ↔ caro · perto ↔ longe',
      reviewedOn: '2026-10-01',
      sources: [
        `${PRIBERAM}vazio`,
        `${PRIBERAM}barulhento`,
        `${PRIBERAM}longo`,
        `${PRIBERAM}estreito`,
        `${PRIBERAM}desagrad%C3%A1vel`,
        `${PRIBERAM}frio`,
        `${PRIBERAM}longe`,
        `${PRIBERAM}caro`,
        `${PRIBERAM}feio`,
        `${PRIBERAM}pobre`,
        `${PRIBERAM}ruidoso`,
        `${PRIBERAM}comprido`,
      ],
      exercises: [
        opposite('u18-opp-01', 'cheio', 'vazio', 'пустой', 'empty'),
        opposite('u18-opp-02', 'calmo', 'barulhento', 'шумный', 'noisy', ['ruidoso']),
        opposite('u18-opp-03', 'curto', 'longo', 'длинный, долгий', 'long', ['comprido']),
        opposite('u18-opp-04', 'largo', 'estreito', 'узкий', 'narrow'),
        opposite('u18-opp-05', 'agradável', 'desagradável', 'неприятный', 'unpleasant'),
        opposite('u18-opp-06', 'quente', 'frio', 'холодный', 'cold'),
        opposite('u18-opp-07', 'perto', 'longe', 'далеко', 'far'),
        opposite('u18-opp-08', 'barato', 'caro', 'дорогой', 'expensive'),
        opposite('u18-opp-09', 'bonito', 'feio', 'некрасивый', 'ugly'),
        opposite('u18-opp-10', 'rico', 'pobre', 'бедный', 'poor'),
      ],
    },
    {
      id: 'comparisons',
      kind: 'cloze',
      title: { ru: 'Сравнения: пропуск', en: 'Comparisons: fill the gap' },
      instruction: {
        ru: 'Заполните пропуск. Знак в скобках: (+) больше, (−) меньше, (=) одинаково.',
        en: 'Fill the gap. The sign in brackets: (+) more, (−) less, (=) the same.',
      },
      example: 'mais … do que · tão … como · o mais … de',
      ruleId: 'ref-comparacao',
      reviewedOn: '2026-10-01',
      sources: [
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/construcoes-comparativas-do-que-e-que/34152',
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/o-comparativo-de-superioridade-de-pequeno-mais-pequeno-ou-menor/16506',
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/o-artigo-definido-na-construcao-do-superlativo-relativo/32124',
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/tao-como--tao-quanto/31742',
      ],
      exercises: [
        {
          id: 'u18-comp-01',
          prompt: 'A Ana é ___ alta do que o Rui.',
          cue: { ru: '(+)', en: '(+)' },
          answer: 'mais',
          why: { ru: 'Больше: mais + прилагательное + do que.', en: 'More: mais + adjective + do que.' },
        },
        {
          id: 'u18-comp-02',
          prompt: 'Este hotel é ___ caro do que aquele.',
          cue: { ru: '(−)', en: '(−)' },
          answer: 'menos',
          why: { ru: 'Меньше: menos + прилагательное + do que.', en: 'Less: menos + adjective + do que.' },
        },
        {
          id: 'u18-comp-03',
          prompt: 'A minha rua é ___ calma como a tua.',
          cue: { ru: '(=)', en: '(=)' },
          answer: 'tão',
          why: { ru: 'Одинаково: tão + прилагательное + como.', en: 'The same: tão + adjective + como.' },
        },
        {
          id: 'u18-comp-04',
          prompt: 'O Rui é tão simpático ___ a Ana.',
          cue: { ru: '(=)', en: '(=)' },
          answer: 'como',
          accept: ['quanto'],
          why: {
            ru: 'После tão вторая часть — como (tão … quanto тоже верно).',
            en: 'After tão the second part is como (tão … quanto is also correct).',
          },
        },
        {
          id: 'u18-comp-05',
          prompt: 'Lisboa é mais quente ___ o Porto.',
          cue: { ru: '(+)', en: '(+)' },
          answer: 'do que',
          accept: ['que'],
          why: {
            ru: 'После mais / menos вторая часть — do que (просто que тоже верно).',
            en: 'After mais / menos the second part is do que (plain que is also correct).',
          },
        },
        {
          id: 'u18-comp-06',
          prompt: 'Este restaurante é ___ do que aquele.',
          cue: { ru: 'bom, (+)', en: 'bom, (+)' },
          answer: 'melhor',
          why: { ru: 'bom → melhor. Нельзя: mais bom.', en: 'bom → melhor. Not: mais bom.' },
        },
        {
          id: 'u18-comp-07',
          prompt: 'Este café é ___ do que aquele.',
          cue: { ru: 'mau, (+)', en: 'mau, (+)' },
          answer: 'pior',
          why: { ru: 'mau → pior. Нельзя: mais mau.', en: 'mau → pior. Not: mais mau.' },
        },
        {
          id: 'u18-comp-08',
          prompt: 'A minha casa é ___ do que a tua.',
          cue: { ru: 'grande, (+)', en: 'grande, (+)' },
          answer: 'maior',
          why: { ru: 'grande → maior. Нельзя: mais grande.', en: 'grande → maior. Not: mais grande.' },
        },
        {
          id: 'u18-comp-09',
          prompt: 'O quarto dele é ___ do que o meu.',
          cue: { ru: 'pequeno, (+)', en: 'pequeno, (+)' },
          answer: 'mais pequeno',
          accept: ['menor'],
          why: {
            ru: 'В Португалии обычно говорят mais pequeno; menor тоже верно.',
            en: 'Portugal normally says mais pequeno; menor is also correct.',
          },
        },
        {
          id: 'u18-comp-10',
          prompt: 'Este é o rio ___ longo do país.',
          cue: { ru: 'самый', en: 'the most' },
          answer: 'mais',
          why: {
            ru: 'Самый: артикль + существительное + mais + прилагательное.',
            en: 'The most: article + noun + mais + adjective.',
          },
        },
        {
          id: 'u18-comp-11',
          prompt: 'É a praia mais bonita ___ ilha.',
          cue: { ru: 'самая … на острове: de + артикль', en: 'the most … on the island: de + article' },
          answer: 'da',
          why: {
            ru: 'Среди чего — через de: de + a ilha = da ilha.',
            en: 'The group is introduced by de: de + a ilha = da ilha.',
          },
        },
        {
          id: 'u18-comp-12',
          prompt: 'É o melhor aluno ___ grupo.',
          cue: { ru: 'лучший … в группе: de + артикль', en: 'the best … in the group: de + article' },
          answer: 'do',
          why: {
            ru: 'Среди чего — через de: de + o grupo = do grupo.',
            en: 'The group is introduced by de: de + o grupo = do grupo.',
          },
        },
      ],
    },
    {
      id: 'saber-conhecer',
      kind: 'cloze',
      title: { ru: 'Saber или conhecer', en: 'Saber or conhecer' },
      instruction: {
        ru: 'Выберите saber или conhecer и напишите его в нужной форме настоящего времени.',
        en: 'Choose saber or conhecer and write it in the right present-tense form.',
      },
      example: 'Sabes onde fica? · Conheces a Teresa?',
      ruleId: 'ref-saber-conhecer',
      reviewedOn: '2026-10-01',
      sources: [
        `${PRIBERAM}conjugar/saber`,
        `${PRIBERAM}conjugar/conhecer`,
        `${PRIBERAM}conhecer`,
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/porque-por-que-e-porque/243',
      ],
      exercises: [
        sc('u18-sc-01', 'Tu ___ a mãe do Pedro?', 'conheces', 'человек', 'a person'),
        sc('u18-sc-02', 'Eu não ___ onde fica a estação.', 'sei', 'дальше идёт onde …', 'onde … follows'),
        sc('u18-sc-03', 'Nós ___ bem esta cidade.', 'conhecemos', 'место', 'a place'),
        sc('u18-sc-04', 'Eles ___ falar inglês.', 'sabem', 'дальше инфинитив: умеют', 'an infinitive follows: can'),
        sc('u18-sc-05', 'Ela ___ que o museu fecha à segunda-feira.', 'sabe', 'дальше идёт que …', 'que … follows'),
        sc('u18-sc-06', 'Vocês ___ o novo professor?', 'conhecem', 'человек', 'a person'),
        sc('u18-sc-07', 'Eu ___ muito bem a tua irmã.', 'conheço', 'человек', 'a person'),
        sc('u18-sc-08', 'Tu ___ quem é aquele senhor?', 'sabes', 'дальше идёт quem é …', 'quem é … follows'),
        sc('u18-sc-09', 'Ele não ___ nadar.', 'sabe', 'дальше инфинитив: умеет', 'an infinitive follows: can'),
        sc(
          'u18-sc-10',
          'Nós não ___ porque o comboio está atrasado.',
          'sabemos',
          'дальше идёт porque …',
          'porque … follows',
        ),
      ],
    },
    {
      id: 'sentences',
      kind: 'build',
      title: { ru: 'Фраза по опорам', en: 'A sentence from cue words' },
      instruction: {
        ru: 'Напишите предложение целиком в настоящем времени. Порядок слов не меняйте; поставьте глагол в нужную форму и добавьте артикли, предлоги и союзы.',
        en: 'Write the whole sentence in the present tense. Keep the word order; put the verb in the right form and add the articles, prepositions and conjunctions.',
      },
      example: 'Lisboa / ser / maior / cidade / país',
      ruleId: 'ref-comparacao',
      reviewedOn: '2026-10-01',
      sources: [
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/o-artigo-definido-na-construcao-do-superlativo-relativo/32124',
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/construcoes-comparativas-do-que-e-que/34152',
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/regra-para-a-posicao-dos-pronomes-possessivos/29320',
        'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/o-comparativo-de-superioridade-de-pequeno-mais-pequeno-ou-menor/16506',
      ],
      exercises: [
        {
          id: 'u18-sent-01',
          prompt: 'Lisboa / ser / maior / cidade / país',
          answer: 'Lisboa é a maior cidade do país.',
          why: {
            ru: 'Самая большая: a maior + существительное; «в стране» — do país (de + o).',
            en: 'The biggest: a maior + noun; "in the country" is do país (de + o).',
          },
        },
        {
          id: 'u18-sent-02',
          prompt: 'este / rio / ser / mais / longo / todos',
          answer: 'Este rio é o mais longo de todos.',
          why: {
            ru: 'Самый: o mais + прилагательное; «из всех» — de todos.',
            en: 'The most: o mais + adjective; "of all" is de todos.',
          },
        },
        {
          id: 'u18-sent-03',
          prompt: 'teu / carro / ser / tão / caro / como / meu',
          answer: 'O teu carro é tão caro como o meu.',
          why: {
            ru: 'Здесь перед притяжательным стоит артикль: o teu carro, o meu.',
            en: 'Here the possessive takes the article: o teu carro, o meu.',
          },
        },
        {
          id: 'u18-sent-04',
          prompt: 'Rui / ser / mais / alto / turma',
          answer: 'O Rui é o mais alto da turma.',
          accept: ['Rui é o mais alto da turma.'],
          why: {
            ru: 'Самый: o mais alto; «в классе» — da turma (de + a). Имя обычно с артиклем: o Rui.',
            en: 'The most: o mais alto; "in the class" is da turma (de + a). A name usually takes the article: o Rui.',
          },
        },
        {
          id: 'u18-sent-05',
          prompt: 'Marta / ser / melhor / professora / escola',
          answer: 'A Marta é a melhor professora da escola.',
          accept: ['Marta é a melhor professora da escola.'],
          why: {
            ru: 'Лучшая: a melhor + существительное (без mais); «в школе» — da escola.',
            en: 'The best: a melhor + noun (no mais); "in the school" is da escola.',
          },
        },
        {
          id: 'u18-sent-06',
          prompt: 'esta / praia / ser / menos / calma / aquela',
          answer: 'Esta praia é menos calma do que aquela.',
          accept: ['Esta praia é menos calma que aquela.'],
          why: {
            ru: 'Меньше: menos + прилагательное + do que.',
            en: 'Less: menos + adjective + do que.',
          },
        },
        {
          id: 'u18-sent-07',
          prompt: 'nossa / casa / ser / mais / pequena / vossa',
          answer: 'A nossa casa é mais pequena do que a vossa.',
          accept: [
            'A nossa casa é mais pequena que a vossa.',
            'A nossa casa é menor do que a vossa.',
            'A nossa casa é menor que a vossa.',
          ],
          why: {
            ru: 'Артикль перед притяжательным (a nossa, a vossa); «меньше по размеру» — mais pequena do que.',
            en: 'Article before the possessive (a nossa, a vossa); "smaller" is mais pequena do que.',
          },
        },
        {
          id: 'u18-sent-08',
          prompt: 'este / ser / pior / hotel / ilha',
          answer: 'Este é o pior hotel da ilha.',
          why: {
            ru: 'Худший: o pior + существительное (без mais); «на острове» — da ilha.',
            en: 'The worst: o pior + noun (no mais); "on the island" is da ilha.',
          },
        },
      ],
    },
  ],
  drills: [
    {
      to: '/drill/gender',
      title: { ru: 'Род и согласование: vários / várias', en: 'Gender and agreement: vários / várias' },
      example: '(vários) ___ viagens → várias',
    },
  ],
  vocab: UNIT_18_VOCAB,
};
