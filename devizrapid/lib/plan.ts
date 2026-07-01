import { trialInfo, getPromoEligible, type TrialInfo } from './trial'
import { isPlanActive } from './usage'

export type AccountStatus = {
  trial: TrialInfo
  subscribed: boolean
}

// Trial (cu promo pentru primii 57) + status abonament platit. Comutarea
// intre Artizan si Pro ramane libera indiferent de aceste valori — singura
// restrictie reala pe cont gratuit e limita de 3 fise + 3 calcule pe luna
// (lib/usage.ts), aplicata la fel in ambele moduri.
export async function getAccountStatus(
  session: { user: { id: string; created_at: string }; access_token: string },
  opts?: { forceTrialInactive?: boolean }
): Promise<AccountStatus> {
  const promoEligible = await getPromoEligible(session.user.id, session.access_token)
  const rawTrial = trialInfo(session.user.created_at, promoEligible)
  const trial = opts?.forceTrialInactive ? { ...rawTrial, isActive: false as const } : rawTrial
  const subscribed = trial.isActive ? true : await isPlanActive(session.user.id)
  return { trial, subscribed }
}
