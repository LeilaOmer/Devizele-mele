import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text } = await req.json()

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Esti asistent pentru comercianti romani. Primesti text dictat cu produse de pe factura unui furnizor. Extrage lista de produse. Raspunzi DOAR cu JSON, fara text, fara markdown. Format: {"items":[{"name":"denumire produs","unit":"buc","quantity":1,"supplier_price":0,"discount":0,"vat":21}]}. Discount e procentual (0 daca nu e mentionat). Unitate de masura: buc/kg/l/m/mp/ml/set/pereche etc. Pretul furnizorului e per unitate. Campul vat: 11 pentru alimente, bauturi, produse agricole, fructe, legume, carne, lactate, produse de panificatie; 21 pentru orice altceva (nealimentar, chimice, electrice, textile, etc).',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.1,
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
