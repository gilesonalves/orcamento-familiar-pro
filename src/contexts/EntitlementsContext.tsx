import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from '@revenuecat/purchases-capacitor'
import { useAuth } from '../context/AuthContext'
import {
  addCustomerInfoUpdateListener,
  getCustomerInfoSummary,
  getCustomerInfo,
  getOfferings,
  getRevenueCatAnnualPackageId,
  getRevenueCatEntitlementId,
  getRevenueCatMonthlyPackageId,
  getRevenueCatOfferingId,
  getRevenueCatPublicKey,
  getRevenueCatUserIdMode,
  initRevenueCat,
  isRevenueCatEnabled,
  normalizeRevenueCatErrorMessage,
  purchasePackage,
  removeCustomerInfoUpdateListener,
  resolveRevenueCatAppUserId,
  restorePurchases,
} from '../services/revenuecat'

const CACHE_KEY = 'orcamento_rc_is_pro'
const CACHE_TS_KEY = 'orcamento_rc_is_pro_ts'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export type ProPackageType = 'monthly' | 'annual'

type PackageSet = {
  monthly?: PurchasesPackage
  annual?: PurchasesPackage
  all: PurchasesPackage[]
}

type EntitlementsContextValue = {
  loading: boolean
  processing: boolean
  isPro: boolean
  activeEntitlement: string | null
  activeProductIds: string[]
  error?: string
  offerings?: PurchasesOfferings
  packages: PackageSet
  refresh: () => Promise<void>
  purchase: (type: ProPackageType) => Promise<void>
  restore: () => Promise<void>
  paywallOpen: boolean
  openPaywall: () => void
  closePaywall: () => void
}

type EntitlementsProviderProps = {
  children: ReactNode
}

const EntitlementsContext = createContext<EntitlementsContextValue | undefined>(
  undefined,
)

const getCachedIsPro = () => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(CACHE_KEY)
  const ts = window.localStorage.getItem(CACHE_TS_KEY)
  if (!ts) return null
  const parsedTs = Number(ts)
  if (!Number.isFinite(parsedTs)) return null
  if (Date.now() - parsedTs > CACHE_TTL_MS) return null
  return raw === 'true'
}

const setCachedIsPro = (value: boolean) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CACHE_KEY, String(value))
  window.localStorage.setItem(CACHE_TS_KEY, String(Date.now()))
}

const pickOffering = (offerings?: PurchasesOfferings) => {
  if (!offerings) return undefined
  const preferredId = getRevenueCatOfferingId()
  const preferred = offerings.all?.[preferredId]
  return preferred ?? offerings.current
}

const pickPackageByType = (
  offerings: PurchasesOfferings | undefined,
  type: ProPackageType,
): PurchasesPackage | undefined => {
  const current = pickOffering(offerings)
  const available: PurchasesPackage[] = current?.availablePackages ?? []
  if (available.length === 0) return undefined

  const targetId =
    type === 'monthly'
      ? getRevenueCatMonthlyPackageId()
      : getRevenueCatAnnualPackageId()

  const byIdentifier = available.find(
    (pkg: PurchasesPackage) => String(pkg.identifier) === targetId,
  )
  if (byIdentifier) return byIdentifier

  const direct = type === 'monthly' ? current?.monthly : current?.annual
  if (direct) return direct

  const targetType = type === 'monthly' ? 'monthly' : 'annual'
  return available.find(
    (pkg: PurchasesPackage) =>
      String(pkg.packageType).toLowerCase() === targetType,
  )
}

export function EntitlementsProvider({ children }: EntitlementsProviderProps) {
  const { user, userRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [activeEntitlement, setActiveEntitlement] = useState<string | null>(null)
  const [activeProductIds, setActiveProductIds] = useState<string[]>([])
  const [error, setError] = useState<string | undefined>(undefined)
  const [offerings, setOfferings] = useState<PurchasesOfferings | undefined>(undefined)
  const [packages, setPackages] = useState<PackageSet>({ all: [] })
  const [paywallOpen, setPaywallOpen] = useState(false)

  const initializedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)

  const entitlementId = getRevenueCatEntitlementId()
  const userIdMode = getRevenueCatUserIdMode()

  const openPaywall = useCallback(() => setPaywallOpen(true), [])
  const closePaywall = useCallback(() => setPaywallOpen(false), [])

  const updatePackages = useCallback((nextOfferings?: PurchasesOfferings) => {
    const monthly = pickPackageByType(nextOfferings, 'monthly')
    const annual = pickPackageByType(nextOfferings, 'annual')
    const all = pickOffering(nextOfferings)?.availablePackages ?? []
    setPackages({ monthly, annual, all })
  }, [])

  const updateFromCustomerInfo = useCallback(
    (customerInfo: CustomerInfo) => {
      const summary = getCustomerInfoSummary(customerInfo, entitlementId)
      const adminOverride = userRole === 'admin'
      const resolved = adminOverride ? true : summary.isPro
      setIsPro(resolved)
      setCachedIsPro(resolved)
      setActiveEntitlement(summary.activeEntitlement)
      setActiveProductIds(summary.activeProductIds)
    },
    [entitlementId, userRole],
  )

  const refresh = useCallback(async () => {
    if (!isRevenueCatEnabled()) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(undefined)

    try {
      const [customerInfo, nextOfferings] = await Promise.all([
        getCustomerInfo(),
        getOfferings(),
      ])
      updateFromCustomerInfo(customerInfo)
      setOfferings(nextOfferings)
      updatePackages(nextOfferings)
      if (import.meta.env.DEV) {
        const selectedOffering = pickOffering(nextOfferings)
        const count = selectedOffering?.availablePackages?.length ?? 0
        console.log('[revenuecat] offerings loaded', {
          offeringId: selectedOffering?.identifier,
          count,
        })
      }
    } catch (err) {
      const message = normalizeRevenueCatErrorMessage(
        err,
        'Falha ao atualizar assinatura.',
      )
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [updateFromCustomerInfo, updatePackages])

  useEffect(() => {
    const cached = getCachedIsPro()
    if (cached !== null) {
      setIsPro(cached)
    }
  }, [])

  useEffect(() => {
    let active = true

    const setup = async () => {
      if (!isRevenueCatEnabled()) {
        if (import.meta.env.DEV && !getRevenueCatPublicKey()) {
          setError(
            'RevenueCat nao configurado: defina VITE_REVENUECAT_PUBLIC_KEY.',
          )
        }
        setLoading(false)
        return
      }

      const appUserId = resolveRevenueCatAppUserId({
        userId: user?.id,
        email: user?.email,
      })
      const shouldInit =
        !initializedRef.current || lastUserIdRef.current !== appUserId

      if (shouldInit) {
        initializedRef.current = await initRevenueCat(appUserId)
        lastUserIdRef.current = appUserId
      }

      if (!active) return
      await refresh()
    }

    void setup()

    return () => {
      active = false
    }
  }, [refresh, user?.email, user?.id, userIdMode])

  useEffect(() => {
    if (!isRevenueCatEnabled()) return

    let active = true
    let listenerId: string | null = null

    const handleUpdate = (info: CustomerInfo) => {
      updateFromCustomerInfo(info)
    }

    const register = async () => {
      const id = await addCustomerInfoUpdateListener(handleUpdate)
      if (!active) return
      listenerId = id
    }

    void register()

    return () => {
      active = false
      if (listenerId) {
        void removeCustomerInfoUpdateListener(listenerId)
      }
    }
  }, [updateFromCustomerInfo])

  const purchase = useCallback(
    async (type: ProPackageType) => {
      const target = type === 'monthly' ? packages.monthly : packages.annual
      if (!target) {
        setError('Plano indisponivel no momento.')
        return
      }

      setProcessing(true)
      setError(undefined)

      try {
        const result = await purchasePackage(target)
        const info = result.customerInfo
        updateFromCustomerInfo(info)
      } catch (err) {
        const message = normalizeRevenueCatErrorMessage(
          err,
          'Falha ao concluir compra.',
        )
        setError(message)
      } finally {
        setProcessing(false)
      }
    },
    [packages.annual, packages.monthly, updateFromCustomerInfo],
  )

  const restore = useCallback(async () => {
    setProcessing(true)
    setError(undefined)

    try {
      const info = await restorePurchases()
      updateFromCustomerInfo(info)
    } catch (err) {
      const message = normalizeRevenueCatErrorMessage(
        err,
        'Falha ao restaurar compras.',
      )
      setError(message)
    } finally {
      setProcessing(false)
    }
  }, [updateFromCustomerInfo])

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      loading,
      processing,
      isPro,
      activeEntitlement,
      activeProductIds,
      error,
      offerings,
      packages,
      refresh,
      purchase,
      restore,
      paywallOpen,
      openPaywall,
      closePaywall,
    }),
    [
      loading,
      processing,
      isPro,
      activeEntitlement,
      activeProductIds,
      error,
      offerings,
      packages,
      refresh,
      purchase,
      restore,
      paywallOpen,
      openPaywall,
      closePaywall,
    ],
  )

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  )
}

export const useEntitlementsContext = () => {
  const ctx = useContext(EntitlementsContext)
  if (!ctx) {
    throw new Error('useEntitlements deve ser usado dentro do EntitlementsProvider')
  }
  return ctx
}

export const useSubscription = useEntitlementsContext
