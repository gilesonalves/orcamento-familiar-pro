import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import toast from 'react-hot-toast'
import { useEntitlements } from '../hooks/useEntitlements'
import {
  useBudget,
  type DespesaVariavel,
  type DespesaVariavelInput,
  type PerfilOrcamento,
} from '../context/BudgetContext'

import { VoiceExpenseConfirmModal } from './VoiceExpenseConfirmModal'
import { parseVoiceExpenseCommand, type ParsedVoiceExpense } from '../utils/voiceExpenseParser'
import {
  getSpeechExpenseErrorMessage,
  startExpenseSpeechRecognition,
} from '../services/speechRecognition'
import { calculateVoiceConfidence } from '../utils/voiceExpenseParser'
import { getInstallmentDueDates } from '../utils/creditCardCycle'
import {
  DEFAULT_CREDIT_CARD_CLOSING_DAY,
  DEFAULT_CREDIT_CARD_DUE_DAY,
  loadCreditCardConfig,
  type CreditCardConfig,
} from '../utils/creditCardConfig'
type Props = {
  onSave: (data: DespesaVariavelInput) => Promise<boolean>
  onSaveMany?: (items: DespesaVariavelInput[]) => Promise<void>
  editing?: DespesaVariavel | null
  onCancel?: () => void
  disabled?: boolean
  perfil?: PerfilOrcamento
  onVoiceLauncherReady?: (launcher: (() => Promise<void>) | null) => void
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
  if (normalized.includes('debito')) return false
  if (normalized.includes('credito')) return true
  return normalized.includes('cartao')
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

const createInstallmentGroupId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const randomPart = Math.random().toString(36).slice(2, 10)
  return `installment_${Date.now()}_${randomPart}`
}

const splitInstallmentValues = (total: number, installments: number) => {
  const parcelaBase = Math.floor((total / installments) * 100) / 100

  return Array.from({ length: installments }, (_, index) => {
    const isLast = index === installments - 1
    return isLast
      ? Number((total - parcelaBase * (installments - 1)).toFixed(2))
      : parcelaBase
  })
}

export function DespesasVariaveisForm({
  onSave,
  onSaveMany,
  editing,
  onCancel,
  disabled,
  perfil = 'familiar',
  onVoiceLauncherReady,
}: Props) {
  const { trialActive } = useBudget()
  const { isPro } = useEntitlements()
  const [form, setForm] = useState<DespesaVariavelFormState>(defaultForm)
  const [voiceError, setVoiceError] = useState('')
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [voiceDraft, setVoiceDraft] = useState<ParsedVoiceExpense | null>(null)
  const [voiceToast, setVoiceToast] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [creditCardConfig, setCreditCardConfig] = useState<CreditCardConfig>({
    closingDay: DEFAULT_CREDIT_CARD_CLOSING_DAY,
    dueDay: DEFAULT_CREDIT_CARD_DUE_DAY,
  })
  const isDisabled = disabled ?? (!trialActive && !isPro)
  const isSubmitDisabled = isDisabled || isSaving
  const fieldTitle = isDisabled ? 'Seu trial expirou' : undefined

  useEffect(() => {
    let active = true

    const loadConfig = async () => {
      const config = await loadCreditCardConfig()
      if (!active) return
      setCreditCardConfig(config)
    }

    void loadConfig()

    return () => {
      active = false
    }
  }, [])

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

  useEffect(() => {
    if (!voiceToast) return
    const timeout = window.setTimeout(() => {
      setVoiceToast('')
    }, 2500)

    return () => window.clearTimeout(timeout)
  }, [voiceToast])

  const saveSingleExpense = async (payload: DespesaVariavelInput) => {
    const saved = await onSave(payload)
    return saved
  }

  const buildCreditCardInstallments = (
    payload: DespesaVariavelInput,
    installments: number,
  ): DespesaVariavelInput[] => {
    const purchaseDate = parseInputDate(payload.data) ?? new Date()
    const purchaseDateString = formatDateInput(purchaseDate)
    const totalInstallments = Math.max(1, Math.floor(installments))
    const dueDates = getInstallmentDueDates(
      purchaseDate,
      creditCardConfig.closingDay,
      creditCardConfig.dueDay,
      totalInstallments,
    )
    const installmentValues = splitInstallmentValues(payload.valor, totalInstallments)
    const installmentGroupId =
      totalInstallments > 1 ? createInstallmentGroupId() : undefined

    return dueDates.map((dueDate, index) => {
      const nextPayload: DespesaVariavelInput = {
        ...payload,
        data: formatDateInput(dueDate),
        purchaseDate: purchaseDateString,
        descricao:
          totalInstallments > 1
            ? `${payload.descricao} (${index + 1}/${totalInstallments})`
            : payload.descricao,
        valor: installmentValues[index],
      }

      if (installmentGroupId) {
        nextPayload.installmentGroupId = installmentGroupId
        nextPayload.installmentIndex = index + 1
        nextPayload.installmentTotal = totalInstallments
      }

      return nextPayload
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitDisabled) {
      return
    }
    setIsSaving(true)
    try {
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

      if (!editing && isCreditCardPayment(form.formaPagamento)) {
        const items = buildCreditCardInstallments(payload, parcelas)
        if (items.length > 1) {
          if (onSaveMany) {
            await onSaveMany(items)
          } else {
            for (const item of items) {
              const saved = await saveSingleExpense(item)
              if (!saved) {
                return
              }
            }
          }
          setForm(defaultForm)
          return
        }

        const saved = await saveSingleExpense(items[0])
        if (!saved) {
          return
        }

        setForm(defaultForm)
        return
      }

      const saved = await saveSingleExpense(payload)
      if (!saved) {
        return
      }

      if (editing) {
        onCancel?.()
        return
      }

      setForm(defaultForm)
    } catch {
      return
    } finally {
      setIsSaving(false)
    }
  }

  const handleVoiceCapture = useCallback(async () => {
    if (isDisabled || editing) {
      return
    }

    setVoiceError('')
    setVoiceLoading(true)

    try {
      const permission = await SpeechRecognition.requestPermissions()
      if (permission.speechRecognition !== 'granted') {
        toast.error('Ative o microfone nas permissoes do app para usar voz.')
        return
      }

      const transcript = await startExpenseSpeechRecognition()
      const parsed = parseVoiceExpenseCommand(transcript)

      if (!parsed) {
        setVoiceError(
          'Não consegui entender o valor e a descrição. Exemplo: "gastei 45 uber".',
        )
        return
      }

      // 🔥 aplica parcelas no form (caso detectado)
      if (parsed.parcelas) {
        setForm(prev => ({
          ...prev,
          parcelas: String(parsed.parcelas),
        }))
      }

      const confidence = calculateVoiceConfidence(parsed)

      // 🟢 Confiança alta → salva direto
      if (confidence >= 5) {
        const total = Number(parsed.valor) || 0
        const parcelas = parsed.parcelas ?? 1

        const paymentMethod = parsed.formaPagamento ?? ''
        const isCredito = isCreditCardPayment(paymentMethod)

        if (!editing && isCredito) {
          const items = buildCreditCardInstallments(
            {
              data: parsed.data ?? formatDateInput(new Date()),
              categoria: parsed.categoria,
              descricao: parsed.descricao,
              formaPagamento: paymentMethod,
              valor: total,
              essencial: true,
              perfil,
            },
            parcelas,
          )

          if (items.length > 1) {
            if (onSaveMany) {
              await onSaveMany(items)
            } else {
              for (const item of items) {
                const saved = await saveSingleExpense(item)
                if (!saved) {
                  return
                }
              }
            }
            toast.success('Despesa parcelada adicionada por voz ✅')
            return
          }

          const autoSaved = await saveSingleExpense(items[0])
          if (autoSaved) {
            toast.success('Despesa adicionada por voz ✅')
            return
          }
        }

        // caso não seja parcelado
        const payload: DespesaVariavelInput = {
          data: parsed.data ?? formatDateInput(new Date()),
          categoria: parsed.categoria,
          descricao: parsed.descricao,
          formaPagamento: parsed.formaPagamento ?? '',
          valor: parsed.valor,
          essencial: true,
          perfil,
        }

        const autoSaved = await saveSingleExpense(payload)

        if (autoSaved) {
          toast.success('Despesa adicionada por voz ✅')
          return
        }
      }

      // 🟡 Confiança média ou baixa → abre modal
      setVoiceDraft(parsed)
      setVoiceModalOpen(true)

    } catch (error) {
      setVoiceError(getSpeechExpenseErrorMessage(error))
    } finally {
      setVoiceLoading(false)
    }
  }, [
    buildCreditCardInstallments,
    editing,
    isDisabled,
    onSaveMany,
    perfil,
    saveSingleExpense,
  ])

  useEffect(() => {
    onVoiceLauncherReady?.(handleVoiceCapture)

    return () => {
      onVoiceLauncherReady?.(null)
    }
  }, [handleVoiceCapture, onVoiceLauncherReady])

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
        {!editing && (
          <button
            type="button"
            disabled={isDisabled || voiceLoading || isSaving}
            title={fieldTitle}
            onClick={handleVoiceCapture}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {voiceLoading ? 'Ouvindo...' : '🎙️ Lançar despesa por voz'}
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitDisabled}
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

      {voiceError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {voiceError}
        </div>
      )}

      <VoiceExpenseConfirmModal
        open={voiceModalOpen}
        initialData={voiceDraft}
        perfil={perfil}
        onClose={() => {
          setVoiceModalOpen(false)
          setVoiceDraft(null)
        }}
        onConfirm={async payload => {
          const parcelas = voiceDraft?.parcelas
            ? Math.max(1, Math.floor(Number(voiceDraft.parcelas)))
            : 1

          if (!editing && isCreditCardPayment(payload.formaPagamento)) {
            const items = buildCreditCardInstallments(payload, parcelas)

            if (items.length > 1) {
              if (onSaveMany) {
                await onSaveMany(items)
              } else {
                for (const item of items) {
                  const saved = await saveSingleExpense(item)
                  if (!saved) {
                    setVoiceToast('Não foi possível salvar a despesa por voz')
                    return false
                  }
                }
              }
              setVoiceModalOpen(false)
              setVoiceDraft(null)
              return true
            }

            const singleSaved = await saveSingleExpense(items[0])
            if (!singleSaved) {
              setVoiceToast('Não foi possível salvar a despesa por voz')
              return false
            }

            setVoiceModalOpen(false)
            setVoiceDraft(null)
            return true
          }

          const saved = await saveSingleExpense(payload)

          if (!saved) {
            setVoiceToast('Não foi possível salvar a despesa por voz')
            return false
          }

          setVoiceModalOpen(false)
          setVoiceDraft(null)
          return true
        }}
      />

      {voiceToast && (
        <div className="fixed bottom-4 right-4 z-[60] rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 shadow-lg">
          {voiceToast}
        </div>
      )}
    </form>
  )
}
