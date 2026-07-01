import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PROMO_CAP, countTotalUsers } from '@/lib/promoCap'

export const maxDuration = 30

function normalizeUrl(raw: string) {
  try { const u = new URL(raw); return `${u.protocol}//${u.host}` } catch { return raw }
}

export async function GET() {
  const base = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ remaining: PROMO_CAP, cap: PROMO_CAP })

  const admin = createClient(base, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const total = await countTotalUsers(admin)
    return NextResponse.json({ remaining: Math.max(0, PROMO_CAP - total), cap: PROMO_CAP })
  } catch {
    return NextResponse.json({ remaining: PROMO_CAP, cap: PROMO_CAP })
  }
}
