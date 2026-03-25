# Lingvago

Offline-first PWA for learning European Portuguese. All data stays on your device in IndexedDB — no backend, no account needed.

## Features

- **Vocabulary** — spaced repetition (FSRS) flashcards with learning ladder: multiple-choice → text input → flip card
- **Grammar** — conjugation, gender, articles, plurals, prepositions, word order exercises
- **Numbers** — practice Portuguese numerals (0–1,000,000)
- **Decks** — organize vocabulary into decks, import from CSV
- **Offline** — works without internet after first load (PWA with Service Worker)
- **Dark/light theme**, Russian/English UI

## Tech stack

React 19, TypeScript, Vite, CSS Modules, Dexie.js (IndexedDB), ts-fsrs, i18next, vite-plugin-pwa

## Getting started

```bash
pnpm install
pnpm dev        # dev server at localhost:5173
```

## Scripts

```bash
pnpm dev        # development server
pnpm build      # typecheck + production build
pnpm preview    # preview production build
pnpm typecheck  # type check only
pnpm lint       # ESLint
pnpm test       # tests (watch mode)
pnpm test:run   # tests (single run)
pnpm check      # full CI: typecheck + lint + test + build
```

## License

MIT
