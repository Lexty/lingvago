import type { HelpEntry } from './help.ts';

// Unidade 18: key words of each prompt and the meaning of the completed
// sentence (see help.ts). Glosses never give the gap's answer.

export const UNIT_18_HELP: Readonly<Record<string, HelpEntry>> = {
  // comparisons
  'u18-comp-01': ['alta | высокая | tall', 'Ана выше, чем Руй.', 'Ana is taller than Rui.'],
  'u18-comp-02': ['caro | дорогой | expensive ; aquele | тот | that one', 'Этот отель дешевле, чем тот (менее дорогой).', 'This hotel is less expensive than that one.'],
  'u18-comp-03': ['rua | улица | street ; calma | тихая, спокойная | quiet ; a tua | твоя | yours', 'Моя улица такая же тихая, как твоя.', 'My street is as quiet as yours.'],
  'u18-comp-04': ['simpático | приятный, милый | nice', 'Руй такой же приятный, как Ана.', 'Rui is as nice as Ana.'],
  'u18-comp-05': ['quente | тёплый, жаркий | warm, hot', 'В Лиссабоне теплее, чем в Порту.', 'Lisbon is warmer than Porto.'],
  'u18-comp-06': ['aquele | тот | that one', 'Этот ресторан лучше, чем тот.', 'This restaurant is better than that one.'],
  'u18-comp-07': ['café | кафе или кофе | café or coffee ; aquele | тот | that one', 'Это кафе хуже, чем то.', 'This café is worse than that one.'],
  'u18-comp-08': ['casa | дом | house ; a tua | твой | yours', 'Мой дом больше, чем твой.', 'My house is bigger than yours.'],
  'u18-comp-09': ['o quarto | комната | the room ; dele | его | his', 'Его комната меньше, чем моя.', 'His room is smaller than mine.'],
  'u18-comp-10': ['rio | река | river ; longo | длинный | long ; país | страна | country', 'Это самая длинная река в стране.', 'This is the longest river in the country.'],
  'u18-comp-11': ['praia | пляж | beach ; ilha | остров | island', 'Это самый красивый пляж на острове.', 'It is the most beautiful beach on the island.'],
  'u18-comp-12': ['aluno | ученик | student ; grupo | группа | group', 'Это лучший ученик в группе.', 'He is the best student in the group.'],

  // saber / conhecer
  'u18-sc-01': ['a mãe | мама | the mother', 'Ты знаком с мамой Педру?', 'Do you know Pedro’s mother?'],
  'u18-sc-02': ['onde fica | где находится | where … is ; a estação | вокзал, станция | the station', 'Я не знаю, где вокзал.', 'I do not know where the station is.'],
  'u18-sc-03': ['bem | хорошо | well ; cidade | город | city', 'Мы хорошо знаем этот город.', 'We know this city well.'],
  'u18-sc-04': ['falar inglês | говорить по-английски | speak English', 'Они умеют говорить по-английски.', 'They can speak English.'],
  'u18-sc-05': ['o museu | музей | the museum ; fecha | закрывается | closes ; à segunda-feira | по понедельникам | on Mondays', 'Она знает, что музей по понедельникам закрыт.', 'She knows that the museum is closed on Mondays.'],
  'u18-sc-06': ['o novo professor | новый учитель | the new teacher', 'Вы знакомы с новым учителем?', 'Do you know the new teacher?'],
  'u18-sc-07': ['muito bem | очень хорошо | very well ; a tua irmã | твоя сестра | your sister', 'Я очень хорошо знаю твою сестру.', 'I know your sister very well.'],
  'u18-sc-08': ['quem | кто | who ; aquele senhor | тот мужчина | that man', 'Ты знаешь, кто этот мужчина?', 'Do you know who that man is?'],
  'u18-sc-09': ['nadar | плавать | to swim', 'Он не умеет плавать.', 'He cannot swim.'],
  'u18-sc-10': ['porque | почему | why ; o comboio | поезд | the train ; atrasado | опаздывает | late', 'Мы не знаем, почему поезд опаздывает.', 'We do not know why the train is late.'],

  // a sentence from cue words
  'u18-sent-01': ['maior | больше, больший | bigger ; país | страна | country', 'Лиссабон — самый большой город страны.', 'Lisbon is the biggest city in the country.'],
  'u18-sent-02': ['rio | река | river ; longo | длинный | long ; todos | все | all', 'Эта река самая длинная из всех.', 'This river is the longest of all.'],
  'u18-sent-03': ['carro | машина | car ; caro | дорогой | expensive', 'Твоя машина такая же дорогая, как моя.', 'Your car is as expensive as mine.'],
  'u18-sent-04': ['alto | высокий | tall ; turma | класс | class', 'Руй самый высокий в классе.', 'Rui is the tallest in the class.'],
  'u18-sent-05': ['melhor | лучше, лучший | better ; escola | школа | school', 'Марта — лучшая учительница в школе.', 'Marta is the best teacher in the school.'],
  'u18-sent-06': ['praia | пляж | beach ; calma | тихая | quiet ; aquela | та | that one', 'Этот пляж менее тихий, чем тот.', 'This beach is less quiet than that one.'],
  'u18-sent-07': ['nossa | наш | our ; pequena | маленькая | small ; vossa | ваш | your', 'Наш дом меньше, чем ваш.', 'Our house is smaller than yours.'],
  'u18-sent-08': ['pior | хуже, худший | worse ; ilha | остров | island', 'Это худший отель на острове.', 'This is the worst hotel on the island.'],
};
