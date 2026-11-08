/**
 * Utilitários de exportação de Relatórios Gerenciais (PDF e CSV)
 * PortalCursos.NG
 */

import { CoursePerformanceData } from '@/components/relatorios/CoursePerformanceTable'

export interface ReportCategoryData {
  category: string
  label: string
  amount: number
  count: number
  percentage: number
}

export interface ReportMonthlyEvolutionData {
  monthKey: string
  monthLabel: string
  receitas: number
  despesas: number
  lucro: number
}

export interface ReportKpisData {
  receita: number
  despesas: number
  lucro: number
  defaultRate: number
  ticketMedio: number
  occupancyRate: number
  paidCount: number
  overdueCount: number
  totalEnrolled: number
  totalVacancies: number
}

export interface ReportExportPayload {
  portalName: string
  periodLabel: string
  periodKey: string
  generatedAt: Date
  generatedBy: {
    name: string
    roleTitle: string
    email: string
  }
  kpis: ReportKpisData
  courses: CoursePerformanceData[]
  categoriesChartData?: ReportCategoryData[]
  evolutionChartData?: ReportMonthlyEvolutionData[]
}

export interface StudentStatusCount {
  status: 'ativo' | 'matriculado' | 'pre_matricula' | 'trancado' | 'inativo' | 'concluido'
  label: string
  count: number
  percentage: number
}

export interface StudentCourseDistribution {
  courseId: string
  courseCode: string
  courseName: string
  level: string
  modality: string
  totalStudents: number
  newInPeriod: number
  graduacaoCount: number
  posGraduacaoCount: number
  byStatus: {
    ativo: number
    matriculado: number
    pre_matricula: number
    trancado: number
    inativo: number
    concluido: number
  }
  vacancies: number
  occupancyRate: number
}

export interface EnrollmentEvolutionPoint {
  dateKey: string
  dateLabel: string
  count: number
  graduacaoCount: number
  posCount: number
}

export interface MatriculasReportKpis {
  totalStudents: number
  newEnrollmentsInPeriod: number
  graduacaoTotal: number
  posGraduacaoTotal: number
  graduacaoInPeriod: number
  posInPeriod: number
  statusBreakdown: {
    ativo: number
    matriculado: number
    pre_matricula: number
    trancado: number
    inativo: number
    concluido: number
  }
  activeOrMatriculatedTotal: number
}

export interface MatriculasReportExportPayload {
  portalName: string
  periodLabel: string
  periodKey: string
  generatedAt: Date
  generatedBy: {
    name: string
    roleTitle: string
    email: string
  }
  kpis: MatriculasReportKpis
  coursesDistribution: StudentCourseDistribution[]
  evolutionChartData: EnrollmentEvolutionPoint[]
  statusChartData: StudentStatusCount[]
  detailedStudents?: Array<{
    id: string
    fullName: string
    cpf: string
    email: string
    courseName: string
    type: string
    status: string
    enrolledAt: string
    createdAt?: string
  }>
}

export type DebtAgingBracketKey = 'ate_30' | '31_60' | '61_90' | 'mais_90'

export interface DebtAgingBracket {
  key: DebtAgingBracketKey
  label: string
  shortLabel: string
  minDays: number
  maxDays: number | null
  amount: number
  count: number
  percentage: number
  color: string
}

export interface InadimplenciaEvolutionPoint {
  dateKey: string
  dateLabel: string
  overdueAmount: number
  overdueCount: number
}

export interface InadimplenteStudentRanking {
  studentId: string
  studentName: string
  studentCpf: string
  courseName?: string
  totalDue: number
  overdueCount: number
  maxDaysOverdue: number
  earliestDueDate: string
}

export interface DetailedOverdueCharge {
  id: string
  code: string
  studentId: string
  studentName: string
  studentCpf: string
  category: string
  categoryLabel: string
  description: string
  amount: number
  dueDate: string
  daysOverdue: number
  agingBracket: DebtAgingBracketKey
  method?: string
  status: string
}

export interface InadimplenciaKpis {
  totalOverdueAmount: number
  overdueCount: number
  defaultingStudentsCount: number
  averageDebtPerStudent: number
  averageDebtPerCharge: number
  totalPendingInPeriod: number
  defaultRateInPeriod: number
}

export interface InadimplenciaReportExportPayload {
  portalName: string
  periodLabel: string
  periodKey: string
  generatedAt: Date
  generatedBy: {
    name: string
    roleTitle: string
    email: string
  }
  kpis: InadimplenciaKpis
  agingBrackets: DebtAgingBracket[]
  evolutionData: InadimplenciaEvolutionPoint[]
  studentRanking: InadimplenteStudentRanking[]
  charges: DetailedOverdueCharge[]
}

const ALLOWED_EXPORT_ROLES = new Set(['root', 'admin', 'financeiro', 'coordenador', 'professor'])

/** Valida se o usuário tem permissão para exportar relatórios */
export function canUserExportReports(role?: string): boolean {
  if (!role) return false
  return ALLOWED_EXPORT_ROLES.has(role)
}

/** Formata valor numérico para Moeda BRL (R$ 1.234,56) */
export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0)
}

/** Formata percentual (ex: 12,5%) */
export const formatPercent = (val: number): string => {
  return `${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

/** Formata data/hora para pt-BR */
export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

/** Sanitiza nome de arquivo */
const sanitizeFilenamePart = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
}

/**
 * Gera e dispara download de arquivo CSV formatado com BOM UTF-8 (compatível com Excel)
 * e separador ponto-e-vírgula (;), padrão para Excel em português.
 */
export function exportReportToCsv(payload: ReportExportPayload): void {
  const { portalName, periodLabel, generatedAt, generatedBy, kpis, courses } = payload

  const lines: string[] = []

  // Helper para escapar strings no formato CSV
  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  // 1. Cabeçalho de Metadados
  lines.push(`${escapeCell(portalName)};${escapeCell('Relatório Gerencial Financeiro & Ocupação')}`)
  lines.push(`${escapeCell('Período Analisado')};${escapeCell(periodLabel)}`)
  lines.push(`${escapeCell('Data e Hora de Geração')};${escapeCell(formatDateTime(generatedAt))}`)
  lines.push(
    `${escapeCell('Gerado por')};${escapeCell(`${generatedBy.name} (${generatedBy.roleTitle}) - ${generatedBy.email}`)}`,
  )
  lines.push('') // Linha em branco

  // 2. Seção de KPIs Principais
  lines.push(`${escapeCell('--- INDICADORES CHAVE DE DESEMPENHO (KPIS) ---')};;;;`)
  lines.push(
    [
      escapeCell('Indicador'),
      escapeCell('Valor Formatado'),
      escapeCell('Valor Numérico'),
      escapeCell('Detalhes Complementares'),
    ].join(';'),
  )

  const kpiRows: Array<[string, string, number, string]> = [
    [
      'Receita Líquida Realizada',
      formatCurrency(kpis.receita),
      kpis.receita,
      `${kpis.paidCount} títulos liquidados no período`,
    ],
    [
      'Despesas Operacionais Pagas',
      formatCurrency(kpis.despesas),
      kpis.despesas,
      'Custos operacionais liquidados no período',
    ],
    [
      'Resultado Operacional (Lucro / Superávit)',
      formatCurrency(kpis.lucro),
      kpis.lucro,
      `Margem: ${kpis.receita > 0 ? ((kpis.lucro / kpis.receita) * 100).toFixed(1) : '0.0'}%`,
    ],
    [
      'Taxa de Inadimplência',
      formatPercent(kpis.defaultRate),
      Number(kpis.defaultRate.toFixed(2)),
      `${kpis.overdueCount} títulos em atraso`,
    ],
    [
      'Ticket Médio por Título Pago',
      formatCurrency(kpis.ticketMedio),
      kpis.ticketMedio,
      'Receita total dividida por títulos pagos',
    ],
    [
      'Taxa de Ocupação Global',
      formatPercent(kpis.occupancyRate),
      Number(kpis.occupancyRate.toFixed(2)),
      `${kpis.totalEnrolled} alunos de ${kpis.totalVacancies} vagas autorizadas`,
    ],
  ]

  for (const [title, formatted, num, details] of kpiRows) {
    lines.push(
      [
        escapeCell(title),
        escapeCell(formatted),
        escapeCell(num.toFixed(2).replace('.', ',')),
        escapeCell(details),
      ].join(';'),
    )
  }

  lines.push('') // Linha em branco
  lines.push('') // Linha em branco

  // 3. Tabela de Desempenho por Curso
  lines.push(`${escapeCell('--- DESEMPENHO INDIVIDUAL POR CURSO ---')};;;;;;;;;`)
  lines.push(
    [
      escapeCell('Código'),
      escapeCell('Curso'),
      escapeCell('Nível'),
      escapeCell('Modalidade'),
      escapeCell('Vagas Autorizadas'),
      escapeCell('Matriculados'),
      escapeCell('Taxa de Ocupação (%)'),
      escapeCell('Receita Realizada (R$)'),
      escapeCell('Inadimplência (%)'),
      escapeCell('Valor em Atraso (R$)'),
      escapeCell('Ticket Médio (R$)'),
    ].join(';'),
  )

  for (const c of courses) {
    lines.push(
      [
        escapeCell(c.courseCode),
        escapeCell(c.courseName),
        escapeCell(c.level.replace('_', ' ')),
        escapeCell(c.modality.toUpperCase()),
        escapeCell(c.vacancies),
        escapeCell(c.enrolledStudents),
        escapeCell(c.occupancyRate.toFixed(1).replace('.', ',') + '%'),
        escapeCell(c.revenue.toFixed(2).replace('.', ',')),
        escapeCell(c.defaultRate.toFixed(1).replace('.', ',') + '%'),
        escapeCell(c.pendingAmount.toFixed(2).replace('.', ',')),
        escapeCell(c.ticketMedio.toFixed(2).replace('.', ',')),
      ].join(';'),
    )
  }

  lines.push('')
  lines.push(
    `${escapeCell('Relatório gerado automaticamente pelo PortalCursos.NG')} - ${escapeCell(formatDateTime(generatedAt))}`,
  )

  // Monta o arquivo CSV com BOM UTF-8 (\uFEFF) para compatibilidade nativa com Excel
  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  const dateStr = generatedAt.toISOString().slice(0, 10)
  const periodStr = sanitizeFilenamePart(payload.periodKey || payload.periodLabel)
  const filename = `relatorio_financeiro_${periodStr}_${dateStr}.csv`

  triggerDownload(blob, filename)
}

/**
 * Gera e dispara download de arquivo CSV formatado com BOM UTF-8 e separador ';'
 * para o Relatório de Matrículas e Alunos (KPIs, distribuição por curso e detalhamento de alunos).
 */
export function exportMatriculasReportToCsv(payload: MatriculasReportExportPayload): void {
  const {
    portalName,
    periodLabel,
    generatedAt,
    generatedBy,
    kpis,
    coursesDistribution,
    detailedStudents = [],
  } = payload

  const lines: string[] = []

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  // 1. Metadados
  lines.push(
    `${escapeCell(portalName)};${escapeCell('Relatório Gerencial de Matrículas e Alunos')}`,
  )
  lines.push(`${escapeCell('Período Analisado')};${escapeCell(periodLabel)}`)
  lines.push(`${escapeCell('Data e Hora de Geração')};${escapeCell(formatDateTime(generatedAt))}`)
  lines.push(
    `${escapeCell('Gerado por')};${escapeCell(`${generatedBy.name} (${generatedBy.roleTitle}) - ${generatedBy.email}`)}`,
  )
  lines.push('')

  // 2. KPIs
  lines.push(`${escapeCell('--- INDICADORES GERAIS DE ALUNOS E MATRÍCULAS ---')};;;`)
  lines.push(
    [escapeCell('Indicador'), escapeCell('Quantidade'), escapeCell('Segmentação / Detalhe')].join(
      ';',
    ),
  )

  const kpisList: Array<[string, number, string]> = [
    ['Total de Alunos na Base', kpis.totalStudents, 'Base acumulada de alunos cadastrados'],
    [
      'Novas Matrículas no Período',
      kpis.newEnrollmentsInPeriod,
      `Matriculados/criados durante "${periodLabel}"`,
    ],
    [
      'Total Alunos - Graduação',
      kpis.graduacaoTotal,
      `${kpis.totalStudents > 0 ? ((kpis.graduacaoTotal / kpis.totalStudents) * 100).toFixed(1) : 0}% da base`,
    ],
    [
      'Total Alunos - Pós-Graduação',
      kpis.posGraduacaoTotal,
      `${kpis.totalStudents > 0 ? ((kpis.posGraduacaoTotal / kpis.totalStudents) * 100).toFixed(1) : 0}% da base`,
    ],
    ['Novas Matrículas no Período - Graduação', kpis.graduacaoInPeriod, 'Novas no período'],
    ['Novas Matrículas no Período - Pós-Graduação', kpis.posInPeriod, 'Novas no período'],
    ['Status: Ativos / Matriculados', kpis.activeOrMatriculatedTotal, 'Com acesso ativo ao portal'],
    [
      'Status: Pré-Matrícula',
      kpis.statusBreakdown.pre_matricula,
      'Aguardando validação ou pagamento',
    ],
    ['Status: Trancados', kpis.statusBreakdown.trancado, 'Matrícula trancada'],
    ['Status: Inativos', kpis.statusBreakdown.inativo, 'Cadastros inativos'],
    ['Status: Concluídos', kpis.statusBreakdown.concluido, 'Formados / graduados'],
  ]

  for (const [title, qty, desc] of kpisList) {
    lines.push([escapeCell(title), escapeCell(qty), escapeCell(desc)].join(';'))
  }

  lines.push('')
  lines.push('')

  // 3. Distribuição por Curso
  lines.push(`${escapeCell('--- DISTRIBUIÇÃO DE ALUNOS POR CURSO E STATUS ---')};;;;;;;;;;;`)
  lines.push(
    [
      escapeCell('Código'),
      escapeCell('Curso'),
      escapeCell('Nível'),
      escapeCell('Modalidade'),
      escapeCell('Total Alunos'),
      escapeCell('Novos no Período'),
      escapeCell('Graduação'),
      escapeCell('Pós-Graduação'),
      escapeCell('Ativo/Matriculado'),
      escapeCell('Pré-Matrícula'),
      escapeCell('Trancado'),
      escapeCell('Inativo/Concluído'),
      escapeCell('Vagas Autorizadas'),
      escapeCell('Taxa de Ocupação (%)'),
    ].join(';'),
  )

  for (const c of coursesDistribution) {
    const active = (c.byStatus.ativo || 0) + (c.byStatus.matriculado || 0)
    const inactiveConcluded = (c.byStatus.inativo || 0) + (c.byStatus.concluido || 0)
    lines.push(
      [
        escapeCell(c.courseCode),
        escapeCell(c.courseName),
        escapeCell(c.level.replace('_', ' ')),
        escapeCell(c.modality.toUpperCase()),
        escapeCell(c.totalStudents),
        escapeCell(c.newInPeriod),
        escapeCell(c.graduacaoCount),
        escapeCell(c.posGraduacaoCount),
        escapeCell(active),
        escapeCell(c.byStatus.pre_matricula || 0),
        escapeCell(c.byStatus.trancado || 0),
        escapeCell(inactiveConcluded),
        escapeCell(c.vacancies),
        escapeCell(c.occupancyRate.toFixed(1).replace('.', ',') + '%'),
      ].join(';'),
    )
  }

  // 4. Detalhamento de Alunos Cadastrados
  if (detailedStudents.length > 0) {
    lines.push('')
    lines.push('')
    lines.push(`${escapeCell('--- LISTA DETALHADA DE ALUNOS ---')};;;;;;;`)
    lines.push(
      [
        escapeCell('Nome do Aluno'),
        escapeCell('CPF'),
        escapeCell('E-mail'),
        escapeCell('Curso'),
        escapeCell('Tipo'),
        escapeCell('Status'),
        escapeCell('Data Matrícula'),
        escapeCell('Data de Cadastro'),
      ].join(';'),
    )

    for (const s of detailedStudents) {
      lines.push(
        [
          escapeCell(s.fullName),
          escapeCell(s.cpf),
          escapeCell(s.email),
          escapeCell(s.courseName),
          escapeCell(s.type === 'graduacao' ? 'Graduação' : 'Pós-Graduação'),
          escapeCell(s.status),
          escapeCell(s.enrolledAt),
          escapeCell(s.createdAt ? s.createdAt.slice(0, 10) : s.enrolledAt),
        ].join(';'),
      )
    }
  }

  lines.push('')
  lines.push(
    `${escapeCell('Relatório gerado automaticamente pelo PortalCursos.NG')} - ${escapeCell(formatDateTime(generatedAt))}`,
  )

  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const dateStr = generatedAt.toISOString().slice(0, 10)
  const periodStr = sanitizeFilenamePart(payload.periodKey || payload.periodLabel)
  const filename = `relatorio_matriculas_alunos_${periodStr}_${dateStr}.csv`

  triggerDownload(blob, filename)
}

/**
 * Gera e dispara impressão / download em PDF com layout profissional institucional.
 * Utiliza janela de impressão isolada formatada com folha A4 e CSS de alta precisão
 * (incluindo quebra de página controlada, tabela zebrada, cores institucionais e metadados).
 */
export function exportReportToPdf(payload: ReportExportPayload): void {
  const {
    portalName,
    periodLabel,
    generatedAt,
    generatedBy,
    kpis,
    courses,
    categoriesChartData = [],
    evolutionChartData = [],
  } = payload

  const formattedDate = formatDateTime(generatedAt)
  const dateStr = generatedAt.toISOString().slice(0, 10)
  const periodStr = sanitizeFilenamePart(payload.periodKey || payload.periodLabel)
  const documentTitle = `Relatorio_Gerencial_${periodStr}_${dateStr}`

  // Gera SVG para Evolução Financeira
  const evolutionChartSvg = generateEvolutionChartSvg(evolutionChartData)

  // Gera SVG para Distribuição por Categoria
  const categoriesChartSvg = generateCategoriesChartSvg(categoriesChartData)

  // Monta linhas da tabela de cursos
  const coursesRowsHtml = courses
    .map((c, idx) => {
      let statusColor = '#059669' // green
      let statusBg = '#ecfdf5'
      if (c.occupancyRate < 50) {
        statusColor = '#e11d48' // red
        statusBg = '#fff1f2'
      } else if (c.occupancyRate < 75) {
        statusColor = '#d97706' // amber
        statusBg = '#fffbeb'
      }

      const defaultRateColor = c.defaultRate > 10 ? '#e11d48' : '#334155'

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">
            <div>${escapeHtml(c.courseName)}</div>
            <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 2px;">
              <span style="font-family: monospace; font-weight: 600;">${escapeHtml(c.courseCode)}</span> • 
              <span style="text-transform: capitalize;">${escapeHtml(c.level.replace('_', ' '))}</span> • 
              <span style="text-transform: uppercase;">${escapeHtml(c.modality)}</span>
            </div>
          </td>
          <td style="padding: 8px 10px; text-align: center; color: #334155; font-size: 11px;">
            <strong>${c.enrolledStudents}</strong> <span style="color: #94a3b8;">/ ${c.vacancies}</span>
          </td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; color: ${statusColor}; background-color: ${statusBg};">
              ${c.occupancyRate.toFixed(1)}%
            </span>
          </td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #059669; font-size: 11px;">
            ${formatCurrency(c.revenue)}
          </td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: ${defaultRateColor}; font-size: 11px;">
            ${c.defaultRate.toFixed(1)}%
            ${c.pendingAmount > 0 ? `<div style="font-size: 9px; color: #94a3b8; font-weight: normal;">${formatCurrency(c.pendingAmount)}</div>` : ''}
          </td>
          <td style="padding: 8px 10px; text-align: right; color: #334155; font-family: monospace; font-size: 11px;">
            ${formatCurrency(c.ticketMedio)}
          </td>
        </tr>
      `
    })
    .join('')

  const printWindow = window.open('', '_blank', 'width=1000,height=900')
  if (!printWindow) {
    alert(
      'O navegador bloqueou a abertura da janela para geração do PDF. Por favor, permita pop-ups para este site.',
    )
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${documentTitle}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 14mm 14mm 14mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background-color: #ffffff;
          margin: 0;
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid #0284c7;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .brand-title {
          font-size: 20px;
          font-weight: 800;
          color: #0284c7;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .report-subtitle {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-top: 2px;
        }
        .meta-box {
          text-align: right;
          font-size: 10.5px;
          color: #64748b;
          line-height: 1.4;
        }
        .meta-box strong {
          color: #1e293b;
        }
        .badge-period {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          margin-bottom: 4px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0369a1;
          margin: 16px 0 8px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        .kpi-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
          background: #f8fafc;
        }
        .kpi-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.3px;
        }
        .kpi-value {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 4px 0 2px 0;
        }
        .kpi-sub {
          font-size: 10px;
          color: #64748b;
        }
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .chart-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          background: #ffffff;
        }
        .chart-header {
          margin-bottom: 6px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 4px;
        }
        .chart-title {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .chart-desc {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 1px;
        }
        .chart-container {
          width: 100%;
          height: auto;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .page-break-section {
          page-break-before: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-top: 6px;
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        th {
          background-color: #f1f5f9;
          color: #475569;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          padding: 8px 10px;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          border-bottom: 1px solid #e2e8f0;
        }
        .footer {
          margin-top: 24px;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #f1f5f9; padding: 12px 16px; margin-bottom: 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13px; color: #1e293b; font-weight: 600;">
          Visualização para Impressão e Salvamento em PDF
        </span>
        <div>
          <button onclick="window.print()" style="background: #0284c7; color: #ffffff; border: none; padding: 6px 14px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12px; margin-right: 8px;">
            Imprimir / Salvar PDF
          </button>
          <button onclick="window.close()" style="background: #e2e8f0; color: #475569; border: none; padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12px;">
            Fechar
          </button>
        </div>
      </div>

      <div class="header">
        <div>
          <div class="brand-title">${escapeHtml(portalName)}</div>
          <div class="report-subtitle">Relatório Executivo Financeiro e Desempenho de Cursos</div>
        </div>
        <div class="meta-box">
          <div class="badge-period">Período: ${escapeHtml(periodLabel)}</div>
          <div>Gerado em: <strong>${formattedDate}</strong></div>
          <div>Emissor: <strong>${escapeHtml(generatedBy.name)}</strong> (${escapeHtml(generatedBy.roleTitle)})</div>
        </div>
      </div>

      <div class="section-title">
        <span>1. Indicadores Chave de Desempenho (KPIs)</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Receita Líquida Realizada</div>
          <div class="kpi-value" style="color: #059669;">${formatCurrency(kpis.receita)}</div>
          <div class="kpi-sub">${kpis.paidCount} títulos liquidados</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Despesas Operacionais Pagas</div>
          <div class="kpi-value" style="color: #e11d48;">${formatCurrency(kpis.despesas)}</div>
          <div class="kpi-sub">Total de saídas no período</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Resultado / Lucro Operacional</div>
          <div class="kpi-value" style="color: ${kpis.lucro >= 0 ? '#0284c7' : '#e11d48'};">
            ${formatCurrency(kpis.lucro)}
          </div>
          <div class="kpi-sub">Margem: ${kpis.receita > 0 ? ((kpis.lucro / kpis.receita) * 100).toFixed(1) : '0.0'}%</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Inadimplência da Carteira</div>
          <div class="kpi-value" style="color: ${kpis.defaultRate > 10 ? '#e11d48' : '#0f172a'};">
            ${formatPercent(kpis.defaultRate)}
          </div>
          <div class="kpi-sub">${kpis.overdueCount} títulos em atraso</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Ticket Médio por Título</div>
          <div class="kpi-value">${formatCurrency(kpis.ticketMedio)}</div>
          <div class="kpi-sub">Receita / Títulos pagos</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Taxa de Ocupação Geral</div>
          <div class="kpi-value">${formatPercent(kpis.occupancyRate)}</div>
          <div class="kpi-sub">${kpis.totalEnrolled} de ${kpis.totalVacancies} vagas autorizadas</div>
        </div>
      </div>

      <div class="section-title">
        <span>2. Análise Gráfica: Evolução Financeira & Distribuição</span>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Evolução Temporal: Receitas vs. Despesas</div>
            <div class="chart-desc">Comparativo de liquidação de mensalidades e custos operacionais</div>
          </div>
          <div class="chart-container">
            ${evolutionChartSvg}
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Distribuição de Receitas por Categoria</div>
            <div class="chart-desc">Origem da arrecadação líquida no período selecionado</div>
          </div>
          <div class="chart-container">
            ${categoriesChartSvg}
          </div>
        </div>
      </div>

      <div class="section-title page-break-section">
        <span>3. Desempenho e Rentabilidade por Curso</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Curso & Nível</th>
            <th style="text-align: center;">Matriculados</th>
            <th style="text-align: center;">Ocupação</th>
            <th style="text-align: right;">Receita Realizada</th>
            <th style="text-align: right;">Inadimplência</th>
            <th style="text-align: right;">Ticket Médio</th>
          </tr>
        </thead>
        <tbody>
          ${coursesRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>${escapeHtml(portalName)} • Sistema Integrado de Gestão Acadêmica e Financeira</div>
        <div>Documento Oficial • Autenticado digitalmente por ${escapeHtml(generatedBy.email)}</div>
      </div>

      <script>
        // Dispara a caixa de impressão automaticamente assim que carregar
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

const CATEGORY_COLORS = [
  '#0284c7', // sky-600
  '#0d9488', // teal-600
  '#f59e0b', // amber-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
  '#10b981', // emerald-500
]

/**
 * Gera um SVG vetorial de alta nitidez para a Evolução Temporal (Receitas vs Despesas e Lucro).
 * Suporta barras comparativas lado a lado e linha pontilhada de lucro operacional.
 */
function generateEvolutionChartSvg(data: ReportMonthlyEvolutionData[]): string {
  if (!data || data.length === 0) {
    return `<div style="height: 180px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px;">Sem dados de evolução financeira disponíveis.</div>`
  }

  const width = 450
  const height = 200
  const padding = { top: 22, right: 15, bottom: 42, left: 48 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  // Encontra valor máximo para a escala do eixo Y
  const maxVal = Math.max(
    1000,
    ...data.map((d) => Math.max(d.receitas, d.despesas, Math.max(0, d.lucro))),
  )
  // Arredonda para cima em múltiplos amigáveis
  const yMax = Math.ceil(maxVal * 1.15)
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax]

  const getY = (val: number) => {
    const clamped = Math.max(0, val)
    return padding.top + chartH - (clamped / yMax) * chartH
  }

  // Linhas horizontais de grade e rótulos do eixo Y
  const gridLines = yTicks
    .map((tickVal) => {
      const y = getY(tickVal)
      const formatted =
        tickVal >= 1000 ? `R$ ${(tickVal / 1000).toFixed(0)}k` : `R$ ${tickVal.toFixed(0)}`
      return `
        <line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${padding.left + chartW}" y2="${y.toFixed(1)}" stroke="#f1f5f9" stroke-width="1" />
        <text x="${padding.left - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${formatted}</text>
      `
    })
    .join('')

  const n = data.length
  const slotW = chartW / n
  const barW = Math.max(8, Math.min(22, slotW * 0.3))
  const barGap = 2

  let barsHtml = ''
  let xAxisHtml = ''
  const profitPoints: Array<{ x: number; y: number; val: number }> = []

  data.forEach((d, idx) => {
    const slotCenterX = padding.left + idx * slotW + slotW / 2
    const receitaX = slotCenterX - barW - barGap / 2
    const despesaX = slotCenterX + barGap / 2

    const receitaY = getY(d.receitas)
    const receitaH = Math.max(0, padding.top + chartH - receitaY)

    const despesaY = getY(d.despesas)
    const despesaH = Math.max(0, padding.top + chartH - despesaY)

    const profitY = getY(d.lucro)
    profitPoints.push({ x: slotCenterX, y: profitY, val: d.lucro })

    barsHtml += `
      <!-- Barra Receita -->
      <rect x="${receitaX.toFixed(1)}" y="${receitaY.toFixed(1)}" width="${barW}" height="${receitaH.toFixed(1)}" fill="#0284c7" rx="2" />
      <!-- Barra Despesa -->
      <rect x="${despesaX.toFixed(1)}" y="${despesaY.toFixed(1)}" width="${barW}" height="${despesaH.toFixed(1)}" fill="#e11d48" rx="2" />
    `

    // Rótulo do Eixo X
    xAxisHtml += `
      <text x="${slotCenterX.toFixed(1)}" y="${(padding.top + chartH + 13).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        ${escapeHtml(d.monthLabel)}
      </text>
    `
  })

  // Linha de lucro pontilhada
  let profitLinePath = ''
  let profitDotsHtml = ''
  if (profitPoints.length > 1) {
    profitLinePath = profitPoints.reduce((acc, pt, i) => {
      return i === 0
        ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
        : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
    }, '')

    profitDotsHtml = profitPoints
      .map(
        (pt) =>
          `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="2.5" fill="#10b981" stroke="#ffffff" stroke-width="1" />`,
      )
      .join('')
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="180" style="display: block; max-width: 100%; overflow: visible;" xmlns="http://www.w3.org/2000/svg">
      <!-- Grade de Fundo -->
      ${gridLines}

      <!-- Eixo X Base -->
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1" />

      <!-- Barras de Receita e Despesa -->
      ${barsHtml}

      <!-- Linha de Lucro -->
      ${profitLinePath ? `<path d="${profitLinePath}" fill="none" stroke="#10b981" stroke-width="1.8" stroke-dasharray="3,3" />` : ''}
      ${profitDotsHtml}

      <!-- Rótulos X -->
      ${xAxisHtml}

      <!-- Legenda Superior -->
      <g transform="translate(${padding.left}, 10)">
        <rect x="0" y="0" width="8" height="8" rx="1.5" fill="#0284c7" />
        <text x="12" y="7" font-size="8" fill="#334155" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Receita</text>

        <rect x="70" y="0" width="8" height="8" rx="1.5" fill="#e11d48" />
        <text x="82" y="7" font-size="8" fill="#334155" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Despesas</text>

        <line x1="145" y1="4" x2="160" y2="4" stroke="#10b981" stroke-width="2" stroke-dasharray="3,2" />
        <circle cx="152.5" cy="4" r="2" fill="#10b981" />
        <text x="165" y="7" font-size="8" fill="#334155" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Lucro Líquido</text>
      </g>
    </svg>
  `
}

/**
 * Gera um SVG vetorial de alta nitidez para a Distribuição de Receitas por Categoria
 * (barras horizontais proporcionais com valores e percentuais fiéis ao período selecionado).
 */
function generateCategoriesChartSvg(data: ReportCategoryData[]): string {
  if (!data || data.length === 0) {
    return `<div style="height: 180px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px;">Sem dados de receita no período selecionado.</div>`
  }

  const width = 450
  const height = 200
  const padding = { top: 18, right: 80, bottom: 20, left: 105 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  // Considera até as 5 categorias mais relevantes para caber perfeitamente no quadro
  const displayData = data.slice(0, 5)
  const maxAmount = Math.max(1, ...displayData.map((d) => d.amount))
  const totalAmount = displayData.reduce((acc, d) => acc + d.amount, 0) || 1

  const rowCount = displayData.length
  const rowH = chartH / rowCount
  const barH = Math.min(16, rowH * 0.55)

  let rowsHtml = ''

  displayData.forEach((d, idx) => {
    const yCenter = padding.top + idx * rowH + rowH / 2
    const barY = yCenter - barH / 2
    const barWidth = Math.max(2, (d.amount / maxAmount) * chartW)
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
    const pct = d.percentage || (d.amount / totalAmount) * 100
    const formattedVal = `R$ ${d.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

    rowsHtml += `
      <!-- Linha guia sutil -->
      <line x1="${padding.left}" y1="${(padding.top + (idx + 1) * rowH).toFixed(1)}" x2="${padding.left + chartW}" y2="${(padding.top + (idx + 1) * rowH).toFixed(1)}" stroke="#f8fafc" stroke-width="1" />

      <!-- Rótulo da Categoria (Y) -->
      <text x="${padding.left - 8}" y="${(yCenter + 3.5).toFixed(1)}" text-anchor="end" font-size="8.5" font-weight="600" fill="#334155" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        ${escapeHtml(d.label)}
      </text>

      <!-- Fundo sutil da barra (trilho) -->
      <rect x="${padding.left}" y="${barY.toFixed(1)}" width="${chartW}" height="${barH}" fill="#f1f5f9" rx="3" />

      <!-- Barra de Valor -->
      <rect x="${padding.left}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH}" fill="${color}" rx="3" />

      <!-- Valor monetário e percentual à direita da barra -->
      <text x="${(padding.left + barWidth + 6).toFixed(1)}" y="${(yCenter + 3.5).toFixed(1)}" font-size="8.5" font-weight="700" fill="#1e293b" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        ${formattedVal} <tspan fill="#64748b" font-weight="normal" font-size="7.5">(${pct.toFixed(1)}%)</tspan>
      </text>
    `
  })

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="180" style="display: block; max-width: 100%;" xmlns="http://www.w3.org/2000/svg">
      <!-- Eixo Vertical -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1" />

      <!-- Linhas e Barras -->
      ${rowsHtml}

      <!-- Eixo Inferior de Fundo -->
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1" />
    </svg>
  `
}

/**
 * Gera um SVG vetorial para o gráfico de evolução de novas matrículas ao longo do tempo.
 */
function generateEnrollmentEvolutionChartSvg(data: EnrollmentEvolutionPoint[]): string {
  if (!data || data.length === 0) {
    return `<div style="height: 180px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px;">Sem dados de matrículas no período selecionado.</div>`
  }

  const width = 450
  const height = 200
  const padding = { top: 22, right: 15, bottom: 42, left: 35 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxVal = Math.max(5, ...data.map((d) => d.count))
  const yMax = Math.ceil(maxVal * 1.2)
  const yTicks = [0, Math.ceil(yMax * 0.25), Math.ceil(yMax * 0.5), Math.ceil(yMax * 0.75), yMax]

  const getY = (val: number) => {
    const clamped = Math.max(0, val)
    return padding.top + chartH - (clamped / yMax) * chartH
  }

  const gridLines = yTicks
    .map((tickVal) => {
      const y = getY(tickVal)
      return `
        <line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${padding.left + chartW}" y2="${y.toFixed(1)}" stroke="#f1f5f9" stroke-width="1" />
        <text x="${padding.left - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${tickVal}</text>
      `
    })
    .join('')

  const n = data.length
  const slotW = chartW / n
  const barW = Math.max(6, Math.min(22, slotW * 0.45))

  let barsHtml = ''
  let xAxisHtml = ''
  const linePoints: Array<{ x: number; y: number; val: number }> = []

  data.forEach((d, idx) => {
    const slotCenterX = padding.left + idx * slotW + slotW / 2
    const barX = slotCenterX - barW / 2
    const barY = getY(d.count)
    const barH = Math.max(0, padding.top + chartH - barY)

    linePoints.push({ x: slotCenterX, y: barY, val: d.count })

    barsHtml += `
      <rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW}" height="${barH.toFixed(1)}" fill="#0284c7" rx="2" />
      ${d.count > 0 ? `<text x="${slotCenterX.toFixed(1)}" y="${(barY - 3).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#0369a1">${d.count}</text>` : ''}
    `

    xAxisHtml += `
      <text x="${slotCenterX.toFixed(1)}" y="${(padding.top + chartH + 13).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="600" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        ${escapeHtml(d.dateLabel)}
      </text>
    `
  })

  let linePath = ''
  let dotsHtml = ''
  if (linePoints.length > 1) {
    linePath = linePoints.reduce((acc, pt, i) => {
      return i === 0
        ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
        : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
    }, '')

    dotsHtml = linePoints
      .map(
        (pt) =>
          `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="2.5" fill="#0284c7" stroke="#ffffff" stroke-width="1" />`,
      )
      .join('')
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="180" style="display: block; max-width: 100%; overflow: visible;" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1" />
      ${barsHtml}
      ${linePath ? `<path d="${linePath}" fill="none" stroke="#0369a1" stroke-width="1.5" />` : ''}
      ${dotsHtml}
      ${xAxisHtml}
      <g transform="translate(${padding.left}, 10)">
        <rect x="0" y="0" width="8" height="8" rx="1.5" fill="#0284c7" />
        <text x="12" y="7" font-size="8" fill="#334155" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">Matrículas Realizadas</text>
      </g>
    </svg>
  `
}

/**
 * Gera um SVG vetorial para a distribuição de alunos por status.
 */
function generateStatusChartSvg(data: StudentStatusCount[]): string {
  if (!data || data.length === 0) {
    return `<div style="height: 180px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px;">Sem dados de status disponíveis.</div>`
  }

  const width = 450
  const height = 200
  const padding = { top: 18, right: 70, bottom: 20, left: 110 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxCount = Math.max(1, ...data.map((d) => d.count))
  const totalCount = data.reduce((acc, d) => acc + d.count, 0) || 1

  const rowCount = data.length
  const rowH = chartH / rowCount
  const barH = Math.min(16, rowH * 0.55)

  const statusColors: Record<string, string> = {
    ativo: '#059669',
    matriculado: '#0284c7',
    pre_matricula: '#d97706',
    trancado: '#ea580c',
    inativo: '#64748b',
    concluido: '#8b5cf6',
  }

  let rowsHtml = ''

  data.forEach((d, idx) => {
    const yCenter = padding.top + idx * rowH + rowH / 2
    const barY = yCenter - barH / 2
    const barWidth = Math.max(2, (d.count / maxCount) * chartW)
    const color = statusColors[d.status] || '#0284c7'
    const pct = d.percentage || (d.count / totalCount) * 100

    rowsHtml += `
      <line x1="${padding.left}" y1="${(padding.top + (idx + 1) * rowH).toFixed(1)}" x2="${padding.left + chartW}" y2="${(padding.top + (idx + 1) * rowH).toFixed(1)}" stroke="#f8fafc" stroke-width="1" />
      <text x="${padding.left - 8}" y="${(yCenter + 3.5).toFixed(1)}" text-anchor="end" font-size="8.5" font-weight="600" fill="#334155" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        ${escapeHtml(d.label)}
      </text>
      <rect x="${padding.left}" y="${barY.toFixed(1)}" width="${chartW}" height="${barH}" fill="#f1f5f9" rx="3" />
      <rect x="${padding.left}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH}" fill="${color}" rx="3" />
      <text x="${(padding.left + barWidth + 6).toFixed(1)}" y="${(yCenter + 3.5).toFixed(1)}" font-size="8.5" font-weight="700" fill="#1e293b" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        ${d.count} <tspan fill="#64748b" font-weight="normal" font-size="7.5">(${pct.toFixed(1)}%)</tspan>
      </text>
    `
  })

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="180" style="display: block; max-width: 100%;" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1" />
      ${rowsHtml}
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1" />
    </svg>
  `
}

/**
 * Gera e dispara impressão / download em PDF institucional para o Relatório de Matrículas e Alunos.
 */
export function exportMatriculasReportToPdf(payload: MatriculasReportExportPayload): void {
  const {
    portalName,
    periodLabel,
    generatedAt,
    generatedBy,
    kpis,
    coursesDistribution,
    evolutionChartData = [],
    statusChartData = [],
  } = payload

  const formattedDate = formatDateTime(generatedAt)
  const dateStr = generatedAt.toISOString().slice(0, 10)
  const periodStr = sanitizeFilenamePart(payload.periodKey || payload.periodLabel)
  const documentTitle = `Relatorio_Matriculas_Alunos_${periodStr}_${dateStr}`

  const evolutionChartSvg = generateEnrollmentEvolutionChartSvg(evolutionChartData)
  const statusChartSvg = generateStatusChartSvg(statusChartData)

  const coursesRowsHtml = coursesDistribution
    .map((c, idx) => {
      let statusColor = '#059669'
      let statusBg = '#ecfdf5'
      if (c.occupancyRate < 50) {
        statusColor = '#e11d48'
        statusBg = '#fff1f2'
      } else if (c.occupancyRate < 75) {
        statusColor = '#d97706'
        statusBg = '#fffbeb'
      }

      const active = (c.byStatus.ativo || 0) + (c.byStatus.matriculado || 0)

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">
            <div>${escapeHtml(c.courseName)}</div>
            <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 2px;">
              <span style="font-family: monospace; font-weight: 600;">${escapeHtml(c.courseCode)}</span> • 
              <span style="text-transform: capitalize;">${escapeHtml(c.level.replace('_', ' '))}</span> • 
              <span style="text-transform: uppercase;">${escapeHtml(c.modality)}</span>
            </div>
          </td>
          <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #0f172a;">
            ${c.totalStudents}
          </td>
          <td style="padding: 8px 10px; text-align: center; color: #0284c7; font-weight: 600;">
            ${c.newInPeriod > 0 ? `+${c.newInPeriod}` : '0'}
          </td>
          <td style="padding: 8px 10px; text-align: center; color: #334155; font-size: 11px;">
            ${c.graduacaoCount} / ${c.posGraduacaoCount}
          </td>
          <td style="padding: 8px 10px; text-align: center; font-size: 11px;">
            <span style="color: #059669; font-weight: 600;">${active}</span> / 
            <span style="color: #d97706;">${c.byStatus.pre_matricula || 0}</span> / 
            <span style="color: #e11d48;">${(c.byStatus.trancado || 0) + (c.byStatus.inativo || 0)}</span>
          </td>
          <td style="padding: 8px 10px; text-align: center; color: #334155; font-size: 11px;">
            ${c.vacancies}
          </td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; color: ${statusColor}; background-color: ${statusBg};">
              ${c.occupancyRate.toFixed(1)}%
            </span>
          </td>
        </tr>
      `
    })
    .join('')

  const printWindow = window.open('', '_blank', 'width=1000,height=900')
  if (!printWindow) {
    alert(
      'O navegador bloqueou a abertura da janela para geração do PDF. Por favor, permita pop-ups para este site.',
    )
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(documentTitle)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 10px;
          font-size: 12px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand-title {
          font-size: 20px;
          font-weight: 800;
          color: #0284c7;
          letter-spacing: -0.5px;
        }
        .report-subtitle {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-top: 2px;
        }
        .meta-box {
          text-align: right;
          font-size: 10.5px;
          color: #64748b;
          line-height: 1.5;
        }
        .badge-period {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          margin-bottom: 4px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 18px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .kpi-label {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        .kpi-value {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 4px 0 2px 0;
        }
        .kpi-sub {
          font-size: 10px;
          color: #64748b;
        }
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .chart-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
        }
        .chart-header {
          margin-bottom: 8px;
        }
        .chart-title {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
        }
        .chart-desc {
          font-size: 9.5px;
          color: #64748b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-top: 6px;
        }
        th {
          background-color: #f1f5f9;
          color: #334155;
          text-align: left;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 1px solid #cbd5e1;
        }
        td {
          border-bottom: 1px solid #e2e8f0;
        }
        .footer {
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #94a3b8;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #f1f5f9; padding: 12px 16px; margin-bottom: 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13px; color: #1e293b; font-weight: 600;">
          Visualização para Impressão e Salvamento em PDF - Matrículas e Alunos
        </span>
        <div>
          <button onclick="window.print()" style="background: #0284c7; color: #ffffff; border: none; padding: 6px 14px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12px; margin-right: 8px;">
            Imprimir / Salvar PDF
          </button>
          <button onclick="window.close()" style="background: #e2e8f0; color: #475569; border: none; padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12px;">
            Fechar
          </button>
        </div>
      </div>

      <div class="header">
        <div>
          <div class="brand-title">${escapeHtml(portalName)}</div>
          <div class="report-subtitle">Relatório Executivo de Matrículas e Alunos</div>
        </div>
        <div class="meta-box">
          <div class="badge-period">Período: ${escapeHtml(periodLabel)}</div>
          <div>Gerado em: <strong>${formattedDate}</strong></div>
          <div>Emissor: <strong>${escapeHtml(generatedBy.name)}</strong> (${escapeHtml(generatedBy.roleTitle)})</div>
        </div>
      </div>

      <div class="section-title">
        <span>1. Indicadores de Alunos e Matrículas (KPIs)</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total de Alunos na Base</div>
          <div class="kpi-value" style="color: #0284c7;">${kpis.totalStudents}</div>
          <div class="kpi-sub">Cadastros acumulados no sistema</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Novas Matrículas no Período</div>
          <div class="kpi-value" style="color: #059669;">${kpis.newEnrollmentsInPeriod}</div>
          <div class="kpi-sub">Ingressos durante o período selecionado</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Alunos Ativos / Matriculados</div>
          <div class="kpi-value" style="color: #059669;">${kpis.activeOrMatriculatedTotal}</div>
          <div class="kpi-sub">${kpis.totalStudents > 0 ? ((kpis.activeOrMatriculatedTotal / kpis.totalStudents) * 100).toFixed(1) : 0}% da base total</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Graduação (Total / No Período)</div>
          <div class="kpi-value" style="color: #0369a1;">${kpis.graduacaoTotal} <span style="font-size: 12px; color: #059669;">(+${kpis.graduacaoInPeriod})</span></div>
          <div class="kpi-sub">${kpis.totalStudents > 0 ? ((kpis.graduacaoTotal / kpis.totalStudents) * 100).toFixed(1) : 0}% da base</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Pós-Graduação (Total / No Período)</div>
          <div class="kpi-value" style="color: #7c3aed;">${kpis.posGraduacaoTotal} <span style="font-size: 12px; color: #059669;">(+${kpis.posInPeriod})</span></div>
          <div class="kpi-sub">${kpis.totalStudents > 0 ? ((kpis.posGraduacaoTotal / kpis.totalStudents) * 100).toFixed(1) : 0}% da base</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Em Pré-Matrícula / Pendentes</div>
          <div class="kpi-value" style="color: #d97706;">${kpis.statusBreakdown.pre_matricula}</div>
          <div class="kpi-sub">Trancados: ${kpis.statusBreakdown.trancado} | Inativos: ${kpis.statusBreakdown.inativo}</div>
        </div>
      </div>

      <div class="section-title">
        <span>2. Análise Gráfica: Evolução e Distribuição por Status</span>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Evolução Temporal de Matrículas</div>
            <div class="chart-desc">Volume de novos alunos cadastrados ao longo do período</div>
          </div>
          <div class="chart-container">
            ${evolutionChartSvg}
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Distribuição de Alunos por Status</div>
            <div class="chart-desc">Situação cadastral dos alunos na base</div>
          </div>
          <div class="chart-container">
            ${statusChartSvg}
          </div>
        </div>
      </div>

      <div class="section-title">
        <span>3. Distribuição de Alunos por Curso e Nível</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Curso & Nível</th>
            <th style="text-align: center;">Total Alunos</th>
            <th style="text-align: center;">No Período</th>
            <th style="text-align: center;">Grad. / Pós</th>
            <th style="text-align: center;">Ativo / Pré / Outros</th>
            <th style="text-align: center;">Vagas</th>
            <th style="text-align: center;">Ocupação</th>
          </tr>
        </thead>
        <tbody>
          ${coursesRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>PortalCursos.NG • Relatórios Gerenciais • Documento Oficial para Tomada de Decisão</div>
        <div>Página 1 de 1</div>
      </div>

      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

/**
 * Gera e dispara download de arquivo CSV formatado com BOM UTF-8 e separador ';'
 * para o Relatório de Inadimplência (KPIs, faixas de atraso, ranking de inadimplentes e detalhamento de cobranças vencidas).
 */
export function exportInadimplenciaReportToCsv(payload: InadimplenciaReportExportPayload): void {
  const {
    portalName,
    periodLabel,
    generatedAt,
    generatedBy,
    kpis,
    agingBrackets,
    studentRanking,
    charges = [],
  } = payload

  const lines: string[] = []

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  // 1. Metadados
  lines.push(`${escapeCell(portalName)};${escapeCell('Relatório Executivo de Inadimplência')}`)
  lines.push(`${escapeCell('Período Analisado')};${escapeCell(periodLabel)}`)
  lines.push(`${escapeCell('Data e Hora de Geração')};${escapeCell(formatDateTime(generatedAt))}`)
  lines.push(
    `${escapeCell('Gerado por')};${escapeCell(`${generatedBy.name} (${generatedBy.roleTitle}) - ${generatedBy.email}`)}`,
  )
  lines.push('')

  // 2. KPIs
  lines.push(`${escapeCell('--- INDICADORES CHAVE DE INADIMPLÊNCIA (KPIS) ---')};;;;`)
  lines.push(
    [
      escapeCell('Indicador'),
      escapeCell('Valor Formatado'),
      escapeCell('Valor Numérico'),
      escapeCell('Detalhes Complementares'),
    ].join(';'),
  )

  const kpisList: Array<[string, string, number, string]> = [
    [
      'Total em Atraso (Dívida Acumulada)',
      formatCurrency(kpis.totalOverdueAmount),
      kpis.totalOverdueAmount,
      'Soma de todas as cobranças pendentes com vencimento expirado',
    ],
    [
      'Cobranças Vencidas',
      `${kpis.overdueCount} títulos`,
      kpis.overdueCount,
      'Quantidade total de títulos em atraso',
    ],
    [
      'Alunos Inadimplentes',
      `${kpis.defaultingStudentsCount} alunos`,
      kpis.defaultingStudentsCount,
      'Alunos com ao menos um título vencido',
    ],
    [
      'Ticket Médio da Dívida por Aluno',
      formatCurrency(kpis.averageDebtPerStudent),
      kpis.averageDebtPerStudent,
      'Total em atraso dividido pelo número de alunos devedores',
    ],
    [
      'Ticket Médio por Título Vencido',
      formatCurrency(kpis.averageDebtPerCharge),
      kpis.averageDebtPerCharge,
      'Total em atraso dividido pela quantidade de títulos vencidos',
    ],
    [
      'Taxa de Inadimplência no Período',
      formatPercent(kpis.defaultRateInPeriod),
      Number(kpis.defaultRateInPeriod.toFixed(2)),
      'Percentual sobre o total faturado no período',
    ],
  ]

  for (const [title, formatted, num, details] of kpisList) {
    lines.push(
      [
        escapeCell(title),
        escapeCell(formatted),
        escapeCell(num.toFixed(2).replace('.', ',')),
        escapeCell(details),
      ].join(';'),
    )
  }

  lines.push('')
  lines.push('')

  // 3. Antiguidade da Dívida (Aging Brackets)
  lines.push(`${escapeCell('--- ANTIGUIDADE DA DÍVIDA (AGING) ---')};;;;`)
  lines.push(
    [
      escapeCell('Faixa de Atraso'),
      escapeCell('Valor em Atraso'),
      escapeCell('Quantidade de Títulos'),
      escapeCell('Participação (%)'),
    ].join(';'),
  )

  for (const b of agingBrackets) {
    lines.push(
      [
        escapeCell(b.label),
        escapeCell(formatCurrency(b.amount)),
        escapeCell(b.count),
        escapeCell(formatPercent(b.percentage)),
      ].join(';'),
    )
  }

  lines.push('')
  lines.push('')

  // 4. Ranking de Alunos Inadimplentes
  lines.push(`${escapeCell('--- RANKING DE ALUNOS INADIMPLENTES ---')};;;;;`)
  lines.push(
    [
      escapeCell('Aluno'),
      escapeCell('CPF'),
      escapeCell('Curso'),
      escapeCell('Total Devido'),
      escapeCell('Títulos Vencidos'),
      escapeCell('Maior Atraso (Dias)'),
    ].join(';'),
  )

  for (const r of studentRanking) {
    lines.push(
      [
        escapeCell(r.studentName),
        escapeCell(r.studentCpf),
        escapeCell(r.courseName || '—'),
        escapeCell(formatCurrency(r.totalDue)),
        escapeCell(r.overdueCount),
        escapeCell(`${r.maxDaysOverdue} dias`),
      ].join(';'),
    )
  }

  lines.push('')
  lines.push('')

  // 5. Listagem Detalhada das Cobranças Vencidas
  lines.push(`${escapeCell('--- LISTAGEM DETALHADA DE COBRANÇAS VENCIDAS ---')};;;;;;;;`)
  lines.push(
    [
      escapeCell('Código'),
      escapeCell('Aluno'),
      escapeCell('CPF'),
      escapeCell('Categoria'),
      escapeCell('Descrição'),
      escapeCell('Valor'),
      escapeCell('Vencimento'),
      escapeCell('Dias em Atraso'),
      escapeCell('Faixa'),
      escapeCell('Método'),
    ].join(';'),
  )

  for (const c of charges) {
    const bracketLabel =
      c.agingBracket === 'ate_30'
        ? 'Até 30 dias'
        : c.agingBracket === '31_60'
          ? '31 a 60 dias'
          : c.agingBracket === '61_90'
            ? '61 a 90 dias'
            : 'Mais de 90 dias'

    lines.push(
      [
        escapeCell(c.code),
        escapeCell(c.studentName),
        escapeCell(c.studentCpf),
        escapeCell(c.categoryLabel),
        escapeCell(c.description),
        escapeCell(formatCurrency(c.amount)),
        escapeCell(c.dueDate),
        escapeCell(c.daysOverdue),
        escapeCell(bracketLabel),
        escapeCell(c.method?.toUpperCase() || 'PIX/BOLETO'),
      ].join(';'),
    )
  }

  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const dateStr = generatedAt.toISOString().slice(0, 10)
  const periodStr = sanitizeFilenamePart(payload.periodKey || payload.periodLabel)
  const filename = `Relatorio_Inadimplencia_${periodStr}_${dateStr}.csv`
  triggerDownload(blob, filename)
}

/**
 * Gera SVG embutido para o gráfico de Antiguidade da Dívida (Barra Horizontal)
 */
function generateDebtAgingSvg(brackets: DebtAgingBracket[]): string {
  const maxAmount = Math.max(...brackets.map((b) => b.amount), 1)
  const width = 480
  const barHeight = 22
  const gap = 16
  const labelWidth = 110
  const chartWidth = width - labelWidth - 90
  const height = brackets.length * (barHeight + gap) + 20

  const itemsSvg = brackets
    .map((b, idx) => {
      const y = idx * (barHeight + gap) + 10
      const barW = Math.max(Math.round((b.amount / maxAmount) * chartWidth), 4)
      const color = b.color || '#e11d48'
      const formattedVal = `R$ ${b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

      return `
        <g>
          <text x="0" y="${y + 15}" fill="#334155" font-size="11" font-weight="600" font-family="sans-serif">${escapeHtml(b.shortLabel)}</text>
          <rect x="${labelWidth}" y="${y}" width="${chartWidth}" height="${barHeight}" fill="#f1f5f9" rx="4" />
          <rect x="${labelWidth}" y="${y}" width="${barW}" height="${barHeight}" fill="${color}" rx="4" />
          <text x="${labelWidth + barW + 8}" y="${y + 15}" fill="#0f172a" font-size="10.5" font-weight="700" font-family="sans-serif">${formattedVal} (${b.percentage.toFixed(0)}%)</text>
        </g>
      `
    })
    .join('')

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${itemsSvg}
    </svg>
  `
}

/**
 * Gera SVG embutido para o gráfico de Evolução da Inadimplência
 */
function generateInadimplenciaEvolutionSvg(points: InadimplenciaEvolutionPoint[]): string {
  if (points.length === 0) {
    return `<div style="text-align: center; color: #94a3b8; padding: 30px;">Sem dados de evolução para o período</div>`
  }

  const width = 480
  const height = 180
  const padding = { top: 20, right: 20, bottom: 35, left: 60 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxVal = Math.max(...points.map((p) => p.overdueAmount), 1000)

  const stepX = points.length > 1 ? chartW / (points.length - 1) : chartW / 2

  const coords = points.map((p, idx) => {
    const x = padding.left + (points.length > 1 ? idx * stepX : chartW / 2)
    const y = padding.top + chartH - (p.overdueAmount / maxVal) * chartH
    return { x, y, point: p }
  })

  const pathD = coords.reduce((acc, c, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`
  }, '')

  const areaD = `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${(padding.top + chartH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padding.top + chartH).toFixed(1)} Z`

  const dots = coords
    .map(
      (c) => `
      <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="#e11d48" stroke="#ffffff" stroke-width="2" />
      <text x="${c.x.toFixed(1)}" y="${padding.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#64748b" font-family="sans-serif">${escapeHtml(c.point.dateLabel)}</text>
    `,
    )
    .join('')

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1" />
      <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3" />
      <line x1="${padding.left}" y1="${padding.top + chartH / 2}" x2="${width - padding.right}" y2="${padding.top + chartH / 2}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3" />
      
      <text x="${padding.left - 8}" y="${padding.top + 4}" text-anchor="end" font-size="9" fill="#94a3b8" font-family="sans-serif">R$ ${(maxVal / 1000).toFixed(0)}k</text>
      <text x="${padding.left - 8}" y="${padding.top + chartH + 3}" text-anchor="end" font-size="9" fill="#94a3b8" font-family="sans-serif">R$ 0</text>

      <path d="${areaD}" fill="#ffe4e6" opacity="0.6" />
      <path d="${pathD}" fill="none" stroke="#e11d48" stroke-width="2.5" />
      ${dots}
    </svg>
  `
}

/**
 * Gera e dispara impressão / download em PDF institucional para o Relatório de Inadimplência.
 */
export function exportInadimplenciaReportToPdf(payload: InadimplenciaReportExportPayload): void {
  const {
    portalName,
    periodLabel,
    generatedAt,
    generatedBy,
    kpis,
    agingBrackets,
    evolutionData = [],
    studentRanking = [],
    charges = [],
  } = payload

  const formattedDate = formatDateTime(generatedAt)
  const dateStr = generatedAt.toISOString().slice(0, 10)
  const periodStr = sanitizeFilenamePart(payload.periodKey || payload.periodLabel)
  const documentTitle = `Relatorio_Inadimplencia_${periodStr}_${dateStr}`

  const agingSvg = generateDebtAgingSvg(agingBrackets)
  const evolutionSvg = generateInadimplenciaEvolutionSvg(evolutionData)

  // Linhas do ranking (top 10 para o PDF)
  const rankingRowsHtml = studentRanking
    .slice(0, 12)
    .map((r, idx) => {
      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 7px 10px; font-weight: 700; color: #0f172a; text-align: center;">
            #${idx + 1}
          </td>
          <td style="padding: 7px 10px;">
            <div style="font-weight: 600; color: #0f172a;">${escapeHtml(r.studentName)}</div>
            <div style="font-size: 10px; color: #64748b; font-family: monospace;">CPF: ${escapeHtml(r.studentCpf)}</div>
          </td>
          <td style="padding: 7px 10px; color: #334155; font-size: 11px;">
            ${escapeHtml(r.courseName || '—')}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #e11d48;">
            ${formatCurrency(r.totalDue)}
          </td>
          <td style="padding: 7px 10px; text-align: center; color: #334155; font-weight: 600;">
            ${r.overdueCount}
          </td>
          <td style="padding: 7px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: #fee2e2; color: #991b1b;">
              ${r.maxDaysOverdue} dias
            </span>
          </td>
        </tr>
      `
    })
    .join('')

  // Amostra das cobranças vencidas (até 15 para o PDF)
  const chargesRowsHtml = charges
    .slice(0, 18)
    .map((c, idx) => {
      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 6px 8px; font-family: monospace; font-size: 10px; color: #475569;">
            ${escapeHtml(c.code)}
          </td>
          <td style="padding: 6px 8px;">
            <div style="font-weight: 600; color: #0f172a; font-size: 11px;">${escapeHtml(c.studentName)}</div>
            <div style="font-size: 9.5px; color: #64748b;">${escapeHtml(c.description)}</div>
          </td>
          <td style="padding: 6px 8px; font-size: 10.5px; color: #334155;">
            ${escapeHtml(c.categoryLabel)}
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #e11d48; font-size: 11px;">
            ${formatCurrency(c.amount)}
          </td>
          <td style="padding: 6px 8px; text-align: center; font-size: 10.5px; color: #334155;">
            ${escapeHtml(c.dueDate)}
          </td>
          <td style="padding: 6px 8px; text-align: center; font-size: 10px; font-weight: 700; color: #b91c1c;">
            ${c.daysOverdue} d
          </td>
        </tr>
      `
    })
    .join('')

  const printWindow = window.open('', '_blank', 'width=1000,height=900')
  if (!printWindow) {
    alert(
      'O navegador bloqueou a abertura da janela para geração do PDF. Por favor, permita pop-ups para este site.',
    )
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(documentTitle)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 10px;
          font-size: 11.5px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #e11d48;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .report-subtitle {
          font-size: 12px;
          color: #e11d48;
          font-weight: 700;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .meta-box {
          text-align: right;
          font-size: 10px;
          color: #64748b;
        }
        .badge-period {
          display: inline-block;
          background: #ffe4e6;
          color: #9f1239;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 10.5px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 16px 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        .kpi-card {
          background: #fafafa;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
        }
        .kpi-label {
          font-size: 9.5px;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 2px;
        }
        .kpi-value {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .kpi-sub {
          font-size: 9px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }
        .chart-card {
          background: #fafafa;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
        }
        .chart-header {
          margin-bottom: 8px;
        }
        .chart-title {
          font-size: 11px;
          font-weight: 700;
          color: #1e293b;
        }
        .chart-desc {
          font-size: 9.5px;
          color: #64748b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          margin-bottom: 12px;
          font-size: 10.5px;
        }
        th {
          background: #f1f5f9;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9.5px;
          letter-spacing: 0.4px;
          padding: 6px 8px;
          border: 1px solid #e2e8f0;
        }
        td {
          border: 1px solid #e2e8f0;
        }
        .footer {
          margin-top: 18px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #f1f5f9; padding: 10px 14px; margin-bottom: 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: #1e293b; font-weight: 600;">
          Visualização para Impressão e Salvamento em PDF - Relatório de Inadimplência
        </span>
        <div>
          <button onclick="window.print()" style="background: #e11d48; color: #ffffff; border: none; padding: 5px 12px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 11px; margin-right: 6px;">
            Imprimir / Salvar PDF
          </button>
          <button onclick="window.close()" style="background: #e2e8f0; color: #475569; border: none; padding: 5px 10px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 11px;">
            Fechar
          </button>
        </div>
      </div>

      <div class="header">
        <div>
          <div class="brand-title">${escapeHtml(portalName)}</div>
          <div class="report-subtitle">Relatório Executivo de Inadimplência & Cobranças Vencidas</div>
        </div>
        <div class="meta-box">
          <div class="badge-period">Período: ${escapeHtml(periodLabel)}</div>
          <div>Gerado em: <strong>${formattedDate}</strong></div>
          <div>Emissor: <strong>${escapeHtml(generatedBy.name)}</strong> (${escapeHtml(generatedBy.roleTitle)})</div>
        </div>
      </div>

      <div class="section-title">
        <span>1. Indicadores Chave de Inadimplência</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total em Atraso</div>
          <div class="kpi-value" style="color: #e11d48;">${formatCurrency(kpis.totalOverdueAmount)}</div>
          <div class="kpi-sub">${kpis.overdueCount} títulos vencidos</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Alunos Inadimplentes</div>
          <div class="kpi-value" style="color: #ea580c;">${kpis.defaultingStudentsCount}</div>
          <div class="kpi-sub">Com débitos expirados</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Ticket Médio Dívida / Aluno</div>
          <div class="kpi-value" style="color: #7c3aed;">${formatCurrency(kpis.averageDebtPerStudent)}</div>
          <div class="kpi-sub">Média por aluno devedor</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Ticket Médio / Título</div>
          <div class="kpi-value" style="color: #0284c7;">${formatCurrency(kpis.averageDebtPerCharge)}</div>
          <div class="kpi-sub">Média por cobrança vencida</div>
        </div>
      </div>

      <div class="section-title">
        <span>2. Antiguidade da Dívida (Aging) & Evolução Histórica</span>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Antiguidade da Dívida por Faixa de Atraso</div>
            <div class="chart-desc">Distribuição do montante devido em faixas etárias de atraso</div>
          </div>
          <div>
            ${agingSvg}
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Evolução Mensal da Inadimplência</div>
            <div class="chart-desc">Montante acumulado em atraso nos últimos meses</div>
          </div>
          <div>
            ${evolutionSvg}
          </div>
        </div>
      </div>

      <div class="section-title">
        <span>3. Ranking dos Maiores Devedores (Top Inadimplência)</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 40px;">Pos.</th>
            <th style="text-align: left;">Aluno & CPF</th>
            <th style="text-align: left;">Curso</th>
            <th style="text-align: right;">Total Devido</th>
            <th style="text-align: center;">Títulos</th>
            <th style="text-align: center;">Maior Atraso</th>
          </tr>
        </thead>
        <tbody>
          ${rankingRowsHtml || '<tr><td colspan="6" style="padding: 12px; text-align: center; color: #64748b;">Nenhum aluno inadimplente no período</td></tr>'}
        </tbody>
      </table>

      <div class="section-title">
        <span>4. Amostra de Títulos e Cobranças Vencidas</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Código</th>
            <th style="text-align: left;">Aluno & Descrição</th>
            <th style="text-align: left;">Categoria</th>
            <th style="text-align: right;">Valor</th>
            <th style="text-align: center;">Vencimento</th>
            <th style="text-align: center;">Atraso</th>
          </tr>
        </thead>
        <tbody>
          ${chargesRowsHtml || '<tr><td colspan="6" style="padding: 12px; text-align: center; color: #64748b;">Nenhuma cobrança vencida</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>PortalCursos.NG • Relatório de Inadimplência • Gestão Financeira & Cobrança Administrativa</div>
        <div>Página 1 de 1</div>
      </div>

      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

/** Helper para escapar HTML em strings */
function escapeHtml(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Dispara o download de um Blob no navegador */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
