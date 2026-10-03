import type { PackVocab, VocabCard } from './types.ts';

// Unidade 18 words for Anki: trips, adjectives in pairs, comparison, geography.
// Taken from the unit's exercises and the learner's notes; every Portuguese
// headword (spelling, gender) is checked by scripts/verify-vocab-priberam.py.

function card(topic: string, id: string, pt: string, ru: string, en: string, note?: VocabCard['note']): VocabCard {
  return note ? { id, pt, ru, en, note, topic } : { id, pt, ru, en, topic };
}

const trip = (id: string, pt: string, ru: string, en: string, note?: VocabCard['note']) => card('viagem', id, pt, ru, en, note);
const adj = (id: string, pt: string, ru: string, en: string, note?: VocabCard['note']) => card('adjetivos', id, pt, ru, en, note);
const comp = (id: string, pt: string, ru: string, en: string, note?: VocabCard['note']) => card('comparacao', id, pt, ru, en, note);
const geo = (id: string, pt: string, ru: string, en: string, note?: VocabCard['note']) => card('geografia', id, pt, ru, en, note);
const verb = (id: string, pt: string, ru: string, en: string, note?: VocabCard['note']) => card('verbos', id, pt, ru, en, note);

export const UNIT_18_VOCAB: PackVocab = {
  reviewedOn: '2026-10-03',
  sources: [
    'Passaporte para Português 1, Unidade 18 (exercícios F–I)',
    'https://dicionario.priberam.org/ — spelling and gender of each headword, scripts/verify-vocab-priberam.py',
    'https://www.infopedia.pt/dicionarios/portugues-ingles/largo',
    'https://www.infopedia.pt/dicionarios/portugues-ingles/litoral',
    'https://dicionario.priberam.org/capital',
    'https://dicionario.priberam.org/costa',
    'https://dicionario.priberam.org/perto',
    'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/a-construcao-mais-grande-do-que/29908',
    'https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/mais-pequeno--menor/116',
  ],
  cards: [
    trip('viagem', 'a viagem', 'поездка, путешествие', 'trip, journey', { ru: 'мн. ч.: as viagens', en: 'plural: as viagens' }),
    trip('agencia-de-viagens', 'a agência de viagens', 'турагентство', 'travel agency'),
    trip('voo', 'o voo', 'рейс, полёт', 'flight'),
    trip('duracao-do-voo', 'a duração do voo', 'длительность полёта', 'flight time'),
    trip('estadia', 'a estadia', 'пребывание (в поездке)', 'stay'),
    trip('alojamento', 'o alojamento', 'жильё, размещение', 'accommodation'),
    trip('estrela', 'a estrela', 'звезда', 'star', { ru: 'um hotel de cinco estrelas', en: 'um hotel de cinco estrelas' }),
    trip('preco', 'o preço', 'цена', 'price'),
    trip('distancia', 'a distância', 'расстояние', 'distance'),
    trip('area', 'a área', 'площадь', 'area'),
    trip('temperatura-media', 'a temperatura média', 'средняя температура', 'average temperature'),
    trip('loja', 'a loja', 'магазин', 'shop'),
    trip('flor', 'a flor', 'цветок', 'flower', { ru: 'мн. ч.: as flores', en: 'plural: as flores' }),

    adj('cheio', 'cheio', 'полный', 'full'),
    adj('vazio', 'vazio', 'пустой', 'empty'),
    adj('calmo', 'calmo', 'спокойный, тихий', 'calm, quiet'),
    adj('barulhento', 'barulhento', 'шумный', 'noisy'),
    adj('curto', 'curto', 'короткий', 'short'),
    adj('longo', 'longo', 'длинный, долгий', 'long', { ru: 'не путать с longe', en: 'not to be confused with longe' }),
    adj('largo', 'largo', 'широкий', 'wide', { ru: 'здесь о ширине: uma rua larga; «большой по размеру» — обычно grande', en: 'here about width: uma rua larga; "big" in size is usually grande' }),
    adj('estreito', 'estreito', 'узкий', 'narrow'),
    adj('agradavel', 'agradável', 'приятный', 'pleasant'),
    adj('desagradavel', 'desagradável', 'неприятный', 'unpleasant'),
    adj('quente', 'quente', 'горячий, жаркий', 'hot'),
    adj('frio', 'frio', 'холодный', 'cold'),
    card('adverbios', 'perto', 'perto', 'близко', 'near', { ru: 'perto de Lisboa', en: 'perto de Lisboa' }),
    card('adverbios', 'longe', 'longe', 'далеко', 'far', { ru: 'longe de casa', en: 'longe de casa' }),
    adj('barato', 'barato', 'дешёвый', 'cheap'),
    adj('caro', 'caro', 'дорогой', 'expensive'),
    adj('bonito', 'bonito', 'красивый', 'pretty, beautiful'),
    adj('feio', 'feio', 'некрасивый', 'ugly'),
    adj('rico', 'rico', 'богатый', 'rich'),
    adj('pobre', 'pobre', 'бедный', 'poor'),
    adj('alto', 'alto', 'высокий', 'tall, high'),
    adj('baixo', 'baixo', 'низкий, невысокий', 'low, short'),
    adj('grande', 'grande', 'большой', 'big'),
    adj('pequeno', 'pequeno', 'маленький', 'small'),

    comp('mais-do-que', 'mais … do que', 'более …, чем', 'more … than', { ru: 'A é mais cara do que B.', en: 'A é mais cara do que B.' }),
    comp('menos-do-que', 'menos … do que', 'менее …, чем', 'less … than', { ru: 'A é menos fria do que B.', en: 'A é menos fria do que B.' }),
    comp('tao-como', 'tão … como', 'такой же …, как', 'as … as', { ru: 'A é tão bonita como B.', en: 'A é tão bonita como B.' }),
    comp('melhor', 'melhor', 'лучше; лучший', 'better; best', { ru: 'от bom / bem; сравнивая два предмета — melhor; o/a melhor — самый лучший', en: 'from bom / bem; comparing two things — melhor; o/a melhor — the best' }),
    comp('pior', 'pior', 'хуже; худший', 'worse; worst', { ru: 'от mau / mal; o/a pior — самый плохой', en: 'from mau / mal; o/a pior — the worst' }),
    comp('maior', 'maior', 'больше; самый большой', 'bigger; biggest', { ru: 'от grande; o/a maior — самый большой', en: 'from grande; o/a maior — the biggest' }),
    comp('menor', 'menor', 'меньше; самый маленький', 'smaller; smallest', { ru: 'от pequeno; о размере допустимы обе формы: menor и mais pequeno (в Португалии mais pequeno частое); o/a menor — самый маленький', en: 'from pequeno; for size both menor and mais pequeno are fine (mais pequeno is common in Portugal); o/a menor — the smallest' }),
    comp('varios-varias', 'vários / várias', 'несколько, разные', 'several', { ru: 'várias praias · vários lagos', en: 'várias praias · vários lagos' }),

    geo('pais', 'o país', 'страна', 'country'),
    geo('cidade', 'a cidade', 'город', 'city, town'),
    geo('capital', 'a capital', 'столица', 'capital city', { ru: 'o capital — капитал (деньги)', en: 'o capital — capital (money)' }),
    geo('mar', 'o mar', 'море', 'sea'),
    geo('oceano', 'o oceano', 'океан', 'ocean'),
    geo('rio', 'o rio', 'река', 'river'),
    geo('lago', 'o lago', 'озеро', 'lake'),
    geo('montanha', 'a montanha', 'гора', 'mountain'),
    geo('ilha', 'a ilha', 'остров', 'island'),
    geo('costa', 'a costa', 'побережье', 'coast', { ru: 'as costas — спина', en: 'as costas — the back' }),
    geo('litoral', 'o litoral', 'побережье, прибрежная полоса', 'coastline'),
    geo('praia', 'a praia', 'пляж', 'beach'),
    geo('mundo', 'o mundo', 'мир', 'world'),

    verb('saber', 'saber', 'знать (факт); уметь', 'to know (a fact); to know how to', { ru: 'Sei onde fica. · Sei nadar.', en: 'Sei onde fica. · Sei nadar.' }),
    verb('conhecer', 'conhecer', 'знать, быть знакомым (с человеком, местом)', 'to know, be acquainted with', { ru: 'Conheço a Teresa. · Conheço Lisboa.', en: 'Conheço a Teresa. · Conheço Lisboa.' }),
    verb('preferir', 'preferir', 'предпочитать', 'to prefer', { ru: 'prefiro chá a café; eu prefiro, tu preferes', en: 'prefiro chá a café; eu prefiro, tu preferes' }),
  ],
};
