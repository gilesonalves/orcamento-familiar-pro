import { useEffect, useMemo, useState } from 'react'
import type { DespesaVariavelInput, PerfilOrcamento } from '../context/BudgetContext'
import type { ParsedVoiceExpense } from '../utils/voiceExpenseParser'

type VoiceExpenseForm = {
  data: string
  valor: string
  categoria: string
  descricao: string
  formaPagamento: string
  essencial: boolean
}

type Props = {
  open: boolean
  initialData: ParsedVoiceExpense | null
  perfil?: PerfilOrcamento
  onClose: () => void
  onConfirm: (payload: DespesaVariavelInput) => Promise<boolean>
}

const formatDateInput = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const buildInitialForm = (data: ParsedVoiceExpense | null): VoiceExpenseForm => ({
  data: data?.data ?? formatDateInput(new Date()),
  valor: data ? String(data.valor).replace('.', ',') : '',
  categoria: data?.categoria ?? 'Outros',
  descricao: data?.descricao ?? '',
  formaPagamento: data?.formaPagamento ?? 'Outros',
  essencial: true,
})

export function VoiceExpenseConfirmModal({
  open,
  initialData,
  perfil = 'familiar',
  onClose,
  onConfirm,
}: Props) {
  const [form, setForm] = useState<VoiceExpenseForm>(() => buildInitialForm(null))
  const [error, setError] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const originalText = useMemo(() => initialData?.originalText ?? '', [initialData])

  useEffect(() => {
    if (!open) return
    setForm(buildInitialForm(initialData))
    setError('')
    setSaving(false)
  }, [open, initialData])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async () => {
    setError('')

    const normalizedValue = form.valor.replace(',', '.').trim()
    const valor = Number(normalizedValue)

    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    if (!form.categoria.trim()) {
      setError('Informe a categoria.')
      return
    }

    if (!form.descricao.trim()) {
      setError('Informe a descrição da despesa.')
      return
    }

    if (!form.formaPagamento.trim()) {
      setError('Informe a forma de pagamento.')
      return
    }

    setSaving(true)

    try {
      const payload: DespesaVariavelInput = {
        data: form.data,
        valor,
        categoria: form.categoria.trim(),
        descricao: form.descricao.trim(),
        formaPagamento: form.formaPagamento.trim(),
        essencial: form.essencial,
        perfil,
      }

      const saved = await onConfirm(payload)

      if (!saved) {
        setError('Não foi possível salvar a despesa por voz.')
      }
    } catch {
      setError('Não foi possível salvar a despesa por voz.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h4 className="text-sm font-semibold text-slate-100">Confirmar despesa por voz</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>

        <form className="space-y-4 px-4 py-4">
          {originalText && (
            <p className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-300">
              Você disse: "{originalText}"
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-100">
              Data
              <input
                type="date"
                required
                value={form.data}
                onChange={event => setForm({ ...form, data: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none"
              />
            </label>

            <label className="text-sm text-slate-100">
              Valor
              <input
                type="text"
                inputMode="decimal"
                required
                value={form.valor}
                onChange={event => setForm({ ...form, valor: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none"
              />
            </label>

            <label className="text-sm text-slate-100">
              Categoria
              <input
                type="text"
                required
                value={form.categoria}
                onChange={event => setForm({ ...form, categoria: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none"
              />
            </label>

            <label className="text-sm text-slate-100">
              Forma de pagamento
              <input
                type="text"
                required
                value={form.formaPagamento}
                onChange={event =>
                  setForm({ ...form, formaPagamento: event.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none"
              />
            </label>
          </div>

          <label className="text-sm text-slate-100">
            Descrição
            <input
              type="text"
              required
              value={form.descricao}
              onChange={event => setForm({ ...form, descricao: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-100">
            <input
              type="checkbox"
              checked={form.essencial}
              onChange={event => setForm({ ...form, essencial: event.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
            />
            Essencial?
          </label>

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-400"
            >
              {saving ? 'Salvando...' : 'Confirmar e salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
