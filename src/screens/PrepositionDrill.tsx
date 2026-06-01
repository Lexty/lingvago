import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import GrammarDrill, {
  type GrammarDrillEntry,
} from '../components/GrammarDrill.tsx';
import {
  generateSession,
  loadPrepositionsFromDb,
  PREP_LEVELS,
  recordPrepositionAttempt,
  referenceIdFor,
  type PrepLevel,
  type PrepositionItem,
} from '../modes/preposition/index.ts';
import styles from '../styles/grammarDrillScreen.module.css';

/** Items generated per §4.8 level (the session walks L1→L2→L3, then re-rolls). */
const PER_LEVEL = 4;

/** A fresh, unique-enough seed for a NEW interactive session. */
function freshSeed(): string {
  return `p-${Date.now().toString(36)}-${Math.floor(
    // Non-deterministic ONLY for picking a brand-new interactive seed; the
    // generation PATH from a seed stays fully deterministic (SPEC §6.1). The
    // deterministic e2e/tests pass an explicit `seed` and never hit this.
    Math.random() * 1e6,
  ).toString(36)}`;
}

/**
 * Build the deterministic L1→L2→L3 session for `seed`: `PER_LEVEL` items at each
 * §4.8 level, concatenated in level order so a single playthrough exercises the
 * whole curve. Pure for a given `seed` + `records`.
 */
export function buildPrepositionEntries(
  seed: string,
  records: Parameters<typeof generateSession>[1],
): GrammarDrillEntry<PrepositionItem>[] {
  const entries: GrammarDrillEntry<PrepositionItem>[] = [];
  for (const level of PREP_LEVELS) {
    const items = generateSession(`${seed}-${level}`, records, {
      count: PER_LEVEL,
      level: level as PrepLevel,
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

export interface PrepositionDrillProps {
  /**
   * Fixed seed for a deterministic session (tests / e2e). When omitted, a fresh
   * seed is generated so each real visit is a new sequence.
   */
  seed?: string;
}

/**
 * PrepositionDrill — production-first preposition cloze drill (SPEC §1.2, WP-C,
 * route `/drill/preposition`). Renders the seeded session over the
 * verified-eligible `prepositions` only (AC3 blank-rule gate): typed PRODUCTION
 * input by default, parity MC (neighbouring contractions) where the generator
 * assembled one. Correct/wrong + reference-answer reveal, an L1–L3 indicator, and
 * a feedback→reference deep-link by category (tempo→ref-prep-tempo,
 * lugar→ref-prep-lugar, movimento→ref-prep-a-para). Each attempt is logged to
 * `attempts` and folded into `skillMastery` (§7.2). NOT gamified.
 */
export default function PrepositionDrill({ seed }: PrepositionDrillProps) {
  const { t } = useTranslation();

  // The preposition inventory comes from the read-only content store.
  // `useLiveQuery` re-resolves once content has loaded, so a pre-load render
  // shows the graceful empty state instead of crashing.
  const records = useLiveQuery(() => loadPrepositionsFromDb(), []);

  const [sessionId, setSessionId] = useState<string>(() => seed ?? freshSeed());
  const entries = useMemo<GrammarDrillEntry<PrepositionItem>[]>(
    () => (records ? buildPrepositionEntries(sessionId, records) : []),
    [sessionId, records],
  );

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('preposition.title')}</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            {t('preposition.nav.home')}
          </Link>
        </nav>
      </header>

      <p className={styles.intro}>{t('preposition.intro')}</p>

      <GrammarDrill<PrepositionItem>
        i18nKey="preposition"
        testIdBase="preposition-drill"
        styles={styles}
        entries={entries}
        onExhausted={() => {
          setSessionId(seed ?? freshSeed());
        }}
        onRecord={({ entry, userAnswer, correct, channel, responseMs }) =>
          recordPrepositionAttempt({
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
