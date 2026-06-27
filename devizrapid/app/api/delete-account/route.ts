import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

function normalizeUrl(raw: string) {
  try { const u = new URL(raw); return `${u.protocol}//${u.host}` } catch { return raw }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const base = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')

  // Verify caller
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

  // Salveaza hash email inainte de stergere (anti-abuz re-inregistrare)
  if (user.email) {
    const emailHash = createHash('md5').update(user.email.toLowerCase().trim()).digest('hex')
    await admin.from('deleted_accounts').upsert({ email_hash: emailHash })
  }

  // Delete user data in order (children first)
  await admin.from('pricing_usage').delete().eq('user_id', user.id)
  await admin.from('quote_items').delete().in(
    'quote_id',
    (await admin.from('quotes').select('id').eq('user_id', user.id)).data?.map(q => q.id) || []
  )
  await admin.from('quotes').delete().eq('user_id', user.id)
  await admin.from('services').delete().eq('user_id', user.id)
  await admin.from('clients').delete().eq('user_id', user.id)
  await admin.from('companies').delete().eq('user_id', user.id)
  await admin.from('profiles').delete().eq('id', user.id)

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
