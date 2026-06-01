import { useTranslation } from 'react-i18next';
import DataSection from '../components/DataSection.tsx';
import LanguageToggle from '../components/LanguageToggle.tsx';
import { type ThemePref, useTheme } from '../styles/useTheme.ts';
import styles from './Settings.module.css';

const THEME_OPTIONS: readonly ThemePref[] = ['auto', 'light', 'dark'];

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>{t('settings.title')}</h1>

      <section className={styles.section} aria-labelledby="theme-label">
        <p id="theme-label" className={styles.label}>
          {t('settings.theme.label')}
        </p>
        <div className={styles.segmented} role="group" aria-labelledby="theme-label">
          {THEME_OPTIONS.map((option) => {
            const active = theme === option;
            return (
              <button
                key={option}
                type="button"
                className={
                  active
                    ? `${styles.segment} ${styles.segmentActive}`
                    : styles.segment
                }
                aria-pressed={active}
                onClick={() => {
                  setTheme(option);
                }}
              >
                {t(`settings.theme.${option}`)}
              </button>
            );
          })}
        </div>
      </section>

      <LanguageToggle />

      <DataSection />
    </main>
  );
}
