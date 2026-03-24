import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import Layout from './components/Layout/Layout'
import Dashboard from './screens/Dashboard/Dashboard'
import Study from './screens/Study/Study'
import Decks from './screens/Decks/Decks'
import DeckWords from './screens/DeckWords/DeckWords'
import Stats from './screens/Stats/Stats'
import Settings from './screens/Settings/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="decks" element={<Decks />} />
          <Route path="decks/:deckId" element={<DeckWords />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="study/:modeId" element={<Study />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
