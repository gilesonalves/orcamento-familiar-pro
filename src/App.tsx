// src/App.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'
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
import { isNativeApp } from './lib/platform'
import { Preferences } from '@capacitor/preferences'
import DebugBilling from "./pages/DebugBilling"
import { toast } from 'sonner'
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
import { TrialExpiredBanner } from './components/TrialExpiredBanner'
import { PaywallModal } from './components/PaywallModal'
import {
  SectionAccordion,
  type SectionAccordionItem,
} from './components/SectionAccordion'
import { InvitesAdminPage } from './pages/admin/InvitesAdminPage'
import { UpdatePasswordPage } from './pages/auth/UpdatePasswordPage'
import { Settings } from './pages/Settings'
import { formatCurrency, isSameMonthYear, isSameYear } from './utils/format'
import { humanizeBillingError } from './utils/billingErrors'
import { useLongPress } from './hooks/useLongPress'
import { useAccessGate } from './hooks/useAccessGate'


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

const RECOVERY_PENDING_KEY = 'recovery_pending'

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

function Dashboard() {
  const VOICE_HINT_KEY = 'voice_fab_hint_seen'
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [perfil, setPerfil] = useState<PerfilOrcamento>('familiar')
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const [lastSectionUsed, setLastSectionUsed] = useState<string>(
    'despesas-variaveis',
  )
  const sectionContentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [voiceLauncher, setVoiceLauncher] = useState<(() => Promise<void>) | null>(
    null,
  )
  const [pendingVoiceFromFab, setPendingVoiceFromFab] = useState(false)
  const [showVoiceHint, setShowVoiceHint] = useState(false)
  const [showAccessRestrictedToast, setShowAccessRestrictedToast] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

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
  const { hasProAccess, isLoadingAccess } = useAccessGate()
  const canEdit = isLoadingAccess || hasProAccess || trialActive
  const showAdminMenu = !roleLoading && userRole === 'admin'

  const [editingReceita, setEditingReceita] = useState<Receita | null>(null)
  const [editingDespesaFixa, setEditingDespesaFixa] =
    useState<DespesaFixa | null>(null)
  const [editingDespesaVariavel, setEditingDespesaVariavel] =
    useState<DespesaVariavel | null>(null)

  const handleEditReceita = (item: Receita) => {
    setEditingReceita(item)
    openSectionAndFocus('receitas')
  }

  const handleEditDespesaFixa = (item: DespesaFixa) => {
    setEditingDespesaFixa(item)
    openSectionAndFocus('despesas-fixas')
  }

  const handleEditDespesaVariavel = (item: DespesaVariavel) => {
    setEditingDespesaVariavel(item)
    openSectionAndFocus('despesas-variaveis')
  }

  useEffect(() => {
    let active = true
    let timeout: number | null = null

    const loadVoiceHintState = async () => {
      try {
        const isNative = isNativeApp()
        let seenValue: string | null = null

        if (isNative) {
          const result = await Preferences.get({ key: VOICE_HINT_KEY })
          seenValue = result.value
        } else if (typeof window !== 'undefined') {
          seenValue = window.localStorage.getItem(VOICE_HINT_KEY)
        }

        if (!active || seenValue === '1') return

        setShowVoiceHint(true)

        if (isNative) {
          await Preferences.set({ key: VOICE_HINT_KEY, value: '1' })
        } else if (typeof window !== 'undefined') {
          window.localStorage.setItem(VOICE_HINT_KEY, '1')
        }

        timeout = window.setTimeout(() => {
          if (!active) return
          setShowVoiceHint(false)
        }, 2800)
      } catch (error) {
        if (!active) return

        if (typeof window !== 'undefined') {
          const seen = window.localStorage.getItem(VOICE_HINT_KEY)
          if (seen === '1') return
          setShowVoiceHint(true)
          window.localStorage.setItem(VOICE_HINT_KEY, '1')
          timeout = window.setTimeout(() => {
            if (!active) return
            setShowVoiceHint(false)
          }, 2800)
        }

        console.error('Falha ao carregar hint de voz', error)
      }
    }

    void loadVoiceHintState()

    return () => {
      active = false
      if (timeout) {
        window.clearTimeout(timeout)
      }
    }
  }, [])

  useEffect(() => {
    const restricted = (location.state as { accessRestricted?: boolean } | null)
      ?.accessRestricted

    if (!restricted) return

    setShowAccessRestrictedToast(true)

    const timeout = window.setTimeout(() => {
      setShowAccessRestrictedToast(false)
    }, 2600)

    navigate(location.pathname, { replace: true, state: null })

    return () => window.clearTimeout(timeout)
  }, [location.pathname, location.state, navigate])

  const focusFirstInputInSection = (sectionId: string) => {
    const sectionRoot = sectionContentRefs.current[sectionId]
    if (!sectionRoot) return

    const firstField = sectionRoot.querySelector<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
    )

    if (!firstField) return
    firstField.focus()

    if (typeof (firstField as HTMLInputElement).select === 'function') {
      ; (firstField as HTMLInputElement).select()
    }
  }

  const openSectionAndFocus = (sectionId: string) => {
    setOpenSectionId(sectionId)
    setLastSectionUsed(sectionId)
    requestAnimationFrame(() => {
      focusFirstInputInSection(sectionId)
    })
  }

  const handleFabShortPress = () => {
    if (!canEdit) return
    const targetSection = openSectionId ?? lastSectionUsed
    openSectionAndFocus(targetSection)
  }

  const handleFabLongPress = () => {
    if (!canEdit) return

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20)
    }

    setEditingDespesaVariavel(null)
    setPendingVoiceFromFab(true)
    setOpenSectionId('despesas-variaveis')
    setLastSectionUsed('despesas-variaveis')
  }

  useEffect(() => {
    if (!pendingVoiceFromFab) return
    if (openSectionId !== 'despesas-variaveis') return
    if (!voiceLauncher) return

    setPendingVoiceFromFab(false)
    requestAnimationFrame(() => {
      void voiceLauncher()
    })
  }, [openSectionId, pendingVoiceFromFab, voiceLauncher])

  const fabLongPressHandlers = useLongPress({
    onLongPress: handleFabLongPress,
    onClick: handleFabShortPress,
    ms: 520,
  })

  const fabTitle = !canEdit ? 'Seu trial expirou' : 'Segure para voz'

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

  const receitasTotal = useMemo(
    () => receitasFiltradas.reduce((acc, item) => acc + (item.valor || 0), 0),
    [receitasFiltradas],
  )

  const despesasFixasTotal = useMemo(
    () =>
      despesasFixasFiltradas.reduce(
        (acc, item) => acc + (item.valorPrevisto || 0),
        0,
      ),
    [despesasFixasFiltradas],
  )

  const despesasVariaveisTotal = useMemo(
    () =>
      despesasVariaveisFiltradas.reduce((acc, item) => acc + (item.valor || 0), 0),
    [despesasVariaveisFiltradas],
  )

  const receitasAnoTotal = useMemo(
    () =>
      receitas
        .filter(
          item => item.perfil === perfil && isSameYear(item.data, selectedYear),
        )
        .reduce((acc, item) => acc + (item.valor || 0), 0),
    [receitas, perfil, selectedYear],
  )

  const despesasFixasAnoTotal = useMemo(
    () =>
      despesasFixas
        .filter(
          item =>
            item.perfil === perfil &&
            isSameYear(item.dataVencimento, selectedYear),
        )
        .reduce((acc, item) => acc + (item.valorPrevisto || 0), 0),
    [despesasFixas, perfil, selectedYear],
  )

  const despesasVariaveisAnoTotal = useMemo(
    () =>
      despesasVariaveis
        .filter(
          item => item.perfil === perfil && isSameYear(item.data, selectedYear),
        )
        .reduce((acc, item) => acc + (item.valor || 0), 0),
    [despesasVariaveis, perfil, selectedYear],
  )

  const saldoAno =
    receitasAnoTotal - (despesasFixasAnoTotal + despesasVariaveisAnoTotal)

  const annualAccordionSections = useMemo<SectionAccordionItem[]>(
    () => [
      {
        id: 'resumo-anual',
        title: `Resumo anual ${selectedYear}`,
        summary: `Saldo ${formatCurrency(saldoAno)}`,
        content: <SummaryYear year={selectedYear} perfil={perfil} />,
      },
    ],
    [selectedYear, saldoAno, perfil],
  )

  const accordionSections = useMemo<SectionAccordionItem[]>(
    () => [
      {
        id: 'receitas',
        title: 'Receitas',
        summary: `${formatCurrency(receitasTotal)} • ${receitasFiltradas.length} lançamentos`,
        content: (
          <div
            ref={element => {
              sectionContentRefs.current.receitas = element
            }}
            className="grid w-full gap-4 md:grid-cols-2 md:items-start"
          >
            <ReceitasForm
              editing={editingReceita}
              onCancel={() => setEditingReceita(null)}
              disabled={!canEdit}
              onSave={data => {
                if (editingReceita) {
                  void updateReceita(editingReceita.id, {
                    ...data,
                    perfil: editingReceita.perfil,
                  })
                  setEditingReceita(null)
                } else {
                  void addReceita({ ...data, perfil })
                }
              }}
            />
            <ReceitasTable
              data={receitasFiltradas}
              onEdit={handleEditReceita}
              onDelete={id => {
                void deleteReceita(id)
              }}
              disabled={!canEdit}
            />
          </div>
        ),
      },
      {
        id: 'despesas-fixas',
        title: 'Despesas fixas',
        summary: `${formatCurrency(despesasFixasTotal)} • ${despesasFixasFiltradas.length} lançamentos`,
        content: (
          <div
            ref={element => {
              sectionContentRefs.current['despesas-fixas'] = element
            }}
            className="grid w-full gap-4 md:grid-cols-2 md:items-start"
          >
            <DespesasFixasForm
              editing={editingDespesaFixa}
              onCancel={() => setEditingDespesaFixa(null)}
              disabled={!canEdit}
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
              onEdit={handleEditDespesaFixa}
              onDelete={id => {
                void deleteDespesaFixa(id)
              }}
              disabled={!canEdit}
            />
          </div>
        ),
      },
      {
        id: 'despesas-variaveis',
        title: 'Despesas variáveis',
        summary: `${formatCurrency(despesasVariaveisTotal)} • ${despesasVariaveisFiltradas.length} lançamentos`,
        content: (
          <div
            ref={element => {
              sectionContentRefs.current['despesas-variaveis'] = element
            }}
            className="grid w-full gap-4 md:grid-cols-2 md:items-start"
          >
            <DespesasVariaveisForm
              editing={editingDespesaVariavel}
              perfil={perfil}
              onCancel={() => setEditingDespesaVariavel(null)}
              disabled={!canEdit}
              onVoiceLauncherReady={setVoiceLauncher}
              onSave={async data => {
                try {
                  if (editingDespesaVariavel) {
                    await updateDespesaVariavel(editingDespesaVariavel.id, {
                      ...data,
                      perfil: editingDespesaVariavel.perfil,
                    })
                    setEditingDespesaVariavel(null)
                    toast.success('Despesa adicionada ✅')
                    return true
                  }

                  await addDespesaVariavel(data)
                  toast.success('Despesa adicionada ✅')
                  return true
                } catch (error) {
                  const ui = humanizeBillingError(error)
                  toast.error(ui.title, { description: ui.description })
                  return false
                }
              }}
              onSaveMany={async items => {
                try {
                  for (const item of items) {
                    await addDespesaVariavel({ ...item, perfil })
                  }
                  toast.success('Despesa adicionada ✅')
                } catch (error) {
                  const ui = humanizeBillingError(error)
                  toast.error(ui.title, { description: ui.description })
                  throw error
                }
              }}
            />
            <DespesasVariaveisTable
              data={despesasVariaveisFiltradas}
              onEdit={handleEditDespesaVariavel}
              onDelete={id => {
                void deleteDespesaVariavel(id)
              }}
              disabled={!canEdit}
            />
          </div>
        ),
      },
    ],
    [
      receitasTotal,
      receitasFiltradas,
      editingReceita,
      canEdit,
      updateReceita,
      addReceita,
      perfil,
      deleteReceita,
      despesasFixasTotal,
      despesasFixasFiltradas,
      editingDespesaFixa,
      updateDespesaFixa,
      addDespesaFixa,
      deleteDespesaFixa,
      despesasVariaveisTotal,
      despesasVariaveisFiltradas,
      editingDespesaVariavel,
      updateDespesaVariavel,
      addDespesaVariavel,
      deleteDespesaVariavel,
    ],
  )

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
        perfil: d.perfil,
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
            <h1 className="text-2xl font-semibold text-white">Gestão de Orçamento</h1>
            <p className="text-sm text-slate-300">Organize receitas e despesas no mês.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/settings"
              className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Conta
            </Link>
            {showAdminMenu && (
              <Link
                to="/admin/invites"
                className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Admin
              </Link>
            )}
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

        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-slate-900/80 p-1 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setPerfil('familiar')}
              className={`px-4 py-2 rounded-full font-medium transition ${perfil === 'familiar'
                ? 'bg-emerald-500 text-white shadow'
                : 'text-slate-300 hover:text-white'
                }`}
            >
              Orçamento familiar
            </button>
            <button
              type="button"
              onClick={() => setPerfil('pessoal')}
              className={`px-4 py-2 rounded-full font-medium transition ${perfil === 'pessoal'
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
          <SummaryCards month={selectedMonth} year={selectedYear} perfil={perfil} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Lançamentos</h2>
          <SectionAccordion
            sections={accordionSections}
            value={openSectionId}
            onValueChange={value => {
              setOpenSectionId(value)
              if (value) {
                setLastSectionUsed(value)
              }
            }}
          />
        </section>

        <section className="space-y-3">
          <SectionAccordion sections={annualAccordionSections} defaultOpenId={null} />
        </section>
      </main>

      <button
        type="button"
        {...fabLongPressHandlers}
        disabled={!canEdit}
        title={fabTitle}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-emerald-500 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3 ${fabLongPressHandlers.isPressing ? 'ring-4 ring-emerald-300/40 scale-95' : ''
          }`}
        aria-label="Adicionar"
      >
        <span aria-hidden="true">🎙️</span>
        <span className="hidden text-sm font-semibold sm:inline">Adicionar</span>
      </button>

      {showVoiceHint && (
        <div className="fixed bottom-24 right-6 z-50 max-w-xs rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 shadow-lg">
          <p>
            Novidade! Segure o botão 🎙️ para lançar despesas por voz. Toque rápido continua
            abrindo o lançamento manual.
          </p>
          <button
            type="button"
            onClick={() => setShowVoiceHint(false)}
            className="mt-2 text-[11px] font-semibold text-emerald-200 hover:underline"
          >
            Entendi
          </button>
        </div>
      )}

      {showAccessRestrictedToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 shadow-lg">
          Acesso restrito
        </div>
      )}
    </div>
  )
}

/**
 * ✅ Detecta URLs de recovery do Supabase (hash tokens ou ?code=...)
 */
function isRecoveryUrl(location: { hash?: string; search?: string }) {
  const blob = `${location.hash ?? ''}${location.search ?? ''}`
  return /type=recovery|access_token|refresh_token|token=|code=/.test(blob)
}

/**
 * ✅ Entrada segura: preserva hash/search do recovery e manda pro /update-password
 */
function EntryRoute() {
  const location = useLocation()
  const recovery = isRecoveryUrl(location)

  if (recovery) {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(RECOVERY_PENDING_KEY, '1')
    }
  }

  if (recovery) {
    return (
      <Navigate
        to={{
          pathname: '/update-password',
          search: location.search,
          hash: location.hash,
        }}
        replace
      />
    )
  }

  // fluxo normal: deixa o AuthWrapper decidir (mostra login se não tiver session)
  return <Navigate to="/home" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <EntitlementsProvider>
        <BudgetProvider>
          <BrowserRouter>
            <AuthWrapper>
              <Routes>
                {/* ✅ Entrada unificada: não mata hash/search */}
                <Route path="/" element={<EntryRoute />} />
                <Route path="/login" element={<EntryRoute />} />
                <Route path="/recuperar-senha" element={<EntryRoute />} />

                <Route path="/home" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="/debug-billing" element={<DebugBilling />} />

                <Route
                  path="/admin/invites"
                  element={
                    <AdminOnly>
                      <InvitesAdminPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path="/admin/*"
                  element={
                    <AdminOnly>
                      <Navigate to="/admin/invites" replace />
                    </AdminOnly>
                  }
                />

                {/* ✅ Catch-all também respeita recovery */}
                <Route path="*" element={<EntryRoute />} />
              </Routes>

              <PaywallModal />
            </AuthWrapper>
          </BrowserRouter>
        </BudgetProvider>
      </EntitlementsProvider>
    </AuthProvider>
  )
}
