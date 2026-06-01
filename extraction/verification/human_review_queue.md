# Human-review queue

Cases where automated/agent verification cannot self-resolve. Protocol:

> When the **verification council** (dual vision transcription A/C + OCR B + iterative
> error-hunters) agrees the text was **parsed faithfully from the source**, but the
> **data is still linguistically/factually incorrect**, we do NOT silently "fix" the
> verbatim layer. Instead we (1) keep the verbatim faithful to the scan, (2) put the
> correct PT form into the normalized/app layer, and (3) log the case HERE for a human
> to decide: **is it a textbook/author error, a scan defect, or a parse defect?**

Status legend: 🟥 needs human decision · 🟩 resolved · 🟨 accepted (low impact)

---

## A. Source faithfully parsed, but Portuguese is wrong → likely AUTHOR error (notebook)
Confirmed by BOTH engines (Codex + Claude) on linguistic axis, AND by faithful transcription (the handwriting really says this). Verbatim keeps it (⚠️-flagged); normalized/app layer already uses the correct form.

| # | Location | Source says (faithful) | Correct PT | Decision |
|---|---|---|---|---|
| A1 | notebook p4:135-141,149 | `quatro centos`, `seis centos`, `sete centos`, `oito centos`, `nove centos`, `seis centos e cinquenta e quatro` | `quatrocentos`, `seiscentos`, `setecentos`, `oitocentos`, `novecentos`, `seiscentos e…` | 🟥 author wrote hundreds separated — confirm as author slip; app uses joined forms (vocab JSON already correct) |
| A2 | notebook p2:94 | `Esta é cansada` | `Esta está cansada` (estado temporário → estar) | 🟥 confirm author slip; app uses `está` |
| A3 | notebook p4:150 | `mil e setecentos e oitenta e nove` | `mil setecentos e oitenta e nove` (sem `e` após mil quando seguem centenas) | 🟥 confirm; app example already correct |
| A4 | notebook p1 | `Nós estamos no ativo` (⚠️ leitura) | sentido pouco claro | 🟥 verificar intenção do autor |

→ These are exactly the "may contain errors" the author warned about. Recommended human action: confirm they are the note-taker's own mistakes (not to be taught), which is already how the app layer treats them.

## B. Picture-inferred — needs the book's ANSWER KEY (Soluções) to confirm
Not printed as text; we inferred from images and marked ⚠️. Resolve when the Soluções pages are extracted in the full run.

| # | Location | Item | Decision |
|---|---|---|---|
| B1 | livro u2 ex.B (p14) | map number → country (1–19) associations | 🟥 confirm vs Soluções |
| B2 | livro u1 ex.C (p11) | celebrity identities in the 12-photo grid | 🟥 confirm vs Soluções (or drop names — not needed for A1) |
| B3 | livro u2 ex.E (p15) | object → country (objects 1–9) | 🟥 confirm vs Soluções |
| B4 | caderno u1 ex.K (p4) | which icon = cumprimento vs despedida (no text labels) | 🟥 confirm vs Soluções; annotation neutralized for now |

## C. Accepted layout/representation choices (no content loss) 🟨
| # | Location | Note |
|---|---|---|
| C1 | livro u2 ex.K (p17) | NÚMEROS 21-100 printed as single column; verbatim renders as 2-col table. All values present; reading order differs. Accepted. |

## D. Resolved during verification 🟩
| # | Location | Resolution |
|---|---|---|
| D1 | caderno u2 ex.I.1 | token `é`→`de` (confirmed on crop) |
| D2 | caderno u2 ex.J.4 | `noventa e três`→`noventa e nove` (confirmed on crop; 33–66–99) |
| D3 | livro u2 ex.G.1 | "Atenas é na Grécia" = pre-marked **V** (X in V box); my earlier "F" reading was wrong (confirmed on crop) |
| D4 | livro u1 Pronúncia vowel table | 5th cell `e [i]`→`e [ɨ]` barred-i (confirmed on crop) |
| D5 | caderno u1 ex.G.2,3 | restored trailing `.` / `!` |
| D6 | countries.json _meta | my own typos `De onde e?`→`é`, `tambem`→`também` (Codex catch) |

---

# FULL-RUN findings (units 3-16 + sections + notebook pp.5-25)

## E. Resolved transcription errors (consistency + linguistic axes, adjudicated vs original) 🟩
| # | Location | Resolution |
|---|---|---|
| E1 | livro_gramatica_01-04 | `María Lopes`→`Maria Lopes` (livro prints plain Maria; original confirmed) |
| E2 | livro_unit12 ×3 | `Vitor`→`Vítor` (book consistently accents; original confirmed) |
| E3 | notebook_p13-16 | `atelié`→`ateliê` (handwriting shows circumflex) |
| E4 | livro_unit12:50 | removed stray `o`: `que o é`→`que é um português típico` (original confirmed) |
| E5 | grammar_unit01-02.json | my rule error `Ela chama-se a Teresa` → article goes with SER not chamar-se (Codex catch) |

## F. Verified FAITHFUL (flagged but original confirms transcription is right) 🟩
| # | Location | Note |
|---|---|---|
| F1 | caderno_unit03 | `María` (de Espanha) — intentional Spanish name, NOT an error |
| F2 | livro_gramatica_13-16 | `24h00 - É meia-noite` — book really prints 24h00 for midnight (hunter guessed 00h00; original confirms 24h00) |

## G. Low-priority / queued for human glance 🟨
| # | Location | Note |
|---|---|---|
| G1 | livro_unit10 | `quizomba` — standard PT spelling is `kizomba`; left faithful (informal forum text); confirm vs book |
| G2 | livro_unit12 / caderno_unit13-14 | `Gérard`/`Gerard`, proper-name accent — minor |
| G3 | caderno_unit15/16 + livro_unit15 | duplicated IPA ditongo symbols in PRONÚNCIA headers ([ɐ̃j] e [ɐ̃j]; [oj] e [oj]) — likely 2 distinct ditongos rendered identically; re-read needed |
| G4 | livro_gramatica_09-12 ex.D | book internal oddity: prompt `(isto)` but printed answer `Esta` — faithful, book quirk |

## H. NOTEBOOK author errors (faithfully transcribed, ⚠️-flagged in files) 🟥
The handwritten notes contain many of the author's OWN mistakes — all preserved verbatim with ⚠️ and NOT fed to the app's normalized layer. Categories found across pp.1-25:
- Broken conjugations: `esqueco-` single stem across persons (esquecer-se); sentar-se/sentir-se mixed.
- Wrong contractions written in tables: `em+art` as `mo/ma/mos/mas` and `uma/um/umas/unas` (should be no/na/nos/nas).
- Agreement errors: `brancas e cinzentos`, `Ambos são casado`, `As sopa`, `russo (não) típico`.
- Calques/wrong forms: `Quanto velho és?` (→Que idade tens?), `arbistas`→artistas, `passara ferro`→passar a ferro.
- Gloss/label errors: `tia (uncle)`, `filho (daughter)`, `más (had)`, `acabar = começar`.
- Missing diacritics: `esqueco, luis, nuria, atelié`(fixed E3).
→ Human action: these are study-note slips, correctly excluded from teaching data. No fix to verbatim (it must stay faithful).

## I. Picture-inferred (UNRESOLVABLE from these PDFs — no answer key) 🟥
Every unit's photo/flag/drawing-matching answers are inferred and ⚠️-flagged. The trimmed
livro/caderno do NOT include the book's **Soluções** (answer key) or the full **Glossário**,
so these cannot be auto-confirmed. Human action: confirm against the full book's answer key
if/when available, OR drop the inferred associations (most are not needed for A1 drills).

---

# TEACHER MATERIALS findings (9 new PDFs: matriz, cronograma, família, escola, verb tables, SKM Aprender-Português-1 caderno 38pp, verbosinfo)

## J. Source defect (faithfully parsed, but source itself is wrong) 🟥
| # | Location | Source prints | Correct PT | Decision |
|---|---|---|---|---|
| J1 | teacher_verbosinfo (irregular table, *sair* row, *vós*) | `sais` (no accent) | `saís` | Handout typo. Verbatim flags it; app/normalized uses `saís`. (vós is "em desuso" anyway — caption says so.) |

## K. My transcription errors (fixed) 🟩
| # | Location | Fix |
|---|---|---|
| K1 | teacher_matriz GRUPO IV | `temas i assuntos` → `temas / assuntos` (the doc uses `|` as a `/` separator, cf. "Ser \| Estar") |

## L. Low-priority / likely faithful-to-source (queued) 🟨
| # | Location | Note |
|---|---|---|
| L1 | teacher_skm_p02-07 | `___ é que lhe janta?` — smudged scan, agent ⚠️-flagged; verify vs original or drop the item |
| L2 | teacher_skm_p15-21 | `Prevê-se chuviscos e trovoadas` — debated agreement; likely faithful to book weather text |
| L3 | teacher_skm_p22-28 | `Eu ___ lhe (pedir)` — exercise blank layout; affirmative PT is `pedi-lhe` (the student supplies enclisis) |
| L4 | teacher_skm_p35-38 | `no Verão` — season capitalised (older convention); modern PT lowercases |

## NOTE — different course book
`teacher_skm_*` is the workbook of a DIFFERENT series — **"Aprender Português 1" (Texto editora)**, units 1-14 + TESTE FINAL — NOT "Passaporte para Português". Unit numbers are labelled "APRENDER PORTUGUÊS 1 — Unidade N" to avoid conflation. Its TESTE FINAL is a useful mock-exam resource.

## Reference docs (not learning content)
`teacher_matriz` = official A1 exam spec (4 grupos × 50 pts; gramática = 25 itens; escrita 70-90 palavras; **exam 11 Jun 2026**). `teacher_cronograma` = course schedule. These define what the app must cover.

---

# WORKSHEET SCANS findings (3 CamScanner PDFs → teacher_cs* — Aprender Português 1, units 2/4/5/6/7)

## M. Resolved 🟩
| # | Location | Fix |
|---|---|---|
| M1 | teacher_cs1450_p06-09 (verbos -ir table, *vir*, ele/ela/você) | `vens` → `vem` (confirmed vs original; rest of the big irregular table verified correct) |

## N. Scan defect / ambiguous (kept faithful + ⚠️, NOT changed) 🟥
| # | Location | Note |
|---|---|---|
| N1 | teacher_cs1450_p01-05 TEXT B | `telefono para a tu` — the scan **clips the right margin** mid-word ("para a t…"); cannot determine if source is `para ti` / `telefono-te` / a source typo. Flagged ⚠️ in file; needs the un-clipped original. |
| N2 | teacher_cs1450_p06-09 | movement-scheme direction labels (`Faculdade → Casa`, `Portugal → Brasil`) read reversed vs the example sentence — agent's interpretation of printed arrows; low impact, verify if used. |

## O. Handwritten student answers (faithfully split as ✍️, ⚠️) 🟥
These worksheets are filled in by hand (pencil). Printed exercise = faithful; the ✍️ (manuscrito) answers are the STUDENT's own — may contain errors (like the notebook) and are excluded from app data.

## High-value reference tables captured (→ normalized)
`teacher_cs1450_p05` **Preposições de tempo** (a+/de+/em+); `teacher_cs1450_p06-09` *ir/vir/voltar* + meio de transporte (a pé, de carro, de comboio…) + chegar a / sair de + *a vs para* (movement); `teacher_cs1603` possessivos, demonstrativos, **locuções de lugar** (em cima de, debaixo de, ao lado de, em frente de, atrás de, dentro de, perto de, longe de). These directly serve the gender→article→**preposition** focus.
