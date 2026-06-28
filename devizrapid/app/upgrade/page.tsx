'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function UpgradeContent() {
  const router = useRouter()
  const params = useSearchParams()
  const type = params.get('type')

  const limitMessage = type === 'fise'
    ? 'Ai atins limita de 3 fise gratuite pe luna.'
    : type === 'calcule'
    ? 'Ai atins limita de 3 calcule de pret gratuite pe luna.'
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4">

        <div className="text-center space-y-1 pb-2">
          {limitMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 text-sm text-amber-700 font-medium">
              {limitMessage}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Alege abonamentul tau</h1>
          <p className="text-sm text-gray-500">Fise si calcule nelimitate. Fara limite lunare.</p>
        </div>

        {/* Artizan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔨</span>
            <div>
              <p className="font-bold text-gray-900">Artizan</p>
              <p className="text-2xl font-black text-gray-900">25 <span className="text-base font-semibold text-gray-400">lei/luna</span></p>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Fise Servicii nelimitate</li>
            <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Calcule Pret nelimitate</li>
            <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Fără TVA · Fără firme</li>
          </ul>
        </div>

        {/* Pro */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-purple-200 p-5 space-y-3 relative">
          <div className="absolute top-3 right-3 bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Recomandat</div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-bold text-gray-900">Pro</p>
              <p className="text-2xl font-black text-gray-900">65 <span className="text-base font-semibold text-gray-400">lei/luna</span></p>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Fise Servicii nelimitate</li>
            <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Calcule Pret nelimitate</li>
            <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> TVA · Firme multiple</li>
            <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Clienti si fise avansate</li>
          </ul>
        </div>

        {/* Contact */}
        <div className="bg-blue-50 rounded-2xl p-4 text-center space-y-1">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Activare abonament</p>
          <p className="text-sm font-bold text-blue-800">contact.tarifator@gmail.com</p>
          <p className="text-xs text-blue-500">Raspundem in maxim 24 de ore</p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          Inapoi la dashboard
        </button>

      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  )
}
