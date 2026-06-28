import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  if (req.headers.get('x-notify-secret') !== process.env.NOTIFY_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const record = body.record

  await resend.emails.send({
    from: 'Tarifator <onboarding@resend.dev>',
    to: 'leyla.omer@gmail.com',
    subject: 'Feedback nou de la un utilizator',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Feedback nou în Tarifator</h2>
        <div style="background: #f8fafc; border-left: 4px solid #1d4ed8; padding: 16px; border-radius: 4px; margin: 16px 0;">
          <p style="margin: 0; color: #1e293b;">${record.message}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">
          Primit la ${new Date(record.created_at).toLocaleString('ro-RO')}
        </p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
