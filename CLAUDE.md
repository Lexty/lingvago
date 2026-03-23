# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lingvago — offline-first PWA for learning European Portuguese (A2 level). Single-user app, all data in IndexedDB, no backend. Full spec in `docs/`.

## Commands

```bash
# Dev server
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit
```

## Stack

- React 19, Vite, TypeScript (strict)
- i18next + react-i18next — UI localization
- Dexie.js v4 + dexie-react-hooks (`useLiveQuery`)
- ts-fsrs v5 — FSRS spaced repetition
- react-router v7 — **import from `"react-router"`, NOT `"react-router-dom"`**
- vite-plugin-pwa v1 — Service Worker + manifest (Workbox built-in)
- CSS Modules — no UI libraries

## Architecture

### Data Flow

```
Dexie (IndexedDB) → LearningMode (business logic) → useSession (hook) → Screen (UI)
Settings.uiLanguage → i18next → useTranslation() → t('key') → Screen (UI strings)
Settings.studyLanguage → LearningMode → Word.translations[lang] → SessionItem (content)
```

### LearningMode Pattern

Pluggable learning modes in `src/modes/`. Each implements `LearningMode` interface (`src/modes/types.ts`) and is registered in `src/modes/registry.ts` via `registerMode()` at startup in `main.tsx`.

Adding a new mode: create class in `src/modes/<name>/`, add components in `components/`, register in `main.tsx`. No existing code changes needed.

Current modes: `vocabulary` (FSRS flashcards), `numbers` (generative number exercises).

### FSRS Integration

CardState stores FSRS fields as numeric timestamps in IndexedDB. `src/db/fsrs-helpers.ts` converts between stored `CardState` (timestamps) and ts-fsrs `Card` (Date objects). FSRS instance is a module-level singleton in VocabularyMode.

### Decks

Deck is the primary word organization unit (like Anki decks). `Word.deckId` FK → `Deck.id` (one deck per word). `Deck.isActive` controls whether cards from this deck appear in study sessions. VocabularyMode filters by active decks only.

### Dexie Hooks

`src/db/hooks.ts` — creating hook auto-generates two CardState records per Word (directions based on `studyLanguage`); deleting hook cascades removal. Deleting a Deck cascades to all its Words → CardStates.

### i18n

Two independent layers:
- **UI i18n**: `i18next` + `react-i18next`. Locale files in `src/locales/ru.json`, `src/locales/en.json`. Init in `src/i18n.ts`. Use `const { t } = useTranslation()` → `t('key')` in components.
- **Study language**: `Settings.studyLanguage` controls which `Word.translations` key is used for flashcard content. `Word.translations` is `Record<string, string>` — extensible for future languages.

UI language and study language are **independent** settings.

### Reactive Queries

`useLiveQuery` from dexie-react-hooks returns `undefined` during initial load — always handle this in components.

## Key Conventions

- All UI strings via `t('key')` from `useTranslation()` — never hardcode Russian or English text in components
- TypeScript strict — no `any`
- CSS Modules co-located: `Component.module.css` next to `Component.tsx`
- All colors/spacing/typography via CSS custom properties from `src/styles/variables.css`
- Dark/light theme via `data-theme` attribute on `<html>`
- Mobile-first: base styles for phones, `@media (min-width: 768px)` for tablet/desktop
- Routes: `/`, `/study/:modeId`, `/decks`, `/decks/:deckId`, `/stats`, `/settings`
