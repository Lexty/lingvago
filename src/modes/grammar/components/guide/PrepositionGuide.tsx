import { useTranslation } from 'react-i18next'
import styles from './GuideSection.module.css'

export default function PrepositionGuide() {
  const { t } = useTranslation()

  const preps = [
    ['a', 'ir a Lisboa, dar ao João'],
    ['de', 'ser de Portugal, livro do João, falar de'],
    ['em', 'morar em Lisboa, no inverno'],
    ['para', 'ir para Angola, para mim'],
    ['por', 'passar por, pelo caminho'],
    ['com', 'falar com, viver com'],
  ]

  const aVsPara = [
    [t('grammar.refPrepAShort'), 'a', 'Vou ao supermercado.'],
    [t('grammar.refPrepParaLong'), 'para', 'Vou para casa. / Vou para o Porto.'],
  ]

  const verbPreps = [
    ['de', 'gostar, precisar, lembrar-se, esquecer-se'],
    ['em', 'pensar, acreditar, morar, confiar'],
    ['a', 'chegar, telefonar, assistir, responder'],
    ['com', 'falar, concordar, sonhar, preocupar-se'],
    ['por', 'esperar, passar, lutar'],
  ]

  const contractions = [
    ['de + o/a = do/da', 'de + os/as = dos/das'],
    ['em + o/a = no/na', 'em + os/as = nos/nas'],
    ['a + o/a = ao/à', 'a + os/as = aos/às'],
    ['por + o/a = pelo/pela', 'por + os/as = pelos/pelas'],
  ]

  return (
    <div className={styles.section}>
      <p className={styles.intro}>{t('grammar.guide.prepositions.intro')}</p>

      <h3 className={styles.subtitle}>{t('grammar.refPrepMeaning')}</h3>
      {preps.map(([prep, examples]) => (
        <div key={prep} className={styles.row}>
          <span className={styles.rowLabel}>{prep}</span>
          <span className={styles.rowValue}>{examples}</span>
        </div>
      ))}

      <div className={styles.group}>
        <p className={styles.groupLabel}>{t('grammar.refPrepAvsP')}</p>
        {aVsPara.map(([rule, prep, example]) => (
          <div key={prep} className={styles.row}>
            <span className={styles.rowLabel}>{rule}</span>
            <span className={styles.rowValue}>{example}</span>
          </div>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.groupLabel}>{t('grammar.refVerbPrep')}</p>
        {verbPreps.map(([prep, verbs]) => (
          <div key={prep} className={styles.row}>
            <span className={styles.rowLabel}>{prep}</span>
            <span className={styles.rowValue}>{verbs}</span>
          </div>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.groupLabel}>{t('grammar.refContractions')}</p>
        {contractions.map(([left, right]) => (
          <div key={left} className={styles.row}>
            <span className={styles.rowValue}>{left}</span>
            <span className={styles.rowValue}>{right}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
