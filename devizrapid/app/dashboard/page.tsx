'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { trialInfo } from '@/lib/trial'
import { getMonthlyFise, getMonthlyCalcule, isPlanActive, FREE_FISE_LIMIT, FREE_CALCULE_LIMIT } from '@/lib/usage'
import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
  cui: string | null
}

export default function Dashboard() {
  const router = useRouter()
  // plan = ce a achizitionat (din DB), mode = modul activ curent (din localStorage)
  const [plan, setPlan] = useState<'artizan' | 'pro' | null>(null)
  const [mode, setMode] = useState<'artizan' | 'pro'>('artizan')
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [trial, setTrial] = useState<{ daysLeft: number; isActive: boolean; urgency: 'ok' | 'warning' | 'critical' } | null>(null)
  const [usage, setUsage] = useState<{ fise: number; calcule: number } | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [fbOpen, setFbOpen] = useState(false)
  const [fbText, setFbText] = useState('')
  const [fbRecording, setFbRecording] = useState(false)
  const [fbSending, setFbSending] = useState(false)
  const [fbDone, setFbDone] = useState(false)
  const fbRecorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // verifica daca emailul a fost sters anterior (anti-abuz)
      const { data: wasDeleted } = await supabase.rpc('is_account_deleted', {
        user_email: session.user.email,
      })

      // verifica trial (sarit daca contul a fost recreat)
      const rawTrial = trialInfo(session.user.created_at)
      const t = wasDeleted ? { ...rawTrial, isActive: false } : rawTrial
      setTrial(t)
      if (!t.isActive) {
        const [active, fise, calcule] = await Promise.all([
          isPlanActive(session.user.id),
          getMonthlyFise(session.user.id),
          getMonthlyCalcule(session.user.id),
        ])
        setSubscribed(active)
        setUsage({ fise, calcule })
      }

      let { data: prof } = await supabase
        .from('profiles').select('account_type, company_name, email').eq('id', session.user.id).single()
      if (!prof) {
        await supabase.from('profiles').insert({ id: session.user.id, account_type: 'artizan' })
        router.push('/settings')
        return
      }

      // in trial, toata lumea are acces complet (pro)
      const userPlan: 'artizan' | 'pro' = 'pro'
      setPlan(userPlan)

      // modul activ: localStorage > account_type din DB > artizan
      const savedMode = localStorage.getItem('dashboardMode') as 'artizan' | 'pro' | null
      const dbMode = prof?.account_type === 'pro' ? 'pro' : 'artizan'
      const activeMode: 'artizan' | 'pro' = userPlan === 'pro' && (savedMode === 'pro' || (savedMode === null && dbMode === 'pro')) ? 'pro' : 'artizan'
      setMode(activeMode)

      setDisplayName(prof.email || session.user.email || '')

      if (userPlan === 'pro') {
        const { data: cos } = await supabase.from('companies').select('id, name, cui').order('name')
        setCompanies(cos || [])
        const saved = localStorage.getItem('activeCompanyId')
        const match = cos?.find(c => c.id === saved)
        const active = match || cos?.[0] || null
        if (active) {
          setActiveCompanyId(active.id)
          if (activeMode === 'pro') setDisplayName(active.name)
          localStorage.setItem('activeCompanyId', active.id)
          localStorage.setItem('activeCompanyName', active.name)
        }
      }
      if (!localStorage.getItem('welcomed')) setShowWelcome(true)
      setLoading(false)
    }
    load()
  }, [])

  function switchMode(newMode: 'artizan' | 'pro') {
    if (plan !== 'pro') return
    setMode(newMode)
    localStorage.setItem('dashboardMode', newMode)
    if (newMode === 'artizan') {
      setDisplayName('')
    } else {
      const active = companies.find(c => c.id === activeCompanyId) || companies[0]
      if (active) setDisplayName(active.name)
    }
  }

  function selectCompany(id: string) {
    const company = companies.find(c => c.id === id)
    if (!company) return
    setActiveCompanyId(id)
    localStorage.setItem('activeCompanyId', id)
    localStorage.setItem('activeCompanyName', company.name)
    setDisplayName(company.name)
  }

  async function startFbVoice() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const chunks: BlobPart[] = []
    const rec = new MediaRecorder(stream)
    fbRecorderRef.current = rec
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const form = new FormData()
      form.append('file', blob, 'audio.webm')
      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const { text } = await res.json()
      if (text) setFbText(prev => prev ? prev + ' ' + text : text)
      setFbRecording(false)
    }
    rec.start()
    setFbRecording(true)
  }

  function stopFbVoice() {
    fbRecorderRef.current?.stop()
  }

  async function sendFeedback() {
    if (!fbText.trim()) return
    setFbSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('feedback').insert({ user_id: session.user.id, message: fbText.trim() })
    }
    setFbText('')
    setFbDone(true)
    setFbSending(false)
    setTimeout(() => { setFbDone(false); setFbOpen(false) }, 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Se incarca...</p>
    </div>
  )

  const activeCompany = companies.find(c => c.id === activeCompanyId)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="flex justify-between items-center pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-black text-xl leading-none">T</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Tarifator</h1>
              {displayName && (
                <p className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">{displayName}</p>
              )}
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700">Setari</a>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Iesi</button>
          </div>
        </div>

        {/* Onboarding — prima vizita */}
        {showWelcome && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">👋</span>
              <div>
                <p className="text-sm font-bold text-blue-900">Primul pas: adauga-ti serviciile</p>
                <p className="text-xs text-blue-500">Fara ele, nici fisele nici calculatorul nu functioneaza.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a href="/services" onClick={() => localStorage.setItem('welcomed', '1')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap">Adauga →</a>
              <button onClick={() => { localStorage.setItem('welcomed', '1'); setShowWelcome(false) }}
                className="text-blue-300 hover:text-blue-500 text-xl leading-none">×</button>
            </div>
          </div>
        )}

        {/* Banner trial activ */}
        {trial?.isActive && (
          <div className={`rounded-2xl px-4 py-3 flex items-center justify-between ${
            trial.urgency === 'critical' ? 'bg-red-50 border border-red-200' :
            trial.urgency === 'warning'  ? 'bg-amber-50 border border-amber-200' :
                                           'bg-green-50 border border-green-200'
          }`}>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${
                trial.urgency === 'critical' ? 'text-red-500' :
                trial.urgency === 'warning'  ? 'text-amber-500' : 'text-green-600'
              }`}>
                {trial.urgency === 'critical' ? '⚠️ Trial aproape de final' :
                 trial.urgency === 'warning'  ? '⏳ Trial activ' : '✓ Trial activ'}
              </p>
              <p className={`text-sm font-semibold ${
                trial.urgency === 'critical' ? 'text-red-700' :
                trial.urgency === 'warning'  ? 'text-amber-700' : 'text-green-700'
              }`}>
                {trial.daysLeft === 1 ? 'Ultima zi' : `${trial.daysLeft} zile ramase`} · Acces complet gratuit
              </p>
            </div>
            <span className={`text-2xl font-black ${
              trial.urgency === 'critical' ? 'text-red-300' :
              trial.urgency === 'warning'  ? 'text-amber-300' : 'text-green-300'
            }`}>{trial.daysLeft}</span>
          </div>
        )}

        {/* Banner utilizare gratuita (dupa trial) */}
        {trial && !trial.isActive && !subscribed && usage && (
          <div className="rounded-2xl px-4 py-3 bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Utilizare luna aceasta</p>
              <a href="/upgrade" className="text-xs font-bold text-blue-600">Upgradeaza →</a>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-500">Fise Servicii</p>
                <p className={`text-sm font-bold ${usage.fise >= FREE_FISE_LIMIT ? 'text-red-500' : 'text-gray-800'}`}>
                  {usage.fise} / {FREE_FISE_LIMIT}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Calcule Pret</p>
                <p className={`text-sm font-bold ${usage.calcule >= FREE_CALCULE_LIMIT ? 'text-red-500' : 'text-gray-800'}`}>
                  {usage.calcule} / {FREE_CALCULE_LIMIT}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Unelte principale — carduri mari */}
        <div className="grid grid-cols-2 gap-3">
          <a href="/quick"
            className="bg-blue-100 p-5 rounded-2xl shadow hover:bg-blue-200 active:scale-95 transition-all flex flex-col min-h-[160px]">
            <svg className="w-8 h-8 mb-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <h2 className="font-bold text-xl leading-tight text-gray-900">Fisa Servicii Voce</h2>
            <p className="text-blue-700 text-sm mt-1.5">Dicteaza si genereaza instant</p>
          </a>
          <a href="/pricing"
            className="bg-amber-100 p-5 rounded-2xl shadow hover:bg-amber-200 active:scale-95 transition-all flex flex-col min-h-[160px]">
            <svg className="w-8 h-8 mb-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            <h2 className="font-bold text-xl leading-tight text-gray-900">Calculator Pret Vanzare</h2>
            <p className="text-amber-700 text-sm mt-1.5">Adaos · TVA · PDF</p>
          </a>
        </div>

        {/* Sectiunea inferioara: stanga unelte, dreapta tip cont */}
        <div className="grid grid-cols-2 gap-3 items-start">

          {/* Stanga: fise servicii, servicii, clienti */}
          <div className="flex flex-col gap-3">
            <a href="/quotes"
              className="bg-white p-4 rounded-2xl shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className="font-semibold text-sm text-gray-900">Fise Servicii</p>
                <p className="text-gray-400 text-xs">Creeaza si gestioneaza</p>
              </div>
            </a>
            <a href="/services"
              className="bg-white p-4 rounded-2xl shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-3">
              <span className="text-xl">🔧</span>
              <div>
                <p className="font-semibold text-sm text-gray-900">Servicii</p>
                <p className="text-gray-400 text-xs">Lista de servicii</p>
              </div>
            </a>
            <a href="/clients"
              className="bg-white p-4 rounded-2xl shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-3">
              <span className="text-xl">👥</span>
              <div>
                <p className="font-semibold text-sm text-gray-900">Clienti</p>
                <p className="text-gray-400 text-xs">Lista de clienti</p>
              </div>
            </a>

            {/* Widget feedback */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {!fbOpen ? (
                <button onClick={() => setFbOpen(true)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 active:scale-95 transition-all text-left">
                  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Feedback</p>
                    <p className="text-gray-400 text-xs">Ce am putea imbunatati?</p>
                  </div>
                </button>
              ) : (
                <div className="p-4 space-y-3">
                  {fbDone ? (
                    <p className="text-sm font-semibold text-green-600 text-center py-3">Multumim! Am primit mesajul.</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sugestie sau problema</p>
                        <button onClick={() => { setFbOpen(false); setFbText('') }}
                          className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
                      </div>
                      <textarea
                        value={fbText}
                        onChange={e => setFbText(e.target.value)}
                        placeholder="Spune-ne ce ai vrea sa fie diferit..."
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:border-blue-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={fbRecording ? stopFbVoice : startFbVoice}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                            fbRecording ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                          }`}>
                          {fbRecording ? (
                            <>
                              <span className="w-2 h-2 rounded-sm bg-red-500 animate-pulse" />
                              Stop
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                              </svg>
                              Dicteaza
                            </>
                          )}
                        </button>
                        <button
                          onClick={sendFeedback}
                          disabled={fbSending || !fbText.trim()}
                          className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl disabled:bg-gray-300 transition-colors">
                          {fbSending ? 'Se trimite...' : 'Trimite'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dreapta: selector mod + firma activa */}
          <div className="flex flex-col gap-3">

            {/* Tab artizan */}
            <button
              onClick={() => switchMode('artizan')}
              disabled={plan !== 'pro'}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                mode === 'artizan'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 active:scale-95'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔨</span>
                <span className={`font-bold text-sm ${mode === 'artizan' ? 'text-blue-700' : 'text-gray-600'}`}>
                  Artizan
                </span>
                {mode === 'artizan' && (
                  <span className="ml-auto text-[10px] font-bold text-blue-500 uppercase tracking-wide">activ</span>
                )}
              </div>
              <p className="text-xs text-gray-400">Fara TVA · Fara firme</p>
            </button>

            {/* Tab pro */}
            <button
              onClick={() => plan === 'pro' ? switchMode('pro') : undefined}
              disabled={plan !== 'pro'}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                plan !== 'pro'
                  ? 'border-dashed border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed'
                  : mode === 'pro'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-300 active:scale-95'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{plan === 'pro' ? '⚡' : '🔒'}</span>
                <span className={`font-bold text-sm ${mode === 'pro' ? 'text-purple-700' : plan === 'pro' ? 'text-gray-600' : 'text-gray-400'}`}>
                  Pro
                </span>
                {mode === 'pro' && (
                  <span className="ml-auto text-[10px] font-bold text-purple-500 uppercase tracking-wide">activ</span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {plan === 'pro' ? 'TVA · Firme multiple' : 'Necesita achizitie'}
              </p>
            </button>

            {/* Firma activa — vizibila cand modul e pro */}
            {plan === 'pro' && mode === 'pro' && (
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3">
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wide mb-1">Firma activa</p>
                {companies.length > 0 ? (
                  <select
                    value={activeCompanyId || ''}
                    onChange={e => selectCompany(e.target.value)}
                    className="w-full text-sm font-bold text-purple-800 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none cursor-pointer">
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <a href="/settings" className="text-xs text-purple-500 font-semibold">+ Adauga firma</a>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
