import { useMemo } from 'react'
import { useBudget, type PerfilOrcamento } from '../context/BudgetContext'
import { formatCurrency, isSameMonthYear } from '../utils/format'

type Props = {
  year: number
  perfil: PerfilOrcamento
}

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function SummaryYear({ year, perfil }: Props) {
  const { receitas, despesasFixas, despesasVariaveis } = useBudget()

  const {
    meses,
    totalReceitas,
    totalDespesas,
    saldoAno,
    maxValor,
  } = useMemo(() => {
    const meses = monthLabels.map((label, monthIndex) => {
      const receitasMes = receitas
        .filter(
          r =>
            r.perfil === perfil &&
            isSameMonthYear(r.data, monthIndex, year),
        )
        .reduce((sum, r) => sum + r.valor, 0)

      const despesasFixasMes = despesasFixas
        .filter(
          d =>
            d.perfil === perfil &&
            isSameMonthYear(d.dataVencimento, monthIndex, year),
        )
        // aqui posso considerar valorPago; se for 0, cai pro previsto
        .reduce(
          (sum, d) =>
            sum + (d.valorPago > 0 ? d.valorPago : d.valorPrevisto),
          0,
        )

      const despesasVariaveisMes = despesasVariaveis
        .filter(
          d =>
            d.perfil === perfil &&
            isSameMonthYear(d.data, monthIndex, year),
        )
        .reduce((sum, d) => sum + d.valor, 0)

      const despesasMes = despesasFixasMes + despesasVariaveisMes
      const saldoMes = receitasMes - despesasMes

      return {
        label,
        receitas: receitasMes,
        despesas: despesasMes,
        saldo: saldoMes,
      }
    })

    const totalReceitas = meses.reduce((s, m) => s + m.receitas, 0)
    const totalDespesas = meses.reduce((s, m) => s + m.despesas, 0)
    const saldoAno = totalReceitas - totalDespesas
    const maxValor = Math.max(
      0,
      ...meses.map(m => Math.max(m.receitas, m.despesas)),
    )

    return { meses, totalReceitas, totalDespesas, saldoAno, maxValor }
  }, [receitas, despesasFixas, despesasVariaveis, year, perfil])

  const hasData = maxValor > 0

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Visão anual · {perfil === 'familiar' ? 'Familiar' : 'Somente meu'}
          </p>
          <h2 className="text-lg font-semibold text-white">
            {year}
          </h2>
        </div>
      </div>

      {/* Totais do ano */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Total de receitas
          </p>
          <p className="mt-1 text-base font-semibold text-emerald-400 sm:text-lg">
            {formatCurrency(totalReceitas)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Total de despesas
          </p>
          <p className="mt-1 text-base font-semibold text-rose-400 sm:text-lg">
            {formatCurrency(totalDespesas)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-cyan-500/10 px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Saldo do ano
          </p>
          <p
            className={`mt-1 text-base font-semibold sm:text-lg ${
              saldoAno >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(saldoAno)}
          </p>
        </div>
      </div>

      {/* Tabela mês a mês */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="grid grid-cols-4 gap-2 border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:px-4">
          <span>Mês</span>
          <span className="text-right">Receitas</span>
          <span className="text-right">Despesas</span>
          <span className="text-right">Saldo</span>
        </div>
        <div className="max-h-64 overflow-y-auto text-xs sm:text-sm">
          {meses.map(m => (
            <div
              key={m.label}
              className="grid grid-cols-4 gap-2 border-b border-slate-800/60 px-3 py-2 last:border-b-0 sm:px-4"
            >
              <span className="text-slate-200">{m.label}</span>
              <span className="text-right text-slate-100">
                {formatCurrency(m.receitas)}
              </span>
              <span className="text-right text-rose-200">
                {formatCurrency(m.despesas)}
              </span>
              <span
                className={`text-right ${
                  m.saldo >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {formatCurrency(m.saldo)}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 border-t border-slate-800/80 bg-slate-900 px-3 py-2 text-xs font-semibold sm:px-4">
          <span className="text-slate-300">Total {year}</span>
          <span className="text-right text-slate-50">
            {formatCurrency(totalReceitas)}
          </span>
          <span className="text-right text-rose-200">
            {formatCurrency(totalDespesas)}
          </span>
          <span
            className={`text-right ${
              saldoAno >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {formatCurrency(saldoAno)}
          </span>
        </div>
      </div>

      {/* Gráfico simples: duas barras por mês (Receitas x Despesas) */}
      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Receitas x despesas por mês
            </p>
            <p className="text-[11px] text-slate-500">
              Comparação mensal do perfil selecionado.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Receitas</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-slate-400">Despesas</span>
            </div>
          </div>
        </div>

        {!hasData ? (
          <p className="mt-4 rounded-xl bg-slate-900/80 px-3 py-6 text-center text-xs text-slate-400 sm:text-sm">
            Adicione receitas e despesas ao longo do ano para ver o gráfico
            mensal.
          </p>
        ) : (
          <div className="mt-2 flex items-end gap-3 overflow-x-auto pb-1 pt-2">
            {meses.map(m => {
              const receitaPerc = maxValor
                ? (m.receitas / maxValor) * 100
                : 0
              const despesaPerc = maxValor
                ? (m.despesas / maxValor) * 100
                : 0

              // garante um mínimo visual quando tem valor > 0
              const receitaAltura =
                m.receitas > 0 ? Math.max(receitaPerc, 12) : 0
              const despesaAltura =
                m.despesas > 0 ? Math.max(despesaPerc, 12) : 0

              return (
                <div
                  key={m.label}
                  className="flex flex-col items-center gap-1 text-[10px]"
                >
                  <div className="flex h-32 w-8 items-end justify-center gap-[2px] rounded-full bg-slate-950/70 px-[3px] pb-1 pt-1 sm:h-36 sm:w-9">
                    <div
                      className="w-[6px] rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.45)] transition-all"
                      style={{
                        height: receitaAltura ? `${receitaAltura}%` : '0%',
                      }}
                    />
                    <div
                      className="w-[6px] rounded-full bg-cyan-400/90 shadow-[0_0_10px_rgba(34,211,238,0.45)] transition-all"
                      style={{
                        height: despesaAltura ? `${despesaAltura}%` : '0%',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {m.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
