type CsvRow = Record<string, unknown>

type DownloadOptions = {
  filename: string
  content: string
  mime?: string
}

const defaultDelimiter = ';'

const escapeCsvValue = (value: unknown, delimiter: string) => {
  if (value === null || value === undefined) return ''
  const raw = String(value)
  const needsQuotes =
    raw.includes('"') || raw.includes('\n') || raw.includes('\r') || raw.includes(delimiter)
  const escaped = raw.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

const collectHeaders = (rows: CsvRow[]) => {
  const headers: string[] = []
  const seen = new Set<string>()
  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    })
  })
  return headers
}

export const toCsv = (rows: CsvRow[], delimiter = defaultDelimiter) => {
  if (rows.length === 0) return ''
  const headers = collectHeaders(rows)
  const lines = [
    headers.map(key => escapeCsvValue(key, delimiter)).join(delimiter),
  ]

  rows.forEach(row => {
    const line = headers
      .map(header => escapeCsvValue(row[header], delimiter))
      .join(delimiter)
    lines.push(line)
  })

  return lines.join('\n')
}

export const downloadTextFile = ({
  filename,
  content,
  mime = 'text/plain;charset=utf-8',
}: DownloadOptions) => {
  if (typeof document === 'undefined') {
    throw new Error('Download indisponivel')
  }

  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(url)
}

export const exportRowsAsCsv = (
  filename: string,
  rows: CsvRow[],
  delimiter = defaultDelimiter,
) => {
  const content = toCsv(rows, delimiter)
  downloadTextFile({
    filename,
    content,
    mime: 'text/csv;charset=utf-8',
  })
}

export const downloadBudgetExport = (state: unknown) => {
  const content = JSON.stringify(state, null, 2)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `orcamento-familiar-export-${timestamp}.json`
  downloadTextFile({
    filename,
    content,
    mime: 'application/json;charset=utf-8',
  })
}

export const copyBudgetExportToClipboard = (state: unknown) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Clipboard indisponivel')
  }
  const content = JSON.stringify(state, null, 2)
  void navigator.clipboard.writeText(content)
}
