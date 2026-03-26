import { useTranslation } from 'react-i18next'
import styles from './GuideSection.module.css'

const RULES = [
  ['-o → masculino', 'livro, gato, carro'],
  ['-a → feminino', 'casa, mesa, porta'],
  ['-dade → feminino', 'cidade, universidade'],
  ['-gem → feminino', 'viagem, garagem'],
  ['-ção → feminino', 'estação, lição'],
  ['-ão → masculino', 'avião, coração'],
]

const EXCEPTIONS = 'o dia, o mapa, o problema, o sistema, o programa'

export default function GenderGuide() {
  const { t } = useTranslation()

  return (
    <div className={styles.section}>
      <p className={styles.intro}>{t('grammar.guide.gender.intro')}</p>

      <h3 className={styles.subtitle}>{t('grammar.refGenderRules')}</h3>
      {RULES.map(([rule, examples]) => (
        <div key={rule} className={styles.row}>
          <span className={styles.rowLabel}>{rule}</span>
          <span className={styles.rowValue}>{examples}</span>
        </div>
      ))}

      <div className={styles.group}>
        <p className={styles.groupLabel}>{t('grammar.refExceptions')}</p>
        <p className={styles.intro}>{EXCEPTIONS}</p>
      </div>
    </div>
  )
}
