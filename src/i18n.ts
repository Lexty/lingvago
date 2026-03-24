import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from './locales/ru.json'
import en from './locales/en.json'
import { db } from './db/index'

const detectedLang = navigator.language.startsWith('ru') ? 'ru' : 'en'

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: detectedLang,
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
})

// Restore saved UI language from IndexedDB (non-blocking)
db.settings.get('global').then((settings) => {
  if (settings?.uiLanguage && settings.uiLanguage !== i18n.language) {
    i18n.changeLanguage(settings.uiLanguage)
  }
}).catch(() => {
  // DB not ready yet — use detected language
})

export default i18n
