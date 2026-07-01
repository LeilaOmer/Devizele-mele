'use client'
import { RoundStep, RoundMode } from '@/lib/pricing/calc'

type Props = {
  supplier: string; onSupplier: (v: string) => void
  adaos: string; onAdaos: (v: string) => void
  roundStep: RoundStep; onRoundStep: (v: RoundStep) => void
  roundMode: RoundMode; onRoundMode: (v: RoundMode) => void
}

export default function SettingsPanel({ supplier, onSupplier, adaos, onAdaos, roundStep, onRoundStep, roundMode, onRoundMode }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Setari calcul</p>

      <div>
        <label className="text-sm font-semibold text-gray-600 mb-1 block">Furnizor (optional)</label>
        <input className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900 font-medium"
          placeholder="Ex: Metro, Selgros..." value={supplier} onChange={e => onSupplier(e.target.value)} />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-600 mb-1 block">Adaos comercial %</label>
        <input type="number" min="0" step="1"
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-xl font-bold text-gray-900"
          value={adaos} onChange={e => onAdaos(e.target.value)} />
      </div>


      <div>
        <label className="text-sm font-semibold text-gray-600 mb-1 block">Rotunjire pret final</label>
        <div className="flex gap-2 flex-wrap">
          {(['none', '0.10', '0.50', '1.00'] as RoundStep[]).map(s => (
            <button key={s} onClick={() => onRoundStep(s)}
              className={`px-4 py-2.5 rounded-xl text-base font-bold border-2 transition-all ${roundStep === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}>
              {s === 'none' ? 'Fara' : s + ' lei'}
            </button>
          ))}
        </div>
        {roundStep !== 'none' && (
          <div className="flex gap-2 mt-2">
            {([['nearest', 'La cel mai apropiat'], ['up', 'Intotdeauna in sus']] as [RoundMode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => onRoundMode(m as RoundMode)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${roundMode === m ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
