import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cui = req.nextUrl.searchParams.get('cui')
  if (!cui) return NextResponse.json({ error: 'CUI lipsa' }, { status: 400 })

  const cuiNum = parseInt(cui.replace(/[^0-9]/g, ''), 10)
  if (!cuiNum) return NextResponse.json({ error: 'CUI invalid' }, { status: 400 })

  const apiKey = process.env.OPENAPI_RO_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key lipsa (OPENAPI_RO_KEY)' }, { status: 500 })

  try {
    const res = await fetch(`https://api.openapi.ro/api/companies/${cuiNum}`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    })

    if (res.status === 404) return NextResponse.json({ error: 'CUI negasit' }, { status: 404 })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: `Eroare ${res.status}`, detail: text }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({
      name: data.denumire || '',
      address: data.adresa || '',
      reg_com: data.nrRegCom || '',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Eroare conexiune', detail: msg }, { status: 502 })
  }
}
