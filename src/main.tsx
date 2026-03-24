import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './i18n'
import { registerMode } from './modes/registry'
import { VocabularyMode } from './modes/vocabulary/VocabularyMode'
import { seedDatabase } from './db/seed'
import App from './App'

registerMode(new VocabularyMode())

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

seedDatabase().catch((err) => {
  console.error('Seed failed:', err)
})
