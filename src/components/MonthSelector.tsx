type Props = {
  month: number
  year: number
  onChange: (month: number, year: number) => void
}

const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function MonthSelector({ month, year, onChange }: Props) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, idx) => currentYear - 2 + idx)

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <label className="flex items-center gap-2 text-slate-100">
        Mês
        <select
          value={month}
          onChange={e => onChange(Number(e.target.value), year)}
          className="rounded-lg border border-slate-600 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {months.map((name, idx) => (
            <option key={name} value={idx}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-slate-100">
        Ano
        <select
          value={year}
          onChange={e => onChange(month, Number(e.target.value))}
          className="rounded-lg border border-slate-600 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {years.map(y => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
