/**
 * Utilitários de exportação de Relatórios Gerenciais (PDF e CSV)
 * PortalCursos.NG
 */

import { CoursePerformanceData } from '@/components/relatorios/CoursePerformanceTable'

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
  const { portalName, periodLabel, generatedAt, generatedBy, kpis, courses } = payload

  const formattedDate = formatDateTime(generatedAt)
  const dateStr = generatedAt.toISOString().slice(0, 10)
  const periodStr = sanitizeFilenamePart(payload.periodKey || payload.periodLabel)
  const documentTitle = `Relatorio_Gerencial_${periodStr}_${dateStr}`

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
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-top: 6px;
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
        <span>2. Desempenho e Rentabilidade por Curso</span>
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
        <div>Página 1 de 1 • Autenticado digitalmente por ${escapeHtml(generatedBy.email)}</div>
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
