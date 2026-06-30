'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Item, RoundStep, RoundMode, emptyItem } from '@/lib/pricing/calc'

export function usePricingDraft() {
  const [supplier, setSupplier] = useState('')
  const [adaos, setAdaos] = useState('30')
  const [roundStep, setRoundStep] = useState<RoundStep>('0.50')
  const [roundMode, setRoundMode] = useState<RoundMode>('nearest')
  const [items, setItems] = useState<Item[]>([emptyItem(21)])
  const [draftId, setDraftId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  useEffect(() => {
    const draftParam = new URLSearchParams(window.location.search).get('draft')
    if (draftParam) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return
        supabase.from('pricing_drafts').select('*').eq('id', draftParam).single()
          .then(({ data }) => {
            if (!data) return
            setDraftId(data.id)
            setSupplier(data.supplier || '')
            setAdaos(String(data.adaos ?? 30))
            setRoundStep((data.round_step as RoundStep) || '0.50')
            setRoundMode((data.round_mode as RoundMode) || 'nearest')
            setItems(data.items?.length ? data.items.map((i: Item) => ({ ...i, sgr: i.sgr ?? '0' })) : [emptyItem(21)])
          })
      })
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

  return {
    supplier, setSupplier,
    adaos, setAdaos,
    roundStep, setRoundStep,
    roundMode, setRoundMode,
    items, setItems,
    saving, draftSaved,
    saveDraft, updateItem, removeItem,
  }
}
