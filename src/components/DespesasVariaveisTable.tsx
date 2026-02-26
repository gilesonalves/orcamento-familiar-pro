import { useMemo, useState } from 'react'
import type { DespesaVariavel } from '../context/BudgetContext'
import { formatCurrency, formatDate } from '../utils/format'

type Props = {
  data: DespesaVariavel[]
  onEdit: (item: DespesaVariavel) => void
  onDelete: (id: string) => void
  disabled?: boolean
}

export function DespesasVariaveisTable({
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
        item.categoria.toLowerCase().includes(term) ||
        item.descricao.toLowerCase().includes(term) ||
        item.formaPagamento.toLowerCase().includes(term),
    )
  }, [data, filter])

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-md shadow-slate-900/30">
      {/* header + filtro */}
      <div className="flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-200">Despesas variáveis</p>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filtrar por categoria, descrição ou forma"
          className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-emerald-400 focus:outline-none sm:w-72"
        />
      </div>

      {/* MOBILE: accordion em cards */}
      <div className="block px-4 pb-4 pt-2 md:hidden">
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">
            Nenhuma despesa variável encontrada.
          </p>
        )}

        <div className="space-y-3">
          {filtered.map(item => {
            const isOpen = openId === item.id
            const isEssencial = item.essencial

            const borderClass = isEssencial
              ? 'border-emerald-500/60'
              : 'border-amber-500/40'

            return (
              <div
                key={item.id}
                className={`rounded-lg border ${borderClass} bg-slate-950/40`}
              >
                {/* Cabeçalho do accordion */}
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-xs text-slate-400">
                      {formatDate(item.data)}
                    </span>
                    <span className="text-sm font-medium text-slate-100">
                      {item.categoria}
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      {item.descricao}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500">Valor</span>
                    <span className="text-sm font-semibold text-slate-100">
                      {formatCurrency(item.valor)}
                    </span>
                    <span
                      className={`mt-1 inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                        isEssencial
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      {isEssencial ? 'Essencial' : 'Não essencial'}
                    </span>
                    <span className="mt-1 text-xs text-emerald-400">
                      {isOpen ? 'Ocultar ▲' : 'Detalhes ▼'}
                    </span>
                  </div>
                </button>

                {/* Corpo do accordion */}
                {isOpen && (
                  <div className="border-t border-slate-800 px-3 pb-3 pt-2 text-xs text-slate-300">
                    <div className="space-y-2">
                      <div>
                        <span className="block text-[11px] text-slate-500">
                          Descrição
                        </span>
                        <span>{item.descricao}</span>
                      </div>

                      <div>
                        <span className="block text-[11px] text-slate-500">
                          Forma de pagamento
                        </span>
                        <span>{item.formaPagamento}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
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
        <table className="mt-3 w-full min-w-[760px] table-auto border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800 text-left text-slate-200">
              <th className="px-4 py-2 font-semibold">Data</th>
              <th className="px-4 py-2 font-semibold">Categoria</th>
              <th className="px-4 py-2 font-semibold">Descrição</th>
              <th className="px-4 py-2 font-semibold">Forma</th>
              <th className="px-4 py-2 font-semibold">Valor</th>
              <th className="px-4 py-2 font-semibold">Essencial?</th>
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
                  Nenhuma despesa variável encontrada.
                </td>
              </tr>
            )}
            {filtered.map(item => (
              <tr
                key={item.id}
                className={`border-t border-slate-800 ${
                  item.essencial
                    ? 'text-slate-100'
                    : 'bg-amber-50/5 text-amber-200'
                }`}
              >
                <td className="px-4 py-2">{formatDate(item.data)}</td>
                <td className="px-4 py-2">{item.categoria}</td>
                <td className="px-4 py-2">{item.descricao}</td>
                <td className="px-4 py-2">{item.formaPagamento}</td>
                <td className="px-4 py-2">{formatCurrency(item.valor)}</td>
                <td className="px-4 py-2">
                  {item.essencial ? 'Sim' : 'Não (não essencial)'}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
