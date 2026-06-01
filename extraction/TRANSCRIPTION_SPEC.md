# Transcription spec (Channel A) — follow exactly

You transcribe scanned Portuguese A1 textbook/workbook pages into faithful markdown.
Model your output on the existing pilot files:
- `verbatim/livro_unit01.md`, `verbatim/livro_unit02.md` (textbook)
- `verbatim/caderno_unit01.md`, `verbatim/caderno_unit02.md` (workbook)
Read one of those first to match the style.

## Rules
1. **Faithful, not interpretive.** Transcribe printed text exactly, including diacritics
   (á à â ã ç é ê í ó ô õ ú) and accented CAPITALS. Preserve exercise letters/numbers.
2. **Frontmatter** (YAML) at top: source, unit (number you SEE on the page graphic, or
   section name), unit_title, book_pages, physical_pages, channel "A (Claude vision)",
   confidence high|medium.
3. **Headings:** `# UNIDADE N — TITLE`; section sub-headings (e.g. `## COMUNICAÇÃO`,
   exercise blocks `### A. ...`). Note the unit header cards (COMUNICAÇÃO / VOCABULÁRIO /
   PRONÚNCIA / GRAMÁTICA) when present.
4. **Audio icon** (the ")" speaker glyph + code like A21, A35): write `🔊 [áudio A21]`.
5. **Tables** → markdown tables. Word banks/caixas → bold inline list.
6. **Blanks** → `______`. Pre-filled example answers (italic/different colour in scan)
   → wrap in *italics* and keep.
7. **Uncertainty:** `⚠️` + best guess for unsure readings; `❓` for illegible.
   Picture-inferred content (names from photos, country from flag) → mark ⚠️ and say it
   is inferred, do NOT assert as printed text.
8. **Footer:** note the page folio numbers.
9. Render the page in reading order (left column then right, or as laid out).

## Output
Write your transcription to the given path with the Write tool. Then reply with a one-line
summary: file written + any pages/regions you found hard (for the verification queue).
