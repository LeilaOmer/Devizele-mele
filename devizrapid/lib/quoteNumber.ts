import { supabase } from '@/lib/supabase'

// Numerotare scopata per firma (sau per user, in artizan fara firma) si per
// luna calendaristica, in loc de un contor global partajat de toti userii
// din toate firmele (ceea ce facea ca prima fisa a unui cont nou sa apara
// cu un numar mare, mostenit de la alti useri).
export async function nextQuoteNumber(userId: string, companyId: string | null): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const monthStart = new Date(year, now.getMonth(), 1).toISOString()

  let query = supabase.from('quotes').select('*', { count: 'exact', head: true }).gte('created_at', monthStart)
  query = companyId ? query.eq('company_id', companyId) : query.eq('user_id', userId).is('company_id', null)

  const { count } = await query
  const seq = (count ?? 0) + 1
  return 'DR-' + year + month + '-' + String(seq).padStart(3, '0')
}
