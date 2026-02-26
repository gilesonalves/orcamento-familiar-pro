// src/App.tsx
import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import {
  BudgetProvider,
  useBudget,
  type DespesaFixa,
  type DespesaVariavel,
  type Receita,
  type PerfilOrcamento,
} from './context/BudgetContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { EntitlementsProvider } from './contexts/EntitlementsContext'
import { useEntitlements } from './hooks/useEntitlements'
import { getAccess } from './services/access/access'
import { getQuota, remaining, resetIfNewMonth } from './services/quota/usageQuota'

import { MonthSelector } from './components/MonthSelector'
import { SummaryCards } from './components/SummaryCards'
import { SummaryYear } from './components/SummaryYear'
import { AuthWrapper } from './components/AuthWrapper'
import { AdminOnly } from './components/AdminOnly'
import { ReceitasForm } from './components/ReceitasForm'
import { ReceitasTable } from './components/ReceitasTable'
import { DespesasFixasForm } from './components/DespesasFixasForm'
import { DespesasFixasTable } from './components/DespesasFixasTable'
import { DespesasVariaveisForm } from './components/DespesasVariaveisForm'
import { DespesasVariaveisTable } from './components/DespesasVariaveisTable'
import { QuickExpenseModal } from './components/QuickExpenseModal'
import { TrialExpiredBanner } from './components/TrialExpiredBanner'
import { PaywallModal } from './components/PaywallModal'
import { PlanBadge } from './components/PlanBadge'
import { InvitesAdminPage } from './pages/admin/InvitesAdminPage'
import { UpdatePassword } from './pages/auth/UpdatePassword'
import { Settings } from './pages/Settings'
import { isSameMonthYear } from './utils/format'

const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const moveDateToMonthYear = (
  dateString: string,
  targetMonth: number,
  targetYear: number,
) => {
  const date = new Date(dateString)
  const day = Number.isNaN(date.getTime()) ? 1 : date.getDate()
  const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate()
  const clampedDay = Math.min(day, lastDayOfTarget)
  const result = new Date(targetYear, targetMonth, clampedDay)
  const yyyy = result.getFullYear()
  const mm = String(result.getMonth() + 1).padStart(2, '0')
  const dd = String(result.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const formatDateInput = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function Dashboard() {
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [perfil, setPerfil] = useState<PerfilOrcamento>('familiar')
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false)

  const {
    receitas,
    despesasFixas,
    despesasVariaveis,
    addReceita,
    updateReceita,
    deleteReceita,
    addDespesaFixa,
    updateDespesaFixa,
    deleteDespesaFixa,
    addDespesaVariavel,
    updateDespesaVariavel,
    deleteDespesaVariavel,
    trialActive,
  } = useBudget()
  const { userRole, roleLoading } = useAuth()
  const { isPro, openPaywall } = useEntitlements()
  const access = useMemo(
    () =>
      getAccess({
        isPro,
        userRole,
        trialActive,
      }),
    [isPro, userRole, trialActive],
  )
  const showAdminMenu = !roleLoading && userRole === 'admin'

  useEffect(() => {
    if (access.tier === 'free') {
      resetIfNewMonth()
    }
  }, [access.tier])

  const freeQuota = useMemo(() => {
    if (access.tier !== 'free' || access.monthlyLimit === 'unlimited') {
      return null
    }

    const quota = getQuota()
    const limit = access.monthlyLimit
    return {
      count: quota.count,
      limit,
      remaining: remaining(limit),
    }
  }, [access, receitas.length, despesasFixas.length, despesasVariaveis.length])

  const [editingReceita, setEditingReceita] = useState<Receita | null>(null)
  const [editingDespesaFixa, setEditingDespesaFixa] =
    useState<DespesaFixa | null>(null)
  const [editingDespesaVariavel, setEditingDespesaVariavel] =
    useState<DespesaVariavel | null>(null)

  const handleQuickExpenseSubmit = (data: {
    valor: number
    observacao: string
  }) => {
    void addDespesaVariavel({
      data: formatDateInput(new Date()),
      categoria: 'Despesa rápida',
      descricao: data.observacao,
      formaPagamento: 'Outros',
      valor: data.valor,
      essencial: false,
      perfil,
    })
  }

  const receitasFiltradas = useMemo(
    () =>
      receitas.filter(
        r =>
          r.perfil === perfil &&
          isSameMonthYear(r.data, selectedMonth, selectedYear),
      ),
    [receitas, selectedMonth, selectedYear, perfil],
  )

  const despesasFixasFiltradas = useMemo(
    () =>
      despesasFixas.filter(
        d =>
          d.perfil === perfil &&
          isSameMonthYear(d.dataVencimento, selectedMonth, selectedYear),
      ),
    [despesasFixas, selectedMonth, selectedYear, perfil],
  )

  const despesasVariaveisFiltradas = useMemo(
    () =>
      despesasVariaveis.filter(
        d =>
          d.perfil === perfil &&
          isSameMonthYear(d.data, selectedMonth, selectedYear),
      ),
    [despesasVariaveis, selectedMonth, selectedYear, perfil],
  )

  // Quando o mês selecionado não tem despesas fixas,
  // replica as recorrentes do mês anterior (no mesmo perfil)
  useEffect(() => {
    if (despesasFixasFiltradas.length > 0) return

    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear

    const recorrentesDoMesAnterior = despesasFixas.filter(
      d =>
        d.perfil === perfil &&
        d.recorrente &&
        isSameMonthYear(d.dataVencimento, prevMonth, prevYear),
    )

    if (recorrentesDoMesAnterior.length === 0) return

    recorrentesDoMesAnterior.forEach(d => {
      void addDespesaFixa({
        dataVencimento: moveDateToMonthYear(
          d.dataVencimento,
          selectedMonth,
          selectedYear,
        ),
        conta: d.conta,
        categoria: d.categoria,
        valorPrevisto: d.valorPrevisto,
        valorPago: 0,
        recorrente: true,
        perfil: d.perfil, // mantém o mesmo perfil
      })
    })
  }, [
    despesasFixas,
    despesasFixasFiltradas.length,
    selectedMonth,
    selectedYear,
    perfil,
    addDespesaFixa,
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Gestão de Orçamento
            </h1>
            <p className="text-sm text-slate-300">
              Organize receitas e despesas no mês.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {showAdminMenu && (
              <Link
                to="/admin/invites"
                className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Admin
              </Link>
            )}
            <PlanBadge />
            <MonthSelector
              month={selectedMonth}
              year={selectedYear}
              onChange={(m, y) => {
                setSelectedMonth(m)
                setSelectedYear(y)
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-8 sm:px-6">
        <TrialExpiredBanner />

        {freeQuota && (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-200">
                  Lançamentos do mês: {freeQuota.count}/{freeQuota.limit}
                </p>
                <p className="text-sm text-slate-300">
                  Restam {freeQuota.remaining}
                </p>
              </div>
              {freeQuota.remaining === 0 && (
                <button
                  type="button"
                  onClick={openPaywall}
                  className="w-full rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 sm:w-auto"
                >
                  Assinar Pro
                </button>
              )}
            </div>
          </section>
        )}

        {/* Toggle de perfil: familiar x pessoal */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-slate-900/80 p-1 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setPerfil('familiar')}
              className={`px-4 py-2 rounded-full font-medium transition ${
                perfil === 'familiar'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Orçamento familiar
            </button>
            <button
              type="button"
              onClick={() => setPerfil('pessoal')}
              className={`px-4 py-2 rounded-full font-medium transition ${
                perfil === 'pessoal'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Somente meu
            </button>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Resumo de {months[selectedMonth]} / {selectedYear}
          </h2>
          <SummaryCards
            month={selectedMonth}
            year={selectedYear}
            perfil={perfil}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Resumo anual {selectedYear}
          </h2>
          <SummaryYear year={selectedYear} perfil={perfil} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Receitas</h3>
          </div>

          {/* grid responsiva: 1 coluna no mobile, 2 colunas no md+ */}
          <div className="grid w-full gap-4 md:grid-cols-2 md:items-start">
            <ReceitasForm
              editing={editingReceita}
              onCancel={() => setEditingReceita(null)}
              disabled={false}
              onSave={data => {
                if (editingReceita) {
                  void updateReceita(editingReceita.id, {
                    ...data,
                    perfil: editingReceita.perfil, // mantém o perfil original
                  })
                  setEditingReceita(null)
                } else {
                  void addReceita({ ...data, perfil })
                }
              }}
            />
            <ReceitasTable
              data={receitasFiltradas}
              onEdit={setEditingReceita}
              onDelete={id => {
                void deleteReceita(id)
              }}
              disabled={false}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Despesas fixas</h3>
          </div>
          <div className="grid w-full gap-4 md:grid-cols-2 md:items-start">
            <DespesasFixasForm
              editing={editingDespesaFixa}
              onCancel={() => setEditingDespesaFixa(null)}
              disabled={false}
              onSave={data => {
                if (editingDespesaFixa) {
                  void updateDespesaFixa(editingDespesaFixa.id, {
                    ...data,
                    perfil: editingDespesaFixa.perfil,
                  })
                  setEditingDespesaFixa(null)
                } else {
                  void addDespesaFixa({ ...data, perfil })
                }
              }}
            />
            <DespesasFixasTable
              data={despesasFixasFiltradas}
              onEdit={setEditingDespesaFixa}
              onDelete={id => {
                void deleteDespesaFixa(id)
              }}
              disabled={false}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">
              Despesas variáveis
            </h3>
          </div>
          <div className="grid w-full gap-4 md:grid-cols-2 md:items-start">
            <DespesasVariaveisForm
              editing={editingDespesaVariavel}
              onCancel={() => setEditingDespesaVariavel(null)}
              disabled={false}
              onSave={data => {
                if (editingDespesaVariavel) {
                  void updateDespesaVariavel(editingDespesaVariavel.id, {
                    ...data,
                    perfil: editingDespesaVariavel.perfil,
                  })
                  setEditingDespesaVariavel(null)
                } else {
                  void addDespesaVariavel({ ...data, perfil })
                }
              }}
              onSaveMany={items => {
                // salva as parcelas no mesmo perfil da aba atual
                ;(async () => {
                  for (const item of items) {
                    await addDespesaVariavel({ ...item, perfil })
                  }
                })()
              }}
            />
            <DespesasVariaveisTable
              data={despesasVariaveisFiltradas}
              onEdit={setEditingDespesaVariavel}
              onDelete={id => {
                void deleteDespesaVariavel(id)
              }}
              disabled={false}
            />
          </div>
        </section>
      </main>

      <button
        type="button"
        onClick={() => {
          setQuickExpenseOpen(true)
        }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-emerald-500 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
        aria-label="Adicionar despesa rápida"
      >
        <span aria-hidden="true">+</span>
        <span className="hidden text-sm font-semibold sm:inline">
          Despesa rápida
        </span>
      </button>

      <QuickExpenseModal
        open={quickExpenseOpen}
        onClose={() => setQuickExpenseOpen(false)}
        onSubmit={handleQuickExpenseSubmit}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <EntitlementsProvider>
        <BudgetProvider>
          <BrowserRouter>
            <AuthWrapper>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Dashboard />} />
                <Route
                  path="/update-password"
                  element={<UpdatePassword />}
                />
                <Route
                  path="/admin/invites"
                  element={
                    <AdminOnly>
                      <InvitesAdminPage />
                    </AdminOnly>
                  }
                />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
              <PaywallModal />
              <Toaster position="top-center" />
            </AuthWrapper>
          </BrowserRouter>
        </BudgetProvider>
      </EntitlementsProvider>
    </AuthProvider>
  )
}
