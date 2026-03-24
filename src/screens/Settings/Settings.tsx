import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTheme } from '../../hooks/useTheme'
import { db } from '../../db/index'
import { createNewCardState } from '../../db/fsrs-helpers'
import styles from './Settings.module.css'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()

  const settings = useLiveQuery(() => db.settings.get('global'))

  const uiLanguage = settings?.uiLanguage ?? (navigator.language.startsWith('ru') ? 'ru' : 'en')
  const sessionSize = settings?.sessionSize ?? 10

  const updateSetting = async (patch: Record<string, unknown>) => {
    const existing = await db.settings.get('global')
    if (existing) {
      await db.settings.update('global', patch)
    } else {
      await db.settings.put({
        id: 'global',
        sessionSize: 10,
        theme: 'system',
        uiLanguage: navigator.language.startsWith('ru') ? 'ru' : 'en',
        studyLanguage: 'ru',
        ...patch,
      })
    }
  }

  const handleLanguageChange = async (lang: string) => {
    await updateSetting({ uiLanguage: lang })
    i18n.changeLanguage(lang)
  }

  const handleSessionSizeChange = async (value: number) => {
    const clamped = Math.min(50, Math.max(5, value))
    await updateSetting({ sessionSize: clamped })
  }

  const handleReset = async () => {
    if (!window.confirm(t('settings.resetConfirm'))) return

    const studyLanguage = settings?.studyLanguage ?? 'ru'

    await db.transaction('rw', [db.cardStates, db.words], async () => {
      await db.cardStates.clear()

      const words = await db.words.toArray()
      const newCards = words.flatMap((w) => {
        if (!w.translations[studyLanguage]) return []
        return [
          createNewCardState(w.id!, `pt→${studyLanguage}`),
          createNewCardState(w.id!, `${studyLanguage}→pt`),
        ]
      })

      if (newCards.length > 0) {
        await db.cardStates.bulkAdd(newCards)
      }
    })
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('settings.title')}</h1>

      <div className={styles.section}>
        <label className={styles.label}>{t('settings.uiLang')}</label>
        <select
          className={styles.select}
          value={uiLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>{t('settings.theme')}</label>
        <div className={styles.themeGroup}>
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <button
              key={mode}
              className={styles.themeButton}
              data-active={theme === mode}
              onClick={() => setTheme(mode)}
            >
              {t(`settings.theme${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>{t('settings.sessionSize')}</label>
        <div className={styles.sessionRow}>
          <input
            type="number"
            className={styles.numberInput}
            value={sessionSize}
            min={5}
            max={50}
            onChange={(e) => handleSessionSizeChange(Number(e.target.value))}
          />
          <span className={styles.cardsLabel}>{t('settings.cards')}</span>
        </div>
      </div>

      <div className={styles.dangerSection}>
        <button className={styles.dangerButton} onClick={handleReset}>
          {t('settings.reset')}
        </button>
      </div>

      <p className={styles.version}>{t('settings.version')} {__APP_VERSION__}</p>
    </div>
  )
}
