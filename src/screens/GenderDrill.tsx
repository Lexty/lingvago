import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import FocusPicker, { useDrillFocus } from '../components/FocusPicker.tsx';
import GrammarDrill, {
  type GrammarDrillEntry,
} from '../components/GrammarDrill.tsx';
import {
  GENDER_LEVELS,
  generateSession,
  loadNounsFromDb,
  recordGenderAttempt,
  referenceIdFor,
  type GenderItem,
  type GenderLevel,
} from '../modes/gender/index.ts';
import styles from '../styles/grammarDrillScreen.module.css';

/** Items generated per level (the mixed session walks L1→L4, then re-rolls). */
const PER_LEVEL = 4;

/** Items in a session of ONE chosen sub-topic. */
const FOCUS_COUNT = 12;

/** A fresh, unique-enough seed for a NEW interactive session. */
function freshSeed(): string {
  return `g-${Date.now().toString(36)}-${Math.floor(
    // Non-deterministic ONLY for picking a brand-new interactive seed; the
    // generation PATH from a seed stays fully deterministic (SPEC §6.1). The
    // deterministic e2e/tests pass an explicit `seed` and never hit this.
    Math.random() * 1e6,
  ).toString(36)}`;
}

/**
 * What to practise: the default mix, or one article mechanic. The option labels
 * are the Portuguese forms themselves, so they need no translation.
 */
export const GENDER_FOCUS = ['all', 'definite', 'both', 'contraction', 'agreement'] as const;
export type GenderFocus = (typeof GENDER_FOCUS)[number];

const FOCUS_LEVEL: Readonly<Record<Exclude<GenderFocus, 'all'>, GenderLevel>> = {
  definite: 'L1',
  both: 'L2',
  contraction: 'L3',
  agreement: 'L4',
};

const FOCUS_FORMS: Readonly<Record<Exclude<GenderFocus, 'all'>, string>> = {
  definite: 'o / a',
  both: 'o / a + um / uma',
  contraction: 'do / na / ao',
  agreement: 'vários / muitos / alguns',
};

/**
 * Build the deterministic L1→L2→L3 session for `seed`: `PER_LEVEL` items at each
 * §4.8 level, concatenated in level order so a single playthrough exercises the
 * whole curve. Pure for a given `seed` + `nouns`.
 */
export function buildGenderEntries(
  seed: string,
  nouns: Parameters<typeof generateSession>[1],
  focus: GenderFocus = 'all',
): GrammarDrillEntry<GenderItem>[] {
  const entries: GrammarDrillEntry<GenderItem>[] = [];
  // A chosen sub-topic is one level, FOCUS_COUNT items long.
  const levels: readonly GenderLevel[] = focus === 'all' ? GENDER_LEVELS : [FOCUS_LEVEL[focus]];
  const count = focus === 'all' ? PER_LEVEL : FOCUS_COUNT;
  for (const level of levels) {
    const items = generateSession(`${seed}-${level}`, nouns, {
      count,
      level,
    });
    for (const item of items) {
      entries.push({
        item,
        drill: item.drill,
        level: item.level,
        labelKey: `gender.kind.${item.kind}`,
        referenceId: referenceIdFor(),
      });
    }
  }
  return entries;
}

export interface GenderDrillProps {
  /**
   * Fixed seed for a deterministic session (tests / e2e). When omitted, a fresh
   * seed is generated so each real visit is a new sequence.
   */
  seed?: string;
}

/**
 * GenderDrill — production-first gender/article drill (SPEC §1.2, WP-C, route
 * `/drill/gender`). Renders the seeded session over the verified-eligible
 * `nouns` only: typed PRODUCTION input by default, parity MC where the generator
 * assembled one. Correct/wrong + reference-answer reveal, an L1–L3 indicator, and
 * a feedback→reference deep-link (`ref-genero-artigo`). Each attempt is logged to
 * `attempts` and folded into `skillMastery` (§7.2). NOT gamified.
 */
export default function GenderDrill({ seed }: GenderDrillProps) {
  const { t } = useTranslation();

  // The noun inventory comes from the read-only content store. `useLiveQuery`
  // re-resolves once content has loaded, so a pre-load render shows the graceful
  // empty state instead of crashing.
  const nouns = useLiveQuery(() => loadNounsFromDb(), []);

  const [sessionId, setSessionId] = useState<string>(() => seed ?? freshSeed());
  const [focus, setFocus] = useDrillFocus<GenderFocus>(
    'gender',
    GENDER_FOCUS,
    'all',
    seed !== undefined,
  );
  const entries = useMemo<GrammarDrillEntry<GenderItem>[]>(
    () => (nouns ? buildGenderEntries(sessionId, nouns, focus) : []),
    [sessionId, nouns, focus],
  );

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('gender.title')}</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            {t('gender.nav.home')}
          </Link>
        </nav>
      </header>

      <p className={styles.intro}>{t('gender.intro')}</p>

      <FocusPicker<GenderFocus>
        testIdBase="gender-drill"
        value={focus}
        onChange={setFocus}
        options={GENDER_FOCUS.map((value) => ({
          value,
          label: value === 'all' ? t('focus.all') : FOCUS_FORMS[value],
        }))}
      />

      <GrammarDrill<GenderItem>
        key={focus}
        i18nKey="gender"
        testIdBase="gender-drill"
        styles={styles}
        entries={entries}
        onExhausted={() => {
          setSessionId(seed ?? freshSeed());
        }}
        onRecord={({ entry, userAnswer, correct, channel, responseMs }) =>
          recordGenderAttempt({
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
