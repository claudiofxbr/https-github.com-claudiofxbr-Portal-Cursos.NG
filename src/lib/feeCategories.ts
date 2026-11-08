/**
 * Definições e catálogo de taxas avulsas institucionais do PortalCursos.NG
 *
 * Mapeia categorias de taxas, labels amigáveis, valores padrão sugeridos,
 * ícones/cores e correspondência com a tabela oficial de preços (`price_table`).
 */

export interface FeeCategoryOption {
  key:
    | 'taxa_segunda_via'
    | 'taxa_biblioteca'
    | 'taxa_material'
    | 'taxa_rematricula'
    | 'taxa_diploma'
    | 'taxa_trancamento'
    | 'taxa_avulsa'
  label: string
  shortLabel: string
  description: string
  suggestedAmount: number
  /** Campo ou critério para buscar valor sugerido na tabela de preços do curso/nível */
  priceTableMatch?: 'enrollmentFee' | 'fixed' | 'monthlyFraction'
  badgeVariant?: 'default' | 'secondary' | 'outline'
  colorClass: string
}

export const INSTITUTIONAL_FEE_CATEGORIES: FeeCategoryOption[] = [
  {
    key: 'taxa_segunda_via',
    label: 'Segunda Via de Documentos',
    shortLabel: 'Segunda Via Doc',
    description: 'Histórico escolar, declarações autenticadas, ementas de disciplinas e certidões.',
    suggestedAmount: 35.0,
    priceTableMatch: 'fixed',
    colorClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  {
    key: 'taxa_biblioteca',
    label: 'Taxa / Multa de Biblioteca',
    shortLabel: 'Biblioteca',
    description: 'Multa por atraso de devolução de exemplar do acervo físico ou reposição.',
    suggestedAmount: 15.0,
    priceTableMatch: 'fixed',
    colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  {
    key: 'taxa_material',
    label: 'Material Didático & Apostilas',
    shortLabel: 'Material Didático',
    description:
      'Kit de material impresso, apostilas complementares e manuais práticos de laboratório.',
    suggestedAmount: 85.0,
    priceTableMatch: 'fixed',
    colorClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  {
    key: 'taxa_rematricula',
    label: 'Taxa de Matrícula / Rematrícula',
    shortLabel: 'Matrícula/Rematrícula',
    description: 'Taxa institucional de confirmação de matrícula ou renovação semestral avulsa.',
    suggestedAmount: 150.0,
    priceTableMatch: 'enrollmentFee',
    colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    key: 'taxa_diploma',
    label: 'Segunda Via de Certificado / Diploma',
    shortLabel: '2ª Via Certificado/Diploma',
    description:
      'Emissão de segunda via solene de certificado de extensão ou diploma de conclusão com registro.',
    suggestedAmount: 120.0,
    priceTableMatch: 'fixed',
    colorClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  {
    key: 'taxa_trancamento',
    label: 'Taxa de Trancamento / Cancelamento',
    shortLabel: 'Trancamento',
    description:
      'Processamento administrativo de trancamento de matrícula ou transferência externa.',
    suggestedAmount: 50.0,
    priceTableMatch: 'fixed',
    colorClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  {
    key: 'taxa_avulsa',
    label: 'Outras Taxas Avulsas',
    shortLabel: 'Taxa Avulsa',
    description:
      'Serviços administrativos extraordinários, segunda chamada de prova e outros requerimentos.',
    suggestedAmount: 40.0,
    priceTableMatch: 'fixed',
    colorClass: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  },
]

export const FEE_CATEGORY_MAP: Record<string, FeeCategoryOption> =
  INSTITUTIONAL_FEE_CATEGORIES.reduce(
    (acc, cur) => {
      acc[cur.key] = cur
      return acc
    },
    {} as Record<string, FeeCategoryOption>,
  )

/**
 * Retorna o label humanizado da categoria de qualquer cobrança (mensalidade, matrícula ou taxa avulsa)
 */
export function getChargeCategoryLabel(category?: string): string {
  if (!category) return 'Cobrança'
  if (FEE_CATEGORY_MAP[category]) {
    return FEE_CATEGORY_MAP[category].label
  }
  switch (category) {
    case 'mensalidade':
      return 'Mensalidade'
    case 'matricula':
      return 'Matrícula'
    case 'renegociacao':
      return 'Renegociação'
    case 'rematricula':
      return 'Rematrícula'
    case 'taxa_diploma':
      return 'Taxa de Diploma'
    case 'segunda_chamada':
      return 'Segunda Chamada'
    default:
      return category.replace(/_/g, ' ')
  }
}

/**
 * Retorna o estilo de badge (classes CSS) para a categoria da cobrança
 */
export function getChargeCategoryBadgeStyle(category?: string): string {
  if (!category) return 'bg-slate-800 text-slate-300 border-slate-700'
  if (FEE_CATEGORY_MAP[category]) {
    return FEE_CATEGORY_MAP[category].colorClass
  }
  switch (category) {
    case 'mensalidade':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'matricula':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    case 'renegociacao':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700'
  }
}

/**
 * Verifica se a cobrança é uma taxa avulsa institucional
 */
export function isInstitutionalFee(category?: string): boolean {
  if (!category) return false
  return (
    category.startsWith('taxa_') ||
    category === 'segunda_chamada' ||
    category === 'rematricula' ||
    category === 'taxa_avulsa'
  )
}
