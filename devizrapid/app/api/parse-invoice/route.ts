import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = 'Esti asistent pentru comercianti romani. Extrage din documentul primit (factura sau aviz) furnizorul si lista de produse. Raspunzi DOAR cu JSON, fara text, fara markdown. Format: {"supplier":"Nume Furnizor SRL","items":[{"name":"denumire produs","unit":"buc","supplier_price":0,"discount":0,"vat":21}]}. supplier_price este pretul per unitate FARA TVA. Daca e pret cu TVA, scade TVA-ul. discount e procentual (0 daca nu e mentionat). Nu folosi diacritice in text. REGULA TVA: vat=11 pentru alimente si bauturi nealcoolice, apa, lemne de foc, carti, cazare. vat=21 pentru orice altceva inclusiv bauturi alcoolice, cosmetice, electrice, textile, materiale constructii.'

export async function POST(req: NextRequest) {
  const body = await req.json()

  let messages: unknown[]

  if (body.imageBase64) {
    // Poza — Groq Vision
    messages = [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${body.mimeType || 'image/jpeg'};base64,${body.imageBase64}` } },
          { type: 'text', text: SYSTEM_PROMPT },
        ],
      },
    ]
  } else if (body.docBase64) {
    // PDF sau XML trimis ca base64 — extragem textul pe server
    const buf = Buffer.from(body.docBase64, 'base64')
    let text = ''
    const mime: string = body.mimeType || ''
    if (mime.includes('pdf') || (body.fileName as string | undefined)?.toLowerCase().endsWith('.pdf')) {
      // import din lib/ pentru a evita eroarea cu fisierele de test din pdf-parse v1
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js')
      const parsed = await pdfParse(buf)
      text = parsed.text
    } else {
      text = buf.toString('utf-8')
    }
    messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text.slice(0, 12000) },
    ]
  } else if (body.text) {
    // Text direct
    messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: body.text.slice(0, 12000) },
    ]
  } else {
    return NextResponse.json({ items: [] }, { status: 400 })
  }

  const model = body.imageBase64 ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile'

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 4096 }),
  })

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return NextResponse.json(JSON.parse(match ? match[0] : '{}'))
  } catch {
    return NextResponse.json({ items: [] })
  }
}
