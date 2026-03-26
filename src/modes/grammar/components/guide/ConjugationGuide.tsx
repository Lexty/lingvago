import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { VERBS } from '../../data/verbs'
import VerbTable from '../VerbTable'
import styles from './GuideSection.module.css'

interface ConjugationGuideProps {
  highlightVerb?: string
}

const ENDINGS = {
  ar: {
    example: 'falar',
    presente: '-o, -as, -a, -amos, -am',
    preterito_perfeito: '-ei, -aste, -ou, -ámos, -aram',
    preterito_imperfeito: '-ava, -avas, -ava, -ávamos, -avam',
  },
  er: {
    example: 'comer',
    presente: '-o, -es, -e, -emos, -em',
    preterito_perfeito: '-i, -este, -eu, -emos, -eram',
    preterito_imperfeito: '-ia, -ias, -ia, -íamos, -iam',
  },
  ir: {
    example: 'partir',
    presente: '-o, -es, -e, -imos, -em',
    preterito_perfeito: '-i, -iste, -iu, -imos, -iram',
    preterito_imperfeito: '-ia, -ias, -ia, -íamos, -iam',
  },
} as const

const regularAr = VERBS.filter((v) => v.group === 'ar')
const regularEr = VERBS.filter((v) => v.group === 'er')
const regularIr = VERBS.filter((v) => v.group === 'ir')
const irregular = VERBS.filter((v) => v.group === 'irregular')

export default function ConjugationGuide({ highlightVerb }: ConjugationGuideProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!highlightVerb || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-verb="${highlightVerb}"]`)
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
  }, [highlightVerb])

  return (
    <div className={styles.section} ref={scrollRef}>
      <p className={styles.intro}>{t('grammar.guide.conjugation.intro')}</p>

      <div className={styles.ruleCard}>
        <strong>{t('grammar.guide.conjugation.pronounMapping')}</strong>
        <br />
        você / o senhor / a senhora → ele/ela
        <br />
        vocês / os senhores / as senhoras → eles/elas
      </div>

      <h3 className={styles.subtitle}>{t('grammar.guide.conjugation.regularEndings')}</h3>

      {(Object.keys(ENDINGS) as Array<'ar' | 'er' | 'ir'>).map((group) => (
        <div key={group} className={styles.group}>
          <p className={styles.groupLabel}>-{group} ({ENDINGS[group].example})</p>
          <div className={styles.endingsGrid}>
            <span className={styles.endingLabel}>Pres.</span>
            <span className={styles.endingValue}>{ENDINGS[group].presente}</span>
            <span className={styles.endingLabel}>P.Perf.</span>
            <span className={styles.endingValue}>{ENDINGS[group].preterito_perfeito}</span>
            <span className={styles.endingLabel}>P.Imp.</span>
            <span className={styles.endingValue}>{ENDINGS[group].preterito_imperfeito}</span>
          </div>
        </div>
      ))}

      <h3 className={styles.subtitle}>{t('grammar.guide.conjugation.tenses')}</h3>
      <p className={styles.intro}>{t('grammar.guide.conjugation.tensePresente')}</p>
      <p className={styles.intro}>{t('grammar.guide.conjugation.tensePerfeito')}</p>
      <p className={styles.intro}>{t('grammar.guide.conjugation.tenseImperfeito')}</p>

      <h3 className={styles.subtitle}>{t('grammar.guide.conjugation.regularVerbs')}</h3>

      <p className={styles.groupLabel}>-ar</p>
      {regularAr.map((v) => (
        <VerbTable key={v.infinitive} verb={v} highlight={v.infinitive === highlightVerb} />
      ))}

      <p className={styles.groupLabel}>-er</p>
      {regularEr.map((v) => (
        <VerbTable key={v.infinitive} verb={v} highlight={v.infinitive === highlightVerb} />
      ))}

      <p className={styles.groupLabel}>-ir</p>
      {regularIr.map((v) => (
        <VerbTable key={v.infinitive} verb={v} highlight={v.infinitive === highlightVerb} />
      ))}

      <h3 className={styles.subtitle}>{t('grammar.guide.conjugation.irregularVerbs')}</h3>

      {irregular.map((v) => (
        <VerbTable key={v.infinitive} verb={v} highlight={v.infinitive === highlightVerb} />
      ))}
    </div>
  )
}
