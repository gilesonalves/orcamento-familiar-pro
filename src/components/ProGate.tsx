import type { ReactNode } from 'react'
import { useEntitlements } from '../hooks/useEntitlements'
import type { ProFeature } from '../constants/proFeatures'

type ProGateProps = {
  children: ReactNode
  fallback?: ReactNode
  feature?: ProFeature
}

type PaywallCTAProps = {
  title?: string
  description?: string
  buttonLabel?: string
  compact?: boolean
  feature?: ProFeature
}

export function PaywallCTA({
  title = 'Desbloqueie o plano PRO',
  description = 'Assine para liberar recursos avançados do app.',
  buttonLabel = 'Virar PRO',
  compact = false,
  feature,
}: PaywallCTAProps) {
  const { openPaywall } = useEntitlements()

  return (
    <div
      data-pro-feature={feature}
      className={`rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-50 ${
        compact ? 'text-sm' : ''
      }`}
    >
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        <p className={compact ? 'text-sm font-semibold' : 'text-base font-semibold'}>
          {title}
        </p>
        <p className={compact ? 'text-xs text-emerald-100/80' : 'text-sm text-emerald-100/90'}>
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={openPaywall}
        className={`mt-3 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-emerald-300 ${
          compact ? '' : 'sm:text-sm'
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

export function ProGate({ children, fallback, feature }: ProGateProps) {
  const { isPro } = useEntitlements()

  if (isPro) return <>{children}</>

  return <>{fallback ?? <PaywallCTA feature={feature} />}</>
}
