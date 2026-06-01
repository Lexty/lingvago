#!/usr/bin/env python3
"""Internal self-consistency check across ALL extracted data (verbatim + normalized).
Goal: a word taught/used in one place must not appear elsewhere in a corrupted
spelling (typo, dropped/added accent) that turns it into a different/illegal form.

Two signals:
  (1) DIACRITIC VARIANTS: same letters ignoring accents, but >1 distinct surface form
      across the corpus (e.g. 'Grécia' vs 'Grecia', 'México' vs 'Mexico'). Almost
      always one form is wrong -> human/linguistic review.
  (2) CASE/HYPHEN variants for multiword tokens are handled separately upstream.

This is conservative: it FLAGS for review, it does not auto-decide. Short function
words (é/e, à/a, da/de) are excluded to avoid noise.
"""
import re, json, unicodedata
from pathlib import Path
from collections import defaultdict

BASE = Path("/Users/aleksandrmedvedev/dev/personal/lingvago2/extraction")
WORD_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]{2,}")

# function words / clitics where accent distinguishes real different words -> skip
SKIP = set("""a o e é à da de do das dos na no nas nos em um uma se me te lhe nos vos
que quem como onde qual sou es somos sao sim nao ser ter por para com sem""".split())

def deburr(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower())
                   if unicodedata.category(c) != 'Mn')

def collect():
    occ = defaultdict(lambda: defaultdict(list))  # key -> surface -> [locations]
    files = sorted(BASE.glob("verbatim/*.md")) + sorted(BASE.glob("normalized/*.json"))
    for f in files:
        text = f.read_text(encoding="utf-8", errors="ignore")
        for i, line in enumerate(text.splitlines(), 1):
            for m in WORD_RE.finditer(line):
                w = m.group(0)
                if len(w) < 4:
                    continue
                lw = w.lower()
                if lw in SKIP:
                    continue
                key = deburr(w)
                occ[key][lw].append(f"{f.name}:{i}")
    return occ

def main():
    occ = collect()
    flagged = []
    for key, surfaces in occ.items():
        if len(surfaces) > 1:
            # variants that differ ONLY by diacritics (same deburr) and are not
            # trivially the same lowercased
            forms = list(surfaces.keys())
            # ensure they really differ in accents (not just length/letters already same)
            if len({deburr(x) for x in forms}) == 1 and len(set(forms)) > 1:
                flagged.append((key, surfaces))
    print("# Internal consistency check — diacritic/spelling variants\n")
    if not flagged:
        print("No cross-file spelling variants found. Corpus internally consistent on this axis.\n")
    else:
        print(f"{len(flagged)} word(s) appear with >1 spelling across files — REVIEW each:\n")
        for key, surfaces in sorted(flagged):
            print(f"## '{key}': {len(surfaces)} forms")
            for surf, locs in sorted(surfaces.items(), key=lambda kv: -len(kv[1])):
                shown = ", ".join(locs[:6]) + (" ..." if len(locs) > 6 else "")
                print(f"   - {surf!r:18} ({len(locs)}x)  {shown}")
            print()
    # summary stat
    total_words = sum(len(s) for s in occ.values())
    print(f"\nDistinct deburr-keys: {len(occ)} | total surface forms: {total_words}")

if __name__ == "__main__":
    main()
