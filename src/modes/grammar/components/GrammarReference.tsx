import { useTranslation } from 'react-i18next'
import styles from './GrammarReference.module.css'

interface GrammarReferenceProps {
  category: string
}

function ConjugationReference() {
  const { t } = useTranslation()

  const endings = [
    {
      label: t('grammar.refAr'),
      example: 'falar',
      rows: [
        ['presente', '-o, -as, -a, -amos, -am'],
        ['pret. perf.', '-ei, -aste, -ou, -ámos, -aram'],
        ['pret. imp.', '-ava, -avas, -ava, -ávamos, -avam'],
      ],
    },
    {
      label: t('grammar.refEr'),
      example: 'comer',
      rows: [
        ['presente', '-o, -es, -e, -emos, -em'],
        ['pret. perf.', '-i, -este, -eu, -emos, -eram'],
        ['pret. imp.', '-ia, -ias, -ia, -íamos, -iam'],
      ],
    },
    {
      label: t('grammar.refIr'),
      example: 'partir',
      rows: [
        ['presente', '-o, -es, -e, -imos, -em'],
        ['pret. perf.', '-i, -iste, -iu, -imos, -iram'],
        ['pret. imp.', '-ia, -ias, -ia, -íamos, -iam'],
      ],
    },
  ]

  return (
    <div className={styles.container}>
      <p className={styles.heading}>{t('grammar.refEndings')}</p>
      {endings.map((group) => (
        <div key={group.label} className={styles.group}>
          <p className={styles.groupLabel}>
            {group.label} ({group.example})
          </p>
          {group.rows.map(([tense, forms]) => (
            <div key={tense} className={styles.row}>
              <span className={styles.rowLabel}>{tense}</span>
              <span className={styles.rowValue}>{forms}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function PluralReference() {
  const { t } = useTranslation()

  const rules = [
    ['-vogal → +s', 'casa → casas'],
    ['-r, -z, -s → +es', 'flor → flores'],
    ['-ão → -ões (usual)', 'avião → aviões'],
    ['-ão → -ães', 'pão → pães'],
    ['-ão → -ãos', 'mão → mãos'],
    ['-al, -el, -ol, -ul → -is', 'animal → animais'],
    ['-il → -is (tónico)', 'barril → barris'],
    ['-m → -ns', 'homem → homens'],
  ]

  return (
    <div className={styles.container}>
      <p className={styles.heading}>{t('grammar.refPluralRules')}</p>
      {rules.map(([rule, example]) => (
        <div key={rule} className={styles.row}>
          <span className={styles.rowLabel}>{rule}</span>
          <span className={styles.rowValue}>{example}</span>
        </div>
      ))}
    </div>
  )
}

export default function GrammarReference({ category }: GrammarReferenceProps) {
  if (category === 'conjugation') return <ConjugationReference />
  if (category === 'plural') return <PluralReference />
  return null
}
