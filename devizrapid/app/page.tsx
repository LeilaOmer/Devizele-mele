import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <style>{`.fixed.bottom-24 { display: none; }`}</style>

      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-base leading-none">T</span>
          </div>
          <span className="font-black text-xl text-gray-900">Tarifator</span>
        </div>
        <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          Autentificare →
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-10 pb-14 max-w-lg mx-auto text-center">
        <div className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-5 uppercase tracking-wide">
          30 zile gratuit · Fără card
        </div>
        <h1 className="text-4xl font-black text-gray-900 leading-tight mb-4">
          Fișe de servicii<br />în 30 de secunde
        </h1>
        <p className="text-lg text-gray-500 mb-8 leading-relaxed">
          Dictezi cu vocea ce ai lucrat. Aplicația generează instant fișa cu prețuri, gata de trimis clientului.
        </p>
        <Link href="/login"
          className="block w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
          Încearcă gratuit
        </Link>
        <p className="text-xs text-gray-400 mt-3">Fără card. Fără angajament. Anulezi oricând.</p>
      </section>

      {/* Cum functioneaza */}
      <section className="bg-gray-50 px-6 py-12">
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-6">Cum funcționează</p>
          <div className="space-y-3">
            {[
              { icon: '🎙️', title: 'Dictezi ce ai lucrat', desc: '„Montaj calorifer Popescu, 2 bucăți" — și gata.' },
              { icon: '✅', title: 'Verifici și ajustezi', desc: 'Fișa apare instant cu prețurile tale. Modifici dacă e nevoie.' },
              { icon: '📄', title: 'Trimiți PDF-ul', desc: 'Un tap și clientul primește documentul profesional.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                <span className="text-3xl leading-none mt-0.5">{item.icon}</span>
                <div>
                  <p className="font-bold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ce primesti */}
      <section className="px-6 py-12 max-w-lg mx-auto">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-6">Ce primești</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🎙️', title: 'Fișă prin voce', desc: 'Dictezi, aplicația completează' },
            { icon: '🏷️', title: 'Calculator preț', desc: 'Adaos, TVA, PDF instant' },
            { icon: '👥', title: 'Clienți salvați', desc: 'Date complete, refolosibile' },
            { icon: '🏢', title: 'Firme multiple', desc: 'Gestionezi mai multe firme' },
          ].map((f, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-4">
              <span className="text-2xl">{f.icon}</span>
              <p className="font-bold text-sm text-gray-900 mt-2">{f.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Preturi */}
      <section className="bg-gray-50 px-6 py-12">
        <div className="max-w-lg mx-auto space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-6">Prețuri simple</p>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Trial</p>
              <p className="font-bold text-gray-900">30 de zile gratuit</p>
              <p className="text-xs text-gray-400 mt-0.5">Acces complet, fără limitări</p>
            </div>
            <span className="text-4xl font-black text-green-400">0</span>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔨</span>
                  <p className="font-bold text-gray-900">Meseriaș</p>
                </div>
                <p className="text-xs text-gray-500">Fișe și calcule nelimitate · Fără TVA</p>
              </div>
              <p className="text-2xl font-black text-gray-900 shrink-0">25 <span className="text-sm font-semibold text-gray-400">lei/lună</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-purple-200">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⚡</span>
                  <p className="font-bold text-gray-900">Pro</p>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Recomandat</span>
                </div>
                <p className="text-xs text-gray-500">Tot Meseriaș + TVA · Firme multiple</p>
              </div>
              <p className="text-2xl font-black text-gray-900 shrink-0">65 <span className="text-sm font-semibold text-gray-400">lei/lună</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-14 text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-black text-gray-900 mb-3">Gata să economisești timp?</h2>
        <p className="text-gray-500 text-sm mb-6">Înregistrare în sub un minut. Prima lună complet gratuită.</p>
        <Link href="/login"
          className="block w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
          Începe gratuit
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center space-y-2">
        <div className="flex justify-center gap-6 text-xs text-gray-400">
          <Link href="/termeni" className="hover:text-gray-600">Termeni</Link>
          <Link href="/confidentialitate" className="hover:text-gray-600">Confidențialitate</Link>
          <a href="mailto:leyla.omer@gmail.com" className="hover:text-gray-600">Contact</a>
        </div>
        <p className="text-xs text-gray-300">© 2025 Tarifator</p>
      </footer>
    </div>
  )
}
