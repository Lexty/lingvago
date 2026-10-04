import type { ChoiceOption, PackExercise, PackGroup } from './types.ts';

// Unidade 19, the second half: indefinite words (alguém, ninguém, tudo, todo…),
// "have / must / may / can" (ter, ter de, poder, saber), and actions with their
// objects. Our own sentences, not the coursebook's.

const PRIBERAM = 'https://dicionario.priberam.org/';
const CIBER = 'https://ciberduvidas.iscte-iul.pt/';

function gap(
  id: string,
  prompt: string,
  answer: string,
  ru: string,
  en: string,
  accept?: readonly string[],
): PackExercise {
  return accept ? { id, prompt, answer, accept, why: { ru, en } } : { id, prompt, answer, why: { ru, en } };
}

/** `[the part to replace]` in the prompt; the answer is the whole new sentence. */
const rewrite = gap;

function meaning(
  id: string,
  cueRu: string,
  cueEn: string,
  answer: string,
  ru: string,
  en: string,
  accept?: readonly string[],
): PackExercise {
  const exercise: PackExercise = { id, cue: { ru: cueRu, en: cueEn }, answer, why: { ru, en } };
  return accept ? { ...exercise, accept } : exercise;
}

/**
 * A short answer and its natural variants: with or without the leading
 * `Sim` / `Não` (after a comma or as its own sentence), and with each of the
 * given subjects — `''` for the dropped subject. The first one is the model.
 */
function shortAnswers(yesNo: 'Sim' | 'Não', subjects: readonly string[], rest: string): [string, string[]] {
  const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const all: string[] = [];
  for (const subject of subjects) {
    const sentence = subject ? `${subject} ${rest}` : rest;
    all.push(`${yesNo}, ${sentence}`, `${yesNo}. ${cap(sentence)}`, cap(sentence));
  }
  const unique = [...new Set(all)];
  return [unique[0], unique.slice(1)];
}

function skill(
  id: string,
  prompt: string,
  [answer, accept]: [string, string[]],
  ru: string,
  en: string,
  extra: readonly string[] = [],
): PackExercise {
  return { id, prompt, answer, accept: [...accept, ...extra], why: { ru, en } };
}

function question(id: string, prompt: string, answer: string, ru: string, en: string, accept: readonly string[]): PackExercise {
  return { id, prompt, cue: { ru: 'задайте вопрос', en: 'ask the question' }, answer, accept, why: { ru, en } };
}

// ── Block: alguém, ninguém, algo, nada, todos, tudo ──────────────────────────

const INDEFINITE_SOURCES = [
  `${PRIBERAM}alguém`,
  `${PRIBERAM}ninguém`,
  `${PRIBERAM}algo`,
  `${PRIBERAM}nada`,
  `${PRIBERAM}tudo`,
  `${PRIBERAM}todo`,
  `${CIBER}artigos/rubricas/idioma/dupla-negativa/4913`,
  `${CIBER}consultorio/perguntas/todo-e-tudo--branco/12667`,
];

export const INDEFINITE_GROUPS: readonly PackGroup[] = [
  {
    id: 'indefinidos',
    kind: 'cloze',
    title: { ru: 'Кто-то, никто, что-то, ничего', en: 'Someone, no one, something, nothing' },
    instruction: {
      ru: 'Заполните пропуск одним словом: alguém, ninguém, algo, nada, todos или tudo. Люди — alguém / ninguém / todos, вещи — algo / nada / tudo.',
      en: 'Fill the gap with one word: alguém, ninguém, algo, nada, todos or tudo. People — alguém / ninguém / todos; things — algo / nada / tudo.',
    },
    example: 'Está alguém em casa? · Não quero nada.',
    ruleId: 'ref-indefinidos',
    reviewedOn: '2026-10-04',
    sources: INDEFINITE_SOURCES,
    exercises: [
      gap('u19-in-01', 'Está ___ em casa? Ouço vozes na sala.', 'alguém', 'Голоса — значит какой-то человек: alguém.', 'Voices — some person: alguém.'),
      gap('u19-in-02', 'A loja está vazia: não está ___ lá dentro.', 'ninguém', 'Пусто, людей нет: não … ninguém.', 'Empty, no people: não … ninguém.'),
      gap('u19-in-03', 'Tenho um pouco de fome. Quero comer ___ leve.', 'algo', 'Какую-то еду — вещь: algo leve.', 'Some food — a thing: algo leve.', ['alguma coisa']),
      gap('u19-in-04', 'O frigorífico está vazio: não há ___ para comer.', 'nada', 'Вещей нет: não há nada.', 'No things: não há nada.'),
      gap('u19-in-05', 'Na nossa turma, ___ gostam da professora.', 'todos', 'Все люди: todos + глагол во мн. ч. (gostam).', 'All the people: todos + plural verb (gostam).'),
      gap('u19-in-06', 'A Ana come ___: carne, peixe, legumes, fruta.', 'tudo', 'Перечислены вещи — всё: tudo.', 'A list of things — everything: tudo.'),
      gap('u19-in-07', 'Ao domingo a loja fecha, porque ___ quer trabalhar nesse dia: nem os donos, nem os empregados.', 'ninguém', 'Никто не хочет; ninguém стоит перед глаголом — não не нужно.', 'Nobody wants to; ninguém is before the verb, so no não.'),
      gap('u19-in-08', 'Ele fala chinês e eu não sei chinês: não percebo ___.', 'nada', 'Языка не знаю — не понимаю ничего: não … nada.', 'I do not know the language — I understand nothing: não … nada.'),
      gap('u19-in-09', 'Conheces ___ em Lisboa? Preciso de um sítio para dormir.', 'alguém', 'Знаешь какого-нибудь человека: alguém.', 'Do you know any person: alguém.'),
      gap('u19-in-10', 'Está ___ pronto: podemos sair.', 'tudo', 'Всё готово — вещи, дела: tudo.', 'Everything is ready — things: tudo.'),
    ],
  },
  {
    id: 'todo-tudo',
    kind: 'cloze',
    title: { ru: 'Todo, toda, todos, todas или tudo', en: 'Todo, toda, todos, todas or tudo' },
    instruction: {
      ru: 'Заполните пропуск: todo, toda, todos, todas или tudo. Перед существительным todo согласуется с ним; tudo («всё») стоит само по себе.',
      en: 'Fill the gap: todo, toda, todos, todas or tudo. Before a noun, todo agrees with it; tudo ("everything") stands on its own.',
    },
    example: 'toda a cidade · todos os dias · Gosto de tudo.',
    ruleId: 'ref-indefinidos',
    reviewedOn: '2026-10-04',
    sources: [
      ...INDEFINITE_SOURCES,
      `${CIBER}consultorio/perguntas/todo-dia-e-todos-os-dias/23627`,
    ],
    exercises: [
      gap('u19-tt-01', 'Ao sábado, durmo ___ a manhã.', 'toda', 'a manhã — женский род, ед. ч.: toda a manhã = всё утро.', 'a manhã — feminine singular: toda a manhã = the whole morning.'),
      gap('u19-tt-02', 'Vou ao ginásio ___ as semanas.', 'todas', 'as semanas — ж. р., мн. ч.: todas as semanas = каждую неделю.', 'as semanas — feminine plural: todas as semanas = every week.'),
      gap('u19-tt-03', '___ os meus amigos falam inglês.', 'todos', 'os amigos — м. р., мн. ч.: todos os meus amigos.', 'os amigos — masculine plural: todos os meus amigos.'),
      gap('u19-tt-04', 'A criança não quer comer ___ a sopa.', 'toda', 'a sopa — ж. р., ед. ч.: toda a sopa = весь суп.', 'a sopa — feminine singular: toda a sopa = all the soup.'),
      gap('u19-tt-05', '___ o que está na mesa é para ti.', 'tudo', 'tudo o que … = всё, что …; существительного после нет.', 'tudo o que … = everything that …; no noun follows.'),
      gap('u19-tt-06', 'Vemos televisão ___ as noites.', 'todas', 'as noites — ж. р., мн. ч.: todas as noites = каждый вечер.', 'as noites — feminine plural: todas as noites = every evening.'),
      gap('u19-tt-07', 'Gosto de ___ nesta cidade: das ruas, das praias, das pessoas.', 'tudo', 'Всё — без существительного: gosto de tudo.', 'Everything — no noun: gosto de tudo.'),
      gap('u19-tt-08', '___ a família vem jantar ao domingo.', 'toda', 'a família — ж. р., ед. ч.: toda a família = вся семья.', 'a família — feminine singular: toda a família = the whole family.'),
      gap('u19-tt-09', 'Leio o jornal ___ os dias.', 'todos', 'Каждый день — todos os dias; todo o dia — «весь день».', 'Every day — todos os dias; todo o dia is "the whole day".'),
      gap('u19-tt-10', 'O bebé dorme ___ o dia.', 'todo', 'Весь день: o dia — м. р., ед. ч. → todo o dia.', 'The whole day: o dia — masculine singular → todo o dia.'),
    ],
  },
  {
    id: 'frase-inteira',
    kind: 'transform',
    title: { ru: 'Перепишите фразу целиком', en: 'Rewrite the whole sentence' },
    instruction: {
      ru: 'Замените часть в [скобках] одним словом: todos, tudo, alguém, algo, ninguém или nada — и перепишите фразу. Если скобок несколько, все они заменяются одним словом и получается одна фраза. Следите за глаголом, за não и за согласованием.',
      en: 'Replace the part in [brackets] with one word: todos, tudo, alguém, algo, ninguém or nada — and rewrite the sentence. With several brackets, one word replaces them all and you write one sentence. Watch the verb, não, and agreement.',
    },
    example: '[Nenhuma pessoa] quer sair. → Ninguém quer sair.',
    ruleId: 'ref-indefinidos',
    reviewedOn: '2026-10-04',
    sources: INDEFINITE_SOURCES,
    exercises: [
      rewrite('u19-fi-01', '[A Inês, o Pedro e a Rita] gostam de praia.', 'Todos gostam de praia.', 'Несколько людей → todos; глагол остаётся во мн. ч.', 'Several people → todos; the verb stays plural.'),
      rewrite(
        'u19-fi-02',
        '[O Rui] não fala chinês. [A Sara] não fala chinês. [O Tiago] também não fala chinês.',
        'Ninguém fala chinês.',
        'Ни один из них → ninguém. Ninguém стоит перед глаголом, поэтому não убираем.',
        'None of them → ninguém. Ninguém comes before the verb, so não goes.',
      ),
      rewrite('u19-fi-03', 'Na mochila tenho [uma coisa] para ti.', 'Na mochila tenho algo para ti.', 'Какая-то вещь → algo.', 'Some thing → algo.', ['Na mochila, tenho algo para ti.', 'Na mochila tenho alguma coisa para ti.']),
      rewrite('u19-fi-04', 'Hoje não compro [nenhuma coisa].', 'Hoje não compro nada.', 'Ни одной вещи → nada после глагола, não остаётся.', 'Not a single thing → nada after the verb; não stays.'),
      rewrite(
        'u19-fi-05',
        'Neste bairro, [as casas] são caras, [os cafés] são caros e [os restaurantes] também são caros.',
        'Neste bairro, tudo é caro.',
        'Всё → tudo: глагол в ед. ч. (é), прилагательное в м. р. ед. ч. (caro).',
        'Everything → tudo: singular verb (é), masculine singular adjective (caro).',
        ['Neste bairro tudo é caro.', 'Tudo é caro neste bairro.'],
      ),
      rewrite('u19-fi-06', 'Está [uma pessoa] à porta.', 'Está alguém à porta.', 'Какой-то человек → alguém.', 'Some person → alguém.', ['Alguém está à porta.']),
      rewrite('u19-fi-07', 'Não vejo [nenhuma pessoa] na rua.', 'Não vejo ninguém na rua.', 'Никого после глагола: não … ninguém, não остаётся.', 'Nobody after the verb: não … ninguém; não stays.'),
      rewrite(
        'u19-fi-08',
        '[Nenhuma coisa] é barata neste restaurante.',
        'Nada é barato neste restaurante.',
        'Ничто → nada перед глаголом, без não; прилагательное к nada — м. р.: barato.',
        'Nothing → nada before the verb, no não; an adjective after nada is masculine: barato.',
        ['Neste restaurante, nada é barato.', 'Neste restaurante nada é barato.'],
      ),
      rewrite('u19-fi-09', 'Não há [nenhuma coisa] no frigorífico.', 'Não há nada no frigorífico.', 'Ничего после глагола: não há nada.', 'Nothing after the verb: não há nada.'),
      rewrite('u19-fi-10', '[Nenhuma pessoa] quer sair com esta chuva.', 'Ninguém quer sair com esta chuva.', 'Никто перед глаголом: ninguém quer, без não.', 'Nobody before the verb: ninguém quer, no não.'),
    ],
  },
];

// ── «What does it mean?»: the same words, different constructions ───────────

const OBLIGATION_OPTIONS: readonly ChoiceOption[] = [
  { id: 'must', text: { ru: 'Это обязательно', en: 'It is required' } },
  { id: 'may', text: { ru: 'Это разрешено', en: 'It is allowed' } },
  { id: 'needNot', text: { ru: 'Это не обязательно', en: 'It is not required' } },
  { id: 'banned', text: { ru: 'Это запрещено', en: 'It is not allowed' } },
];

const NEED_NOT: [string, string] = [
  'não отрицает обязанность, а не разрешение: не обязательно (но не запрещено).',
  'não denies the obligation, not the permission: not required (but not forbidden).',
];

function means(id: string, prompt: string, answer: string, ru: string, en: string): PackExercise {
  return { id, prompt, answer, options: OBLIGATION_OPTIONS, why: { ru, en } };
}

// ── Block: ter / ter de / poder / saber ──────────────────────────────────────

/** `tenho de` → also `tenho que`: same meaning, both correct (the drills model ter de). */
const QUE = (form: string): string[] => [form.replace(/ de$/, ' que')];

export const MODAL_GROUPS: readonly PackGroup[] = [
  {
    id: 'ter-ou-ter-de',
    kind: 'cloze',
    title: { ru: 'Ter или ter de', en: 'Ter or ter de' },
    instruction: {
      ru: 'Заполните пропуск глаголом ter в нужной форме — с de, если дальше идёт инфинитив (должен что-то сделать), и без de, если дальше существительное (что-то есть).',
      en: 'Fill the gap with ter in the right form — with de when an infinitive follows (must do something), without de when a noun follows (have something).',
    },
    example: 'Tenho um carro. · Tenho de lavar o carro.',
    ruleId: 'ref-ter-de-precisar-de',
    reviewedOn: '2026-10-04',
    sources: [
      `${PRIBERAM}conjugar/ter`,
      `${PRIBERAM}ter`,
      `${CIBER}consultorio/perguntas/ter-de-vs-ter-que/34000`,
    ],
    exercises: [
      gap('u19-tr-01', 'Eu ___ dois irmãos.', 'tenho', 'Дальше существительное: tenho dois irmãos — у меня есть.', 'A noun follows: tenho dois irmãos — I have.'),
      gap('u19-tr-02', 'Eu ___ estudar para o exame.', 'tenho de', 'Дальше инфинитив: tenho de estudar — должен.', 'An infinitive follows: tenho de estudar — I must.', QUE('tenho de')),
      gap('u19-tr-03', 'Vocês ___ a morada do hotel?', 'têm', 'Существительное: têm a morada; vocês → têm, с крышечкой.', 'A noun: têm a morada; vocês → têm, with the circumflex.'),
      gap('u19-tr-04', 'Vocês ___ reservar a mesa antes.', 'têm de', 'Инфинитив: têm de reservar.', 'An infinitive: têm de reservar.', QUE('têm de')),
      gap('u19-tr-05', 'A Marta ___ um carro novo.', 'tem', 'Существительное: tem um carro.', 'A noun: tem um carro.'),
      gap('u19-tr-06', 'A Marta ___ levar o carro à oficina.', 'tem de', 'Инфинитив: tem de levar.', 'An infinitive: tem de levar.', QUE('tem de')),
      gap('u19-tr-07', 'Nós já ___ bilhetes para o concerto.', 'temos', 'Существительное: temos bilhetes.', 'A noun: temos bilhetes.'),
      gap('u19-tr-08', 'Nós ___ comprar os bilhetes hoje.', 'temos de', 'Инфинитив: temos de comprar.', 'An infinitive: temos de comprar.', QUE('temos de')),
      gap('u19-tr-09', 'Tu ___ tempo amanhã à tarde?', 'tens', 'Существительное: tens tempo.', 'A noun: tens tempo.'),
      gap('u19-tr-10', 'Tu ___ acordar cedo amanhã?', 'tens de', 'Инфинитив: tens de acordar.', 'An infinitive: tens de acordar.', QUE('tens de')),
    ],
  },
  {
    id: 'sentido',
    kind: 'choose',
    title: { ru: 'Что значит фраза?', en: 'What does it mean?' },
    instruction: {
      ru: 'Прочитайте фразу и выберите, что она значит.',
      en: 'Read the sentence and choose what it means.',
    },
    example: 'Aqui tem de pagar. · Aqui não tem de pagar.',
    ruleId: 'ref-poder-saber',
    reviewedOn: '2026-10-04',
    sources: [
      `${PRIBERAM}poder`,
      `${PRIBERAM}ter`,
      `${PRIBERAM}precisar`,
      `${CIBER}consultorio/perguntas/ter-de-vs-ter-que/34000`,
    ],
    exercises: [
      means('u19-se-01', 'Aqui tem de pagar.', 'must', 'tem de — обязанность: платить обязательно.', 'tem de — an obligation: paying is required.'),
      means('u19-se-02', 'Aqui não tem de pagar.', 'needNot', NEED_NOT[0], NEED_NOT[1]),
      means('u19-se-03', 'Regras do museu: aqui não pode tirar fotografias.', 'banned', 'Правило + não pode — запрет: фотографировать нельзя.', 'A rule + não pode — a ban: no photos.'),
      means('u19-se-04', 'Regras do museu: aqui pode tirar fotografias sem flash.', 'may', 'Правило + pode — разрешение: без вспышки фотографировать можно.', 'A rule + pode — permission: photos without flash are allowed.'),
      means('u19-se-05', 'Os alunos não têm de vir à reunião.', 'needNot', NEED_NOT[0], NEED_NOT[1]),
      means('u19-se-06', 'Os alunos não podem usar o telemóvel na aula.', 'banned', 'não podem — нельзя: телефон на уроке запрещён.', 'não podem — not allowed: phones are forbidden in class.'),
      means('u19-se-07', 'Os passageiros têm de pôr o cinto.', 'must', 'têm de — обязанность: пристегнуться обязательно.', 'têm de — an obligation: the belt is required.'),
      means('u19-se-08', 'Não precisa de reservar mesa.', 'needNot', 'não precisa de — нет нужды: бронировать не обязательно.', 'não precisa de — no need: booking is not required.'),
    ],
  },
  {
    id: 'pode-tem-de',
    kind: 'cloze',
    title: { ru: 'Можно, нельзя, нужно, не обязательно', en: 'May, must not, must, need not' },
    instruction: {
      ru: 'Прочитайте ситуацию и заполните пропуск: poder или ter de, с não или без, в нужном лице (pode, não podemos, têm de, não tem de…).',
      en: 'Read the situation and fill the gap: poder or ter de, with or without não, in the right person (pode, não podemos, têm de, não tem de…).',
    },
    example: 'É proibido fumar: aqui não pode fumar.',
    ruleId: 'ref-poder-saber',
    reviewedOn: '2026-10-04',
    sources: [
      `${PRIBERAM}poder`,
      `${PRIBERAM}conjugar/poder`,
      `${PRIBERAM}ter`,
      `${CIBER}consultorio/perguntas/ter-de-vs-ter-que/34000`,
    ],
    exercises: [
      gap('u19-pt-01', 'É proibido fumar no comboio. Aqui você ___ fumar.', 'não pode', 'Запрещено → нельзя: não pode.', 'Forbidden → not allowed: não pode.'),
      gap('u19-pt-02', 'A entrada no museu é grátis. Você ___ pagar.', 'não tem de', 'Бесплатно → платить не обязан: não tem de (это не запрет).', 'Free → you need not pay: não tem de (not a ban).', ['não tem que']),
      gap('u19-pt-03', 'No avião, antes da descolagem, o passageiro ___ pôr o cinto.', 'tem de', 'Правило для всех → обязан: tem de.', 'A rule for everyone → must: tem de.', ['tem que']),
      gap('u19-pt-04', 'Nesta praia os cães são bem-vindos: o João ___ trazer o cão.', 'pode', 'Разрешено → можно: pode.', 'Allowed → may: pode.'),
      gap('u19-pt-05', 'No museu há um sinal com uma máquina fotográfica riscada: os turistas ___ tirar fotografias.', 'não podem', 'Перечёркнутый знак → нельзя; os turistas → podem, мн. ч.', 'A crossed-out sign → not allowed; os turistas → plural podem.'),
      gap('u19-pt-06', 'Ao domingo o estacionamento é gratuito: ao domingo, você ___ pagar.', 'não tem de', 'Бесплатно → не обязан платить: não tem de.', 'Free → you need not pay: não tem de.', ['não tem que']),
      gap('u19-pt-07', 'Na biblioteca é obrigatório falar baixo: os alunos ___ falar baixo.', 'têm de', 'Обязательно → обязаны: os alunos → têm de.', 'Required → must: os alunos → têm de.', ['têm que']),
      gap('u19-pt-08', 'Esta loja aceita cartões: a senhora ___ pagar com cartão.', 'pode', 'Есть возможность → можно: pode.', 'It is possible → may: pode.'),
      gap('u19-pt-09', 'A reunião de amanhã é opcional: vocês ___ ir, mas podem ir, se quiserem.', 'não têm de', 'Необязательно → não têm de: идти не обязаны, но можно.', 'Optional → não têm de: you need not go, but you may.', ['não têm que']),
      gap('u19-pt-10', 'Neste parque os ciclistas são proibidos: aqui nós ___ andar de bicicleta.', 'não podemos', 'Запрещено → нельзя; nós → podemos.', 'Forbidden → not allowed; nós → podemos.'),
    ],
  },
  {
    id: 'saber-poder',
    kind: 'cloze',
    title: { ru: 'Saber или poder: умею или могу', en: 'Saber or poder: know how or can' },
    instruction: {
      ru: 'Заполните пропуск глаголом saber или poder в нужной форме. Saber — умею (выученный навык); poder — можно, есть возможность сейчас.',
      en: 'Fill the gap with saber or poder in the right form. Saber — know how (a learned skill); poder — may, it is possible now.',
    },
    example: 'Sei nadar, mas hoje não posso nadar.',
    ruleId: 'ref-poder-saber',
    reviewedOn: '2026-10-04',
    sources: [
      `${PRIBERAM}saber`,
      `${PRIBERAM}poder`,
      `${PRIBERAM}conjugar/saber`,
      `${PRIBERAM}conjugar/poder`,
    ],
    exercises: [
      gap('u19-sp-01', 'O Pedro tem seis anos e já ___ ler: aprendeu na escola.', 'sabe', 'Выученный навык → saber: sabe ler.', 'A learned skill → saber: sabe ler.'),
      gap('u19-sp-02', 'Está muito calor aqui. Eu ___ abrir a janela? — Sim, claro.', 'posso', 'Спрашиваю разрешения для себя → poder: posso?', 'Asking permission for myself → poder: posso?'),
      gap('u19-sp-03', 'Eu ___ conduzir — aprendi aos dezoito anos —, mas hoje não tenho carro.', 'sei', 'Навык есть (умею), а возможности нет: sei conduzir.', 'I have the skill, not the chance: sei conduzir.'),
      gap('u19-sp-04', 'Hoje não ___ sair: tenho de trabalhar até tarde.', 'posso', 'Обстоятельства не дают → poder: não posso.', 'Circumstances prevent it → poder: não posso.'),
      gap('u19-sp-05', 'Tu ___ cozinhar, ou nunca aprendeste?', 'sabes', 'Вопрос о навыке («или не учился?») → saber: sabes.', 'A question about a skill («or never learned?») → saber: sabes.'),
      gap('u19-sp-06', 'Aqui os clientes não ___ estacionar: o lugar é só para táxis.', 'podem', 'Запрет → poder: não podem.', 'A ban → poder: não podem.'),
      gap('u19-sp-07', 'A minha avó não ___ usar o computador: nunca aprendeu.', 'sabe', '«Никогда не училась» → нет навыка: não sabe.', '"Never learned" → no skill: não sabe.'),
      gap('u19-sp-08', 'Nós ___ falar alto aqui? — Não, é uma biblioteca.', 'podemos', 'Вопрос о разрешении → poder: podemos.', 'A question of permission → poder: podemos.'),
      gap('u19-sp-09', 'Eles ___ tocar guitarra: têm aulas desde pequenos.', 'sabem', 'Учатся с детства → навык → saber: sabem tocar.', 'Learning since childhood → a skill → saber: sabem tocar.'),
      gap('u19-sp-10', 'Ela não ___ escrever esta semana: partiu o braço.', 'pode', 'Писать умеет, но сейчас не может из-за руки → poder.', 'She knows how, but cannot now because of her arm → poder.'),
    ],
  },
];

// ── Block: actions with their objects, and skills ───────────────────────────

export const ACTION_GROUPS: readonly PackGroup[] = [
  {
    id: 'acoes',
    kind: 'recall',
    title: { ru: 'Действие целиком', en: 'The whole action' },
    instruction: {
      ru: 'Напишите по-португальски глагол вместе с тем, к чему он относится; нужные существительные даны в скобках. Такие сочетания запоминайте целиком.',
      en: 'Write the verb in Portuguese together with its object; the nouns to use are given in brackets. Learn these combinations as a whole.',
    },
    example: 'carregar no botão · tirar uma senha · pôr o cinto',
    reviewedOn: '2026-10-04',
    sources: [
      `${PRIBERAM}carregar`,
      `${PRIBERAM}senha`,
      `${PRIBERAM}tirar`,
      `${PRIBERAM}pôr`,
      `${PRIBERAM}desligar`,
      `${PRIBERAM}apagar`,
      `${PRIBERAM}acender`,
      `${PRIBERAM}ligar`,
      `${PRIBERAM}pressionar`,
      `${PRIBERAM}premer`,
      `${PRIBERAM}retirar`,
      `${PRIBERAM}colocar`,
      `${PRIBERAM}televisor`,
      'https://www.infopedia.pt/dicionarios/portugues-ingles/despir',
    ],
    exercises: [
      meaning('u19-ac-01', 'нажать на кнопку (o botão)', 'to press the button (o botão)', 'carregar no botão', 'В Португалии обычно carregar no botão (с em); также premir, pressionar, apertar o botão.', 'In Portugal usually carregar no botão (with em); also premir, pressionar, apertar o botão.', ['premir o botão', 'premer o botão', 'pressionar o botão', 'apertar o botão']),
      meaning('u19-ac-02', 'взять талон в очереди (a senha)', 'to take a queue ticket (a senha)', 'tirar uma senha', 'a senha — талон очереди; «взять» — tirar.', 'a senha — a queue ticket; "take" — tirar.', ['tirar senha', 'retirar uma senha', 'retirar senha', 'tirar a senha', 'retirar a senha']),
      meaning('u19-ac-03', 'пристегнуть ремень (o cinto)', 'to fasten the seat belt (o cinto)', 'pôr o cinto', 'pôr o cinto; говорят и apertar, colocar o cinto.', 'pôr o cinto; apertar, colocar o cinto are also said.', ['apertar o cinto', 'colocar o cinto', 'pôr o cinto de segurança', 'apertar o cinto de segurança', 'colocar o cinto de segurança']),
      meaning('u19-ac-04', 'выключить мобильный телефон (o telemóvel)', 'to switch off the mobile phone (o telemóvel)', 'desligar o telemóvel', 'Выключить прибор — desligar.', 'Switch off a device — desligar.'),
      meaning('u19-ac-05', 'потушить сигарету (o cigarro)', 'to put out the cigarette (o cigarro)', 'apagar o cigarro', 'Огонь гасят — apagar.', 'Put out a flame — apagar.'),
      meaning('u19-ac-06', 'включить свет (a luz)', 'to switch on the light (a luz)', 'acender a luz', 'Свет зажигают — acender; говорят и ligar a luz.', 'Light is lit — acender; ligar a luz is also said.', ['ligar a luz']),
      meaning('u19-ac-07', 'включить телевизор (a televisão)', 'to switch on the TV (a televisão)', 'ligar a televisão', 'Прибор включают — ligar.', 'A device is switched on — ligar.', ['ligar a tv', 'ligar o televisor']),
      meaning('u19-ac-08', 'вынуть компьютер из сумки (o computador, a mala)', 'to take the computer out of the bag (o computador, a mala)', 'tirar o computador da mala', 'Вынуть — tirar; из сумки — da (de + a) mala.', 'Take out — tirar; from the bag — da (de + a) mala.', ['retirar o computador da mala']),
      meaning('u19-ac-09', 'снять пальто (o casaco)', 'to take off the coat (o casaco)', 'tirar o casaco', 'Снять одежду — tirar.', 'Take off clothes — tirar.', ['despir o casaco']),
      meaning('u19-ac-10', 'положить книгу на стол (o livro, a mesa)', 'to put the book on the table (o livro, a mesa)', 'pôr o livro na mesa', 'Положить — pôr; на стол — na (em + a) mesa.', 'Put — pôr; on the table — na (em + a) mesa.', ['pôr o livro em cima da mesa', 'colocar o livro na mesa', 'colocar o livro em cima da mesa']),
    ],
  },
  {
    id: 'opostos-acoes',
    kind: 'cloze',
    title: { ru: 'Обратное действие (дополнительно)', en: 'The opposite action (extra)' },
    instruction: {
      ru: 'Напишите противоположный глагол в той же форме: ligar ↔ desligar, acender ↔ apagar, pôr ↔ tirar, poupar ↔ gastar.',
      en: 'Write the opposite verb in the same form: ligar ↔ desligar, acender ↔ apagar, pôr ↔ tirar, poupar ↔ gastar.',
    },
    example: 'Ligo o rádio. ↔ Desligo o rádio.',
    reviewedOn: '2026-10-04',
    sources: [
      `${PRIBERAM}conjugar/pôr`,
      `${PRIBERAM}conjugar/tirar`,
      `${PRIBERAM}conjugar/apagar`,
      `${PRIBERAM}conjugar/ligar`,
      `${PRIBERAM}conjugar/gastar`,
    ],
    exercises: [
      gap('u19-op-01', 'Ligo o rádio. ↔ ___ o rádio.', 'Desligo', 'ligar ↔ desligar; eu → desligo.', 'ligar ↔ desligar; eu → desligo.'),
      gap('u19-op-02', 'Acendo a luz. ↔ ___ a luz.', 'Apago', 'acender ↔ apagar; eu → apago.', 'acender ↔ apagar; eu → apago.', ['Desligo']),
      gap('u19-op-03', 'Ponho o casaco. ↔ ___ o casaco.', 'Tiro', 'pôr ↔ tirar; eu → tiro.', 'pôr ↔ tirar; eu → tiro.'),
      gap('u19-op-04', 'Ela tira os óculos. ↔ Ela ___ os óculos.', 'põe', 'tirar ↔ pôr; ela → põe (с тильдой).', 'tirar ↔ pôr; ela → põe (with the tilde).'),
      gap('u19-op-05', 'Vocês acendem as velas. ↔ Vocês ___ as velas.', 'apagam', 'acender ↔ apagar; vocês → apagam.', 'acender ↔ apagar; vocês → apagam.'),
      gap('u19-op-06', 'Nós desligamos o computador. ↔ Nós ___ o computador.', 'ligamos', 'desligar ↔ ligar; nós → ligamos.', 'desligar ↔ ligar; nós → ligamos.'),
      gap('u19-op-07', 'Tu tiras a mala do carro. ↔ Tu ___ a mala no carro.', 'pões', 'tirar ↔ pôr; tu → pões.', 'tirar ↔ pôr; tu → pões.'),
      gap('u19-op-08', 'Eles poupam dinheiro. ↔ Eles ___ dinheiro.', 'gastam', 'poupar ↔ gastar; eles → gastam.', 'poupar ↔ gastar; eles → gastam.'),
      gap('u19-op-09', 'Nós pomos o cinto. ↔ Nós ___ o cinto.', 'tiramos', 'pôr ↔ tirar; nós → tiramos.', 'pôr ↔ tirar; nós → tiramos.'),
      gap('u19-op-10', 'Eles tiram os sapatos. ↔ Eles ___ os sapatos.', 'põem', 'tirar ↔ pôr; eles → põem.', 'tirar ↔ pôr; eles → põem.'),
    ],
  },
  {
    id: 'saber-fazer',
    kind: 'transform',
    title: { ru: 'Sabes…? Что вы умеете', en: 'Sabes…? What you can do' },
    instruction: {
      ru: 'Ответьте полной фразой по подсказке в скобках: (+) — умею, (−) — не умею, «muito bem» или «um pouco» — как именно. Если написано «задайте вопрос», задайте вопрос.',
      en: 'Answer with a full sentence following the hint in brackets: (+) — I can, (−) — I cannot, "muito bem" or "um pouco" — how well. If it says "ask the question", ask it.',
    },
    example: 'Sabes nadar? (+, muito bem) → Sim, sei nadar muito bem.',
    ruleId: 'ref-poder-saber',
    reviewedOn: '2026-10-04',
    sources: [`${PRIBERAM}conjugar/saber`, `${PRIBERAM}saber`],
    exercises: [
      skill('u19-sf-01', 'Sabes nadar? (+, muito bem)', shortAnswers('Sim', ['', 'eu'], 'sei nadar muito bem.'), 'tu sabes → отвечаю eu: sei; muito bem — в конце.', 'tu sabes → I answer with eu: sei; muito bem at the end.'),
      skill('u19-sf-02', 'O senhor sabe cozinhar? (−)', shortAnswers('Não', ['', 'eu'], 'não sei cozinhar.'), 'Отрицание: Não, não sei … — второе não перед глаголом.', 'Negative: Não, não sei … — the second não before the verb.'),
      skill(
        'u19-sf-03',
        'Sabes falar alemão? (um pouco)',
        shortAnswers('Sim', ['', 'eu'], 'sei falar um pouco de alemão.'),
        'Немного по-немецки: falar um pouco de alemão.',
        'A little German: falar um pouco de alemão.',
        shortAnswers('Sim', ['', 'eu'], 'sei falar alemão um pouco.').flat(),
      ),
      skill('u19-sf-04', 'Vocês sabem dançar salsa? (nós, +, muito bem)', shortAnswers('Sim', ['', 'nós'], 'sabemos dançar salsa muito bem.'), 'vocês → отвечаем nós: sabemos.', 'vocês → we answer with nós: sabemos.'),
      skill('u19-sf-05', 'A Ana sabe tocar piano? (−)', shortAnswers('Não', ['a Ana', 'ela', ''], 'não sabe tocar piano.'), 'Про неё: a Ana não sabe … — или ela, или без подлежащего.', 'About her: a Ana não sabe … — or ela, or no subject.'),
      skill('u19-sf-06', 'O Rui sabe tirar fotografias? (+, muito bem)', shortAnswers('Sim', ['o Rui', 'ele', ''], 'sabe tirar fotografias muito bem.'), 'Про него: o Rui sabe … — или ele, или без подлежащего.', 'About him: o Rui sabe … — or ele, or no subject.'),
      question('u19-sf-07', '(tu) saber / tocar guitarra', 'Sabes tocar guitarra?', 'Вопрос к tu: Sabes tocar guitarra?', 'A question to tu: Sabes tocar guitarra?', ['Tu sabes tocar guitarra?']),
      question('u19-sf-08', '(você) saber / fazer uma caipirinha', 'Sabe fazer uma caipirinha?', 'Вопрос к você: глагол в 3-м лице — Sabe …?', 'A question to você: third-person verb — Sabe …?', ['Você sabe fazer uma caipirinha?']),
    ],
  },
];
