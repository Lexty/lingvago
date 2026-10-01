import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FocusPicker.module.css';

/**
 * "What are we practising?" — the sub-topic picker of a drill.
 *
 * A drill covers several mechanics (e.g. prepositions of time / place /
 * movement). The picker lets the learner stay on ONE of them for as long as
 * they like, or keep the default mix. Nothing is locked or unlocked: every
 * option is always available.
 */
export interface FocusOption<T extends string> {
  value: T;
  /** Already-resolved label (UI text or a Portuguese form such as `o / a`). */
  label: string;
}

export interface FocusPickerProps<T extends string> {
  options: ReadonlyArray<FocusOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Test id base, e.g. `gender-drill` → `gender-drill-focus-<value>`. */
  testIdBase: string;
}

export default function FocusPicker<T extends string>({
  options,
  value,
  onChange,
  testIdBase,
}: FocusPickerProps<T>) {
  const { t } = useTranslation();
  const labelId = `${testIdBase}-focus-label`;

  return (
    <section className={styles.section} aria-labelledby={labelId}>
      <p id={labelId} className={styles.label}>
        {t('focus.label')}
      </p>
      <div className={styles.chips} role="group" aria-labelledby={labelId}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className={active ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              aria-pressed={active}
              data-testid={`${testIdBase}-focus-${option.value}`}
              onClick={() => {
                onChange(option.value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Read a persisted focus, falling back to `fallback` for anything unknown. */
function readStoredFocus<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null && (allowed as readonly string[]).includes(raw)) {
      return raw as T;
    }
  } catch {
    /* unreadable storage falls through to the default */
  }
  return fallback;
}

/**
 * The chosen sub-topic of one drill, remembered on this device
 * (`lg.focus.<drill>`), so coming back to a drill continues the same mechanic.
 * A missing / unknown / unreadable value resolves to `fallback` (never throws).
 *
 * `pinned` is for a session pinned by an explicit seed (tests, e2e, a `?seed=`
 * link): the remembered choice is neither read nor written, so the same seed
 * always starts on the same `fallback` session whatever this device remembers.
 * The picker still works for the duration of that visit.
 */
export function useDrillFocus<T extends string>(
  drill: string,
  allowed: readonly T[],
  fallback: T,
  pinned = false,
): [T, (value: T) => void] {
  const key = `lg.focus.${drill}`;
  const [focus, setFocusState] = useState<T>(() =>
    pinned ? fallback : readStoredFocus(key, allowed, fallback),
  );
  const setFocus = useCallback(
    (value: T) => {
      setFocusState(value);
      if (pinned) return;
      try {
        localStorage.setItem(key, value);
      } catch {
        /* persistence is best-effort */
      }
    },
    [key, pinned],
  );
  return [focus, setFocus];
}
