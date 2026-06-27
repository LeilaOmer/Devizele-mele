export default function RetragerePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <a href="/login" className="text-sm text-blue-600 hover:underline">← Inapoi</a>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Drept de Retragere · Rambursare · Anulare</h1>
          <p className="text-xs text-gray-400 mt-1">OUG 34/2014 · Legea 240/2020 · Ultima actualizare: Iunie 2026</p>
        </div>

        <Section title="1. Dreptul de retragere (14 zile)">
          <p>In conformitate cu OUG nr. 34/2014 privind drepturile consumatorilor, aveti dreptul de a va retrage din contractul de abonament <strong>in termen de 14 zile calendaristice</strong> de la data incheierii contractului (data activarii abonamentului platit), fara a fi necesar sa indicati un motiv.</p>

          <p className="mt-3 font-semibold text-gray-700">Exceptie pentru servicii digitale cu executie imediata</p>
          <p className="mt-1">Conform Art. 16 lit. m) din OUG 34/2014, dreptul de retragere <strong>nu se aplica</strong> in cazul continutului digital furnizat pe alt suport decat cel material, daca executarea a inceput cu acordul prealabil expres al consumatorului si dupa ce acesta a luat cunostinta de faptul ca va pierde astfel dreptul de retragere.</p>
          <p className="mt-2">Prin activarea abonamentului si accesarea imediata a functiilor platite, confirmati ca ati luat cunostinta de aceasta exceptie si ati acceptat-o in mod expres.</p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-amber-800">
            <p className="font-semibold text-sm">Practic:</p>
            <p className="text-sm mt-1">Daca solicitati retragerea <strong>inainte de a utiliza functiile platite</strong> (in primele 14 zile), veti primi rambursare integrala. Daca ati utilizat deja serviciul, se aplica politica de rambursare de mai jos.</p>
          </div>
        </Section>

        <Section title="2. Cum sa exercitati dreptul de retragere">
          <p>Transmiteti o declaratie clara si neechivoca prin email la <strong>leyla.omer@gmail.com</strong>, cu urmatoarele informatii:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Numele si adresa de email ale contului</li>
            <li>Data activarii abonamentului</li>
            <li>Declaratia expresa de retragere din contract</li>
          </ul>
          <p className="mt-3">Puteti folosi modelul de mai jos:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mt-2 text-xs font-mono text-gray-700 leading-relaxed">
            Catre: leyla.omer@gmail.com<br /><br />
            Prin prezenta, ma retrag din contractul de abonament Tarifator incheiat pe data de [DATA].<br /><br />
            Nume: [NUME]<br />
            Email cont: [EMAIL]<br /><br />
            Data: [DATA DECLARATIEI]
          </div>
          <p className="mt-3">Confirmam primirea declaratiei in termen de 24 de ore lucratoare.</p>
        </Section>

        <Section title="3. Politica de rambursare">
          <div className="space-y-3">
            <Case
              when="Retragere in 14 zile, serviciu neutilizat"
              then="Rambursare integrala a sumei platite, in termen de 14 zile de la primirea declaratiei."
            />
            <Case
              when="Retragere in 14 zile, serviciu partial utilizat"
              then="Rambursare proportionala cu zilele ramase din luna platita (calcul pro-rata)."
            />
            <Case
              when="Anulare dupa 14 zile"
              then="Nu se efectueaza rambursari pentru perioadele deja platite. Accesul continua pana la expirarea abonamentului curent."
            />
            <Case
              when="Defectiune tehnica majora din vina Furnizorului"
              then="Rambursare proportionala cu perioada de indisponibilitate, la cerere motivata."
            />
            <Case
              when="Perioada de test (30 zile gratuite)"
              then="Nu se aplica rambursarea — perioada de test este gratuita."
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">Rambursarile se efectueaza prin acelasi mijloc de plata utilizat initial, cu exceptia cazului in care conveniti altfel. Nu percepem taxe pentru procesarea rambursarilor.</p>
        </Section>

        <Section title="4. Politica de anulare abonament">
          <p>Puteti anula abonamentul oricand, fara penalitati, trimizand un email la <strong>leyla.omer@gmail.com</strong>.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Anularea intra in vigoare la sfarsitul perioadei de abonament curente platite.</li>
            <li>Dupa anulare, contul trece automat pe planul gratuit (3 fise + 3 calcule/luna).</li>
            <li>Datele dvs. sunt pastrate conform politicii de confidentialitate si pot fi exportate oricand.</li>
            <li>Puteti reactiva abonamentul oricand.</li>
          </ul>
        </Section>

        <Section title="5. Stergerea contului">
          <p>Puteti solicita stergerea completa a contului si a datelor asociate prin email la <strong>leyla.omer@gmail.com</strong>. Procesam cererea in termen de 30 de zile.</p>
          <p className="mt-2">Anumite date pot fi retinute daca exista obligatie legala (ex: documente contabile).</p>
        </Section>

        <div className="text-xs text-gray-400 pt-4 border-t border-gray-100 space-x-4">
          <a href="/termeni" className="hover:text-gray-600">Termeni si conditii</a>
          <a href="/confidentialitate" className="hover:text-gray-600">Politica de confidentialitate</a>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-2">
      <h2 className="font-bold text-gray-900">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </div>
  )
}

function Case({ when, then }: { when: string; then: string }) {
  return (
    <div className="flex gap-3 text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
      <div className="w-2/5">
        <span className="font-semibold text-gray-700">{when}</span>
      </div>
      <div className="w-3/5 text-gray-600">{then}</div>
    </div>
  )
}
