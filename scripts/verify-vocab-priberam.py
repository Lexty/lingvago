# Checks the Portuguese side of every pack's Anki vocabulary against Priberam:
#  - each content word of the card is a Priberam entry or a recognised form of
#    one (catches spelling and missing accents);
#  - a card starting with an article (`o X`, `a X de Y`) has that gender on the
#    entry of its head noun X: Priberam must label X `nome masculino` /
#    `nome feminino`. `nome de dois géneros` counts only for nouns listed in
#    TWO_GENDER, because an entry can carry it for an unrelated sense (mala:
#    a Brazilian colloquial word for a person) — a page-wide match would let
#    `o mala` through.
# It does NOT check which SENSE of an entry the card means, nor the meanings:
# those are reviewed by people. A pass means "these words exist as written and
# the head noun can have this gender", nothing more.
# Usage (from the repo root): pnpm exec tsx scripts/dump-vocab.ts | python3 scripts/verify-vocab-priberam.py
# Exit code 1 if anything failed or could not be checked.

import html, json, re, sys, time, urllib.error, urllib.parse, urllib.request

FUNCTION_WORDS = {
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'no', 'na', 'num', 'com',
    'mais', 'menos', 'tão', 'como', 'que', '…', 'do que',
}

# Nouns used here as nouns of two genders (o/a jornalista).
TWO_GENDER = {'jornalista'}

cache = {}

def page(word):
    if word in cache:
        return cache[word]
    url = 'https://dicionario.priberam.org/' + urllib.parse.quote(word)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        t = urllib.request.urlopen(req, timeout=25).read().decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
        # Priberam answers an unknown word with 404 and its "not found" page.
        t = e.read().decode('utf-8', 'ignore')
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', t, flags=re.S)
    x = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t)))
    cache[word] = x
    time.sleep(0.3)
    return x

def is_entry(word):
    x = page(word)
    # The result block starts at "Dicionário Priberam <word> Significado de <word>";
    # an unknown spelling (e.g. a missing accent: telemovel) says
    # "Palavra não encontrada" right there. A form of an entry (luzes) is found.
    i = x.find(f'Dicionário Priberam {word} Significado de {word}')
    if i < 0:
        raise ValueError(f'unexpected page for {word}')
    return 'Palavra não encontrada' not in x[i:i + 200]

cards = json.load(sys.stdin)
ok, bad, unknown = [], [], []
for c in cards:
    pt = c['pt']
    words = [w for w in re.split(r"[\s/!]+", pt.lower()) if w and w not in FUNCTION_WORDS]
    try:
        missing = [w for w in words if not is_entry(w)]
        problems = [f'not an entry: {w}' for w in missing]
        m = re.match(r'(o|a) (\S+)', pt)
        if m and not missing:
            gender = 'masculino' if m.group(1) == 'o' else 'feminino'
            head = m.group(2)
            x = page(head)
            two = head in TWO_GENDER and 'nome de dois géneros' in x
            if f'nome {gender}' not in x and not two:
                problems.append(f'gender {gender} not on the entry of {head}')
    except Exception as e:  # network or parse failure: neither ok nor bad
        unknown.append((pt, repr(e)))
        continue
    (bad if problems else ok).append((c['pack'], pt, problems))

print('OK', len(ok))
print('FAILED', len(bad))
for b in bad:
    print(' ', b)
print('UNKNOWN', len(unknown))
for u in unknown:
    print(' ', u)
sys.exit(1 if bad or unknown else 0)
