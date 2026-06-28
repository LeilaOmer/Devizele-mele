import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const cui = req.nextUrl.searchParams.get('cui')
  if (!cui) return NextResponse.json({ error: 'CUI lipsa' }, { status: 400 })

  const cuiNum = parseInt(cui.replace(/[^0-9]/g, ''), 10)
  if (!cuiNum) return NextResponse.json({ error: 'CUI invalid' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  try {
    const anafRes = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify([{ cui: cuiNum, data: today }]),
    })

    const raw = await anafRes.text()

    if (!anafRes.ok) {
      return NextResponse.json({ error: `ANAF HTTP ${anafRes.status}`, detail: raw.slice(0, 300) }, { status: 502 })
    }

    let data: Record<string, unknown>
    try { data = JSON.parse(raw) } catch {
      return NextResponse.json({ error: 'Raspuns invalid ANAF', detail: raw.slice(0, 300) }, { status: 502 })
    }

    const found = (data?.found as Array<{ date_generale?: Record<string, string> }>)?.[0]?.date_generale
    if (!found) {
      return NextResponse.json({ error: 'CUI negasit', detail: JSON.stringify(data).slice(0, 300) }, { status: 404 })
    }

    return NextResponse.json({
      name: found.denumire || '',
      address: found.adresa || '',
      reg_com: found.nrRegCom || '',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Eroare conexiune', detail: msg }, { status: 502 })
  }
}
