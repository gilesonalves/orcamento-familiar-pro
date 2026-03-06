import { Preferences } from '@capacitor/preferences'
import { isNativeApp } from '../lib/platform'

export const CREDIT_CARD_CLOSING_DAY_KEY = 'cc_closing_day'
export const CREDIT_CARD_DUE_DAY_KEY = 'cc_due_day'
export const DEFAULT_CREDIT_CARD_CLOSING_DAY = 10
export const DEFAULT_CREDIT_CARD_DUE_DAY = 20

export type CreditCardConfig = {
  closingDay: number
  dueDay: number
}

const clampCycleDay = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_CREDIT_CARD_CLOSING_DAY
  return Math.min(28, Math.max(1, Math.floor(value)))
}

const parseCycleDay = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(28, Math.max(1, Math.floor(parsed)))
}

const getStorageFallback = () => {
  if (typeof window === 'undefined') {
    return {
      closingDay: DEFAULT_CREDIT_CARD_CLOSING_DAY,
      dueDay: DEFAULT_CREDIT_CARD_DUE_DAY,
    }
  }

  return {
    closingDay: parseCycleDay(
      window.localStorage.getItem(CREDIT_CARD_CLOSING_DAY_KEY),
      DEFAULT_CREDIT_CARD_CLOSING_DAY,
    ),
    dueDay: parseCycleDay(
      window.localStorage.getItem(CREDIT_CARD_DUE_DAY_KEY),
      DEFAULT_CREDIT_CARD_DUE_DAY,
    ),
  }
}

export const loadCreditCardConfig = async (): Promise<CreditCardConfig> => {
  try {
    if (isNativeApp()) {
      const [closingResult, dueResult] = await Promise.all([
        Preferences.get({ key: CREDIT_CARD_CLOSING_DAY_KEY }),
        Preferences.get({ key: CREDIT_CARD_DUE_DAY_KEY }),
      ])

      return {
        closingDay: parseCycleDay(
          closingResult.value,
          DEFAULT_CREDIT_CARD_CLOSING_DAY,
        ),
        dueDay: parseCycleDay(dueResult.value, DEFAULT_CREDIT_CARD_DUE_DAY),
      }
    }

    return getStorageFallback()
  } catch {
    return getStorageFallback()
  }
}

export const saveCreditCardConfig = async (
  config: CreditCardConfig,
): Promise<CreditCardConfig> => {
  const normalized: CreditCardConfig = {
    closingDay: clampCycleDay(config.closingDay),
    dueDay: parseCycleDay(String(config.dueDay), DEFAULT_CREDIT_CARD_DUE_DAY),
  }

  try {
    if (isNativeApp()) {
      await Promise.all([
        Preferences.set({
          key: CREDIT_CARD_CLOSING_DAY_KEY,
          value: String(normalized.closingDay),
        }),
        Preferences.set({
          key: CREDIT_CARD_DUE_DAY_KEY,
          value: String(normalized.dueDay),
        }),
      ])
      return normalized
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        CREDIT_CARD_CLOSING_DAY_KEY,
        String(normalized.closingDay),
      )
      window.localStorage.setItem(
        CREDIT_CARD_DUE_DAY_KEY,
        String(normalized.dueDay),
      )
    }
  } catch {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        CREDIT_CARD_CLOSING_DAY_KEY,
        String(normalized.closingDay),
      )
      window.localStorage.setItem(
        CREDIT_CARD_DUE_DAY_KEY,
        String(normalized.dueDay),
      )
    }
  }

  return normalized
}
