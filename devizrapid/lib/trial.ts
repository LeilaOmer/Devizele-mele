export const TRIAL_DAYS = 30
export const PROMO_TRIAL_DAYS = 180

// Promo "Early Adopter" — primii PROMO_CAP utilizatori (vezi lib/promoCap.ts)
// primesc PROMO_TRIAL_DAYS in loc de TRIAL_DAYS. Eligibilitatea e determinata
// server-side (rangul de inregistrare), nu pe baza unei date fixe.
export function trialInfo(createdAt: string, promoEligible: boolean) {
  const start = new Date(createdAt)
  const now = new Date()
  const days = promoEligible ? PROMO_TRIAL_DAYS : TRIAL_DAYS
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysLeft = Math.max(0, days - daysElapsed)
  const urgency = daysLeft <= 7 ? 'critical' : daysLeft <= 30 ? 'warning' : 'ok'
  return { daysLeft, isActive: daysLeft > 0, urgency } as const
}

export type TrialInfo = ReturnType<typeof trialInfo>

export async function getPromoEligible(userId: string, accessToken: string): Promise<boolean> {
  const cacheKey = `promoEligible_${userId}`
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey)
    if (cached !== null) return cached === '1'
  }
  try {
    const res = await fetch('/api/trial-status', { headers: { Authorization: `Bearer ${accessToken}` } })
    const data = await res.json()
    const eligible = !!data.promoEligible
    if (typeof window !== 'undefined') localStorage.setItem(cacheKey, eligible ? '1' : '0')
    return eligible
  } catch {
    return true
  }
}
