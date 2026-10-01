import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import styles from './Home.module.css';

/**
 * The six mechanics the app trains, in the order they are listed on the home
 * screen. `example` is Portuguese learning content (never localized); the
 * title and hint come from the UI locale.
 */
export const TOPICS = [
  { id: 'numbers', to: '/drill/numbers', example: '23 → vinte e três' },
  { id: 'conjugation', to: '/drill/conjugation', example: 'falar → eu falo, nós falamos' },
  { id: 'gender', to: '/drill/gender', example: 'o livro · a casa · do Brasil' },
  { id: 'preposition', to: '/drill/preposition', example: 'de manhã · no Porto · para casa' },
  { id: 'possessive', to: '/drill/possessive', example: 'o meu livro · a tua casa' },
  { id: 'interrogative', to: '/drill/interrogative', example: 'Quem? Onde? Quando?' },
] as const;

/**
 * Home (route `/`) — the list of mechanics to practise. Nothing is locked,
 * scored, or scheduled: pick a topic and train it for as long as you like.
 */
export default function Home() {
  const { t } = useTranslation();

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

      <ul className={styles.topics}>
        {TOPICS.map((topic) => (
          <li key={topic.id} className={styles.topicItem}>
            <Link
              to={topic.to}
              className={styles.topic}
              data-testid={`home-topic-${topic.id}`}
            >
              <span className={styles.topicTitle}>{t(`home.topics.${topic.id}.title`)}</span>
              <span className={styles.topicExample} lang="pt-PT">
                {topic.example}
              </span>
              <span className={styles.topicHint}>{t(`home.topics.${topic.id}.hint`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
