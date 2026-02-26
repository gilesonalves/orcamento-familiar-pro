import { useMemo } from 'react'
import { useBudget, type PerfilOrcamento } from '../context/BudgetContext'
import { isSameMonthYear, formatCurrency } from '../utils/format'

type Props = {
  month: number
  year: number
  perfil: PerfilOrcamento
}

const cardStyles = [
  'border-emerald-500/40 bg-emerald-500/5',
  'border-sky-500/40 bg-sky-500/5',
  'border-rose-500/40 bg-rose-500/5',
  'border-amber-500/40 bg-amber-500/5',
]

export function SummaryCards({ month, year, perfil }: Props) {
  const { receitas, despesasFixas, despesasVariaveis } = useBudget()

  const totals = useMemo(() => {
    const receitasMes = receitas
      .filter(
        r => r.perfil === perfil && isSameMonthYear(r.data, month, year),
      )
      .reduce((sum, r) => sum + r.valor, 0)

    const despesasFixasMes = despesasFixas
      .filter(
        d =>
          d.perfil === perfil &&
          isSameMonthYear(d.dataVencimento, month, year),
      )
      .reduce(
        (sum, d) => sum + (d.valorPago > 0 ? d.valorPago : d.valorPrevisto),
        0,
      )

    const despesasVariaveisMes = despesasVariaveis
      .filter(d => d.perfil === perfil && isSameMonthYear(d.data, month, year))
      .reduce((sum, d) => sum + d.valor, 0)

    const saldo = receitasMes - (despesasFixasMes + despesasVariaveisMes)

    return {
      receitasMes,
      despesasFixasMes,
      despesasVariaveisMes,
      saldo,
    }
  }, [receitas, despesasFixas, despesasVariaveis, month, year, perfil])

  const items = [
    { label: 'Receitas', value: totals.receitasMes },
    { label: 'Despesas fixas', value: totals.despesasFixasMes },
    { label: 'Despesas variáveis', value: totals.despesasVariaveisMes },
    { label: 'Saldo do mês', value: totals.saldo },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`rounded-xl border px-4 py-3 shadow-sm shadow-slate-900/40 ${cardStyles[index] ?? cardStyles[0]}`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {item.label}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-50">
            {formatCurrency(item.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
