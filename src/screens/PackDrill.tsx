import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import AuthoredDrill from '../components/AuthoredDrill.tsx';
import { MIX_GROUP_ID, buildSession, findBlock, findGroup, findPack, localized } from '../packs/index.ts';
import { recordPackAttempt, recordPackSelfReport } from '../packs/progress.ts';
import styles from './Pack.module.css';

/** A fresh, unique-enough seed for a NEW interactive session. */
function freshSeed(): string {
  return `k-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * One mechanic of a pack, one block mixed, or the whole pack mixed (route
 * `/pack/:packId/:groupId`, `groupId` = a group id, `mix-<blockId>` or `mix`). A `?seed=` query
 * param pins the order (deterministic tests); without it each visit is shuffled
 * anew.
 */
export default function PackDrill() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const { packId, groupId } = useParams();
  const [params] = useSearchParams();
  const pinnedSeed = params.get('seed') ?? undefined;

  const pack = findPack(packId);
  const isMix = groupId === MIX_GROUP_ID;
  const block = pack ? findBlock(pack, groupId) : undefined;
  const group = pack && !isMix ? findGroup(pack, groupId) : undefined;

  const [sessionId, setSessionId] = useState<string>(() => pinnedSeed ?? freshSeed());
  const entries = useMemo(
    () => (pack && groupId !== undefined ? buildSession(pack, groupId, sessionId) : []),
    [pack, groupId, sessionId],
  );

  const title = !pack
    ? t('pack.notFound')
    : isMix
      ? t('pack.mix.title')
      : block
        ? t('pack.blockMixTitle', { block: localized(block.title, lang) })
        : group
        ? localized(group.title, lang)
        : t('pack.notFound');

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <nav className={styles.nav}>
          <Link to={pack ? `/pack/${pack.id}` : '/'} className={styles.navLink}>
            {t('pack.nav.back')}
          </Link>
        </nav>
      </header>

      {pack && (
        <p className={styles.intro}>
          {t('home.unit', { unit: pack.unit })} · {localized(pack.title, lang)}
        </p>
      )}

      <AuthoredDrill
        testIdBase="pack-drill"
        entries={entries}
        onExhausted={() => {
          setSessionId(pinnedSeed ?? freshSeed());
        }}
        onRecord={({ entry, userAnswer, outcome, support, responseMs }) =>
          pack
            ? recordPackAttempt({
                sessionId,
                pack,
                group: entry.group,
                exercise: entry.exercise,
                userAnswer,
                outcome,
                support,
                responseMs,
              })
            : Promise.resolve()
        }
        onSelfReport={recordPackSelfReport}
      />
    </main>
  );
}
