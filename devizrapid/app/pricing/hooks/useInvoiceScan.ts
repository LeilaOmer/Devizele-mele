'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Item } from '@/lib/pricing/calc'

type ScanResult = { supplier: string; items: Item[] }

function readBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(f)
  })
}

function resizeImage(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
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
}

export function useInvoiceScan(onSuccess: (result: ScanResult) => void) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  async function handleScan(file: File) {
    setScanning(true)
    setError('')
    try {
      const isImage = file.type.startsWith('image/')
      const body: Record<string, string> = isImage
        ? { imageBase64: await resizeImage(file), mimeType: 'image/jpeg' }
        : { docBase64: await readBase64(file), mimeType: file.type || 'application/pdf', fileName: file.name }

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
        setError(
          res.status === 401 ? 'Trebuie sa fii autentificat pentru a scana facturi.' :
          res.status === 429 ? 'Ai atins limita de 50 scanari pe zi. Revino maine.' :
          data.error === 'groq_rate_limit' ? 'Serverul AI este aglomerat. Asteapta 15 secunde si incearca din nou.' :
          data.error === 'vision_failed' ? 'Poza neclara sau unghi dificil. Incearca mai aproape, cu lumina mai buna, sau incarca PDF-ul direct.' :
          `Eroare: ${data.error || 'necunoscuta'}`
        )
        return
      }
      if (data.items?.length) {
        const items: Item[] = data.items.map((i: { name: string; unit: string; supplier_price: number; discount: number; vat: number; sgr: number }) => ({
          id: crypto.randomUUID(),
          name: i.name || '',
          unit: i.unit || 'buc',
          supplierPrice: i.supplier_price ? String(i.supplier_price) : '',
          discount: i.discount ? String(i.discount) : '0',
          vat: (i.vat === 11 ? 11 : 21) as 11 | 21,
          sgr: i.sgr ? String(i.sgr) : '0',
        }))
        onSuccess({ supplier: data.supplier || '', items })
      } else {
        setError('Nu s-au gasit produse. Incearca o poza mai clara sau incarca PDF-ul.')
      }
    } catch {
      setError('Eroare de retea. Verifica conexiunea si incearca din nou.')
    } finally {
      setScanning(false)
    }
  }

  return { scanning, error, handleScan }
}
