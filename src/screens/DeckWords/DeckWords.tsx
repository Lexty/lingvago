import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/index'
import { addWordWithCards, deleteWord } from '../../db/operations'
import styles from './DeckWords.module.css'

export default function DeckWords() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { deckId: deckIdParam } = useParams()
  const deckId = Number(deckIdParam)

  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newPt, setNewPt] = useState('')
  const [newTranslation, setNewTranslation] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPt, setEditPt] = useState('')
  const [editTranslation, setEditTranslation] = useState('')

  const deck = useLiveQuery(() => db.decks.get(deckId), [deckId])
  const words = useLiveQuery(() => db.words.where('deckId').equals(deckId).toArray(), [deckId])
  const settings = useLiveQuery(() => db.settings.get('global'))
  const studyLanguage = settings?.studyLanguage ?? 'ru'

  const filtered = useMemo(() => {
    if (!words) return []
    if (!search.trim()) return words
    const q = search.toLowerCase()
    return words.filter(
      (w) =>
        w.pt.toLowerCase().includes(q) ||
        (w.translations[studyLanguage] ?? '').toLowerCase().includes(q),
    )
  }, [words, search, studyLanguage])

  const handleAdd = async () => {
    const pt = newPt.trim()
    const translation = newTranslation.trim()
    if (!pt || !translation) return

    await addWordWithCards(
      {
        pt,
        translations: { [studyLanguage]: translation },
        deckId,
        createdAt: Date.now(),
      },
      studyLanguage,
    )

    setNewPt('')
    setNewTranslation('')
    setShowAdd(false)
  }

  const handleDelete = async (wordId: number) => {
    await deleteWord(wordId)
  }

  const startEdit = (wordId: number, pt: string, translation: string) => {
    setEditingId(wordId)
    setEditPt(pt)
    setEditTranslation(translation)
  }

  const handleEditSave = async () => {
    if (editingId == null) return
    const pt = editPt.trim()
    const translation = editTranslation.trim()
    if (!pt || !translation) return

    const existing = await db.words.get(editingId)
    await db.words.update(editingId, {
      pt,
      translations: { ...existing?.translations, [studyLanguage]: translation },
    })

    setEditingId(null)
  }

  if (!deck) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/decks')}>
          ←
        </button>
        <h1 className={styles.title}>{deck.name}</h1>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder={t('words.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className={styles.addButton} onClick={() => setShowAdd(true)}>
          + {t('words.add')}
        </button>
      </div>

      {showAdd && (
        <div className={styles.wordForm}>
          <div className={styles.formField}>
            <span className={styles.formLabel}>{t('words.portuguese')}</span>
            <input
              className={styles.formInput}
              value={newPt}
              onChange={(e) => setNewPt(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className={styles.formField}>
            <span className={styles.formLabel}>{t('words.translation')}</span>
            <input
              className={styles.formInput}
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button className={styles.formSave} onClick={handleAdd}>
            {t('common.save')}
          </button>
          <button
            className={styles.formCancel}
            onClick={() => {
              setShowAdd(false)
              setNewPt('')
              setNewTranslation('')
            }}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <p className={styles.empty}>{t('words.empty')}</p>
      )}

      {filtered.length > 0 && (
        <>
          <div className={styles.list}>
            {filtered.map((word) =>
              editingId === word.id ? (
                <div key={word.id} className={styles.editRow}>
                  <div className={styles.editInputs}>
                    <input
                      className={styles.editInput}
                      value={editPt}
                      onChange={(e) => setEditPt(e.target.value)}
                      autoFocus
                    />
                    <input
                      className={styles.editInput}
                      value={editTranslation}
                      onChange={(e) => setEditTranslation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                    />
                  </div>
                  <div className={styles.editActions}>
                    <button className={styles.formCancel} onClick={() => setEditingId(null)}>
                      {t('common.cancel')}
                    </button>
                    <button className={styles.formSave} onClick={handleEditSave}>
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={word.id}
                  className={styles.wordRow}
                  onClick={() =>
                    startEdit(word.id!, word.pt, word.translations[studyLanguage] ?? '')
                  }
                  style={{ cursor: 'pointer' }}
                >
                  <span className={styles.wordPt}>{word.pt}</span>
                  <span className={styles.wordArrow}>→</span>
                  <span className={styles.wordTranslation}>
                    {word.translations[studyLanguage] ?? '—'}
                  </span>
                  <button
                    className={styles.wordDelete}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(word.id!)
                    }}
                    title={t('words.delete')}
                  >
                    ✕
                  </button>
                </div>
              ),
            )}
          </div>
          <p className={styles.count}>
            {filtered.length} {t('decks.words')}
          </p>
        </>
      )}
    </div>
  )
}
