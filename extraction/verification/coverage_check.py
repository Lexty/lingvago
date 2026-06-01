#!/usr/bin/env python3
"""Channel B (OCR) vs Channel A (verbatim) coverage check.
For each printed page, list OCR tokens absent from the verbatim transcription
(potential omissions). Notebook is handwritten -> OCR unreliable, skipped.
"""
import re, sys, unicodedata
from pathlib import Path

BASE = Path("/Users/aleksandrmedvedev/dev/personal/lingvago2/extraction")

# page (ocr file stem) -> verbatim file
PAGE_TO_VERBATIM = {
    "livro_phys11": "livro_unit01.md", "livro_phys12": "livro_unit01.md",
    "livro_phys13": "livro_unit01.md", "livro_phys14": "livro_unit01.md",
    "livro_phys15": "livro_unit02.md", "livro_phys16": "livro_unit02.md",
    "livro_phys17": "livro_unit02.md", "livro_phys18": "livro_unit02.md",
    "caderno_phys05": "caderno_unit01.md", "caderno_phys06": "caderno_unit01.md",
    "caderno_phys07": "caderno_unit02.md", "caderno_phys08": "caderno_unit02.md",
}

def norm(s):
    s = s.lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return s

def tokens(text):
    # words of >=3 letters (a-z after accent stripping)
    return set(re.findall(r"[a-z]{3,}", norm(text)))

# common OCR noise / words we don't care about
STOP = set("passaporte portugues lidel edicoes tecnicas lda www pagina paginas".split())

def main():
    verbatim_cache = {}
    total_missing = 0
    print("# Coverage check: OCR (B) tokens absent from verbatim (A)\n")
    for stem, vfile in PAGE_TO_VERBATIM.items():
        ocr_path = BASE / "ocr" / f"{stem}.txt"
        vpath = BASE / "verbatim" / vfile
        if not ocr_path.exists() or not vpath.exists():
            print(f"## {stem}: MISSING FILE"); continue
        if vfile not in verbatim_cache:
            verbatim_cache[vfile] = tokens(vpath.read_text(encoding="utf-8", errors="ignore"))
        vtok = verbatim_cache[vfile]
        otok = tokens(ocr_path.read_text(encoding="utf-8", errors="ignore"))
        missing = sorted(t for t in (otok - vtok - STOP) if len(t) >= 4)
        cover = 1 - len(missing)/max(1, len(otok))
        flag = "OK" if len(missing) <= 8 else "REVIEW"
        print(f"## {stem} -> {vfile}  [{flag}]  ocr_tokens={len(otok)} missing={len(missing)} coverage~{cover:.0%}")
        if missing:
            print("   absent: " + ", ".join(missing))
        print()
        total_missing += len(missing)
    print(f"\nTOTAL distinct-per-page OCR tokens absent from verbatim: {total_missing}")
    print("Note: most 'absent' tokens are OCR noise/word-fragments, not true omissions; scan list for real content words.")

if __name__ == "__main__":
    main()
