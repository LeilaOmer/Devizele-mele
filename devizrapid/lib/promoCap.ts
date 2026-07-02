import type { SupabaseClient } from '@supabase/supabase-js'

// Primii PROMO_CAP utilizatori inregistrati dupa lansare primesc pretul redus
// la abonament (39/89/99 in loc de 59/129/149). Doar discount de pret — nu mai
// acorda un trial mai lung (conceptul de trial a fost inlocuit de tipurile de cont).
export const PROMO_CAP = 50

async function listAllUsers(admin: SupabaseClient) {
  const perPage = 1000
  const all: { created_at: string }[] = []
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    all.push(...data.users)
    if (data.users.length < perPage) break
  }
  return all
}

export async function countTotalUsers(admin: SupabaseClient): Promise<number> {
  return (await listAllUsers(admin)).length
}
