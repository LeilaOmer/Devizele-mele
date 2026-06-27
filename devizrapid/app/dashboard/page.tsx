'use client'

import { useState, useEffect } from 'react'
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
  const [plan, setPlan] = useState<'meseriaș' | 'pro' | null>(null)
  const [mode, setMode] = useState<'meseriaș' | 'pro'>('meseriaș')
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [trial, setTrial] = useState<{ daysLeft: number; isActive: boolean; urgency: 'ok' | 'warning' | 'critical' } | null>(null)
  const [usage, setUsage] = useState<{ fise: number; calcule: number } | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

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
        await supabase.from('profiles').insert({ id: session.user.id, account_type: 'meseriaș' })
        router.push('/settings')
        return
      }

      // in trial, toata lumea are acces complet (pro)
      const userPlan: 'meseriaș' | 'pro' = 'pro'
      setPlan(userPlan)

      // modul activ: localStorage > account_type din DB > meserias
      const savedMode = localStorage.getItem('dashboardMode') as 'meseriaș' | 'pro' | null
      const dbMode = prof?.account_type === 'pro' ? 'pro' : 'meseriaș'
      const activeMode: 'meseriaș' | 'pro' = userPlan === 'pro' && (savedMode === 'pro' || (savedMode === null && dbMode === 'pro')) ? 'pro' : 'meseriaș'
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
      setLoading(false)
    }
    load()
  }, [])

  function switchMode(newMode: 'meseriaș' | 'pro') {
    if (plan !== 'pro') return
    setMode(newMode)
    localStorage.setItem('dashboardMode', newMode)
    if (newMode === 'meseriaș') {
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
            className="bg-blue-600 text-white p-5 rounded-2xl shadow hover:bg-blue-700 active:scale-95 transition-all flex flex-col min-h-[160px]">
            <span className="text-4xl mb-3">🎙️</span>
            <h2 className="font-bold text-xl leading-tight">Fișă Servicii Voce</h2>
            <p className="text-blue-200 text-sm mt-1.5">Dictează și generează instant</p>
          </a>
          <a href="/pricing"
            className="bg-amber-500 text-white p-5 rounded-2xl shadow hover:bg-amber-600 active:scale-95 transition-all flex flex-col min-h-[160px]">
            <span className="text-4xl mb-3">🏷️</span>
            <h2 className="font-bold text-xl leading-tight">Calculator Preț Vânzare</h2>
            <p className="text-amber-100 text-sm mt-1.5">Adaos · TVA · PDF</p>
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
          </div>

          {/* Dreapta: selector mod + firma activa */}
          <div className="flex flex-col gap-3">

            {/* Tab meserias */}
            <button
              onClick={() => switchMode('meseriaș')}
              disabled={plan !== 'pro'}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                mode === 'meseriaș'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 active:scale-95'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔨</span>
                <span className={`font-bold text-sm ${mode === 'meseriaș' ? 'text-blue-700' : 'text-gray-600'}`}>
                  Meserias
                </span>
                {mode === 'meseriaș' && (
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
