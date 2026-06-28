'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Service = { id: string; name: string; unit: string; price_per_unit: number }
type PreviewItem = { service_id: string; name: string; quantity: number; unit_price: number; total: number }

export default function QuickPage() {
  const [services, setServices] = useState<Service[]>([])
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ client_name: string; items: PreviewItem[] } | null>(null)
  const router = useRouter()
  const committedRef = useRef('')
  const previewRef = useRef<{ client_name: string; items: PreviewItem[] } | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => { previewRef.current = preview }, [preview])

  useEffect(() => {
    async function loadServices() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: prof } = await supabase.from('profiles').select('account_type').eq('id', session.user.id).single()
      const isPro = prof?.account_type === 'pro' && localStorage.getItem('dashboardMode') === 'pro'
      const companyId = isPro ? localStorage.getItem('activeCompanyId') : null
      const { data } = companyId
        ? await supabase.from('services').select('*').eq('company_id', companyId).order('name')
        : await supabase.from('services').select('*').is('company_id', null).order('name')
      if (data) setServices(data)
    }
    loadServices()
  }, [])

  async function handleVoice() {
    if (listening) {
      mediaRecorderRef.current?.stop()
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      alert('Nu am acces la microfon.')
      return
    }

    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    chunksRef.current = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      setListening(false)
      setLoading(true)

      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const form = new FormData()
      form.append('file', blob, 'audio.webm')

      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const { text } = await res.json()

      if (!text) { setLoading(false); return }

      const full = (committedRef.current ? committedRef.current + ' ' + text : text).trim()
      setTranscript(full)

      if (previewRef.current) {
        handleEdit(full)
      } else {
        handleParse(full)
      }
    }

    mediaRecorder.start()
    setListening(true)
  }

  async function handleParse(input?: string) {
    const text = input || transcript
    if (!text) return
    setLoading(true)
    const res = await fetch('/api/parse-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, services })
    })
    const data = await res.json()
    const items: PreviewItem[] = (data.items || []).map((item: any) => {
      const service = services.find(s => s.id === item.service_id)
      if (!service) return null
      return {
        service_id: service.id,
        name: service.name,
        quantity: item.quantity,
        unit_price: service.price_per_unit,
        total: item.quantity * service.price_per_unit
      }
    }).filter(Boolean)
    setPreview({ client_name: data.client_name || '', items })
    setTranscript('')
    committedRef.current = ''
    setLoading(false)
  }

  async function handleEdit(input?: string) {
    const command = input || transcript
    const current = previewRef.current
    if (!command || !current) return
    setLoading(true)
    const res = await fetch('/api/edit-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, items: current.items, services })
    })
    const data = await res.json()
    const items: PreviewItem[] = (data.items || []).map((item: any) => {
      const service = services.find(s => s.id === item.service_id)
      if (!service) return null
      return {
        service_id: service.id,
        name: service.name,
        quantity: item.quantity,
        unit_price: service.price_per_unit,
        total: item.quantity * service.price_per_unit
      }
    }).filter(Boolean)
    setPreview({ ...current, items })
    setTranscript('')
    committedRef.current = ''
    setLoading(false)
  }

  async function handleConfirm() {
    if (!preview) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    let client_id = null
    if (preview.client_name) {
      const { data: existing } = await supabase.from('clients').select('id').ilike('name', preview.client_name).single()
      if (existing) {
        client_id = existing.id
      } else {
        const { data: newClient } = await supabase.from('clients').insert({ name: preview.client_name, user_id: user?.id }).select().single()
        client_id = newClient?.id
      }
    }
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const { data: counter } = await supabase.rpc('increment_counter', { counter_key: 'quote_number' })
    const quote_number = 'DR-' + year + month + '-' + String(counter).padStart(3, '0')
    const { data: quote } = await supabase.from('quotes').insert({
      title: 'Fisa Servicii ' + (preview.client_name || ''),
      user_id: user?.id,
      client_id,
      status: 'draft',
      total: 0,
      quote_number,
      company_id: localStorage.getItem('dashboardMode') === 'pro' ? (localStorage.getItem('activeCompanyId') || null) : null
    }).select().single()
    if (!quote) return setLoading(false)
    for (const item of preview.items) {
      await supabase.from('quote_items').insert({
        quote_id: quote.id,
        service_id: item.service_id,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price
      })
    }
    const total = preview.items.reduce((sum, i) => sum + i.total, 0)
    await supabase.from('quotes').update({ total }).eq('id', quote.id)
    router.push('/quotes/' + quote.id)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <style>{`.fixed.bottom-24 { display: none; }`}</style>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Fisa Servicii Voce</h1>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</a>
        </div>

        <div className="bg-white p-6 rounded shadow mb-4 space-y-4">
          <button onClick={handleVoice} className={'w-full p-4 rounded text-white text-lg font-medium ' + (listening ? 'bg-red-500' : 'bg-purple-600 hover:bg-purple-700')}>
            {listening ? '🔴 Ascult...' : preview ? '✏️ Modifică prin voce' : '🎤 Dictează'}
          </button>
          {transcript && (
            <div className="border rounded p-3 text-gray-700 text-sm">{transcript}</div>
          )}
          {loading && (
            <p className="text-center text-sm text-gray-400">Procesez...</p>
          )}
          <button onClick={() => { setPreview(null); setTranscript(''); committedRef.current = '' }}
            className="w-full bg-gray-100 text-gray-600 p-3 rounded font-medium">
            Fișă nouă
          </button>
        </div>

        {preview && (
          <div className="bg-white p-6 rounded shadow space-y-4">
            <h2 className="font-bold text-lg">Preview</h2>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">Client:</span>
              <input className="border p-1 rounded text-sm text-gray-900 flex-1" value={preview.client_name} onChange={e => setPreview({ ...preview, client_name: e.target.value })} />
            </div>
            <div className="divide-y border rounded">
              {preview.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-500">x{item.quantity} × {item.unit_price} lei = <strong>{item.total} lei</strong></span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total</span>
              <span className="text-blue-600">{preview.items.reduce((s, i) => s + i.total, 0)} lei</span>
            </div>
            <button onClick={handleConfirm} disabled={loading} className="w-full bg-green-600 text-white p-3 rounded font-medium disabled:bg-gray-300">
              {loading ? 'Salvez...' : 'Confirmă și salvează'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}