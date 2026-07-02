import { supabase } from '@/lib/supabase'

// Numerotare scopata per firma (sau per user, in artizan fara firma) si per
// luna calendaristica. Foloseste MAX(secventa existenta) + 1, NU count+1:
// count-ul scade cand stergi o fisa, deci count+1 ar putea reproduce un numar
// deja folosit de o fisa ramasa. MAX+1 e mereu mai mare decat orice numar
// existent din scope, deci nu se ciocneste cu o fisa existenta nici dupa
// stergeri. (Ramane un risc teoretic doar la doua creari EXACT simultane, ceva
// neglijabil pentru un magazin cu un singur operator.)
export async function nextQuoteNumber(userId: string, companyId: string | null): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const monthStart = new Date(year, now.getMonth(), 1).toISOString()
  const prefix = 'DR-' + year + month + '-'

  let query = supabase.from('quotes').select('quote_number').gte('created_at', monthStart)
  query = companyId ? query.eq('company_id', companyId) : query.eq('user_id', userId).is('company_id', null)

  const { data } = await query
  let maxSeq = 0
  for (const row of data ?? []) {
    const qn = (row as { quote_number: string | null }).quote_number
    if (typeof qn !== 'string' || !qn.startsWith(prefix)) continue
    const seq = parseInt(qn.slice(prefix.length), 10)
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq
  }
  return prefix + String(maxSeq + 1).padStart(3, '0')
}
