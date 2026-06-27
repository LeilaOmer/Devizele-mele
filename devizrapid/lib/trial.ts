export const TRIAL_DAYS = 30

export function trialInfo(createdAt: string) {
  const start = new Date(createdAt)
  const now = new Date()
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysLeft = Math.max(0, TRIAL_DAYS - daysElapsed)
  return {
    daysLeft,
    isActive: daysLeft > 0,
    urgency: daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'warning' : 'ok',
  } as const
}
