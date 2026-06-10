import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import GrammarDrill, {
  type GrammarDrillEntry,
} from '../components/GrammarDrill.tsx';
import {
  generateSession,
  POSS_LEVELS,
  type PossLevel,
  type PossessiveItem,
} from '../modes/possessive/index.ts';
import {
  loadPossessivesFromDb,
  recordPossessiveAttempt,
  referenceIdFor,
} from '../modes/possessive/progress.ts';
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
export function buildPossessiveEntries(
  seed: string,
  records: Parameters<typeof generateSession>[1],
): GrammarDrillEntry<PossessiveItem>[] {
  const entries: GrammarDrillEntry<PossessiveItem>[] = [];
  for (const level of POSS_LEVELS) {
    const items = generateSession(`${seed}-${level}`, records, {
      count: PER_LEVEL,
      level: level as PossLevel,
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

export interface PossessiveDrillProps {
  /**
   * Fixed seed for a deterministic session (tests / e2e). When omitted, a fresh
   * seed is generated so each real visit is a new sequence.
   */
  seed?: string;
}

/**
 * PossessiveDrill — production-first possessive cue-cloze drill (SPEC §1.2, WP-C,
 * route `/drill/possessive`). Renders the seeded session over the
 * verified-eligible `possessives` only (AC5 verified-key gate): each prompt is
 * prefixed with a Portuguese person/owner CUE that makes the agreeing form
 * well-determined. Typed PRODUCTION input by default, parity MC (same-gender/
 * number person variants, or the dele↔dela owner contrast) where the generator
 * assembled one. Correct/wrong + reference-answer reveal, an L1–L3 indicator, and
 * a feedback→`ref-possessive` deep-link (the paradigm + 3 rules). Each attempt is
 * logged to `attempts` and folded into `skillMastery` (§7.2). NOT gamified.
 */
export default function PossessiveDrill({ seed }: PossessiveDrillProps) {
  const { t } = useTranslation();

  // The possessive inventory comes from the read-only content store.
  // `useLiveQuery` re-resolves once content has loaded, so a pre-load render
  // shows the graceful empty state instead of crashing.
  const records = useLiveQuery(() => loadPossessivesFromDb(), []);

  const [sessionId, setSessionId] = useState<string>(() => seed ?? freshSeed());
  const entries = useMemo<GrammarDrillEntry<PossessiveItem>[]>(
    () => (records ? buildPossessiveEntries(sessionId, records) : []),
    [sessionId, records],
  );

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('possessive.title')}</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            {t('possessive.nav.home')}
          </Link>
        </nav>
      </header>

      <p className={styles.intro}>{t('possessive.intro')}</p>

      <GrammarDrill<PossessiveItem>
        i18nKey="possessive"
        testIdBase="possessive-drill"
        styles={styles}
        entries={entries}
        onExhausted={() => {
          setSessionId(seed ?? freshSeed());
        }}
        onRecord={({ entry, userAnswer, correct, channel, responseMs }) =>
          recordPossessiveAttempt({
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
