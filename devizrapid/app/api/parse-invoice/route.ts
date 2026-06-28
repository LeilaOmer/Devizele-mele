import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType } = await req.json()
  if (!imageBase64) return NextResponse.json({ items: [] }, { status: 400 })

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: 'Esti asistent pentru comercianti romani. Aceasta este o fotografie a unei facturi sau aviz de insotire a marfii de la un furnizor roman. Extrage: numele furnizorului (din antet) si lista de produse. Raspunzi DOAR cu JSON, fara text, fara markdown. Format: {"supplier":"Nume Furnizor SRL","items":[{"name":"denumire produs","unit":"buc","supplier_price":0,"discount":0,"vat":21}]}. supplier_price este pretul per unitate FARA TVA (pretul de achizitie al comerciantului). Daca e pret cu TVA pe factura, scade TVA-ul. discount e procentual (0 daca nu e mentionat). IMPORTANT: Nu folosi diacritice in text. REGULA TVA conform legislatiei romane: vat=11 pentru alimente si bauturi nealcoolice, apa potabila, lemne de foc, carti, cazare. vat=21 pentru orice altceva inclusiv bauturi alcoolice, cosmetice, electrice, textile, materiale constructii.',
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
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
