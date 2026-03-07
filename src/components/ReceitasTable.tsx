import { useMemo, useState } from 'react'
import type { Receita } from '../context/BudgetContext'
import { formatCurrency, formatDate } from '../utils/format'

type Props = {
  data: Receita[]
  onEdit: (item: Receita) => void
  onDelete: (item: Receita) => void
  disabled?: boolean
}

export function ReceitasTable({ data, onEdit, onDelete, disabled }: Props) {
  const [filter, setFilter] = useState('')
  const isDisabled = Boolean(disabled)
  const actionTitle = isDisabled ? 'Seu trial expirou' : undefined

  const filtered = useMemo(() => {
    const term = filter.toLowerCase()
    return data.filter(
      item =>
        item.fonte.toLowerCase().includes(term) ||
        item.tipo.toLowerCase().includes(term),
    )
  }, [data, filter])

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-md shadow-slate-900/30">
      {/* header + filtro */}
      <div className="flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-200">Receitas do período</p>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filtrar por fonte ou tipo"
          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none sm:w-56"
        />
      </div>

      {/* MOBILE: lista em cards */}
      <div className="block px-4 pb-4 pt-2 md:hidden">
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">
            Nenhum lançamento encontrado.
          </p>
        )}

        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">
                  {formatDate(item.data)}
                </span>
                <span className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(item.valor)}
                </span>
              </div>

              <p className="mt-1 text-sm font-medium text-slate-100">
                {item.fonte}
              </p>
              <p className="text-xs text-slate-400">{item.tipo}</p>

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
                  onClick={() => onDelete(item)}
                  disabled={isDisabled}
                  title={actionTitle}
                  className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DESKTOP: tabela normal */}
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="mt-3 w-full min-w-[640px] table-auto border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800 text-left text-slate-200">
              <th className="px-4 py-2 font-semibold">Data</th>
              <th className="px-4 py-2 font-semibold">Fonte</th>
              <th className="px-4 py-2 font-semibold">Tipo</th>
              <th className="px-4 py-2 font-semibold">Valor</th>
              <th className="px-4 py-2 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-4 text-center text-slate-400"
                >
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
            {filtered.map(item => (
              <tr
                key={item.id}
                className="border-t border-slate-800 text-slate-100"
              >
                <td className="px-4 py-2">{formatDate(item.data)}</td>
                <td className="px-4 py-2">{item.fonte}</td>
                <td className="px-4 py-2">{item.tipo}</td>
                <td className="px-4 py-2">{formatCurrency(item.valor)}</td>
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
                      onClick={() => onDelete(item)}
                      disabled={isDisabled}
                      title={actionTitle}
                      className="rounded-md px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
