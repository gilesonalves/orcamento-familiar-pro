import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { toast } from 'sonner'
import {
  useBudget,
  type DespesaVariavel,
  type DespesaVariavelInput,
  type PerfilOrcamento,
} from '../context/BudgetContext'
import { useAuth } from '../context/AuthContext'
import { VoiceExpenseConfirmModal } from './VoiceExpenseConfirmModal'
import { parseVoiceExpenseCommand, type ParsedVoiceExpense } from '../utils/voiceExpenseParser'
import {
  getSpeechExpenseErrorMessage,
  startExpenseSpeechRecognition,
} from '../services/speechRecognition'
import { calculateVoiceConfidence } from '../utils/voiceExpenseParser'
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
  perfil = 'familiar',
  onVoiceLauncherReady,
}: Props) {
  const { trialActive } = useBudget()
  const { isPro } = useAuth()
  const [form, setForm] = useState<DespesaVariavelFormState>(defaultForm)
  const [voiceError, setVoiceError] = useState('')
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [voiceDraft, setVoiceDraft] = useState<ParsedVoiceExpense | null>(null)
  const [voiceToast, setVoiceToast] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isDisabled = disabled ?? (!trialActive && !isPro)
  const isSubmitDisabled = isDisabled || isSaving
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

        await onSaveMany(items)
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

        const isCredito =
          parsed.formaPagamento &&
          normalizePayment(parsed.formaPagamento).includes('credito')

        const shouldParcel =
          !editing && parcelas > 1 && isCredito

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
                data: addMonthsToDate(
                  parsed.data ?? formatDateInput(new Date()),
                  index
                ),
                categoria: parsed.categoria,
                descricao: `${parsed.descricao} (Parcela ${index + 1}/${parcelas})`,
                formaPagamento: parsed.formaPagamento ?? '',
                valor: valorParcela,
                essencial: true,
                perfil,
              }
            },
          )

          await onSaveMany(items)
          toast.success('Despesa parcelada adicionada por voz ✅')
          return
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
  }, [editing, isDisabled, perfil])

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
          const total = payload.valor
          const parcelas = voiceDraft?.parcelas ? Math.max(1, Math.floor(Number(voiceDraft.parcelas))) : 1

          const shouldParcel =
            !editing &&
            parcelas > 1 &&
            normalizePayment(payload.formaPagamento).includes('credito')

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
                  data: addMonthsToDate(payload.data, index),
                  descricao: `${payload.descricao} (Parcela ${index + 1}/${parcelas})`,
                  valor: valorParcela,
                }
              },
            )

            await onSaveMany(items)

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
