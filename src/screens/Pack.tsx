import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { MIX_GROUP_ID, findPack, localized } from '../packs/index.ts';
import styles from './Pack.module.css';

/**
 * A lesson pack (route `/pack/:packId`): the mechanics of one unit. Each can be
 * practised on its own, or all of them mixed. Nothing is locked or ordered.
 */
export default function Pack() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const pack = findPack(useParams().packId);

  if (!pack) {
    return (
      <main className={styles.screen}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('pack.notFound')}</h1>
          <nav className={styles.nav}>
            <Link to="/" className={styles.navLink}>
              {t('pack.nav.home')}
            </Link>
          </nav>
        </header>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{localized(pack.title, lang)}</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            {t('pack.nav.home')}
          </Link>
        </nav>
      </header>

      <p className={styles.intro}>
        {t('home.unit', { unit: pack.unit })} · {localized(pack.summary, lang)}
      </p>

      <ul className={styles.topics}>
        {pack.groups.map((group) => (
          <li key={group.id} className={styles.topicItem}>
            <Link
              to={`/pack/${pack.id}/${group.id}`}
              className={styles.topic}
              data-testid={`pack-group-${group.id}`}
            >
              <span className={styles.topicTitle}>{localized(group.title, lang)}</span>
              <span className={styles.topicExample} lang="pt-PT">
                {group.example}
              </span>
            </Link>
          </li>
        ))}
        {(pack.drills ?? []).map((drill) => (
          <li key={drill.to} className={styles.topicItem}>
            <Link to={drill.to} className={styles.topic}>
              <span className={styles.topicTitle}>{localized(drill.title, lang)}</span>
              <span className={styles.topicExample} lang="pt-PT">
                {drill.example}
              </span>
            </Link>
          </li>
        ))}
        <li className={styles.topicItem}>
          <Link
            to={`/pack/${pack.id}/${MIX_GROUP_ID}`}
            className={`${styles.topic} ${styles.topicMix}`}
            data-testid="pack-group-mix"
          >
            <span className={styles.topicTitle}>{t('pack.mix.title')}</span>
            <span className={styles.topicHint}>{t('pack.mix.hint')}</span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
