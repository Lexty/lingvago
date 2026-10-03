import type { PackVocab, VocabCard } from './types.ts';

// Unidade 19 words for Anki: money, days of the week, actions in pairs and
// set phrases, indefinite pronouns, skills, exclamations. Taken from the
// unit's exercises (textbook pp. 106–109, 116; workbook pp. 48–49); every
// Portuguese headword is checked by scripts/verify-vocab-priberam.py.

function card(topic: string, id: string, pt: string, ru: string, en: string, note?: VocabCard['note']): VocabCard {
  return note ? { id, pt, ru, en, note, topic } : { id, pt, ru, en, topic };
}

type Note = VocabCard['note'];
const money = (id: string, pt: string, ru: string, en: string, note?: Note) => card('dinheiro', id, pt, ru, en, note);
const day = (id: string, pt: string, ru: string, en: string, note?: Note) => card('dias', id, pt, ru, en, note);
const act = (id: string, pt: string, ru: string, en: string, note?: Note) => card('acoes', id, pt, ru, en, note);
const pron = (id: string, pt: string, ru: string, en: string, note?: Note) => card('pronomes', id, pt, ru, en, note);
const modal = (id: string, pt: string, ru: string, en: string, note?: Note) => card('modais', id, pt, ru, en, note);
const hobby = (id: string, pt: string, ru: string, en: string, note?: Note) => card('passatempos', id, pt, ru, en, note);
const excl = (id: string, pt: string, ru: string, en: string, note?: Note) => card('exclamacoes', id, pt, ru, en, note);
const word = (id: string, pt: string, ru: string, en: string, note?: Note) => card('palavras', id, pt, ru, en, note);

const sameNote = (text: string): Note => ({ ru: text, en: text });

export const UNIT_19_VOCAB: PackVocab = {
  reviewedOn: '2026-10-03',
  sources: [
    'Passaporte para Português 1, Unidade 19 (pp. 106–109, 116; caderno pp. 48–49)',
    'https://dicionario.priberam.org/ — spelling and gender of each headword, scripts/verify-vocab-priberam.py',
    'https://dicionario.priberam.org/senha',
    'https://dicionario.priberam.org/passeio',
    'https://dicionario.priberam.org/estadia',
    'https://dicionario.priberam.org/poupar',
    'https://dicionario.priberam.org/ligar',
    'https://dicionario.priberam.org/carregar',
    'https://dicionario.priberam.org/poder',
    'https://dicionario.priberam.org/precisar',
    'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/dias-da-semana/902',
    'https://ciberduvidas.iscte-iul.pt/artigos/rubricas/idioma/dupla-negativa/4913',
    'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/todo-e-tudo--branco/12667',
    'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/adverbio-muito/17796',
  ],
  cards: [
    money('dinheiro', 'o dinheiro', 'деньги', 'money', { ru: 'в португальском — ед. ч.: muito dinheiro', en: 'singular: muito dinheiro' }),
    money('ganhar', 'ganhar', 'зарабатывать; выигрывать', 'to earn; to win'),
    money('gastar', 'gastar', 'тратить', 'to spend'),
    money('poupar', 'poupar', 'копить, экономить', 'to save (money, time)', sameNote('poupar dinheiro · poupar tempo')),
    money('pagar', 'pagar', 'платить', 'to pay', sameNote('pagar a conta · pagar com cartão')),
    money('comprar', 'comprar', 'покупать', 'to buy'),
    money('custar', 'custar', 'стоить', 'to cost', sameNote('Quanto custa? · custa muito')),
    money('cartao-de-credito', 'o cartão de crédito', 'кредитная карта', 'credit card'),
    money('conta', 'a conta', 'счёт (в ресторане, в банке)', 'bill; account'),
    money('mealheiro', 'o mealheiro', 'копилка', 'piggy bank'),
    money('muito', 'muito', 'много; очень', 'a lot; very', { ru: 'gasta muito (не меняется) · muita água, muitos livros (согласуется)', en: 'gasta muito (invariable) · muita água, muitos livros (agrees)' }),
    money('pouco', 'pouco', 'мало', 'little, not much', { ru: 'ganha pouco · pouca água, poucos livros', en: 'ganha pouco · pouca água, poucos livros' }),
    money('facil', 'fácil', 'лёгкий, простой', 'easy'),
    money('dificil', 'difícil', 'трудный', 'difficult'),

    day('segunda-feira', 'a segunda-feira', 'понедельник', 'Monday', sameNote('2.ª-feira')),
    day('terca-feira', 'a terça-feira', 'вторник', 'Tuesday', sameNote('3.ª-feira')),
    day('quarta-feira', 'a quarta-feira', 'среда', 'Wednesday', sameNote('4.ª-feira')),
    day('quinta-feira', 'a quinta-feira', 'четверг', 'Thursday', sameNote('5.ª-feira')),
    day('sexta-feira', 'a sexta-feira', 'пятница', 'Friday', sameNote('6.ª-feira')),
    day('sabado', 'o sábado', 'суббота', 'Saturday'),
    day('domingo', 'o domingo', 'воскресенье', 'Sunday'),
    day('ficar-num-hotel', 'ficar num hotel', 'остановиться в гостинице', 'to stay at a hotel'),
    day('viagem-de-aviao', 'a viagem de avião', 'поездка на самолёте', 'trip by plane'),
    day('comer-fora', 'comer fora', 'есть не дома (в ресторане)', 'to eat out'),
    day('ir-ao-cinema', 'ir ao cinema', 'ходить в кино', 'to go to the cinema'),

    act('ligar', 'ligar', 'включать; звонить', 'to switch on; to call', sameNote('ligar a televisão · ligar à Ana')),
    act('desligar', 'desligar', 'выключать', 'to switch off', sameNote('desligar o telemóvel')),
    act('acender', 'acender', 'зажигать, включать (свет)', 'to light, turn on (a light)', sameNote('acender as luzes')),
    act('apagar', 'apagar', 'гасить, выключать (свет); стирать', 'to put out, turn off; to erase', sameNote('apagar o cigarro · apagar a luz')),
    act('por', 'pôr', 'класть, ставить; надевать', 'to put; to put on', sameNote('pôr o cinto')),
    act('tirar', 'tirar', 'снимать, вынимать, убирать', 'to take off, take out', sameNote('tirar o computador da mala')),
    act('carregar-no-botao', 'carregar no botão', 'нажать на кнопку', 'to press the button'),
    act('tirar-uma-senha', 'tirar uma senha', 'взять талон (в очереди)', 'to take a ticket (in a queue)'),
    act('por-o-cinto', 'pôr o cinto', 'пристегнуть ремень', 'to fasten the seat belt'),
    act('desligar-o-telemovel', 'desligar o telemóvel', 'выключить мобильный телефон', 'to switch off the mobile phone'),
    act('apagar-o-cigarro', 'apagar o cigarro', 'потушить сигарету', 'to put out the cigarette'),
    act('acender-as-luzes', 'acender as luzes', 'включить свет', 'to switch on the lights'),
    act('ligar-a-televisao', 'ligar a televisão', 'включить телевизор', 'to switch on the TV'),
    act('tirar-o-carro-do-passeio', 'tirar o carro do passeio', 'убрать машину с тротуара', 'to move the car off the pavement'),
    act('concordar-com', 'concordar com', 'соглашаться с', 'to agree with', sameNote('Concordo com a Ana.')),
    act('discordar-de', 'discordar de', 'не соглашаться с', 'to disagree with', sameNote('Discordo da Ana.')),
    act('tomar-banho', 'tomar banho', 'мыться, принимать душ (ванну)', 'to take a bath / shower'),
    act('fazer-dieta', 'fazer dieta', 'сидеть на диете', 'to be on a diet'),
    act('descansar', 'descansar', 'отдыхать', 'to rest'),
    act('estudar', 'estudar', 'учиться, заниматься', 'to study'),
    act('escrever', 'escrever', 'писать', 'to write'),
    act('dormir', 'dormir', 'спать', 'to sleep', { ru: 'eu durmo, tu dormes', en: 'eu durmo, tu dormes' }),
    act('beber', 'beber', 'пить', 'to drink', sameNote('beber água')),

    pron('alguem', 'alguém', 'кто-то, кто-нибудь', 'someone, anyone', sameNote('Está alguém aqui?')),
    pron('ninguem', 'ninguém', 'никто', 'nobody', { ru: 'перед глаголом — без não: Ninguém quer café. После — с não: Não vejo ninguém.', en: 'before the verb, no não: Ninguém quer café. After it: Não vejo ninguém.' }),
    pron('algo', 'algo', 'что-то', 'something', sameNote('Tenho algo para ti.')),
    pron('nada', 'nada', 'ничего', 'nothing', { ru: 'Não quero nada. · Nada é barato.', en: 'Não quero nada. · Nada é barato.' }),
    pron('todos', 'todos', 'все (люди)', 'everybody', sameNote('Todos gostam de sol.')),
    pron('tudo', 'tudo', 'всё', 'everything', sameNote('Tudo isto é meu. · O cão come tudo.')),
    pron('todo-o-dia', 'todo o dia', 'весь день', 'all day', { ru: 'todo o leite · toda a cidade · todos os sábados · todas as pessoas — согласуется с существительным', en: 'todo o leite · toda a cidade · todos os sábados · todas as pessoas — agrees with the noun' }),
    pron('todos-os-sabados', 'todos os sábados', 'каждую субботу', 'every Saturday'),

    modal('ter', 'ter', 'иметь', 'to have', { ru: 'Tenho dinheiro. · Têm a conta? — а Tenho de pagar. = должен', en: 'Tenho dinheiro. · Têm a conta? — but Tenho de pagar. = must' }),
    modal('saber', 'saber', 'уметь; знать', 'to know how to; to know', { ru: 'Sei nadar, mas hoje não posso nadar.', en: 'Sei nadar, mas hoje não posso nadar.' }),
    modal('ter-de', 'ter de', 'быть должным, обязанным; нужно', 'to have to', { ru: 'правило, требование извне — обычно ter de; нужда — ter de или precisar de', en: 'a rule or outside requirement: usually ter de' }),
    modal('nao-ter-de', 'não ter de', 'не обязан, не нужно', 'not to have to', { ru: 'не значит «нельзя»: нельзя — não poder', en: 'not "must not": that is não poder' }),
    modal('precisar-de', 'precisar de', 'нуждаться; нужно', 'to need', sameNote('Preciso de água. · Preciso de dormir.')),
    modal('poder', 'poder', 'мочь (можно, есть возможность)', 'can, may', { ru: 'posso, podes, pode, podemos, podem · Hoje não posso nadar.', en: 'posso, podes, pode, podemos, podem' }),
    modal('nao-poder', 'não poder', 'нельзя; не мочь', 'must not; cannot', sameNote('Não pode fumar aqui.')),

    hobby('nadar', 'nadar', 'плавать', 'to swim', sameNote('Sei nadar.')),
    hobby('cantar', 'cantar', 'петь', 'to sing'),
    hobby('cozinhar', 'cozinhar', 'готовить (еду)', 'to cook'),
    hobby('dancar-salsa', 'dançar salsa', 'танцевать сальсу', 'to dance salsa'),
    hobby('pintar', 'pintar', 'рисовать красками', 'to paint'),
    hobby('tirar-fotografias', 'tirar fotografias', 'фотографировать', 'to take photos'),
    hobby('tocar-guitarra', 'tocar guitarra', 'играть на гитаре', 'to play the guitar', { ru: 'на инструменте — tocar', en: 'an instrument — tocar' }),
    hobby('tocar-piano', 'tocar piano', 'играть на пианино', 'to play the piano'),
    hobby('jogar-futebol', 'jogar futebol', 'играть в футбол', 'to play football', { ru: 'в игру — jogar', en: 'a game — jogar' }),
    hobby('jogar-xadrez', 'jogar xadrez', 'играть в шахматы', 'to play chess'),
    hobby('jogar-tenis-de-mesa', 'jogar ténis de mesa', 'играть в настольный теннис', 'to play table tennis'),
    hobby('falar-chines', 'falar chinês', 'говорить по-китайски', 'to speak Chinese'),
    hobby('fazer-uma-caipirinha', 'fazer uma caipirinha', 'сделать кайпиринью', 'to make a caipirinha'),
    hobby('muito-bem', 'muito bem', 'очень хорошо', 'very well', sameNote('Sei cantar muito bem.')),
    hobby('um-pouco', 'um pouco', 'немного', 'a little', sameNote('Sei falar um pouco de alemão.')),

    excl('que-bom', 'Que bom!', 'Как хорошо! Здорово!', 'Great! How nice!'),
    excl('que-bonito', 'Que bonito!', 'Как красиво!', 'How beautiful!', { ru: 'про предмет — согласуется: Que bonita! (a flor)', en: 'about a thing it agrees: Que bonita! (a flor)' }),
    excl('que-interessante', 'Que interessante!', 'Как интересно!', 'How interesting!'),
    excl('que-boa-noticia', 'Que boa notícia!', 'Какая хорошая новость!', 'What good news!'),

    word('senha', 'a senha', 'талон (очереди); пароль', 'queue ticket; password'),
    word('cinto', 'o cinto', 'ремень', 'belt, seat belt'),
    word('botao', 'o botão', 'кнопка; пуговица', 'button'),
    word('luz', 'a luz', 'свет; лампа', 'light', sameNote('as luzes')),
    word('telemovel', 'o telemóvel', 'мобильный телефон', 'mobile phone'),
    word('mala', 'a mala', 'сумка; чемодан', 'bag; suitcase'),
    word('cigarro', 'o cigarro', 'сигарета', 'cigarette'),
    word('passeio', 'o passeio', 'тротуар; прогулка', 'pavement; walk'),
    word('casa-de-banho', 'a casa de banho', 'туалет, ванная', 'toilet, bathroom'),
    word('carta-de-conducao', 'a carta de condução', 'водительские права', "driving licence"),
    word('empregado-de-mesa', 'o empregado de mesa', 'официант', 'waiter'),
    word('enfermeiro', 'o enfermeiro', 'медбрат', 'nurse (male)', sameNote('a enfermeira')),
    word('jornalista', 'o jornalista', 'журналист', 'journalist', sameNote('a jornalista')),
    word('secretaria', 'a secretária', 'секретарь (женщина); письменный стол', 'secretary; desk'),
    word('agente-da-policia', 'o agente da polícia', 'полицейский', 'police officer'),
  ],
};
