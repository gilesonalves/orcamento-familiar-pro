import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useBudget,
  type DespesaFixa,
  type DespesaFixaInput,
} from '../context/BudgetContext'
import { useEntitlements } from '../hooks/useEntitlements'

type Props = {
  onSave: (data: DespesaFixaInput) => void
  editing?: DespesaFixa | null
  onCancel?: () => void
  disabled?: boolean
}

type DespesaFixaFormState = Omit<DespesaFixaInput, 'valorPrevisto' | 'valorPago'> & {
  valorPrevisto: string
  valorPago: string
}

const defaultForm: DespesaFixaFormState = {
  dataVencimento: '',
  conta: '',
  categoria: '',
  valorPrevisto: '',
  valorPago: '',
  recorrente: false,
}

const despesasFixasSugestoes = [
  'Aluguel',
  'Prestação do imóvel / financiamento',
  'Condomínio',
  'IPTU (rateado)',
  'Seguro residencial',
  'Energia elétrica',
  'Água / esgoto',
  'Gás encanado',
  'Internet banda larga',
  'Telefone fixo',
  'Coleta de lixo',
  'Parcela do carro / moto',
  'Seguro do veículo',
  'IPVA (rateado)',
  'Estacionamento mensal',
  'Passe de transporte mensal',
  'Mensalidade escolar',
  'Faculdade / pós / curso técnico',
  'Curso de idiomas',
  'Curso preparatório',
  'Plano de saúde',
  'Plano odontológico',
  'Seguro de vida',
  'Parcelas de empréstimo pessoal',
  'Parcelas de consórcio / financiamento',
  'Parcelas de cartão de crédito',
  'Streaming de vídeo',
  'Streaming de música',
  'Assinatura de software',
  'Academia / plano fitness',
  'Clube / associação / sindicato',
  'Serviços de nuvem (Google One, iCloud, etc.)',
]

export function DespesasFixasForm({
  onSave,
  editing,
  onCancel,
  disabled,
}: Props) {
  const { trialActive } = useBudget()
  const { isPro } = useEntitlements()
  const [form, setForm] = useState<DespesaFixaFormState>(defaultForm)
  const isDisabled = disabled ?? (!trialActive && !isPro)
  const fieldTitle = isDisabled ? 'Seu trial expirou' : undefined

  useEffect(() => {
    if (editing) {
      setForm({
        dataVencimento: editing.dataVencimento,
        conta: editing.conta,
        categoria: editing.categoria,
        valorPrevisto: String(editing.valorPrevisto ?? ''),
        valorPago: String(editing.valorPago ?? ''),
        recorrente: editing.recorrente,
      })
    } else {
      setForm(defaultForm)
    }
  }, [editing])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (isDisabled) {
      return
    }
    onSave({
      ...form,
      valorPrevisto: Number(form.valorPrevisto) || 0,
      valorPago: Number(form.valorPago) || 0,
    })
    if (editing) {
      onCancel?.()
    } else {
      setForm(defaultForm)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-slate-900/30"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-100">
          Vencimento
          <input
            type="date"
            required
            value={form.dataVencimento}
            onChange={e =>
              setForm({ ...form, dataVencimento: e.target.value })
            }
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label className="text-sm text-slate-100">
          Conta
          <input
            type="text"
            required
            placeholder="Aluguel, Luz, Internet..."
            value={form.conta}
            onChange={e => setForm({ ...form, conta: e.target.value })}
            list="despesas-fixas-sugestoes"
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label className="text-sm text-slate-100">
          Categoria
          <input
            type="text"
            value={form.categoria}
            onChange={e => setForm({ ...form, categoria: e.target.value })}
            placeholder="Moradia, contas, etc."
            list="despesas-fixas-sugestoes"
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <datalist id="despesas-fixas-sugestoes">
            {despesasFixasSugestoes.map(item => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>
        <label className="text-sm text-slate-100">
          Valor previsto
          <input
            type="number"
            min={0}
            step="0.01"
            required
            placeholder="0"
            value={form.valorPrevisto}
            onChange={e => setForm({ ...form, valorPrevisto: e.target.value })}
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label className="text-sm text-slate-100 md:col-span-2">
          Valor pago
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={form.valorPago}
            onChange={e => setForm({ ...form, valorPago: e.target.value })}
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-100 md:col-span-2">
          <input
            type="checkbox"
            checked={form.recorrente}
            onChange={e => setForm({ ...form, recorrente: e.target.checked })}
            disabled={isDisabled}
            title={fieldTitle}
            className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
          Repetir automaticamente nos próximos meses
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isDisabled}
          title={isDisabled ? 'Seu trial expirou' : undefined}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-emerald-500"
        >
          {editing ? 'Salvar' : 'Adicionar'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
