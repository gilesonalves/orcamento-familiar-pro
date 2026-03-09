import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useBudget } from '../context/BudgetContext'
import { useOnboarding } from '../context/OnboardingContext'
import { ContextTip } from '../components/onboarding/ContextTip'
import { useEntitlements } from '../hooks/useEntitlements'
import { PaywallCTA, ProGate } from '../components/ProGate'
import { PRO_FEATURES } from '../constants/proFeatures'
import {
  copyBudgetExportToClipboard,
  downloadBudgetExport,
} from '../services/budgetExport'
import {
  DEFAULT_CREDIT_CARD_CLOSING_DAY,
  DEFAULT_CREDIT_CARD_DUE_DAY,
  loadCreditCardConfig,
  saveCreditCardConfig,
} from '../utils/creditCardConfig'

export const Settings = () => {
  const location = useLocation()
  const { receitas, despesasFixas, despesasVariaveis } = useBudget()
  const {
    completePendingAction,
    dismissTip,
    isLoading: onboardingLoading,
    openOnboarding,
    progress,
    refreshCardSetupStatus,
  } = useOnboarding()
  const {
    isPro,
    activeEntitlement,
    activeProductIds,
    loading,
    processing,
    error,
    packages,
    purchase,
    restore,
    refresh,
  } = useEntitlements()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [closingDayInput, setClosingDayInput] = useState(
    String(DEFAULT_CREDIT_CARD_CLOSING_DAY),
  )
  const [dueDayInput, setDueDayInput] = useState(
    String(DEFAULT_CREDIT_CARD_DUE_DAY),
  )
  const [creditCardConfigLoading, setCreditCardConfigLoading] = useState(true)
  const [creditCardConfigSaving, setCreditCardConfigSaving] = useState(false)
  const [creditCardFeedback, setCreditCardFeedback] = useState<string | null>(
    null,
  )
  const creditCardSectionRef = useRef<HTMLElement | null>(null)
  const exportFeature = PRO_FEATURES.exportData

  const exportState = useMemo(
    () => ({ receitas, despesasFixas, despesasVariaveis }),
    [receitas, despesasFixas, despesasVariaveis],
  )

  const monthly = packages.monthly
  const annual = packages.annual
  const monthlyTerm = monthly?.product?.subscriptionPeriod || 'Cobranca mensal'
  const annualTerm = annual?.product?.subscriptionPeriod || 'Cobranca anual'

  useEffect(() => {
    let active = true

    const loadConfig = async () => {
      const config = await loadCreditCardConfig()
      if (!active) return

      setClosingDayInput(String(config.closingDay))
      setDueDayInput(String(config.dueDay))
      setCreditCardConfigLoading(false)
    }

    void loadConfig()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (location.hash !== '#credit-card-settings') return

    creditCardSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [location.hash])

  const handleDownload = () => {
    try {
      downloadBudgetExport(exportState)
      setFeedback('Arquivo de exportacao gerado.')
    } catch (nextError) {
      console.error('Erro ao exportar dados', nextError)
      setFeedback('Nao foi possivel gerar o arquivo de exportacao.')
    }
  }

  const handleCopy = () => {
    try {
      copyBudgetExportToClipboard(exportState)
      setFeedback('Dados copiados com sucesso.')
    } catch (nextError) {
      console.error('Erro ao copiar exportacao', nextError)
      setFeedback('Nao foi possivel copiar os dados.')
    }
  }

  const handleSaveCreditCardConfig = async () => {
    setCreditCardConfigSaving(true)
    setCreditCardFeedback(null)

    try {
      const saved = await saveCreditCardConfig({
        closingDay: Number(closingDayInput),
        dueDay: Number(dueDayInput),
      })

      setClosingDayInput(String(saved.closingDay))
      setDueDayInput(String(saved.dueDay))
      await refreshCardSetupStatus()
      await completePendingAction('card-setup')
      setCreditCardFeedback('Configuracao do cartao salva com sucesso.')
    } catch {
      setCreditCardFeedback('Nao foi possivel salvar a configuracao do cartao.')
    } finally {
      setCreditCardConfigSaving(false)
    }
  }

  const onboardingStatus = progress.onboarding_completed
    ? 'concluido'
    : progress.onboarding_skipped
      ? 'pulado'
      : progress.onboarding_started
        ? 'em andamento'
        : 'nao iniciado'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Configuracoes</h1>
            <p className="text-sm text-slate-300">
              Gerencie preferencias e exporte seus dados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/home"
              className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Voltar para o inicio
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Plano PRO</h2>
            <p className="text-sm text-slate-300">
              Assinaturas gerenciadas via Google Play + RevenueCat.
            </p>
          </div>

          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              isPro
                ? 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                : 'border border-slate-700 bg-slate-800/70 text-slate-100'
            }`}
          >
            Status atual: <strong>{isPro ? 'PRO' : 'FREE'}</strong>
            <div className="mt-1 text-xs opacity-80">
              Entitlement ativo: {activeEntitlement ?? 'nenhum'}
            </div>
            <div className="mt-1 text-xs opacity-80">
              Produtos ativos:{' '}
              {activeProductIds.length > 0 ? activeProductIds.join(', ') : 'nenhum'}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <p className="text-sm font-semibold text-slate-100">Mensal</p>
              <p className="text-xs text-slate-400">{monthlyTerm}</p>
              <p className="mt-2 text-base font-semibold text-white">
                {monthly?.product?.priceString || 'Preco indisponivel'}
              </p>
              <button
                type="button"
                disabled={loading || processing || !monthly || isPro}
                onClick={() => {
                  void purchase('monthly')
                }}
                className="mt-3 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Assinar mensal
              </button>
            </div>

            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-50">Anual</p>
              <p className="text-xs text-emerald-100/80">{annualTerm}</p>
              <p className="mt-2 text-base font-semibold text-emerald-50">
                {annual?.product?.priceString || 'Preco indisponivel'}
              </p>
              <button
                type="button"
                disabled={loading || processing || !annual || isPro}
                onClick={() => {
                  void purchase('annual')
                }}
                className="mt-3 w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Assinar anual
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || processing}
              onClick={() => {
                void restore()
              }}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Restaurar compras
            </button>
            <button
              type="button"
              disabled={loading || processing}
              onClick={() => {
                void refresh()
              }}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Atualizar status
            </button>
          </div>
        </section>

        <section
          id="credit-card-settings"
          ref={creditCardSectionRef}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
        >
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">
              Cartao de credito
            </h2>
            <p className="text-sm text-slate-300">
              Defina o ciclo para lancar despesas variaveis no mes correto da
              fatura.
            </p>
          </div>

          {!progress.card_setup_done && !progress.credit_card_tip_dismissed && (
            <ContextTip
              message="Defina aqui o fechamento e o vencimento do cartao para organizar compras e parcelas no mes certo."
              onDismiss={async () => {
                await dismissTip('credit-card')
              }}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-100">
              Dia de fechamento (1-28)
              <input
                type="number"
                min={1}
                max={28}
                step={1}
                required
                value={closingDayInput}
                onChange={event => setClosingDayInput(event.target.value)}
                disabled={creditCardConfigLoading || creditCardConfigSaving}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="text-sm text-slate-100">
              Dia de vencimento (1-28)
              <input
                type="number"
                min={1}
                max={28}
                step={1}
                required
                value={dueDayInput}
                onChange={event => setDueDayInput(event.target.value)}
                disabled={creditCardConfigLoading || creditCardConfigSaving}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void handleSaveCreditCardConfig()
              }}
              disabled={creditCardConfigLoading || creditCardConfigSaving}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creditCardConfigSaving ? 'Salvando...' : 'Salvar ciclo do cartao'}
            </button>
            {creditCardFeedback && (
              <p className="text-sm text-emerald-200" role="status">
                {creditCardFeedback}
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Tutorial inicial</h2>
            <p className="text-sm text-slate-300">
              Reabra a apresentacao inicial curta sempre que quiser revisar
              como comecar no app.
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
            Status atual: <strong>{onboardingStatus}</strong>
          </div>

          <button
            type="button"
            onClick={() => {
              void openOnboarding()
            }}
            disabled={onboardingLoading}
            className="rounded-lg border border-emerald-400/50 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Rever tutorial
          </button>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">
              Exportar dados do orcamento
            </h2>
            <p className="text-sm text-slate-300">
              Voce pode exportar seus dados do Orcamento Familiar para fazer
              backup ou para migrar futuramente para o Superplanejador Familiar.
            </p>
            <p className="text-sm text-slate-300">
              Seus dados nao sao enviados para nenhum servidor.
            </p>
          </div>

          <ProGate
            feature="exportData"
            fallback={
              <PaywallCTA
                feature="exportData"
                title={exportFeature.title}
                description={exportFeature.description}
                buttonLabel="Assinar PRO"
                compact
              />
            }
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400"
              >
                Baixar arquivo de exportacao (.json)
              </button>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
                >
                  Copiar dados (acao avancada)
                </button>
                <p className="text-xs text-slate-400">
                  Indicado para uso avancado ou suporte tecnico. Copia o
                  conteudo completo do arquivo de exportacao.
                </p>
              </div>
            </div>
          </ProGate>

          {feedback && (
            <p className="text-sm text-emerald-200" role="status">
              {feedback}
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
