import { useMemo } from 'react'
import { useEntitlements } from '../hooks/useEntitlements'

const formatSavings = (monthly?: number, annual?: number) => {
  if (!monthly || !annual) return null
  const monthlyAnnual = monthly * 12
  if (monthlyAnnual <= 0 || annual <= 0) return null
  const savings = Math.round(((monthlyAnnual - annual) / monthlyAnnual) * 100)
  return savings > 0 ? savings : null
}

export function PaywallModal() {
  const {
    paywallOpen,
    closePaywall,
    isPro,
    loading,
    processing,
    error,
    packages,
    purchase,
    restore,
  } = useEntitlements()

  const monthly = packages.monthly
  const annual = packages.annual

  const savings = useMemo(() => {
    const monthlyPrice = monthly?.product?.price
    const annualPrice = annual?.product?.price
    if (typeof monthlyPrice !== 'number' || typeof annualPrice !== 'number') {
      return null
    }
    return formatSavings(monthlyPrice, annualPrice)
  }, [monthly, annual])

  if (!paywallOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
      onClick={closePaywall}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h4 className="text-sm font-semibold text-slate-100">Plano PRO</h4>
          <button
            type="button"
            onClick={closePaywall}
            className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {isPro ? (
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">
              PRO ativo. Obrigado por apoiar o app.
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">
                Desbloqueie recursos avancados
              </p>
              <p className="text-sm text-slate-300">
                Assine para continuar editando e acessar os extras do PRO.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    Mensal
                  </p>
                  <p className="text-xs text-slate-400">
                    {monthly?.product?.title || 'Assinatura mensal'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">
                    {monthly?.product?.priceString || 'Consultar'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={processing || loading || !monthly || isPro}
                onClick={() => purchase('monthly')}
                className="mt-3 w-full rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Assinar mensal
              </button>
            </div>

            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-50">
                    Anual
                  </p>
                  <p className="text-xs text-emerald-100/70">
                    {annual?.product?.title || 'Assinatura anual'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-50">
                    {annual?.product?.priceString || 'Consultar'}
                  </p>
                  {savings && (
                    <p className="text-[11px] text-emerald-100/70">
                      Economize {savings}%
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={processing || loading || !annual || isPro}
                onClick={() => purchase('annual')}
                className="mt-3 w-full rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Assinar anual
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={processing || loading}
            onClick={restore}
            className="w-full rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Restaurar compra
          </button>

          <p className="text-[11px] text-slate-400">
            Para gerenciar a assinatura, acesse a Play Store em "Assinaturas".
          </p>
        </div>
      </div>
    </div>
  )
}
