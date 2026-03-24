import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/index'
import { bulkAddWordsWithCards } from '../../db/operations'
import type { Word } from '../../db/schema'
import styles from './CsvImport.module.css'

interface CsvImportProps {
  deckId: number
  onClose: () => void
}

interface ParsedRow {
  pt: string
  translation: string
  valid: boolean
}

const HEADER_PATTERN = /^(portuguese|pt|word|слово)/i

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []

  const startIndex = HEADER_PATTERN.test(lines[0]) ? 1 : 0
  const rows: ParsedRow[] = []

  for (let i = startIndex; i < lines.length; i++) {
    // Split on first comma only — allows commas in translation
    const idx = lines[i].indexOf(',')
    if (idx === -1) {
      rows.push({ pt: lines[i].trim(), translation: '', valid: false })
      continue
    }
    const pt = lines[i].slice(0, idx).trim()
    const translation = lines[i].slice(idx + 1).trim()
    rows.push({ pt, translation, valid: pt !== '' && translation !== '' })
  }

  return rows
}

type ImportState = 'idle' | 'preview' | 'importing' | 'done'

export default function CsvImport({ deckId, onClose }: CsvImportProps) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ImportState>('idle')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [importedCount, setImportedCount] = useState(0)

  const settings = useLiveQuery(() => db.settings.get('global'))
  const studyLanguage = settings?.studyLanguage ?? 'ru'

  const validRows = rows.filter((r) => r.valid)
  const invalidCount = rows.length - validRows.length

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const parsed = parseCsv(text)

    if (parsed.length === 0 || parsed.filter((r) => r.valid).length === 0) {
      setRows([])
      setState('preview')
      return
    }

    setRows(parsed)
    setState('preview')
  }

  const handleImport = async () => {
    setState('importing')

    const words: Array<Omit<Word, 'id'>> = validRows.map((r) => ({
      pt: r.pt,
      translations: { [studyLanguage]: r.translation },
      deckId,
      createdAt: Date.now(),
    }))

    const count = await bulkAddWordsWithCards(words, studyLanguage)
    setImportedCount(count)
    setState('done')
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('csvImport.title')}</h2>

      {state === 'idle' && (
        <div className={styles.fileSection}>
          <p className={styles.hint}>{t('csvImport.selectFile')}</p>
          <p className={styles.format}>pt,translation</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          <button className={styles.cancelButton} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      )}

      {state === 'preview' && validRows.length === 0 && (
        <div className={styles.emptySection}>
          <p className={styles.empty}>{t('csvImport.empty')}</p>
          <button className={styles.cancelButton} onClick={onClose}>
            {t('csvImport.close')}
          </button>
        </div>
      )}

      {state === 'preview' && validRows.length > 0 && (
        <>
          <div className={styles.previewList}>
            {rows.map((row, i) => (
              <div
                key={i}
                className={`${styles.previewRow} ${!row.valid ? styles.previewRowInvalid : ''}`}
              >
                <span className={styles.previewPt}>{row.pt || '—'}</span>
                <span className={styles.previewArrow}>→</span>
                <span className={styles.previewTranslation}>{row.translation || '—'}</span>
              </div>
            ))}
          </div>
          {invalidCount > 0 && (
            <p className={styles.invalidNote}>
              {t('csvImport.invalidRows', { count: invalidCount })}
            </p>
          )}
          <div className={styles.actions}>
            <button className={styles.cancelButton} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button className={styles.importButton} onClick={handleImport}>
              {t('csvImport.importButton', { count: validRows.length })}
            </button>
          </div>
        </>
      )}

      {state === 'importing' && (
        <p className={styles.loading}>{t('common.loading')}</p>
      )}

      {state === 'done' && (
        <div className={styles.doneSection}>
          <p className={styles.success}>
            {t('csvImport.success', { count: importedCount })}
          </p>
          <button className={styles.importButton} onClick={onClose}>
            {t('csvImport.close')}
          </button>
        </div>
      )}
    </div>
  )
}
