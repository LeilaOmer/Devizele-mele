'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Item } from '@/lib/pricing/calc'

type ScanResult = { supplier: string; items: Item[] }
type ApiItem = { name: string; unit: string; supplier_price: number; discount: number; vat: number; sgr: number }
type ApiResult = { supplier?: string; items?: ApiItem[]; error?: string; detail?: string }

function readBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(f)
  })
}

function loadImage(f: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(f)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = reject
    img.src = url
  })
}

function cropAndEncode(img: HTMLImageElement, sy: number, sh: number): string {
  const MAX = 1920
  const w = img.width
  const scale = Math.min(1, MAX / Math.max(w, sh))
  const dw = Math.round(w * scale)
  const dh = Math.round(sh * scale)
  const canvas = document.createElement('canvas')
  canvas.width = dw; canvas.height = dh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(img, 0, sy, w, sh, 0, 0, dw, dh)
  return canvas.toDataURL('image/jpeg', 0.88).split(',')[1]
}

function resizeImage(f: File): Promise<string> {
  return loadImage(f).then(img => cropAndEncode(img, 0, img.height))
}

// Fallback pentru facturi lungi/dense: cand o singura poza esueaza (raspuns
// prea mare/neclar pentru model), o impartim in 2 jumatati cu suprapunere
// (ca sa nu taie un rand exact la mijloc) — fiecare jumatate ajunge sa fie
// scalata la rezolutie mai mare per rand decat poza intreaga dintr-o data.
function splitImageIntoHalves(f: File): Promise<[string, string]> {
  return loadImage(f).then(img => {
    const H = img.height
    const overlap = 0.08
    const topEnd = Math.round(H * (0.5 + overlap / 2))
    const bottomStart = Math.round(H * (0.5 - overlap / 2))
    const top = cropAndEncode(img, 0, topEnd)
    const bottom = cropAndEncode(img, bottomStart, H - bottomStart)
    return [top, bottom] as [string, string]
  })
}

function mapItems(apiItems: ApiItem[]): Item[] {
  return apiItems.map(i => ({
    id: crypto.randomUUID(),
    name: i.name || '',
    unit: i.unit || 'buc',
    supplierPrice: i.supplier_price ? String(i.supplier_price) : '',
    discount: i.discount ? String(i.discount) : '0',
    vat: (i.vat === 11 ? 11 : 21) as 11 | 21,
    sgr: i.sgr ? String(i.sgr) : '0',
  }))
}

// Cheia e doar denumirea (nu si pretul): cand combinam poza intreaga cu cele
// doua jumatati, acelasi produs poate iesi cu preturi usor diferite intre surse
// (una citita mai bine ca alta) — vrem UN singur exemplar, nu unul per varianta
// de pret citita, altfel factura densa ar aparea cu produse duplicate.
function dedupeItems(items: Item[]): Item[] {
  const seen = new Set<string>()
  const out: Item[] = []
  for (const item of items) {
    const key = item.name.trim().toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function useInvoiceScan(onSuccess: (result: ScanResult) => void) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  async function callApi(body: Record<string, string>, token?: string): Promise<{ ok: boolean; status: number; data: ApiResult }> {
    const res = await fetch('/api/parse-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return { ok: res.ok && !data.error, status: res.status, data }
  }

  function errorMessage(status: number, data: ApiResult): string {
    // Detaliul brut de la Groq e afisat pe ecran (nu doar in logurile serverului,
    // la care nu avem acces direct) ca sa poata fi trimis mai departe pentru diagnostic.
    const suffix = data.detail ? ` [${data.detail}]` : ''
    return status === 401 ? 'Trebuie sa fii autentificat pentru a scana facturi.' :
      status === 429 ? 'Ai atins limita de 50 scanari pe zi. Revino maine.' :
      data.error === 'groq_rate_limit' ? `Serverul AI este aglomerat. Asteapta 15 secunde si incearca din nou.${suffix}` :
      data.error === 'groq_too_large' ? `Factura e prea lunga/complexa pentru a fi citita dintr-o singura cerere. Incearca sa o imparti (scaneaza doar o parte din pagina sau doar o pagina din PDF).${suffix}` :
      data.error === 'vision_failed' ? 'Poza neclara sau unghi dificil, chiar si dupa incercarea in 2 jumatati. Incearca o poza mai apropiata, cu lumina mai buna, sau incarca PDF-ul daca il ai.' :
      `Eroare: ${data.error || 'necunoscuta'}`
  }

  async function handleScan(file: File) {
    setScanning(true)
    setError('')
    try {
      const isImage = file.type.startsWith('image/')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!isImage) {
        const body = { docBase64: await readBase64(file), mimeType: file.type || 'application/pdf', fileName: file.name }
        const { ok, status, data } = await callApi(body, token)
        if (!ok) { setError(errorMessage(status, data)); return }
        if (data.items?.length) { onSuccess({ supplier: data.supplier || '', items: mapItems(data.items) }); return }
        setError('Nu s-au gasit produse. Incearca o poza mai clara sau incarca PDF-ul.')
        return
      }

      const fullImage = await resizeImage(file)
      const first = await callApi({ imageBase64: fullImage, mimeType: 'image/jpeg' }, token)

      // Daca prima incercare a esuat din lipsa de cota (rate limit sau buget de
      // tokeni epuizat), NU mai trimitem inca 2 cereri (jumatatile) — ar esua
      // garantat la fel si ar arde si mai mult din cota deja epuizata, in loc
      // sa ajute cu ceva.
      if (!first.ok && (first.data.error === 'groq_rate_limit' || first.data.error === 'groq_too_large')) {
        setError(errorMessage(first.status, first.data))
        return
      }

      // Rulam MEREU si varianta impartita in 2, chiar daca poza intreaga a
      // "reusit" (a gasit niste produse) — o factura densa poate fi citita
      // partial (unele randuri ratate din poza intreaga la rezolutie mai mica),
      // iar jumatatile citite la rezolutie mai mare per rand prind adesea
      // produse ratate de prima incercare. Costul in tokeni e mic (cativa
      // centi), dar un rezultat incomplet la o singura scanare din putinele
      // disponibile pe luna e mult mai rau.
      const [topImage, bottomImage] = await splitImageIntoHalves(file)
      const [topRes, bottomRes] = await Promise.all([
        callApi({ imageBase64: topImage, mimeType: 'image/jpeg' }, token),
        callApi({ imageBase64: bottomImage, mimeType: 'image/jpeg' }, token),
      ])

      const combinedItems = [
        ...(first.ok ? first.data.items || [] : []),
        ...(topRes.data.items || []),
        ...(bottomRes.data.items || []),
      ]
      const supplier = first.data.supplier || topRes.data.supplier || bottomRes.data.supplier || ''

      if (combinedItems.length > 0) {
        onSuccess({ supplier, items: dedupeItems(mapItems(combinedItems)) })
        return
      }

      // Nici una din cele 3 nu a mers — arata eroarea cea mai relevanta.
      const fallback = !first.ok ? first : (!topRes.ok ? topRes : bottomRes)
      setError(errorMessage(fallback.status, fallback.data))
    } catch {
      setError('Eroare de retea. Verifica conexiunea si incearca din nou.')
    } finally {
      setScanning(false)
    }
  }

  return { scanning, error, handleScan }
}
