type ParsedVoiceExpense = {
  valor: number
  descricao: string
  categoria: string
  formaPagamento?: string
  parcelas?: number
  data?: string
  originalText: string
}

export const calculateVoiceConfidence = (
  parsed: ParsedVoiceExpense,
): number => {
  let score = 0

  // valor sempre obrigatório
  if (parsed.valor > 0) score += 2

  // descrição minimamente relevante
  if (parsed.descricao && parsed.descricao.length > 3) {
    score += 1
  }

  // categoria detectada automaticamente
  if (parsed.categoria && parsed.categoria !== 'Outros') {
    score += 1
  }

  // forma de pagamento detectada
  if (parsed.formaPagamento) {
    score += 1
  }

  // parcelas coerentes
  if (parsed.parcelas && parsed.parcelas > 1) {
    score += 1
  }

  return score
}

const numberWords: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  sem: 100, // 🔥 erro comum de voz

}

const paymentKeywords: Record<string, string[]> = {
  'Pix': [
    'pix',
    'piks',
    'pics',
    'pic',
    'pich',
    'peix',
    'pex',
    'px',
    'fix',
  ],
  'Cartão de crédito': [
    'credito',
    'crédito',
    'cartao de credito',
    'cartao credito',
    'cartao',
  ],
  'Cartão de débito': [
    'debito',
    'débito',
    'cartao de debito',
  ],
  'Dinheiro': ['dinheiro'],
  'Boleto': ['boleto'],
}

const categoryKeywords: Array<{ category: string; keywords: string[] }> = [
  {
    category: 'Transporte',
    keywords: ['gasolina', 'etanol', 'posto', 'uber', '99', 'taxi'],
  },
  {
    category: 'Alimentação',
    keywords: ['mercado', 'supermercado', 'ifood', 'restaurante', 'lanche', 'padaria'],
  },
  {
    category: 'Moradia',
    keywords: ['aluguel', 'condominio'],
  },
  {
    category: 'Contas',
    keywords: ['luz', 'energia', 'internet', 'agua', 'telefone'],
  },
  {
    category: 'Saúde',
    keywords: ['farmacia', 'remedio', 'medicamento'],
  },
]

const actionWords = [
  'comprei',
  'paguei',
  'gastei',
  'coloquei',
  'passei',
  'fiz',
  'foi',
]

const fillerWords = [
  ...actionWords,

  'de', 'da', 'do', 'das', 'dos',
  'com', 'no', 'na', 'nos', 'nas',
  'por', 'pra', 'para', 'em',

  'um', 'uma', 'o', 'a',

  'real', 'reais',

  'parcelado', 'parcelada', 'parcelas', 'vezes', 'x',

  'credito', 'crédito', 'debito', 'débito',
]

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const parseNumberWords = (text: string): number | null => {
  const words = text.split(/\s+/)
  let total = 0
  let found = false

  for (const word of words) {
    const normalized = normalizeText(word)
    if (numberWords[normalized] !== undefined) {
      total += numberWords[normalized]
      found = true
    }
  }

  return found ? total : null
}

const parseAmount = (raw: string) => {
  const sanitized = raw.replace(/\s/g, '')
  if (!sanitized) return null

  const hasComma = sanitized.includes(',')
  const hasDot = sanitized.includes('.')

  if (hasComma && hasDot) {
    const normalized = sanitized.replace(/\./g, '').replace(',', '.')
    const value = Number(normalized)
    return Number.isFinite(value) ? value : null
  }

  if (hasComma) {
    const normalized = sanitized.replace(',', '.')
    const value = Number(normalized)
    return Number.isFinite(value) ? value : null
  }

  const value = Number(sanitized)
  return Number.isFinite(value) ? value : null
}

const suggestCategory = (normalizedText: string) => {
  const match = categoryKeywords.find(({ keywords }) =>
    keywords.some(keyword =>
      normalizedText.includes(normalizeText(keyword)),
    ),
  )
  return match?.category ?? 'Outros'
}

const detectPaymentMethod = (normalizedText: string): string | undefined => {
  const words = normalizedText.split(/\s+/)

  for (const word of words) {
    const normalizedWord = normalizeText(word)

    for (const [label, keywords] of Object.entries(paymentKeywords)) {
      for (const keyword of keywords) {
        // 🔥 Igualdade exata ou muito parecida
        if (
          normalizedWord === keyword ||
          (normalizedWord.length <= 4 &&
            normalizedWord.startsWith(keyword))
        ) {
          return label
        }
      }
    }
  }

  return undefined
}

const detectInstallments = (normalizedText: string): number | undefined => {
  // número digitado
  const digitMatch = normalizedText.match(
    /\b(?:em\s+)?(\d{1,2})\s*(x|vezes)\b/
  )

  if (digitMatch) {
    const parcelas = Number(digitMatch[1])
    if (parcelas > 1 && parcelas <= 24) return parcelas
  }

  // número por extenso
  const words = normalizedText.split(/\s+/)

  for (let i = 0; i < words.length; i++) {
    const word = normalizeText(words[i])

    if (
      numberWords[word] &&
      words[i + 1] &&
      normalizeText(words[i + 1]).startsWith('vez')
    ) {
      const parcelas = numberWords[word]
      if (parcelas > 1 && parcelas <= 24) return parcelas
    }
  }

  return undefined
}

const formatDateInput = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const detectDate = (normalizedText: string): string | undefined => {
  const today = new Date()

  if (normalizedText.includes('anteontem')) {
    const d = new Date(today)
    d.setDate(today.getDate() - 2)
    return formatDateInput(d)
  }

  if (normalizedText.includes('ontem')) {
    const d = new Date(today)
    d.setDate(today.getDate() - 1)
    return formatDateInput(d)
  }

  if (normalizedText.includes('hoje')) {
    return formatDateInput(today)
  }

  const diaMatch = normalizedText.match(/\bdia\s+(\d{1,2})\b/)
  if (diaMatch) {
    const day = Number(diaMatch[1])
    const d = new Date(today.getFullYear(), today.getMonth(), day)
    return formatDateInput(d)
  }

  return undefined
}

const sanitizeDescription = (description: string): string => {
  let cleaned = description

  cleaned = cleaned.replace(/r\$/gi, '').replace(/\brs\b/gi, '')
  cleaned = cleaned.replace(/\b\d{1,2}\s*(x|vezes)\b/gi, '')
  cleaned = cleaned.replace(/\bdia\s+\d{1,2}\b/gi, '')
  // 🔥 Remove palavras relacionadas a forma de pagamento
  for (const keywords of Object.values(paymentKeywords)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      cleaned = cleaned.replace(regex, '')
    }
  }
  const words = cleaned.split(/\s+/)

  const filtered = words.filter(word => {
    const normalized = normalizeText(word)
    return !fillerWords.includes(normalized)
  })

  cleaned = filtered.join(' ')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  cleaned = cleaned.replace(/^(um|uma|o|a)\s+/i, '')

  return cleaned
}

const detectApproximateAmount = (
  normalizedText: string,
): number | null => {
  // quase 100
  const quaseNumeroMatch = normalizedText.match(/\bquase\s+(\d+)/)
  if (quaseNumeroMatch) {
    return Number(quaseNumeroMatch[1])
  }

  // quase cem / quase cinquenta
  const quaseExtensoMatch = normalizedText.match(
    /\bquase\s+([a-z]+)/
  )

  if (quaseExtensoMatch) {
    const word = quaseExtensoMatch[1]
    if (numberWords[word] !== undefined) {
      return numberWords[word]
    }
  }

  // uns 40
  const unsMatch = normalizedText.match(/\buns?\s+(\d+)/)
  if (unsMatch) {
    return Number(unsMatch[1])
  }

  // mais ou menos 80
  const momMatch = normalizedText.match(
    /\bmais\s+ou\s+menos\s+(\d+)/
  )
  if (momMatch) {
    return Number(momMatch[1])
  }

  // 40 e pouco
  const ePoucoMatch = normalizedText.match(
    /\b(\d+)\s+e\s+pouco\b/
  )
  if (ePoucoMatch) {
    return Number(ePoucoMatch[1])
  }

  return null
}

export const parseVoiceExpenseCommand = (
  transcript: string,
): ParsedVoiceExpense | null => {
  const raw = transcript.trim()
  if (!raw) return null

  const normalizedFullText = normalizeText(raw)
  // 🔥 Remove trecho de parcelas antes de detectar valor
  const textWithoutInstallments = normalizedFullText.replace(
    /\b(?:em\s+)?\d{1,2}\s*(x|vezes)\b/,
    ''
  )

  const cleanedRaw = raw
    .replace(/r\$/gi, '')
    .replace(/\brs\b/gi, '')
    .trim()

  const amountRegex = /(\d+(?:[.,]\d+)?|\d{1,3}(?:\.\d{3})+(?:,\d+)?)/
  const amountMatch = cleanedRaw.match(amountRegex)

  let parsedAmount: number | null = null

  // 🔥 1️⃣ Primeiro tenta valor aproximado
  parsedAmount = detectApproximateAmount(textWithoutInstallments)

  // 2️⃣ Se não achou aproximado, tenta número digitado
  if (!parsedAmount && amountMatch) {
    parsedAmount = parseAmount(amountMatch[0])
  }

  // 3️⃣ Se ainda não achou, tenta por extenso
  if (!parsedAmount) {
    parsedAmount = parseNumberWords(textWithoutInstallments)
  }

  if (!parsedAmount || parsedAmount <= 0) return null

  const withoutAmount = cleanedRaw
    .replace(amountMatch?.[0] ?? '', ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const descricao = sanitizeDescription(withoutAmount)

  const categoria = suggestCategory(normalizedFullText)
  const formaPagamento = detectPaymentMethod(normalizedFullText)

  let parcelas = detectInstallments(normalizedFullText)

  if (
    parcelas &&
    (!formaPagamento ||
      !normalizeText(formaPagamento).includes('credito'))
  ) {
    parcelas = undefined
  }

  const dataDetectada = detectDate(normalizedFullText)

  return {
    valor: Number(parsedAmount.toFixed(2)),
    descricao: descricao || 'Despesa por voz',
    categoria,
    formaPagamento,
    parcelas,
    data: dataDetectada,
    originalText: raw,
  }
}

export type { ParsedVoiceExpense }