import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text, services } = await req.json()
  const simple = services.map((s: any) => ({ id: s.id, name: s.name, unit: s.unit }))

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Esti asistent pentru mesteri romani. Primesti text dictat cu posibile corectii (ex: ba nu, mai bine, de fapt, nu vreau). Tine cont de corectii si returneaza doar rezultatul final. Daca un serviciu este corectat/anulat, NU il include in rezultat. Cantitatea trebuie sa fie un numar intreg simplu, nu in unitati de masura. Raspunzi DOAR cu JSON obiect, fara text, fara markdown. Format: {"client_name":"nume","items":[{"service_id":"id","quantity":1}]}'
        },
        {
          role: 'user',
          content: 'Servicii: ' + JSON.stringify(simple) + '\nText: ' + text
        }
      ],
      temperature: 0.1
    })
  })

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return NextResponse.json(JSON.parse(match ? match[0] : '{}'))
  } catch {
    return NextResponse.json({ client_name: '', items: [], raw })
  }
}