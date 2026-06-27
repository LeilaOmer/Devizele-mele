'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('40')) return '+' + digits
  if (digits.startsWith('0')) return '+4' + digits
  if (digits.startsWith('7')) return '+40' + digits
  return '+' + digits
}

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSendOtp() {
    setError('')
    const normalized = normalizePhone(phone)
    if (normalized.length < 10) { setError('Numar de telefon invalid.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  async function handleVerifyOtp() {
    setError('')
    if (otp.length < 4) { setError('Introdu codul primit prin SMS.'); return }
    setLoading(true)
    const normalized = normalizePhone(phone)
    const { error } = await supabase.auth.verifyOtp({ phone: normalized, token: otp, type: 'sms' })
    setLoading(false)
    if (error) { setError('Cod gresit sau expirat.'); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-sm p-8 space-y-5">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Tarifator</h1>
          <p className="text-sm text-gray-400 mt-1">
            {step === 'phone' ? 'Introdu numarul tau de telefon' : 'Introdu codul primit prin SMS'}
          </p>
        </div>

        {step === 'phone' ? (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Numar telefon
              </label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
                placeholder="07xx xxx xxx"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              />
              <p className="text-xs text-gray-400 mt-1.5">Vei primi un cod SMS de confirmare.</p>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={handleSendOtp} disabled={loading || !phone}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-base disabled:bg-gray-300">
              {loading ? 'Se trimite...' : 'Trimite cod SMS'}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Cod SMS
              </label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-2xl font-bold text-center tracking-widest text-gray-900"
                placeholder="• • • • • •"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1.5 text-center">
                Cod trimis la {normalizePhone(phone)}
              </p>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button onClick={handleVerifyOtp} disabled={loading || otp.length < 4}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-base disabled:bg-gray-300">
              {loading ? 'Verific...' : 'Confirma'}
            </button>
            <button onClick={() => { setStep('phone'); setOtp(''); setError('') }}
              className="w-full py-2 text-sm text-gray-400">
              ← Schimba numarul
            </button>
          </>
        )}

      </div>
    </div>
  )
}
