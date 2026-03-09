type OnboardingChecklistItem = {
  actionLabel: string
  description: string
  done: boolean
  onClick: () => void | Promise<void>
  title: string
}

type OnboardingChecklistProps = {
  items: OnboardingChecklistItem[]
}

export function OnboardingChecklist({ items }: OnboardingChecklistProps) {
  const completedCount = items.filter(item => item.done).length

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm shadow-slate-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Primeiros passos
          </p>
          <h2 className="text-lg font-semibold text-white">
            Configure o essencial sem perder a visao do app
          </h2>
          <p className="text-sm text-slate-300">
            {completedCount}/{items.length} etapas concluidas
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100">
          Checklist rapido
        </span>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.title}
            className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  item.done ? 'bg-emerald-400' : 'bg-amber-300'
                }`}
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      item.done
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                        : 'border border-amber-400/20 bg-amber-400/10 text-amber-100'
                    }`}
                  >
                    {item.done ? 'Concluido' : 'Pendente'}
                  </span>
                </div>
                <p className="text-xs leading-5 text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void item.onClick()
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
            >
              {item.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
