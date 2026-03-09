import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  useOnboarding,
  type OnboardingIntroStepId,
} from '../../context/OnboardingContext'

type IntroStepDefinition = {
  badge: string
  description: string
  highlights: string[]
  title: string
}

const INTRO_STEPS: Record<OnboardingIntroStepId, IntroStepDefinition> = {
  welcome: {
    badge: 'Primeiro acesso',
    title: 'Bem-vindo ao Orcamento Familiar',
    description:
      'Organize receitas, despesas e cartao de credito sem complicar sua rotina.',
    highlights: [
      'Veja rapidamente como o app se encaixa no seu dia a dia.',
      'O restante da orientacao continua dentro da propria interface.',
    ],
  },
  'getting-started': {
    badge: 'Como comecar',
    title: 'Primeiros passos recomendados',
    description:
      'Comece pelo basico para o app montar um resumo fiel do seu orcamento.',
    highlights: [
      'Configure o ciclo do cartao.',
      'Cadastre sua primeira receita.',
      'Adicione ao menos uma despesa.',
    ],
  },
  tracking: {
    badge: 'Acompanhamento',
    title: 'Depois acompanhe sua evolucao',
    description:
      'Com esses dados preenchidos, voce acompanha o resumo mensal e compara os meses na visao anual.',
    highlights: [
      'Resumo do mes para entradas, saidas e saldo.',
      'Visao anual para comparar a evolucao financeira.',
    ],
  },
}

const STEP_ORDER: OnboardingIntroStepId[] = [
  'welcome',
  'getting-started',
  'tracking',
]

export function OnboardingIntro() {
  const location = useLocation()
  const { user } = useAuth()
  const {
    completeOnboarding,
    currentStep,
    isLoading,
    isVisible,
    nextStep,
    skipEntireOnboarding,
    startOnboarding,
  } = useOnboarding()

  if (
    !user ||
    isLoading ||
    !isVisible ||
    location.pathname === '/update-password'
  ) {
    return null
  }

  const step = INTRO_STEPS[currentStep]
  const stepIndex = STEP_ORDER.indexOf(currentStep)
  const isWelcome = currentStep === 'welcome'
  const isLastStep = currentStep === 'tracking'

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <div className="mx-auto flex h-full w-full max-w-md flex-col justify-between rounded-[32px] border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-slate-950/80 sm:p-7">
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              {step.badge}
            </span>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-white">
                {step.title}
              </h1>
              <p className="text-sm leading-6 text-slate-300">
                {step.description}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {STEP_ORDER.map((stepId, index) => (
              <div
                key={stepId}
                className={`h-1.5 flex-1 rounded-full ${
                  index <= stepIndex ? 'bg-emerald-400' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
            {step.highlights.map(item => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <p className="text-sm leading-6 text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (isWelcome) {
                void startOnboarding()
                return
              }

              if (isLastStep) {
                void completeOnboarding()
                return
              }

              void nextStep()
            }}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            {isWelcome ? 'Comecar' : isLastStep ? 'Entrar no app' : 'Proximo'}
          </button>

          <button
            type="button"
            onClick={() => {
              void skipEntireOnboarding()
            }}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Pular
          </button>
        </div>
      </div>
    </div>
  )
}
