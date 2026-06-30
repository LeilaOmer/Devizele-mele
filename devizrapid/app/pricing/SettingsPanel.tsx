'use client'
import { RoundStep, RoundMode } from '@/lib/pricing/calc'

type Props = {
  supplier: string; onSupplier: (v: string) => void
  adaos: string; onAdaos: (v: string) => void
  vat: 11 | 21; onVat: (v: 11 | 21) => void
  roundStep: RoundStep; onRoundStep: (v: RoundStep) => void
  roundMode: RoundMode; onRoundMode: (v: RoundMode) => void
}

export default function SettingsPanel({ supplier, onSupplier, adaos, onAdaos, vat, onVat, roundStep, onRoundStep, roundMode, onRoundMode }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Setari calcul</p>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Furnizor (optional)</label>
        <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900"
          placeholder="Ex: Metro, Selgros..." value={supplier} onChange={e => onSupplier(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Adaos comercial %</label>
          <input type="number" min="0" step="1"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900"
            value={adaos} onChange={e => onAdaos(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Cota TVA</label>
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {([21, 11] as const).map(r => (
              <button key={r} onClick={() => onVat(r)}
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
            <button key={s} onClick={() => onRoundStep(s)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${roundStep === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
              {s === 'none' ? 'Fara' : s + ' lei'}
            </button>
          ))}
        </div>
        {roundStep !== 'none' && (
          <div className="flex gap-2 mt-2">
            {([['nearest', 'La cel mai apropiat'], ['up', 'Intotdeauna in sus']] as [RoundMode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => onRoundMode(m as RoundMode)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${roundMode === m ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
