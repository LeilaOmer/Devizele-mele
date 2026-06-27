import { supabase } from '@/lib/supabase'

export const FREE_FISE_LIMIT = 3
export const FREE_CALCULE_LIMIT = 3

function monthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function getMonthlyFise(userId: string): Promise<number> {
  const { count } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart())
  return count ?? 0
}

export async function getMonthlyCalcule(userId: string): Promise<number> {
  const { count } = await supabase
    .from('pricing_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart())
  return count ?? 0
}

export async function logCalcul(userId: string): Promise<void> {
  await supabase.from('pricing_usage').insert({ user_id: userId })
}

export async function isPlanActive(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('plan_active_until')
    .eq('id', userId)
    .single()
  if (!data?.plan_active_until) return false
  return new Date(data.plan_active_until) > new Date()
}
