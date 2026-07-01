'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { trialInfo } from '@/lib/trial'
import { getMonthlyFise, isPlanActive, FREE_FISE_LIMIT } from '@/lib/usage'
import { useRouter } from 'next/navigation'

type Quote = { id: string; title: string; status: string; total: number; created_at: string; client_id: string | null; company_id: string | null }
type Client = { id: string; name: string }
type Company = { id: string; name: string }

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [filterCompanyId, setFilterCompanyId] = useState<string>('all')
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
  const mode = localStorage.getItem('dashboardMode')
  const saved = mode === 'pro' ? localStorage.getItem('activeCompanyId') : null
  setActiveCompanyId(saved)
  setFilterCompanyId(saved || 'all')
  fetchData()
}, [])

async function fetchData() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { data: prof } = await supabase.from('profiles').select('account_type').eq('id', session.user.id).single()
  const isPro = prof?.account_type === 'pro' && localStorage.getItem('dashboardMode') === 'pro'

  const [{ data: q }, { data: c }, { data: cos }] = await Promise.all([
    supabase.from('quotes').select('*').order('created_at', { ascending: false }),
    supabase.from('clients').select('*').order('name'),
    isPro ? supabase.from('companies').select('id, name').order('name') : Promise.resolve({ data: [] }),
  ])
  if (q) setQuotes(q)
  if (c) setClients(c)
  if (cos) setCompanies(cos)
}
  async function handleCreate() {
    if (!title) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const t = trialInfo(session.user.created_at)
    if (!t.isActive) {
      const [active, fise] = await Promise.all([
        isPlanActive(session.user.id),
        getMonthlyFise(session.user.id),
      ])
      if (!active && fise >= FREE_FISE_LIMIT) {
        setLoading(false)
        router.push('/upgrade?type=fise')
        return
      }
    }

    const user = session.user
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const { data: counter } = await supabase.rpc('increment_counter', { counter_key: 'quote_number' })
    const quote_number = 'DR-' + year + month + '-' + String(counter).padStart(3, '0')
    const { data, error } = await supabase.from('quotes').insert({
      title, user_id: user.id, status: 'draft', total: 0,
      client_id: clientId || null, quote_number,
      company_id: activeCompanyId || null
    }).select().single()
    setLoading(false)
    if (error || !data) { alert('Nu s-a creat fisa: ' + (error?.message || 'eroare necunoscuta')); return }
    setTitle(''); setClientId('')
    router.push(`/quotes/${data.id}`)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (error) { alert('Nu s-a sters fisa: ' + error.message); return }
    await fetchData()
  }

  const clientName = (id: string | null) => id ? clients.find(c => c.id === id)?.name : null
  const companyName = (id: string | null) => id ? companies.find(c => c.id === id)?.name : null

const filteredQuotes = filterCompanyId === 'all' || !filterCompanyId
  ? quotes
  : quotes.filter(q => q.company_id === filterCompanyId)

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center text-blue-600 font-medium text-base py-1 px-2 -ml-2 rounded-lg">
            <span className="text-2xl leading-none">‹</span>
          </button>
          <h1 className="text-base font-bold text-gray-800">Fise Servicii</h1>
          <div className="w-8" />
        </div>
        {companies.length > 0 && (
          <div className="flex overflow-x-auto gap-0 border-t border-gray-100 scrollbar-hide">
            {companies.map(c => (
              <button key={c.id} onClick={() => setFilterCompanyId(c.id)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                  filterCompanyId === c.id
                    ? 'border-purple-500 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}>
                {c.name}
              </button>
            ))}
            <button onClick={() => setFilterCompanyId('all')}
              className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                filterCompanyId === 'all'
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              Toate
            </button>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* Creare fisa nou */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fisa Servicii Noua</p>
          {activeCompanyId && companyName(activeCompanyId) && (
            <p className="text-xs text-purple-600 font-medium">Firma: {companyName(activeCompanyId)}</p>
          )}
          <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
            placeholder="Titlu fisa" value={title} onChange={e => setTitle(e.target.value)} />
          <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
            value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Fara client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={handleCreate} disabled={loading || !title}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:bg-gray-300">
            {loading ? 'Se creeaza...' : '+ Creeaza fisa'}
          </button>
        </div>

        {/* Lista fise de servicii */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {filteredQuotes.length === 0 && (
            <p className="p-5 text-sm text-gray-400">Niciun fisa{filterCompanyId !== 'all' ? ' pentru firma selectata' : ''}.</p>
          )}
          <div className="divide-y divide-gray-50">
            {filteredQuotes.map(q => (
              <div key={q.id} className="flex justify-between items-center px-5 py-4 gap-3">
                <div className="flex-1 min-w-0">
                  <a href={`/quotes/${q.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">{q.title}</a>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {clientName(q.client_id) && <span className="text-xs text-gray-400">{clientName(q.client_id)}</span>}
                    {q.company_id && companyName(q.company_id) && (
                      <span className="text-xs text-purple-500 font-medium">{companyName(q.company_id)}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${q.status === 'draft' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {q.status === 'draft' ? 'Ciorna' : 'Finalizat'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-gray-700">{q.total} lei</span>
                  <button onClick={() => handleDelete(q.id)} className="text-red-400 text-lg leading-none">×</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}