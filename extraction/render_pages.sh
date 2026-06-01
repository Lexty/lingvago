#!/bin/bash
# Render pages at native resolution. pdfimages -all gets the embedded image in its
# native encoding; convert any non-jpg (ppm/png) to jpg via sips. One full-page image per page.
set -u
RES="/Users/aleksandrmedvedev/dev/personal/lingvago2/.local/resources"
OUT="/Users/aleksandrmedvedev/dev/personal/lingvago2/extraction/renders"
TMP="$OUT/_tmp"; mkdir -p "$TMP"
LIVRO="$RES/passaporte_para_portugues_1_niveis_a1a2_livro_do_aluno_1.pdf"
CAD="$RES/passaporte_para_portugues_1_niveis_a1a2_caderno_de_exercicio_1.pdf"
NB="$RES/notebook.pdf"

render_one() { # src prefix page
  local src="$1" pref="$2" p="$3"
  local dst="$OUT/${pref}_phys$(printf %02d "$p").jpg"
  [ -f "$dst" ] && { echo "skip $dst"; return; }
  rm -f "$TMP"/x-* 2>/dev/null
  pdfimages -all -f "$p" -l "$p" "$src" "$TMP/x" >/dev/null 2>&1
  local f
  f=$(ls -S "$TMP"/x-* 2>/dev/null | head -1)   # largest = full-page image
  if [ -z "$f" ]; then echo "FAIL noimg $pref $p"; return; fi
  case "$f" in
    *.jpg|*.jpeg) cp "$f" "$dst" ;;
    *) sips -s format jpeg "$f" --out "$dst" >/dev/null 2>&1 || echo "FAIL conv $pref $p" ;;
  esac
  echo "ok $dst"
}

for p in $(seq 19 98); do render_one "$LIVRO" livro "$p"; done
for p in $(seq 9 44);  do render_one "$CAD"  caderno "$p"; done
for p in $(seq 5 25);  do render_one "$NB"   notebook "$p"; done
rm -rf "$TMP"
echo "=== total renders ==="; ls "$OUT"/*.jpg | wc -l
