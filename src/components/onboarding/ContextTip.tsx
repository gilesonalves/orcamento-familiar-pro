type ContextTipProps = {
  message: string
  onDismiss: () => void | Promise<void>
}

export function ContextTip({ message, onDismiss }: ContextTipProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-50 sm:flex-row sm:items-start sm:justify-between">
      <p className="leading-6">{message}</p>
      <button
        type="button"
        onClick={() => {
          void onDismiss()
        }}
        className="w-fit rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
      >
        Entendi
      </button>
    </div>
  )
}
