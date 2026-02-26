export type ProFeature = 'annualSummary' | 'exportData'

export const PRO_FEATURES: Record<
  ProFeature,
  { title: string; description?: string }
> = {
  annualSummary: {
    title: 'Resumo anual completo',
    description: 'Veja o desempenho anual em um unico painel.',
  },
  exportData: {
    title: 'Exportacao de dados',
    description: 'Baixe seus dados para backup e suporte.',
  },
}
