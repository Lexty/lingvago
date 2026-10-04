import type { HelpEntry } from './help.ts';

// Unidade 19: key words of each prompt and the meaning of the completed
// sentence (see help.ts). Glosses never give the gap's answer, and in the
// `sentido` group they never gloss the construction being read.

export const UNIT_19_HELP: Readonly<Record<string, HelpEntry>> = {
  // money: personal form or infinitive
  'u19-mf-01': ['livros | книги | books', 'Я трачу много денег на книги.', 'I spend a lot of money on books.'],
  'u19-mf-02': ['quanto | сколько | how much ; casaco | пальто, куртка | coat', 'Сколько стоит это пальто?', 'How much is this coat?'],
  'u19-mf-03': ['queres | хочешь | you want ; cartão | карта | card', 'Ты хочешь заплатить картой?', 'Do you want to pay by card?'],
  'u19-mf-04': ['férias | отпуск, каникулы | holidays', 'Мы копим деньги на отпуск.', 'We are saving money for the holidays.'],
  'u19-mf-05': ['bem | хорошо | well ; novo emprego | новая работа | new job', 'Она хорошо зарабатывает на новой работе.', 'She earns well in her new job.'],
  'u19-mf-06': ['gostam de | любят | they like ; roupa nova | новая одежда | new clothes', 'Они любят покупать новую одежду.', 'They like buying new clothes.'],
  'u19-mf-07': ['sempre | всегда | always ; o jantar | ужин | dinner', 'Вы всегда платите за ужин.', 'You always pay for dinner.'],
  'u19-mf-08': ['preciso de | мне нужно | I need ; este mês | в этом месяце | this month', 'Мне нужно накопить денег в этом месяце.', 'I need to save money this month.'],
  'u19-mf-09': ['sapatos | туфли, обувь | shoes ; cinquenta | пятьдесят | fifty', 'Эти туфли стоят пятьдесят евро.', 'These shoes cost fifty euros.'],
  'u19-mf-10': ['pouco | мало | little ; gastas muito | тратишь много | you spend a lot', 'Ты мало зарабатываешь, но много тратишь.', 'You earn little but spend a lot.'],

  // money: which verb, which form
  'u19-mc-01': ['trabalho | работа | job ; salário | зарплата | salary ; por mês | в месяц | a month', 'На своей работе я получаю две тысячи евро зарплаты в месяц.', 'In my job I earn two thousand euros a month.'],
  'u19-mc-02': ['telemóvel | мобильный телефон | mobile phone ; trezentos | триста | three hundred', 'Этот телефон стоит триста евро.', 'This phone costs three hundred euros.'],
  'u19-mc-03': ['ao sábado | по субботам | on Saturdays ; fruta | фрукты | fruit ; mercado | рынок | market', 'По субботам мы покупаем фрукты на рынке.', 'On Saturdays we buy fruit at the market.'],
  'u19-mc-04': ['gastam tudo | тратят всё | they spend everything', 'Они не откладывают деньги: тратят всё.', 'They do not save money: they spend everything.'],
  'u19-mc-05': ['em dinheiro | наличными | in cash ; com cartão | картой | by card', 'Вы хотите заплатить наличными или картой?', 'Do you want to pay in cash or by card?'],
  'u19-mc-06': ['demasiado | слишком много | too much ; roupa | одежда | clothes ; não poupas nada | ничего не откладываешь | you save nothing', 'Ты тратишь слишком много денег на одежду: ничего не откладываешь.', 'You spend too much money on clothes: you save nothing.'],
  'u19-mc-07': ['livraria | книжный магазин | bookshop', 'Она любит покупать книги в том книжном магазине.', 'She likes buying books in that bookshop.'],
  'u19-mc-08': ['quanto | сколько | how much ; bilhetes | билеты | tickets', 'Сколько стоят билеты?', 'How much are the tickets?'],

  // ter de
  'u19-td-01': ['amanhã | завтра | tomorrow', 'Мне нужно завтра работать.', 'I have to work tomorrow.'],
  'u19-td-02': ['na caixa | на кассе | at the till', 'Тебе нужно заплатить на кассе.', 'You have to pay at the till.'],
  'u19-td-03': ['o senhor | вы (вежливо, мужчине) | you (polite, to a man) ; pôr o cinto | пристегнуть ремень | fasten the belt', 'Вам нужно пристегнуть ремень.', 'You have to fasten your seat belt.'],
  'u19-td-04': ['acordar cedo | рано проснуться | wake up early', 'Нам нужно рано проснуться.', 'We have to wake up early.'],
  'u19-td-05': ['desligar o telemóvel | выключить телефон | switch off the phone', 'Вам нужно выключить телефон.', 'You have to switch off your phone.'],
  'u19-td-06': ['estudar | заниматься, учиться | to study ; teste | контрольная | test', 'Им нужно готовиться к контрольной.', 'They have to study for the test.'],
  'u19-td-07': ['ao sábado | по субботам | on Saturdays', 'Ей не нужно работать по субботам.', 'She does not have to work on Saturdays.'],
  'u19-td-08': ['bilhete | билет | ticket', 'Ане нужно купить билет.', 'Ana has to buy a ticket.'],

  // precisar de
  'u19-pd-01': ['planta | растение | plant ; água | вода | water', 'Этому растению нужна вода.', 'This plant needs water.'],
  'u19-pd-02': ['descansar | отдохнуть | to rest', 'Мне нужно отдохнуть.', 'I need to rest.'],
  'u19-pd-03': ['dormir mais | больше спать | sleep more', 'Тебе нужно больше спать.', 'You need to sleep more.'],
  'u19-pd-04': ['táxi | такси | taxi', 'Нам нужно такси.', 'We need a taxi.'],
  'u19-pd-05': ['estudar mais | больше заниматься | study more', 'Им нужно больше заниматься.', 'They need to study more.'],
  'u19-pd-06': ['ajuda | помощь | help', 'Вам нужна помощь?', 'Do you need help?'],
  'u19-pd-07': ['o gato | кот | the cat ; comer | поесть | to eat', 'Коту нужно поесть.', 'The cat needs to eat.'],
  'u19-pd-08': ['nada | ничего | nothing', 'Мне ничего не нужно.', 'I do not need anything.'],

  // a sentence from cue words
  'u19-sent-01': ['a conta | счёт | the bill', 'Я должен оплатить счёт.', 'I have to pay the bill.'],
  'u19-sent-02': ['cão | собака | dog ; comer | поесть | to eat', 'Этой собаке нужно поесть.', 'This dog needs to eat.'],
  'u19-sent-03': ['bilhetes | билеты | tickets', 'Нам нужно купить билеты.', 'We have to buy tickets.'],
  'u19-sent-04': ['gastar | тратить | to spend ; tanto | столько | so much', 'Тебе не нужно тратить столько денег.', 'You do not need to spend so much money.'],
  'u19-sent-05': ['querer | хотеть | to want ; poupar | копить | to save', 'Они хотят копить деньги.', 'They want to save money.'],
  'u19-sent-06': ['casa | дом | house ; custar | стоить | to cost', 'Тот дом стоит больших денег.', 'That house costs a lot of money.'],
  'u19-sent-07': ['desligar | выключить | to switch off', 'Вам нужно выключить телефон.', 'You have to switch off your phone.'],
  'u19-sent-08': ['flor | цветок | flower ; água | вода | water', 'Этому цветку нужна вода.', 'This flower needs water.'],

  // ter or ter de
  'u19-tr-01': ['dois irmãos | два брата | two brothers', 'У меня два брата.', 'I have two brothers.'],
  'u19-tr-02': ['estudar | заниматься | to study ; o exame | экзамен | the exam', 'Мне нужно готовиться к экзамену.', 'I have to study for the exam.'],
  'u19-tr-03': ['a morada | адрес | the address', 'У вас есть адрес отеля?', 'Do you have the hotel’s address?'],
  'u19-tr-04': ['reservar a mesa | забронировать столик | book the table ; antes | заранее | beforehand', 'Вам нужно заранее забронировать столик.', 'You have to book the table beforehand.'],
  'u19-tr-05': ['carro novo | новая машина | new car', 'У Марты новая машина.', 'Marta has a new car.'],
  'u19-tr-06': ['levar | отвезти | to take ; oficina | автомастерская | garage', 'Марте нужно отвезти машину в мастерскую.', 'Marta has to take the car to the garage.'],
  'u19-tr-07': ['já | уже | already ; bilhetes | билеты | tickets ; concerto | концерт | concert', 'У нас уже есть билеты на концерт.', 'We already have tickets for the concert.'],
  'u19-tr-08': ['comprar | купить | to buy ; os bilhetes | билеты | the tickets ; hoje | сегодня | today', 'Нам нужно купить билеты сегодня.', 'We have to buy the tickets today.'],
  'u19-tr-09': ['tempo | время | time ; amanhã à tarde | завтра днём | tomorrow afternoon', 'У тебя есть время завтра днём?', 'Do you have time tomorrow afternoon?'],
  'u19-tr-10': ['acordar cedo | рано проснуться | wake up early', 'Тебе нужно завтра рано проснуться?', 'Do you have to wake up early tomorrow?'],

  // what does it mean (the construction itself is never glossed)
  'u19-se-01': ['aqui | здесь | here ; pagar | платить | to pay', 'Здесь нужно заплатить.', 'You have to pay here.'],
  'u19-se-02': ['aqui | здесь | here ; pagar | платить | to pay', 'Здесь платить не нужно.', 'You do not have to pay here.'],
  'u19-se-03': ['regras | правила | rules ; museu | музей | museum ; tirar fotografias | фотографировать | take photos', 'Правила музея: здесь нельзя фотографировать.', 'Museum rules: you may not take photos here.'],
  'u19-se-04': ['regras | правила | rules ; museu | музей | museum ; tirar fotografias | фотографировать | take photos ; sem flash | без вспышки | without flash', 'Правила музея: здесь можно фотографировать без вспышки.', 'Museum rules: you may take photos here without flash.'],
  'u19-se-05': ['alunos | ученики | students ; vir à reunião | прийти на собрание | come to the meeting', 'Ученикам не обязательно приходить на собрание.', 'The students do not have to come to the meeting.'],
  'u19-se-06': ['alunos | ученики | students ; usar o telemóvel | пользоваться телефоном | use the phone ; na aula | на уроке | in class', 'Ученикам нельзя пользоваться телефоном на уроке.', 'The students may not use their phones in class.'],
  'u19-se-07': ['passageiros | пассажиры | passengers ; pôr o cinto | пристегнуть ремень | fasten the belt', 'Пассажиры должны пристегнуть ремень.', 'The passengers have to fasten their seat belts.'],
  'u19-se-08': ['reservar mesa | бронировать столик | book a table', 'Бронировать столик не нужно.', 'You do not need to book a table.'],

  // may, must not, must, need not
  'u19-pt-01': ['proibido | запрещено | forbidden ; fumar | курить | to smoke ; comboio | поезд | train', 'В поезде курить запрещено. Здесь вам нельзя курить.', 'Smoking is forbidden on the train. You may not smoke here.'],
  'u19-pt-02': ['a entrada | вход | admission ; museu | музей | museum ; grátis | бесплатный | free', 'Вход в музей бесплатный. Платить вам не нужно.', 'Admission to the museum is free. You do not have to pay.'],
  'u19-pt-03': ['avião | самолёт | plane ; descolagem | взлёт | take-off ; passageiro | пассажир | passenger ; pôr o cinto | пристегнуть ремень | fasten the belt', 'В самолёте перед взлётом пассажир должен пристегнуть ремень.', 'On the plane, before take-off, the passenger has to fasten the seat belt.'],
  'u19-pt-04': ['cães | собаки | dogs ; bem-vindos | желанные гости | welcome ; trazer | привести, взять с собой | to bring', 'На этом пляже собакам рады: Жуан может взять с собой собаку.', 'Dogs are welcome on this beach: João may bring his dog.'],
  'u19-pt-05': ['museu | музей | museum ; sinal | знак | sign ; máquina fotográfica | фотоаппарат | camera ; riscada | перечёркнутая | crossed out ; turistas | туристы | tourists', 'В музее висит знак с перечёркнутым фотоаппаратом: туристам нельзя фотографировать.', 'In the museum there is a sign with a crossed-out camera: tourists may not take photos.'],
  'u19-pt-06': ['ao domingo | по воскресеньям | on Sundays ; estacionamento | парковка | parking ; gratuito | бесплатный | free', 'По воскресеньям парковка бесплатная: в воскресенье вам не нужно платить.', 'Parking is free on Sundays: on Sunday you do not have to pay.'],
  'u19-pt-07': ['biblioteca | библиотека | library ; obrigatório | обязательно | required ; falar baixo | говорить тихо | speak quietly', 'В библиотеке обязательно говорить тихо: ученики должны говорить тихо.', 'In the library speaking quietly is required: the students have to speak quietly.'],
  'u19-pt-08': ['aceita cartões | принимает карты | accepts cards', 'Этот магазин принимает карты: вы можете заплатить картой.', 'This shop accepts cards: you can pay by card.'],
  'u19-pt-09': ['reunião | собрание | meeting ; opcional | необязательное | optional ; se quiserem | если хотите | if you want', 'Завтрашнее собрание необязательное: вам не нужно идти, но можно, если хотите.', 'Tomorrow’s meeting is optional: you do not have to go, but you may if you want.'],
  'u19-pt-10': ['ciclistas | велосипедисты | cyclists ; proibidos | запрещены | banned ; andar de bicicleta | кататься на велосипеде | ride a bike', 'В этом парке велосипедистам вход запрещён: здесь нам нельзя кататься на велосипеде.', 'Cyclists are banned in this park: we may not ride a bike here.'],

  // saber or poder
  'u19-sp-01': ['seis anos | шесть лет | six years old ; ler | читать | to read ; aprendeu | научился | learned', 'Педру шесть лет, и он уже умеет читать: научился в школе.', 'Pedro is six and can already read: he learned at school.'],
  'u19-sp-02': ['calor | жарко | hot ; abrir a janela | открыть окно | open the window', 'Здесь очень жарко. Можно мне открыть окно? — Да, конечно.', 'It is very hot in here. May I open the window? — Yes, of course.'],
  'u19-sp-03': ['conduzir | водить машину | to drive ; aprendi | я научился | I learned ; dezoito | восемнадцать | eighteen', 'Я умею водить — научился в восемнадцать лет, — но сегодня у меня нет машины.', 'I can drive — I learned at eighteen — but today I have no car.'],
  'u19-sp-04': ['sair | выйти, пойти куда-нибудь | to go out ; até tarde | допоздна | until late', 'Сегодня я не могу никуда пойти: мне нужно работать допоздна.', 'I cannot go out today: I have to work until late.'],
  'u19-sp-05': ['cozinhar | готовить | to cook ; nunca aprendeste | так и не научился | you never learned', 'Ты умеешь готовить или так и не научился?', 'Can you cook, or did you never learn?'],
  'u19-sp-06': ['clientes | клиенты | customers ; estacionar | парковаться | to park ; o lugar | место | the space ; só para táxis | только для такси | only for taxis', 'Здесь клиентам нельзя парковаться: это место только для такси.', 'Customers may not park here: the space is only for taxis.'],
  'u19-sp-07': ['a minha avó | моя бабушка | my grandmother ; usar | пользоваться | to use ; nunca aprendeu | так и не научилась | she never learned', 'Моя бабушка не умеет пользоваться компьютером: так и не научилась.', 'My grandmother cannot use the computer: she never learned.'],
  'u19-sp-08': ['falar alto | говорить громко | speak loudly ; biblioteca | библиотека | library', 'Нам можно говорить здесь громко? — Нет, это библиотека.', 'May we speak loudly here? — No, it is a library.'],
  'u19-sp-09': ['tocar guitarra | играть на гитаре | play the guitar ; aulas | уроки | lessons ; desde pequenos | с детства | since they were little', 'Они умеют играть на гитаре: занимаются с детства.', 'They can play the guitar: they have had lessons since they were little.'],
  'u19-sp-10': ['escrever | писать | to write ; esta semana | на этой неделе | this week ; partiu o braço | сломала руку | broke her arm', 'На этой неделе она не может писать: сломала руку.', 'She cannot write this week: she broke her arm.'],

  // someone, no one, something, nothing
  'u19-in-01': ['em casa | дома | at home ; ouço vozes | я слышу голоса | I hear voices ; sala | гостиная | living room', 'Дома кто-нибудь есть? Я слышу голоса в гостиной.', 'Is anyone at home? I can hear voices in the living room.'],
  'u19-in-02': ['a loja | магазин | the shop ; vazia | пустой | empty ; lá dentro | внутри | inside', 'Магазин пуст: внутри никого нет.', 'The shop is empty: there is nobody inside.'],
  'u19-in-03': ['fome | голод | hunger ; leve | лёгкий | light', 'Я немного проголодался. Хочу съесть что-нибудь лёгкое.', 'I am a little hungry. I want to eat something light.'],
  'u19-in-04': ['frigorífico | холодильник | fridge ; vazio | пустой | empty ; para comer | чтобы поесть | to eat', 'Холодильник пуст: есть нечего.', 'The fridge is empty: there is nothing to eat.'],
  'u19-in-05': ['turma | класс | class ; gostam da professora | любят учительницу | like the teacher', 'В нашем классе все любят учительницу.', 'In our class everyone likes the teacher.'],
  'u19-in-06': ['come | ест | eats ; carne | мясо | meat ; peixe | рыба | fish ; legumes | овощи | vegetables', 'Ана ест всё: мясо, рыбу, овощи, фрукты.', 'Ana eats everything: meat, fish, vegetables, fruit.'],
  'u19-in-07': ['fecha | закрывается | closes ; trabalhar | работать | to work ; donos | хозяева | owners ; empregados | работники | staff', 'По воскресеньям магазин закрыт, потому что в этот день никто не хочет работать: ни хозяева, ни работники.', 'On Sundays the shop is closed, because nobody wants to work that day: neither the owners nor the staff.'],
  'u19-in-08': ['chinês | китайский | Chinese ; percebo | понимаю | I understand', 'Он говорит по-китайски, а я китайского не знаю: ничего не понимаю.', 'He speaks Chinese and I do not know Chinese: I understand nothing.'],
  'u19-in-09': ['conheces | ты знаешь, знаком | do you know ; um sítio para dormir | где переночевать | a place to sleep', 'Ты знаешь кого-нибудь в Лиссабоне? Мне нужно где-то переночевать.', 'Do you know anyone in Lisbon? I need a place to sleep.'],
  'u19-in-10': ['pronto | готово | ready ; sair | выходить | to go out', 'Всё готово: можем идти.', 'Everything is ready: we can go.'],

  // todo / tudo
  'u19-tt-01': ['ao sábado | по субботам | on Saturdays ; durmo | я сплю | I sleep ; a manhã | утро | the morning', 'По субботам я сплю всё утро.', 'On Saturdays I sleep all morning.'],
  'u19-tt-02': ['ginásio | спортзал | gym ; semanas | недели | weeks', 'Я хожу в спортзал каждую неделю.', 'I go to the gym every week.'],
  'u19-tt-03': ['amigos | друзья | friends ; falam inglês | говорят по-английски | speak English', 'Все мои друзья говорят по-английски.', 'All my friends speak English.'],
  'u19-tt-04': ['criança | ребёнок | child ; sopa | суп | soup', 'Ребёнок не хочет есть весь суп.', 'The child does not want to eat all the soup.'],
  'u19-tt-05': ['na mesa | на столе | on the table ; para ti | для тебя | for you', 'Всё, что на столе, — для тебя.', 'Everything on the table is for you.'],
  'u19-tt-06': ['vemos televisão | смотрим телевизор | we watch TV ; noites | вечера | evenings', 'Мы смотрим телевизор каждый вечер.', 'We watch TV every evening.'],
  'u19-tt-07': ['gosto de | мне нравится | I like ; ruas | улицы | streets ; praias | пляжи | beaches ; pessoas | люди | people', 'Мне нравится всё в этом городе: улицы, пляжи, люди.', 'I like everything in this city: the streets, the beaches, the people.'],
  'u19-tt-08': ['família | семья | family ; jantar | ужинать | to have dinner', 'По воскресеньям вся семья приходит на ужин.', 'The whole family comes to dinner on Sundays.'],
  'u19-tt-09': ['leio o jornal | читаю газету | I read the newspaper ; dias | дни | days', 'Я читаю газету каждый день.', 'I read the newspaper every day.'],
  'u19-tt-10': ['o bebé | малыш | the baby ; dorme | спит | sleeps ; o dia | день | the day', 'Малыш спит весь день.', 'The baby sleeps all day.'],

  // rewrite the whole sentence (the bracketed part is glossed: it is the source, not the answer)
  'u19-fi-01': ['gostam de praia | любят пляж | like the beach', 'Все любят пляж.', 'Everyone likes the beach.'],
  'u19-fi-02': ['fala chinês | говорит по-китайски | speaks Chinese ; também não | тоже не | not … either', 'Никто не говорит по-китайски.', 'Nobody speaks Chinese.'],
  'u19-fi-03': ['mochila | рюкзак | backpack ; uma coisa | одна вещь | a thing ; para ti | для тебя | for you', 'В рюкзаке у меня кое-что для тебя.', 'I have something for you in my backpack.'],
  'u19-fi-04': ['hoje | сегодня | today ; compro | покупаю | I buy ; nenhuma coisa | ни одной вещи | not a single thing', 'Сегодня я ничего не покупаю.', 'Today I am not buying anything.'],
  'u19-fi-05': ['bairro | район | neighbourhood ; caras | дорогие | expensive', 'В этом районе всё дорогое.', 'Everything is expensive in this neighbourhood.'],
  'u19-fi-06': ['uma pessoa | какой-то человек | a person ; à porta | у двери | at the door', 'Кто-то стоит у двери.', 'There is someone at the door.'],
  'u19-fi-07': ['vejo | вижу | I see ; nenhuma pessoa | ни одного человека | not a single person ; rua | улица | street', 'Я никого не вижу на улице.', 'I do not see anyone in the street.'],
  'u19-fi-08': ['nenhuma coisa | ни одна вещь | not a single thing ; barata | дешёвая | cheap', 'В этом ресторане нет ничего дешёвого.', 'Nothing is cheap in this restaurant.'],
  'u19-fi-09': ['nenhuma coisa | ни одной вещи | not a single thing ; frigorífico | холодильник | fridge', 'В холодильнике ничего нет.', 'There is nothing in the fridge.'],
  'u19-fi-10': ['nenhuma pessoa | ни один человек | not a single person ; sair | выходить | to go out ; chuva | дождь | rain', 'В такой дождь никто не хочет выходить из дома.', 'Nobody wants to go out in this rain.'],

  // the opposite action (the given verb is glossed, never the opposite one)
  'u19-op-01': ['ligo | включаю | I switch on ; rádio | радио | radio', 'Я включаю радио. ↔ Я выключаю радио.', 'I switch on the radio. ↔ I switch off the radio.'],
  'u19-op-02': ['acendo | зажигаю, включаю | I turn on ; luz | свет | light', 'Я включаю свет. ↔ Я выключаю свет.', 'I turn on the light. ↔ I turn off the light.'],
  'u19-op-03': ['ponho | надеваю | I put on ; casaco | пальто | coat', 'Я надеваю пальто. ↔ Я снимаю пальто.', 'I put on my coat. ↔ I take off my coat.'],
  'u19-op-04': ['tira | снимает | takes off ; óculos | очки | glasses', 'Она снимает очки. ↔ Она надевает очки.', 'She takes off her glasses. ↔ She puts on her glasses.'],
  'u19-op-05': ['acendem | зажигаете | you light ; velas | свечи | candles', 'Вы зажигаете свечи. ↔ Вы гасите свечи.', 'You light the candles. ↔ You put out the candles.'],
  'u19-op-06': ['desligamos | выключаем | we switch off', 'Мы выключаем компьютер. ↔ Мы включаем компьютер.', 'We switch off the computer. ↔ We switch on the computer.'],
  'u19-op-07': ['tiras | достаёшь | you take out ; mala | сумка, чемодан | bag ; do carro | из машины | from the car', 'Ты достаёшь сумку из машины. ↔ Ты кладёшь сумку в машину.', 'You take the bag out of the car. ↔ You put the bag in the car.'],
  'u19-op-08': ['poupam | копят | they save', 'Они копят деньги. ↔ Они тратят деньги.', 'They save money. ↔ They spend money.'],
  'u19-op-09': ['pomos o cinto | пристёгиваем ремень | we fasten the belt', 'Мы пристёгиваем ремень. ↔ Мы отстёгиваем ремень.', 'We fasten the seat belt. ↔ We unfasten the seat belt.'],
  'u19-op-10': ['tiram | снимают | they take off ; sapatos | обувь | shoes', 'Они снимают обувь. ↔ Они надевают обувь.', 'They take off their shoes. ↔ They put on their shoes.'],

  // Sabes…?
  'u19-sf-01': ['nadar | плавать | to swim ; muito bem | очень хорошо | very well', 'Ты умеешь плавать? — Да, я очень хорошо плаваю.', 'Can you swim? — Yes, I can swim very well.'],
  'u19-sf-02': ['o senhor | вы (вежливо, мужчине) | you (polite, to a man) ; cozinhar | готовить | to cook', 'Вы умеете готовить? — Нет, не умею.', 'Can you cook? — No, I cannot cook.'],
  'u19-sf-03': ['falar alemão | говорить по-немецки | speak German ; um pouco | немного | a little', 'Ты говоришь по-немецки? — Да, немного говорю.', 'Can you speak German? — Yes, I can speak a little German.'],
  'u19-sf-04': ['dançar salsa | танцевать сальсу | dance salsa ; muito bem | очень хорошо | very well', 'Вы умеете танцевать сальсу? — Да, мы очень хорошо танцуем сальсу.', 'Can you dance salsa? — Yes, we can dance salsa very well.'],
  'u19-sf-05': ['tocar piano | играть на пианино | play the piano', 'Ана умеет играть на пианино? — Нет, не умеет.', 'Can Ana play the piano? — No, she cannot.'],
  'u19-sf-06': ['tirar fotografias | фотографировать | take photos ; muito bem | очень хорошо | very well', 'Руй умеет фотографировать? — Да, он очень хорошо фотографирует.', 'Can Rui take photos? — Yes, he takes very good photos.'],
  'u19-sf-07': ['tocar guitarra | играть на гитаре | play the guitar', 'Ты умеешь играть на гитаре?', 'Can you play the guitar?'],
  'u19-sf-08': ['fazer uma caipirinha | приготовить кайпиринью | make a caipirinha', 'Вы умеете готовить кайпиринью?', 'Can you make a caipirinha?'],
};
