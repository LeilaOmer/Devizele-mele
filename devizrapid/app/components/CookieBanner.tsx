'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[10000] p-4">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-lg px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Folosim cookie-uri strict necesare pentru autentificare si functionarea aplicatiei. Nu urmarim activitatea si nu folosim cookie-uri de publicitate.{' '}
          <Link href="/confidentialitate" className="text-blue-600 hover:underline">Politica de confidentialitate</Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Am inteles
        </button>
      </div>
    </div>
  )
}
