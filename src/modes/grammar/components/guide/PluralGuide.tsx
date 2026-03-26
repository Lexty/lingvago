import { useTranslation } from 'react-i18next'
import { NOUNS } from '../../data/nouns'
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

// Group nouns by plural pattern
const regular = NOUNS.filter(
  (n) => n.plural === n.word + 's' || n.plural === n.word.slice(0, -1) + 's',
)
const aoOes = NOUNS.filter((n) => n.word.endsWith('ão') && n.plural.endsWith('ões'))
const aoAes = NOUNS.filter((n) => n.word.endsWith('ão') && n.plural.endsWith('ães'))
const aoAos = NOUNS.filter((n) => n.word.endsWith('ão') && n.plural.endsWith('ãos'))
const lIs = NOUNS.filter((n) => /[aeiou]l$/.test(n.word) && n.plural.endsWith('is'))
const mNs = NOUNS.filter((n) => n.word.endsWith('m') && n.plural.endsWith('ns'))
const otherIrregular = NOUNS.filter(
  (n) =>
    !regular.includes(n) &&
    !aoOes.includes(n) &&
    !aoAes.includes(n) &&
    !aoAos.includes(n) &&
    !lIs.includes(n) &&
    !mNs.includes(n),
)

interface NounGroupProps {
  label: string
  nouns: typeof NOUNS
}

function NounGroup({ label, nouns }: NounGroupProps) {
  if (nouns.length === 0) return null
  return (
    <div className={styles.group}>
      <p className={styles.groupLabel}>{label}</p>
      {nouns.map((n) => (
        <div key={n.word} className={styles.row}>
          <span className={styles.rowLabel}>{n.word}</span>
          <span className={styles.rowValue}>→ {n.plural}</span>
        </div>
      ))}
    </div>
  )
}

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

      <h3 className={styles.subtitle}>{t('grammar.guide.plural.nounList')}</h3>

      <NounGroup label="+s" nouns={regular} />
      <NounGroup label="-ão → -ões" nouns={aoOes} />
      <NounGroup label="-ão → -ães" nouns={aoAes} />
      <NounGroup label="-ão → -ãos" nouns={aoAos} />
      <NounGroup label="-l → -is" nouns={lIs} />
      <NounGroup label="-m → -ns" nouns={mNs} />
      <NounGroup label="+es" nouns={otherIrregular} />
    </div>
  )
}
