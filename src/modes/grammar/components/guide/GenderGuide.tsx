import { useTranslation } from 'react-i18next'
import { NOUNS } from '../../data/nouns'
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

// Group nouns by gender pattern for the word list
const mascO = NOUNS.filter((n) => n.gender === 'masculino' && n.word.endsWith('o'))
const femA = NOUNS.filter((n) => n.gender === 'feminino' && n.word.endsWith('a'))
const mascExceptions = NOUNS.filter(
  (n) => n.gender === 'masculino' && !n.word.endsWith('o'),
)
const femIrregular = NOUNS.filter(
  (n) => n.gender === 'feminino' && !n.word.endsWith('a'),
)

interface NounGroupProps {
  label: string
  nouns: typeof NOUNS
}

function NounGroup({ label, nouns }: NounGroupProps) {
  const { i18n } = useTranslation()
  if (nouns.length === 0) return null
  return (
    <div className={styles.group}>
      <p className={styles.groupLabel}>{label}</p>
      {nouns.map((n) => (
        <div key={n.word} className={styles.row}>
          <span className={styles.rowLabel}>{n.articles.def} {n.word}</span>
          <span className={styles.rowValue}>
            {n.translation[i18n.language] ?? n.translation.en ?? n.translation.ru}
          </span>
        </div>
      ))}
    </div>
  )
}

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

      <h3 className={styles.subtitle}>{t('grammar.guide.gender.nounList')}</h3>

      <NounGroup label={t('grammar.guide.gender.mascO')} nouns={mascO} />
      <NounGroup label={t('grammar.guide.gender.femA')} nouns={femA} />
      <NounGroup label={t('grammar.guide.gender.mascExc')} nouns={mascExceptions} />
      <NounGroup label={t('grammar.guide.gender.femIrr')} nouns={femIrregular} />
    </div>
  )
}
