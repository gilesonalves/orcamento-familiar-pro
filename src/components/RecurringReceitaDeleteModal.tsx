import { useEffect } from 'react'

type Props = {
  open: boolean
  processing?: boolean
  onClose: () => void
  onDeleteOnlyCurrent: () => void
  onStopRecurring: () => void
}

export function RecurringReceitaDeleteModal({
  open,
  processing = false,
  onClose,
  onDeleteOnlyCurrent,
  onStopRecurring,
}: Props) {
  useEffect(() => {
    if (!open || processing) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, processing, onClose])

  if (!open) return null

  const handleClose = () => {
    if (processing) return
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receita-recorrente-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h4
            id="receita-recorrente-modal-title"
            className="text-sm font-semibold text-slate-100"
          >
            Receita recorrente
          </h4>
          <button
            type="button"
            onClick={handleClose}
            disabled={processing}
            className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <p className="text-sm text-slate-300">
            Esta receita está configurada para se repetir nos próximos meses.
            Deseja apagar só este mês ou parar a recorrência?
          </p>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            "Só este mês" mantém a próxima réplica. "Parar recorrência" remove a
            ocorrência atual e interrompe as próximas.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={processing}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onDeleteOnlyCurrent}
              disabled={processing}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Só este mês
            </button>
            <button
              type="button"
              onClick={onStopRecurring}
              disabled={processing}
              className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-rose-500"
            >
              {processing ? 'Processando...' : 'Parar recorrência'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
