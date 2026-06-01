# Verification methodology (standing spec for the full run)

Three independent axes. A unit is "done" only when all three pass.

## Axis 1 — Source fidelity (does the text match the scan?)
- **Channel A** Claude vision verbatim transcription.
- **Channel B** Tesseract OCR (`por`) — automated coverage diff (`coverage_check.py`).
- **Channel C** independent 2nd vision pass (separate subagents).
- **Iterative error-hunter loop** (`until 2 clean rounds`):
  - Each round: fresh independent hunters compare verbatim vs original images, report ONLY discrepancies.
  - **Adjudicator = the original image** (zoomed crop), never agent vote — because A and C can share a blind spot (proved: the `e [ɨ]` IPA glyph was mis-read identically by A, C, and round-1 hunter; a round-2 hunter with a different focus caught it).
  - Fix confirmed items; a unit needs **2 consecutive clean rounds**. Per-unit streak tracking lets us stop early per unit.
  - Pilot result: 4 substantive + 2 minor errors caught & fixed; all units converged.

## Axis 2 — Internal self-consistency (is the data consistent with itself?)
- `consistency_check.py`: every PT token across ALL files (verbatim + normalized); flags any word appearing in >1 spelling (diacritic/letter variants) with locations.
- Triage each flag: legitimate (different word / different language / JSON identifier) vs real inconsistency.
- Pilot result: 8 flags, all legitimate → corpus internally consistent. (Noise filters to extend for full run: skip JSON keys, `en` gloss fields, known distinct pairs like esta/está.)

## Axis 3 — Linguistic correctness (does the data obey Portuguese rules?)
- **Dual engine**, mirroring the A/C philosophy:
  - **Codex CLI** (`codex exec`, OpenAI) reviews the data vs PT-PT rules.
  - **Independent Claude subagent** reviews the same files.
  - Reconcile the two reports.
- Checks: gender↔article agreement; de/em contractions (do/da/dos, no/na/nos); verb conjugations (ser, chamar-se); number-word formation; orthography/diacritics; cross-file contradictions.
- Pilot result: both engines agree the **normalized data is clean**; the only language errors are the **notebook author's own slips** (already ⚠️-flagged). My 2 JSON typos were caught by Codex and fixed.

## Conflict-resolution protocol (the key rule the user asked for)
When the council agrees the text is **faithful to the source** but the data is still
**linguistically/factually wrong**:
1. Keep the **verbatim** layer faithful (⚠️-flag it).
2. Put the **correct PT** into the **normalized/app** layer.
3. Log the case in `human_review_queue.md` for a human to classify:
   **author/textbook error · scan defect · parse defect.**
This guarantees the app never teaches a corrupted form, while no information is lost
and every anomaly is auditable.

## Outputs
- `coverage_report.txt`, `consistency_report.txt`, `codex_ling_report.txt`,
  `pilot_verification_report.md`, `human_review_queue.md`.
