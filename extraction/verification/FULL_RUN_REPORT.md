# Full-run report — Passaporte para Português A1 (units 1-16)

## Coverage
- **153 pages** rendered at native resolution; **49 verbatim files** (~53k words).
  - livro: units 1-16 + 4 GRAMÁTICA sections + 4 Português em Ação/Revisão sections (phys 11-98).
  - caderno: units 1-16 + 4 "que deve saber usar" summaries + Na Fronteira (phys 5-44).
  - notebook: pp.1-25 handwritten (6 files).
- OCR (Tesseract por) on all 153 pages as the control channel.

## Pipeline
Pilot pattern scaled via parallel subagents: render → Channel A (Claude vision, per unit/section, against TRANSCRIPTION_SPEC.md) → Channel B (OCR) → verification (3 axes) → normalize.

## Verification — 3 axes (see METHODOLOGY.md)

### Axis 1 — Source fidelity
- Pilot units 1-2: full iterative error-hunter loop to **2 consecutive clean rounds** (caught 6 errors).
- Units 3-16: single careful Channel-A transcription + subagent self-flagged hard regions, with the 4 **GRAMÁTICA sections** (the app-critical conjugation/contraction tables) put through a dedicated error-hunter pass → **all 4 SECTION CLEAN** (24h00-meia-noite flag adjudicated as faithful).
- Coverage (OCR vs verbatim): livro ~81%, caderno ~90%; all gaps are OCR noise — **no real content omissions**.

### Axis 2 — Internal consistency (consistency_check.py over full corpus)
- 2950 distinct words across 49 files. Surfaced 21 spelling-variant clusters; triage found **3 genuine cross-unit transcription errors**, all fixed (María→Maria in gramatica; Vitor→Vítor ×3; atelié→ateliê). Rest were legitimate (different words, different languages, JSON identifiers).

### Axis 3 — Linguistic correctness (dual engine: Codex + Claude)
- Codex over livro+normalized, Claude over caderno: caderno **CLEAN**; fixed normalized rule error (article with ser not chamar-se) + livro_unit12 stray "o" (adjudicated vs original); quizomba/IPA-ditongo queued low.
- Final pass: **Codex validated all 665 vocab gender/article assignments and 59 grammar conjugation records → only 1 nit** (a+aquilo=àquilo in a note), fixed. **Zero wrong genders/articles/verb-forms in the app payload.**

## Errors caught & fixed (total): pilot 6 + full-run consistency 3 + linguistic 3 + normalized 2 = **14 corrections**, every one adjudicated against the original image or PT rules.

## Normalized app datasets (normalized/)
- **countries.json** — 20 countries, gender/article/prep_origin/prep_location (the gender→article→preposition core).
- **grammar_full.json** — 59 records: all verb conjugations (ser/estar/ter/ir/fazer/poder/querer/saber/pôr/regulars/reflexives), contraction tables (de/em/a + artigo), articles, gender&number rules, possessivos, demonstrativos, hours/dates, frequency, profissões, etc.
- **vocab_full.json** — 665 entries; **247 nouns carry gender+article taken directly from the printed `o/a`** (high confidence), 12 inferred (months). The vocabulary DB for word + gender drills.
- **exercise_templates_full.json** — 31 exercise types (incl. crossword, conjugation-table, ordinais, picture-complete…) = generators for the app.
- SCHEMA.md documents all record shapes.

## Open items (human_review_queue.md)
- 🟥 Notebook author errors — faithfully preserved + ⚠️-flagged, excluded from app data.
- 🟥 Picture-inferred answers (photo/flag/drawing matching) — UNRESOLVABLE: the trimmed PDFs lack the book's **Soluções** answer key. Confirm against full book if needed, or drop (mostly not needed for A1).
- 🟨 quizomba/kizomba, proper-name accents, duplicated IPA ditongo header symbols — low.

## Audio
🔊 exercises (A1…A75) marked `needs_audio`. Most have non-audio caderno equivalents. Decision pending: TTS pt-PT / convert-to-reading / skip.
