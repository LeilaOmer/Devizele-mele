import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { allowDaily } from '@/lib/rateLimit'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

const SYSTEM_PROMPT = 'Esti asistent pentru comercianti romani. Primesti text dictat cu produse de pe factura unui furnizor. Extrage lista de produse. Raspunzi DOAR cu JSON, fara text, fara markdown. Format: {"items":[{"name":"denumire produs","unit":"buc","supplier_price":0,"discount":0,"vat":21}]}. Discount e procentual (0 daca nu e mentionat). Pretul furnizorului e per unitate, nu total. IMPORTANT: Nu folosi diacritice in text (scrie fara semne: s nu s-virgula, t nu t-virgula, a nu a-breve/circumflex, i nu i-circumflex). Exemplu corect: "Timisoreana", "Apa minerala", "Pulpe de pui". REGULA DENUMIRE: Daca produsul are specificatie de ambalaj sau varianta (ex: "Timisoreana doza", "Pepsi PET 2L", "Unt 200g", "Bere sticla"), include specificatia IN denumire (nu ca unitate separata). Unitatea de masura pentru bauturi imbuteliate e intotdeauna "buc". REGULA TVA conform legislatiei romane: vat=11 pentru: (1) alimente si bauturi nealcoolice destinate consumului uman sau animal (inclusiv apa potabila, sucuri, lapte, carne, lactate, oua, paine, faina, zahar, ulei, conserve, legume, fructe, condimente, hrana animale); (2) animale si pasari vii domestice; (3) lemne de foc, energie termica; (4) carti, ziare, reviste, publicatii; (5) cazare hoteliera. vat=21 pentru ORICE altceva, inclusiv: bauturi alcoolice (bere, vin, sampanie, spirtoase, tuica, cidru etc.), suplimente alimentare si vitamine, produse cosmetice, detergenti si produse de curatenie, electrice si electronice, textile si imbracaminte, incaltaminte, jucarii, unelte, materiale de constructii, papetarie, medicamente (cu exceptia celor OTC cu cota redusa).'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ items: [] }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ items: [] }, { status: 401 })

  if (!(await allowDaily(user.id, 'parse-pricing', 300))) {
    return NextResponse.json({ items: [], error: 'rate_limit', message: 'Limita zilnica atinsa. Revino maine.' }, { status: 429 })
  }

  const { text } = await req.json()

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
    }),
  })

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return NextResponse.json(JSON.parse(match ? match[0] : '{}'))
  } catch {
    return NextResponse.json({ items: [] })
  }
}
