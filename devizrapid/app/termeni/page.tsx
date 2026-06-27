export default function TermeniPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <a href="/login" className="text-sm text-blue-600 hover:underline">← Inapoi</a>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Termeni și Condiții</h1>
          <p className="text-xs text-gray-400 mt-1">Ultima actualizare: Iunie 2026</p>
        </div>

        <Section title="1. Partile contractante">
          <p>Prezentii Termeni și Conditii ("Termeni") reglementeaza utilizarea aplicatiei <strong>Tarifator</strong> ("Serviciul"), disponibila la adresa <em>devizele-mele.vercel.app</em>.</p>
          <p className="mt-2">Serviciul este furnizat de <strong>[Denumire operator — PFA / SRL / persoana fizica, adresa, CUI]</strong>, denumit in continuare "Furnizor".</p>
          <p className="mt-2">Prin crearea unui cont confirmati ca ati citit, inteles si acceptat acesti Termeni. Daca nu sunteti de acord, nu utilizati Serviciul.</p>
        </Section>

        <Section title="2. Descrierea Serviciului">
          <p>Tarifator este o platforma digitala destinata meseriasilor si firmelor mici pentru:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Generarea de fise de servicii prin dictare vocala sau manual</li>
            <li>Calculul pretului de vanzare cu adaos si TVA</li>
            <li>Gestionarea clientilor si a firmelor proprii</li>
            <li>Exportul documentelor in format PDF</li>
          </ul>
          <p className="mt-2">Serviciul este furnizat "asa cum este". Furnizorul depune eforturi rezonabile pentru disponibilitate continua, dar nu garanteaza functionarea neintrerupta.</p>
        </Section>

        <Section title="3. Contul de utilizator">
          <ul className="list-disc pl-5 space-y-1">
            <li>Sunteti responsabil pentru securitatea credentialelor contului dvs.</li>
            <li>Un cont este destinat unui singur utilizator sau unei singure entitati.</li>
            <li>Nu transferati accesul catre terti neautorizati.</li>
            <li>Notificati imediat Furnizorul daca suspectati utilizarea neautorizata a contului.</li>
          </ul>
        </Section>

        <Section title="4. Planuri si tarife">
          <div className="space-y-2">
            <Row label="Perioada de test" value="30 de zile gratuite cu acces complet (Plan Pro)" />
            <Row label="Plan gratuit" value="3 fise/luna + 3 calcule de pret/luna, dupa expirarea trialului" />
            <Row label="Plan Meserias" value="25 lei/luna — utilizare nelimitata, fara TVA, fara firme" />
            <Row label="Plan Pro" value="65 lei/luna — utilizare nelimitata, TVA, firme multiple" />
          </div>
          <p className="mt-3 text-sm text-gray-600">Tarifele pot fi modificate cu notificare prealabila de minimum 30 de zile transmisa pe adresa de email inregistrata.</p>
        </Section>

        <Section title="5. Plati si facturare">
          <p>Abonamentele se activeaza manual prin contact la <strong>leyla.omer@gmail.com</strong>. Plata se efectueaza in avans, la inceputul fiecarei perioade de abonament.</p>
          <p className="mt-2">Dupa achitarea platii, Furnizorul activeaza abonamentul in termen de 24 de ore lucratoare.</p>
        </Section>

        <Section title="6. Rezilierea si anularea">
          <p>Puteti solicita anularea abonamentului oricand, prin email la leyla.omer@gmail.com. Accesul la functiile platite continua pana la expirarea perioadei pentru care s-a achitat.</p>
          <p className="mt-2">Furnizorul isi rezerva dreptul de a suspenda sau inchide conturile care incalca prezentii Termeni, cu notificare prealabila acolo unde este posibil.</p>
        </Section>

        <Section title="7. Proprietate intelectuala">
          <p>Codul sursa, interfata, brandingul si continutul Serviciului sunt proprietatea Furnizorului. Datele introduse de dvs. (fise, clienti, preturi) va apartin in totalitate.</p>
        </Section>

        <Section title="8. Limitarea raspunderii">
          <p>Furnizorul nu raspunde pentru pierderi indirecte, pierderi de profit sau pierderi de date rezultate din utilizarea sau imposibilitatea utilizarii Serviciului.</p>
          <p className="mt-2">Raspunderea totala a Furnizorului este limitata la suma platita de utilizator in ultimele 3 luni calendaristice anterioare evenimentului cauzator de prejudiciu.</p>
        </Section>

        <Section title="9. Legea aplicabila">
          <p>Prezentii Termeni sunt guvernati de legislatia romana. Orice litigiu se supune jurisdictiei exclusive a instantelor competente din Romania.</p>
          <p className="mt-2">In calitate de consumator, beneficiati de protectia oferita de legislatia romana si europeana privind drepturile consumatorilor, inclusiv posibilitatea de solutionare alternativa a disputelor prin SAL (solutionarea alternativa a litigiilor) sau platforma ODR a UE.</p>
        </Section>

        <div className="text-xs text-gray-400 pt-4 border-t border-gray-100 space-x-4">
          <a href="/confidentialitate" className="hover:text-gray-600">Politica de confidentialitate</a>
          <a href="/retragere" className="hover:text-gray-600">Drept de retragere</a>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-semibold text-gray-700 w-36 shrink-0">{label}</span>
      <span className="text-gray-600">{value}</span>
    </div>
  )
}
