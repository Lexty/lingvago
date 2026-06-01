// Definite/indefinite article derivation + preposition+article CONTRACTIONS by
// RULE for the GenderArticle drill (WP-C Task 2 / AC2).
//
// The verified key derives from `nouns.article` (`'o'` masc / `'a'` fem) —
// NEVER guessed. The data is singular m/f, so the singular definite forms are
// the verified base (`o`/`a`); the indefinite (`um`/`uma`) and the EP
// preposition+article contractions are then derived from that verified article
// by a closed, total rule table:
//
//   de + o = do    de + a = da
//   em + o = no    em + a = na
//    a + o = ao     a + a = à
//
// (Plural forms — os/as, uns/umas, dos/das, … — are intentionally OUT of scope
// for this singular m/f dataset; see the contract «keep to the verified
// singular forms primarily».) Accent semantics are pinned by the shared
// `check.ts` canonicalization, which folds `à` → `a` for the objective check,
// so the contraction surface keeps its diacritic for display while comparing on
// equal footing with `a`.

/** The verified singular definite article of a noun (from `nouns.article`). */
export type DefiniteArticle = 'o' | 'a';

/** The EP prepositions that contract with the definite article (singular). */
export type Contractable = 'de' | 'em' | 'a';

/** The grammatical gender of a noun (from `nouns.gender`). */
export type Gender = 'm' | 'f';

/**
 * The full set of article forms verified-derivable for one singular noun. Every
 * field is grounded in the noun's verified `article`; none is guessed.
 */
export interface ArticleForms {
  /** Singular definite article: `o` (masc) / `a` (fem). The verified base. */
  definite: DefiniteArticle;
  /** Singular indefinite article: `um` (masc) / `uma` (fem). */
  indefinite: 'um' | 'uma';
}

/** The closed de/em/a + o/a contraction table (singular), keyed by pair. */
const CONTRACTIONS: Record<Contractable, Record<DefiniteArticle, string>> = {
  de: { o: 'do', a: 'da' },
  em: { o: 'no', a: 'na' },
  a: { o: 'ao', a: 'à' },
};

/**
 * The indefinite article for a definite article (singular): `o` → `um`,
 * `a` → `uma`. Total over the two verified articles.
 */
export function indefiniteFor(definite: DefiniteArticle): 'um' | 'uma' {
  return definite === 'o' ? 'um' : 'uma';
}

/** Derive the verified singular article forms from a noun's definite article. */
export function articleFormsFor(definite: DefiniteArticle): ArticleForms {
  return { definite, indefinite: indefiniteFor(definite) };
}

/**
 * Contract a preposition with a definite article BY RULE (de+o=do, em+a=na,
 * a+a=à, …). Pure and total over the closed `(Contractable × DefiniteArticle)`
 * domain — the key it returns is verified, never guessed.
 */
export function contract(prep: Contractable, definite: DefiniteArticle): string {
  return CONTRACTIONS[prep][definite];
}

/** The opposite definite article — the §6.3 «competitive» gender distractor. */
export function oppositeArticle(definite: DefiniteArticle): DefiniteArticle {
  return definite === 'o' ? 'a' : 'o';
}

/** The opposite contraction (prep + opposite article) — competitive distractor. */
export function oppositeContraction(prep: Contractable, definite: DefiniteArticle): string {
  return contract(prep, oppositeArticle(definite));
}
