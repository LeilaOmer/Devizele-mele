import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Esti asistent pentru comercianti romani. Extrage din documentul primit (factura sau aviz) furnizorul si lista de produse. Raspunzi DOAR cu JSON, fara text, fara markdown.
Format: {"supplier":"Nume Furnizor SRL","items":[{"name":"denumire produs","unit":"buc","supplier_price":0,"discount":0,"vat":21,"sgr":0}]}

REGULI OBLIGATORII:

1. supplier_price = pretul per unitate FARA TVA si FARA SGR.
   - Coloane cu pret CU TVA: "Pret TTI", "Pret unit. TTI", "Pret cu TVA", "Valoare TTI" => imparte la (1 + cota_tva/100). Ex: 2.60 lei cu TVA 11% => 2.60/1.11 = 2.3423
   - Coloane cu pret FARA TVA: "Pret RON", "Pret Ofr", "Pret net", "Pret fara TVA" => foloseste direct ca supplier_price.
   - Rotunjeste la 4 zecimale.

2. EXCLUDE din lista (NU crea produs pentru ele):
   - Linii cu denumire "AMBALAJ SGR", "GARANTIE PET", "GARANTIE AMBALAJ", "SGR STICLA", "SGR DOZA" sau similar (TVA 0%, pret 0.50) => sunt garantii returnabile, nu produse.

3. PROMO / GRATUIT (linii cu pret = 0 si denumire contine "PROMO", "GRATIS", "FREE", "BONUS" sau similar):
   - NU ignora aceste linii! Ele reprezinta bucati GRATUITE primite impreuna cu un produs platit.
   - Cauta produsul platit cu denumire similara (acelasi produs fara cuvantul PROMO).
   - Calculeaza pretul efectiv real: supplier_price = (cantitate_platita x pret_platit) / (cantitate_platita + cantitate_promo).
   - Creeaza UN SINGUR produs cu cantitatea totala (platita + gratuita) si pretul efectiv calculat.
   - Exemplu: 4608 buc x 4.22 RON + 2304 buc PROMO x 0 RON => supplier_price = 19445.76 / 6912 = 2.8133 RON, cantitate totala 6912 buc.

3. SGR (garantie returnabila 0.50 lei/unitate, fara TVA, fara adaos):
   - Daca denumirea produsului contine "SGR" (ex: "URSUS 0.33L SGR", "URSUS COOLER DZ SGR") => sgr=0.50 pentru acel produs.
   - Daca exista linii "AMBALAJ SGR STICLA" => potriveste cantitatea cu produsele BUC/ST cu aceeasi cantitate si seteaza sgr=0.50 la ele.
   - Daca exista linii "AMBALAJ SGR DOZA" => seteaza sgr=0.50 la produsele tip doza (DZ/CAN) ale caror cantitati sumate egaleaza cantitatea din linia SGR DOZA.
   - Daca exista o singura linie GARANTIE/SGR la final => verifica daca cantitatea ei = suma cantitatilor produselor cu SGR si aplica sgr=0.50 la acele produse.
   - Produse cu "NAV ST", "NAVETA", "NAV" in denumire => fara SGR (sgr=0), sticla returnata pe naveta.
   - Daca nu exista nicio referinta la SGR/garantie => sgr=0 la toate.

4. REGULA TVA: vat=11 pentru apa, alimente, bauturi nealcoolice, lemne, carti, cazare. vat=21 pentru bauturi alcoolice (bere, vin, spirtoase), cosmetice, electrice, textile, materiale.

5. discount = valoarea EXCLUSIV din coloana "% Disc", "Disc%", "Discount%". Daca acea coloana arata 0,00 sau 0 => discount=0. NU extrage discount din alte coloane, din valori TVA, din sume sau din fragmente de numere izolate (ex: "6" izolat care face parte din "2136,96" nu este un discount).

6. Nu folosi diacritice in text (a nu a, s nu s, t nu t, etc.).`

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
  if (!res.ok) throw new Error(data.error?.message || `Groq error ${res.status}`)
  return data.choices?.[0]?.message?.content || ''
}

function parseJson(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  try {
    if (body.imageBase64) {
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${body.mimeType || 'image/jpeg'};base64,${body.imageBase64}` } },
            { type: 'text', text: SYSTEM_PROMPT },
          ],
        },
      ]
      const raw = await callGroq('meta-llama/llama-4-scout-17b-16e-instruct', messages)
      const result = parseJson(raw)
      return NextResponse.json(result ?? { items: [], error: 'vision_failed', raw: raw.slice(0, 200) })
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
      { role: 'user', content: text.slice(0, 12000) },
    ]
    const raw = await callGroq('llama-3.3-70b-versatile', messages)
    const result = parseJson(raw)
    return NextResponse.json(result ?? { items: [] })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ items: [], error: msg }, { status: 500 })
  }
}
