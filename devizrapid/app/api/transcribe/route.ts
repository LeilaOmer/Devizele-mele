import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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
