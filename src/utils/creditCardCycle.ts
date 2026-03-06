// src/lib/creditCardCycle.ts (ou onde você estiver usando)

export const clampDay = (
  year: number,
  monthIndex0: number,
  day: number,
): Date => {
  const normalizedDay = Math.max(1, Math.floor(day))
  const lastDayOfMonth = new Date(year, monthIndex0 + 1, 0).getDate()
  const clamped = Math.min(normalizedDay, lastDayOfMonth)
  return new Date(year, monthIndex0, clamped)
}

export const getFirstDueDate = (
  purchaseDate: Date,
  closingDay: number,
  dueDay: number,
): Date => {
  const purchaseDay = purchaseDate.getDate()
  const purchaseYear = purchaseDate.getFullYear()
  const purchaseMonth = purchaseDate.getMonth()

  // Se comprou até o fechamento (inclusive), entra na fatura que fecha neste mês.
  // Se comprou depois do fechamento, entra na fatura que fecha no mês seguinte.
  const closeMonthOffset = purchaseDay <= closingDay ? 0 : 1

  const closeDate = clampDay(
    purchaseYear,
    purchaseMonth + closeMonthOffset,
    closingDay,
  )

  // ✅ Regra correta do vencimento em relação ao fechamento:
  // - Se o vencimento é "depois" do fechamento (dueDay > closingDay), é no MESMO mês do fechamento.
  // - Se o vencimento é "antes ou igual" ao fechamento (dueDay <= closingDay), é no PRÓXIMO mês.
  const dueMonthOffset = dueDay > closingDay ? 0 : 1

  const dueYear = closeDate.getFullYear()
  const dueMonth = closeDate.getMonth() + dueMonthOffset

  return clampDay(dueYear, dueMonth, dueDay)
}

export const getInstallmentDueDates = (
  purchaseDate: Date,
  closingDay: number,
  dueDay: number,
  installments: number,
): Date[] => {
  const totalInstallments = Math.max(1, Math.floor(installments))
  const firstDueDate = getFirstDueDate(purchaseDate, closingDay, dueDay)

  return Array.from({ length: totalInstallments }, (_, index) =>
    clampDay(
      firstDueDate.getFullYear(),
      firstDueDate.getMonth() + index,
      dueDay,
    ),
  )
}