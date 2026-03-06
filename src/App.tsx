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
import { Toaster, toast } from 'react-hot-toast'

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

import { isNativeApp } from './lib/platform'
import { Preferences } from '@capacitor/preferences'

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
import { PlanBadge } from './components/PlanBadge'

import { InvitesAdminPage } from './pages/admin/InvitesAdminPage'
import { Settings } from './pages/Settings'
import { UpdatePassword } from './pages/auth/UpdatePassword'

import { isSameMonthYear, isSameYear, formatCurrency } from './utils/format'
import { useLongPress } from './hooks/useLongPress'
import DebugBilling from './pages/DebugBilling'
import {
  SectionAccordion,
  type SectionAccordionItem,
} from './components/SectionAccordion'

// -------------------------------

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

  return <Navigate to="/home" replace />
}

// -------------------------------

function Dashboard() {
  const VOICE_HINT_KEY = 'voice_fab_hint_seen'

  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [perfil, setPerfil] = useState<PerfilOrcamento>('familiar')

  // Accordion + foco
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const [lastSectionUsed, setLastSectionUsed] = useState<string>(
    'despesas-variaveis',
  )
  const sectionContentRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Voz via FAB
  const [voiceLauncher, setVoiceLauncher] = useState<(() => Promise<void>) | null>(
    null,
  )
  const [pendingVoiceFromFab, setPendingVoiceFromFab] = useState(false)

  // ✅ trava para garantir que voz só dispare por LONG PRESS no FAB
  const voiceTriggerArmedRef = useRef(false)

  const clearVoicePending = () => {
    voiceTriggerArmedRef.current = false
    setPendingVoiceFromFab(false)
  }

  // UI hint
  const [showVoiceHint, setShowVoiceHint] = useState(false)

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

  const quotaBlocked = Boolean(freeQuota && freeQuota.remaining <= 0)
  const canCreateEntry = access.canCreate && !quotaBlocked
  const showAdminMenu = !roleLoading && userRole === 'admin'

  // Edit states
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null)
  const [editingDespesaFixa, setEditingDespesaFixa] = useState<DespesaFixa | null>(
    null,
  )
  const [editingDespesaVariavel, setEditingDespesaVariavel] =
    useState<DespesaVariavel | null>(null)

  const focusFirstInputInSection = (sectionId: string) => {
    const sectionRoot = sectionContentRefs.current[sectionId]
    if (!sectionRoot) return

    const firstField = sectionRoot.querySelector<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
    )
    if (!firstField) return

    firstField.focus()
    if (typeof (firstField as HTMLInputElement).select === 'function') {
      ;(firstField as HTMLInputElement).select()
    }
  }

  const openSectionAndFocus = (sectionId: string) => {
    // ✅ se o usuário abriu/alternou seção manualmente, nunca dispare voz
    clearVoicePending()

    setOpenSectionId(sectionId)
    setLastSectionUsed(sectionId)
    requestAnimationFrame(() => focusFirstInputInSection(sectionId))
  }

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

  // ✅ Hint de voz
  useEffect(() => {
    let active = true
    let timeout: number | null = null

    const loadVoiceHintState = async () => {
      try {
        const native = isNativeApp()
        let seenValue: string | null = null

        if (native) {
          const result = await Preferences.get({ key: VOICE_HINT_KEY })
          seenValue = result.value
        } else if (typeof window !== 'undefined') {
          seenValue = window.localStorage.getItem(VOICE_HINT_KEY)
        }

        if (!active || seenValue === '1') return

        setShowVoiceHint(true)

        if (native) {
          await Preferences.set({ key: VOICE_HINT_KEY, value: '1' })
        } else if (typeof window !== 'undefined') {
          window.localStorage.setItem(VOICE_HINT_KEY, '1')
        }

        timeout = window.setTimeout(() => {
          if (!active) return
          setShowVoiceHint(false)
        }, 2800)
      } catch (e) {
        if (!active) return
        try {
          const seen = window.localStorage.getItem(VOICE_HINT_KEY)
          if (seen === '1') return
          setShowVoiceHint(true)
          window.localStorage.setItem(VOICE_HINT_KEY, '1')
          timeout = window.setTimeout(() => {
            if (!active) return
            setShowVoiceHint(false)
          }, 2800)
        } catch {
          // ignore
        }
        console.error('Falha ao carregar hint de voz', e)
      }
    }

    void loadVoiceHintState()

    return () => {
      active = false
      if (timeout) window.clearTimeout(timeout)
    }
  }, [])

  // ✅ se veio “accessRestricted”
  useEffect(() => {
    const restricted = (location.state as { accessRestricted?: boolean } | null)
      ?.accessRestricted
    if (!restricted) return

    toast.error('Acesso restrito')
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  // ✅ FAB short
  const handleFabShortPress = () => {
    if (!canCreateEntry) return
    // ✅ short press não arma voz
    clearVoicePending()
    const targetSection = openSectionId ?? lastSectionUsed
    openSectionAndFocus(targetSection)
  }

  // ✅ FAB long -> arma e manda pra seção despesas variáveis
  const handleFabLongPress = () => {
    if (!canCreateEntry) return

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20)
    }

    setEditingDespesaVariavel(null)

    // ✅ arma o disparo (só long press pode fazer isso)
    voiceTriggerArmedRef.current = true
    setPendingVoiceFromFab(true)

    setOpenSectionId('despesas-variaveis')
    setLastSectionUsed('despesas-variaveis')
  }

  // ✅ dispara voz APENAS se estiver armada + pending
  useEffect(() => {
    if (!pendingVoiceFromFab) return
    if (!voiceTriggerArmedRef.current) return
    if (openSectionId !== 'despesas-variaveis') return
    if (!voiceLauncher) return

    // ✅ consome o gatilho (não pode repetir)
    clearVoicePending()

    requestAnimationFrame(() => {
      void voiceLauncher()
    })
  }, [openSectionId, pendingVoiceFromFab, voiceLauncher])

  const fabLongPressHandlers = useLongPress({
    onLongPress: handleFabLongPress,
    onClick: handleFabShortPress,
    ms: 520,
  })

  const fabTitle = canCreateEntry
    ? 'Segure para voz'
    : quotaBlocked
      ? 'Limite do plano Free atingido (15 lançamentos/mês)'
      : 'Acesso bloqueado para novos lançamentos'

  // Filters
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

  // Totals (accordion)
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
        .filter(item => item.perfil === perfil && isSameYear(item.data, selectedYear))
        .reduce((acc, item) => acc + (item.valor || 0), 0),
    [receitas, perfil, selectedYear],
  )

  const despesasFixasAnoTotal = useMemo(
    () =>
      despesasFixas
        .filter(
          item =>
            item.perfil === perfil && isSameYear(item.dataVencimento, selectedYear),
        )
        .reduce((acc, item) => acc + (item.valorPrevisto || 0), 0),
    [despesasFixas, perfil, selectedYear],
  )

  const despesasVariaveisAnoTotal = useMemo(
    () =>
      despesasVariaveis
        .filter(item => item.perfil === perfil && isSameYear(item.data, selectedYear))
        .reduce((acc, item) => acc + (item.valor || 0), 0),
    [despesasVariaveis, perfil, selectedYear],
  )

  const saldoAno =
    receitasAnoTotal - (despesasFixasAnoTotal + despesasVariaveisAnoTotal)

  // replica despesas fixas recorrentes se mês vazio
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
            ref={el => {
              sectionContentRefs.current.receitas = el
            }}
            className="grid w-full gap-4 md:grid-cols-2 md:items-start"
          >
            <ReceitasForm
              editing={editingReceita}
              onCancel={() => setEditingReceita(null)}
              disabled={!canCreateEntry && !editingReceita}
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
              onDelete={id => void deleteReceita(id)}
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
            ref={el => {
              sectionContentRefs.current['despesas-fixas'] = el
            }}
            className="grid w-full gap-4 md:grid-cols-2 md:items-start"
          >
            <DespesasFixasForm
              editing={editingDespesaFixa}
              onCancel={() => setEditingDespesaFixa(null)}
              disabled={!canCreateEntry && !editingDespesaFixa}
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
              onDelete={id => void deleteDespesaFixa(id)}
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
            ref={el => {
              sectionContentRefs.current['despesas-variaveis'] = el
            }}
            className="grid w-full gap-4 md:grid-cols-2 md:items-start"
          >
            <DespesasVariaveisForm
              editing={editingDespesaVariavel}
              perfil={perfil}
              onCancel={() => {
                clearVoicePending()
                setEditingDespesaVariavel(null)
              }}
              disabled={!canCreateEntry && !editingDespesaVariavel}
              onVoiceLauncherReady={fn => {
                // ✅ só registra launcher; não dispara nada aqui
                setVoiceLauncher(() => fn)
              }}
              onSave={async data => {
                try {
                  if (editingDespesaVariavel) {
                    await updateDespesaVariavel(editingDespesaVariavel.id, {
                      ...data,
                      perfil: editingDespesaVariavel.perfil,
                    })
                    setEditingDespesaVariavel(null)
                    clearVoicePending()
                    toast.success('Despesa salva ✅')
                    return true
                  }

                  await addDespesaVariavel({ ...data, perfil })
                  clearVoicePending()
                  toast.success('Despesa adicionada ✅')
                  return true
                } catch {
                  clearVoicePending()
                  toast.error('Não foi possível salvar a despesa.')
                  return false
                }
              }}
              onSaveMany={async items => {
                try {
                  for (const item of items) {
                    await addDespesaVariavel({ ...item, perfil })
                  }
                  clearVoicePending()
                  toast.success('Despesas adicionadas ✅')
                } catch {
                  clearVoicePending()
                  toast.error('Não foi possível salvar as despesas.')
                  throw new Error('saveMany failed')
                }
              }}
            />

            <DespesasVariaveisTable
              data={despesasVariaveisFiltradas}
              onEdit={handleEditDespesaVariavel}
              onDelete={id => void deleteDespesaVariavel(id)}
            />
          </div>
        ),
      },
    ],
    [
      receitasTotal,
      receitasFiltradas,
      despesasFixasTotal,
      despesasFixasFiltradas,
      despesasVariaveisTotal,
      despesasVariaveisFiltradas,
      editingReceita,
      editingDespesaFixa,
      editingDespesaVariavel,
      canCreateEntry,
      perfil,
      addReceita,
      updateReceita,
      deleteReceita,
      addDespesaFixa,
      updateDespesaFixa,
      deleteDespesaFixa,
      addDespesaVariavel,
      updateDespesaVariavel,
      deleteDespesaVariavel,
    ],
  )

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

            <PlanBadge />

            <MonthSelector
              month={selectedMonth}
              year={selectedYear}
              onChange={(m, y) => {
                // ✅ trocar mês não pode disparar voz
                clearVoicePending()
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
                <p className="text-sm text-slate-300">Restam {freeQuota.remaining}</p>
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

        {/* Toggle perfil */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-slate-900/80 p-1 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => {
                clearVoicePending()
                setPerfil('familiar')
              }}
              className={`rounded-full px-4 py-2 font-medium transition ${
                perfil === 'familiar'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Orçamento familiar
            </button>
            <button
              type="button"
              onClick={() => {
                clearVoicePending()
                setPerfil('pessoal')
              }}
              className={`rounded-full px-4 py-2 font-medium transition ${
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
          <SummaryCards month={selectedMonth} year={selectedYear} perfil={perfil} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Lançamentos</h2>
          <SectionAccordion
            sections={accordionSections}
            value={openSectionId}
            onValueChange={(value: string | null) => {
              // ✅ abrir/fechar accordion manualmente não pode disparar voz
              clearVoicePending()
              setOpenSectionId(value)
              if (value) setLastSectionUsed(value)
            }}
          />
        </section>

        <section className="space-y-3">
          <SectionAccordion sections={annualAccordionSections} defaultOpenId={null} />
        </section>
      </main>

      {/* FAB: toque curto abre seção / segurar abre voz */}
      <button
        type="button"
        {...fabLongPressHandlers}
        disabled={!canCreateEntry}
        title={fabTitle}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-emerald-500 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3 ${
          fabLongPressHandlers.isPressing ? 'scale-95 ring-4 ring-emerald-300/40' : ''
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
    </div>
  )
}

// -------------------------------

export default function App() {
  return (
    <AuthProvider>
      <EntitlementsProvider>
        <BudgetProvider>
          <BrowserRouter>
            <AuthWrapper>
              <Routes>
                <Route path="/" element={<EntryRoute />} />
                <Route path="/login" element={<EntryRoute />} />
                <Route path="/recuperar-senha" element={<EntryRoute />} />

                <Route path="/home" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />

                <Route path="/update-password" element={<UpdatePassword />} />
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

                <Route path="*" element={<EntryRoute />} />
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
