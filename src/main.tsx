import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import i18n from './i18n'
import { registerMode } from './modes/registry'
import { db } from './db/index'
import { VocabularyMode } from './modes/vocabulary/VocabularyMode'
import { seedDatabase } from './db/seed'
import { ensureSettings } from './db/operations'
import App from './App'

registerMode(new VocabularyMode())

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

ensureSettings()
  .then(async () => {
    await seedDatabase()
    const settings = await db.settings.get('global')
    if (settings?.uiLanguage && settings.uiLanguage !== i18n.language) {
      i18n.changeLanguage(settings.uiLanguage)
    }
  })
  .catch((err) => {
    console.error('Init failed:', err)
  })
