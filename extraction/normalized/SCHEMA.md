# Normalized data schema (app layer)

Derived from the verified verbatim layer. Every record carries `source` provenance
so it can be traced back to the page it came from, and `confidence`.

## vocab record
```jsonc
{
  "id": "pt:brasil",
  "lemma": "Brasil",
  "pos": "proper-noun|noun|verb|adj|adv|num|phrase|interjection",
  "gender": "m|f|none|plural",      // none = no article (Portugal, Marrocos)
  "article": "o|a|os|as|none|optional", // definite article used with the lemma
  "translation": { "ru": "...", "en": "..." },
  "ipa": "optional",
  "tags": ["country","number","weekday","greeting","origin"],
  "unit": 2,
  "source": "livro:u2:p14",
  "confidence": "high|medium|low"
}
```

## country record (specialised — drives gender/article/preposition drills)
```jsonc
{
  "name": "Brasil",
  "gender": "m",
  "article": "o",                 // "optional" or "none" supported
  "prep_origin": "do",            // de+article: de/da/do/dos  -> "Sou DO Brasil"
  "prep_location": "no",          // em+article: em/na/no/nos   -> "fica NO Brasil"
  "note": "...",                  // e.g. Spain: article optional, prep w/o article
  "source": "livro:u2:p14"
}
```
The contraction logic the learner must internalise:
- **de + o/a/os/as** → do / da / dos / das  (origin: *De onde é? — Sou ___*)
- **em + o/a/os/as** → no / na / nos / nas  (location: *Onde fica? — Fica ___*)
- No-article places (Portugal, Marrocos, Angola, Espanha*, Itália*…): plain **de** / **em**.
  *(Espanha/Itália/França/Inglaterra: book prints article as "(a)" = optional; in
   origin/location they are normally used WITHOUT article: de Espanha, em Itália.)*

## grammar record
```jsonc
{
  "id": "gram:ser:present",
  "title": "Verbo SER — Presente do Indicativo",
  "unit": 1,
  "kind": "conjugation|rule|contraction-table|contrast",
  "data": { ... },               // shape depends on kind
  "source": "livro:u1:p10 + notebook:p2",
  "confidence": "high"
}
```

## exercise template (drives generated tasks in the app)
```jsonc
{
  "id": "tmpl:complete-article",
  "type": "match|gap-wordbank|gap-free|complete-verb|complete-article|complete-prep|transform|correct-sentence|order|number-spell|listen-*",
  "prompt_pt": "Complete com o ou a onde necessário.",
  "skill": ["article","gender"],
  "io": { "given": "...", "answer": "..." },
  "generatable": true,            // can the app auto-generate more items of this type?
  "needs_audio": false,
  "origin": "caderno:u1:F",
  "unit": 1
}
```
`needs_audio: true` marks the items behind the 🔊 audio icon — open question whether
the app supports them (TTS substitute vs. skip).
