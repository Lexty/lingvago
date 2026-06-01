import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { db } from '../db/index.ts';
import { type ReferenceCard, listReferenceCards } from '../reference/selectors.ts';
import styles from './Reference.module.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; cards: ReferenceCard[] }
  | { status: 'error' };

/**
 * Справочник (Reference) — STATIC list of reference cards (MVP_PLAN WP-B).
 *
 * Reads the read-only §7.1 `referenceCards` content store (loaded by the T6
 * content loader, served offline from IndexedDB/precache). NO drill engine —
 * static render only. Each list item deep-links to `/reference/:contentId`
 * (stable anchor for the future feedback→reference link, WP-C). An empty store
 * renders a friendly empty state, never a crash.
 */
export default function Reference() {
  const { t } = useTranslation();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void listReferenceCards(db)
      .then((cards) => {
        if (active) setLoad({ status: 'ready', cards });
      })
      .catch((err: unknown) => {
        // A read failure must not crash the screen.
        console.error('reference list load failed', err);
        if (active) setLoad({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('reference.title')}</h1>
        <Link to="/" className={styles.navLink}>
          {t('reference.nav.back')}
        </Link>
      </header>

      <p className={styles.intro}>{t('reference.intro')}</p>

      {load.status === 'loading' && (
        <p className={styles.state} role="status">
          {t('reference.loading')}
        </p>
      )}

      {load.status === 'error' && (
        <p className={styles.state} role="status">
          {t('reference.error')}
        </p>
      )}

      {load.status === 'ready' && load.cards.length === 0 && (
        <p className={styles.state} role="status">
          {t('reference.empty')}
        </p>
      )}

      {load.status === 'ready' && load.cards.length > 0 && (
        <ul className={styles.list}>
          {load.cards.map((card) => (
            <li key={card.contentId} className={styles.item}>
              <Link
                to={`/reference/${encodeURIComponent(card.contentId)}`}
                className={styles.cardLink}
              >
                <span className={styles.cardTopic}>{card.topic}</span>
                <span className={styles.cardTitle}>{card.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
