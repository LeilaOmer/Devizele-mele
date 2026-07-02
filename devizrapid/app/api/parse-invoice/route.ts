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
Format: {"supplier":"Nume Furnizor SRL","doc_type":"invoice","discounts":{"11":0,"21":0},"items":[{"name":"denumire produs","unit":"buc","price_raw":0,"price_includes_vat":false,"pieces_per_box":1,"discount":0,"vat":21,"sgr":0,"line_total":0,"quantity":1,"card_discount":0}]}

"doc_type" e "invoice" pentru factura/aviz (implicit), sau "receipt" pentru bon fiscal de la casa de marcat (vezi Regula 9) — completeaza-l intotdeauna.

IMPORTANT — rolul tau e sa CITESTI si sa TRANSCRII, NU sa calculezi. Orice impartire, conversie de TVA, decizie cutie-vs-bucata sau calcul de pret se face separat, automat, dupa ce raspunzi tu. La factura/aviz ("doc_type":"invoice") tu doar:
- copiezi EXACT numarul tiparit pe factura in "price_raw" (fara sa-l modifici cu nimic)
- marchezi cu true/false daca acel numar contine sau nu TVA ("price_includes_vat")
- copiezi in "unit" EXACT valoarea din coloana UM a randului, verbatim (ex: "Buc", "Cut", "kg", "ST") — NU o traduce si NU o deduce din denumire. Aceasta coloana decide (in cod) daca randul e cutie de impartit sau nu.
- extragi in "pieces_per_box" numarul de bucati per ambalaj DOAR daca apare explicit scris in denumire (ex: "24BUC/CUT" => 24); altfel 1. Il completezi indiferent de UM — codul decide daca il foloseste.
- completezi "quantity" (cantitatea) si "line_total" (valoarea randului, acelasi regim TVA ca price_raw) ori de cate ori exista coloane clare de cantitate si valoare — sunt supapa de verificare.
La bon fiscal ("doc_type":"receipt") completezi in schimb "line_total"/"quantity"/"card_discount" — vezi Regula 9.
NU face niciodata singur impartirea/conversia — modelele AI gresesc des la aritmetica din cap si strica preturile. Daca faci calculul tu insuti in loc sa raportezi numerele brute, rezultatul e considerat gresit.

Daca in imagine sunt vizibile mai multe documente/foi suprapuse (ex: o factura pusa peste alta, colturi de pagini din spate care se vad partial, o alta factura vizibila in fundal) => citeste STRICT documentul din prim-plan, cel mai clar si mai apropiat de camera. Ignora complet orice text din paginile suprapuse/din fundal, chiar daca e partial vizibil — nu il amesteca cu datele documentului principal.

Daca numele furnizorului nu apare vizibil in imagine sau text (ex: poza arata doar o pagina de continuare a facturii, fara antet) => las-a campul "supplier" gol (""). NU inventa sau ghici un nume de furnizor care nu e scris explicit in document.

Campul "discounts" se completeaza PRIMUL, inainte de items. Contine procentul de discount global per cota TVA (ex: {"11":5,"21":5} daca exista "SCONTURI ACORDATE 5.00%" pentru ambele TVA-uri). Daca nu exista discount global, lasa {"11":0,"21":0}. Liniile "SCONTURI ACORDATE X%", "SCONT X%", "REMIZA X%", "REDUCERE X%" cu valoare negativa NU sunt produse — extrage din ele procentul X si TVA-ul si pune-le in "discounts".

REGULI OBLIGATORII:

1. price_raw + price_includes_vat + quantity + line_total — METODA GENERALA (functioneaza pe orice format de factura, inclusiv unul nemaivazut, nu doar formatele stiute — nu incerca sa recunosti un soft anume, recunoaste STRUCTURA):
   PASUL 1 — pe fiecare rand de produs, gaseste coloanele (dupa headerul lor, in orice limba/prescurtare): Cantitate (Cant./Cantitate/Cant.cda/Buc/Qty), Pret unitar (Pret/Pret unitar/Pret RON/Pret TTI/Pret unit./Pretul net al articolului), Valoare/Total rand (Valoare/Total/Valoare neta/Valoare TTI), Cota TVA (TVA%/Cota/Cota TVA).
   PASUL 2 — decide regimul de TVA al pretului DUPA TEXTUL headerului, nu ghici: header cu "TTI"/"cu TVA" => price_includes_vat=true; header cu "net"/"fara TVA"/fara mentiune speciala => price_includes_vat=false.
   PASUL 3 — VALIDARE OBLIGATORIE, mai de incredere decat orice nume de coloana: cantitate x pret_unitar trebuie sa dea (aproximativ) valoarea randului, in ACELASI regim de TVA. Daca nu se potriveste, ai citit gresit coloana sau cifrele — cauta alta combinatie pe acel rand pana se potriveste. NU accepta o citire care nu trece aceasta validare.
   PASUL 4 — cifrele unui rand extras dintr-un PDF apar des LIPITE fara spatii (ex: "buc92169.4687183.36" in loc de "buc 9216 9.46 87183.36"). NU ghici o singura taietura din instinct — incearca mai multe taieturi posibile ale sirului si pastreaz-o pe cea care trece validarea de la Pasul 3.
   PASUL 5 — completeaza INTOTDEAUNA, pe langa price_raw, si "quantity" (cantitatea gasita) si "line_total" (valoarea randului, acelasi regim de TVA ca price_raw) — chiar si atunci cand esti sigur pe price_raw. Sunt o supapa de siguranta: daca totusi ai citit gresit price_raw dintr-un sir lipit, quantity+line_total corecte permit corectarea automata in cod dupa (price_raw_final = line_total / quantity, cand nu se potrivesc). Daca randul chiar nu are cantitate proprie (ex: un serviciu unic, cantitate implicita 1) => quantity=1, line_total=0.
   NU imparti singur la (1+cota_tva/100), NU calcula tu pretul fara TVA, NU aplica discountul la price_raw (discountul e separat, campul "discount") — doar raporteaza numerele brute corect, calculul se face automat dupa.

   Exemple care ARATA METODA de mai sus (nu formate speciale de memorat separat):
   - "KONGA HARD Buc 5,00 14,00 70,00 14,70 -15%" => quantity=5, price_raw=14.00 (fara TVA), line_total=70.00 (5 x 14.00 = 70.00 ✓), discount=15 (separat, nu se aplica la price_raw).
   - "1,9820 | 5 | kg | 11% | 9,91" => quantity=5, price_raw=1.9820 (primul numar, NU 9.91 care e totalul randului), line_total=9.91 (1.9820 x 5 = 9.91 ✓).
   - "buc92169.4687183.36" (cifre lipite) => incearca taieturi pana gasesti quantity=9216, price_raw=9.46, line_total=87183.36 (9216 x 9.46 = 87183.36 ✓) — NU 69.46, care nu trece validarea.

   Exceptii de retinut (nu formate noi, doar cazuri unde citirea directa poate insela):
   - Antet cu sigla "Meti" (bon de comanda cu sectiunile Magazin/Adresa de facturare/Adresa de livrare, ex. magazine SUPECO): "Meti" e numele soft-ului care genereaza documentul, NU furnizorul — furnizorul real e compania de la sectiunea "Magazin". Sub fiecare produs pot aparea linii "Disponibil pe DD/MM/YYYY"/"Emporte immediat pe DD/MM/YYYY" — sunt doar informatii logistice, ignora-le complet.
   - Linia "GARANTIE PET" (sau similar) de la finalul listei, cu cantitatea egala cu suma cantitatilor produselor de deasupra, NU e produs — vezi Regula 2 (SGR).
   - O linie care rezuma/totalizeaza intreaga factura (ex: "Discount cumulat TVA 21%", "Total general", "Subtotal", orice linie fara denumire de produs propriu-zisa) NU e produs, chiar daca are numere pe ea — nu o include in "items".
   - FORMAT e-FACTURA OBLIO/ANAF (coloane "Nr | Denumire produs/serviciu | U.M. | Cant. | Pret unitar (RON fara TVA) | Valoare (RON) | TVA (RON)", cu procentul de TVA scris pe randul de dedesubt, ex: "11% - Redusa" sau "0% - Scutita"): la extragerea din PDF, cifrele de pe acelasi rand apar adesea LIPITE fara spatii intre ele (ex: "buc23042.79276434.59707.78"). NU ghici o singura despartire — foloseste VALIDAREA UNIVERSALA de mai sus: cauta acea combinatie Cantitate + Pret_unitar + Valoare + TVA din cifrele lipite pentru care Cantitate x Pret_unitar ≈ Valoare SI TVA / Valoare ≈ procentul scris dedesubt. Exemplu: "buc23042.79276434.59707.78" cu "11% - Redusa" dedesubt => Cant=2304, Pret unitar=2.7927, Valoare=6434.59, TVA=707.78 (2304 x 2.7927 ≈ 6434.59, 707.78/6434.59 ≈ 11%, ambele confirma taietura). price_raw=2.7927, price_includes_vat=false. O linie cu "0% - Scutita" dedesubt (ex: GARANTIE PET) NU e un produs normal cu vat=0 — e mereu o linie SGR, trateaz-o conform Regulii 2.

2. SGR (Sistemul Garantie-Returnare) — CERINTA LEGALA, nu se ignora:
   - SGR = 0.50 lei fix per unitate de ambalaj returnabil. NU face parte din pretul produsului.
   - supplier_price se calculeaza FARA SGR. SGR nu intra in baza de calcul a adaosului sau TVA.
   - In JSON, campul "sgr" reprezinta valoarea per unitate (0 sau 0.50). Niciodata nu combina SGR cu supplier_price.
   - Linii de tip "SGR", "AMBALAJ SGR", "GARANTIE PET", "GARANTIE AMBALAJ", "GARANTIE STICLA", "GARANTIE DOZA", "SGR STICLA", "SGR DOZA", "Garantie-Returnare", "Doza SGR" => EXCLUDE din lista de produse (sunt pozitii SGR, nu produse) — INDIFERENT de ordinea cuvintelor ("GARANTIE DOZA" = "DOZA SGR" = "SGR DOZA", toate inseamna acelasi lucru: garantie ambalaj tip doza).
   - Daca denumirea produsului contine "SGR" (ex: "URSUS 0.33L SGR") => sgr=0.50 la acel produs.
   - Daca exista linie "AMBALAJ SGR STICLA" sau "GARANTIE STICLA" => potriveste cantitatea cu produsele imbuteliate in sticla (BUC/ST) si seteaza sgr=0.50 la acelea.
   - Daca exista linie "AMBALAJ SGR DOZA" sau "GARANTIE DOZA" => seteaza sgr=0.50 la produsele tip doza/can (DZ/CAN) ale caror cantitati sumate egaleaza cantitatea din linia de garantie.
   - Daca exista o singura linie "GARANTIE PET", "GARANTIE STICLA", "GARANTIE DOZA", "GARANTIE AMBALAJ" sau similar la final si cantitatea ei = suma cantitatilor tuturor produselor (sau a produsului unic de deasupra, daca e un singur produs pe factura) => aplica sgr=0.50 la produsele respective. Aceasta e valabil chiar si pe facturi/e-Facturi normale cu coloane complete (Cant/Pret/Valoare/TVA), unde linia de garantie apare ca un rand normal cu TVA 0% ("0% - Scutita") — tot NU e produs, se exclude la fel.
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

8. pieces_per_box — numarul de bucati per ambalaj (folosit de cod DOAR daca UM-ul din "unit" e cutie/bax/set; tu doar il raportezi, nu decizi si nu imparti):
   Cauta in DENUMIREA produsului un raport explicit bucati-per-ambalaj: tipare ca "NNBUC/CUT", "NN B/CUT", "NNbuc/cut", "(NN buc/cut)", "NNB/CUT X ...", sau pur si simplu "NN BUC" langa denumire. Exemple: "35GR BANOFFEE 24BUC/CUT" => 24; "30G 30B/CUT" => 30; "40 G/24B" => 24; "(18 buc/cut)" => 18; "35 GR 24 BUC" => 24; "24B/CUT X 28G" => 24.
   Daca denumirea e trunchiata si se termina brusc cu o paranteza deschisa urmata de un numar (ex: "...GLZ (18"), acel numar E raportul cautat — descrierea a fost taiata de spatiu pe factura, dar numarul e vizibil si valid. Foloseste-l.
   Daca nu apare niciun numar de bucati in denumire => pieces_per_box = 1. NU inventa un raport si NU incerca sa-l deduci de la alt produs (potrivirea intre produse din aceeasi familie o face codul automat). NU imparti tu pretul la pieces_per_box — raportezi doar numarul gasit.

9. BON FISCAL (bon de la casa de marcat, ex: Lidl, Kaufland, Auchan, Profi) — format DIFERIT de factura/aviz, cu campuri proprii, NU price_raw/pieces_per_box:
   RECUNOASTERE — NU clasifica dupa antet cu "S.C. ... S.R.L." sau "Cod Fiscal C.I.F." (astea apar si pe orice factura normala, nu sunt semn de bon fiscal!). Seteaza "doc_type":"receipt" NUMAI cand documentul e clar un bon de casa de marcat: NU are nicaieri titlul "FACTURA" sau "AVIZ DE INSOTIRE A MARFII", produsele sunt insirate simplu unul dupa altul (nu intr-un tabel cu coloane aliniate), SI apare fie textul "BON FISCAL", fie o legenda finala cu litere de TVA (A/B/C/D + procente, gen "TVA A 21,00%" sau "B=21,00%"). Daca ai vreo indoiala => "doc_type":"invoice" (varianta implicita, sigura).

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
  if (res.status === 429) {
    // Groq da 429 si pentru limita reala de rate (tranzitorie, reincercarea ajuta),
    // si pentru "cerere prea mare pentru bugetul de tokeni/minut" (permanenta pentru
    // ACEEASI factura — reincercarea NU ajuta niciodata, marimea cererii nu se schimba).
    // Le distingem dupa textul erorii, ca sa nu mai spunem gresit userului sa mai astepte.
    // Pastram si textul brut dupa "::" ca sa putem diagnostica exact ce a raspuns Groq,
    // fara acces la logurile serverului.
    const msg = String(data.error?.message || '')
    if (/tokens per minute|request too large|TPM/i.test(msg)) throw new Error('groq_too_large::' + msg)
    throw new Error('groq_rate_limit::' + msg)
  }
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

  const filtered = (d.items as unknown[]).filter((i: unknown) => {
    if (!i || typeof i !== 'object') return false
    const item = i as Record<string, unknown>
    if (typeof item.name !== 'string' || item.name.trim() === '') return false
    if (isReceipt) return typeof item.line_total === 'number' && item.line_total > 0
    const hasPriceRaw = typeof item.price_raw === 'number' && item.price_raw > 0
    const hasLineTotalQty = typeof item.line_total === 'number' && item.line_total > 0
      && typeof item.quantity === 'number' && item.quantity > 0
    return hasPriceRaw || hasLineTotalQty
  }) as Record<string, unknown>[]

  if (isReceipt) {
    d.items = filtered.map(item => {
      const vatNum = Number(item.vat)
      const vat = (vatNum > 0 && vatNum <= 15) ? 11 : 21
      const sgr = Number(item.sgr) === 0.5 ? 0.5 : 0
      // Bon fiscal: pretul e mereu cu TVA inclus, iar impartirea la cantitate
      // (buc sau kg cantarite) si scaderea reducerii de card de fidelitate se
      // fac aici, deterministic — modelul doar citeste line_total/quantity/
      // card_discount exact cum apar tiparite, fara sa le combine el insusi.
      const lineTotal = Number(item.line_total) || 0
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1
      const cardDiscount = Number(item.card_discount) > 0 ? Number(item.card_discount) : 0
      const netTotal = Math.max(lineTotal - cardDiscount, 0)
      const supplierPrice = Math.round((netTotal / quantity / (1 + vat / 100)) * 10000) / 10000
      const unit = typeof item.unit === 'string' && item.unit.trim() ? item.unit : 'buc'
      return { name: item.name, unit, supplier_price: supplierPrice, vat, discount: 0, sgr }
    })
    return d
  }

  // Factura/aviz: prima trecere calculeaza pentru fiecare rand pretul de
  // ambalaj fara TVA, daca UM-ul e o cutie/bax (=> se imparte pe bucata) si
  // raportul propriu bucati/cutie. A doua trecere imparte, imprumutand raportul
  // de la un produs "frate" (acelasi pret de cutie + aceeasi familie de nume)
  // cand randul curent e cutie dar n-are raportul scris in denumire.
  const prep = filtered.map(item => {
    const vatNum = Number(item.vat)
    const vat = (vatNum > 0 && vatNum <= 15) ? 11 : 21
    const sgr = Number(item.sgr) === 0.5 ? 0.5 : 0
    const itemDiscount = Number(item.discount)
    const discount = (itemDiscount > 0 && itemDiscount <= 100) ? itemDiscount : (globalDiscounts[vat] ?? 0)

    // Supapa de siguranta: pe facturi extrase din PDF cifrele de pe rand pot fi
    // lipite fara spatii ("buc92169.4687183.36") si modelul poate rupe gresit
    // price_raw. Daca avem quantity + line_total, price corect = line_total/quantity.
    const declaredPriceRaw = Number(item.price_raw)
    const lineTotal = Number(item.line_total) || 0
    const quantity = Number(item.quantity) || 0
    let priceRaw = declaredPriceRaw
    if (lineTotal > 0 && quantity > 0) {
      const derived = lineTotal / quantity
      if (!(declaredPriceRaw > 0) || Math.abs(declaredPriceRaw - derived) > Math.max(derived * 0.03, 0.01)) {
        priceRaw = derived
      }
    }
    const priceExVat = item.price_includes_vat === true ? priceRaw / (1 + vat / 100) : priceRaw

    // Decizia cutie-vs-bucata se ia DIN COLOANA UM (deterministic in cod), nu
    // dintr-un boolean pe care modelul il ghicea des gresit: doar UM de tip
    // cutie/bax/set se imparte pe bucata. "18 BUC/CUT" in denumire cand UM=Buc
    // e doar info de ambalare, nu un raport de aplicat.
    const umRaw = normalizeName(String(item.unit ?? ''))
    const isBoxUnit = /^(cut|cutie|cutii|bax|bx|baxuri|set|seturi)\b/.test(umRaw)

    const knownPieces = knownRatios.get(normalizeName(String(item.name)))
    const piecesPerBoxRaw = Math.round(Number(item.pieces_per_box))
    const aiPieces = Number.isFinite(piecesPerBoxRaw) && piecesPerBoxRaw > 1 ? piecesPerBoxRaw : 1
    const ownRatio = (knownPieces && knownPieces > 1) ? knownPieces : aiPieces

    // Cheia pentru potrivirea "fratelui": pret de cutie identic (la cent) +
    // aceleasi prime 3 cuvinte din denumire (familie de produs).
    const prefix = normalizeName(String(item.name)).split(' ').slice(0, 3).join(' ')
    const siblingKey = Math.round(priceExVat * 100) + '|' + prefix

    return { name: item.name, unit: item.unit, vat, discount, sgr, priceExVat, isBoxUnit, ownRatio, siblingKey }
  })

  const siblingRatios = new Map<string, number>()
  for (const p of prep) {
    if (p.isBoxUnit && p.ownRatio > 1 && !siblingRatios.has(p.siblingKey)) {
      siblingRatios.set(p.siblingKey, p.ownRatio)
    }
  }

  d.items = prep.map(p => {
    const ratio = p.isBoxUnit
      ? (p.ownRatio > 1 ? p.ownRatio : (siblingRatios.get(p.siblingKey) ?? 1))
      : 1
    const supplierPrice = Math.round((p.priceExVat / ratio) * 10000) / 10000
    const rawUnit = String(p.unit ?? '').toLowerCase().trim()
    const unit = p.isBoxUnit ? 'buc' : (rawUnit.startsWith('buc') || !rawUnit ? 'buc' : rawUnit)
    return { name: p.name, unit, supplier_price: supplierPrice, vat: p.vat, discount: p.discount, sgr: p.sgr }
  })
  return d
}

// PDF-uri scanate (poza incorporata direct, fara layer de text real) fac ca
// pdf-parse sa intoarca text gol sau aproape gol — in loc sa trimitem asta
// mai departe la modelul de text (esec silentios, JSON gol), randam prima
// pagina ca imagine si o trecem pe calea de vedere, ca la o poza incarcata
// direct. Esueaza natural (return null) daca PDF-ul chiar nu se poate randa,
// caz in care ne intoarcem la comportamentul vechi (trimitem textul, oricat de putin).
async function pdfToImageBase64(buf: Buffer): Promise<string | null> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const { createCanvas } = await import('@napi-rs/canvas')
    const data = new Uint8Array(buf)
    const pdf = await pdfjsLib.getDocument({ data }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    const ctx = canvas.getContext('2d')
    // @napi-rs/canvas implementeaza un canvas/context compatibil, dar nu identic
    // tipizat cu cel din lib.dom — pdf.js accepta la runtime orice context care
    // se comporta la fel, de-aia castul peste toti parametrii.
    await page.render({ canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0]).promise
    return canvas.toBuffer('image/jpeg', 0.9).toString('base64')
  } catch {
    return null
  }
}

async function runVisionScan(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  imageBase64: string,
  mimeType: string,
) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        { type: 'text', text: 'Extrage furnizorul si produsele din acest document (factura, aviz sau bon fiscal) conform regulilor.' },
      ],
    },
  ]
  // max_tokens nu a mai fost ajustat aici de cand a fost setat, desi system
  // prompt-ul s-a triplat de atunci (creste cu fiecare regula noua) — pe o
  // factura densa (poza cu multe randuri), prompt+imagine+8192 rezervat
  // poate depasi bugetul de tokeni/minut al modelului de vedere, la fel cum
  // se intampla si la modelul de text daca nu era redus.
  const raw = await callGroq('meta-llama/llama-4-scout-17b-16e-instruct', messages, 4000)
  const parsed = parseJson(raw)
  const result = validateAndSanitize(parsed, await getKnownRatios(typeof parsed?.supplier === 'string' ? parsed.supplier : ''))
  const items = result && Array.isArray((result as { items?: unknown[] }).items) ? (result as { items: unknown[] }).items : []
  if (items.length > 0) {
    await supabase.from('invoice_scan_logs').insert({ user_id: userId })
    return NextResponse.json(result)
  }
  // Zero produse extrase — atasam un fragment din raspunsul BRUT al modelului
  // ca sa putem diagnostica (parsare esuata? raspuns gol? alt format decat JSON?)
  // fara acces la logurile serverului.
  return NextResponse.json({
    items: [],
    error: 'vision_failed',
    debug: (raw || '').replace(/\s+/g, ' ').trim().slice(0, 300) || '(raspuns gol de la model)',
  })
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
      return await runVisionScan(supabase, user.id, body.imageBase64, body.mimeType || 'image/jpeg')
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

        // PDF scanat (poza bagata direct in PDF, fara text real) => pdf-parse
        // intoarce aproape nimic. Router automat catre vedere, transparent
        // pentru utilizator — nu mai afiseaza eroare, doar trece pe alta cale.
        if (text.trim().length < 40) {
          const imageBase64 = await pdfToImageBase64(buf)
          if (imageBase64) return await runVisionScan(supabase, user.id, imageBase64, 'image/jpeg')
        }
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
      { role: 'user', content: text.slice(0, 5000) },
    ]
    // max_tokens e rezervat integral din bugetul TPM de Groq inainte sa vada raspunsul real,
    // deci trebuie tinut jos ca sa incapa alaturi de system prompt-ul, care tot creste cu regulile noi.
    // Marja e voit generoasa (nu doar strict cat incape acum) ca sa reziste la urmatoarele reguli adaugate.
    // Preferat sa scadem max_tokens (recuperarea din parseJson salveaza oricum ce apuca sa genereze)
    // decat slice-ul de text de mai sus, ca sa nu taiem input-ul (ex: legenda TVA de la finalul unui bon).
    const raw = await callGroq('llama-3.3-70b-versatile', messages, 3000)
    const parsed = parseJson(raw)
    const knownRatios = await getKnownRatios(typeof parsed?.supplier === 'string' ? parsed.supplier : '')
    const result = validateAndSanitize(parsed, knownRatios)
    if (result) await supabase.from('invoice_scan_logs').insert({ user_id: user.id })
    return NextResponse.json(result ?? { items: [] })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    const [code, detail] = msg.split('::')
    if (code === 'groq_rate_limit') return NextResponse.json({ items: [], error: 'groq_rate_limit', detail }, { status: 503 })
    if (code === 'groq_too_large') return NextResponse.json({ items: [], error: 'groq_too_large', detail }, { status: 413 })
    return NextResponse.json({ items: [], error: msg }, { status: 500 })
  }
}
