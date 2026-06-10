import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import GrammarDrill, {
  type GrammarDrillEntry,
} from '../components/GrammarDrill.tsx';
import {
  generateSession,
  INT_LEVELS,
  type GlossLang,
  type IntLevel,
  type InterrogativeItem,
} from '../modes/interrogative/index.ts';
import {
  loadInterrogativesFromDb,
  recordInterrogativeAttempt,
  referenceIdFor,
} from '../modes/interrogative/progress.ts';
import styles from '../styles/grammarDrillScreen.module.css';

/** Items generated per §4.8 level (the session walks L1→L2→L3, then re-rolls). */
const PER_LEVEL = 4;

/** A fresh, unique-enough seed for a NEW interactive session. */
function freshSeed(): string {
  return `i-${Date.now().toString(36)}-${Math.floor(
    // Non-deterministic ONLY for picking a brand-new interactive seed; the
    // generation PATH from a seed stays fully deterministic (SPEC §6.1). The
    // deterministic e2e/tests pass an explicit `seed` and never hit this.
    Math.random() * 1e6,
  ).toString(36)}`;
}

/**
 * Map the active UI language (`i18n.language`, a BCP-47 tag like `ru-RU`) to the
 * gloss language the generator understands: `ru` only for a `ru…` tag, else `en`
 * (the §10.4 fallback). The pure mode never imports i18n, so the SCREEN resolves
 * this and passes it as an explicit `glossLang` input — keeping generation
 * deterministic for a given (seed, glossLang).
 */
export function glossLangFor(language: string | undefined): GlossLang {
  return typeof language === 'string' && language.toLowerCase().startsWith('ru')
    ? 'ru'
    : 'en';
}

/**
 * Build the deterministic L1→L2→L3 session for `seed`: `PER_LEVEL` items at each
 * §4.8 level, concatenated in level order so a single playthrough exercises the
 * whole curve. Pure for a given `seed` + `records` + `glossLang`.
 */
export function buildInterrogativeEntries(
  seed: string,
  records: Parameters<typeof generateSession>[1],
  glossLang: GlossLang,
): GrammarDrillEntry<InterrogativeItem>[] {
  const entries: GrammarDrillEntry<InterrogativeItem>[] = [];
  for (const level of INT_LEVELS) {
    const items = generateSession(`${seed}-${level}`, records, {
      count: PER_LEVEL,
      level: level as IntLevel,
      glossLang,
    });
    for (const item of items) {
      entries.push({
        item,
        drill: item.drill,
        level: item.level,
        referenceId: referenceIdFor(item),
      });
    }
  }
  return entries;
}

export interface InterrogativeDrillProps {
  /**
   * Fixed seed for a deterministic session (tests / e2e). When omitted, a fresh
   * seed is generated so each real visit is a new sequence.
   */
  seed?: string;
}

/**
 * InterrogativeDrill — production-first interrogative cue-cloze drill (SPEC §1.2,
 * route `/drill/interrogative`). Renders the seeded session over the
 * verified-eligible `interrogatives` only (AC5 verified-key gate): each prompt is
 * prefixed with a language-aware MEANING cue (the gloss) that makes the bare
 * cloze well-determined. Typed PRODUCTION input by default, parity MC (the
 * equal-length wh meaning-confusion set, or the quanto-family gender contrast)
 * where the generator assembled one. Correct/wrong + reference-answer reveal, an
 * L1–L3 indicator, and a feedback→`ref-interrogative` deep-link (the 17-row table
 * + 6 rules). The active UI language (`i18n.language` → `'ru'|'en'`) is passed as
 * `glossLang`. Each attempt is logged to `attempts` and folded into
 * `skillMastery` (§7.2). NOT gamified.
 */
export default function InterrogativeDrill({ seed }: InterrogativeDrillProps) {
  const { t, i18n } = useTranslation();
  const glossLang = glossLangFor(i18n.language);

  // The interrogative inventory comes from the read-only content store.
  // `useLiveQuery` re-resolves once content has loaded, so a pre-load render
  // shows the graceful empty state instead of crashing.
  const records = useLiveQuery(() => loadInterrogativesFromDb(), []);

  const [sessionId, setSessionId] = useState<string>(() => seed ?? freshSeed());
  const entries = useMemo<GrammarDrillEntry<InterrogativeItem>[]>(
    () => (records ? buildInterrogativeEntries(sessionId, records, glossLang) : []),
    [sessionId, records, glossLang],
  );

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('interrogative.title')}</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            {t('interrogative.nav.home')}
          </Link>
        </nav>
      </header>

      <p className={styles.intro}>{t('interrogative.intro')}</p>

      <GrammarDrill<InterrogativeItem>
        i18nKey="interrogative"
        testIdBase="interrogative-drill"
        styles={styles}
        entries={entries}
        onExhausted={() => {
          setSessionId(seed ?? freshSeed());
        }}
        onRecord={({ entry, userAnswer, correct, channel, responseMs }) =>
          recordInterrogativeAttempt({
            sessionId,
            item: entry.item,
            userAnswer,
            correct,
            channel,
            responseMs,
          })
        }
      />
    </main>
  );
}
