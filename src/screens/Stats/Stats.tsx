import { useTranslation } from 'react-i18next'

export default function Stats() {
  const { t } = useTranslation()
  return (
    <div style={{ padding: 'var(--space-lg) var(--space-md)' }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
        {t('nav.stats')}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>{t('common.comingSoon')}</p>
    </div>
  )
}
