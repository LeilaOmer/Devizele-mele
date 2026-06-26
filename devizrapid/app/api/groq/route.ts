import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt, services } = await req.json()
  const simple = services.map((s: any) => ({ id: s.id, name: s.name }))

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Raspunzi DOAR cu JSON array. Format: [{"service_id":"id","quantity":1}]' },
        { role: 'user', content: 'Servicii: ' + JSON.stringify(simple) + ' Lucrari: ' + prompt }
      ],
      temperature: 0.1
    })
  })
  

  const data = await res.json()
  console.log('GROQ:', JSON.stringify(data))
  const text = data.choices?.[0]?.message?.content || '[]'
  try {
    const match = text.match(/\[[\s\S]*\]/)
return NextResponse.json({ items: match ? JSON.parse(match[0]) : [] })
  
} catch {
  return NextResponse.json({ items: [], raw: text })
}
}