import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { PROMO_CAP, countUsersCreatedAtOrBefore } from '@/lib/promoCap'

export const maxDuration = 30

function normalizeUrl(raw: string) {
  try { const u = new URL(raw); return `${u.protocol}//${u.host}` } catch { return raw }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const base = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')

  const userClient = createClient(base, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server config missing' }, { status: 500 })

  const admin = createClient(base, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const rank = await countUsersCreatedAtOrBefore(admin, user.created_at)
    return NextResponse.json({ promoEligible: rank <= PROMO_CAP, rank })
  } catch (err: unknown) {
    // Fail-open: an infra hiccup here shouldn't cost a genuine early user their promo trial.
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ promoEligible: true, rank: null, warning: msg })
  }
}
