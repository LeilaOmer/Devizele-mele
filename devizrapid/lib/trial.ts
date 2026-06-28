export const TRIAL_DAYS = 30
export const PROMO_TRIAL_DAYS = 180

// Utilizatorii înregistrați ÎNAINTE de această dată primesc 6 luni gratuit (early adopter promo).
// Actualizează la data la care treci pe tarifator.ro.
export const PROMO_CUTOFF = new Date('2099-01-01')

export function trialInfo(createdAt: string) {
  const start = new Date(createdAt)
  const now = new Date()
  const days = start < PROMO_CUTOFF ? PROMO_TRIAL_DAYS : TRIAL_DAYS
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysLeft = Math.max(0, days - daysElapsed)
  const urgency = daysLeft <= 7 ? 'critical' : daysLeft <= 30 ? 'warning' : 'ok'
  return { daysLeft, isActive: daysLeft > 0, urgency } as const
}
