import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from './locales/ru.json'

const detectedLang = navigator.language.startsWith('ru') ? 'ru' : 'ru' // v1: always RU

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
  },
  lng: detectedLang,
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
