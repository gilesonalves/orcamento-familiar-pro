const TRIAL_DURATION_DAYS = 30

const parseDate = (value: string | null | undefined) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const isTrialActive = (trialStartedAt: string | null | undefined) => {
  const start = parseDate(trialStartedAt)
  if (!start) return false
  const durationMs = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - start.getTime() < durationMs
}

export { TRIAL_DURATION_DAYS }
