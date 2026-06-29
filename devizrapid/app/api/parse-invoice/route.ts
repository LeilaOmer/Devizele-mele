import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Esti asistent pentru comercianti romani. Extrage din documentul primit (factura sau aviz) furnizorul si lista de produse. Raspunzi DOAR cu JSON, fara text, fara markdown.
Format: {"supplier":"Nume Furnizor SRL","items":[{"name":"denumire produs","unit":"buc","supplier_price":0,"discount":0,"vat":21,"sgr":0}]}

REGULI OBLIGATORII:

1. supplier_price = pretul per unitate FARA TVA si FARA SGR.
   - Daca factura arata pretul CU TVA (coloane numite "Pret TTI", "Pret unit. TTI", "Pret cu TVA", "Valoare TTI") => imparte la (1 + cota_tva/100). Ex: 2.60 lei cu TVA 11% => supplier_price = 2.60/1.11 = 2.342
   - Daca factura arata pretul FARA TVA (coloane "Pret fara TVA", "Pret net", "Valoare fara TVA") => foloseste direct.
   - Rotunjeste supplier_price la 4 zecimale.

2. REGULA TVA: vat=11 pentru apa, alimente, bauturi nealcoolice, lemne, carti, cazare. vat=21 pentru bauturi alcoolice, cosmetice, electrice, textile, materiale constructii, orice altceva.

3. REGULA SGR CRITICA (Metro, Meti, Selgros, Profi, etc.): Garantia returnabila apare ca linie separata "GARANTIE PET", "GARANTIE AMBALAJ", "SGR", cu TVA 0% si pret 0.50 lei/buc.
   - NU crea produs separat pentru garantie.
   - Daca linia GARANTIE apare dupa UN singur produs => seteaza sgr=0.50 doar la acel produs.
   - Daca linia GARANTIE apare la SFARSIT si cantitatea ei este SUMA cantitatatilor mai multor produse => seteaza sgr=0.50 la TOATE produsele de tip bautura/apa/sticle din factura.
   - Daca nu exista garantie => sgr=0.

4. discount e procentual (0 daca nu e mentionat). Nu folosi diacritice in text.`

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
      // Poza — Groq Vision 90B
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
