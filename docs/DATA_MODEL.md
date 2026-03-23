# Модель данных

## Обзор

Все данные хранятся в IndexedDB через Dexie.js v4. База данных называется `lingvago` и содержит 5 таблиц.

## Таблицы

### Deck — колода слов

```ts
interface Deck {
  id?: number          // Автоинкремент (Dexie PK)
  name: string         // Название ("Экзамен A2", "Путешествия")
  description: string  // Описание (может быть пустой строкой)
  isActive: boolean    // Включена ли колода в учебные сессии
  createdAt: number    // Timestamp создания (Date.now())
}
```

Колода — основная единица организации слов (аналог колод в Anki). Каждое слово принадлежит ровно одной колоде. Флаг `isActive` управляет тем, попадают ли карточки из этой колоды в учебные сессии. Деактивированные колоды сохраняют прогресс FSRS, но их карточки не показываются.

### Word — слово в словаре

```ts
interface Word {
  id?: number                            // Автоинкремент (Dexie PK)
  pt: string                             // Португальское слово/фраза (изучаемый язык)
  translations: Record<string, string>   // Переводы по языкам: { ru: "дом", en: "house" }
  deckId: number                         // FK → Deck.id (каждое слово принадлежит одной колоде)
  createdAt: number                      // Timestamp создания (Date.now())
}
```

`translations` — ключ это код языка (ISO 639-1: `ru`, `en`, ...), значение — перевод. Минимум один перевод обязателен. Для v1 заполняется только `{ ru: "..." }`. Структура позволяет добавить переводы на другие языки без миграции схемы. Dexie не индексирует вложенные ключи `Record` — это не нужно, поиск идёт по `pt` и `deckId`.

### CardState — FSRS-состояние карточки

Для каждого слова создаётся две карточки на каждую языковую пару. Направление зависит от `studyLanguage` из Settings. Каждая карточка хранит полное FSRS-состояние.

```ts
interface CardState {
  id?: number                    // Автоинкремент (Dexie PK)
  wordId: number                 // FK → Word.id
  direction: string              // Направление: 'pt→ru', 'ru→pt', 'pt→en', 'en→pt' и т.д.
  due: number                    // Когда повторять (timestamp)
  stability: number              // FSRS: стабильность памяти
  difficulty: number             // FSRS: сложность карточки
  elapsed_days: number           // FSRS: дней с последнего повторения
  scheduled_days: number         // FSRS: запланированный интервал
  reps: number                   // FSRS: кол-во повторений
  lapses: number                 // FSRS: кол-во забываний
  state: number                  // FSRS State enum: 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review: number            // Timestamp последнего повторения (0 если не было)
}
```

**Почему timestamps, а не Date**: IndexedDB поддерживает Date, но числовые timestamps дают более предсказуемое поведение для range-запросов и compound-индексов. Конвертация в/из `Date` происходит в `fsrs-helpers.ts`.

### Session — история сессий

```ts
interface Session {
  id?: number          // Автоинкремент (Dexie PK)
  modeId: string       // ID режима ('vocabulary', 'numbers')
  startedAt: number    // Timestamp начала сессии
  finishedAt: number   // Timestamp окончания сессии
  totalCards: number   // Всего карточек в сессии
  correctCards: number // Правильных ответов
}
```

### Settings — настройки

```ts
interface Settings {
  id: string           // Всегда 'global' (синглтон)
  sessionSize: number  // Размер сессии (по умолчанию 10)
  theme: 'light' | 'dark' | 'system'
  uiLanguage: string   // Язык интерфейса: 'ru' | 'en' (по умолчанию из navigator.language)
  studyLanguage: string // Язык переводов: в v1 всегда 'ru' (переключение заблокировано в UI)
}
```

`uiLanguage` определяет язык всех надписей, кнопок, сообщений в интерфейсе (через i18next). `studyLanguage` определяет, какой перевод из `Word.translations` показывается в карточках и какие направления (`direction`) создаются для CardState. Эти два параметра **независимы**: можно учить PT→RU с англоязычным интерфейсом.

**Определение по умолчанию**: `uiLanguage` определяется из `navigator.language` при первом запуске (если начинается с `ru` → `'ru'`, иначе `'en'`). `studyLanguage` в v1 безусловно `'ru'` — автоопределение не применяется.

## Dexie-схема и индексы

```ts
this.version(1).stores({
  decks:      '++id, name, isActive',
  words:      '++id, deckId, pt',
  cardStates: '++id, wordId, direction, due, state, [wordId+direction]',
  sessions:   '++id, modeId, startedAt',
  settings:   'id',
})
```

### Обоснование индексов

| Таблица | Индекс | Зачем |
|---------|--------|-------|
| decks | `++id` | Автоинкремент PK |
| decks | `name` | Поиск колоды по имени |
| decks | `isActive` | Выборка активных колод для сессий |
| words | `++id` | Автоинкремент PK |
| words | `deckId` | Фильтрация слов по колоде, джойн с Deck |
| words | `pt` | Поиск дубликатов при добавлении |
| cardStates | `++id` | Автоинкремент PK |
| cardStates | `wordId` | Джойн с Word, каскадное удаление |
| cardStates | `direction` | Фильтрация по направлению |
| cardStates | `due` | **Ключевой**: выборка карточек для повторения (`where('due').belowOrEqual(now)`) |
| cardStates | `state` | Фильтрация по FSRS-состоянию (New/Learning/Review) |
| cardStates | `[wordId+direction]` | Compound: уникальный поиск карточки для конкретного слова и направления |
| sessions | `modeId` | Фильтрация сессий по режиму |
| sessions | `startedAt` | Хронологическая сортировка |
| settings | `id` | Строковый PK (синглтон `'global'`) |

## Связи между таблицами

```
Deck (1) ──── (N) Word (1) ──── (2) CardState
  │                  │                  │
  │ deckId           │ wordId           │ (pt→studyLang, studyLang→pt)
  │                  │                  │
  └──────────────────┴──────────────────┘

Session — независимая таблица, связана с режимом по modeId (строка)
Settings — синглтон, не связан с другими таблицами
```

Dexie не поддерживает SQL-подобные джойны. Связи реализуются программно:
- При удалении Deck → удаляются все Word в ней → каскадно удаляются CardState (через Dexie deleting hook)
- При создании Word → автоматически создаются 2 CardState (через Dexie creating hook)
- При удалении Word → каскадно удаляются связанные CardState (через Dexie deleting hook)
- При выборке карточек → Word загружается отдельным запросом по `wordId`, принадлежность к активной колоде проверяется через `word.deckId`

## Dexie Hooks — автоматизация жизненного цикла

### Creating hook (Word → CardState)

При добавлении нового слова в таблицу `words` автоматически создаются две записи в `cardStates` — по одной для каждого направления перевода. Направления определяются по текущему `studyLanguage` из Settings.

```
Word создан (id=42), studyLanguage='ru'
  ├── CardState { wordId: 42, direction: 'pt→ru', state: New, due: now }
  └── CardState { wordId: 42, direction: 'ru→pt', state: New, due: now }
```

Хук использует callback `onsuccess`, который вызывается после коммита транзакции с полученным primary key.

CardState создаётся только если у слова есть `translations[studyLanguage]`. Если слово было импортировано с переводом только на другом языке — CardState для текущего studyLanguage не создаётся.

### Смена studyLanguage (future)

> В v1 `studyLanguage` зафиксирован как `'ru'`. Описанное ниже — проектное решение для будущих версий.

При смене `studyLanguage` (например, с `'ru'` на `'en'`) возникает вопрос: откуда берутся CardState для нового направления (`pt→en`, `en→pt`), если слово было создано при `studyLanguage='ru'`?

**Решение: lazy creation.** CardState для нового направления создаются при первом включении слова в сессию:

1. `VocabularyMode.getSessionItems()` обнаруживает слово с `translations[newLang]`, но без CardState для `pt→newLang`
2. Создаёт новые CardState с `state = New` для этого слова и нового направления
3. Существующие CardState (`pt→ru`, `ru→pt`) **не удаляются** — прогресс сохраняется на случай возврата к предыдущему языку

Это ленивый подход — CardState не создаются массово при переключении, а только когда слово реально попадает в сессию.

### Deleting hook (каскадное удаление)

При удалении слова из `words` автоматически удаляются все связанные записи из `cardStates` по `wordId`.

## Интеграция с ts-fsrs v5

### Хранимое состояние vs ts-fsrs Card

ts-fsrs оперирует объектом `Card` с полями типа `Date`. В IndexedDB мы храним timestamps (числа). Модуль `fsrs-helpers.ts` обеспечивает двустороннюю конвертацию.

### toFSRSCard(cardState) → Card

Преобразует `CardState` из БД в `Card` из ts-fsrs:
- `due: number` → `due: Date`
- `last_review: number` → `last_review: Date | undefined`
- Остальные поля копируются как есть

### fromFSRSCard(card) → Partial<CardState>

Преобразует `Card` из ts-fsrs обратно в поля для записи в БД:
- `due: Date` → `due: number` (через `.getTime()`)
- `last_review: Date | undefined` → `last_review: number` (0 если undefined)

### createNewCardState(wordId, direction)

Создаёт начальное состояние карточки для нового слова:
1. Вызывает `createEmptyCard()` из ts-fsrs
2. Конвертирует через `fromFSRSCard()`
3. Добавляет `wordId` и `direction`

### Процесс повторения

```
1. Загрузить CardState из DB               → CardState
2. Конвертировать в FSRS Card              → toFSRSCard(cardState) → Card
3. Вычислить следующее состояние           → fsrs.next(card, now, rating) → result
4. Конвертировать обратно                  → fromFSRSCard(result.card) → fields
5. Обновить запись в DB                    → db.cardStates.update(id, fields)
```

### FSRS-инстанс

Создаётся один раз на уровне модуля VocabularyMode с параметрами по умолчанию:

```ts
const fsrs = new FSRS()
```

Параметры FSRS (request_retention, maximum_interval и т.д.) можно будет настроить через Settings в будущем.

## Начальные данные (seed)

При первом запуске (когда таблица `decks` пуста) автоматически создаётся колода по умолчанию и набор из ~25-30 слов:

**Колода:** `{ name: "Starter", description: "Базовые слова", isActive: true }`

**Слова** (все привязаны к Starter колоде, для v1 только RU-переводы):
- Приветствия: olá → `{ ru: "привет" }`, obrigado → `{ ru: "спасибо" }`...
- Еда: água → `{ ru: "вода" }`, café → `{ ru: "кофе" }`...
- Семья: mãe → `{ ru: "мать" }`, pai → `{ ru: "отец" }`...
- Места: casa → `{ ru: "дом" }`, escola → `{ ru: "школа" }`...
- Числа: um → `{ ru: "один" }`, dois → `{ ru: "два" }`...

CardState для этих слов создаётся автоматически через Dexie creating hook (с направлениями для текущего `studyLanguage`).

При добавлении поддержки EN-курса в будущем потребуется отдельный seed с EN-переводами.

## Миграции

Dexie использует версионирование схемы.

Текущая версия: **1**.

При изменении схемы в будущем — добавить новую версию с upgrade-функцией:

```ts
this.version(2).stores({
  // обновлённая схема
}).upgrade(tx => {
  // миграция данных
})
```
