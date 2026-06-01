// Harvest the COMPLETE verb inventory the learner must know, from ALL extracted materials:
// normalized vocab (pos=verb), the teacher verb tables (full conjugations), grammar conjugation
// records, and infinitive cues used in exercises across verbatim/*.md ("Completar com o verbo (X)").
// Output: extraction/normalized/verbs_inventory.json  + a console summary.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const N = (p) => JSON.parse(readFileSync(join(root, 'extraction/normalized', p), 'utf8'))

const INF_RE = /^[a-zàáâãéêíóôõúç]+(ar|er|ir|or)(-se|-me|-te|-nos)?$/i
// non-verbs that the paren-regex catches: English glosses + PT nouns/adjectives ending in -ar/-er/-ir/-or
const EXCLUDE = new Set([
  // English glosses (from notebook/teacher EN translations in parentheses)
  'after', 'author', 'brother', 'color', 'daughter', 'door', 'far', 'father', 'finger',
  'grandfather', 'grandmother', 'header', 'mother', 'near', 'remember', 'silver', 'sister', 'her', 'over', 'water', 'older', 'sugar', 'matter', 'order',
  // PT nouns / adjectives / labels ending in -or/-ar/-er
  'actor', 'cantor', 'professor', 'singular', 'irregular', 'mulher', 'lugar', 'militar', 'familiar', 'devagar', 'amor', 'cor', 'senhor', 'computador', 'lavador', 'condutor', 'jogador', 'falar' === undefined ? '' : undefined,
].filter(Boolean))
function isInf(w) { return INF_RE.test(w) && !EXCLUDE.has(w.toLowerCase()) }
function baseForm(w) {
  // normalize reflexive clitics to -se; lowercase
  return w.toLowerCase().replace(/-(me|te|nos|vos)\b/, '-se')
}
function group(inf) {
  const b = inf.replace(/-se$/, '')
  if (/pôr$|por$/.test(b)) return '-or'
  if (b.endsWith('ar')) return '-ar'
  if (b.endsWith('er')) return '-er'
  if (b.endsWith('ir')) return '-ir'
  return '?'
}

const inv = new Map() // key -> { infinitive, group, reflexive, hasTable, regular, sources:Set }
function add(rawInf, source, { hasTable = false, regular = null } = {}) {
  if (!rawInf) return
  let inf = baseForm(rawInf.trim())
  if (!isInf(inf)) return
  const key = inf
  if (!inv.has(key)) inv.set(key, { infinitive: inf, group: group(inf), reflexive: inf.endsWith('-se'), hasTable: false, regular: null, sources: new Set() })
  const r = inv.get(key)
  r.sources.add(source)
  if (hasTable) r.hasTable = true
  if (regular !== null) r.regular = regular
}

// 1) Teacher verb tables (full conjugations) — verbs_teacher.json
const vt = N('verbs_teacher.json')
const vtArr = Array.isArray(vt) ? vt : (vt.verbs || vt.records || Object.values(vt).find(Array.isArray) || [])
for (const r of vtArr) if (r && r.verb) add(r.verb, 'teacher:verb-table', { hasTable: true, regular: r.regular ?? null })

// 2) grammar_full conjugation records
const gf = N('grammar_full.json')
const gArr = gf.grammar || gf.records || (Array.isArray(gf) ? gf : [])
for (const rec of gArr) {
  if (rec.kind === 'conjugation') {
    // try to read a verb name from id/title
    const m = (rec.id || '') .match(/:(?:vb-|verbo-)?([a-zà-ÿ-]+):/i) || (rec.title || '').match(/\b([a-zà-ÿ]+(?:-se)?)\b/i)
    // prefer explicit field
    if (rec.verb) add(rec.verb, 'grammar:conjugation', { hasTable: true })
    else if (rec.title) {
      const tm = rec.title.match(/\b([a-zàáâãéêíóôõúç]+(?:ar|er|ir|or)(?:-se)?)\b/i)
      if (tm) add(tm[1], 'grammar:conjugation', { hasTable: true })
    }
    if (m && m[1]) add(m[1], 'grammar:conjugation', { hasTable: true })
  }
}

// 3) vocabulary entries with pos=verb (lexical list "que deve saber usar")
for (const file of ['vocab_full.json', 'vocab_unit01-02.json']) {
  const v = N(file)
  const list = v.vocabulary || []
  for (const e of list) if (e.pos === 'verb') add(e.pt, 'vocab:' + file.replace('.json', ''))
}

// 4) infinitive cues in exercises across all verbatim/*.md — "(falar)", "(levantar-se)", "(chegar)"
const vdir = join(root, 'extraction/verbatim')
const PAREN = /\(([a-zàáâãéêíóôõúç]+(?:ar|er|ir|or)(?:-se|-me|-te|-nos)?)\)/gi
for (const f of readdirSync(vdir).filter((x) => x.endsWith('.md'))) {
  const text = readFileSync(join(vdir, f), 'utf8')
  let m
  while ((m = PAREN.exec(text))) add(m[1], 'exercise-cue:' + f.replace('.md', ''))
}

// verbs that are irregular OR have stem/spelling changes -> a naive "regular rule" is WRONG,
// so they need a verified table before exam-mode (flag if no table present).
const TRICKY = new Set([
  'haver', 'valer', 'vestir', 'sentir-se', 'sentir', 'conhecer', 'oferecer', 'agradecer',
  'acontecer', 'desaparecer', 'esquecer-se', 'descer', 'medir', 'perder', 'subir', 'servir',
])
const display = (inf) => (inf === 'por' ? 'pôr' : inf)

// finalize
const verbs = [...inv.values()]
  .map((r) => ({
    infinitive: display(r.infinitive), group: r.group, reflexive: r.reflexive,
    hasTable: r.hasTable, regular: r.regular,
    needsTableReview: !r.hasTable && TRICKY.has(r.infinitive),
    sources: [...r.sources].sort(),
  }))
  .sort((a, b) => a.infinitive.localeCompare(b.infinitive, 'pt'))

const out = {
  _meta: {
    description: 'Полный инвентарь глаголов из всех дидактических материалов (учебник, тетрадь, конспект, листы преподавателя). hasTable=есть готовая таблица спряжения в данных; иначе нужно достроить по правилам/добавить.',
    total: verbs.length,
    withTable: verbs.filter((v) => v.hasTable).length,
    withoutTable: verbs.filter((v) => !v.hasTable).length,
    needsTableReview: verbs.filter((v) => v.needsTableReview).map((v) => v.infinitive),
    byGroup: verbs.reduce((a, v) => ((a[v.group] = (a[v.group] || 0) + 1), a), {}),
  },
  verbs,
}
writeFileSync(join(root, 'extraction/normalized/verbs_inventory.json'), JSON.stringify(out, null, 2))
console.log('verbs_inventory.json:', out._meta)
console.log('with table:', verbs.filter((v) => v.hasTable).map((v) => v.infinitive).join(', '))
console.log('\nNO TABLE (нужно достроить/добавить):', verbs.filter((v) => !v.hasTable).map((v) => v.infinitive).join(', '))
