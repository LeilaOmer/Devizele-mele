import type { SupabaseClient } from '@supabase/supabase-js'

export const PROMO_CAP = 57

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

export async function countUsersCreatedAtOrBefore(admin: SupabaseClient, cutoffIso: string): Promise<number> {
  const cutoff = new Date(cutoffIso).getTime()
  const users = await listAllUsers(admin)
  return users.filter(u => new Date(u.created_at).getTime() <= cutoff).length
}
