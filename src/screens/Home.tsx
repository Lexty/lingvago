import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PACKS, localized } from '../packs/index.ts';
import styles from './Home.module.css';

/**
 * The six generative drills, in the order they are listed on the home screen.
 * `example` is Portuguese learning content (never localized); the title and
 * hint come from the UI locale.
 */
export const TOPICS = [
  { id: 'numbers', to: '/drill/numbers', example: '23 → vinte e três' },
  { id: 'conjugation', to: '/drill/conjugation', example: 'falar → eu falo, nós falamos' },
  { id: 'gender', to: '/drill/gender', example: 'o livro · a casa · do Brasil' },
  { id: 'preposition', to: '/drill/preposition', example: 'de manhã · no Porto · para casa' },
  { id: 'possessive', to: '/drill/possessive', example: 'o meu livro · a tua casa' },
  { id: 'interrogative', to: '/drill/interrogative', example: 'Quem? Onde? Quando?' },
] as const;

/** How the home screen is organised: by course unit, or as a flat list of mechanics. */
export const HOME_VIEWS = ['lessons', 'mechanics'] as const;
export type HomeView = (typeof HOME_VIEWS)[number];

export const HOME_VIEW_STORAGE_KEY = 'lg.home.view';

function readStoredView(): HomeView {
  try {
    const raw = localStorage.getItem(HOME_VIEW_STORAGE_KEY);
    if (raw !== null && (HOME_VIEWS as readonly string[]).includes(raw)) {
      return raw as HomeView;
    }
  } catch {
    /* unreadable storage falls through to the default */
  }
  return 'lessons';
}

/**
 * Home (route `/`) — what to practise. Two views of the same material:
 *  - by lesson: the packs of the course units first, then the library of drills;
 *  - by mechanic: one flat list, every pack group tagged with its unit.
 * Nothing is locked, scored, or scheduled.
 */
export default function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const [view, setViewState] = useState<HomeView>(readStoredView);

  const setView = useCallback((next: HomeView) => {
    setViewState(next);
    try {
      localStorage.setItem(HOME_VIEW_STORAGE_KEY, next);
    } catch {
      /* persistence is best-effort */
    }
  }, []);

  const drillCards = TOPICS.map((topic) => (
    <li key={topic.id} className={styles.topicItem}>
      <Link to={topic.to} className={styles.topic} data-testid={`home-topic-${topic.id}`}>
        <span className={styles.topicTitle}>{t(`home.topics.${topic.id}.title`)}</span>
        <span className={styles.topicExample} lang="pt-PT">
          {topic.example}
        </span>
        <span className={styles.topicHint}>{t(`home.topics.${topic.id}.hint`)}</span>
      </Link>
    </li>
  ));

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('home.title')}</h1>
        <nav className={styles.nav}>
          <Link to="/reference" className={styles.navLink}>
            {t('home.nav.reference')}
          </Link>
          <Link to="/settings" className={styles.navLink}>
            {t('home.nav.settings')}
          </Link>
        </nav>
      </header>

      <div className={styles.segmented} role="group" aria-label={t('home.view.label')}>
        {HOME_VIEWS.map((option) => {
          const active = view === option;
          return (
            <button
              key={option}
              type="button"
              className={active ? `${styles.segment} ${styles.segmentActive}` : styles.segment}
              aria-pressed={active}
              data-testid={`home-view-${option}`}
              onClick={() => {
                setView(option);
              }}
            >
              {t(`home.view.${option}`)}
            </button>
          );
        })}
      </div>

      {view === 'lessons' ? (
        <>
          <section className={styles.section} aria-labelledby="home-lessons">
            <h2 id="home-lessons" className={styles.sectionTitle}>
              {t('home.lessons')}
            </h2>
            <ul className={styles.topics}>
              {PACKS.map((pack) => (
                <li key={pack.id} className={styles.topicItem}>
                  <Link
                    to={`/pack/${pack.id}`}
                    className={styles.topic}
                    data-testid={`home-pack-${pack.id}`}
                  >
                    <span className={styles.tag}>{t('home.unit', { unit: pack.unit })}</span>
                    <span className={styles.topicTitle}>{localized(pack.title, lang)}</span>
                    <span className={styles.topicHint}>{localized(pack.summary, lang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="home-library">
            <h2 id="home-library" className={styles.sectionTitle}>
              {t('home.library')}
            </h2>
            <ul className={styles.topics}>{drillCards}</ul>
          </section>
        </>
      ) : (
        <ul className={styles.topics}>
          {PACKS.flatMap((pack) =>
            pack.groups.map((group) => (
              <li key={`${pack.id}:${group.id}`} className={styles.topicItem}>
                <Link
                  to={`/pack/${pack.id}/${group.id}`}
                  className={styles.topic}
                  data-testid={`home-group-${pack.id}-${group.id}`}
                >
                  <span className={styles.tag}>{t('home.unit', { unit: pack.unit })}</span>
                  <span className={styles.topicTitle}>{localized(group.title, lang)}</span>
                  <span className={styles.topicExample} lang="pt-PT">
                    {group.example}
                  </span>
                </Link>
              </li>
            )),
          )}
          {drillCards}
        </ul>
      )}
    </main>
  );
}
