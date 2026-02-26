import { Capacitor } from '@capacitor/core'
import {
  LOG_LEVEL,
  Purchases,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOfferings,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor'

const API_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY as string | undefined
const ENTITLEMENT_ID =
  (import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID as string | undefined) ||
  'pro'
const OFFERING_ID =
  (import.meta.env.VITE_REVENUECAT_OFFERING_ID as string | undefined) ||
  'default'
const MONTHLY_PACKAGE_ID =
  (import.meta.env.VITE_REVENUECAT_PACKAGE_MONTHLY as string | undefined) ||
  'rc_monthly'
const ANNUAL_PACKAGE_ID =
  (import.meta.env.VITE_REVENUECAT_PACKAGE_ANNUAL as string | undefined) ||
  'rc_annual'
const USER_ID_MODE_RAW =
  (import.meta.env.VITE_REVENUECAT_APP_USER_ID_MODE as string | undefined) ||
  'preferred'
const ANON_USER_ID_KEY = 'orcamento_rc_anonymous_user_id'

export type RevenueCatUserIdMode = 'anonymous' | 'supabase' | 'preferred'

export const getRevenueCatUserIdMode = (): RevenueCatUserIdMode =>
  USER_ID_MODE_RAW === 'preferred'
    ? 'preferred'
    : USER_ID_MODE_RAW === 'supabase'
      ? 'supabase'
      : 'anonymous'

export const getRevenueCatOfferingId = () => OFFERING_ID
export const getRevenueCatMonthlyPackageId = () => MONTHLY_PACKAGE_ID
export const getRevenueCatAnnualPackageId = () => ANNUAL_PACKAGE_ID

export const getRevenueCatPublicKey = () => API_KEY

const createAnonymousId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `anon_${crypto.randomUUID()}`
  }
  return `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`
}

export const getPersistedAnonymousRevenueCatUserId = () => {
  if (typeof window === 'undefined') return createAnonymousId()
  const existing = window.localStorage.getItem(ANON_USER_ID_KEY)
  if (existing) return existing
  const generated = createAnonymousId()
  window.localStorage.setItem(ANON_USER_ID_KEY, generated)
  return generated
}

export const resolveRevenueCatAppUserId = (params: {
  userId?: string | null
  email?: string | null
}) => {
  const mode = getRevenueCatUserIdMode()
  const preferredUserId = params.userId || params.email

  if (mode === 'supabase') {
    return preferredUserId || getPersistedAnonymousRevenueCatUserId()
  }

  if (mode === 'anonymous') {
    return getPersistedAnonymousRevenueCatUserId()
  }

  return preferredUserId || getPersistedAnonymousRevenueCatUserId()
}

export const normalizeRevenueCatErrorMessage = (
  error: unknown,
  fallback: string,
) => {
  const rcError = (error ?? {}) as Partial<PurchasesError> & {
    code?: string | number
    userCancelled?: boolean
  }
  const code = String(rcError.code ?? '')

  if (rcError.userCancelled || code.includes('PURCHASE_CANCELLED')) {
    return 'Compra cancelada.'
  }

  if (
    code.includes('PRODUCT_ALREADY_PURCHASED') ||
    code.includes('PURCHASE_NOT_ALLOWED')
  ) {
    return 'Você já possui essa assinatura. Use "Restaurar compras".'
  }

  if (code.includes('NETWORK_ERROR')) {
    return 'Falha de rede. Verifique sua conexão e tente novamente.'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export const getCustomerInfoSummary = (
  customerInfo: CustomerInfo,
  entitlementId = ENTITLEMENT_ID,
) => {
  const activeEntitlements = customerInfo?.entitlements?.active ?? {}
  const activeEntitlement = activeEntitlements[entitlementId]
    ? entitlementId
    : null

  const activeProductIds = Array.isArray(customerInfo?.activeSubscriptions)
    ? customerInfo.activeSubscriptions
    : []

  const isPro = Boolean(activeEntitlement)

  return {
    isPro,
    activeEntitlement,
    activeProductIds,
  }
}

export const getRevenueCatEntitlementId = () => ENTITLEMENT_ID

export const isRevenueCatEnabled = () =>
  Capacitor.isNativePlatform() && Boolean(API_KEY)

export const initRevenueCat = async (appUserId?: string | null) => {
  if (!Capacitor.isNativePlatform() || !API_KEY) return false

  if (import.meta.env.DEV) {
    Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
  }

  if (appUserId) {
    await Purchases.configure({ apiKey: API_KEY, appUserID: appUserId })
  } else {
    await Purchases.configure({ apiKey: API_KEY })
  }

  if (import.meta.env.DEV) {
    console.log('[revenuecat] configured')
  }

  return true
}

export const getCustomerInfo = async (): Promise<CustomerInfo> => {
  const result = await Purchases.getCustomerInfo()
  return result.customerInfo
}

export const getOfferings = async (): Promise<PurchasesOfferings> =>
  Purchases.getOfferings()

export const purchasePackage = async (pkg: PurchasesPackage) =>
  Purchases.purchasePackage({ aPackage: pkg })

export const restorePurchases = async (): Promise<CustomerInfo> => {
  const result = await Purchases.restorePurchases()
  return result.customerInfo
}

export const addCustomerInfoUpdateListener = async (
  listener: (info: CustomerInfo) => void,
) => Purchases.addCustomerInfoUpdateListener(listener)

export const removeCustomerInfoUpdateListener = async (
  listenerId: string,
) => Purchases.removeCustomerInfoUpdateListener({
  listenerToRemove: listenerId,
})

export const getIsProFromCustomerInfo = (
  customerInfo: CustomerInfo,
  entitlementId = ENTITLEMENT_ID,
) => {
  const summary = getCustomerInfoSummary(customerInfo, entitlementId)
  return summary.isPro
}
