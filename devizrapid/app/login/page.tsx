'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  async function handleSubmit() {
    setError(''); setSuccess('')
    if (!email || !password) { setError('Completeaza email si parola.'); return }
    if (password.length < 6) { setError('Parola trebuie sa aiba minim 6 caractere.'); return }
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) { setError('Email sau parola incorecte.'); return }
      router.push('/dashboard')
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          setError('Acest email este deja inregistrat. Incearca sa te autentifici.')
        } else if (error.message.includes('Invalid') || error.message.includes('path') || error.message.includes('URL')) {
          setError('Eroare de configurare server. Contacteaza administratorul.')
        } else {
          setError(error.message)
        }
        return
      }
      if (data.user && !data.session) {
        setSuccess('Cont creat! Verifica emailul pentru confirmare, apoi autentifica-te.')
        setMode('login')
      } else if (data.session) {
        router.push('/dashboard')
      } else {
        setSuccess('Cont creat! Verifica emailul pentru confirmare, apoi autentifica-te.')
        setMode('login')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-sm p-8 space-y-5">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Tarifator</h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'login' ? 'Autentificare' : 'Creare cont nou'}
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
            placeholder="adresa@email.com"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Parola</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
            placeholder="minim 6 caractere"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-base disabled:bg-gray-300">
          {loading ? 'Se proceseaza...' : mode === 'login' ? 'Autentificare' : 'Creeaza cont'}
        </button>

        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
          className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">
          {mode === 'login' ? 'Nu ai cont? Creeaza unul' : 'Ai deja cont? Autentifica-te'}
        </button>

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          Prin utilizarea Tarifator, accepti{' '}
          <a href="/termeni" className="underline hover:text-gray-600">Termenii si Conditiile</a>,{' '}
          <a href="/confidentialitate" className="underline hover:text-gray-600">Politica GDPR</a> si{' '}
          <a href="/retragere" className="underline hover:text-gray-600">Politica de Rambursare</a>.
        </p>

      </div>
    </div>
  )
}
