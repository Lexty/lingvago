import { useTranslation } from 'react-i18next'

export default function DeckWords() {
  const { t } = useTranslation()
  return (
    <div style={{ padding: 'var(--space-lg) var(--space-md)' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>{t('common.comingSoon')}</p>
    </div>
  )
}
