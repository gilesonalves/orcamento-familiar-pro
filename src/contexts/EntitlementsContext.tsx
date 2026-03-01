import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

import {
  addCustomerInfoUpdateListener,
  ensureRevenueCatConfigured,
  getCustomerInfo,
  getCustomerInfoSummary,
  getOfferings,
  getRevenueCatAnnualPackageId,
  getRevenueCatEntitlementId,
  getRevenueCatMonthlyPackageId,
  getRevenueCatOfferingId,
  isRevenueCatEnabled,
  normalizeRevenueCatErrorMessage,
  purchasePackage,
  removeCustomerInfoUpdateListener,
  resolveRevenueCatAppUserId,
  restorePurchases,
} from '../services/revenuecat'

type BillingTier = 'free' | 'pro'

type PackagesState = {
  monthly: any | null
  annual: any | null
}

type EntitlementsContextValue = {
  tier: BillingTier
  isPro: boolean
  loading: boolean
  processing: boolean
  error: string | null

  activeEntitlement: string | null
  activeProductIds: string[]

  paywallOpen: boolean
  openPaywall: () => void
  closePaywall: () => void

  packages: PackagesState

  purchase: (kind: 'monthly' | 'annual') => Promise<void>
  restore: () => Promise<void>
  refresh: () => Promise<void>
}

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null)

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth() as any // mantenho como você está usando

  const [paywallOpen, setPaywallOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isPro, setIsPro] = useState(false)
  const [tier, setTier] = useState<BillingTier>('free')

  const [activeEntitlement, setActiveEntitlement] = useState<string | null>(null)
  const [activeProductIds, setActiveProductIds] = useState<string[]>([])

  const [packages, setPackages] = useState<PackagesState>({
    monthly: null,
    annual: null,
  })

  const listenerIdRef = useRef<string | null>(null)

  const appUserId = useMemo(() => {
    return resolveRevenueCatAppUserId({
      userId: user?.id ?? null,
      email: user?.email ?? null,
    })
  }, [user?.id, user?.email])

  const enabled = isRevenueCatEnabled()

  const closePaywall = () => setPaywallOpen(false)
  const openPaywall = () => setPaywallOpen(true)

  const extractPackages = (offerings: any) => {
    const offeringId = getRevenueCatOfferingId()
    const monthlyId = getRevenueCatMonthlyPackageId()
    const annualId = getRevenueCatAnnualPackageId()

    const current =
      offerings?.all?.[offeringId] ??
      offerings?.current ??
      offerings?.all?.default ??
      null

    const available: any[] = Array.isArray(current?.availablePackages)
      ? current.availablePackages
      : []

    const monthly =
      available.find(p => p?.identifier === monthlyId) ||
      available.find(p => p?.packageType === 'MONTHLY') ||
      null

    const annual =
      available.find(p => p?.identifier === annualId) ||
      available.find(p => p?.packageType === 'ANNUAL') ||
      null

    return { monthly, annual }
  }

  const applyCustomerSummary = (summary: {
    isPro: boolean
    activeEntitlement: string | null
    activeProductIds: string[]
  }) => {
    setIsPro(summary.isPro)
    setTier(summary.isPro ? 'pro' : 'free')
    setActiveEntitlement(summary.activeEntitlement)
    setActiveProductIds(summary.activeProductIds)
  }

  const clearCustomerSummary = () => {
    setIsPro(false)
    setTier('free')
    setActiveEntitlement(null)
    setActiveProductIds([])
  }

  const refresh = async () => {
    if (!enabled) {
      setLoading(false)
      setPackages({ monthly: null, annual: null })
      clearCustomerSummary()
      return
    }

    setLoading(true)
    setError(null)

    try {
      await ensureRevenueCatConfigured(appUserId)

      const offerings = await getOfferings()
      const nextPackages = extractPackages(offerings)
      setPackages(nextPackages)

      const info = await getCustomerInfo()
      const summary = getCustomerInfoSummary(info, getRevenueCatEntitlementId())
      applyCustomerSummary(summary)
    } catch (e) {
      console.error('[entitlements] refresh error', e)
      setError(
        normalizeRevenueCatErrorMessage(
          e,
          'Erro ao carregar assinaturas. Tente novamente.',
        ),
      )
      setPackages({ monthly: null, annual: null })
      clearCustomerSummary()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUserId, enabled])

  useEffect(() => {
    if (!enabled) return

    let mounted = true

    ;(async () => {
      try {
        await ensureRevenueCatConfigured(appUserId)

        const listenerId = await addCustomerInfoUpdateListener(info => {
          if (!mounted) return
          const summary = getCustomerInfoSummary(
            info,
            getRevenueCatEntitlementId(),
          )
          applyCustomerSummary(summary)
        })

        listenerIdRef.current = listenerId
      } catch (e) {
        console.warn('[entitlements] listener init failed', e)
      }
    })()

    return () => {
      mounted = false
      if (listenerIdRef.current) {
        void removeCustomerInfoUpdateListener(listenerIdRef.current)
        listenerIdRef.current = null
      }
    }
  }, [appUserId, enabled])

  const purchase = async (kind: 'monthly' | 'annual') => {
    if (!enabled) {
      toast.error('Assinaturas indisponíveis neste ambiente.')
      return
    }

    const pkg = kind === 'monthly' ? packages.monthly : packages.annual
    if (!pkg) {
      toast.error('Plano indisponível. Tente abrir o paywall novamente.')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      await ensureRevenueCatConfigured(appUserId)

      const result = await purchasePackage(pkg)
      const info = result.customerInfo
      const summary = getCustomerInfoSummary(info, getRevenueCatEntitlementId())
      applyCustomerSummary(summary)

      if (summary.isPro) {
        toast.success('Assinatura ativada! ✅')
        closePaywall()
      } else {
        toast('Compra concluída. Atualizando status...')
      }
    } catch (e) {
      console.error('[entitlements] purchase error', e)
      const msg = normalizeRevenueCatErrorMessage(
        e,
        'Não foi possível concluir a compra.',
      )
      setError(msg)
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  const restore = async () => {
    if (!enabled) {
      toast.error('Restaurar indisponível neste ambiente.')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      await ensureRevenueCatConfigured(appUserId)

      const info = await restorePurchases()
      const summary = getCustomerInfoSummary(info, getRevenueCatEntitlementId())
      applyCustomerSummary(summary)

      if (summary.isPro) {
        toast.success('Compras restauradas ✅')
        closePaywall()
      } else {
        toast('Nenhuma assinatura ativa encontrada.')
      }
    } catch (e) {
      console.error('[entitlements] restore error', e)
      const msg = normalizeRevenueCatErrorMessage(
        e,
        'Erro ao restaurar compras.',
      )
      setError(msg)
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  const value: EntitlementsContextValue = {
    tier,
    isPro,
    loading,
    processing,
    error,
    activeEntitlement,
    activeProductIds,
    paywallOpen,
    openPaywall,
    closePaywall,
    packages,
    purchase,
    restore,
    refresh,
  }

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  )
}

export function useEntitlementsContext() {
  const ctx = useContext(EntitlementsContext)
  if (!ctx) {
    throw new Error('useEntitlementsContext must be used within provider')
  }
  return ctx
}