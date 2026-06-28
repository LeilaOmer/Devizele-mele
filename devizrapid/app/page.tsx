import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tarifator – Fișă Servicii prin Dictare & Calculator Preț cu Adaos și TVA',
  description: 'Dictezi ce ai lucrat, fișa de servicii apare instant cu prețurile tale. Calculator preț vânzare cu adaos comercial și TVA pentru comercianți. Gratuit 6 luni, fără card.',
  alternates: { canonical: 'https://devizele-mele.vercel.app' },
}

export default function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tarifator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RON',
      description: 'Trial gratuit 6 luni',
    },
    description: 'Aplicație pentru generarea fișelor de servicii prin dictare vocală și calculul prețului de vânzare cu adaos comercial și TVA.',
    url: 'https://devizele-mele.vercel.app',
    inLanguage: 'ro',
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`.fixed.bottom-24 { display: none; }`}</style>

      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-black text-sm leading-none">T</span>
          </div>
          <span className="font-bold text-lg text-gray-900">Tarifator</span>
        </div>
        <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900">
          Autentificare
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-16 max-w-3xl mx-auto">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4">
          6 luni gratuit · Fără card
        </p>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6 max-w-xl">
          Fișa clientului, gata înainte să pleci de la el.
        </h1>
        <p className="text-xl text-gray-500 mb-4 max-w-lg leading-relaxed">
          Dictezi ce ai lucrat. Fișa apare cu prețurile tale. O trimiți pe WhatsApp și pleci.
        </p>
        <p className="text-sm text-gray-400 mb-10 max-w-lg">
          Nu faci devize cu materiale și norme. Faci fișa de servicii prestate — simplu, rapid, pe telefon.
        </p>
        <Link href="/login"
          className="inline-block px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Încearcă gratuit
        </Link>
      </section>

      {/* Doua instrumente */}
      <section className="border-t border-gray-100 px-6 py-16 max-w-3xl mx-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-10">Ce face</p>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Fișă Servicii</p>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Dictezi. Fișa apare.</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Spui ce ai lucrat — aplicația recunoaște serviciile, completează cantitățile și calculează totalul. PDF-ul e gata de trimis clientului în câteva secunde.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-blue-400 shrink-0"></span>Recunoaștere vocală în română</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-blue-400 shrink-0"></span>Prețurile tale, aplicate automat</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-blue-400 shrink-0"></span>PDF profesional, trimis direct</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-3">Calculator Preț</p>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Prețul corect, la orice produs.</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Introduci costul de achiziție, setezi adaosul și TVA-ul — obții imediat prețul de vânzare și marja reală. Exporti lista ca PDF sau o trimiți direct.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-400 shrink-0"></span>Adaos comercial configurabil</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-400 shrink-0"></span>TVA 11% și 21%</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-400 shrink-0"></span>Export PDF și partajare</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pentru cine */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">Pentru cine</p>
          <p className="text-2xl font-bold text-gray-900 mb-6 max-w-xl">
            Două categorii, același instrument.
          </p>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl">
            <div>
              <p className="font-semibold text-gray-900 mb-2">Prestatori de servicii</p>
              <p className="text-gray-500 text-sm leading-relaxed">Electricieni, instalatori, tehnicieni HVAC, contabili, mecanici, curățenie — oricine emite fișe de servicii și lucrează cu clienți.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Mici comercianți</p>
              <p className="text-gray-500 text-sm leading-relaxed">Magazine, distribuitori, revânzători — oricine cumpără produse și trebuie să calculeze prețul de vânzare cu adaos și TVA.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Preturi */}
      <section className="border-t border-gray-100 px-6 py-16 max-w-3xl mx-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-10">Prețuri</p>
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 flex justify-between items-center bg-green-50">
            <div>
              <p className="font-semibold text-gray-900">Trial gratuit</p>
              <p className="text-sm text-gray-500 mt-0.5">6 luni · Acces complet · Fără card</p>
            </div>
            <p className="text-2xl font-bold text-green-600">0 lei</p>
          </div>
          <div className="px-6 py-5 flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-900">Artizan</p>
              <p className="text-sm text-gray-500 mt-0.5">Fișe și calcule nelimitate · Fără TVA · Fără firme</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">25 <span className="text-sm font-normal text-gray-400">lei/lună</span></p>
          </div>
          <div className="px-6 py-5 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">Pro</p>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Recomandat</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Tot Artizan + TVA · Firme multiple</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">65 <span className="text-sm font-normal text-gray-400">lei/lună</span></p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-gray-100 px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Încearcă gratuit 6 luni.</h2>
        <p className="text-gray-500 mb-8">Fără card. Fără angajament. Dacă nu e pentru tine, nu plătești nimic.</p>
        <Link href="/login"
          className="inline-block px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Creează cont gratuit
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 max-w-3xl mx-auto flex flex-wrap justify-between items-center gap-4 text-sm text-gray-400">
        <span>© 2025 Tarifator</span>
        <div className="flex gap-6">
          <Link href="/termeni" className="hover:text-gray-600">Termeni</Link>
          <Link href="/confidentialitate" className="hover:text-gray-600">Confidențialitate</Link>
          <a href="mailto:leyla.omer@gmail.com" className="hover:text-gray-600">leyla.omer@gmail.com</a>
        </div>
      </footer>
    </div>
  )
}
