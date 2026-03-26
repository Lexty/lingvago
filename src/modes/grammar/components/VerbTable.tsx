import { useTranslation } from 'react-i18next'
import type { VerbData, Tense, Person } from '../data/verbs'
import { PERSON_LABELS } from '../data/verbs'
import styles from './VerbTable.module.css'

const TENSE_SHORT: Record<Tense, string> = {
  presente: 'Pres.',
  preterito_perfeito: 'P.Perf.',
  preterito_imperfeito: 'P.Imp.',
}

const PERSONS: Person[] = ['eu', 'tu', 'ele_ela', 'nos', 'eles_elas']
const TENSES: Tense[] = ['presente', 'preterito_perfeito', 'preterito_imperfeito']

interface VerbTableProps {
  verb: VerbData
  highlight?: boolean
}

export default function VerbTable({ verb, highlight }: VerbTableProps) {
  const { i18n } = useTranslation()
  const translation = verb.translation[i18n.language] ?? verb.translation.en ?? verb.translation.ru

  return (
    <div
      className={`${styles.card} ${highlight ? styles.cardHighlight : ''}`}
      data-verb={verb.infinitive}
    >
      <p className={styles.header}>
        <span className={styles.infinitive}>{verb.infinitive}</span>
        <span className={styles.translation}> — {translation}</span>
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.pronounHeader} />
              {TENSES.map((t) => (
                <th key={t} className={styles.tenseHeader}>{TENSE_SHORT[t]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERSONS.map((p) => (
              <tr key={p}>
                <td className={styles.pronoun}>{PERSON_LABELS[p]}</td>
                {TENSES.map((t) => (
                  <td key={t} className={styles.form}>{verb.conjugations[t][p]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
