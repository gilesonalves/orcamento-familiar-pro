import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useBudget,
  type DespesaVariavel,
  type DespesaVariavelInput,
} from '../context/BudgetContext'
import { useEntitlements } from '../hooks/useEntitlements'

type Props = {
  onSave: (data: DespesaVariavelInput) => void
  onSaveMany?: (items: DespesaVariavelInput[]) => void
  editing?: DespesaVariavel | null
  onCancel?: () => void
  disabled?: boolean
}

type DespesaVariavelFormState = Omit<DespesaVariavelInput, 'valor'> & {
  valor: string
  parcelas: string
}

const defaultForm: DespesaVariavelFormState = {
  data: '',
  categoria: '',
  descricao: '',
  formaPagamento: '',
  valor: '',
  essencial: true,
  parcelas: '1',
}

const despesasVariaveisSugestoes = [
  'Supermercado / feira',
  'Padaria',
  'Refeições fora de casa',
  'Combustível',
  'Estacionamentos avulsos',
  'Pedágios',
  'Uber / 99 / táxi',
  'Cinema / shows / eventos',
  'Bares e restaurantes',
  'Viagens e passeios',
  'Aluguel de filme / pay-per-view',
  'Roupas e calçados',
  'Acessórios',
  'Cosméticos / maquiagem / perfumes',
  'Livros / games / eletrônicos pequenos',
  'Medicamentos',
  'Consultas particulares pontuais',
  'Exames esporádicos',
  'Terapia / psicólogo avulso',
  'Manutenção da casa',
  'Utensílios domésticos',
  'Móveis / decoração',
  'Produtos de limpeza',
  'Material escolar extra',
  'Passeios escolares',
  'Brinquedos',
  'Mesada / presentes',
  'Ração (pets)',
  'Pet shop / banho e tosa',
  'Veterinário',
  'Presentes (aniversário, datas especiais)',
  'Doações / ofertas',
  'Multas / taxas inesperadas',
  'Despesas emergenciais',
]

// opções fixas de forma de pagamento (label = valor salvo)
const paymentOptions = [
  'Cartão de crédito',
  'Cartão de débito',
  'Pix',
  'Dinheiro',
  'Boleto',
  'Transferência (TED/DOC)',
  'Outros',
]

const normalizePayment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const isCreditCardPayment = (value: string) => {
  // se vier do select, bate exatamente com o label
  if (value === 'Cartão de crédito') return true

  // fallback para dados antigos digitados à mão
  const normalized = normalizePayment(value)
  return (
    normalized.includes('cartao') &&
    normalized.includes('credito')
  )
}

const parseInputDate = (value: string) => {
  if (!value) return null
  const parts = value.split('-').map(Number)
  if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
    const [year, month, day] = parts
    return new Date(year, month - 1, day)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDateInput = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const addMonthsToDate = (dateString: string, offset: number) => {
  const date = parseInputDate(dateString)
  if (!date) return dateString
  const result = new Date(
    date.getFullYear(),
    date.getMonth() + offset,
    date.getDate(),
  )
  return formatDateInput(result)
}

export function DespesasVariaveisForm({
  onSave,
  onSaveMany,
  editing,
  onCancel,
  disabled,
}: Props) {
  const { trialActive } = useBudget()
  const { isPro } = useEntitlements()
  const [form, setForm] = useState<DespesaVariavelFormState>(defaultForm)
  const isDisabled = disabled ?? (!trialActive && !isPro)
  const fieldTitle = isDisabled ? 'Seu trial expirou' : undefined

  useEffect(() => {
    if (editing) {
      setForm({
        data: editing.data,
        categoria: editing.categoria,
        descricao: editing.descricao,
        formaPagamento: editing.formaPagamento,
        valor: String(editing.valor ?? ''),
        essencial: editing.essencial,
        parcelas: '1',
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
    const total = Number(form.valor) || 0
    const parcelas = Math.max(1, Math.floor(Number(form.parcelas) || 1))

    const payload: DespesaVariavelInput = {
      data: form.data,
      categoria: form.categoria,
      descricao: form.descricao,
      formaPagamento: form.formaPagamento,
      valor: total,
      essencial: form.essencial,
    }

    const shouldParcel =
      !editing && parcelas > 1 && isCreditCardPayment(form.formaPagamento)

    if (shouldParcel && onSaveMany) {
      const parcelaBase = Math.floor((total / parcelas) * 100) / 100
      const items: DespesaVariavelInput[] = Array.from(
        { length: parcelas },
        (_, index) => {
          const isLast = index === parcelas - 1
          const valorParcela = isLast
            ? Number(
                (total - parcelaBase * (parcelas - 1)).toFixed(2),
              )
            : parcelaBase

          return {
            ...payload,
            data: addMonthsToDate(form.data, index),
            descricao: `${form.descricao} (Parcela ${index + 1}/${parcelas})`,
            valor: valorParcela,
          }
        },
      )

      onSaveMany(items)
      setForm(defaultForm)
      return
    }

    onSave(payload)

    if (editing) {
      onCancel?.()
      return
    }

    setForm(defaultForm)
  }

  const showParcelasField =
    !editing && isCreditCardPayment(form.formaPagamento)

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
          Categoria
          <input
            type="text"
            required
            placeholder="Ex: Supermercado, Transporte..."
            value={form.categoria}
            onChange={e =>
              setForm({ ...form, categoria: e.target.value })
            }
            list="despesas-variaveis-sugestoes"
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="text-sm text-slate-100">
          Descrição
          <input
            type="text"
            required
            value={form.descricao}
            onChange={e =>
              setForm({ ...form, descricao: e.target.value })
            }
            list="despesas-variaveis-sugestoes"
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          <datalist id="despesas-variaveis-sugestoes">
            {despesasVariaveisSugestoes.map(item => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        {/* SELECT de forma de pagamento */}
        <label className="text-sm text-slate-100">
          Forma de pagamento
          <select
            required
            value={form.formaPagamento}
            onChange={e =>
              setForm({ ...form, formaPagamento: e.target.value })
            }
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Selecione...</option>
            {paymentOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
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
            onChange={e =>
              setForm({ ...form, valor: e.target.value })
            }
            readOnly={isDisabled}
            disabled={isDisabled}
            title={fieldTitle}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        {showParcelasField && (
          <label className="text-sm text-slate-100">
            Parcelas
            <input
              type="number"
              min={1}
              step={1}
              required
              value={form.parcelas}
              onChange={e =>
                setForm({ ...form, parcelas: e.target.value })
              }
              readOnly={isDisabled}
              disabled={isDisabled}
              title={fieldTitle}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-100">
          <input
            type="checkbox"
            checked={form.essencial}
            onChange={e =>
              setForm({ ...form, essencial: e.target.checked })
            }
            disabled={isDisabled}
            title={fieldTitle}
            className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
          Essencial?
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
