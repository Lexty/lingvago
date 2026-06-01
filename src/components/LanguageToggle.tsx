import { useTranslation } from 'react-i18next';
import { type AppLang, setLang, SUPPORTED_LANGS } from '../i18n/config.ts';
import styles from './LanguageToggle.module.css';

/**
 * Manual RU/EN language switch for Settings (SPEC §10.4).
 * The active language is read from the live i18next instance; selecting an
 * option persists `lg.lang` and re-renders via react-i18next.
 */
export default function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <section className={styles.section} aria-labelledby="lang-label">
      <p id="lang-label" className={styles.label}>
        {t('settings.language.label')}
      </p>
      <div className={styles.segmented} role="group" aria-labelledby="lang-label">
        {SUPPORTED_LANGS.map((lang: AppLang) => {
          const active = current === lang;
          return (
            <button
              key={lang}
              type="button"
              className={
                active
                  ? `${styles.segment} ${styles.segmentActive}`
                  : styles.segment
              }
              aria-pressed={active}
              onClick={() => {
                setLang(lang);
              }}
            >
              {t(`settings.language.${lang}`)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
