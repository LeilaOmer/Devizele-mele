import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  // Cheia anonima — foloseste pentru auth.getUser(token) si invoice_scan_logs.
  // NU schimba la service role aici: auth.getUser(token) valideaza gresit
  // (401 pentru toata lumea) daca clientul e creat cu cheia de service role.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Raporturi bucati/cutie invatate anterior (de orice user, pentru acelasi furnizor) —
// au prioritate fata de ce ghiceste AI-ul din text, pentru ca sunt confirmate manual.
async function getKnownRatios(supplierName: string): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const name = supplierName?.trim()
  if (!name) return map
  const { data } = await getServiceRoleClient()
    .from('product_box_ratios')
    .select('product_name, pieces_per_box')
    .ilike('supplier_name', name)
  if (data) {
    for (const row of data as { product_name: string; pieces_per_box: number }[]) {
      map.set(normalizeName(row.product_name), row.pieces_per_box)
    }
  }
  return map
}

const SYSTEM_PROMPT = `Esti asistent pentru comercianti romani. Extrage din documentul primit (factura, aviz sau bon fiscal de la casa de marcat) furnizorul si lista de produse. Raspunzi DOAR cu JSON, fara text, fara markdown.
Format: {"supplier":"Nume Furnizor SRL","doc_type":"invoice","discounts":{"11":0,"21":0},"items":[{"name":"denumire produs","unit":"buc","price_raw":0,"price_includes_vat":false,"already_per_piece":true,"pieces_per_box":1,"discount":0,"vat":21,"sgr":0,"line_total":0,"quantity":1,"card_discount":0}]}

"doc_type" e "invoice" pentru factura/aviz (implicit), sau "receipt" pentru bon fiscal de la casa de marcat (vezi Regula 9) — completeaza-l intotdeauna.

IMPORTANT — rolul tau e sa CITESTI si sa CLASIFICI, NU sa calculezi. Orice impartire, conversie de TVA sau calcul de pret se face separat, automat, dupa ce raspunzi tu. La factura/aviz ("doc_type":"invoice") tu doar:
- copiezi EXACT numarul tiparit pe factura in "price_raw" (fara sa-l modifici cu nimic)
- marchezi cu true/false daca acel numar contine sau nu TVA ("price_includes_vat")
- marchezi cu true/false daca UM-ul EFECTIV al randului (coloana UM de pe factura, nu textul din denumire) e deja o unitate individuala precum Buc/ST/DZ ("already_per_piece")
- extragi numarul de bucati per ambalaj in "pieces_per_box" (doar daca apare explicit scris, si doar cand already_per_piece=false)
La bon fiscal ("doc_type":"receipt") completezi in schimb "line_total"/"quantity"/"card_discount" — vezi Regula 9, campurile de mai sus (price_raw, already_per_piece, pieces_per_box) nu se folosesc acolo.
NU face niciodata singur impartirea/conversia — modelele AI gresesc des la aritmetica din cap si strica preturile. Daca faci calculul tu insuti in loc sa raportezi numerele brute, rezultatul e considerat gresit.
ATENTIE — cea mai frecventa greseala: cand already_per_piece=true (UM chiar e Buc pe factura), NICIODATA sa nu completezi pieces_per_box cu un numar mai mare ca 1, chiar daca denumirea produsului contine un text de genul "18 BUC/CUT" (aia e doar informatie despre ambalarea de la producator, nu inseamna ca acest rand trebuie impartit).

Daca in imagine sunt vizibile mai multe documente/foi suprapuse (ex: o factura pusa peste alta, colturi de pagini din spate care se vad partial, o alta factura vizibila in fundal) => citeste STRICT documentul din prim-plan, cel mai clar si mai apropiat de camera. Ignora complet orice text din paginile suprapuse/din fundal, chiar daca e partial vizibil — nu il amesteca cu datele documentului principal.

Daca numele furnizorului nu apare vizibil in imagine sau text (ex: poza arata doar o pagina de continuare a facturii, fara antet) => las-a campul "supplier" gol (""). NU inventa sau ghici un nume de furnizor care nu e scris explicit in document.

Campul "discounts" se completeaza PRIMUL, inainte de items. Contine procentul de discount global per cota TVA (ex: {"11":5,"21":5} daca exista "SCONTURI ACORDATE 5.00%" pentru ambele TVA-uri). Daca nu exista discount global, lasa {"11":0,"21":0}. Liniile "SCONTURI ACORDATE X%", "SCONT X%", "REMIZA X%", "REDUCERE X%" cu valoare negativa NU sunt produse — extrage din ele procentul X si TVA-ul si pune-le in "discounts".

REGULI OBLIGATORII:

1. price_raw + price_includes_vat — identifica UNDE e pretul, nu-l calcula:
   - Coloane cu pret CU TVA: "Pret TTI", "Pret unit. TTI", "Pret cu TVA", "Valoare TTI" => price_raw = acel numar tiparit, price_includes_vat = true.
   - Coloane cu pret FARA TVA: "Pret RON", "Pret Ofr", "Pret net", "Pret fara TVA", "Pret unitar", "Pretul net al articolului" => price_raw = acel numar tiparit, price_includes_vat = false.
   - FORMAT WINMENTOR (software roman, ex: Hygiene Puls Center, facturi cu "Discount cumulat"): coloanele per rand sunt in ordinea EXACTA: Cantitate | Pret unitar (lei, fara TVA) | Valoare (lei, fara TVA) | Valoare TVA (lei) | Procent discount.
   - price_raw = valoarea din coloana "Pret unitar", price_includes_vat = false — citeste DIRECT acel numar, nu calcula din altceva.
   - NU aplica discount la price_raw. Discount-ul se pune separat in campul "discount".
   - Linia "Discount cumulat TVA XX%" de la sfarsit este un TOTAL al facturii — ignor-o complet, nu e un produs.
   - Exemplu corect WinMENTOR: rand "KONGA HARD Buc 5,00 14,00 70,00 14,70 -15%" => price_raw=14.00, price_includes_vat=false, discount=15, validare: 14.00 x 5 = 70.00 ✓
   - Exemplu corect WinMENTOR: rand "EFEKT BAIE 1L Buc 5,00 14,26 71,30 14,97 -15%" => price_raw=14.26, price_includes_vat=false, discount=15, validare: 14.26 x 5 = 71.30 ✓
   - FORMAT cu "Pretul net al articolului" / "Valoare neta" (orice furnizor cu aceste coloane): ordinea EXACTA per rand este: Pretul net al articolului (pret unitar fara TVA) | Cantitate | UM | Cota TVA | Valoare neta (total = pret x cantitate).
   - price_raw = valoarea din coloana "Pretul net al articolului" (primul numar din rand), price_includes_vat = false. NICIODATA "Valoare neta" (ultimul numar, totalul).
   - Exemplu corect: rand "1,9820 | 5 | kg | 11% | 9,91" => price_raw=1.9820, price_includes_vat=false, validare: 1.9820 x 5 = 9.91 ✓ (NU 9.91 ca pret!)
   - VALIDARE UNIVERSALA (se aplica oricarui format): price_raw x cantitate ≈ valoarea corespunzatoare de pe factura (fara TVA daca price_includes_vat=false, cu TVA daca true). Daca nu se potriveste, ai ales coloana gresita — incearca alt numar din acel rand.
   - NU imparti singur la (1+cota_tva/100) si NU calcula tu pretul fara TVA — doar raporteaza price_raw + price_includes_vat corect, impartirea se face automat dupa.

2. SGR (Sistemul Garantie-Returnare) — CERINTA LEGALA, nu se ignora:
   - SGR = 0.50 lei fix per unitate de ambalaj returnabil. NU face parte din pretul produsului.
   - supplier_price se calculeaza FARA SGR. SGR nu intra in baza de calcul a adaosului sau TVA.
   - In JSON, campul "sgr" reprezinta valoarea per unitate (0 sau 0.50). Niciodata nu combina SGR cu supplier_price.
   - Linii de tip "SGR", "AMBALAJ SGR", "GARANTIE PET", "GARANTIE AMBALAJ", "SGR STICLA", "SGR DOZA", "Garantie-Returnare", "Doza SGR" => EXCLUDE din lista de produse (sunt pozitii SGR, nu produse).
   - Daca denumirea produsului contine "SGR" (ex: "URSUS 0.33L SGR") => sgr=0.50 la acel produs.
   - Daca exista linie "AMBALAJ SGR STICLA" => potriveste cantitatea cu produsele BUC/ST si seteaza sgr=0.50.
   - Daca exista linie "AMBALAJ SGR DOZA" => seteaza sgr=0.50 la produsele tip doza (DZ/CAN) ale caror cantitati sumate egaleaza cantitatea din linia SGR.
   - Daca exista o singura linie "GARANTIE PET", "GARANTIE AMBALAJ" sau similar la final si cantitatea ei = suma cantitatilor tuturor produselor => aplica sgr=0.50 la TOATE produsele din lista.
   - Produse cu "NAV ST", "NAVETA", "NAV" in denumire => sgr=0 (sticla returnata pe naveta, nu individual).
   - Daca nu exista nicio referinta la SGR => sgr=0 la toate.

3. PROMO / GRATUIT (linii cu pret = 0 si denumire contine "PROMO", "GRATIS", "FREE", "BONUS" sau similar):
   - NU ignora aceste linii! Reprezinta bucati GRATUITE primite cu un produs platit.
   - Cauta produsul platit cu denumire similara (acelasi produs fara cuvantul PROMO).
   - supplier_price efectiv = (cantitate_platita x pret_platit) / (cantitate_platita + cantitate_promo).
   - Creeaza UN SINGUR produs cu cantitatea totala (platita + gratuita) si pretul efectiv calculat.
   - Exemplu: 4608 buc x 4.22 RON + 2304 buc PROMO x 0 RON => supplier_price = 19445.76 / 6912 = 2.8133 RON.

4. REGULA TVA — cotele actuale in Romania sunt 11% (redusa) si 21% (standard):
   PASUL 1 — citeste cota TVA scrisa explicit per produs din factura: coloana "Cota TVA", "%TVA", "Cota", "TVA%", sau valoarea procentuala de pe randul produsului. In XML e-Factura cauta <cbc:Percent> sau TaxPercent per linie.
   PASUL 2 — mapeaza la 11 sau 21: 11% => vat=11; 21% => vat=21. Facturi mai vechi (pre-2024): 9% => vat=11; 19% => vat=21.
   PASUL 3 — NUMAI daca cota TVA nu este vizibila in document (poza decupata, coloana lipsa) => deduci din categorie: apa/alimente/bauturi nealcoolice/lemne/carti/cazare => vat=11; bauturi alcoolice/cosmetice/electrice/textile/materiale => vat=21.
   Foloseste DOAR valorile 11 sau 21 in campul JSON.

5. discount — inainte de a construi JSON-ul, parcurge TOATE liniile facturii si cauta indicatori de discount:
   PASUL 1 — Identifica tipul de discount din factura:
   a) Coloana per produs "% Disc", "Disc%", "Discount%", "Procent discount" => fiecare produs are discount propriu in acea coloana.
   b) Rand imediat sub produs cu "Discount X%" sau "Remiza X%" => aplica X la produsul de deasupra.
   c) Linie la final cu procent (ex: "Discount comercial: 10%") => aplica la TOATE produsele.
   d) Linie la final cu valoare negativa in lei (ex: "Discount: -67.17 lei") => calculeaza discount% = valoare / total * 100, aplica la toate.
   e) Linie cu denumire "SCONTURI ACORDATE X%", "SCONT X%", "REMIZA X%", "REDUCERE X%" — acestea sunt linii de discount global, NU produse:
      - Extrage procentul X din denumire (ex: "SCONTURI ACORDATE 5.00%" => X=5)
      - Uita-te la TVA-ul acelei linii (ex: 11%)
      - Seteaza discount=5 la TOATE produsele cu vat=11 din lista
      - Daca exista doua astfel de linii (una TVA 11%, una TVA 21%) si procentul e acelasi => discount=X la toate produsele
      - NU include aceste linii ca produse in JSON
      - EXEMPLU: factura cu "SCONTURI ACORDATE 5.00%" x2 => fiecare produs din JSON va avea discount=5
   PASUL 2 — Daca nu ai gasit niciun discount in PASUL 1 => discount=0 la toate.
   NU extrage discount din valori TVA, sume totale sau fragmente de numere (ex: "6" din "2136,96" nu este discount).

6. UNITATI DE MASURA — traduce codurile tehnice in unitati lizibile:
   h87, C62, PCE => buc
   KGM => kg
   GRM => g
   LTR => l
   MLT => ml
   MTR => m
   MTK => m2
   MTQ => m3
   TNE => t
   Daca unitatea e deja lizibila (buc, kg, l, etc.) las-o asa.

7. Nu folosi diacritice in text (a nu a, s nu s, t nu t, etc.).

8. CUTII / BAX-URI / SET-URI cu produse individuale ambalate colectiv:
   PASUL 0 — verifica INTAI coloana UM efectiva a randului (nu textul din denumire) si seteaza "already_per_piece": daca UM e deja Buc, ST, DZ sau alta unitate individuala => already_per_piece=true si pieces_per_box = 1 INTOTDEAUNA, oricat de mult ar semana denumirea cu un tipar de raport (ex: "104 GR FR PAD 18 BUC/CUT" cu UM=Buc pe factura => already_per_piece=true, pieces_per_box = 1, produsul e deja vandut pe bucata, "18 BUC/CUT" e doar o informatie despre ambalarea de la producator, NU un raport de aplicat). NU confunda un numar din DENUMIRE cu decizia despre UM — decizia despre UM vine STRICT din coloana UM a facturii, niciodata din text.
   Restul Pasului 1-2 se aplica DOAR cand UM efectiv al randului e Cutie, Cut, Bax, Bx sau Set.

   PASUL 1 — cauta in DENUMIREA produsului un raport explicit bucati-per-ambalaj: tipare ca "NNBUC/CUT", "NN B/CUT", "NNbuc/cut", "(NN buc/cut)", "NNB/CUT X ...", sau pur si simplu "NN BUC" langa denumire. Exemple: "35GR BANOFFEE 24BUC/CUT" => 24; "30G 30B/CUT" => 30; "40 G/24B" => 24; "(18 buc/cut)" => 18; "35 GR 24 BUC" => 24; "24B/CUT X 28G" => 24.
   Daca denumirea e trunchiata si se termina brusc cu o paranteza deschisa urmata de un numar (ex: "...GLZ (18"), acel numar E raportul cautat — descrierea a fost taiata de spatiu pe factura, dar numarul e vizibil si valid. Foloseste-l.

   PASUL 2 — DACA nu gasesti niciun raport in denumirea PROPRIE a produsului, cauta in TOATA lista de produse a facturii (nu doar randul de deasupra sau de dedesubt) un alt produs care:
      a) are ACELASI pret de cutie fara TVA (identic sau aproape identic) SI
      b) are un nume din aceeasi familie (aceleasi primele 2-3 cuvinte din denumire, difera doar aroma/varianta/culoarea) SI
      c) ACELA are un raport bucati/cutie gasit la Pasul 1.
      Daca gasesti o asemenea potrivire => foloseste acelasi raport. Nu conteaza daca produsul-sursa e inainte sau dupa in lista.
      Exemplu: "MAGURA MACARON 35GR CAPPUCCINO" nu are raport in nume, dar "MAGURA MACARON 35GR BANOFFEE 24BUC/CUT" de pe alt rand are acelasi pret de cutie si e din aceeasi familie de produs => foloseste pieces_per_box = 24 si pentru Cappuccino.

   PASUL 3 — DACA tot nu gasesti niciun raport (nici in denumire, nici la un produs asemanator din factura) — produsul e descris DOAR prin greutate/volum total al ambalajului (ex: "1.3 KG", "450 GR"), fara nicio bucata individuala mentionata nicaieri => pieces_per_box = 1 (produsul se vinde ca intreaga cutie/bax, unitate unica).
      Exemplu: "JUMBO 1.3 KG NAP DOINA" => pieces_per_box = 1.

   IMPORTANT: NU imparti tu pretul la pieces_per_box, NU calcula pretul per bucata — doar raporteaza numarul gasit (sau 1 daca nu exista), impartirea se face automat dupa.

9. BON FISCAL (bon de la casa de marcat, ex: Lidl, Kaufland, Auchan, Profi) — format DIFERIT de factura/aviz, cu campuri proprii, NU price_raw/already_per_piece/pieces_per_box:
   RECUNOASTERE: antet cu "S.C. ... S.R.L.", "Cod Fiscal C.I.F.", textul "BON FISCAL" undeva in document => seteaza "doc_type":"receipt".

   Doua formate de layout, ambele posibile pe bon fiscal (citeste-le exact cum sunt tiparite, nu presupune):
   a) LIDL: mai intai linia "cantitate  UM x pret_unitar", APOI pe linia urmatoare denumirea produsului + valoarea totala a liniei + litera TVA. Exemplu: "2,000  BUC x 14,75" urmata de "Selectie de nuci sort.        29,50 B".
   b) KAUFLAND: mai intai denumirea produsului (uneori pe linie separata, uneori nu), APOI o linie cu valoarea totala + litera TVA, care poate fi precedata de cantitate in 3 variante:
      - "N * pret_unitar" (ex: "2 * 7,99") urmata de total (15,98) — produs cumparat de N ori
      - "cantitate UM" FARA inmultire (ex: "1,402 KG") urmata de total (11,20) — produs cantarit, fara pret unitar tiparit separat
      - nicio linie de cantitate (un singur exemplar): "NUME  pret  litera" direct (ex: "CONOPIDA   3,25 C")

   Pentru FIECARE produs de pe bon fiscal, NU calcula tu pretul unitar — raporteaza 3 numere brute, citite exact cum apar, iar impartirea se face automat in cod dupa:
   - "line_total": valoarea totala TIPARITA pe randul produsului (ultimul numar inainte de litera TVA). Mereu cu TVA inclus.
   - "quantity": cantitatea, citita direct: N din "N * pret" => N; numarul din "cantitate UM" fara inmultire (ex: 1,402) => acel numar; daca nu exista nicio linie de cantitate => 1.
   - "card_discount": daca IMEDIAT sub randul produsului apare o linie cu o reducere instant de card de fidelitate (ex: "Kaufland Card XTRA   -7,00", sau orice linie cu valoare NEGATIVA si FARA litera TVA la capat, aparuta chiar dupa acel produs) => card_discount = valoarea absoluta (7.00). Aceasta linie NU e produs, nu o adauga separat in "items". Daca nu exista => card_discount = 0.

   IMPORTANT (produs cantarit, ex. pepene/vinete cumparate la KG): "quantity" e greutatea TOTALA cumparata in acel moment (ex: 1,402 kg dintr-un pepene, sau 10,5 kg de vinete), NU inseamna ca produsul se vinde mai departe ca "un pachet intreg" — "unit" ramane "kg" (sau UM tiparita), pentru ca produsul continua sa se vanda cu bucata din kg, la fel ca oricare alt produs cantarit. NU pune unit="buc" doar pentru ca a fost cumparat un singur exemplar dintr-un produs cantarit.

   Pretul de pe bon e mereu cu TVA inclus — nu mai completa separat "price_includes_vat" pentru produsele de pe bon fiscal, e implicit prin doc_type="receipt".

   CATEGORII TVA (litera de la capatul liniei produsului, A/B/C/D) — NU presupune ce procent inseamna fiecare litera pe dinafara si NU presupune ca e la fel ca la alt bon (ex: la un Lidl B=11%, dar la un Kaufland din alta zi B poate fi 21% si C=11% — e INVERSAT). Citeste-o DIN LEGENDA tiparita la finalul ACESTUI bon (ex: "TVA A 21,00%", "TVA B 11,00%", sau "B=21,00%", "C=11,00%"), construieste maparea litera->procent DOAR din acea legenda a bonului curent, aplica-o fiecarui produs dupa litera lui, apoi mapeaza procentul rezultat la 11 sau 21 conform Regulii 4 Pasul 2.

   LINIE FARA DENUMIRE DE PRODUS CU VALOARE POZITIVA + LITERA (ex: "0,50 D", aparuta imediat dupa linia unui produs, fara niciun text) => este GARANTIA SGR (ambalaj returnabil) a produsului de DEASUPRA ei, NU un produs separat si NU o cere ca linie noua in "items". Seteaza sgr=0.50 la produsul anterior in loc.

   Randurile "Subtotal", "TOTAL", "Plata card", "Rest", "TVA %", "CARD", "TRANZACTIE CARD", "DATA", "ORA", "Casa:", "Mg", "Tz", "TERMINAL", "TID", "PAN", "AID", "APN", "Suma:", "TRX", "NR. CHITANTA", "NR. APROB", "RRN", "REC", "Aprobat", "BON FISCAL", denumirile de sectiuni de raion fara pret propriu (ex: "Alimente", "Congelate", "Dulciuri", "Fructe / Legume / Plante", "Mopro/Branza/Oua", "Drogerie/Gospodarie/Hrana animale/Tabac", "Vitrina asistata"), mesaje de multumire => NU sunt produse, ignora-le complet.`

async function callGroq(model: string, messages: unknown[], maxTokens = 4096) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: maxTokens }),
  })
  const data = await res.json()
  if (res.status === 429) throw new Error('groq_rate_limit')
  if (!res.ok) throw new Error(data.error?.message || `Groq error ${res.status}`)
  return data.choices?.[0]?.message?.content || ''
}

// Incearca parsarea normala; daca raspunsul modelului a fost taiat la mijloc
// (depaseste max_tokens, sau conexiunea se intrerupe), recupereaza produsele
// care au apucat sa fie generate COMPLET inainte de taietura, in loc sa
// pierzi tot raspunsul pentru un singur produs neterminat de la coada.
function parseJson(raw: string) {
  const start = raw.indexOf('{')
  if (start === -1) return null
  const text = raw.slice(start)

  const fullMatch = text.match(/\{[\s\S]*\}/)
  if (fullMatch) {
    try { return JSON.parse(fullMatch[0]) } catch {}
  }

  const itemsIdx = text.indexOf('"items"')
  if (itemsIdx === -1) return null
  for (let i = text.length - 1; i >= itemsIdx; i--) {
    if (text[i] !== '}') continue
    const candidate = text.slice(0, i + 1) + ']}'
    try {
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed.items) && parsed.items.length > 0) return parsed
    } catch {}
  }
  return null
}

function validateAndSanitize(data: unknown, knownRatios: Map<string, number>) {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.items)) return null

  const isReceipt = d.doc_type === 'receipt'

  // Extract global discounts by VAT rate from the top-level "discounts" field
  const globalDiscounts: Record<number, number> = {}
  if (d.discounts && typeof d.discounts === 'object') {
    for (const [vatKey, disc] of Object.entries(d.discounts as Record<string, unknown>)) {
      if (vatKey !== '11' && vatKey !== '21') continue
      const vatNum = vatKey === '11' ? 11 : 21
      const discNum = Number(disc)
      if (discNum > 0 && discNum <= 100) globalDiscounts[vatNum] = discNum
    }
  }
  delete d.discounts
  delete d.doc_type

  d.items = d.items
    .filter((i: unknown) => {
      if (!i || typeof i !== 'object') return false
      const item = i as Record<string, unknown>
      if (typeof item.name !== 'string' || item.name.trim() === '') return false
      if (isReceipt) return typeof item.line_total === 'number' && item.line_total > 0
      return typeof item.price_raw === 'number' && item.price_raw > 0
    })
    .map((i: unknown) => {
      const item = i as Record<string, unknown>
      const vatNum = Number(item.vat)
      const vat = (vatNum > 0 && vatNum <= 15) ? 11 : 21
      const sgr = Number(item.sgr) === 0.5 ? 0.5 : 0

      if (isReceipt) {
        // Bon fiscal: pretul e mereu cu TVA inclus, iar impartirea la cantitate
        // (buc sau kg cantarite) si scaderea reducerii de card de fidelitate se
        // fac aici, deterministic — modelul doar citeste line_total/quantity/
        // card_discount exact cum apar tiparite, fara sa le combine el insusi.
        const lineTotal = Number(item.line_total) || 0
        const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1
        const cardDiscount = Number(item.card_discount) > 0 ? Number(item.card_discount) : 0
        const netTotal = Math.max(lineTotal - cardDiscount, 0)
        const grossUnitPrice = netTotal / quantity
        const supplierPrice = Math.round((grossUnitPrice / (1 + vat / 100)) * 10000) / 10000
        const unit = typeof item.unit === 'string' && item.unit.trim() ? item.unit : 'buc'
        return { name: item.name, unit, supplier_price: supplierPrice, vat, discount: 0, sgr }
      }

      const itemDiscount = Number(item.discount)
      const discount = (itemDiscount > 0 && itemDiscount <= 100)
        ? itemDiscount
        : (globalDiscounts[vat] ?? 0)

      // Toata aritmetica (scoatere TVA + impartire cutie/bax pe bucata) se face
      // aici, deterministic in cod — modelul AI doar citeste si clasifica
      // (price_raw, price_includes_vat, pieces_per_box), calculul lui de cap era nesigur.
      const priceRaw = Number(item.price_raw)
      const priceExVat = item.price_includes_vat === true ? priceRaw / (1 + vat / 100) : priceRaw
      // Siguranta determinista, in cod, nu doar in prompt: daca modelul insusi
      // a raportat ca UM-ul de pe factura pentru randul asta era deja Buc/ST/DZ
      // (already_per_piece), NU impartim niciodata, indiferent ce pieces_per_box
      // a ghicit sau ce raport e cunoscut pentru acel nume de produs de la alte
      // facturi — modelul repeta uneori aceasta greseala desi Regula 8 Pasul 0
      // ii spune explicit sa nu o faca.
      const alreadyPerPiece = item.already_per_piece === true
      const knownPieces = knownRatios.get(normalizeName(String(item.name)))
      const piecesPerBoxRaw = Math.round(Number(item.pieces_per_box))
      const aiPieces = Number.isFinite(piecesPerBoxRaw) && piecesPerBoxRaw > 1 ? piecesPerBoxRaw : 1
      // Un raport confirmat manual anterior (aceeasi factura/furnizor) e mai de incredere decat ghiceala AI-ului din text.
      const piecesPerBox = alreadyPerPiece ? 1 : ((knownPieces && knownPieces > 1) ? knownPieces : aiPieces)
      const supplierPrice = Math.round((priceExVat / piecesPerBox) * 10000) / 10000
      const unit = piecesPerBox > 1 ? 'buc' : (typeof item.unit === 'string' && item.unit.trim() ? item.unit : 'buc')

      return {
        name: item.name,
        unit,
        supplier_price: supplierPrice,
        vat,
        discount,
        sgr,
      }
    })
  return d
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Rate limiting: max 50 scans/zi pentru toti userii (contor simplu in DB)
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('invoice_scan_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', today)
  if ((count ?? 0) >= 50) {
    return NextResponse.json({ error: 'rate_limit', message: 'Limita de 50 scanari/zi atinsa.' }, { status: 429 })
  }

  const body = await req.json()

  try {
    if (body.imageBase64) {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${body.mimeType || 'image/jpeg'};base64,${body.imageBase64}` } },
            { type: 'text', text: 'Extrage furnizorul si produsele din acest document (factura, aviz sau bon fiscal) conform regulilor.' },
          ],
        },
      ]
      const raw = await callGroq('meta-llama/llama-4-scout-17b-16e-instruct', messages, 8192)
      const parsed = parseJson(raw)
      const knownRatios = await getKnownRatios(typeof parsed?.supplier === 'string' ? parsed.supplier : '')
      const result = validateAndSanitize(parsed, knownRatios)
      if (result) await supabase.from('invoice_scan_logs').insert({ user_id: user.id })
      return NextResponse.json(result ?? { items: [], error: 'vision_failed' })
    }

    let text = ''
    if (body.docBase64) {
      const buf = Buffer.from(body.docBase64, 'base64')
      const mime: string = body.mimeType || ''
      if (mime.includes('pdf') || (body.fileName as string | undefined)?.toLowerCase().endsWith('.pdf')) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js')
        const parsed = await pdfParse(buf)
        text = parsed.text
      } else {
        text = buf.toString('utf-8')
      }
    } else if (body.text) {
      text = body.text
    } else {
      return NextResponse.json({ items: [] }, { status: 400 })
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text.slice(0, 6000) },
    ]
    // max_tokens e rezervat integral din bugetul TPM de Groq inainte sa vada raspunsul real,
    // deci trebuie tinut jos ca sa incapa alaturi de system prompt-ul, care a crescut cu regulile noi.
    const raw = await callGroq('llama-3.3-70b-versatile', messages, 4096)
    const parsed = parseJson(raw)
    const knownRatios = await getKnownRatios(typeof parsed?.supplier === 'string' ? parsed.supplier : '')
    const result = validateAndSanitize(parsed, knownRatios)
    if (result) await supabase.from('invoice_scan_logs').insert({ user_id: user.id })
    return NextResponse.json(result ?? { items: [] })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    if (msg === 'groq_rate_limit') return NextResponse.json({ items: [], error: 'groq_rate_limit' }, { status: 503 })
    return NextResponse.json({ items: [], error: msg }, { status: 500 })
  }
}
