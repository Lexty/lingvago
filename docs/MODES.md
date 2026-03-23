# Режимы обучения

## Общая концепция

Каждый режим — независимый модуль, реализующий интерфейс `LearningMode`. Режимы не знают друг о друге и не зависят от конкретных экранов. Study-экран универсален и работает с любым режимом через общий интерфейс.

---

## VocabularyMode — Словарь (FSRS)

**ID:** `vocabulary`
**Иконка:** книги

Основной режим. Использует алгоритм FSRS для интервального повторения лексики.

### Получение карточек для сессии

`getSessionItems(count)` выполняет следующую логику:

1. Прочитать `studyLanguage` из `Settings`
2. **Получить активные колоды**: `db.decks.where('isActive').equals(1)` → `activeDeckIds`
3. Выбрать карточки, у которых `due <= Date.now()` И `direction` соответствует текущему `studyLanguage`
4. **Фильтровать по колодам**: для каждой CardState загрузить Word, оставить только `word.deckId in activeDeckIds`
5. Отсортировать по `due` (самые просроченные первыми), взять не более `count`
6. Если набрали меньше `count` — дополнить новыми карточками (`state = New`) из активных колод, для текущего `studyLanguage`, исключая слова без `translations[studyLanguage]`
7. Для каждой карточки использовать `word.translations[studyLanguage]` для формирования question/correctAnswer
8. Определить тип упражнения (см. ниже)
9. Для multiple-choice — сгенерировать варианты ответов из `translations[studyLanguage]` других слов **активных колод**

### Типы упражнений

Тип определяется автоматически на основе FSRS-состояния карточки:

| Состояние | Стабильность | Тип упражнения |
|-----------|-------------|----------------|
| New, Learning, Relearning | любая | Multiple Choice |
| Review | < 10 дней | Multiple Choice |
| Review | >= 10 дней | Flip Card (самооценка) |

**Логика**: Новые и непрочные карточки тестируются через выбор из вариантов (объективная проверка). Хорошо заученные карточки — через самооценку (быстрее, доверяем пользователю).

### Multiple Choice

- Показывается слово (вопрос) — на португальском или на `studyLanguage` в зависимости от `direction`
- 4 варианта ответа: 1 правильный + 3 дистрактора
- Направления чередуются: `pt→${studyLang}` и `${studyLang}→pt`

**Генерация дистракторов:**
1. Взять `translations[studyLanguage]` слов из той же колоды (`deckId`), исключая текущее. Слова без перевода на `studyLanguage` пропускаются
2. Если в теме меньше 3 слов — дополнить из других тем
3. Перемешать все 4 варианта случайным образом

**Маппинг ответа на FSRS-рейтинг:**

| Результат | Время ответа | Рейтинг |
|-----------|-------------|---------|
| Неправильно | — | Again (1) |
| Правильно | < 3 сек | Easy (4) |
| Правильно | 3-8 сек | Good (3) |
| Правильно | > 8 сек | Hard (2) |

### Flip Card (самооценка)

- Лицевая сторона: слово-вопрос
- Пользователь мысленно вспоминает перевод, нажимает "Показать ответ"
- Обратная сторона: правильный перевод + 4 кнопки оценки
- Кнопки FSRS: **Again** / **Hard** / **Good** / **Easy**
- Пользователь сам оценивает качество вспоминания

**Correctness для session summary:** Good и Easy (рейтинг >= 3) считаются "правильным" ответом. Again и Hard — "неправильным". Это отражает: Again = забыл, Hard = с большим трудом (фактически полузабыл).

Анимация переворота — CSS 3D transform (`rotateY(180deg)`).

### Обработка ответа (submitAnswer)

```
1. Извлечь cardStateId из item.payload
2. Загрузить CardState из DB
3. Конвертировать в FSRS Card (toFSRSCard)
4. Определить Rating (из answer или по правилам маппинга)
5. Вызвать fsrs.next(card, new Date(), rating)
6. Конвертировать результат обратно (fromFSRSCard)
7. Обновить CardState в DB
```

### Статистика (getStats)

- `totalItems` — количество слов в активных колодах
- `dueNow` — карточки с `due <= now` из активных колод
- `averageRetention` — **эвристика**, не точная метрика FSRS. Для карточек в состоянии Review: `1 - (lapses / reps)`. Карточки с `reps = 0` исключаются из расчёта. Если нет карточек для расчёта — возвращает 0. Это грубое приближение: показывает долю повторений без забывания
- `totalReviews` — сумма `reps` по всем карточкам

---

## NumbersMode — Числа

**ID:** `numbers`
**Иконка:** числа

Простой генеративный режим для тренировки числительных. **Не использует FSRS** — каждый раз генерирует случайные упражнения.

### Таблица числительных

Хранится в `src/modes/numbers/data.ts` как статический маппинг:

```
0 → zero          20 → vinte
1 → um/uma        21 → vinte e um
2 → dois/duas     30 → trinta
3 → três          40 → quarenta
...               50 → cinquenta
10 → dez          60 → sessenta
11 → onze         70 → setenta
12 → doze         80 → oitenta
13 → treze        90 → noventa
14 → catorze      100 → cem/cento
15 → quinze       200 → duzentos
16 → dezasseis    500 → quinhentos
17 → dezassete    1000 → mil
18 → dezoito
19 → dezanove
```

Числа > 20 составляются по правилам: `vinte e três` (23), `cento e quarenta e cinco` (145).

### Получение элементов (getSessionItems)

1. Генерировать `count` случайных чисел в диапазоне 1-100 (расширяемо)
2. Для каждого числа определить упражнение:
   - 50% шанс: показать цифру → ввести словами (PT)
   - 50% шанс: показать словами (PT) → ввести цифру

### Компонент: NumberInput

- Текстовое поле ввода с автофокусом
- Крупный вопрос по центру (число или текст)
- Кнопка "Проверить"
- Обратная связь: правильно (зелёный) / неправильно (красный + правильный ответ)
- Кнопка "Далее"

### Обработка ответа (submitAnswer)

Простое сравнение строк (регистронезависимо, с trim). Никакого FSRS — ответ просто записывается в сессию.

### Статистика

- `totalItems` — всегда 100 (диапазон доступных чисел)
- `dueNow` — всегда равен sessionSize (всегда доступен для практики)
- `averageRetention` и `totalReviews` — из таблицы `sessions` по `modeId = 'numbers'`

---

## Расширяемость: добавление нового режима

### Шаг 1: Создать модуль

```
src/modes/conjugation/
├── ConjugationMode.ts    # implements LearningMode
└── components/
    ├── VerbForm.tsx
    └── VerbForm.module.css
```

### Шаг 2: Реализовать интерфейс

```ts
export class ConjugationMode implements LearningMode {
  readonly id = 'conjugation'
  readonly title = 'Спряжение глаголов'  // fallback, основное через t('mode.conjugation.title')
  readonly description = '...'
  readonly icon = '...'

  async getSessionItems(count: number): Promise<SessionItem[]> { ... }
  async submitAnswer(item: SessionItem, answer: Answer): Promise<void> { ... }
  async getStats(): Promise<ModeStats> { ... }
  async getDueCount(): Promise<number> { ... }
}
```

### Шаг 3: Зарегистрировать в main.tsx

```ts
import { ConjugationMode } from './modes/conjugation/ConjugationMode'
registerMode(new ConjugationMode())
```

Всё. Dashboard покажет новую плитку. Study-экран будет работать с новым режимом.

При добавлении нового режима также нужно добавить ключи перевода (`mode.<id>.title`, `mode.<id>.desc`) в файлы `src/locales/ru.json` и `src/locales/en.json`.

Если режим использует новый `exerciseType` — нужно добавить рендеринг соответствующего компонента в Study-экран (единственное место, где потребуется изменение существующего кода).
