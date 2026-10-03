import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ANKI_DIR, ankiDeckName, ankiFilename, ankiLang } from '../packs/anki.ts';
import { MIX_GROUP_ID, findPack, localized } from '../packs/index.ts';
import type { Pack as PackData } from '../packs/types.ts';
import { shareOrDownloadFile, type ShareOutcome } from '../telemetry/share.ts';
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

      {pack.vocab && pack.vocab.cards.length > 0 && <AnkiSection pack={pack} lang={lang} />}
    </main>
  );
}

type AnkiStatus = { kind: 'idle' } | { kind: ShareOutcome; file: string } | { kind: 'failed' };

/** The prebuilt package (scripts/build-anki.ts), precached for offline use. */
async function fetchAnkiPackage(name: string): Promise<File> {
  const response = await fetch(`${import.meta.env.BASE_URL}${ANKI_DIR}/${name}`);
  if (!response.ok) throw new Error(`anki package ${name}: HTTP ${response.status}`);
  return new File([await response.blob()], name, { type: 'application/octet-stream' });
}

/** The unit's words as an Anki package, plus the list the package contains. */
function AnkiSection({ pack, lang }: { pack: PackData; lang: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AnkiStatus>({ kind: 'idle' });
  const cards = pack.vocab?.cards ?? [];

  async function exportCards() {
    const name = ankiFilename(pack, ankiLang(lang));
    try {
      setStatus({ kind: await shareOrDownloadFile(await fetchAnkiPackage(name)), file: name });
    } catch (err) {
      // Closing the share sheet is the learner's choice, not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setStatus({ kind: 'failed' });
    }
  }

  return (
    <section className={styles.section} aria-labelledby="pack-anki-title">
      <h2 id="pack-anki-title" className={styles.sectionTitle}>
        {t('pack.anki.title')}
      </h2>
      <div className={styles.ankiCard}>
        <p className={styles.ankiStatus}>{t('pack.anki.count', { count: cards.length })}</p>
        <button type="button" className={styles.ankiButton} onClick={exportCards} data-testid="pack-anki-download">
          {t('pack.anki.download')}
        </button>
        <p className={styles.ankiHint}>{t('pack.anki.hint', { deck: ankiDeckName(pack) })}</p>
        <p className={styles.ankiStatus} role="status" data-testid="pack-anki-status">
          {status.kind === 'downloaded' && t('pack.anki.downloaded', { file: status.file })}
          {status.kind === 'shared' && t('pack.anki.shared')}
          {status.kind === 'failed' && t('pack.anki.failed')}
        </p>
        <details className={styles.wordList}>
          <summary>{t('pack.anki.show')}</summary>
          <ul className={styles.words}>
            {cards.map((card) => (
              <li key={card.pt}>
                <span className={styles.wordPt} lang="pt-PT">
                  {card.pt}
                </span>{' '}
                — {localized({ ru: card.ru, en: card.en }, lang)}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
