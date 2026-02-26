export type AccessTier = 'admin' | 'pro' | 'trial' | 'free'

type AccessParams = {
  isPro: boolean
  userRole?: string
  trialActive: boolean
}

type AccessResult = {
  tier: AccessTier
  monthlyLimit: number | 'unlimited'
  canCreate: boolean
}

export const getAccess = ({
  isPro,
  userRole,
  trialActive,
}: AccessParams): AccessResult => {
  if (userRole === 'admin') {
    return { tier: 'admin', monthlyLimit: 'unlimited', canCreate: true }
  }

  if (isPro) {
    return { tier: 'pro', monthlyLimit: 'unlimited', canCreate: true }
  }

  if (trialActive) {
    return { tier: 'trial', monthlyLimit: 'unlimited', canCreate: true }
  }

  return { tier: 'free', monthlyLimit: 15, canCreate: true }
}
