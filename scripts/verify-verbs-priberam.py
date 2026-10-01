# Reproduces the check behind extraction/normalized/verbs_regular_verified.json:
# reads the Presente do Indicativo of each candidate verb from its Priberam
# conjugation page and compares it with the regular-rule output.
# Usage (from the repo root): python3 scripts/verify-verbs-priberam.py out.json

import json,re,html,sys,urllib.parse,urllib.request,time
inv=json.load(open('extraction/normalized/verbs_inventory.json'))['verbs']
have={v['infinitive'] for v in inv}
cands=[v['infinitive'] for v in inv if v.get('regular') is None and v.get('group') in('-ar','-er','-ir') and not v.get('reflexive') and '-' not in v['infinitive'] and ' ' not in v['infinitive']]
extra=['precisar','gastar','poupar','custar']
END={'ar':['o','as','a','amos','am'],'er':['o','es','e','emos','em'],'ir':['o','es','e','imos','em']}
def rule(inf):
    stem,g=inf[:-2],inf[-2:]
    f=[stem+e for e in END[g]]
    if inf.endswith('cer'): f[0]=inf[:-3]+'ço'
    elif inf.endswith('ger') or inf.endswith('gir'): f[0]=inf[:-3]+'jo'
    elif inf.endswith('guir'): f[0]=inf[:-4]+'go'
    return f
def priberam(inf):
    url='https://dicionario.priberam.org/conjugar/'+urllib.parse.quote(inf)
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    t=urllib.request.urlopen(req,timeout=25).read().decode('utf-8','ignore')
    t=re.sub(r'<script.*?</script>|<style.*?</style>','',t,flags=re.S)
    x=re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',t)))
    # Anchor on the INDICATIVE mood: its Presente is the first tense after the heading.
    i=x.find('Indicativo')
    if i<0: raise ValueError('no Indicativo section')
    m=re.search(r'Presente eu (\S+) tu (\S+) ele/ ela/ você (\S+) nós (\S+) vós \S+ eles/ elas/ vocês (\S+)',x[i:])
    if not m: raise ValueError('Presente not found')
    return list(m.groups())
# Three outcomes, kept apart: verified regular / verified NOT regular / unknown
# (network or parse failure). Unknown is never treated as either of the others.
ok=[];bad=[];unknown=[]
for inf in cands+[e for e in extra if e not in have]:
    r=rule(inf)
    try: p=priberam(inf)
    except Exception as e:
        unknown.append((inf,repr(e))); continue
    (ok if p==r else bad).append((inf,p,r))
    time.sleep(0.3)
print('REGULAR',len(ok),[x[0] for x in ok])
print('NOT REGULAR',len(bad))
for b in bad: print(' ',b)
print('UNKNOWN',len(unknown))
for u in unknown: print(' ',u)
json.dump({'ok':[x[0] for x in ok],'forms':{x[0]:x[1] for x in ok}},open(sys.argv[1],'w'),ensure_ascii=False)
sys.exit(1 if unknown else 0)
