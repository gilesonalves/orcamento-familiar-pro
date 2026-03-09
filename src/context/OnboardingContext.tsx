import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { useBudget } from './BudgetContext'
import { hasStoredCreditCardConfig } from '../utils/creditCardConfig'
import {
  createDefaultOnboardingProgress,
  loadOnboardingProgress,
  saveOnboardingProgress,
  type OnboardingProgress,
  type StoredOnboardingProgress,
} from '../utils/onboardingStorage'

export type OnboardingIntroStepId = 'welcome' | 'getting-started' | 'tracking'

export type OnboardingActionStepId =
  | 'card-setup'
  | 'add-income'
  | 'add-expense'

export type OnboardingViewStepId = 'monthly-summary' | 'annual-summary'

export type OnboardingTipId =
  | 'credit-card'
  | 'monthly-summary'
  | 'annual-summary'

type OnboardingContextValue = {
  completeOnboarding: () => Promise<void>
  completePendingAction: (stepId: OnboardingActionStepId) => Promise<boolean>
  currentStep: OnboardingIntroStepId
  dismissOnboarding: () => void
  dismissTip: (tipId: OnboardingTipId) => Promise<void>
  isLoading: boolean
  isVisible: boolean
  markViewStepSeen: (stepId: OnboardingViewStepId) => Promise<void>
  nextStep: () => Promise<void>
  openOnboarding: () => Promise<void>
  progress: StoredOnboardingProgress
  refreshCardSetupStatus: () => Promise<void>
  skipEntireOnboarding: () => Promise<void>
  startOnboarding: () => Promise<void>
}

type OnboardingProviderProps = {
  children: ReactNode
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined,
)

const INTRO_STEP_ORDER: OnboardingIntroStepId[] = [
  'welcome',
  'getting-started',
  'tracking',
]

const getNextIntroStepId = (stepId: OnboardingIntroStepId) => {
  const stepIndex = INTRO_STEP_ORDER.indexOf(stepId)

  if (stepIndex < 0 || stepIndex === INTRO_STEP_ORDER.length - 1) {
    return null
  }

  return INTRO_STEP_ORDER[stepIndex + 1]
}

const getActionStepPatch = (
  stepId: OnboardingActionStepId,
): Partial<OnboardingProgress> => {
  switch (stepId) {
    case 'card-setup':
      return { card_setup_done: true }
    case 'add-income':
      return { first_income_done: true }
    case 'add-expense':
      return { first_expense_done: true }
    default:
      return {}
  }
}

const getViewStepPatch = (
  stepId: OnboardingViewStepId,
): Partial<OnboardingProgress> => {
  switch (stepId) {
    case 'monthly-summary':
      return { monthly_summary_seen: true }
    case 'annual-summary':
      return { annual_summary_seen: true }
    default:
      return {}
  }
}

const getTipPatch = (tipId: OnboardingTipId): Partial<OnboardingProgress> => {
  switch (tipId) {
    case 'credit-card':
      return { credit_card_tip_dismissed: true }
    case 'monthly-summary':
      return { monthly_summary_tip_dismissed: true }
    case 'annual-summary':
      return { annual_summary_tip_dismissed: true }
    default:
      return {}
  }
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user } = useAuth()
  const { receitas, despesasVariaveis } = useBudget()
  const [progress, setProgress] = useState<StoredOnboardingProgress>(
    createDefaultOnboardingProgress(),
  )
  const [currentStep, setCurrentStep] =
    useState<OnboardingIntroStepId>('welcome')
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const progressRef = useRef(progress)
  const userIdRef = useRef<string | null>(user?.id ?? null)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    userIdRef.current = user?.id ?? null
  }, [user?.id])

  const commitProgress = useCallback(
    async (
      updater:
        | Partial<OnboardingProgress>
        | ((current: StoredOnboardingProgress) => Partial<OnboardingProgress>),
    ) => {
      const userId = userIdRef.current
      if (!userId) {
        return progressRef.current
      }

      const current = progressRef.current
      const patch =
        typeof updater === 'function' ? updater(current) : updater
      const next = await saveOnboardingProgress(userId, {
        ...current,
        ...patch,
      })

      progressRef.current = next
      setProgress(next)
      return next
    },
    [],
  )

  const refreshCardSetupStatus = useCallback(async () => {
    const configured = await hasStoredCreditCardConfig()

    if (configured === progressRef.current.card_setup_done) {
      return
    }

    await commitProgress({
      card_setup_done: configured,
    })
  }, [commitProgress])

  const dismissOnboarding = useCallback(() => {
    setIsVisible(false)
    setCurrentStep('welcome')
  }, [])

  const completeOnboarding = useCallback(async () => {
    await commitProgress({
      onboarding_started: true,
      onboarding_completed: true,
      onboarding_skipped: false,
    })
    setCurrentStep('welcome')
    setIsVisible(false)
  }, [commitProgress])

  const openOnboarding = useCallback(async () => {
    await refreshCardSetupStatus()
    setCurrentStep('welcome')
    setIsVisible(true)
  }, [refreshCardSetupStatus])

  const startOnboarding = useCallback(async () => {
    await commitProgress({
      onboarding_started: true,
      onboarding_skipped: false,
    })
    setCurrentStep('getting-started')
    setIsVisible(true)
  }, [commitProgress])

  const nextStep = useCallback(async () => {
    const nextStepId = getNextIntroStepId(currentStep)

    if (!nextStepId) {
      await completeOnboarding()
      return
    }

    setCurrentStep(nextStepId)
    setIsVisible(true)
  }, [completeOnboarding, currentStep])

  const skipEntireOnboarding = useCallback(async () => {
    if (!progressRef.current.onboarding_completed) {
      await commitProgress({
        onboarding_started: true,
        onboarding_skipped: true,
      })
    }

    setCurrentStep('welcome')
    setIsVisible(false)
  }, [commitProgress])

  const completePendingAction = useCallback(
    async (stepId: OnboardingActionStepId) => {
      const patch = getActionStepPatch(stepId)
      const current = progressRef.current
      const hasChange = Object.entries(patch).some(
        ([key, value]) =>
          value === true &&
          current[key as keyof StoredOnboardingProgress] !== true,
      )

      if (hasChange) {
        await commitProgress(patch)
      }

      return true
    },
    [commitProgress],
  )

  const markViewStepSeen = useCallback(
    async (stepId: OnboardingViewStepId) => {
      const patch = getViewStepPatch(stepId)
      const current = progressRef.current
      const hasChange = Object.entries(patch).some(
        ([key, value]) =>
          value === true &&
          current[key as keyof StoredOnboardingProgress] !== true,
      )

      if (!hasChange) {
        return
      }

      await commitProgress(patch)
    },
    [commitProgress],
  )

  const dismissTip = useCallback(
    async (tipId: OnboardingTipId) => {
      const patch = getTipPatch(tipId)
      const current = progressRef.current
      const hasChange = Object.entries(patch).some(
        ([key, value]) =>
          value === true &&
          current[key as keyof StoredOnboardingProgress] !== true,
      )

      if (!hasChange) {
        return
      }

      await commitProgress(patch)
    },
    [commitProgress],
  )

  useEffect(() => {
    let active = true

    if (!user?.id) {
      const empty = createDefaultOnboardingProgress()
      progressRef.current = empty
      setProgress(empty)
      setCurrentStep('welcome')
      setIsVisible(false)
      setIsLoading(false)
      return () => {
        active = false
      }
    }

    setIsLoading(true)

    const loadState = async () => {
      const [storedProgress, cardConfigured] = await Promise.all([
        loadOnboardingProgress(user.id),
        hasStoredCreditCardConfig(),
      ])

      if (!active) return

      const nextProgress =
        cardConfigured === storedProgress.card_setup_done
          ? storedProgress
          : await saveOnboardingProgress(user.id, {
              ...storedProgress,
              card_setup_done: cardConfigured,
            })

      if (!active) return

      progressRef.current = nextProgress
      setProgress(nextProgress)
      setCurrentStep('welcome')
      setIsVisible(
        !nextProgress.onboarding_started &&
          !nextProgress.onboarding_completed &&
          !nextProgress.onboarding_skipped,
      )
      setIsLoading(false)
    }

    void loadState()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    if (isLoading || !user?.id) {
      return
    }

    if (receitas.length > 0 && !progressRef.current.first_income_done) {
      void commitProgress({
        first_income_done: true,
      })
    }
  }, [commitProgress, isLoading, receitas.length, user?.id])

  useEffect(() => {
    if (isLoading || !user?.id) {
      return
    }

    if (
      despesasVariaveis.length > 0 &&
      !progressRef.current.first_expense_done
    ) {
      void commitProgress({
        first_expense_done: true,
      })
    }
  }, [commitProgress, despesasVariaveis.length, isLoading, user?.id])

  const value = useMemo<OnboardingContextValue>(
    () => ({
      completeOnboarding,
      completePendingAction,
      currentStep,
      dismissOnboarding,
      dismissTip,
      isLoading,
      isVisible,
      markViewStepSeen,
      nextStep,
      openOnboarding,
      progress,
      refreshCardSetupStatus,
      skipEntireOnboarding,
      startOnboarding,
    }),
    [
      completeOnboarding,
      completePendingAction,
      currentStep,
      dismissOnboarding,
      dismissTip,
      isLoading,
      isVisible,
      markViewStepSeen,
      nextStep,
      openOnboarding,
      progress,
      refreshCardSetupStatus,
      skipEntireOnboarding,
      startOnboarding,
    ],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)

  if (!context) {
    throw new Error('useOnboarding deve ser usado dentro do OnboardingProvider')
  }

  return context
}
