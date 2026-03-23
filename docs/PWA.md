# PWA-конфигурация

## Цель

Приложение должно:
1. Работать полностью офлайн после первой загрузки
2. Устанавливаться на телефон как "приложение" (Add to Home Screen)
3. Автоматически обновляться при наличии интернета

## vite-plugin-pwa

Весь PWA-функционал обеспечивается через `vite-plugin-pwa` v1.x. Плагин генерирует Service Worker (через Workbox) и файл манифеста автоматически при сборке.

### Конфигурация (vite.config.ts)

```ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
  manifest: { ... },
  workbox: { ... },
})
```

### registerType: 'autoUpdate'

Service Worker обновляется автоматически в фоне. Пользователь не видит prompt — при следующем визите приложение уже обновлено. Это подходит для single-user приложения без критичных breaking changes.

## Web App Manifest

```json
{
  "name": "Lingvago - Portuguese Learning",
  "short_name": "Lingvago",
  "description": "Learn Portuguese with spaced repetition",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "maskable-icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Поля манифеста

| Поле | Значение | Зачем |
|------|----------|-------|
| `name` | Lingvago - Portuguese Learning | Полное имя при установке |
| `short_name` | Lingvago | Имя на домашнем экране |
| `display` | standalone | Без browser chrome (как нативное приложение) |
| `scope` | / | Весь сайт — часть приложения |
| `start_url` | / | Dashboard при запуске |
| `theme_color` | #1a1a2e | Цвет статус-бара (тёмная тема по умолчанию) |
| `background_color` | #1a1a2e | Фон splash screen при запуске |

### Иконки

| Файл | Размер | Назначение |
|------|--------|------------|
| `pwa-192x192.png` | 192x192 | Стандартная иконка приложения |
| `pwa-512x512.png` | 512x512 | Крупная иконка + splash screen |
| `maskable-icon-512x512.png` | 512x512 | Адаптивная иконка (Android, safe zone) |
| `apple-touch-icon-180x180.png` | 180x180 | iOS Add to Home Screen |
| `favicon.svg` | vector | Иконка в браузере (SVG для чёткости на любом DPI) |

Начальные иконки — placeholder. Заменить на финальные позднее.

## Workbox — стратегия кэширования

### Precaching (основная стратегия)

```ts
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
}
```

Все статические ресурсы (JS-бандлы, CSS, HTML, иконки, шрифты) кэшируются при установке Service Worker. Это гарантирует полную офлайн-работоспособность.

### Runtime caching (опционально)

Если будут подгружаться внешние шрифты (Google Fonts):

```ts
runtimeCaching: [
  {
    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-cache',
      expiration: {
        maxEntries: 10,
        maxAgeSeconds: 365 * 24 * 60 * 60,  // 1 год
      },
    },
  },
]
```

**На старте внешних шрифтов нет** — используется системный шрифт (`-apple-system, BlinkMacSystemFont, ...`). Runtime caching добавляется на случай будущих изменений.

## index.html — meta-теги

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Learn Portuguese with spaced repetition" />
<meta name="theme-color" content="#1a1a2e" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

## Офлайн-поведение

### Что работает офлайн

- Все экраны приложения (Dashboard, Study, Vocabulary, Stats, Settings)
- Все учебные сессии (данные в IndexedDB, логика в JS)
- FSRS-вычисления (чистый JS, без API-вызовов)
- Добавление/редактирование/удаление слов
- Импорт/экспорт данных

### Что НЕ работает офлайн

На данный момент приложение полностью автономно. Нет сетевых зависимостей.

### Сценарий первого запуска

1. Пользователь открывает URL
2. Service Worker устанавливается и кэширует все ресурсы
3. Seed-данные загружаются в IndexedDB
4. Приложение готово к работе офлайн

### Сценарий обновления

1. При наличии интернета SW проверяет обновления в фоне
2. Если есть новая версия — загружает и активирует (`autoUpdate`)
3. При следующей загрузке страницы — используется новая версия
