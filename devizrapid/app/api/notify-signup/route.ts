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
    subject: 'Utilizator nou inregistrat in Tarifator',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Utilizator nou inregistrat</h2>
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 4px; margin: 16px 0;">
          <p style="margin: 0 0 8px; color: #1e293b;"><strong>Email:</strong> ${record.email || '—'}</p>
          <p style="margin: 0; color: #1e293b;"><strong>Tip cont:</strong> ${record.account_type || 'artizan'}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">
          Inregistrat la ${new Date().toLocaleString('ro-RO')}
        </p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
