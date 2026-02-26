import { Link } from 'react-router-dom'
import { useEntitlements } from '../hooks/useEntitlements'

type PlanBadgeProps = {
  manageTo?: string
}

export function PlanBadge({ manageTo = '/settings' }: PlanBadgeProps) {
  const { loading, isPro, error, activeEntitlement, activeProductIds } =
    useEntitlements()

  const label = loading ? 'Plano: ...' : `Plano atual: ${isPro ? 'PRO' : 'FREE'}`
  const badgeClassName = loading
    ? 'border-slate-600 bg-slate-800/70 text-slate-300'
    : isPro
      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
      : 'border-slate-600 bg-slate-800/70 text-slate-200'

  const debugParts = [activeEntitlement ?? '', ...activeProductIds].filter(
    part => part.length > 0,
  )
  const debugValue = debugParts.join(', ')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeClassName}`}
        title={loading ? 'Verificando assinatura' : undefined}
      >
        {label}
      </span>
      <Link
        to={manageTo}
        className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
      >
        Gerenciar
      </Link>
      {error ? (
        <span
          aria-label="Erro discreto de assinatura"
          title="Nao foi possivel atualizar assinatura agora"
          className="text-xs text-slate-500"
        >
          !
        </span>
      ) : null}
      {import.meta.env.DEV && debugValue ? (
        <span
          className="max-w-[220px] truncate text-[10px] text-slate-400"
          title={debugValue}
        >
          {debugValue}
        </span>
      ) : null}
    </div>
  )
}
