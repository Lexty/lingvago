# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lingvago — offline-first PWA for learning European Portuguese (A2 level). Single-user app, all data in IndexedDB, no backend. Full spec in `docs/`.

## Commands

All commands are defined in `package.json` scripts. Always use `pnpm <script>` — never run raw `tsc`, `vitest`, `eslint`, etc. directly.

```bash
pnpm dev          # Dev server
pnpm build        # Type check (tsc -b) + production build
pnpm preview      # Preview production build
pnpm typecheck    # Type check only (tsc -b --noEmit)
pnpm lint         # ESLint
pnpm test         # Tests (watch mode)
pnpm test:run     # Tests (single run)
pnpm check        # Full CI check: typecheck + lint + test + build
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

Current modes: `vocabulary` (FSRS flashcards), `numbers` (generative number exercises), `grammar` (conjugation, gender, articles, plural, prepositions).

### Exercise vs. Learning Program Separation

Exercise components (`src/components/exercises/`) are reusable UI mechanics (multiple-choice, text-input, flip-card) — they handle rendering, user interaction, and visual feedback. They know nothing about FSRS, card states, or learning progression.

Learning programs (mode classes in `src/modes/`) own the business logic: which exercise type to assign, how to grade answers, when to promote a card. They select and configure exercise components via `SessionItem.exerciseType`, but never contain UI code themselves.

Keep this boundary strict: exercise components receive data and return answers; learning modes decide what data to show and what to do with answers. Shared comparison logic lives in `src/components/exercises/compareUtils.ts`; mode-specific wrappers (e.g. `VocabularyInput`, `GrammarInput`) bridge between the generic exercise and mode-specific grading policy.

### FSRS Integration

CardState stores FSRS fields as numeric timestamps in IndexedDB. `src/db/fsrs-helpers.ts` converts between stored `CardState` (timestamps) and ts-fsrs `Card` (Date objects). FSRS instance is a module-level singleton in VocabularyMode.

### Decks

Deck is the primary word organization unit (like Anki decks). `Word.deckId` FK → `Deck.id` (one deck per word). `Deck.isActive` controls whether cards from this deck appear in study sessions. VocabularyMode filters by active decks only.

### Dexie Hooks

`src/db/hooks.ts` — deleting hooks only (cascade removal). Deleting a Deck cascades to all its Words → CardStates. **No creating hook** — CardState records are created explicitly alongside Word insertion (via `addWordWithCards` helper or inside a transaction). Dexie async hooks are unreliable for guaranteeing related record creation.

### i18n

Two independent layers:
- **UI i18n**: `i18next` + `react-i18next`. Locale files in `src/locales/ru.json`, `src/locales/en.json`. Init in `src/i18n.ts`. Use `const { t } = useTranslation()` → `t('key')` in components.
- **Study language**: `Settings.studyLanguage` controls which `Word.translations` key is used for flashcard content. `Word.translations` is `Record<string, string>` — extensible for future languages.

UI language and study language are **independent** settings.

### Reactive Queries

`useLiveQuery` from dexie-react-hooks returns `undefined` during initial load — always handle this in components.

## Problem-Solving Principles

- **Fix the root cause, not the symptom.** When a bug appears, don't patch around it — find and eliminate the architectural reason it was possible in the first place. Prefer redesigning the problematic part over adding workarounds.
- **Pre-1.0: breaking changes are free.** While version is below 1.0.0, there is no backward compatibility constraint. Change schemas, APIs, data formats freely if it leads to a better design.
- **If a mechanism is unreliable, don't use it.** Don't rely on async hooks, fire-and-forget callbacks, or implicit side effects for critical data integrity. Make important operations explicit and transactional.
- **Defect found manually → consider adding an autotest.** When a bug is caught during manual testing (by a human or an agent), evaluate whether an automated test would prevent regression. Add one if the defect is non-trivial and testable. Don't add tests for things that are obvious or where the cost of the test outweighs the risk.

## Key Conventions

- All UI strings via `t('key')` from `useTranslation()` — never hardcode Russian or English text in components
- TypeScript strict — no `any`
- CSS Modules co-located: `Component.module.css` next to `Component.tsx`
- All colors/spacing/typography via CSS custom properties from `src/styles/variables.css`
- Dark/light theme via `data-theme` attribute on `<html>`
- Mobile-first: base styles for phones, `@media (min-width: 768px)` for tablet/desktop
- Routes: `/`, `/study/:modeId`, `/decks`, `/decks/:deckId`, `/stats`, `/settings`
