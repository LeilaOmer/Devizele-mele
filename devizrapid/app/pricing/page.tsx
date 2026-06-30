'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { trialInfo } from '@/lib/trial'
import { getMonthlyCalcule, isPlanActive, logCalcul, FREE_CALCULE_LIMIT } from '@/lib/usage'
import { Item, RoundStep, RoundMode, emptyItem } from '@/lib/pricing/calc'
import { exportPDFContabil, exportPDFMagazin } from '@/lib/pricing/pdf'
import { usePricingDraft } from './hooks/usePricingDraft'
import { useInvoiceScan } from './hooks/useInvoiceScan'
import { useVoiceInput } from './hooks/useVoiceInput'
import InvoiceScanner from './InvoiceScanner'
import SettingsPanel from './SettingsPanel'
import ItemCard from './ItemCard'
import ExportBar from './ExportBar'

export default function PricingPage() {
  const router = useRouter()
  const [vat, setVat] = useState<11 | 21>(21)
  const [usageInfo, setUsageInfo] = useState<{ calcule: number; limit: number; show: boolean } | null>(null)

  const draft = usePricingDraft()

  const { scanning, error: scanError, handleScan } = useInvoiceScan(({ supplier, items }) => {
    if (supplier) draft.setSupplier(supplier)
    draft.setItems(items)
  })

  const { listening, loading, voiceMsg, handleVoice } = useVoiceInput(parsed => {
    draft.setItems(prev => [...prev.filter(p => p.name || p.supplierPrice), ...parsed])
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const t = trialInfo(session.user.created_at)
      if (t.isActive) return
      Promise.all([isPlanActive(session.user.id), getMonthlyCalcule(session.user.id)])
        .then(([active, calcule]) => {
          if (!active) setUsageInfo({ calcule, limit: FREE_CALCULE_LIMIT, show: true })
        })
    })
  }, [])

  const adaosNum = parseFloat(draft.adaos) || 0
  const validItems = draft.items.filter(i => i.name && parseFloat(i.supplierPrice) > 0)

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
    await draft.saveDraft()
    exportFn()
  }

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
        <InvoiceScanner scanning={scanning} error={scanError} onScan={handleScan} />

        <SettingsPanel
          supplier={draft.supplier} onSupplier={draft.setSupplier}
          adaos={draft.adaos} onAdaos={draft.setAdaos}
          vat={vat} onVat={setVat}
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
              onUpdate={draft.updateItem}
              onRemove={draft.removeItem}
            />
          ))}
        </div>

        <button onClick={() => draft.setItems(prev => [...prev, emptyItem(vat)])}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-semibold text-gray-500">
          + Adauga produs manual
        </button>
      </div>

      <ExportBar
        validCount={validItems.length}
        saving={draft.saving}
        draftSaved={draft.draftSaved}
        usageInfo={usageInfo}
        onExportContabil={() => handleExport(() => exportPDFContabil(validItems, adaosNum, draft.roundStep, draft.roundMode, draft.supplier))}
        onExportMagazin={() => handleExport(() => exportPDFMagazin(validItems, adaosNum, draft.roundStep, draft.roundMode, draft.supplier))}
      />
    </div>
  )
}
