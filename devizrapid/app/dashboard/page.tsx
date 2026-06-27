'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
  cui: string | null
}

export default function Dashboard() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<'meseriaș' | 'pro' | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      let { data: prof } = await supabase
        .from('profiles').select('account_type, company_name, email').eq('id', session.user.id).single()
      if (!prof) {
        await supabase.from('profiles').insert({ id: session.user.id, account_type: 'meseriaș' })
        prof = { account_type: 'meseriaș', company_name: null, email: null }
      }
      const type: 'meseriaș' | 'pro' = prof.account_type || 'meseriaș'
      setAccountType(type)

      const nameFromProfile = prof.company_name || prof.email || session.user.email || ''
      setDisplayName(nameFromProfile)

      if (type === 'pro') {
        const { data: cos } = await supabase.from('companies').select('id, name, cui').order('name')
        setCompanies(cos || [])
        const saved = localStorage.getItem('activeCompanyId')
        const match = cos?.find(c => c.id === saved)
        const active = match || cos?.[0] || null
        if (active) {
          setActiveCompanyId(active.id)
          setDisplayName(active.name)
          localStorage.setItem('activeCompanyId', active.id)
          localStorage.setItem('activeCompanyName', active.name)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

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
        <div className="flex justify-between items-center pt-2 pb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tarifator</h1>
            {displayName && (
              <p className="text-xs text-gray-400 truncate max-w-[200px]">{displayName}</p>
            )}
          </div>
          <div className="flex gap-4 items-center">
            <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700">Setari</a>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Iesi</button>
          </div>
        </div>

        {/* Unelte principale — carduri mari */}
        <div className="grid grid-cols-2 gap-3">
          <a href="/quick"
            className="bg-blue-600 text-white p-5 rounded-2xl shadow hover:bg-blue-700 active:scale-95 transition-all flex flex-col min-h-[130px]">
            <span className="text-3xl mb-3">🎙️</span>
            <h2 className="font-bold text-base leading-tight">Fisa Servicii Voce</h2>
            <p className="text-blue-200 text-xs mt-1">Dicteaza si genereaza instant</p>
          </a>
          <a href="/pricing"
            className="bg-amber-500 text-white p-5 rounded-2xl shadow hover:bg-amber-600 active:scale-95 transition-all flex flex-col min-h-[130px]">
            <span className="text-3xl mb-3">🏷️</span>
            <h2 className="font-bold text-base leading-tight">Calculator Pret Vanzare</h2>
            <p className="text-amber-100 text-xs mt-1">Adaos · TVA · PDF</p>
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

          {/* Dreapta: selector tip cont + firma activa */}
          <div className="flex flex-col gap-3">
            {/* Tab meserias */}
            <div className={`p-4 rounded-2xl border-2 ${
              accountType === 'meseriaș'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔨</span>
                <span className={`font-bold text-sm ${accountType === 'meseriaș' ? 'text-blue-700' : 'text-gray-600'}`}>
                  Meserias
                </span>
                {accountType === 'meseriaș' && (
                  <span className="ml-auto text-[10px] font-bold text-blue-500 uppercase tracking-wide">activ</span>
                )}
              </div>
              <p className="text-xs text-gray-400">Fara TVA · Fara firme</p>
            </div>

            {/* Tab pro — blocat daca nu e achizitionat */}
            <div className={`p-4 rounded-2xl border-2 ${
              accountType === 'pro'
                ? 'border-purple-500 bg-purple-50'
                : 'border-dashed border-gray-300 bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{accountType === 'pro' ? '⚡' : '🔒'}</span>
                <span className={`font-bold text-sm ${accountType === 'pro' ? 'text-purple-700' : 'text-gray-400'}`}>
                  Pro
                </span>
                {accountType === 'pro' && (
                  <span className="ml-auto text-[10px] font-bold text-purple-500 uppercase tracking-wide">activ</span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {accountType === 'pro' ? 'TVA · Firme multiple' : 'Necesita achizitie'}
              </p>
            </div>

            {/* Firma activa — doar pro */}
            {accountType === 'pro' && (
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3">
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wide mb-0.5">Firma activa</p>
                {activeCompany ? (
                  <>
                    <p className="text-sm font-bold text-purple-800 truncate">{activeCompany.name}</p>
                    <a href="/settings" className="text-xs text-purple-400 hover:text-purple-600">Schimba →</a>
                  </>
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
