# Pilot verification report — units 1–2

Scope: livro phys 11–18 (units 1–2), caderno phys 5–8 (units 1–2), notebook phys 1–4.
Channels: **A** = Claude vision (primary, verbatim/), **B** = Tesseract OCR `por` (ocr/), **C** = independent 2nd vision pass by separate subagents.

## 1. Dual vision cross-check (A vs C)
Three independent subagents re-transcribed the same pages blind.

- **Printed pages (livro + caderno): full agreement except 2 items**, both on caderno unit 2, both real errors in channel A, both **fixed**:
  - Ex. I.1 token list: A read `é`, C read `de` → verified on zoomed crop = **`de`** ("Somos do Rio de Janeiro"). Fixed.
  - Ex. J.4: A read `noventa e três`, C read `noventa e nove` → verified on crop = **`noventa e nove`** (sequence 33–66–99). Fixed.
- **Celebrity names / map numbers / object countries** (livro u1 C, u2 B/E): channel C did NOT read them as printed text → confirms they are picture-inferred, correctly left as ⚠️ in A. No silent invention.
- **Notebook (handwritten): no silent disagreement.** Both A and C independently flagged the same hard spots with ⚠️/❓ (Russian glosses, Ele/Ela & Você/Vocês ambiguity, "no ativo", "Minsk", separated-hundreds spelling). Divergences are all in already-flagged uncertain zones, never in confidently-read text.

## 2. OCR coverage cross-check (A vs B) — automated
`verification/coverage_check.py` → `coverage_report.txt`. Per-page coverage of OCR tokens by the verbatim layer:

| page | coverage | real omissions |
|------|----------|----------------|
| livro 11–18 | 90–100% | none |
| caderno 5–8 | 92–99% | none |

Every token flagged "absent" is OCR noise or a fragment (`obrasil`→"o Brasil", `lorque`→"Iorque", `oltenta`→"oitenta", `saopaulo`→"São Paulo", `aciinisitir`→stylised "GRAMÁTICA", `atteracoes`→"alterações"). **No genuine content omissions found.**

## 3. Numbering / structure continuity
- livro u1 exercises: A B C D E F G H I J K + Pronúncia A B C D E — continuous.
- livro u2 exercises: A B C D E F G H I J K L (across the unit) — continuous.
- caderno u1: A–N continuous. caderno u2: A–L continuous.
- Audio markers captured: A1, A2, A3, A4, A5 (u1); A6, A7, A8, A9 (u2). Sequential, none skipped.
- Page folios present and consecutive (book 10–17; caderno 4–7).

## 4. Cross-document consistency
- Unit headers (COMUNICAÇÃO/VOCABULÁRIO/PRONÚNCIA/GRAMÁTICA) identical between livro and caderno for both units. ✔
- Country article list (o/a/os + zero-article Portugal, Marrocos, Angola) consistent livro↔caderno. ✔
- chamar-se / ser conjugations in notebook match the livro/caderno grammar focus. ✔

## 5. Open items queued for human review
- ⚠️ livro u2 ex.G marking of "Atenas é na Grécia" as F in the printed example (likely a deliberate "spot the false statement" or a print artifact) — flagged, not auto-resolved.
- ⚠️ Notebook hundreds: author writes some as separated ("seis centos") next to joined forms — preserve as-is in verbatim; normalized layer uses standard orthography (seiscentos).
- ⚠️ Notebook Russian/English glosses partially illegible (marked ❓).
- Map number→country and celebrity identities (picture-inferred) — to be confirmed against the book's answer key (Soluções) when those pages are extracted.

## Verdict
Pipeline is sound. Dual-channel caught 2 true errors that a single pass would have shipped. Printed-material fidelity after correction is effectively 100% on text; handwriting is captured with honest, consistent uncertainty flags. Ready to scale to all 167 pages.
