'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function ActiveCompanyBanner() {
  const [name, setName] = useState<string | null>(null)
  const pathname = usePathname()

useEffect(() => {
  async function check() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setName(null); return }
    const { data: prof } = await supabase.from('profiles').select('account_type').eq('id', session.user.id).single()
    if (prof?.account_type !== 'pro') { setName(null); return }
    setName(localStorage.getItem('activeCompanyName') || null)
  }
  check()
}, [pathname])

  if (!name) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-purple-600 text-white text-xs text-center py-1 font-semibold">
      Firma activa: {name}
    </div>
  )
}