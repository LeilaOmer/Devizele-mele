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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('account_type').eq('id', session.user.id).single()
      if (prof) setAccountType(prof.account_type || 'meseriaș')

      if (prof?.account_type === 'pro') {
        const { data: cos } = await supabase.from('companies').select('id, name, cui').order('name')
        setCompanies(cos || [])
        // Preia firma activa din localStorage
        const saved = localStorage.getItem('activeCompanyId')
        if (saved && cos?.find(c => c.id === saved)) {
          setActiveCompanyId(saved)
          const savedCompany = cos.find(c => c.id === saved)
          if (savedCompany) localStorage.setItem('activeCompanyName', savedCompany.name)
        } else if (cos && cos.length > 0) {
          setActiveCompanyId(cos[0].id)
          localStorage.setItem('activeCompanyId', cos[0].id)
          localStorage.setItem('activeCompanyName', cos[0].name)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  function selectCompany(id: string) {
  const co = companies.find(c => c.id === id)
  setActiveCompanyId(id)
  localStorage.setItem('activeCompanyId', id)
  if (co) localStorage.setItem('activeCompanyName', co.name)
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
      <div className="max-w-xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <h1 className="text-2xl font-bold text-gray-900">Tarifator</h1>
          <div className="flex gap-4 items-center">
            <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700">Setari</a>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Iesi</button>
          </div>
        </div>

        {/* Selector firma activa — doar Pro */}
        {accountType === 'pro' && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Emiti ca</p>
            {companies.length === 0 ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">Nicio firma adaugata.</p>
                <a href="/settings" className="text-sm font-semibold text-blue-600">+ Adauga firma</a>
              </div>
            ) : (
              <div className="space-y-2">
                {companies.map(c => (
                  <button key={c.id} onClick={() => selectCompany(c.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      activeCompanyId === c.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white'
                    }`}>
                    <div>
                      <p className={`text-sm font-bold ${activeCompanyId === c.id ? 'text-purple-700' : 'text-gray-800'}`}>
                        {c.name}
                      </p>
                      {c.cui && <p className="text-xs text-gray-400">CUI: {c.cui}</p>}
                    </div>
                    {activeCompanyId === c.id && (
                      <span className="text-purple-500 text-lg">✓</span>
                    )}
                  </button>
                ))}
                <a href="/settings" className="block text-center text-xs text-blue-600 pt-1">
                  + Adauga / editeaza firme
                </a>
              </div>
            )}
          </div>
        )}

        {/* Banner firma activa */}
        {accountType === 'pro' && activeCompany && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
            <p className="text-xs text-purple-500 font-semibold uppercase tracking-wide">Firma activa</p>
            <p className="text-sm font-bold text-purple-800">{activeCompany.name}</p>
          </div>
        )}

        {/* Grid navigare */}
        <div className="grid grid-cols-2 gap-4">
          <a href="/quotes" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all">
            <div className="text-2xl mb-2">📋</div>
            <h2 className="font-semibold text-lg text-gray-900">Fise Servicii</h2>
            <p className="text-gray-500 text-sm">Creeaza si gestioneaza fise de servicii</p>
          </a>

          <a href="/quick" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all">
            <div className="text-2xl mb-2">🎙️</div>
            <h2 className="font-semibold text-lg text-gray-900">Fisa Servicii Voce</h2>
            <p className="text-gray-500 text-sm">Dicteaza si genereaza instant</p>
          </a>

          <a href="/services" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all">
            <div className="text-2xl mb-2">🔧</div>
            <h2 className="font-semibold text-lg text-gray-900">Servicii</h2>
            <p className="text-gray-500 text-sm">Gestioneaza lista de servicii</p>
          </a>

          <a href="/clients" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all">
            <div className="text-2xl mb-2">👥</div>
            <h2 className="font-semibold text-lg text-gray-900">Clienti</h2>
            <p className="text-gray-500 text-sm">Gestioneaza lista de clienti</p>
          </a>

          <a href="/pricing" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all col-span-2">
            <div className="text-2xl mb-2">🏷️</div>
            <h2 className="font-semibold text-lg text-gray-900">Calculator Pret Vanzare</h2>
            <p className="text-gray-500 text-sm">Adaos comercial · TVA · Rotunjire · PDF contabil + magazin</p>
          </a>
        </div>

      </div>
    </div>
  )
}