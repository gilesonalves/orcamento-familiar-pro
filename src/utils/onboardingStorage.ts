import { Preferences } from '@capacitor/preferences'
import { isNativeApp } from '../lib/platform'

export const ONBOARDING_STORAGE_VERSION = 2

export type OnboardingProgress = {
  onboarding_started: boolean
  onboarding_completed: boolean
  onboarding_skipped: boolean
  card_setup_done: boolean
  first_income_done: boolean
  first_expense_done: boolean
  monthly_summary_seen: boolean
  annual_summary_seen: boolean
  credit_card_tip_dismissed: boolean
  monthly_summary_tip_dismissed: boolean
  annual_summary_tip_dismissed: boolean
}

export type StoredOnboardingProgress = OnboardingProgress & {
  updated_at: string
  version: number
}

const getDefaultTimestamp = () => new Date().toISOString()

export const createDefaultOnboardingProgress = (): StoredOnboardingProgress => ({
  onboarding_started: false,
  onboarding_completed: false,
  onboarding_skipped: false,
  card_setup_done: false,
  first_income_done: false,
  first_expense_done: false,
  monthly_summary_seen: false,
  annual_summary_seen: false,
  credit_card_tip_dismissed: false,
  monthly_summary_tip_dismissed: false,
  annual_summary_tip_dismissed: false,
  updated_at: getDefaultTimestamp(),
  version: ONBOARDING_STORAGE_VERSION,
})

export const getOnboardingStorageKey = (userId: string) =>
  `onboarding_state:${userId}`

const normalizeBoolean = (value: unknown) => value === true

const normalizeStoredProgress = (
  value: unknown,
): StoredOnboardingProgress => {
  const fallback = createDefaultOnboardingProgress()

  if (!value || typeof value !== 'object') {
    return fallback
  }

  const source = value as Record<string, unknown>

  return {
    onboarding_started: normalizeBoolean(source.onboarding_started),
    onboarding_completed: normalizeBoolean(source.onboarding_completed),
    onboarding_skipped: normalizeBoolean(source.onboarding_skipped),
    card_setup_done: normalizeBoolean(source.card_setup_done),
    first_income_done: normalizeBoolean(source.first_income_done),
    first_expense_done: normalizeBoolean(source.first_expense_done),
    monthly_summary_seen: normalizeBoolean(source.monthly_summary_seen),
    annual_summary_seen: normalizeBoolean(source.annual_summary_seen),
    credit_card_tip_dismissed: normalizeBoolean(source.credit_card_tip_dismissed),
    monthly_summary_tip_dismissed: normalizeBoolean(
      source.monthly_summary_tip_dismissed,
    ),
    annual_summary_tip_dismissed: normalizeBoolean(
      source.annual_summary_tip_dismissed,
    ),
    updated_at:
      typeof source.updated_at === 'string' && source.updated_at.trim()
        ? source.updated_at
        : fallback.updated_at,
    version:
      typeof source.version === 'number'
        ? source.version
        : ONBOARDING_STORAGE_VERSION,
  }
}

const readBrowserStorage = (key: string) => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(key)
}

const writeBrowserStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, value)
}

export const loadOnboardingProgress = async (
  userId: string,
): Promise<StoredOnboardingProgress> => {
  const key = getOnboardingStorageKey(userId)

  try {
    const raw = isNativeApp()
      ? (await Preferences.get({ key })).value
      : readBrowserStorage(key)

    if (!raw) {
      return createDefaultOnboardingProgress()
    }

    return normalizeStoredProgress(JSON.parse(raw))
  } catch {
    try {
      const raw = readBrowserStorage(key)
      if (!raw) {
        return createDefaultOnboardingProgress()
      }

      return normalizeStoredProgress(JSON.parse(raw))
    } catch {
      return createDefaultOnboardingProgress()
    }
  }
}

export const saveOnboardingProgress = async (
  userId: string,
  value: OnboardingProgress | StoredOnboardingProgress,
): Promise<StoredOnboardingProgress> => {
  const key = getOnboardingStorageKey(userId)
  const normalized: StoredOnboardingProgress = {
    ...createDefaultOnboardingProgress(),
    ...normalizeStoredProgress(value),
    updated_at: getDefaultTimestamp(),
    version: ONBOARDING_STORAGE_VERSION,
  }
  const serialized = JSON.stringify(normalized)

  try {
    if (isNativeApp()) {
      await Preferences.set({ key, value: serialized })
      return normalized
    }

    writeBrowserStorage(key, serialized)
    return normalized
  } catch {
    writeBrowserStorage(key, serialized)
    return normalized
  }
}
