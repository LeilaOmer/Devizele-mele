'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  unit: string
  price_per_unit: number
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [activeCompanyName, setActiveCompanyName] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: prof } = await supabase.from('profiles').select('account_type').eq('id', session.user.id).single()
      const pro = prof?.account_type === 'pro'
      setIsPro(pro)

      if (pro) {
        const compId = localStorage.getItem('activeCompanyId') || null
        const compName = localStorage.getItem('activeCompanyName') || null
        setActiveCompanyId(compId)
        setActiveCompanyName(compName)
        fetchServices(compId)
      } else {
        fetchServices(null)
      }
    }
    init()
  }, [])

  async function fetchServices(companyId: string | null) {
    let query = supabase.from('services').select('*').order('name')
    if (companyId) {
      query = query.eq('company_id', companyId)
    } else {
      query = query.is('company_id', null)
    }
    const { data } = await query
    if (data) setServices(data)
  }

  async function handleAdd() {
    if (!name || !unit || !price) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload: Record<string, unknown> = {
      name, unit, price_per_unit: parseFloat(price), user_id: user?.id
    }
    if (isPro && activeCompanyId) {
      payload.company_id = activeCompanyId
    }
    await supabase.from('services').insert(payload)
    setName(''); setUnit(''); setPrice('')
    await fetchServices(isPro ? activeCompanyId : null)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('services').delete().eq('id', id)
    await fetchServices(isPro ? activeCompanyId : null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Servicii</h1>
            {isPro && activeCompanyName && (
              <p className="text-sm text-purple-600 font-medium mt-0.5">Firma activa: {activeCompanyName}</p>
            )}
            {isPro && !activeCompanyName && (
              <p className="text-sm text-orange-500 mt-0.5">Nicio firma activa selectata</p>
            )}
          </div>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</a>
        </div>
        <div className="bg-white p-4 rounded shadow mb-6 flex gap-2">
          <input className="border p-2 rounded flex-1" placeholder="Nume serviciu" value={name} onChange={e => setName(e.target.value)} />
          <input className="border p-2 rounded w-24" placeholder="UM (mp, h)" value={unit} onChange={e => setUnit(e.target.value)} />
          <input className="border p-2 rounded w-32" placeholder="Pret/UM" type="number" value={price} onChange={e => setPrice(e.target.value)} />
          <button onClick={handleAdd} disabled={loading} className="bg-blue-600 text-white px-4 rounded">Adauga</button>
        </div>
        <div className="bg-white rounded shadow divide-y">
          {services.length === 0 && <p className="p-4 text-gray-400">Niciun serviciu adaugat.</p>}
          {services.map(s => (
            <div key={s.id} className="flex justify-between items-center p-4">
              <div>
                <span className="font-medium">{s.name}</span>
                <span className="text-gray-400 text-sm ml-2">{s.unit}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold">{s.price_per_unit} lei/{s.unit}</span>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 text-sm">Sterge</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
