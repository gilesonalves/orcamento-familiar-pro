// Converte datas de input (yyyy-mm-dd) para Date em horário local,
// evitando o deslocamento de fuso que acontece quando o JS interpreta como UTC.
const parseInputDate = (value: string) => {
  if (!value) return null
  const parts = value.split('-').map(Number)
  if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
    const [year, month, day] = parts
    return new Date(year, month - 1, day)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)

export const formatDate = (value: string) => {
  const date = parseInputDate(value)
  if (!date) return value || ''
  return date.toLocaleDateString('pt-BR')
}

export const isSameMonthYear = (dateString: string, month: number, year: number) => {
  const date = parseInputDate(dateString)
  if (!date) return false
  return date.getMonth() === month && date.getFullYear() === year
}

export const isSameYear = (dateString: string, year: number) => {
  const date = parseInputDate(dateString)
  if (!date) return false
  return date.getFullYear() === year
}
