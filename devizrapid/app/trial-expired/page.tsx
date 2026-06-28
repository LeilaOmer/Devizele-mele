'use client'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function TrialExpiredPage() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-5">

        <div className="text-5xl">⏰</div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perioada de test a expirat</h1>
          <p className="text-gray-500 text-sm mt-2">
            Perioada de test gratuita s-a incheiat. Pentru a continua sa folosesti Tarifator, contacteaza-ne pentru activarea abonamentului.
          </p>
        </div>

        <div className="bg-blue-50 rounded-2xl p-4 text-left space-y-1">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Contact</p>
          <p className="text-sm font-bold text-blue-800">contact.tarifator@gmail.com</p>
          <p className="text-xs text-blue-500">Raspundem in maxim 24 de ore</p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          Iesi din cont
        </button>

      </div>
    </div>
  )
}
