'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { trialInfo, getPromoEligible } from '@/lib/trial'
import { getMonthlyCalcule, isPlanActive, logCalcul, FREE_CALCULE_LIMIT } from '@/lib/usage'
import { emptyItem } from '@/lib/pricing/calc'
import { exportPDFContabil, exportPDFMagazin, sharePdfBlob, PdfResult } from '@/lib/pricing/pdf'
import { usePricingDraft } from './hooks/usePricingDraft'
import { useInvoiceScan } from './hooks/useInvoiceScan'
import { useVoiceInput } from './hooks/useVoiceInput'
import InvoiceScanner from './InvoiceScanner'
import SettingsPanel from './SettingsPanel'
import ItemCard from './ItemCard'
import ExportBar from './ExportBar'

export default function PricingPage() {
  const router = useRouter()
  const [usageInfo, setUsageInfo] = useState<{ calcule: number; limit: number; show: boolean } | null>(null)
  const [proCompanyName, setProCompanyName] = useState<string | null>(null)
  const [previewPdf, setPreviewPdf] = useState<{ url: string; result: PdfResult } | null>(null)

  useEffect(() => {
    if (localStorage.getItem('dashboardMode') === 'pro') {
      setProCompanyName(localStorage.getItem('activeCompanyName'))
    }
  }, [])

  const draft = usePricingDraft()

  const { scanning, error: scanError, handleScan } = useInvoiceScan(({ supplier, items }) => {
    if (supplier) draft.setSupplier(supplier)
    draft.setItems(items)
  })

  const { listening, loading, voiceMsg, handleVoice } = useVoiceInput(parsed => {
    draft.setItems(prev => [...prev.filter(p => p.name || p.supplierPrice), ...parsed])
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const promoEligible = await getPromoEligible(session.user.id, session.access_token)
      const t = trialInfo(session.user.created_at, promoEligible)
      if (t.isActive) return
      Promise.all([isPlanActive(session.user.id), getMonthlyCalcule(session.user.id)])
        .then(([active, calcule]) => {
          if (!active) setUsageInfo({ calcule, limit: FREE_CALCULE_LIMIT, show: true })
        })
    })
  }, [])

  const adaosNum = parseFloat(draft.adaos) || 0
  const validItems = draft.items.filter(i => i.name && parseFloat(i.supplierPrice) > 0)

  async function handleExport(exportFn: () => Promise<PdfResult>) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const promoEligible = await getPromoEligible(session.user.id, session.access_token)
      const t = trialInfo(session.user.created_at, promoEligible)
      if (!t.isActive) {
        const [active, calcule] = await Promise.all([isPlanActive(session.user.id), getMonthlyCalcule(session.user.id)])
        if (!active && calcule >= FREE_CALCULE_LIMIT) { router.push('/upgrade?type=calcule'); return }
        await logCalcul(session.user.id)
        setUsageInfo(prev => prev ? { ...prev, calcule: prev.calcule + 1 } : prev)
      }
      await draft.saveDraft()
    }
    const result = await exportFn()
    setPreviewPdf({ url: URL.createObjectURL(result.blob), result })
  }

  function closePreview() {
    if (previewPdf) URL.revokeObjectURL(previewPdf.url)
    setPreviewPdf(null)
  }

  async function sendPreview() {
    if (!previewPdf) return
    await sharePdfBlob(previewPdf.result)
    closePreview()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => router.push('/dashboard')} className="flex items-center text-blue-600 font-medium text-base py-1 px-2 -ml-2 rounded-lg">
          <span className="text-2xl leading-none">‹</span>
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-gray-800">Calculator Pret</h1>
          {proCompanyName && <p className="text-xs text-purple-600 font-medium leading-none mt-0.5">{proCompanyName}</p>}
        </div>
        <button onClick={() => router.push('/calcule')} className="text-sm font-semibold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl">
          Salvate
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-3 pt-3 space-y-3">
        <InvoiceScanner scanning={scanning} error={scanError} onScan={handleScan} />

        <SettingsPanel
          supplier={draft.supplier} onSupplier={draft.setSupplier}
          adaos={draft.adaos} onAdaos={draft.setAdaos}
          roundStep={draft.roundStep} onRoundStep={draft.setRoundStep}
          roundMode={draft.roundMode} onRoundMode={draft.setRoundMode}
        />

        <button onClick={handleVoice}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${listening ? 'bg-red-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
          {listening ? '🔴 Opreste inregistrarea' : '🎤 Dicteaza produse de pe factura'}
        </button>
        {loading && <p className="text-center text-sm text-gray-400">Procesez...</p>}
        {!loading && voiceMsg && (
          <p className={`text-center text-sm ${voiceMsg.startsWith('Nu') ? 'text-red-400' : 'text-green-600'}`}>{voiceMsg}</p>
        )}

        <div className="space-y-3">
          {draft.items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              adaos={adaosNum}
              roundStep={draft.roundStep}
              roundMode={draft.roundMode}
              vatPayer={draft.vatPayer}
              supplier={draft.supplier}
              onUpdate={draft.updateItem}
              onRemove={draft.removeItem}
            />
          ))}
        </div>

        <button onClick={() => draft.setItems(prev => [...prev, emptyItem(draft.defaultVat)])}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-semibold text-gray-500">
          + Adauga produs manual
        </button>
      </div>

      <ExportBar
        validCount={validItems.length}
        saving={draft.saving}
        draftSaved={draft.draftSaved}
        usageInfo={usageInfo}
        onExportContabil={() => handleExport(() => exportPDFContabil(validItems, adaosNum, draft.roundStep, draft.roundMode, draft.supplier, draft.vatPayer))}
        onExportMagazin={() => handleExport(() => exportPDFMagazin(validItems, adaosNum, draft.roundStep, draft.roundMode, draft.supplier, draft.vatPayer))}
      />

      {previewPdf && (
        <div className="fixed inset-0 bg-black/60 z-30 flex flex-col">
          <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
            <p className="text-sm font-bold text-gray-800">Verifica PDF-ul</p>
            <button onClick={closePreview} className="text-gray-400 text-2xl leading-none">×</button>
          </div>
          <iframe src={previewPdf.url} title="Previzualizare PDF" className="flex-1 w-full bg-gray-100" />
          <div className="bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.05)] shrink-0">
            <div className="max-w-2xl mx-auto flex gap-3">
              <button onClick={closePreview}
                className="px-5 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm">
                Inchide
              </button>
              <button onClick={sendPreview}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-sm">
                Arata bine, trimite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
