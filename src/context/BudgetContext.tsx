// src/context/BudgetContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import { useEntitlements } from '../hooks/useEntitlements'
import { getAccess } from '../services/access/access'
import { canConsume, consume, resetIfNewMonth } from '../services/quota/usageQuota'
import { isTrialActive } from '../utils/trial'
import { useAuth } from './AuthContext'

export type PerfilOrcamento = 'familiar' | 'pessoal'

export type Receita = {
  id: string
  data: string
  fonte: string
  tipo: 'Fixa' | 'Variável'
  valor: number
  perfil: PerfilOrcamento
}

export type DespesaFixa = {
  id: string
  dataVencimento: string
  conta: string
  categoria: string
  valorPrevisto: number
  valorPago: number
  recorrente: boolean
  perfil: PerfilOrcamento
}

export type DespesaVariavel = {
  id: string
  data: string
  purchaseDate?: string
  categoria: string
  descricao: string
  formaPagamento: string
  installmentGroupId?: string
  installmentIndex?: number
  installmentTotal?: number
  valor: number
  essencial: boolean
  perfil: PerfilOrcamento
}

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | null

export type UserProfile = {
  id: string
  trialStartedAt: string | null
  subscriptionStatus: SubscriptionStatus
}

/**
 * Nos inputs o perfil é opcional.
 * Se não vier nada, assumimos "familiar" para manter compatibilidade.
 */
export type ReceitaInput = Omit<Receita, 'id' | 'perfil'> & {
  perfil?: PerfilOrcamento
}
export type DespesaFixaInput = Omit<DespesaFixa, 'id' | 'perfil'> & {
  perfil?: PerfilOrcamento
}
export type DespesaVariavelInput = Omit<
  DespesaVariavel,
  'id' | 'perfil'
> & { perfil?: PerfilOrcamento }

type BudgetState = {
  receitas: Receita[]
  despesasFixas: DespesaFixa[]
  despesasVariaveis: DespesaVariavel[]
}

type BudgetContextValue = BudgetState & {
  addReceita: (input: ReceitaInput) => Promise<void>
  updateReceita: (id: string, input: ReceitaInput) => Promise<void>
  deleteReceita: (id: string) => Promise<void>

  addDespesaFixa: (input: DespesaFixaInput) => Promise<void>
  updateDespesaFixa: (id: string, input: DespesaFixaInput) => Promise<void>
  deleteDespesaFixa: (id: string) => Promise<void>

  addDespesaVariavel: (input: DespesaVariavelInput) => Promise<void>
  updateDespesaVariavel: (
    id: string,
    input: DespesaVariavelInput,
  ) => Promise<void>
  deleteDespesaVariavel: (id: string) => Promise<void>

  profile: UserProfile | null
  trialActive: boolean
  initializeTrialIfNeeded: () => Promise<void>
}

type BudgetProviderProps = {
  children: ReactNode
}

const emptyState: BudgetState = {
  receitas: [],
  despesasFixas: [],
  despesasVariaveis: [],
}

const BudgetContext = createContext<BudgetContextValue | undefined>(undefined)

const parseNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseOptionalInteger = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  return Math.floor(parsed)
}

const formatDateInput = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const normalizeDateString = (value: unknown) => {
  if (!value) return ''
  if (value instanceof Date) return formatDateInput(value)
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : formatDateInput(date)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length >= 10) {
      const base = trimmed.slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/.test(base)) {
        return base
      }
    }
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? trimmed : formatDateInput(date)
  }
  return ''
}

const normalizeOptionalDateString = (value: unknown) => {
  const normalized = normalizeDateString(value)
  return normalized || undefined
}

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

const normalizeTimestamp = (value: unknown) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value === 'string') return value.trim() || null
  return null
}

type Row = Record<string, unknown>

const asPerfil = (value: unknown): PerfilOrcamento =>
  value === 'pessoal' ? 'pessoal' : 'familiar'

const asSubscriptionStatus = (value: unknown): SubscriptionStatus =>
  value === 'trial' || value === 'active' || value === 'expired'
    ? value
    : null

const mapReceitaRow = (row: Row | null): Receita => ({
  id: String(row?.id ?? ''),
  data: normalizeDateString(row?.data),
  fonte: String(row?.fonte ?? ''),
  tipo: row?.tipo === 'Fixa' ? 'Fixa' : 'Variável',
  valor: parseNumber(row?.valor),
  perfil: asPerfil(row?.perfil),
})

const mapDespesaFixaRow = (row: Row | null): DespesaFixa => ({
  id: String(row?.id ?? ''),
  dataVencimento: normalizeDateString(row?.data_vencimento),
  conta: String(row?.conta ?? ''),
  categoria: String(row?.categoria ?? ''),
  valorPrevisto: parseNumber(row?.valor_previsto),
  valorPago: parseNumber(row?.valor_pago),
  recorrente: Boolean(row?.recorrente),
  perfil: asPerfil(row?.perfil),
})

const mapDespesaVariavelRow = (row: Row | null): DespesaVariavel => ({
  id: String(row?.id ?? ''),
  data: normalizeDateString(row?.data),
  purchaseDate: normalizeOptionalDateString(row?.purchase_date),
  categoria: String(row?.categoria ?? ''),
  descricao: String(row?.descricao ?? ''),
  formaPagamento: String(row?.forma_pagamento ?? ''),
  installmentGroupId: normalizeOptionalString(row?.installment_group_id),
  installmentIndex: parseOptionalInteger(row?.installment_index),
  installmentTotal: parseOptionalInteger(row?.installment_total),
  valor: parseNumber(row?.valor),
  essencial: Boolean(row?.essencial),
  perfil: asPerfil(row?.perfil),
})

const mapProfileRow = (row: Row | null): UserProfile => ({
  id: String(row?.id ?? ''),
  trialStartedAt: normalizeTimestamp(row?.trial_started_at),
  subscriptionStatus: asSubscriptionStatus(row?.subscription_status),
})

const PROFILE_TABLE = 'profiles'

const ensureTrialProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar perfil', error)
    return null
  }

  if (!data) {
    console.error('Perfil nao encontrado para o usuario', userId)
    return null
  }

  const now = new Date().toISOString()

  if (!data.trial_started_at) {
    const updatePayload: Record<string, unknown> = {
      trial_started_at: now,
      subscription_status: 'trial',
    }

    const { data: updated, error: updateError } = await supabase
      .from(PROFILE_TABLE)
      .update(updatePayload)
      .eq('id', userId)
      .is('trial_started_at', null)
      .select('*')
      .maybeSingle()

    if (updateError) {
      console.error('Erro ao iniciar trial', updateError)
      return mapProfileRow(data)
    }

    if (updated) {
      return mapProfileRow(updated)
    }
  }

  return mapProfileRow(data)
}

const loadProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar perfil', error)
    return null
  }

  if (!data) {
    console.error('Perfil nao encontrado para o usuario', userId)
    return null
  }

  return mapProfileRow(data)
}

export const BudgetProvider = ({ children }: BudgetProviderProps) => {
  const { userRole } = useAuth()
  const { isPro } = useEntitlements()
  const [state, setState] = useState<BudgetState>(emptyState)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    let active = true

    const fetchData = async (uid: string) => {
      const [receitasRes, despesasFixasRes, despesasVariaveisRes] =
        await Promise.all([
          supabase
            .from('receitas')
            .select('*')
            .eq('user_id', uid)
            .order('data', { ascending: true }),
          supabase
            .from('despesas_fixas')
            .select('*')
            .eq('user_id', uid)
            .order('data_vencimento', { ascending: true }),
          supabase
            .from('despesas_variaveis')
            .select('*')
            .eq('user_id', uid)
            .order('data', { ascending: true }),
        ])

      if (receitasRes.error) {
        console.error('Erro ao carregar receitas', receitasRes.error)
      }
      if (despesasFixasRes.error) {
        console.error('Erro ao carregar despesas fixas', despesasFixasRes.error)
      }
      if (despesasVariaveisRes.error) {
        console.error(
          'Erro ao carregar despesas variaveis',
          despesasVariaveisRes.error,
        )
      }

      return {
        receitas: Array.isArray(receitasRes.data)
          ? receitasRes.data.map(mapReceitaRow)
          : [],
        despesasFixas: Array.isArray(despesasFixasRes.data)
          ? despesasFixasRes.data.map(mapDespesaFixaRow)
          : [],
        despesasVariaveis: Array.isArray(despesasVariaveisRes.data)
          ? despesasVariaveisRes.data.map(mapDespesaVariavelRow)
          : [],
      }
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data, error: userError } = await supabase.auth.getUser()
      if (!active) return

      const user = data?.user
      if (userError || !user) {
        if (userError) {
          console.error('Erro ao obter usuario', userError)
          setError(userError.message)
        }
        setUserId(null)
        setState(emptyState)
        setLoading(false)
        return
      }

      setUserId(user.id)
      const nextState = await fetchData(user.id)
      if (!active) return
      setState(nextState)
      setLoading(false)
    }

    load()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUserId(null)
          setState(emptyState)
          setLoading(false)
          return
        }

        setUserId(session.user.id)
        setLoading(true)
        fetchData(session.user.id)
          .then(nextState => {
            if (!active) return
            setState(nextState)
            setLoading(false)
          })
          .catch(fetchError => {
            if (!active) return
            console.error('Erro ao carregar dados', fetchError)
            setLoading(false)
          })
      },
    )

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    if (!userId) {
      setProfile(null)
      return () => {
        active = false
      }
    }

    const loadProfileState = async () => {
      const currentProfile = await loadProfile(userId)
      if (!active || !currentProfile) return
      if (currentProfile.trialStartedAt) {
        setProfile(currentProfile)
        return
      }

      const nextProfile = await ensureTrialProfile(userId)
      if (!active || !nextProfile) {
        setProfile(currentProfile)
        return
      }
      setProfile(nextProfile)
    }

    void loadProfileState()

    return () => {
      active = false
    }
  }, [userId])

  const value = useMemo<BudgetContextValue>(() => {
    if (error) {
      console.error('Erro no BudgetContext', error)
    }
    void loading

    const ensurePerfil = (perfil?: PerfilOrcamento): PerfilOrcamento =>
      perfil === 'pessoal' ? 'pessoal' : 'familiar'

    const trialIsActive = isTrialActive(profile?.trialStartedAt)
    const access = getAccess({
      isPro,
      userRole,
      trialActive: trialIsActive,
    })

    const ensureCreationAllowed = () => {
      if (!access.canCreate) return false
      if (access.monthlyLimit === 'unlimited') return true

      resetIfNewMonth()
      if (!canConsume(access.monthlyLimit)) {
        toast.error(
          'Você atingiu 15 lançamentos este mês. Assine o Pro para liberar ilimitado.',
        )
        return false
      }

      return true
    }

    const consumeCreationQuota = () => {
      if (access.monthlyLimit === 'unlimited') return
      consume()
    }

    const initializeTrialIfNeeded = async () => {
      if (!userId) return
      const nextProfile = await ensureTrialProfile(userId)
      if (nextProfile) {
        setProfile(nextProfile)
      }
    }

    const addReceita = async (input: ReceitaInput) => {
      if (!userId) return
      if (!ensureCreationAllowed()) {
        return
      }
      const perfil = ensurePerfil(input.perfil)
      const { data, error: insertError } = await supabase
        .from('receitas')
        .insert([
          {
            user_id: userId,
            data: input.data,
            fonte: input.fonte,
            tipo: input.tipo,
            valor: input.valor,
            perfil,
          },
        ])
        .select('*')
        .single()

      if (insertError) {
        console.error('Erro ao adicionar receita', insertError)
        return
      }

      if (data) {
        const newItem = mapReceitaRow(data)
        setState(prev => ({
          ...prev,
          receitas: [...prev.receitas, newItem],
        }))
        consumeCreationQuota()
      }
    }

    const updateReceita = async (id: string, input: ReceitaInput) => {
      if (!userId) return
      const perfil = ensurePerfil(input.perfil)
      const { data, error: updateError } = await supabase
        .from('receitas')
        .update({
          data: input.data,
          fonte: input.fonte,
          tipo: input.tipo,
          valor: input.valor,
          perfil,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single()

      if (updateError) {
        console.error('Erro ao atualizar receita', updateError)
        return
      }

      if (data) {
        const updated = mapReceitaRow(data)
        setState(prev => ({
          ...prev,
          receitas: prev.receitas.map(item =>
            item.id === id ? updated : item,
          ),
        }))
      }
    }

    const deleteReceita = async (id: string) => {
      if (!userId) return
      const { error: deleteError } = await supabase
        .from('receitas')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Erro ao remover receita', deleteError)
        return
      }

      setState(prev => ({
        ...prev,
        receitas: prev.receitas.filter(item => item.id !== id),
      }))
    }

    const addDespesaFixa = async (input: DespesaFixaInput) => {
      if (!userId) return
      if (!ensureCreationAllowed()) {
        return
      }
      const perfil = ensurePerfil(input.perfil)
      const { data, error: insertError } = await supabase
        .from('despesas_fixas')
        .insert([
          {
            user_id: userId,
            data_vencimento: input.dataVencimento,
            conta: input.conta,
            categoria: input.categoria,
            valor_previsto: input.valorPrevisto,
            valor_pago: input.valorPago,
            recorrente: input.recorrente,
            perfil,
          },
        ])
        .select('*')
        .single()

      if (insertError) {
        console.error('Erro ao adicionar despesa fixa', insertError)
        return
      }

      if (data) {
        const newItem = mapDespesaFixaRow(data)
        setState(prev => ({
          ...prev,
          despesasFixas: [...prev.despesasFixas, newItem],
        }))
        consumeCreationQuota()
      }
    }

    const updateDespesaFixa = async (id: string, input: DespesaFixaInput) => {
      if (!userId) return
      const perfil = ensurePerfil(input.perfil)
      const { data, error: updateError } = await supabase
        .from('despesas_fixas')
        .update({
          data_vencimento: input.dataVencimento,
          conta: input.conta,
          categoria: input.categoria,
          valor_previsto: input.valorPrevisto,
          valor_pago: input.valorPago,
          recorrente: input.recorrente,
          perfil,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single()

      if (updateError) {
        console.error('Erro ao atualizar despesa fixa', updateError)
        return
      }

      if (data) {
        const updated = mapDespesaFixaRow(data)
        setState(prev => ({
          ...prev,
          despesasFixas: prev.despesasFixas.map(item =>
            item.id === id ? updated : item,
          ),
        }))
      }
    }

    const deleteDespesaFixa = async (id: string) => {
      if (!userId) return
      const { error: deleteError } = await supabase
        .from('despesas_fixas')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Erro ao remover despesa fixa', deleteError)
        return
      }

      setState(prev => ({
        ...prev,
        despesasFixas: prev.despesasFixas.filter(item => item.id !== id),
      }))
    }

    const addDespesaVariavel = async (input: DespesaVariavelInput) => {
      if (!userId) return
      if (!ensureCreationAllowed()) {
        return
      }
      const perfil = ensurePerfil(input.perfil)
      const payload: Record<string, unknown> = {
        user_id: userId,
        data: input.data,
        categoria: input.categoria,
        descricao: input.descricao,
        forma_pagamento: input.formaPagamento,
        valor: input.valor,
        essencial: input.essencial,
        perfil,
      }

      if (input.purchaseDate !== undefined) {
        payload.purchase_date = input.purchaseDate
      }
      if (input.installmentGroupId !== undefined) {
        payload.installment_group_id = input.installmentGroupId
      }
      if (input.installmentIndex !== undefined) {
        payload.installment_index = input.installmentIndex
      }
      if (input.installmentTotal !== undefined) {
        payload.installment_total = input.installmentTotal
      }

      const { data, error: insertError } = await supabase
        .from('despesas_variaveis')
        .insert([payload])
        .select('*')
        .single()

      if (insertError) {
        console.error('Erro ao adicionar despesa variavel', insertError)
        return
      }

      if (data) {
        const newItem = mapDespesaVariavelRow(data)
        setState(prev => ({
          ...prev,
          despesasVariaveis: [...prev.despesasVariaveis, newItem],
        }))
        consumeCreationQuota()
      }
    }

    const updateDespesaVariavel = async (
      id: string,
      input: DespesaVariavelInput,
    ) => {
      if (!userId) return
      const perfil = ensurePerfil(input.perfil)
      const payload: Record<string, unknown> = {
        data: input.data,
        categoria: input.categoria,
        descricao: input.descricao,
        forma_pagamento: input.formaPagamento,
        valor: input.valor,
        essencial: input.essencial,
        perfil,
      }

      if (input.purchaseDate !== undefined) {
        payload.purchase_date = input.purchaseDate
      }
      if (input.installmentGroupId !== undefined) {
        payload.installment_group_id = input.installmentGroupId
      }
      if (input.installmentIndex !== undefined) {
        payload.installment_index = input.installmentIndex
      }
      if (input.installmentTotal !== undefined) {
        payload.installment_total = input.installmentTotal
      }

      const { data, error: updateError } = await supabase
        .from('despesas_variaveis')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single()

      if (updateError) {
        console.error('Erro ao atualizar despesa variavel', updateError)
        return
      }

      if (data) {
        const updated = mapDespesaVariavelRow(data)
        setState(prev => ({
          ...prev,
          despesasVariaveis: prev.despesasVariaveis.map(item =>
            item.id === id ? updated : item,
          ),
        }))
      }
    }

    const deleteDespesaVariavel = async (id: string) => {
      if (!userId) return
      const { error: deleteError } = await supabase
        .from('despesas_variaveis')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Erro ao remover despesa variavel', deleteError)
        return
      }

      setState(prev => ({
        ...prev,
        despesasVariaveis: prev.despesasVariaveis.filter(
          item => item.id !== id,
        ),
      }))
    }

    return {
      ...state,
      addReceita,
      updateReceita,
      deleteReceita,
      addDespesaFixa,
      updateDespesaFixa,
      deleteDespesaFixa,
      addDespesaVariavel,
      updateDespesaVariavel,
      deleteDespesaVariavel,
      profile,
      trialActive: trialIsActive,
      initializeTrialIfNeeded,
    }
  }, [state, userId, loading, error, profile, isPro, userRole])

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  )
}

export const useBudget = () => {
  const ctx = useContext(BudgetContext)
  if (!ctx) {
    throw new Error('useBudget deve ser usado dentro do BudgetProvider')
  }
  return ctx
}
