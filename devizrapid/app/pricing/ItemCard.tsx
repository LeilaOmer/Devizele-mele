'use client'
import { Item, RoundStep, RoundMode, calcItem, fmt2 } from '@/lib/pricing/calc'

type Props = {
  item: Item
  adaos: number
  roundStep: RoundStep
  roundMode: RoundMode
  vatPayer: boolean
  onUpdate: (id: string, field: keyof Item, value: string) => void
  onRemove: (id: string) => void
}

export default function ItemCard({ item, adaos, roundStep, roundMode, vatPayer, onUpdate, onRemove }: Props) {
  const c = item.supplierPrice ? calcItem(item, adaos, roundStep, roundMode, vatPayer) : null

  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 space-y-2">
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
            placeholder="Denumire produs *"
            value={item.name}
            onChange={e => onUpdate(item.id, 'name', e.target.value)}
          />
          {parseFloat(item.sgr) > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">
              +SGR
            </span>
          )}
        </div>
        <input
          className="w-16 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 text-center"
          placeholder="UM"
          value={item.unit}
          onChange={e => onUpdate(item.id, 'unit', e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-0.5 block">Pret furnizor (fara SGR)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
            placeholder="0.00"
            value={item.supplierPrice}
            onChange={e => onUpdate(item.id, 'supplierPrice', e.target.value)}
          />
        </div>
        <div className="w-20">
          <label className="text-xs text-gray-400 mb-0.5 block">Disc %</label>
          <input
            type="number" min="0" max="100" step="0.5"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
            placeholder="0"
            value={item.discount}
            onChange={e => onUpdate(item.id, 'discount', e.target.value)}
          />
        </div>
        <div className="w-20">
          <label className="text-xs text-gray-400 mb-0.5 block">SGR lei</label>
          <input
            type="number" min="0" step="0.50"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
            placeholder="0"
            value={item.sgr}
            onChange={e => onUpdate(item.id, 'sgr', e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">TVA:</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {([11, 21] as const).map(r => (
            <button
              key={r}
              onClick={() => onUpdate(item.id, 'vat', String(r))}
              className={`px-3 py-1 text-xs font-bold transition-all ${item.vat === r ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}
            >
              {r}%
            </button>
          ))}
        </div>
      </div>

      {c && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
          {c.vatPayer ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Pret net furnizor</span>
                <span className="font-medium">{fmt2(c.netPrice)} lei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Adaos ({adaos}%)</span>
                <span className="font-medium">+{fmt2(c.sellExVat - c.netPrice)} lei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fara TVA</span>
                <span className="font-medium">{fmt2(c.sellExVat)} lei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">TVA {item.vat}%</span>
                <span className="font-medium">+{fmt2(c.vatAmt)} lei</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Pret net furnizor</span>
                <span className="font-medium">{fmt2(c.netPrice)} lei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-500">TVA furnizor {item.vat}% (cost)</span>
                <span className="font-medium text-orange-500">+{fmt2(c.inVatAmt)} lei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pret de intrare</span>
                <span className="font-medium">{fmt2(c.costWithVat)} lei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Adaos ({adaos}%)</span>
                <span className="font-medium">+{fmt2(c.adaosAmt)} lei</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-gray-200 mt-1">
            <span className="text-gray-600 font-semibold">Pret vanzare</span>
            <span className="text-blue-600 font-bold text-base">{fmt2(c.final)} lei/{item.unit}</span>
          </div>
          {c.sgr > 0 && (
            <div className="flex justify-between">
              <span className="text-orange-500 font-medium">+ Garantie SGR</span>
              <span className="font-medium text-orange-500">+{fmt2(c.sgr)} lei (returnabil)</span>
            </div>
          )}
        </div>
      )}

      <button onClick={() => onRemove(item.id)} className="text-xs text-red-400">
        Sterge
      </button>
    </div>
  )
}
