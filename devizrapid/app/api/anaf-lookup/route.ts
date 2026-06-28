import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cui = req.nextUrl.searchParams.get('cui')
  if (!cui) return NextResponse.json({ error: 'CUI lipsa' }, { status: 400 })

  const cuiNum = parseInt(cui.replace(/[^0-9]/g, ''), 10)
  if (!cuiNum) return NextResponse.json({ error: 'CUI invalid' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  let anafRes: Response
  try {
    anafRes = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ cui: cuiNum, data: today }]),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return NextResponse.json({ error: 'ANAF indisponibil' }, { status: 502 })
  }

  if (!anafRes.ok) return NextResponse.json({ error: 'ANAF eroare' }, { status: 502 })

  const data = await anafRes.json()
  const found = data?.found?.[0]?.date_generale
  if (!found) return NextResponse.json({ error: 'CUI negasit in ANAF' }, { status: 404 })

  return NextResponse.json({
    name: found.denumire || '',
    address: found.adresa || '',
    reg_com: found.nrRegCom || '',
  })
}
