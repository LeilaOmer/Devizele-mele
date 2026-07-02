import { createClient } from '@supabase/supabase-js'

// Contor simplu de folosire per user + endpoint + zi, in tabelul api_usage.
// Foloseste service-role (identitatea userului e deja verificata de ruta), ca
// sa nu depinda de politici RLS pe tabelul de contorizare.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// Verifica limita zilnica si, daca nu e depasita, inregistreaza folosirea.
// Intoarce true daca apelul e permis, false daca s-a atins limita.
// Fail-open la eroare de infra: un hopa de retea NU trebuie sa blocheze un
// user legitim (contorul e o protectie anti-abuz, nu o poarta critica).
export async function allowDaily(userId: string, endpoint: string, dailyLimit: number): Promise<boolean> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return true
  try {
    const client = serviceClient()
    const today = new Date().toISOString().slice(0, 10)
    const { count } = await client
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('created_at', today)
    if ((count ?? 0) >= dailyLimit) return false
    await client.from('api_usage').insert({ user_id: userId, endpoint })
    return true
  } catch {
    return true
  }
}
