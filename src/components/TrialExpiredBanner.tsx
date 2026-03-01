import { useBudget } from '../context/BudgetContext'
import { useEntitlements } from '../hooks/useEntitlements'

export function TrialExpiredBanner() {
  const { trialActive } = useBudget()
  const { isPro, openPaywall } = useEntitlements()

  if (trialActive || isPro) return null

  return (
    <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-amber-100 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Aviso</p>
          <p className="text-sm text-amber-100/90">
            Seu periodo de teste terminou. No plano Free, você pode criar até
            15 lançamentos por mês.
          </p>
          <p className="text-xs text-amber-100/70">
            Assine o Pro para liberar lançamentos ilimitados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            openPaywall()
          }}
          className="w-full rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 sm:w-auto"
        >
          Assinar agora
        </button>
      </div>
    </section>
  )
}
