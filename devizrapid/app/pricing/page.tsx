'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import { supabase } from '@/lib/supabase'
import { trialInfo } from '@/lib/trial'
import { getMonthlyCalcule, isPlanActive, logCalcul, FREE_CALCULE_LIMIT } from '@/lib/usage'

type RoundStep = 'none' | '0.10' | '0.50' | '1.00'
type RoundMode = 'nearest' | 'up'

type Item = {
  id: string
  name: string
  unit: string
  supplierPrice: string
  discount: string
  vat: 11 | 21
}

const emptyItem = (defaultVat: 11 | 21 = 21): Item => ({
  id: crypto.randomUUID(),
  name: '', unit: 'buc', supplierPrice: '', discount: '0',
  vat: defaultVat,
})

function applyRounding(price: number, step: RoundStep, mode: RoundMode): number {
  if (step === 'none') return Math.round(price * 100) / 100
  const s = parseFloat(step)
  if (mode === 'nearest') return Math.round(price / s) * s
  return Math.ceil(price / s) * s
}

function calcItem(item: Item, adaos: number, step: RoundStep, mode: RoundMode) {
  const sp = parseFloat(item.supplierPrice) || 0
  const disc = parseFloat(item.discount) || 0
  const netPrice = sp * (1 - disc / 100)
  const sellExVat = netPrice * (1 + adaos / 100)
  const vatAmt = sellExVat * (item.vat / 100)
  const withVat = sellExVat + vatAmt
  const final = applyRounding(withVat, step, mode)
  return { sp, disc, netPrice, sellExVat, vatAmt, withVat, final }
}

const fmt2 = (n: number) => n.toFixed(2)
const fmtDate = () => new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
const noDiac = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[șŞ]/g, 's').replace(/[țŢ]/g, 't').replace(/[ăÂâ]/g, 'a').replace(/[îÎ]/g, 'i')

function exportPDFContabil(items: Item[], adaos: number, step: RoundStep, mode: RoundMode, supplier: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const W = 297; const margin = 10; let y = 15

  doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text('Calculator Pret Vanzare', margin, y); y += 6
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
  doc.text(`Data: ${fmtDate()}  |  Furnizor: ${noDiac(supplier || '-')}  |  Adaos: ${adaos}%  |  Rotunjire: ${step === 'none' ? 'fara' : step + ' lei (' + (mode === 'nearest' ? 'corect' : 'in sus') + ')'}`, margin, y)
  y += 8

  const cols = [
    { label: 'Denumire', x: margin, w: 70 },
    { label: 'UM', x: 82, w: 12 },
    { label: 'Pret furn.', x: 96, w: 22 },
    { label: 'Disc%', x: 120, w: 14 },
    { label: 'Pret net', x: 136, w: 22 },
    { label: `Adaos ${adaos}%`, x: 160, w: 24 },
    { label: 'F.TVA', x: 186, w: 20 },
    { label: 'Cota', x: 208, w: 14 },
    { label: 'TVA', x: 224, w: 20 },
    { label: 'Pret final', x: 246, w: 24 },
    { label: 'Rotunjit', x: 272, w: 22 },
  ]

  doc.setFillColor(240, 240, 245)
  doc.rect(margin, y - 4, W - 2 * margin, 7, 'F')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60)
  cols.forEach(c => doc.text(c.label, c.x, y))
  y += 6

  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30)
  items.forEach((item, idx) => {
    const c = calcItem(item, adaos, step, mode)
    if (idx % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(margin, y - 3.5, W - 2 * margin, 6, 'F') }
    doc.setFontSize(8)
    const vals = [
      noDiac(item.name), noDiac(item.unit), fmt2(c.sp),
      c.disc > 0 ? `${c.disc}%` : '-',
      fmt2(c.netPrice), fmt2(c.sellExVat - c.netPrice),
      fmt2(c.sellExVat), `${item.vat}%`, fmt2(c.vatAmt), fmt2(c.withVat), fmt2(c.final),
    ]
    cols.forEach((col, i) => doc.text(vals[i], col.x, y))
    y += 6
    if (y > 185) { doc.addPage(); y = 15 }
  })

  doc.setFontSize(7); doc.setTextColor(160, 160, 160)
  doc.text('Generat de Tarifator', W / 2, 200, { align: 'center' })
  window.open(doc.output('bloburl'), '_blank')
}

function exportPDFMagazin(items: Item[], adaos: number, step: RoundStep, mode: RoundMode, supplier: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210; const margin = 15; let y = 20

  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text('Lista Preturi Vanzare', margin, y); y += 7
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
  doc.text(`${fmtDate()}${supplier ? '  |  ' + supplier : ''}`, margin, y); y += 10

  doc.setFillColor(240, 240, 245)
  doc.rect(margin, y - 4, W - 2 * margin, 7, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60)
  doc.text('Denumire produs', margin, y)
  doc.text('UM', 130, y)
  doc.text('Pret vanzare', W - margin, y, { align: 'right' })
  y += 7

  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30)
  items.forEach((item, idx) => {
    const { final } = calcItem(item, adaos, step, mode)
    if (idx % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(margin, y - 3.5, W - 2 * margin, 6.5, 'F') }
    doc.setFontSize(9)
    doc.text(noDiac(item.name), margin, y)
    doc.text(noDiac(item.unit), 130, y)
    doc.setFont('helvetica', 'bold')
    doc.text(fmt2(final) + ' RON', W - margin, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 7
    if (y > 270) { doc.addPage(); y = 20 }
  })

  doc.setFontSize(7); doc.setTextColor(160, 160, 160)
  doc.text('Generat de Tarifator', W / 2, 285, { align: 'center' })
  window.open(doc.output('bloburl'), '_blank')
}

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [voiceMsg, setVoiceMsg] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pricing_state')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.items?.length) setItems(s.items)
        if (s.adaos) setAdaos(s.adaos)
        if (s.supplier) setSupplier(s.supplier)
        if (s.roundStep) setRoundStep(s.roundStep)
        if (s.roundMode) setRoundMode(s.roundMode)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('pricing_state', JSON.stringify({ items, adaos, supplier, roundStep, roundMode }))
    } catch {}
  }, [items, adaos, supplier, roundStep, roundMode])

  const adaosNum = parseFloat(adaos) || 0

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
      const tr = await fetch('/api/transcribe', { method: 'POST', body: form })
      const { text } = await tr.json()
      if (!text) { setLoading(false); setVoiceMsg('Nu am prins nimic. Vorbeste mai tare sau mai aproape de microfon.'); return }
      const res = await fetch('/api/parse-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      const parsed: Item[] = (data.items || []).map((i: any) => ({
        id: crypto.randomUUID(),
        name: i.name || '',
        unit: i.unit || 'buc',
        supplierPrice: String(i.supplier_price || ''),
        discount: String(i.discount || 0),
        vat: (i.vat === 11 ? 11 : 21) as 11 | 21,
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

    // auto-stop dupa 2s de tacere
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

  const validItems = items.filter(i => i.name && parseFloat(i.supplierPrice) > 0)

  async function handleExport(exportFn: () => void) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { exportFn(); return }

    const t = trialInfo(session.user.created_at)
    if (!t.isActive) {
      const [active, calcule] = await Promise.all([
        isPlanActive(session.user.id),
        getMonthlyCalcule(session.user.id),
      ])
      if (!active && calcule >= FREE_CALCULE_LIMIT) {
        router.push('/upgrade?type=calcule')
        return
      }
      await logCalcul(session.user.id)
    }

    exportFn()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-blue-600 font-medium text-base py-1 px-2 -ml-2 rounded-lg">
          <span className="text-xl">‹</span> Dashboard
        </button>
        <h1 className="text-base font-bold text-gray-800">Calculator Pret</h1>
        <div className="w-20" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* Setari */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
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
          {items.map((item) => {
            const c = item.supplierPrice ? calcItem(item, adaosNum, roundStep, roundMode) : null
            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex gap-2">
                  <input className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
                    placeholder="Denumire produs *" value={item.name}
                    onChange={e => updateItem(item.id, 'name', e.target.value)} />
                  <input className="w-16 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 text-center"
                    placeholder="UM" value={item.unit}
                    onChange={e => updateItem(item.id, 'unit', e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-0.5 block">Pret furnizor</label>
                    <input type="number" min="0" step="0.01"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
                      placeholder="0.00" value={item.supplierPrice}
                      onChange={e => updateItem(item.id, 'supplierPrice', e.target.value)} />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-gray-400 mb-0.5 block">Disc %</label>
                    <input type="number" min="0" max="100" step="0.5"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
                      placeholder="0" value={item.discount}
                      onChange={e => updateItem(item.id, 'discount', e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">TVA:</label>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200">
                    {([11, 21] as const).map(r => (
                      <button key={r} onClick={() => updateItem(item.id, 'vat', String(r) as any)}
                        className={`px-3 py-1 text-xs font-bold transition-all ${item.vat === r ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}>
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>

                {c && (
                  <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">Pret net furnizor</span><span className="font-medium">{fmt2(c.netPrice)} lei</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Adaos ({adaos}%)</span><span className="font-medium">+{fmt2(c.sellExVat - c.netPrice)} lei</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Fara TVA</span><span className="font-medium">{fmt2(c.sellExVat)} lei</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">TVA {item.vat}%</span><span className="font-medium">+{fmt2(c.vatAmt)} lei</span></div>
                    <div className="col-span-2 flex justify-between items-center pt-1 border-t border-gray-200 mt-1">
                      <span className="text-gray-600 font-semibold">Pret vanzare</span>
                      <span className="text-blue-600 font-bold text-base">{fmt2(c.final)} lei/{item.unit}</span>
                    </div>
                  </div>
                )}

                <button onClick={() => removeItem(item.id)} className="text-xs text-red-400">Sterge</button>
              </div>
            )
          })}
        </div>

        <button onClick={() => setItems(prev => [...prev, emptyItem(vat)])}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-semibold text-gray-500">
          + Adauga produs manual
        </button>

      </div>

      {/* Butoane fixe PDF */}
      {validItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto space-y-2">
            <p className="text-xs text-center text-gray-400">{validItems.length} produs{validItems.length !== 1 ? 'e' : ''} cu pret calculat</p>
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
