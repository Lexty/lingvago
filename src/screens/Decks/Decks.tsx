import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/index'
import { deleteDeck } from '../../db/operations'
import styles from './Decks.module.css'

export default function Decks() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const decks = useLiveQuery(() => db.decks.toArray())
  const wordCounts = useLiveQuery(async () => {
    const words = await db.words.toArray()
    const counts: Record<number, number> = {}
    for (const w of words) {
      counts[w.deckId] = (counts[w.deckId] || 0) + 1
    }
    return counts
  })

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    await db.decks.add({
      name: trimmed,
      description: description.trim(),
      isActive: true,
      createdAt: Date.now(),
    })

    setName('')
    setDescription('')
    setShowForm(false)
  }

  const handleToggleActive = async (deckId: number, currentActive: boolean) => {
    await db.decks.update(deckId, { isActive: !currentActive })
  }

  const handleDelete = async (deckId: number) => {
    if (!window.confirm(t('decks.deleteConfirm'))) return
    await deleteDeck(deckId)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('decks.title')}</h1>
        <button className={styles.createButton} onClick={() => setShowForm(true)}>
          + {t('decks.create')}
        </button>
      </div>

      {showForm && (
        <div className={styles.createForm}>
          <input
            className={styles.input}
            placeholder={t('decks.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            className={styles.input}
            placeholder={t('decks.desc')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className={styles.formActions}>
            <button
              className={styles.cancelButton}
              onClick={() => {
                setShowForm(false)
                setName('')
                setDescription('')
              }}
            >
              {t('common.cancel')}
            </button>
            <button className={styles.saveButton} onClick={handleCreate}>
              {t('common.save')}
            </button>
          </div>
        </div>
      )}

      {decks && decks.length === 0 && (
        <p className={styles.empty}>{t('decks.empty')}</p>
      )}

      <div className={styles.list}>
        {decks?.map((deck) => (
          <div key={deck.id} className={styles.deckCard}>
            <button
              className={styles.toggle}
              data-active={deck.isActive}
              onClick={(e) => {
                e.stopPropagation()
                handleToggleActive(deck.id!, deck.isActive)
              }}
              aria-label="Toggle active"
            >
              <span className={styles.toggleKnob} />
            </button>

            <div
              className={styles.deckInfo}
              onClick={() => navigate(`/decks/${deck.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <span className={styles.deckName}>{deck.name}</span>
              <span className={styles.deckMeta}>
                {wordCounts?.[deck.id!] ?? 0} {t('decks.words')}
                {deck.description ? ` · ${deck.description}` : ''}
              </span>
            </div>

            <button
              className={styles.deleteButton}
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(deck.id!)
              }}
            >
              {t('decks.delete')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
