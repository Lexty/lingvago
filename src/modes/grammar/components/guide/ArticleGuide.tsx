import { useTranslation } from 'react-i18next'
import styles from './GuideSection.module.css'

export default function ArticleGuide() {
  const { t } = useTranslation()

  const definiteRules = [
    [t('grammar.refArtKnown'), 'Vi um carro. O carro era vermelho.'],
    [t('grammar.refArtPossessive'), 'O meu livro é novo.'],
    [t('grammar.refArtNames'), 'O João, a Maria'],
    [t('grammar.refArtDays'), 'Na segunda-feira'],
    [t('grammar.refArtAbstract'), 'A beleza, o sal'],
  ]

  const indefiniteRules = [
    [t('grammar.refArtFirstMention'), 'Há um carro.'],
    [t('grammar.refArtNonSpecific'), 'Quero um café. (qualquer)'],
    [t('grammar.refArtProfWithAdj'), 'Ela é uma boa professora.'],
  ]

  const omitRules = [
    [t('grammar.refArtProfession'), 'Sou professor.'],
    [t('grammar.refArtMonths'), 'Em janeiro'],
    [t('grammar.refArtDemonstratives'), 'Este livro'],
  ]

  const contractions = [
    ['de + o/a = do/da', 'de + os/as = dos/das'],
    ['em + o/a = no/na', 'em + os/as = nos/nas'],
    ['a + o/a = ao/à', 'a + os/as = aos/às'],
    ['por + o/a = pelo/pela', 'por + os/as = pelos/pelas'],
  ]

  return (
    <div className={styles.section}>
      <p className={styles.intro}>{t('grammar.guide.articles.intro')}</p>

      <h3 className={styles.subtitle}>{t('grammar.refArticles')}</h3>
      <div className={styles.table}>
        <div className={styles.tableRow}>
          <span className={styles.tableHeader} />
          <span className={styles.tableHeader}>masc.</span>
          <span className={styles.tableHeader}>fem.</span>
        </div>
        {[
          ['def. sg.', 'o', 'a'],
          ['indef. sg.', 'um', 'uma'],
          ['def. pl.', 'os', 'as'],
          ['indef. pl.', 'uns', 'umas'],
        ].map(([label, m, f]) => (
          <div key={label} className={styles.tableRow}>
            <span className={styles.rowLabel}>{label}</span>
            <span className={styles.rowValue}>{m}</span>
            <span className={styles.rowValue}>{f}</span>
          </div>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.groupLabel}>{t('grammar.refArticleWhenDef')}</p>
        {definiteRules.map(([rule, example]) => (
          <div key={rule} className={styles.row}>
            <span className={styles.rowLabel}>{rule}</span>
            <span className={styles.rowValue}>{example}</span>
          </div>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.groupLabel}>{t('grammar.refArticleWhenIndef')}</p>
        {indefiniteRules.map(([rule, example]) => (
          <div key={rule} className={styles.row}>
            <span className={styles.rowLabel}>{rule}</span>
            <span className={styles.rowValue}>{example}</span>
          </div>
        ))}
      </div>

      <div className={styles.group}>
        <p className={styles.groupLabel}>{t('grammar.refArticleOmit')}</p>
        {omitRules.map(([rule, example]) => (
          <div key={rule} className={styles.row}>
            <span className={styles.rowLabel}>{rule}</span>
            <span className={styles.rowValue}>{example}</span>
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
