import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { allowDaily } from '@/lib/rateLimit'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ text: '' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ text: '' }, { status: 401 })

  if (!(await allowDaily(user.id, 'transcribe', 300))) {
    return NextResponse.json({ text: '', error: 'rate_limit', message: 'Limita zilnica de dictari atinsa. Revino maine.' }, { status: 429 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ text: '' })

  const groqForm = new FormData()
  groqForm.append('file', file, 'audio.webm')
  groqForm.append('model', 'whisper-large-v3')
  groqForm.append('language', 'ro')
  groqForm.append('response_format', 'json')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY },
    body: groqForm,
  })

  const data = await res.json()
  return NextResponse.json({ text: data.text || '' })
}
