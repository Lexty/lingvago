import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../db/index.ts';
import { getReferenceCard, type ReferenceCard } from '../reference/selectors.ts';
import MarkdownLite from '../reference/MarkdownLite.tsx';
import styles from './RuleLink.module.css';

/**
 * The "Rule" button of a drill plus the reference card it opens.
 *
 * The button is available at ANY moment — before answering as well as after —
 * so the rule is a help while practising, not a reward for having answered.
 * The card opens as an in-drill OVERLAY (not a route navigation), so reading
 * the rule never unmounts the drill or loses the session position: closing the
 * overlay returns the user to exactly the item they were on.
 *
 * The overlay is a real modal for the keyboard too: focus moves into it, Tab
 * stays inside it (the drill underneath cannot be answered while it is open),
 * Escape closes it, and closing returns focus to the button. Owners key this
 * component by the current item, so an open rule never carries over to the next
 * one.
 */
export interface RuleLinkProps {
  /** The reference card (`contentId`) this drill item is explained by. */
  referenceId: string;
  /** Test id base, e.g. `gender-drill` → `gender-drill-ref-link`. */
  testIdBase: string;
}

type RuleOverlay =
  | { open: false }
  | { open: true; status: 'loading' }
  | { open: true; status: 'found'; card: ReferenceCard }
  | { open: true; status: 'missing' };

const FOCUSABLE = 'button:not([disabled]), a[href], input, select, textarea, [tabindex]';

export default function RuleLink({ referenceId, testIdBase }: RuleLinkProps) {
  const { t } = useTranslation();
  const [rule, setRule] = useState<RuleOverlay>({ open: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Identifies the load whose result may still be applied. Closing, unmounting
  // or starting another load bumps it, so a late answer from IndexedDB can never
  // re-open a rule the user has already closed.
  const requestRef = useRef(0);

  const openRule = useCallback(() => {
    const request = ++requestRef.current;
    setRule({ open: true, status: 'loading' });
    void getReferenceCard(db, referenceId)
      .then((card) => {
        if (request !== requestRef.current) return;
        setRule(card ? { open: true, status: 'found', card } : { open: true, status: 'missing' });
      })
      .catch((err: unknown) => {
        console.error('reference card load failed', err);
        if (request !== requestRef.current) return;
        setRule({ open: true, status: 'missing' });
      });
  }, [referenceId]);

  const closeRule = useCallback(() => {
    requestRef.current += 1;
    setRule({ open: false });
    triggerRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    [],
  );

  const retry = useCallback(() => {
    // The retry button disappears while the card reloads; move focus to the
    // close button first so it never falls out of the dialog.
    closeRef.current?.focus();
    openRule();
  }, [openRule]);

  // While the rule is open the keyboard belongs to the dialog. The listener is
  // on the document (not the overlay) so it still works if focus ever ends up
  // outside the dialog: Escape closes, Tab is pulled back in and wraps.
  const isOpen = rule.open;
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRule();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = dialogRef.current?.contains(active) ?? false;
      if (event.shiftKey ? active === first || !inside : active === last || !inside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, closeRule]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.refLink}
        data-testid={`${testIdBase}-ref-link`}
        onClick={openRule}
      >
        {t('rule.open')}
      </button>

      {rule.open && (
        <div
          className={styles.ruleOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={t('rule.open')}
          data-testid={`${testIdBase}-rule-overlay`}
          onClick={(event) => {
            // Click on the backdrop (not the dialog) closes the overlay.
            if (event.target === event.currentTarget) closeRule();
          }}
        >
          <div className={styles.ruleDialog} ref={dialogRef}>
            <button
              ref={closeRef}
              type="button"
              className={styles.ruleClose}
              onClick={closeRule}
              autoFocus
              data-testid={`${testIdBase}-rule-close`}
            >
              {t('rule.close')}
            </button>
            {rule.status === 'loading' && <p className={styles.body}>…</p>}
            {rule.status === 'missing' && (
              <>
                <p className={styles.body} role="status">
                  {t('rule.missing')}
                </p>
                <button
                  type="button"
                  className={styles.refLink}
                  data-testid={`${testIdBase}-rule-retry`}
                  onClick={retry}
                >
                  {t('rule.retry')}
                </button>
              </>
            )}
            {rule.status === 'found' && (
              <article data-content-id={rule.card.contentId}>
                <h2 className={styles.ruleTitle}>{rule.card.title}</h2>
                <MarkdownLite body={rule.card.body} />
              </article>
            )}
          </div>
        </div>
      )}
    </>
  );
}
