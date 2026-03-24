# MVP — Фронт работ

## Принцип

Три фазы, каждая самодостаточна. После фазы 1 приложение уже работает — можно учить слова. Фазы 2 и 3 добавляют управление и polish.

---

## Фаза 1 — Ядро

> Цель: можно открыть приложение, увидеть Dashboard, начать сессию, учить слова с FSRS, работать офлайн.

Фаза 1 разделена на две подфазы для ясности приоритетов. На практике реализуются вместе, но core loop (1a) — это минимум, без которого приложение бесполезно, а foundation (1b) — обвязка.

### Фаза 1a — Core learning loop

> Минимум для работающего обучения: DB → VocabularyMode → Study экран.

Задачи: 1.4, 1.5, 1.6, 1.7 (useSession), 1.9 (Study + SessionSummary).

### Фаза 1b — Foundation

> UI shell и инфраструктура: scaffolding, стили, i18n, Layout, Dashboard, PWA, роутинг с заглушками.

Задачи: 1.1, 1.2, 1.3, 1.7 (useTheme), 1.8, 1.9 (Dashboard), 1.10.

---

### 1.1 Scaffolding

```bash
npm create vite@latest lingvago -- --template react-ts
npm i dexie dexie-react-hooks ts-fsrs react-router i18next react-i18next
npm i -D vite-plugin-pwa
```

Файлы:
- `vite.config.ts` — VitePWA plugin
- `tsconfig.json` / `tsconfig.app.json` — strict mode
- `index.html` — meta-теги PWA
- `public/` — placeholder-иконки (pwa-192, pwa-512, maskable, apple-touch, favicon.svg)

### 1.2 Стили и темы

Файлы:
- `src/styles/variables.css` — CSS custom properties (цвета, отступы, типографика, тени)
- `src/styles/global.css` — reset + базовые стили

### 1.3 i18n (только RU)

Файлы:
- `src/locales/ru.json` — все ключи UI на русском
- `src/i18n.ts` — инициализация i18next (fallback 'ru', без EN-файла пока)

### 1.4 База данных

Файлы:
- `src/db/schema.ts` — интерфейсы Deck, Word, CardState, Session, Settings
- `src/db/index.ts` — класс LingvagoDatabase (Dexie), синглтон `db`
- `src/db/fsrs-helpers.ts` — toFSRSCard, fromFSRSCard, createNewCardState
- `src/db/hooks.ts` — creating hook (Word → 2 CardState), deleting hook (каскады)
- `src/db/seed.ts` — колода "Starter" + ~25 слов с RU-переводами

### 1.5 Режимы обучения — типы и реестр

Файлы:
- `src/modes/types.ts` — LearningMode, SessionItem, Answer, ModeStats
- `src/modes/registry.ts` — registerMode, getMode, getAllModes

### 1.6 VocabularyMode

Файлы:
- `src/modes/vocabulary/VocabularyMode.ts` — getSessionItems (FSRS + active decks), submitAnswer, getStats, getDueCount
- `src/modes/vocabulary/components/MultipleChoice.tsx` + `.module.css` — 2x2 grid, обратная связь, таймер
- `src/modes/vocabulary/components/FlipCard.tsx` + `.module.css` — 3D flip, кнопки Again/Hard/Good/Easy

### 1.7 Хуки

Файлы:
- `src/hooks/useSession.ts` — жизненный цикл сессии (loading → in-progress → finished)
- `src/hooks/useTheme.ts` — тема (localStorage + data-theme)

### 1.8 Layout и навигация

Файлы:
- `src/components/Layout/Layout.tsx` + `.module.css` — Outlet + NavBar
- `src/components/NavBar/NavBar.tsx` + `.module.css` — 4 вкладки, NavLink, скрытие на Study. Вкладки Decks/Stats/Settings ведут на placeholder-компоненты до фаз 2-3

### 1.9 Экраны

Файлы:
- `src/screens/Dashboard/Dashboard.tsx` + `.module.css` — сводка + плитки режимов + кнопки "Учить"
- `src/screens/Study/Study.tsx` + `.module.css` — оркестратор (useSession + рендер упражнения по exerciseType)
- `src/screens/Study/SessionSummary.tsx` + `.module.css` — итоги (correct/total, время, кнопки)

### 1.10 Роутинг и точка входа

Файлы:
- `src/App.tsx` — Routes: `/`, `/study/:modeId`, `/decks`, `/decks/:deckId`, `/stats`, `/settings` + fallback. Роуты `/decks/*`, `/stats`, `/settings` рендерят placeholder-компоненты ("Coming soon") до фаз 2-3
- `src/main.tsx` — i18next init → Dexie hooks → registerMode → seed → render

### Готовность фазы 1

- [ ] `npm run dev` запускается без ошибок
- [ ] Dashboard показывает плитку VocabularyMode с количеством due-карточек
- [ ] Кнопка "Учить" → Study экран с multiple choice
- [ ] Ответ обновляет FSRS-состояние в IndexedDB
- [ ] Session summary показывает результат
- [ ] Приложение устанавливается на телефон (PWA)
- [ ] Работает офлайн после первой загрузки
- [ ] `npx tsc --noEmit` — нет ошибок

---

## Фаза 2 — Управление контентом

> Цель: пользователь может создавать колоды, добавлять/удалять слова, включать/выключать колоды.

### 2.1 Экран колод (Decks)

Файлы:
- `src/screens/Decks/Decks.tsx` + `.module.css` — список колод, checkbox isActive, CRUD

### 2.2 Экран слов в колоде (DeckWords)

Файлы:
- `src/screens/DeckWords/DeckWords.tsx` + `.module.css` — список слов, поиск
- `src/screens/DeckWords/WordForm.tsx` + `.module.css` — inline-форма добавления/редактирования

### 2.3 Settings + EN-локализация

Файлы:
- `src/screens/Settings/Settings.tsx` + `.module.css` — uiLanguage, тема, sessionSize, сброс
- `src/locales/en.json` — все ключи на английском (необходим для работы dropdown uiLanguage)

### Готовность фазы 2

- [ ] Можно создать новую колоду, добавить в неё слова
- [ ] Деактивация колоды исключает её карточки из сессий
- [ ] Удаление колоды каскадно удаляет слова и CardState
- [ ] Переключение темы работает мгновенно
- [ ] Переключение языка UI (RU/EN) работает мгновенно
- [ ] Изменение sessionSize влияет на следующую сессию

---

## Фаза 3 — Polish

> Цель: статистика, дополнительный режим, импорт.

### 3.1 Stats экран

Файлы:
- `src/screens/Stats/Stats.tsx` + `.module.css` — сводка слов, бары по FSRS-состояниям, retention, история сессий
- `src/hooks/useStats.ts` — агрегация данных

### 3.2 CSV-импорт

Файлы:
- `src/screens/DeckWords/CsvImport.tsx` + `.module.css` — парсинг, превью, bulk import

### 3.3 NumbersMode (опционально)

Файлы:
- `src/modes/numbers/NumbersMode.ts` — генерация упражнений
- `src/modes/numbers/data.ts` — таблица числительных PT
- `src/modes/numbers/components/NumberInput.tsx` + `.module.css`

### Готовность фазы 3

- [ ] Stats показывает прогресс и историю сессий
- [ ] CSV-импорт добавляет слова в колоду
- [ ] (опционально) NumbersMode работает на Study экране

---

## Что НЕ входит в MVP

- studyLanguage переключение (future)
- JSON export/import (future)
- Полная многоязыковая поддержка учебного контента (future)

---

## Зависимости

```
1.1 Scaffolding
 └─▶ 1.2 Стили
 └─▶ 1.3 i18n
 └─▶ 1.4 База данных
      └─▶ 1.5 Типы + реестр
           └─▶ 1.6 VocabularyMode
      └─▶ 1.7 Хуки
 └─▶ 1.8 Layout
      └─▶ 1.9 Экраны (Dashboard, Study)
           └─▶ 1.10 Роутинг + main.tsx

2.1 Decks ──▶ зависит от 1.4 (db), 1.8 (Layout)
2.2 DeckWords ──▶ зависит от 2.1
2.3 Settings + en.json ──▶ зависит от 1.7 (useTheme), 1.3 (i18n)

3.1 Stats ──▶ зависит от 1.4 (db), 1.6 (VocabularyMode)
3.2 CSV ──▶ зависит от 2.2 (DeckWords)
3.3 Numbers ──▶ зависит от 1.5 (реестр), 1.9 (Study)
```
