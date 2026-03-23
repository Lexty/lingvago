# Архитектура

## Структура проекта

```
lingvago/
├── public/
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── maskable-icon-512x512.png
│   ├── apple-touch-icon-180x180.png
│   └── favicon.svg
├── src/
│   ├── components/          # Переиспользуемые UI-компоненты
│   │   ├── Layout/
│   │   │   ├── Layout.tsx
│   │   │   └── Layout.module.css
│   │   └── NavBar/
│   │       ├── NavBar.tsx
│   │       └── NavBar.module.css
│   ├── db/                  # Слой данных (Dexie)
│   │   ├── index.ts         # Класс БД + синглтон
│   │   ├── schema.ts        # TypeScript-интерфейсы таблиц
│   │   ├── fsrs-helpers.ts  # Конвертация CardState ↔ ts-fsrs Card
│   │   ├── hooks.ts         # Dexie creating/deleting hooks
│   │   └── seed.ts          # Начальные данные словаря
│   ├── hooks/               # React-хуки
│   │   ├── useSession.ts    # Жизненный цикл учебной сессии
│   │   ├── useStats.ts      # Агрегация статистики
│   │   └── useTheme.ts      # Переключение тем
│   ├── locales/             # Файлы переводов UI (i18next)
│   │   ├── ru.json          # Русские переводы
│   │   └── en.json          # Английские переводы
│   ├── i18n.ts              # Инициализация i18next
│   ├── modes/               # Режимы обучения (pluggable)
│   │   ├── types.ts         # Интерфейс LearningMode + типы
│   │   ├── registry.ts      # Реестр режимов
│   │   ├── vocabulary/      # Режим "Словарь"
│   │   │   ├── VocabularyMode.ts
│   │   │   └── components/
│   │   │       ├── MultipleChoice.tsx
│   │   │       ├── MultipleChoice.module.css
│   │   │       ├── FlipCard.tsx
│   │   │       └── FlipCard.module.css
│   │   └── numbers/         # Режим "Числа"
│   │       ├── NumbersMode.ts
│   │       ├── data.ts      # Таблица числительных PT
│   │       └── components/
│   │           ├── NumberInput.tsx
│   │           └── NumberInput.module.css
│   ├── screens/             # Страницы (роуты)
│   │   ├── Dashboard/
│   │   ├── Study/
│   │   ├── Decks/           # Список колод + CRUD
│   │   ├── DeckWords/       # Слова внутри колоды
│   │   ├── Stats/
│   │   └── Settings/
│   ├── styles/              # Глобальные стили
│   │   ├── variables.css    # CSS custom properties (токены)
│   │   └── global.css       # Ресет + базовые стили
│   ├── App.tsx              # Роутер
│   ├── main.tsx             # Точка входа
│   └── vite-env.d.ts        # Типы Vite
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── package.json
```

## Паттерн LearningMode

Приложение построено как платформа с подключаемыми режимами обучения. Каждый режим — независимый модуль, реализующий общий интерфейс.

### Интерфейс LearningMode

```ts
interface LearningMode {
  /** Уникальный идентификатор режима (используется в URL) */
  id: string

  /** Отображаемое название */
  title: string

  /** Краткое описание */
  description: string

  /** Иконка (эмодзи) */
  icon: string

  /** Получить элементы для учебной сессии */
  getSessionItems(count: number): Promise<SessionItem[]>

  /** Обработать ответ пользователя */
  submitAnswer(item: SessionItem, answer: Answer): Promise<void>

  /** Получить статистику режима */
  getStats(): Promise<ModeStats>

  /** Количество элементов, требующих повторения */
  getDueCount(): Promise<number>
}
```

### SessionItem — элемент сессии

```ts
interface SessionItem {
  /** Уникальный ID внутри сессии */
  id: string

  /** Вопрос для отображения */
  question: string

  /** Правильный ответ */
  correctAnswer: string

  /** Тип упражнения (определяет какой компонент рендерить) */
  exerciseType: 'multiple-choice' | 'flip-card' | 'number-input'

  /** Варианты ответов (только для multiple-choice) */
  options?: string[]

  /** Произвольные данные режима (ID карточки, направление и т.д.) */
  payload: Record<string, unknown>
}
```

### Answer — ответ пользователя

```ts
interface Answer {
  /** Что выбрал/ввёл пользователь */
  value: string

  /** Правильность ответа */
  correct: boolean

  /** FSRS-рейтинг (1-4), если применимо */
  fsrsRating?: number

  /** Время ответа в миллисекундах */
  timeMs: number
}
```

### ModeStats — статистика режима

```ts
interface ModeStats {
  /** Всего элементов в режиме */
  totalItems: number

  /** Требуют повторения сейчас */
  dueNow: number

  /** Средний retention (0-1) */
  averageRetention: number

  /** Всего повторений за всё время */
  totalReviews: number
}
```

## Mode Registry

Реестр режимов реализует паттерн Service Locator. Режимы регистрируются при старте приложения и доступны глобально.

```ts
// Регистрация (в main.tsx)
registerMode(new VocabularyMode())
registerMode(new NumbersMode())

// Получение
getMode('vocabulary')   // → VocabularyMode instance
getAllModes()            // → [VocabularyMode, NumbersMode]
```

### Добавление нового режима

1. Создать класс, реализующий `LearningMode`, в `src/modes/<name>/`
2. Создать компоненты упражнений в `src/modes/<name>/components/`
3. Зарегистрировать: `registerMode(new MyMode())` в `main.tsx`
4. Добавить ключи перевода (`mode.<id>.title`, `mode.<id>.desc`) в `src/locales/ru.json` и `src/locales/en.json`
5. *(если новый exerciseType)* — добавить рендеринг компонента в Study-экран

Dashboard автоматически покажет новый режим через `getAllModes()`. Study-экран отрендерит компонент упражнения по `exerciseType` (для существующих типов — без изменений).

## Поток данных

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌────────┐
│  Dexie  │────▶│  Mode    │────▶│  useSession │────▶│ Screen │
│  (DB)   │◀────│ (логика) │◀────│  (hook)     │◀────│ (UI)   │
└─────────┘     └──────────┘     └─────────────┘     └────────┘
```

1. **Dexie (DB)** — хранит слова, состояние карточек, сессии, настройки
2. **Mode (логика)** — читает из DB карточки, которые пора повторять; записывает обновлённое FSRS-состояние после ответа
3. **useSession (hook)** — управляет жизненным циклом сессии: загрузка → ответы → сохранение результата
4. **Screen (UI)** — рендерит текущее упражнение, принимает ввод пользователя

### Реактивность (useLiveQuery)

Для экранов, которые отображают данные в реальном времени (Dashboard, Decks, DeckWords, Stats), используется `useLiveQuery` из `dexie-react-hooks`. Этот хук подписывается на изменения в Dexie-таблицах и автоматически обновляет UI при изменении данных.

```
useLiveQuery(() => db.words.count()) → reactive word count
useLiveQuery(() => db.cardStates.where('due').belowOrEqual(now).count()) → reactive due count
```

`useLiveQuery` возвращает `undefined` во время первой загрузки — все компоненты должны обрабатывать это состояние.

## Локализация

Приложение поддерживает два **независимых** измерения локализации:

### Уровень 1: UI i18n (язык интерфейса)

Стандартная локализация интерфейса через **i18next + react-i18next**.

- Файлы переводов: `src/locales/ru.json`, `src/locales/en.json`
- Формат ключей: nested namespace (`"nav.home"`, `"study.start"`, `"settings.theme"`)
- В компонентах: `const { t } = useTranslation()` → `t('study.start')`
- Определение языка при старте: `navigator.language` → fallback на `'ru'`
- Ручное переключение: Settings → `i18next.changeLanguage(lang)` → сохранение в `Settings.uiLanguage`
- Инициализация: `i18next.init(...)` в `src/i18n.ts`, до рендера React-дерева
- Добавление нового UI-языка: создать `src/locales/<lang>.json`, добавить опцию в Settings

Названия режимов обучения также локализуются через i18next. Каждый режим имеет поле `id`, по которому формируются ключи: `t('mode.vocabulary.title')`, `t('mode.numbers.title')`. Интерфейс `LearningMode` не меняется — Dashboard вызывает `t('mode.' + mode.id + '.title')`.

### Уровень 2: Учебный контент (языковые пары) — future

> **В v1 studyLanguage зафиксирован как `'ru'`.** Переключение недоступно в UI. Всё описанное ниже — архитектурный задел для будущих версий.

Учебный контент — это **не** перевод интерфейса. Программы обучения для разных родных языков концептуально различны (разные примеры, объяснения, наборы слов). В будущих версиях поддержка нескольких языковых пар будет реализована через:

- `Settings.studyLanguage` — активная языковая пара (в v1 всегда `'ru'`)
- `Word.translations[studyLanguage]` — перевод слова на родной язык
- `CardState.direction` — формируется из studyLanguage (`pt→ru`, `ru→pt`)
- `Word.translations: Record<string, string>` — архитектурный задел, в v1 содержит только `{ ru: "..." }`

### Поток данных с локализацией

```
Settings.uiLanguage   → i18next → useTranslation() → t('key') → Screen (UI-строки)
Settings.studyLanguage → LearningMode → Word.translations[lang] → SessionItem (контент)
```

## Инициализация приложения (main.tsx)

Порядок действий при старте:

1. Импорт глобальных стилей (`global.css`)
2. Инициализация i18next (`src/i18n.ts`) — определение языка из `navigator.language` / Settings
3. Регистрация Dexie hooks (автосоздание CardState при добавлении Word)
4. Регистрация LearningMode'ов в реестре
5. Заполнение начальных данных (seed) — только если БД пуста
6. Рендер React-дерева с BrowserRouter
