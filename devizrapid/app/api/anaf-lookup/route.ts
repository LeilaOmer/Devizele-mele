import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const preferredRegion = ['cdg1', 'fra1', 'arn1'] // Paris, Frankfurt, Stockholm

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
        'User-Agent': 'Mozilla/5.0 (compatible; Tarifator/1.0)',
      },
      body: JSON.stringify([{ cui: cuiNum, data: today }]),
    })

    if (!anafRes.ok) {
      const text = await anafRes.text().catch(() => '')
      return NextResponse.json({ error: `ANAF: ${anafRes.status}`, detail: text }, { status: 502 })
    }

    const data = await anafRes.json()
    const found = data?.found?.[0]?.date_generale
    if (!found) return NextResponse.json({ error: 'CUI negasit in ANAF' }, { status: 404 })

    return NextResponse.json({
      name: found.denumire || '',
      address: found.adresa || '',
      reg_com: found.nrRegCom || '',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Eroare conexiune ANAF', detail: msg }, { status: 502 })
  }
}
