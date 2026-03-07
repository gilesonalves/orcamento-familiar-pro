import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useBudget,
  type Receita,
  type ReceitaInput,
} from '../context/BudgetContext'
import { useEntitlements } from '../hooks/useEntitlements'

type Props = {
  onSave: (data: ReceitaInput) => void
  editing?: Receita | null
  onCancel?: () => void
  disabled?: boolean
}

type ReceitaFormState = Omit<ReceitaInput, 'valor'> & { valor: string }

const defaultForm: ReceitaFormState = {
  data: '',
  fonte: '',
  tipo: 'Fixa',
  valor: '',
  recorrente: false,
}

const receitaSugestoes = [
  'Salário CLT',
  '13º salário',
  'Férias + 1/3',
  'Horas extras',
  'Adicionais (noturno, periculosidade, insalubridade)',
  'Comissões / bônus por meta',
  'Bicos / freelas',
  'Serviços autônomos',
  'Venda de produtos',
  'Diárias de trabalho informal',
  'Dividendos de ações',
  'Proventos de FIIs',
  'Juros de renda fixa (CDB, Tesouro, etc.)',
  'Rendimentos de poupança',
  'Juros sobre capital próprio',
  'Aluguel de imóvel',
  'Aluguel de sala comercial / ponto',
  'Aluguel de veículo / equipamento',
  'Aposentadoria / INSS',
  'Pensão alimentícia recebida',
  'Benefícios do governo',
  'Bolsa de estudos / pesquisa',
  'Restituição de imposto de renda',
  'Cashback recebido',
  'Prêmios / sorteios',
  'Venda de bens (carro, celular, móveis, etc.)',
  'Reembolso de empresa (viagens, combustível, etc.)',
]

export function ReceitasForm({ onSave, editing, onCancel, disabled }: Props) {
  const { trialActive } = useBudget()
  const { isPro } = useEntitlements()
  const [form, setForm] = useState<ReceitaFormState>(defaultForm)
  const isDisabled = disabled ?? (!trialActive && !isPro)
  const fieldTitle = isDisabled ? 'Seu trial expirou' : undefined

  useEffect(() => {
    if (editing) {
      setForm({
        data: editing.data,
        fonte: editing.fonte,
        tipo: editing.tipo,
        valor: String(editing.valor ?? ''),
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
    onSave({ ...form, valor: Number(form.valor) || 0 })
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
          Data
          <input
            type="date"
            required
            value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })}
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label className="text-sm text-slate-100">
          Fonte
          <input
            type="text"
            required
            placeholder="Salário, freelance..."
            value={form.fonte}
            onChange={e => setForm({ ...form, fonte: e.target.value })}
            list="receita-sugestoes"
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <datalist id="receita-sugestoes">
            {receitaSugestoes.map(item => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>
        <label className="text-sm text-slate-100">
          Tipo
          <select
            value={form.tipo}
            onChange={e =>
              setForm({ ...form, tipo: e.target.value as ReceitaInput['tipo'] })
            }
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="Fixa">Fixa</option>
            <option value="Variável">Variável</option>
          </select>
        </label>
        <label className="text-sm text-slate-100">
          Valor
          <input
            type="number"
            min={0}
            step="0.01"
            required
            placeholder="0"
            value={form.valor}
            onChange={e => setForm({ ...form, valor: e.target.value })}
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
        {form.recorrente && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 md:col-span-2">
            Esta receita será repetida automaticamente nos próximos meses.
          </div>
        )}
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
