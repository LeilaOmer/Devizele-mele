export default function ConfidentialitatePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <a href="/login" className="text-sm text-blue-600 hover:underline">← Inapoi</a>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Politica de Confidentialitate</h1>
          <p className="text-xs text-gray-400 mt-1">GDPR — Regulamentul (UE) 2016/679 · Ultima actualizare: Iunie 2026</p>
        </div>

        <Section title="1. Operatorul de date">
          <p>Operatorul datelor cu caracter personal este <strong>[Denumire operator — PFA / SRL, adresa, CUI]</strong>, denumit in continuare "Operator".</p>
          <p className="mt-2">Contact privind datele personale: <strong>leyla.omer@gmail.com</strong></p>
        </Section>

        <Section title="2. Ce date colectam">
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-1.5 pr-4 font-semibold">Date</th>
                <th className="py-1.5 pr-4 font-semibold">Sursa</th>
                <th className="py-1.5 font-semibold">Scop</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-50">
                <td className="py-1.5 pr-4">Adresa de email</td>
                <td className="py-1.5 pr-4">Inregistrare cont</td>
                <td className="py-1.5">Autentificare, comunicare</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-1.5 pr-4">Nume firma, CUI, adresa</td>
                <td className="py-1.5 pr-4">Setari cont</td>
                <td className="py-1.5">Generare documente</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-1.5 pr-4">Date clienti (nume, tel, adresa)</td>
                <td className="py-1.5 pr-4">Introduse de dvs.</td>
                <td className="py-1.5">Gestionare clienti</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-1.5 pr-4">Date fise si devize</td>
                <td className="py-1.5 pr-4">Introduse de dvs.</td>
                <td className="py-1.5">Furnizarea Serviciului</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-1.5 pr-4">Inregistrari vocale</td>
                <td className="py-1.5 pr-4">Functia de dictare</td>
                <td className="py-1.5">Transcriere AI (sterse dupa transcriere)</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4">Date de utilizare (numar fise/calcule)</td>
                <td className="py-1.5 pr-4">Automat</td>
                <td className="py-1.5">Managementul planului</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="3. Temeiul juridic al prelucrarii">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Executarea contractului</strong> (Art. 6(1)(b) GDPR) — pentru furnizarea Serviciului</li>
            <li><strong>Interesul legitim</strong> (Art. 6(1)(f) GDPR) — pentru securitate si prevenirea fraudelor</li>
            <li><strong>Consimtamantul</strong> (Art. 6(1)(a) GDPR) — pentru comunicari optionale</li>
            <li><strong>Obligatia legala</strong> (Art. 6(1)(c) GDPR) — acolo unde legislatia o impune</li>
          </ul>
        </Section>

        <Section title="4. Durata pastrarii datelor">
          <ul className="list-disc pl-5 space-y-1">
            <li>Datele contului: pe durata existentei contului + 3 ani dupa stergere</li>
            <li>Inregistrarile vocale: se sterg imediat dupa transcriere</li>
            <li>Datele de facturare: 10 ani (obligatie legala contabila)</li>
            <li>Jurnalele de utilizare: 12 luni</li>
          </ul>
        </Section>

        <Section title="5. Destinatari si transferuri">
          <p>Datele dvs. pot fi partajate cu urmatorii subprocesori, care ofera garantii GDPR adecvate:</p>
          <div className="mt-2 space-y-2">
            <Processor name="Supabase Inc." role="Baza de date si autentificare" location="UE / SUA (DPA disponibil)" />
            <Processor name="Vercel Inc." role="Hosting aplicatie" location="SUA (Clauze Contractuale Standard UE)" />
            <Processor name="Groq Inc." role="Transcriere vocala AI" location="SUA (date procesate si sterse imediat)" />
          </div>
          <p className="mt-3">Nu vindem si nu inchiriem datele dvs. catre terti.</p>
        </Section>

        <Section title="6. Drepturile dvs.">
          <p>In temeiul GDPR, beneficiati de urmatoarele drepturi, pe care le puteti exercita la <strong>leyla.omer@gmail.com</strong>:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Acces</strong> — sa obtineti o copie a datelor prelucrate</li>
            <li><strong>Rectificare</strong> — sa corectati datele inexacte</li>
            <li><strong>Stergere</strong> ("dreptul de a fi uitat") — in conditiile Art. 17 GDPR</li>
            <li><strong>Restrictionarea prelucrarii</strong> — in conditiile Art. 18 GDPR</li>
            <li><strong>Portabilitatea datelor</strong> — sa primiti datele intr-un format structurat</li>
            <li><strong>Opozitia</strong> — fata de prelucrarea bazata pe interesul legitim</li>
            <li><strong>Retragerea consimtamantului</strong> — oricand, fara a afecta legalitatea prelucrarii anterioare</li>
          </ul>
          <p className="mt-3">Raspundem in termen de 30 de zile. Aveti dreptul de a depune plangere la <strong>ANSPDCP</strong> (Autoritatea Nationala de Supraveghere a Prelucrarii Datelor cu Caracter Personal), www.dataprotection.ro.</p>
        </Section>

        <Section title="7. Cookie-uri si stocare locala">
          <p>Aplicatia foloseste <strong>localStorage</strong> exclusiv pentru preferinte de interfata (modul activ, firma selectata). Nu folosim cookie-uri de tracking sau publicitate.</p>
          <p className="mt-2">Sesiunea de autentificare este gestionata prin cookie-uri tehnice necesare (Supabase auth), fara care Serviciul nu functioneaza.</p>
        </Section>

        <Section title="8. Securitate">
          <p>Datele sunt stocate criptat in baze de date securizate (Supabase). Accesul la datele dvs. este protejat prin politici de securitate la nivel de rand (Row Level Security). Comunicatiile sunt criptate TLS/HTTPS.</p>
        </Section>

        <div className="text-xs text-gray-400 pt-4 border-t border-gray-100 space-x-4">
          <a href="/termeni" className="hover:text-gray-600">Termeni si conditii</a>
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

function Processor({ name, role, location }: { name: string; role: string; location: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="font-semibold text-gray-700 w-32 shrink-0">{name}</span>
      <span className="text-gray-600">{role} · <span className="text-gray-400">{location}</span></span>
    </div>
  )
}
