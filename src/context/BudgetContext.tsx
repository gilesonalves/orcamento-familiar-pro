// src/context/BudgetContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabaseClient'
import { isTrialActive } from '../utils/trial'
import { useAccessGate } from '../hooks/useAccessGate'

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
  categoria: string
  descricao: string
  formaPagamento: string
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

export type ReceitaInput = Omit<Receita, 'id' | 'perfil'> & {
  perfil?: PerfilOrcamento
}
export type DespesaFixaInput = Omit<DespesaFixa, 'id' | 'perfil'> & {
  perfil?: PerfilOrcamento
}
export type DespesaVariavelInput = Omit<DespesaVariavel, 'id' | 'perfil'> & {
  perfil?: PerfilOrcamento
}

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

const LIMIT_SCOPE: 'global' | 'perfil' = 'perfil'

const logError = (message: string, error?: unknown) => {
  if (import.meta.env.DEV) {
    console.error(message, error)
  }
}

const parseNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeDateString = (value: unknown) => {
  if (!value) return ''
  const date = new Date(value as string)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const asPerfil = (value: unknown): PerfilOrcamento =>
  value === 'pessoal' ? 'pessoal' : 'familiar'

const mapDespesaVariavelRow = (row: any): DespesaVariavel => ({
  id: String(row?.id ?? ''),
  data: normalizeDateString(row?.data),
  categoria: String(row?.categoria ?? ''),
  descricao: String(row?.descricao ?? ''),
  formaPagamento: String(row?.forma_pagamento ?? ''),
  valor: parseNumber(row?.valor),
  essencial: Boolean(row?.essencial),
  perfil: asPerfil(row?.perfil),
})

export const BudgetProvider = ({ children }: BudgetProviderProps) => {
  const { hasProAccess } = useAccessGate()
  const [state, setState] = useState<BudgetState>(emptyState)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) return
      setUserId(user.id)
    }
    loadUser()
  }, [])

  const value = useMemo<BudgetContextValue>(() => {
    const ensurePerfil = (perfil?: PerfilOrcamento): PerfilOrcamento =>
      perfil === 'pessoal' ? 'pessoal' : 'familiar'

    const trialIsActive = isTrialActive(profile?.trialStartedAt)
    const canEdit = trialIsActive || hasProAccess

    const addDespesaVariavel = async (input: DespesaVariavelInput) => {
      if (!userId || !canEdit) return

      const perfil = ensurePerfil(input.perfil)

      if (!hasProAccess) {
        const now = new Date()
        const args = {
          p_year: now.getFullYear(),
          p_month: now.getMonth() + 1,
          p_perfil: LIMIT_SCOPE === 'perfil' ? perfil : null,
        }

        const { data, error } = await supabase.rpc(
          'can_add_manual_expense',
          args,
        )

        if (error) {
          logError('Erro RPC can_add_manual_expense', error)
          throw error
        }

        const row = Array.isArray(data) ? data[0] : data
        if (!row?.allowed) {
          throw new Error(row?.reason || 'Limite mensal atingido')
        }
      }

      const { data, error } = await supabase
        .from('despesas_variaveis')
        .insert([
          {
            user_id: userId,
            data: input.data,
            categoria: input.categoria,
            descricao: input.descricao,
            forma_pagamento: input.formaPagamento,
            valor: input.valor,
            essencial: input.essencial,
            perfil,
          },
        ])
        .select('*')
        .single()

      if (error) {
        logError('Erro ao inserir despesa variável', error)
        throw error
      }

      if (!hasProAccess) {
        const now = new Date()
        await supabase.rpc('consume_manual_expense', {
          p_year: now.getFullYear(),
          p_month: now.getMonth() + 1,
          p_perfil: LIMIT_SCOPE === 'perfil' ? perfil : null,
        })
      }

      if (data) {
        const newItem = mapDespesaVariavelRow(data)
        setState(prev => ({
          ...prev,
          despesasVariaveis: [...prev.despesasVariaveis, newItem],
        }))
      }
    }

    return {
      ...state,
      addDespesaVariavel,
      updateDespesaVariavel: async () => {},
      deleteDespesaVariavel: async () => {},
      addReceita: async () => {},
      updateReceita: async () => {},
      deleteReceita: async () => {},
      addDespesaFixa: async () => {},
      updateDespesaFixa: async () => {},
      deleteDespesaFixa: async () => {},
      profile,
      trialActive: trialIsActive,
      initializeTrialIfNeeded: async () => {},
    }
  }, [state, userId, profile, hasProAccess])

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export const useBudget = () => {
  const ctx = useContext(BudgetContext)
  if (!ctx) {
    throw new Error('useBudget deve ser usado dentro do BudgetProvider')
  }
  return ctx
}