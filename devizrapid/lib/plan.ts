import { trialInfo, getPromoEligible, type TrialInfo } from './trial'
import { isPlanActive } from './usage'

export type EffectivePlan = 'artizan' | 'pro'

export type AccountStatus = {
  trial: TrialInfo
  subscribed: boolean
  effectivePlan: EffectivePlan
}

// Determina ce poate folosi efectiv contul acum: in trial activ, acces
// complet la Pro (ca sa poata fi incercat). Dupa expirarea trialului,
// modul Pro necesita un abonament activ (plan_active_until) SI ca firma
// sa fi fost setata pe 'pro' (accountType reflecta ce s-a platit).
export async function getAccountStatus(
  session: { user: { id: string; created_at: string }; access_token: string },
  accountType: 'artizan' | 'pro',
  opts?: { forceTrialInactive?: boolean }
): Promise<AccountStatus> {
  const promoEligible = await getPromoEligible(session.user.id, session.access_token)
  const rawTrial = trialInfo(session.user.created_at, promoEligible)
  const trial = opts?.forceTrialInactive ? { ...rawTrial, isActive: false as const } : rawTrial
  const subscribed = trial.isActive ? true : await isPlanActive(session.user.id)
  // In trial sau cu abonament activ: acces la modul ales (accountType).
  // Fara trial si fara abonament: blocat pe Artizan, indiferent ce alesese inainte.
  const effectivePlan: EffectivePlan = (trial.isActive || subscribed) ? accountType : 'artizan'
  return { trial, subscribed, effectivePlan }
}
