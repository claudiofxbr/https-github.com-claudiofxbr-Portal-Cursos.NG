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

const ALLOWED_EXPORT_ROLES = new Set(['root', 'admin', 'financeiro'])

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
