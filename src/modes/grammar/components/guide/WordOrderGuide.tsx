import { useTranslation } from 'react-i18next'
import styles from './GuideSection.module.css'

export default function WordOrderGuide() {
  const { t } = useTranslation()

  const rules = [
    [t('grammar.wordOrderSVO'), 'Eu como uma maçã.'],
    [t('grammar.wordOrderNegation'), 'Eu não falo inglês.'],
    [t('grammar.wordOrderArticles'), 'O gato dorme na cozinha.'],
  ]

  return (
    <div className={styles.section}>
      <p className={styles.intro}>{t('grammar.guide.wordOrder.intro')}</p>

      <h3 className={styles.subtitle}>{t('grammar.refWordOrder')}</h3>
      {rules.map(([rule, example]) => (
        <div key={rule} className={styles.row}>
          <span className={styles.rowLabel}>{rule}</span>
          <span className={styles.rowValue}>{example}</span>
        </div>
      ))}
    </div>
  )
}
