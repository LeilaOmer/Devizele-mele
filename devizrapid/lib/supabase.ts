import { createClient } from '@supabase/supabase-js'

// Strip any accidental path suffix from the URL (e.g. /auth/v1 or /rest/v1 copied by mistake)
function normalizeSupabaseUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return `${u.protocol}//${u.host}`
  } catch {
    return raw
  }
}

const supabaseUrl = normalizeSupabaseUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
)
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseKey)
