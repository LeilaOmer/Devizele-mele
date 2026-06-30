import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

const SYSTEM_PROMPT = `Esti asistent pentru comercianti romani. Extrage din documentul primit (factura sau aviz) furnizorul si lista de produse. Raspunzi DOAR cu JSON, fara text, fara markdown.
Format: {"supplier":"Nume Furnizor SRL","discounts":{"11":0,"21":0},"items":[{"name":"denumire produs","unit":"buc","supplier_price":0,"discount":0,"vat":21,"sgr":0}]}

Campul "discounts" se completeaza PRIMUL, inainte de items. Contine procentul de discount global per cota TVA (ex: {"11":5,"21":5} daca exista "SCONTURI ACORDATE 5.00%" pentru ambele TVA-uri). Daca nu exista discount global, lasa {"11":0,"21":0}. Liniile "SCONTURI ACORDATE X%", "SCONT X%", "REMIZA X%", "REDUCERE X%" cu valoare negativa NU sunt produse — extrage din ele procentul X si TVA-ul si pune-le in "discounts".

REGULI OBLIGATORII:

1. supplier_price = pretul per unitate FARA TVA si FARA SGR.
   - Coloane cu pret CU TVA: "Pret TTI", "Pret unit. TTI", "Pret cu TVA", "Valoare TTI" => imparte la (1 + cota_tva/100). Ex: 2.60 lei cu TVA 11% => 2.60/1.11 = 2.3423
   - Coloane cu pret FARA TVA: "Pret RON", "Pret Ofr", "Pret net", "Pret fara TVA", "Pret unitar", "Pretul net al articolului" => foloseste direct ca supplier_price.
   - Rotunjeste la 4 zecimale.
   - FORMAT WINMENTOR (software roman, ex: Hygiene Puls Center, facturi cu "Discount cumulat"): coloanele per rand sunt in ordinea EXACTA: Cantitate | Pret unitar (lei, fara TVA) | Valoare (lei, fara TVA) | Valoare TVA (lei) | Procent discount.
   - supplier_price = valoarea din coloana "Pret unitar" — citeste DIRECT acel numar, nu calcula din altceva.
   - NU aplica discount la supplier_price. Discount-ul se pune separat in campul "discount".
   - Linia "Discount cumulat TVA XX%" de la sfarsit este un TOTAL al facturii — ignor-o complet, nu e un produs.
   - Exemplu corect WinMENTOR: rand "KONGA HARD Buc 5,00 14,00 70,00 14,70 -15%" => supplier_price=14.00, discount=15, validare: 14.00 x 5 = 70.00 ✓
   - Exemplu corect WinMENTOR: rand "EFEKT BAIE 1L Buc 5,00 14,26 71,30 14,97 -15%" => supplier_price=14.26, discount=15, validare: 14.26 x 5 = 71.30 ✓
   - FORMAT cu "Pretul net al articolului" / "Valoare neta" (orice furnizor cu aceste coloane): ordinea EXACTA per rand este: Pretul net al articolului (pret unitar fara TVA) | Cantitate | UM | Cota TVA | Valoare neta (total = pret x cantitate).
   - supplier_price = valoarea din coloana "Pretul net al articolului" (primul numar din rand). NICIODATA "Valoare neta" (ultimul numar, totalul).
   - Exemplu corect: rand "1,9820 | 5 | kg | 11% | 9,91" => supplier_price=1.9820, validare: 1.9820 x 5 = 9.91 ✓ (NU 9.91 ca pret!)
   - VALIDARE UNIVERSALA (se aplica oricarui format): supplier_price x cantitate ≈ valoare_fara_TVA. Daca nu se potriveste, ai ales coloana gresita — incearca alt numar din acel rand.

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

7. Nu folosi diacritice in text (a nu a, s nu s, t nu t, etc.).`

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

function parseJson(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

function validateAndSanitize(data: unknown) {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.items)) return null

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

  d.items = d.items
    .filter((i: unknown) => {
      if (!i || typeof i !== 'object') return false
      const item = i as Record<string, unknown>
      return typeof item.name === 'string' && item.name.trim() !== ''
        && typeof item.supplier_price === 'number' && item.supplier_price > 0
    })
    .map((i: unknown) => {
      const item = i as Record<string, unknown>
      const vatNum = Number(item.vat)
      const vat = (vatNum > 0 && vatNum <= 15) ? 11 : 21
      const itemDiscount = Number(item.discount)
      const discount = (itemDiscount > 0 && itemDiscount <= 100)
        ? itemDiscount
        : (globalDiscounts[vat] ?? 0)
      const sgr = Number(item.sgr)
      return {
        ...item,
        supplier_price: Math.round(Number(item.supplier_price) * 10000) / 10000,
        vat,
        discount,
        sgr: (sgr === 0.5 ? 0.5 : 0),
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
            { type: 'text', text: 'Extrage furnizorul si produsele din aceasta factura conform regulilor.' },
          ],
        },
      ]
      const raw = await callGroq('meta-llama/llama-4-scout-17b-16e-instruct', messages)
      const result = validateAndSanitize(parseJson(raw))
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
      { role: 'user', content: text.slice(0, 8000) },
    ]
    const raw = await callGroq('llama-3.3-70b-versatile', messages)
    const result = validateAndSanitize(parseJson(raw))
    if (result) await supabase.from('invoice_scan_logs').insert({ user_id: user.id })
    return NextResponse.json(result ?? { items: [] })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    if (msg === 'groq_rate_limit') return NextResponse.json({ items: [], error: 'groq_rate_limit' }, { status: 503 })
    return NextResponse.json({ items: [], error: msg }, { status: 500 })
  }
}
