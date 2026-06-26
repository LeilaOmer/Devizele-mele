'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    const { data } = await supabase.from('services').select('*').is('company_id', null).order('name')
    if (data) setServices(data)
  }

  async function handleAdd() {
    if (!name || !unit || !price) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('services').insert({
      name, unit, price_per_unit: parseFloat(price), user_id: user?.id
    })
    setName(''); setUnit(''); setPrice('')
    await fetchServices()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('services').delete().eq('id', id)
    await fetchServices()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Servicii</h1>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</a>
        </div>
        <div className="bg-white p-4 rounded shadow mb-6 flex gap-2">
          <input className="border p-2 rounded flex-1" placeholder="Nume serviciu" value={name} onChange={e => setName(e.target.value)} />
          <input className="border p-2 rounded w-24" placeholder="UM (mp, h)" value={unit} onChange={e => setUnit(e.target.value)} />
          <input className="border p-2 rounded w-32" placeholder="Preț/UM" type="number" value={price} onChange={e => setPrice(e.target.value)} />
          <button onClick={handleAdd} disabled={loading} className="bg-blue-600 text-white px-4 rounded">Adaugă</button>
        </div>
        <div className="bg-white rounded shadow divide-y">
          {services.length === 0 && <p className="p-4 text-gray-400">Niciun serviciu adăugat.</p>}
          {services.map(s => (
            <div key={s.id} className="flex justify-between items-center p-4">
              <div>
                <span className="font-medium">{s.name}</span>
                <span className="text-gray-400 text-sm ml-2">{s.unit}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold">{s.price_per_unit} lei/{s.unit}</span>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 text-sm">Șterge</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}