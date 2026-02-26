export const QUOTA_KEY = 'orcamento_quota_monthly'

type QuotaState = {
  monthKey: string
  count: number
}

const DEFAULT_QUOTA: QuotaState = {
  monthKey: '',
  count: 0,
}

const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7)

const readStoredQuota = (): QuotaState => {
  if (typeof window === 'undefined') return DEFAULT_QUOTA

  const raw = window.localStorage.getItem(QUOTA_KEY)
  if (!raw) return DEFAULT_QUOTA

  try {
    const parsed = JSON.parse(raw) as Partial<QuotaState>
    const monthKey =
      typeof parsed.monthKey === 'string' ? parsed.monthKey : DEFAULT_QUOTA.monthKey
    const count =
      typeof parsed.count === 'number' && Number.isFinite(parsed.count)
        ? Math.max(0, Math.floor(parsed.count))
        : 0

    return { monthKey, count }
  } catch {
    return DEFAULT_QUOTA
  }
}

const saveQuota = (next: QuotaState) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(QUOTA_KEY, JSON.stringify(next))
}

export const getQuota = (): QuotaState => {
  const currentMonthKey = getCurrentMonthKey()
  const stored = readStoredQuota()

  if (stored.monthKey !== currentMonthKey) {
    return { monthKey: currentMonthKey, count: 0 }
  }

  return stored
}

export const resetIfNewMonth = () => {
  const currentMonthKey = getCurrentMonthKey()
  const stored = readStoredQuota()

  if (stored.monthKey !== currentMonthKey) {
    saveQuota({ monthKey: currentMonthKey, count: 0 })
  }
}

export const canConsume = (limit: number) => {
  if (limit <= 0) return false
  resetIfNewMonth()
  const { count } = getQuota()
  return count < limit
}

export const consume = () => {
  resetIfNewMonth()
  const current = getQuota()
  saveQuota({ monthKey: current.monthKey, count: current.count + 1 })
}

export const remaining = (limit: number) => {
  if (limit <= 0) return 0
  const { count } = getQuota()
  return Math.max(0, limit - count)
}

export const setCountForDebug = (n: number) => {
  if (!import.meta.env.DEV) return
  const current = getQuota()
  const count = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
  saveQuota({ monthKey: current.monthKey, count })
}
