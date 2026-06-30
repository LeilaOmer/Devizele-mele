export type RoundStep = 'none' | '0.10' | '0.50' | '1.00'
export type RoundMode = 'nearest' | 'up'

export type Item = {
  id: string
  name: string
  unit: string
  supplierPrice: string
  discount: string
  vat: 11 | 21
  sgr: string
}

export const emptyItem = (defaultVat: 11 | 21 = 21): Item => ({
  id: crypto.randomUUID(),
  name: '', unit: 'buc', supplierPrice: '', discount: '0',
  vat: defaultVat, sgr: '0',
})

export function applyRounding(price: number, step: RoundStep, mode: RoundMode): number {
  if (step === 'none') return Math.round(price * 100) / 100
  const s = parseFloat(step)
  if (mode === 'nearest') return Math.round(price / s) * s
  return Math.ceil(price / s) * s
}

export function calcItem(item: Item, adaos: number, step: RoundStep, mode: RoundMode, vatPayer = true) {
  const sp = parseFloat(item.supplierPrice) || 0
  const sgr = parseFloat(item.sgr) || 0
  const disc = parseFloat(item.discount) || 0
  const netPrice = sp * (1 - disc / 100)

  if (!vatPayer) {
    // TVA platit furnizorului e cost irecuperabil; adaosul se aplica pe pretul de intrare cu TVA
    const inVatAmt = netPrice * (item.vat / 100)
    const costWithVat = netPrice + inVatAmt
    const adaosAmt = costWithVat * (adaos / 100)
    const final = applyRounding(costWithVat + adaosAmt, step, mode)
    return { sp, disc, sgr, netPrice, inVatAmt, costWithVat, adaosAmt, final, vatPayer: false as const }
  }

  const sellExVat = netPrice * (1 + adaos / 100)
  const vatAmt = sellExVat * (item.vat / 100)
  const withVat = sellExVat + vatAmt
  const final = applyRounding(withVat, step, mode)
  return { sp, disc, sgr, netPrice, sellExVat, vatAmt, withVat, final, vatPayer: true as const }
}

export const fmt2 = (n: number) => n.toFixed(2)
