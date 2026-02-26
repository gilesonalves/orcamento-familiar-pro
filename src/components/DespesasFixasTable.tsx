import { useMemo, useState } from 'react'
import type { DespesaFixa } from '../context/BudgetContext'
import { formatCurrency, formatDate } from '../utils/format'

type Props = {
  data: DespesaFixa[]
  onEdit: (item: DespesaFixa) => void
  onDelete: (id: string) => void
  disabled?: boolean
}

export function DespesasFixasTable({
  data,
  onEdit,
  onDelete,
  disabled,
}: Props) {
  const [filter, setFilter] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const isDisabled = Boolean(disabled)
  const actionTitle = isDisabled ? 'Seu trial expirou' : undefined

  const filtered = useMemo(() => {
    const term = filter.toLowerCase()
    return data.filter(
      item =>
        item.conta.toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term),
    )
  }, [data, filter])

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-md shadow-slate-900/30">
      {/* header + filtro */}
      <div className="flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-200">Despesas fixas do período</p>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filtrar por conta ou categoria"
          className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none sm:w-64"
        />
      </div>

      {/* MOBILE: cards em accordion */}
      <div className="block px-4 pb-4 pt-2 md:hidden">
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">
            Nenhuma despesa fixa cadastrada.
          </p>
        )}

        <div className="space-y-3">
          {filtered.map(item => {
            const diferenca = item.valorPrevisto - (item.valorPago || 0)
            const diferencaClass =
              diferenca > 0
                ? 'text-amber-400'
                : diferenca < 0
                  ? 'text-emerald-400'
                  : 'text-slate-200'
            const isOpen = openId === item.id

            return (
              <div
                key={item.id}
                className="rounded-lg border border-slate-800 bg-slate-950/40"
              >
                {/* Cabeçalho do accordion */}
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-xs text-slate-400">
                      {formatDate(item.dataVencimento)}
                    </span>
                    <span className="text-sm font-medium text-slate-100">
                      {item.conta}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {item.categoria || 'Sem categoria'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500">Previsto</span>
                    <span className="text-sm font-semibold text-slate-100">
                      {formatCurrency(item.valorPrevisto)}
                    </span>
                    <span className="text-xs text-emerald-400">
                      {isOpen ? 'Ocultar ▲' : 'Detalhes ▼'}
                    </span>
                  </div>
                </button>

                {/* Corpo do accordion */}
                {isOpen && (
                  <div className="border-t border-slate-800 px-3 pb-3 pt-2">
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>
                        <span className="block text-[11px] text-slate-500">
                          Pago
                        </span>
                        <span>{formatCurrency(item.valorPago || 0)}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">
                          Diferença
                        </span>
                        <span className={`font-semibold ${diferencaClass}`}>
                          {formatCurrency(diferenca)}
                        </span>
                      </div>
                    </div>

                    {item.recorrente && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-400">
                        Recorrente todo mês
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        disabled={isDisabled}
                        title={actionTitle}
                        className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        disabled={isDisabled}
                        title={actionTitle}
                        className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* DESKTOP: tabela normal */}
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="mt-3 w-full min-w-[720px] table-auto border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800 text-left text-slate-200">
              <th className="px-4 py-2 font-semibold">Vencimento</th>
              <th className="px-4 py-2 font-semibold">Conta</th>
              <th className="px-4 py-2 font-semibold">Categoria</th>
              <th className="px-4 py-2 font-semibold">Previsto</th>
              <th className="px-4 py-2 font-semibold">Pago</th>
              <th className="px-4 py-2 font-semibold">Diferença</th>
              <th className="px-4 py-2 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-4 text-center text-slate-400"
                >
                  Nenhuma despesa fixa cadastrada.
                </td>
              </tr>
            )}
            {filtered.map(item => {
              const diferenca = item.valorPrevisto - (item.valorPago || 0)
              const diferencaClass =
                diferenca > 0
                  ? 'text-amber-400'
                  : diferenca < 0
                    ? 'text-emerald-400'
                    : 'text-slate-200'
              return (
                <tr
                  key={item.id}
                  className="border-t border-slate-800 text-slate-100"
                >
                  <td className="px-4 py-2">
                    {formatDate(item.dataVencimento)}
                  </td>
                  <td className="px-4 py-2">{item.conta}</td>
                  <td className="px-4 py-2">{item.categoria}</td>
                  <td className="px-4 py-2">
                    {formatCurrency(item.valorPrevisto)}
                  </td>
                  <td className="px-4 py-2">
                    {formatCurrency(item.valorPago || 0)}
                  </td>
                  <td className={`px-4 py-2 font-semibold ${diferencaClass}`}>
                    {formatCurrency(diferenca)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(item)}
                      disabled={isDisabled}
                      title={actionTitle}
                      className="rounded-md px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      disabled={isDisabled}
                      title={actionTitle}
                      className="rounded-md px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Excluir
                    </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
