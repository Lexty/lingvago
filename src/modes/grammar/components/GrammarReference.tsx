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

  const pronounMapping = [
    ['você / o senhor / a senhora', '→ ele/ela'],
    ['vocês / os senhores / as senhoras', '→ eles/elas'],
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
      <div className={styles.group}>
        <p className={styles.groupLabel}>{t('grammar.refPronounMapping')}</p>
        {pronounMapping.map(([pronouns, target]) => (
          <div key={pronouns} className={styles.row}>
            <span className={styles.rowLabel}>{pronouns}</span>
            <span className={styles.rowValue}>{target}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GenderReference() {
  const { t } = useTranslation()

  const rules = [
    ['-o → masculino', 'livro, gato, carro'],
    ['-a → feminino', 'casa, mesa, porta'],
    ['-dade → feminino', 'cidade, universidade'],
    ['-gem → feminino', 'viagem, garagem'],
    ['-ção → feminino', 'estação, lição'],
    ['-ão → masculino', 'avião, coração'],
  ]

  const exceptions = 'o dia, o mapa, o problema, o sistema, o programa'

  return (
    <div className={styles.container}>
      <p className={styles.heading}>{t('grammar.refGenderRules')}</p>
      {rules.map(([rule, examples]) => (
        <div key={rule} className={styles.row}>
          <span className={styles.rowLabel}>{rule}</span>
          <span className={styles.rowValue}>{examples}</span>
        </div>
      ))}
      <div className={styles.group}>
        <p className={styles.groupLabel}>{t('grammar.refExceptions')}</p>
        <p className={styles.rowValue}>{exceptions}</p>
      </div>
    </div>
  )
}

function ArticleReference() {
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

  return (
    <div className={styles.container}>
      <p className={styles.heading}>{t('grammar.refArticles')}</p>
      <div className={styles.table}>
        <div className={styles.tableRow}>
          <span className={styles.tableHeader} />
          <span className={styles.tableHeader}>masc.</span>
          <span className={styles.tableHeader}>fem.</span>
        </div>
        <div className={styles.tableRow}>
          <span className={styles.rowLabel}>def. sg.</span>
          <span className={styles.rowValue}>o</span>
          <span className={styles.rowValue}>a</span>
        </div>
        <div className={styles.tableRow}>
          <span className={styles.rowLabel}>indef. sg.</span>
          <span className={styles.rowValue}>um</span>
          <span className={styles.rowValue}>uma</span>
        </div>
        <div className={styles.tableRow}>
          <span className={styles.rowLabel}>def. pl.</span>
          <span className={styles.rowValue}>os</span>
          <span className={styles.rowValue}>as</span>
        </div>
        <div className={styles.tableRow}>
          <span className={styles.rowLabel}>indef. pl.</span>
          <span className={styles.rowValue}>uns</span>
          <span className={styles.rowValue}>umas</span>
        </div>
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

function PrepositionReference() {
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
    <div className={styles.container}>
      <p className={styles.heading}>{t('grammar.refPrepMeaning')}</p>
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

function WordOrderReference() {
  const { t } = useTranslation()

  const rules = [
    [t('grammar.wordOrderSVO'), 'Eu como uma maçã.'],
    [t('grammar.wordOrderNegation'), 'Eu não falo inglês.'],
    [t('grammar.wordOrderArticles'), 'O gato dorme na cozinha.'],
  ]

  return (
    <div className={styles.container}>
      <p className={styles.heading}>{t('grammar.refWordOrder')}</p>
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
  switch (category) {
    case 'conjugation': return <ConjugationReference />
    case 'gender': return <GenderReference />
    case 'articles': return <ArticleReference />
    case 'plural': return <PluralReference />
    case 'prepositions': return <PrepositionReference />
    case 'word_order': return <WordOrderReference />
    default: return null
  }
}
