import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function normalizeUrl(raw: string) {
  try { const u = new URL(raw); return `${u.protocol}//${u.host}` } catch { return raw }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const base = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  const userClient = createClient(base, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const supplierName = typeof body.supplier_name === 'string' ? body.supplier_name.trim() : ''
  const productName = typeof body.product_name === 'string' ? body.product_name.trim() : ''
  const piecesPerBox = Math.round(Number(body.pieces_per_box))

  if (!supplierName || !productName || !Number.isFinite(piecesPerBox) || piecesPerBox <= 1) {
    return NextResponse.json({ error: 'Date invalide: furnizor, produs si numar de bucati (peste 1) sunt obligatorii.' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
  const admin = createClient(base, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Identitatea userului e deja verificata mai sus (userClient.auth.getUser);
  // scrierea foloseste service role ca sa nu mai depinda de politici RLS
  // separate pe tabelul acesta partajat intre toti userii.
  const { error } = await admin.from('product_box_ratios').insert({
    supplier_name: supplierName,
    product_name: productName,
    pieces_per_box: piecesPerBox,
    created_by: user.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
