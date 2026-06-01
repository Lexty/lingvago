#!/usr/bin/env python3
"""Bucketed OCR-vs-verbatim coverage for the full corpus.
For each source bucket (livro / caderno), concatenate all OCR text and all verbatim
text, and report OCR content-words (>=5 letters) absent from verbatim -> potential
omissions. Notebook excluded (handwriting OCR is unreliable). Most 'absent' tokens are
OCR noise; scan the list for real content words that signal a dropped block.
"""
import re, unicodedata
from pathlib import Path
BASE = Path("/Users/aleksandrmedvedev/dev/personal/lingvago2/extraction")

def deburr(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower())
                   if unicodedata.category(c) != 'Mn')
def toks(text, n=5):
    return set(t for t in re.findall(r"[a-z]{%d,}" % n, deburr(text)))

BUCKETS = {
  "livro":   ("livro_phys",   "livro_"),
  "caderno": ("caderno_phys", "caderno_"),
}
print("# Bucketed OCR coverage (full corpus)\n")
for name,(ocr_pref, verb_pref) in BUCKETS.items():
    ocr_text = " ".join(p.read_text(encoding="utf-8",errors="ignore")
                        for p in BASE.glob(f"ocr/{ocr_pref}*.txt"))
    verb_text = " ".join(p.read_text(encoding="utf-8",errors="ignore")
                         for p in BASE.glob(f"verbatim/{verb_pref}*.md"))
    o, v = toks(ocr_text), toks(verb_text)
    missing = sorted(o - v)
    cover = 1 - len(missing)/max(1,len(o))
    print(f"## {name}: ocr_content_words={len(o)} covered~{cover:.1%} absent={len(missing)}")
    # show only plausibly-real words (length>=6, alphabetic) to cut OCR noise
    real = [m for m in missing if len(m) >= 6]
    print("   absent(>=6 chars, scan for real content): " + ", ".join(real[:60]))
    print()
