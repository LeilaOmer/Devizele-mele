'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Client = { id: string; name: string; phone: string; email: string; cui: string; address: string; contact_person: string }

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState({ name: '', phone: '', email: '', cui: '', address: '', contact_person: '' })
  const [editing, setEditing] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').order('name')
    if (data) setClients(data)
  }

  async function handleAdd() {
    if (!form.name) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clients').insert({ ...form, user_id: user?.id })
    setForm({ name: '', phone: '', email: '', cui: '', address: '', contact_person: '' })
    await fetchClients()
    setLoading(false)
  }

  async function handleSaveEdit() {
    if (!editing) return
    setLoading(true)
    await supabase.from('clients').update({
      name: editing.name, phone: editing.phone, email: editing.email,
      cui: editing.cui, address: editing.address, contact_person: editing.contact_person
    }).eq('id', editing.id)
    setEditing(null)
    await fetchClients()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('clients').delete().eq('id', id)
    await fetchClients()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clienți</h1>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</a>
        </div>

        <div className="bg-white p-4 rounded shadow mb-6 space-y-2">
          <div className="flex gap-2">
            <input className="border p-2 rounded flex-1 text-gray-900" placeholder="Nume / Denumire firmă" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="border p-2 rounded w-36 text-gray-900" placeholder="CUI" value={form.cui} onChange={e => setForm({ ...form, cui: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <input className="border p-2 rounded flex-1 text-gray-900" placeholder="Adresă" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <input className="border p-2 rounded w-40 text-gray-900" placeholder="Persoană contact" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <input className="border p-2 rounded w-36 text-gray-900" placeholder="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className="border p-2 rounded flex-1 text-gray-900" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <button onClick={handleAdd} disabled={loading} className="bg-blue-600 text-white px-4 rounded">Adaugă</button>
          </div>
        </div>

        <div className="bg-white rounded shadow divide-y">
          {clients.length === 0 && <p className="p-4 text-gray-400">Niciun client.</p>}
          {clients.map(c => (
            <div key={c.id}>
              {editing?.id === c.id ? (
                <div className="p-4 space-y-2">
                  <div className="flex gap-2">
                    <input className="border p-2 rounded flex-1 text-gray-900" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                    <input className="border p-2 rounded w-36 text-gray-900" placeholder="CUI" value={editing.cui || ''} onChange={e => setEditing({ ...editing, cui: e.target.value })} />
                  </div>
                  <input className="border p-2 rounded w-full text-gray-900" placeholder="Adresă" value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} />
                  <div className="flex gap-2">
                    <input className="border p-2 rounded flex-1 text-gray-900" placeholder="Persoană contact" value={editing.contact_person || ''} onChange={e => setEditing({ ...editing, contact_person: e.target.value })} />
                    <input className="border p-2 rounded w-36 text-gray-900" placeholder="Telefon" value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} />
                    <input className="border p-2 rounded flex-1 text-gray-900" placeholder="Email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} disabled={loading} className="bg-green-600 text-white px-4 py-1 rounded text-sm">Salvează</button>
                    <button onClick={() => setEditing(null)} className="text-gray-500 text-sm">Anulează</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center p-4">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    {c.cui && <span className="text-gray-400 text-xs ml-2">CUI: {c.cui}</span>}
                    {c.phone && <span className="text-gray-500 text-sm ml-3">{c.phone}</span>}
                    {c.email && <span className="text-gray-500 text-sm ml-3">{c.email}</span>}
                    {c.address && <p className="text-gray-400 text-xs mt-0.5">{c.address}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setEditing(c)} className="text-blue-500 hover:text-blue-700 text-sm">Editează</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600 text-sm">Șterge</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}