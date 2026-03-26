import { useTranslation } from 'react-i18next'
import styles from './GuideSection.module.css'

const RULES = [
  ['-vogal → +s', 'casa → casas'],
  ['-r, -z, -s → +es', 'flor → flores'],
  ['-ão → -ões (usual)', 'avião → aviões'],
  ['-ão → -ães', 'pão → pães'],
  ['-ão → -ãos', 'mão → mãos'],
  ['-al, -el, -ol, -ul → -is', 'animal → animais'],
  ['-il → -is (tónico)', 'barril → barris'],
  ['-m → -ns', 'homem → homens'],
]

export default function PluralGuide() {
  const { t } = useTranslation()

  return (
    <div className={styles.section}>
      <p className={styles.intro}>{t('grammar.guide.plural.intro')}</p>

      <h3 className={styles.subtitle}>{t('grammar.refPluralRules')}</h3>
      {RULES.map(([rule, example]) => (
        <div key={rule} className={styles.row}>
          <span className={styles.rowLabel}>{rule}</span>
          <span className={styles.rowValue}>{example}</span>
        </div>
      ))}
    </div>
  )
}
