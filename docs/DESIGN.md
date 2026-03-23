# Дизайн-система

## Принципы

- **Минимализм** — без геймификации, анимаций ради анимаций, декоративных элементов
- **Mobile-first** — базовые стили для экрана 320-480px, адаптация к десктопу через media queries
- **Системность** — все значения через CSS custom properties (токены), никаких magic numbers
- **Нативность** — ощущение нативного приложения: системный шрифт, плавные transitions, touch-friendly targets

## CSS Custom Properties (токены)

Все дизайн-токены определяются в `src/styles/variables.css` на `:root` и переопределяются для тёмной темы на `[data-theme="dark"]`.

### Цвета — светлая тема (default)

| Токен | Значение | Назначение |
|-------|----------|------------|
| `--color-bg-primary` | `#ffffff` | Основной фон |
| `--color-bg-secondary` | `#f5f5f7` | Фон карточек, секций |
| `--color-bg-card` | `#ffffff` | Фон интерактивных карточек |
| `--color-text-primary` | `#1d1d1f` | Основной текст |
| `--color-text-secondary` | `#6e6e73` | Вторичный текст, подписи |
| `--color-accent` | `#0071e3` | Акцентный цвет (кнопки, ссылки) |
| `--color-accent-hover` | `#0077ed` | Hover-состояние акцента |
| `--color-success` | `#34c759` | Правильный ответ |
| `--color-error` | `#ff3b30` | Неправильный ответ, ошибки |
| `--color-warning` | `#ff9500` | Предупреждения |
| `--color-border` | `#d2d2d7` | Границы, разделители |

### Цвета — тёмная тема

| Токен | Значение |
|-------|----------|
| `--color-bg-primary` | `#1a1a2e` |
| `--color-bg-secondary` | `#16213e` |
| `--color-bg-card` | `#0f3460` |
| `--color-text-primary` | `#e4e4e7` |
| `--color-text-secondary` | `#a1a1aa` |
| `--color-accent` | `#0a84ff` |
| `--color-accent-hover` | `#409cff` |
| `--color-success` | `#30d158` |
| `--color-error` | `#ff453a` |
| `--color-warning` | `#ffa00a` |
| `--color-border` | `#2c2c3e` |

### Отступы

| Токен | Значение | Использование |
|-------|----------|---------------|
| `--space-xs` | `4px` | Минимальный gap |
| `--space-sm` | `8px` | Внутренние padding мелких элементов |
| `--space-md` | `16px` | Стандартный padding/margin |
| `--space-lg` | `24px` | Разделение секций |
| `--space-xl` | `32px` | Крупные отступы |
| `--space-2xl` | `48px` | Отступы между блоками на экране |

### Типографика

| Токен | Значение | Использование |
|-------|----------|---------------|
| `--font-family` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | Весь текст |
| `--font-size-sm` | `0.875rem` (14px) | Подписи, мета-информация |
| `--font-size-base` | `1rem` (16px) | Основной текст |
| `--font-size-lg` | `1.25rem` (20px) | Подзаголовки |
| `--font-size-xl` | `1.5rem` (24px) | Заголовки экранов |
| `--font-size-2xl` | `2rem` (32px) | Крупные числа, вопрос в карточке |

### Скругления

| Токен | Значение | Использование |
|-------|----------|---------------|
| `--radius-sm` | `6px` | Кнопки, inputs |
| `--radius-md` | `10px` | Карточки, панели |
| `--radius-lg` | `16px` | Крупные карточки, модалки |

### Тени

| Токен | Значение (light) | Значение (dark) |
|-------|-------------------|------------------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | `0 1px 3px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.1)` | `0 4px 12px rgba(0,0,0,0.4)` |

## Переключение тем

### Механизм

1. Атрибут `data-theme` на `<html>`: `"light"` или `"dark"`
2. CSS переопределяет токены через `[data-theme="dark"] { ... }`
3. Хук `useTheme` управляет состоянием:
   - При инициализации: читает `localStorage`, fallback на `prefers-color-scheme`
   - При переключении: обновляет атрибут + `localStorage`
4. Переключение мгновенное — меняются только CSS custom properties, перерендер React не нужен

### Режимы

| Режим | Поведение |
|-------|-----------|
| Light | Всегда светлая тема |
| Dark | Всегда тёмная тема |
| System | Следует `prefers-color-scheme` из ОС |

## CSS Modules

### Соглашения

- Каждый компонент имеет файл `ComponentName.module.css` рядом с `.tsx`
- Классы именуются в camelCase: `.card`, `.cardTitle`, `.activeButton`
- Импорт: `import styles from './Component.module.css'`
- Использование: `className={styles.card}` или `className={`${styles.card} ${styles.active}`}`
- Глобальные стили только в `src/styles/` (reset, токены)

### Пример

```css
/* MultipleChoice.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
}

.question {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  text-align: center;
  color: var(--color-text-primary);
}

.optionsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.option {
  padding: var(--space-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  font-size: var(--font-size-base);
  text-align: center;
  transition: border-color 0.15s, background-color 0.15s;
}

.option:active {
  transform: scale(0.98);
}

.correct {
  border-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, var(--color-bg-card));
}

.wrong {
  border-color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, var(--color-bg-card));
}
```

## Mobile-first responsive

### Breakpoints

| Название | Ширина | Устройство |
|----------|--------|------------|
| Base | < 768px | Телефоны (основной) |
| Tablet | >= 768px | Планшеты |
| Desktop | >= 1024px | Десктоп |

### Подход

Базовые стили — для телефона (одна колонка, крупные touch targets). Расширение через `@media (min-width: ...)`:

```css
/* Mobile (base) */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

/* Tablet */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .grid {
    max-width: 800px;
    margin: 0 auto;
  }
}
```

### Touch targets

Все интерактивные элементы — минимум **44x44px** (Apple HIG рекомендация). Кнопки вариантов ответа — ещё крупнее для удобства.

## Компоненты — визуальные паттерны

### Кнопка (primary)

```
Background: var(--color-accent)
Color: white
Padding: var(--space-sm) var(--space-md)
Border-radius: var(--radius-sm)
Font-size: var(--font-size-base)
Font-weight: 600
Transition: background 0.15s
Hover: var(--color-accent-hover)
Active: scale(0.98)
```

### Карточка

```
Background: var(--color-bg-card)
Border: 1px solid var(--color-border)
Border-radius: var(--radius-md)
Padding: var(--space-md)
Box-shadow: var(--shadow-sm)
```

### Input / Select

```
Background: var(--color-bg-primary)
Border: 1px solid var(--color-border)
Border-radius: var(--radius-sm)
Padding: var(--space-sm) var(--space-md)
Font-size: var(--font-size-base)
Focus: border-color var(--color-accent), outline none
```

### Прогресс-бар

```
Container: height 6px, background var(--color-bg-secondary), border-radius 3px
Fill: background var(--color-accent), width (percentage), transition width 0.3s
```

### Обратная связь (ответ)

```
Правильно: border-color var(--color-success), background с примесью зелёного
Неправильно: border-color var(--color-error), background с примесью красного
Transition: 0.3s для плавного появления
```

## Анимации

Минимум анимаций, только функциональные:

| Анимация | Где | Длительность |
|----------|-----|-------------|
| Flip card | FlipCard компонент | 0.4s ease-in-out |
| Fade in/out | Переход между карточками в сессии | 0.2s |
| Scale on press | Кнопки при нажатии | 0.1s |
| Progress bar fill | Прогресс сессии | 0.3s |
| Color transition | Обратная связь (correct/wrong) | 0.15s |

Используется только CSS transitions/transforms. Никаких JS-анимаций или библиотек.

## Поддержка нескольких языков

### Текстовые длины

Русские и английские строки могут значительно отличаться по длине:
- Кнопки: использовать `min-width` вместо фиксированной ширины
- NavBar-подписи: максимум ~8 символов для стабильной 4-колоночной раскладки
- Заголовки: `text-overflow: ellipsis` как fallback, но ключи перевода должны быть лаконичными
- Карточки со словами: длинные переводы переносятся на новую строку

### Переключение языка

Смена `uiLanguage` не вызывает перезагрузку. i18next обновляет строки, React перерендеривает только компоненты с `useTranslation()`. CSS, анимации и layout не зависят от языка.

### Шрифт

Системный шрифт (`-apple-system, ...`) поддерживает и кириллицу, и латиницу. Дополнительные шрифты не нужны.

## Глобальный reset (global.css)

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-family: var(--font-family); font-size: 16px; -webkit-font-smoothing: antialiased; }
body { background: var(--color-bg-primary); color: var(--color-text-primary); min-height: 100dvh; }
button { cursor: pointer; border: none; background: none; font: inherit; color: inherit; }
input, select, textarea { font: inherit; color: inherit; }
```

`100dvh` вместо `100vh` — корректная высота на мобильных браузерах с динамическим toolbar.
