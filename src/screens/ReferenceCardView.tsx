import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { db } from '../db/index.ts';
import { type ReferenceCard, getReferenceCard } from '../reference/selectors.ts';
import MarkdownLite from '../reference/MarkdownLite.tsx';
import styles from './Reference.module.css';

/**
 * The drill that trains each reference card, so a rule read in the reference
 * leads straight to practising it. A card with no drill of its own (ser/estar)
 * simply has no link.
 */
const DRILL_FOR_CARD: Readonly<Record<string, string>> = {
  'ref-genero-artigo': '/drill/gender',
  'ref-prep-de-em': '/drill/preposition',
  'ref-prep-a-para': '/drill/preposition',
  'ref-prep-tempo': '/drill/preposition',
  'ref-prep-lugar': '/drill/preposition',
  'ref-verbos-presente': '/drill/conjugation',
  'ref-possessive': '/drill/possessive',
  'ref-interrogative': '/drill/interrogative',
};

type LoadState =
  | { status: 'loading' }
  | { status: 'found'; card: ReferenceCard }
  | { status: 'notFound' }
  | { status: 'error' };

/**
 * Single reference card (deep-link `/reference/:id`, WP-B).
 *
 * Loads ONE card by its `contentId` from the read-only content store and renders
 * its markdown-lite `body` statically (no engine). An unknown id resolves to a
 * friendly not-found state (not a crash). The card content is PT/учебный (from
 * the bundle); only the chrome (heading/back link/states) is i18n'd.
 */
export default function ReferenceCardView() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id ?? '';
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setLoad({ status: 'loading' });
    void getReferenceCard(db, id)
      .then((card) => {
        if (!active) return;
        setLoad(card ? { status: 'found', card } : { status: 'notFound' });
      })
      .catch((err: unknown) => {
        console.error('reference card load failed', err);
        if (active) setLoad({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const backLink = (
    <Link to="/reference" className={styles.navLink}>
      {t('reference.nav.list')}
    </Link>
  );

  if (load.status === 'found') {
    return (
      <main className={styles.screen}>
        <header className={styles.header}>
          <h1 className={styles.cardHeading}>{load.card.title}</h1>
          {backLink}
        </header>
        <p className={styles.cardTopicLabel}>{load.card.topic}</p>
        <article className={styles.cardBody} data-content-id={load.card.contentId}>
          <MarkdownLite body={load.card.body} />
        </article>
        {DRILL_FOR_CARD[load.card.contentId] !== undefined && (
          <Link
            to={DRILL_FOR_CARD[load.card.contentId]}
            className={styles.practiceLink}
            data-testid="reference-practice"
          >
            {t('reference.practice')}
          </Link>
        )}
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('reference.title')}</h1>
        {backLink}
      </header>
      <p className={styles.state} role="status">
        {load.status === 'loading' && t('reference.loading')}
        {load.status === 'notFound' && t('reference.notFound')}
        {load.status === 'error' && t('reference.error')}
      </p>
    </main>
  );
}
