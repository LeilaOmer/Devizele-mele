'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { trialInfo } from '@/lib/trial'
import { getMonthlyCalcule, isPlanActive, logCalcul, FREE_CALCULE_LIMIT } from '@/lib/usage'
import { Item, RoundStep, RoundMode, emptyItem, fmt2 } from '@/lib/pricing/calc'
import { exportPDFContabil, exportPDFMagazin } from '@/lib/pricing/pdf'
import ItemCard from './ItemCard'

export default function PricingPage() {
  const router = useRouter()
  const [supplier, setSupplier] = useState('')
  const [adaos, setAdaos] = useState('30')
  const [vat, setVat] = useState<11 | 21>(21)
  const [roundStep, setRoundStep] = useState<RoundStep>('0.50')
  const [roundMode, setRoundMode] = useState<RoundMode>('nearest')
  const [items, setItems] = useState<Item[]>([emptyItem(21)])
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usageInfo, setUsageInfo] = useState<{ calcule: number; limit: number; show: boolean } | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [scanningInvoice, setScanningInvoice] = useState(false)
  const [scanError, setScanError] = useState('')

  // ── Invoice scan ──────────────────────────────────────────────────────────

  async function handleInvoiceScan(file: File) {
    setScanningInvoice(true)
    setScanError('')
    try {
      const isImage = file.type.startsWith('image/')
      let body: Record<string, string>

      const readBase64 = (f: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(f)
      })

      const resizeImage = (f: File): Promise<string> => new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(f)
        img.onload = () => {
          URL.revokeObjectURL(url)
          const MAX = 1280
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const w = Math.round(img.width * scale)
          const h = Math.round(img.height * scale)
          const canvas = document.createElement('canvas')
          canvas.width = w; canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) { reject(new Error('canvas unavailable')); return }
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.88).split(',')[1])
        }
        img.onerror = reject
        img.src = url
      })

      if (isImage) {
        body = { imageBase64: await resizeImage(file), mimeType: 'image/jpeg' }
      } else {
        body = { docBase64: await readBase64(file), mimeType: file.type || 'application/pdf', fileName: file.name }
      }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/parse-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setScanError(
          res.status === 401 ? 'Trebuie sa fii autentificat pentru a scana facturi.' :
          res.status === 429 ? 'Ai atins limita de 50 scanari pe zi. Revino maine.' :
          data.error === 'groq_rate_limit' ? 'Serverul AI este aglomerat. Asteapta 15 secunde si incearca din nou.' :
          data.error === 'vision_failed' ? 'Poza neclara sau unghi dificil. Incearca mai aproape, cu lumina mai buna, sau incarca PDF-ul direct.' :
          `Eroare: ${data.error || 'necunoscuta'}`
        )
        return
      }
      if (data.supplier) setSupplier(data.supplier)
      if (data.items?.length) {
        setItems(data.items.map((i: { name: string; unit: string; supplier_price: number; discount: number; vat: number; sgr: number }) => ({
          id: crypto.randomUUID(),
          name: i.name || '',
          unit: i.unit || 'buc',
          supplierPrice: i.supplier_price ? String(i.supplier_price) : '',
          discount: i.discount ? String(i.discount) : '0',
          vat: (i.vat === 11 ? 11 : 21) as 11 | 21,
          sgr: i.sgr ? String(i.sgr) : '0',
        })))
      } else {
        setScanError('Nu s-au gasit produse. Incearca o poza mai clara sau incarca PDF-ul.')
      }
    } catch {
      setScanError('Eroare de retea. Verifica conexiunea si incearca din nou.')
    } finally {
      setScanningInvoice(false)
    }
  }

  // ── Voice input ───────────────────────────────────────────────────────────

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [voiceMsg, setVoiceMsg] = useState('')

  function stopVoice() {
    if (silenceTimerRef.current) { clearInterval(silenceTimerRef.current); silenceTimerRef.current = null }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null }
    mediaRecorderRef.current?.stop()
  }

  async function handleVoice() {
    if (listening) { stopVoice(); return }
    setVoiceMsg('')
    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch { alert('Nu am acces la microfon.'); return }

    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    chunksRef.current = []
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      setListening(false); setLoading(true)
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const form = new FormData()
      form.append('file', blob, 'audio.webm')
      const { data: { session } } = await supabase.auth.getSession()
      const authHeader: HeadersInit = session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}
      const tr = await fetch('/api/transcribe', { method: 'POST', headers: authHeader, body: form })
      const { text } = await tr.json()
      if (!text) { setLoading(false); setVoiceMsg('Nu am prins nimic. Vorbeste mai tare sau mai aproape de microfon.'); return }
      setVoiceMsg(`Am auzit: "${text}"`)
      const res = await fetch('/api/parse-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader as Record<string, string>) },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      const parsed: Item[] = (data.items || []).map((i: { name: string; unit: string; supplier_price: number; discount: number; vat: number }) => ({
        id: crypto.randomUUID(),
        name: i.name || '',
        unit: i.unit || 'buc',
        supplierPrice: i.supplier_price != null && i.supplier_price !== 0 ? String(i.supplier_price) : '',
        discount: String(i.discount ?? 0),
        vat: (i.vat === 11 ? 11 : 21) as 11 | 21,
        sgr: '0',
      })).filter((i: Item) => i.name)
      if (parsed.length > 0) {
        setItems(prev => {
          const clean = prev.filter(p => p.name || p.supplierPrice)
          return [...clean, ...parsed]
        })
        setVoiceMsg(`${parsed.length} produs${parsed.length !== 1 ? 'e' : ''} adaugat${parsed.length !== 1 ? 'e' : ''}.`)
      } else {
        setVoiceMsg('Nu am gasit produse in inregistrare. Incearca din nou.')
      }
      setLoading(false)
    }

    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)
    const recordStart = Date.now()
    let silenceSince: number | null = null
    silenceTimerRef.current = setInterval(() => {
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      if (avg < 5) {
        if (!silenceSince) silenceSince = Date.now()
        else if (Date.now() - silenceSince > 2000 && Date.now() - recordStart > 1500) stopVoice()
      } else {
        silenceSince = null
      }
    }, 100)

    mediaRecorder.start(); setListening(true)
  }

  // ── Draft + settings persistence ─────────────────────────────────────────

  useEffect(() => {
    const draftParam = new URLSearchParams(window.location.search).get('draft')
    if (draftParam) {
      async function loadDraft() {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data } = await supabase.from('pricing_drafts').select('*').eq('id', draftParam).single()
        if (!data) return
        setDraftId(data.id)
        setSupplier(data.supplier || '')
        setAdaos(String(data.adaos ?? 30))
        setRoundStep((data.round_step as RoundStep) || '0.50')
        setRoundMode((data.round_mode as RoundMode) || 'nearest')
        setItems(data.items?.length ? data.items.map((i: Item) => ({ ...i, sgr: i.sgr ?? '0' })) : [emptyItem(21)])
      }
      loadDraft()
    } else {
      try {
        const saved = localStorage.getItem('pricing_settings')
        if (saved) {
          const s = JSON.parse(saved)
          if (s.roundStep) setRoundStep(s.roundStep)
          if (s.roundMode) setRoundMode(s.roundMode)
        }
      } catch {}
    }

    async function loadUsage() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const t = trialInfo(session.user.created_at)
      if (t.isActive) return
      const [active, calcule] = await Promise.all([isPlanActive(session.user.id), getMonthlyCalcule(session.user.id)])
      if (!active) setUsageInfo({ calcule, limit: FREE_CALCULE_LIMIT, show: true })
    }
    loadUsage()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('pricing_settings', JSON.stringify({ roundStep, roundMode }))
    } catch {}
  }, [roundStep, roundMode])

  async function saveDraft() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSaving(true)
    const title = supplier.trim() || ('Calcul ' + new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }))
    const payload = {
      user_id: session.user.id,
      title, supplier,
      adaos: parseFloat(adaos) || 0,
      round_step: roundStep,
      round_mode: roundMode,
      items,
      updated_at: new Date().toISOString(),
    }
    if (draftId) {
      await supabase.from('pricing_drafts').update(payload).eq('id', draftId)
    } else {
      const { data } = await supabase.from('pricing_drafts').insert(payload).select('id').single()
      if (data) setDraftId(data.id)
    }
    setSaving(false)
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2000)
  }

  // ── Item mutations ────────────────────────────────────────────────────────

  function updateItem(id: string, field: keyof Item, value: string) {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i
      if (field === 'vat') return { ...i, vat: (parseInt(value) === 11 ? 11 : 21) as 11 | 21 }
      return { ...i, [field]: value }
    }))
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  // ── Export ────────────────────────────────────────────────────────────────

  const adaosNum = parseFloat(adaos) || 0
  const validItems = items.filter(i => i.name && parseFloat(i.supplierPrice) > 0)

  async function handleExport(exportFn: () => void) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { exportFn(); return }
    const t = trialInfo(session.user.created_at)
    if (!t.isActive) {
      const [active, calcule] = await Promise.all([isPlanActive(session.user.id), getMonthlyCalcule(session.user.id)])
      if (!active && calcule >= FREE_CALCULE_LIMIT) { router.push('/upgrade?type=calcule'); return }
      await logCalcul(session.user.id)
      setUsageInfo(prev => prev ? { ...prev, calcule: prev.calcule + 1 } : prev)
    }
    await saveDraft()
    exportFn()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => router.push('/dashboard')} className="flex items-center text-blue-600 font-medium text-base py-1 px-2 -ml-2 rounded-lg">
          <span className="text-2xl leading-none">‹</span>
        </button>
        <h1 className="text-base font-bold text-gray-800">Calculator Pret</h1>
        <button onClick={() => router.push('/calcule')} className="text-sm font-semibold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl">
          Salvate
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-3 pt-3 space-y-3">

        {/* Scan factura */}
        <input id="scan-camera" type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleInvoiceScan(f); e.target.value = '' }} />
        <input id="scan-gallery" type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleInvoiceScan(f); e.target.value = '' }} />
        <input id="scan-document" type="file" accept=".pdf,.xml,application/pdf,text/xml,application/xml" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleInvoiceScan(f); e.target.value = '' }} />
        {scanningInvoice ? (
          <div className="w-full py-3.5 rounded-2xl bg-blue-300 text-white font-bold text-sm flex items-center justify-center shadow-sm">
            Se analizeaza factura...
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <label htmlFor="scan-camera"
                className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                Fa poza
              </label>
              <label htmlFor="scan-gallery"
                className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                Galerie
              </label>
            </div>
            <label htmlFor="scan-document"
              className="w-full py-3 rounded-2xl bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
              Incarca PDF / XML
            </label>
          </div>
        )}
        {scanError && <p className="text-xs text-red-500 text-center -mt-1">{scanError}</p>}

        {/* Setari */}
        <div className="bg-white rounded-2xl shadow-sm p-3 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Setari calcul</p>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Furnizor (optional)</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900"
              placeholder="Ex: Metro, Selgros..." value={supplier} onChange={e => setSupplier(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Adaos comercial %</label>
              <input type="number" min="0" step="1"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900"
                value={adaos} onChange={e => setAdaos(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cota TVA</label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {([21, 11] as const).map(r => (
                  <button key={r} onClick={() => setVat(r)}
                    className={`flex-1 py-2.5 text-sm font-bold transition-all ${vat === r ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>
                    {r}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Rotunjire pret final</label>
            <div className="flex gap-2 flex-wrap">
              {(['none', '0.10', '0.50', '1.00'] as RoundStep[]).map(s => (
                <button key={s} onClick={() => setRoundStep(s)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${roundStep === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                  {s === 'none' ? 'Fara' : s + ' lei'}
                </button>
              ))}
            </div>
            {roundStep !== 'none' && (
              <div className="flex gap-2 mt-2">
                {([['nearest', 'La cel mai apropiat'], ['up', 'Intotdeauna in sus']] as [RoundMode, string][]).map(([m, label]) => (
                  <button key={m} onClick={() => setRoundMode(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${roundMode === m ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Buton voce */}
        <button onClick={handleVoice}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${listening ? 'bg-red-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
          {listening ? '🔴 Opreste inregistrarea' : '🎤 Dicteaza produse de pe factura'}
        </button>
        {loading && <p className="text-center text-sm text-gray-400">Procesez...</p>}
        {!loading && voiceMsg && (
          <p className={`text-center text-sm ${voiceMsg.startsWith('Nu') ? 'text-red-400' : 'text-green-600'}`}>{voiceMsg}</p>
        )}

        {/* Produse */}
        <div className="space-y-3">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              adaos={adaosNum}
              roundStep={roundStep}
              roundMode={roundMode}
              onUpdate={updateItem}
              onRemove={removeItem}
            />
          ))}
        </div>

        <button onClick={() => setItems(prev => [...prev, emptyItem(vat)])}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-semibold text-gray-500">
          + Adauga produs manual
        </button>

      </div>

      {/* Butoane fixe PDF + Salveaza */}
      {validItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{validItems.length} produs{validItems.length !== 1 ? 'e' : ''} cu pret calculat</p>
              {usageInfo?.show && (
                <p className={`text-xs font-semibold ${usageInfo.calcule >= usageInfo.limit ? 'text-red-500' : 'text-gray-400'}`}>
                  {usageInfo.calcule}/{usageInfo.limit} calcule luna aceasta
                </p>
              )}
            </div>
            {saving && <p className="text-xs text-center text-gray-400">Se salveaza...</p>}
            {draftSaved && <p className="text-xs text-center text-green-600">Salvat!</p>}
            <div className="flex gap-3">
              <button onClick={() => handleExport(() => exportPDFContabil(validItems, adaosNum, roundStep, roundMode, supplier))}
                className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl text-sm">
                PDF Contabil
              </button>
              <button onClick={() => handleExport(() => exportPDFMagazin(validItems, adaosNum, roundStep, roundMode, supplier))}
                className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-xl text-sm">
                PDF Magazin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
