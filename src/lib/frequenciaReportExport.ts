import {
  FrequenciaReportExportPayload,
  ClassAttendanceReportItem,
  StudentAttendanceDetail,
} from '@/lib/frequenciaReportData'
import { formatPercent, formatDateTime } from '@/lib/reportExport'

const escapeHtml = (text?: string | number | null): string => {
  if (text === undefined || text === null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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
export function exportFrequenciaReportToCsv(payload: FrequenciaReportExportPayload): void {
  const { portalName, periodLabel, generatedAt, generatedBy, kpis, classes, riskStudents } = payload

  const lines: string[] = []

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  // 1. Cabeçalho de Metadados
  lines.push(
    `${escapeCell(portalName)};${escapeCell('Relatório Executivo de Frequência por Turma')}`,
  )
  lines.push(`${escapeCell('Período de Referência')};${escapeCell(periodLabel)}`)
  lines.push(`${escapeCell('Data e Hora de Geração')};${escapeCell(formatDateTime(generatedAt))}`)
  lines.push(
    `${escapeCell('Gerado por')};${escapeCell(`${generatedBy.name} (${generatedBy.roleTitle}) - ${generatedBy.email}`)}`,
  )
  lines.push('')

  // 2. Seção de KPIs Principais
  lines.push(`${escapeCell('--- INDICADORES CHAVE DE FREQUÊNCIA (KPIS) ---')};;;;`)
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
      'Frequência Média Geral Consolidada',
      formatPercent(kpis.overallConsolidatedAverage),
      kpis.overallConsolidatedAverage,
      'Média ponderada presencial + EAD conforme critério MEC',
    ],
    [
      'Total de Chamadas Registradas',
      `${kpis.totalCallsRecorded} sessões`,
      kpis.totalCallsRecorded,
      'Sessões de chamada com data registrada',
    ],
    [
      'Total de Presenças',
      `${kpis.totalPresents} presenças`,
      kpis.totalPresents,
      'Lançamentos com status presente',
    ],
    [
      'Total de Faltas',
      `${kpis.totalAbsences} faltas`,
      kpis.totalAbsences,
      'Lançamentos com status falta não justificada',
    ],
    [
      'Total de Faltas Justificadas',
      `${kpis.totalJustified} justificadas`,
      kpis.totalJustified,
      'Lançamentos abonados/justificados documentalmente',
    ],
    [
      'Alunos em Risco Acadêmico (< 75%)',
      `${kpis.riskStudentsCount} alunos`,
      kpis.riskStudentsCount,
      'Percentual abaixo da exigência legal de 75%',
    ],
    [
      'Total de Turmas Analisadas',
      `${kpis.totalClassesCount} turmas`,
      kpis.totalClassesCount,
      'Turmas no escopo dos filtros aplicados',
    ],
    [
      'Total de Alunos Monitorados',
      `${kpis.totalStudentsMonitored} alunos`,
      kpis.totalStudentsMonitored,
      'Alunos com frequência ativa nas turmas',
    ],
  ]

  for (const [title, formatted, num, details] of kpisList) {
    lines.push(
      [
        escapeCell(title),
        escapeCell(formatted),
        escapeCell(num.toFixed(1).replace('.', ',')),
        escapeCell(details),
      ].join(';'),
    )
  }

  lines.push('')
  lines.push('')

  // 3. Tabela Resumo por Turma
  lines.push(`${escapeCell('--- DESEMPENHO DE FREQUÊNCIA POR TURMA ---')};;;;;;;;;;`)
  lines.push(
    [
      escapeCell('Turma'),
      escapeCell('Curso'),
      escapeCell('Período'),
      escapeCell('Professor Responsável'),
      escapeCell('Matriculados'),
      escapeCell('Chamadas'),
      escapeCell('Presenças'),
      escapeCell('Faltas'),
      escapeCell('Justificadas'),
      escapeCell('Frequência Média (%)'),
      escapeCell('Alunos em Risco (<75%)'),
    ].join(';'),
  )

  for (const c of classes) {
    lines.push(
      [
        escapeCell(c.className),
        escapeCell(c.courseName),
        escapeCell(c.term),
        escapeCell(c.professorName),
        escapeCell(c.enrolledStudentsCount),
        escapeCell(c.totalCallsRecorded),
        escapeCell(c.totalPresents),
        escapeCell(c.totalAbsences),
        escapeCell(c.totalJustified),
        escapeCell(formatPercent(c.averageClassPercent)),
        escapeCell(c.riskStudentsCount),
      ].join(';'),
    )
  }

  lines.push('')
  lines.push('')

  // 4. Ranking de Alunos em Risco (<75%)
  lines.push(`${escapeCell('--- ALUNOS EM RISCO DE REPROVAÇÃO POR FREQUÊNCIA (< 75%) ---')};;;;;;;`)
  lines.push(
    [
      escapeCell('Posição'),
      escapeCell('Aluno'),
      escapeCell('CPF'),
      escapeCell('Curso / Turma'),
      escapeCell('Frequência da Turma (%)'),
      escapeCell('Frequência Consolidada (%)'),
      escapeCell('Presenças'),
      escapeCell('Faltas'),
      escapeCell('Justificadas'),
      escapeCell('Situação'),
    ].join(';'),
  )

  riskStudents.forEach((st, idx) => {
    lines.push(
      [
        escapeCell(`#${idx + 1}`),
        escapeCell(st.studentName),
        escapeCell(st.studentCpf),
        escapeCell(st.courseName),
        escapeCell(formatPercent(st.classAttendancePercent)),
        escapeCell(formatPercent(st.consolidatedPercent)),
        escapeCell(st.presents),
        escapeCell(st.absences),
        escapeCell(st.justified),
        escapeCell(st.classAttendancePercent >= 75 ? 'Aprovado' : 'Em Risco (<75%)'),
      ].join(';'),
    )
  })

  // Monta CSV com BOM \uFEFF
  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  const dateStr = generatedAt.toISOString().slice(0, 10)
  const periodStr = sanitizeFilenamePart(periodLabel)
  link.setAttribute('download', `Frequencia_Turmas_${periodStr}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Gera SVG estático de barras comparativas de turmas com linha de corte MEC (75%)
 */
function generateClassComparisonSvg(classes: ClassAttendanceReportItem[]): string {
  if (classes.length === 0) {
    return `<div style="height:140px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:11px;">Sem turmas cadastradas para o período</div>`
  }

  const chartW = 740
  const chartH = 200
  const padLeft = 45
  const padRight = 20
  const padTop = 20
  const padBottom = 40
  const innerW = chartW - padLeft - padRight
  const innerH = chartH - padTop - padBottom

  // Linha de 75%
  const mecY = padTop + innerH * (1 - 75 / 100)

  const items = classes.slice(0, 10) // até 10 turmas no gráfico
  const slotW = innerW / items.length
  const barW = Math.max(12, Math.min(36, slotW * 0.55))

  const barsSvg = items
    .map((c, idx) => {
      const x = padLeft + idx * slotW + (slotW - barW) / 2
      const percentClamped = Math.max(0, Math.min(100, c.averageClassPercent))
      const h = (percentClamped / 100) * innerH
      const y = padTop + innerH - h
      const isRisk = percentClamped < 75
      const color = isRisk ? '#f43f5e' : '#10b981'

      const shortName = c.className.length > 14 ? c.className.slice(0, 12) + '…' : c.className

      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" rx="3" />
        <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="${color}">${c.averageClassPercent.toFixed(1)}%</text>
        <text x="${x + barW / 2}" y="${chartH - 12}" text-anchor="middle" font-size="8.5" font-weight="500" fill="#475569">${escapeHtml(shortName)}</text>
      `
    })
    .join('')

  return `
    <svg width="100%" height="200" viewBox="0 0 ${chartW} ${chartH}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border-radius:6px;">
      <!-- Grade Horizontal -->
      <line x1="${padLeft}" y1="${padTop}" x2="${chartW - padRight}" y2="${padTop}" stroke="#f1f5f9" stroke-width="1" />
      <line x1="${padLeft}" y1="${padTop + innerH * 0.25}" x2="${chartW - padRight}" y2="${padTop + innerH * 0.25}" stroke="#f1f5f9" stroke-width="1" />
      <line x1="${padLeft}" y1="${padTop + innerH * 0.5}" x2="${chartW - padRight}" y2="${padTop + innerH * 0.5}" stroke="#f1f5f9" stroke-width="1" />
      <line x1="${padLeft}" y1="${padTop + innerH}" x2="${chartW - padRight}" y2="${padTop + innerH}" stroke="#cbd5e1" stroke-width="1" />

      <!-- Linha de Corte MEC 75% -->
      <line x1="${padLeft}" y1="${mecY}" x2="${chartW - padRight}" y2="${mecY}" stroke="#e11d48" stroke-width="1.5" stroke-dasharray="4 3" />
      <text x="${chartW - padRight}" y="${mecY - 3}" text-anchor="end" font-size="9" font-weight="bold" fill="#e11d48">MEC 75% Mínimo</text>

      <!-- Eixo Y Labels -->
      <text x="${padLeft - 8}" y="${padTop + 4}" text-anchor="end" font-size="9" fill="#94a3b8">100%</text>
      <text x="${padLeft - 8}" y="${padTop + innerH * 0.5 + 4}" text-anchor="end" font-size="9" fill="#94a3b8">50%</text>
      <text x="${padLeft - 8}" y="${padTop + innerH + 4}" text-anchor="end" font-size="9" fill="#94a3b8">0%</text>

      <!-- Barras -->
      ${barsSvg}
    </svg>
  `
}

/**
 * Gera e dispara impressão / download em PDF institucional A4 para o Relatório de Frequência por Turma.
 */
export function exportFrequenciaReportToPdf(payload: FrequenciaReportExportPayload): void {
  const { portalName, periodLabel, generatedAt, generatedBy, kpis, classes, riskStudents } = payload

  const formattedDate = formatDateTime(generatedAt)
  const dateStr = generatedAt.toISOString().slice(0, 10)
  const periodStr = sanitizeFilenamePart(periodLabel)
  const documentTitle = `Relatorio_Frequencia_Turmas_${periodStr}_${dateStr}`

  const chartSvg = generateClassComparisonSvg(classes)

  // Linhas da tabela de turmas
  const classesRowsHtml = classes
    .map((c, idx) => {
      const isRisk = c.averageClassPercent < 75
      const badgeBg = isRisk ? '#fee2e2' : '#dcfce7'
      const badgeColor = isRisk ? '#991b1b' : '#166534'
      const statusText = isRisk ? 'Abaixo do MEC (<75%)' : 'Regular (≥75%)'

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(c.className)}</div>
            <div style="font-size: 10px; color: #64748b;">${escapeHtml(c.courseName)} • Período ${escapeHtml(c.term)}</div>
          </td>
          <td style="padding: 7px 10px; color: #334155; font-size: 11px;">
            ${escapeHtml(c.professorName)}
          </td>
          <td style="padding: 7px 10px; text-align: center; color: #334155; font-weight: 600;">
            ${c.enrolledStudentsCount}
          </td>
          <td style="padding: 7px 10px; text-align: center; color: #334155;">
            ${c.totalCallsRecorded}
          </td>
          <td style="padding: 7px 10px; text-align: center; color: #166534; font-weight: 600;">
            ${c.totalPresents}
          </td>
          <td style="padding: 7px 10px; text-align: center; color: #dc2626; font-weight: 600;">
            ${c.totalAbsences}
          </td>
          <td style="padding: 7px 10px; text-align: center; color: #d97706;">
            ${c.totalJustified}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: ${isRisk ? '#e11d48' : '#059669'}; font-size: 12px;">
            ${c.averageClassPercent.toFixed(1)}%
          </td>
          <td style="padding: 7px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 9.5px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor};">
              ${statusText}
            </span>
          </td>
        </tr>
      `
    })
    .join('')

  // Linhas do ranking de alunos em risco
  const riskRowsHtml = riskStudents
    .slice(0, 15)
    .map((st, idx) => {
      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 6px 8px; font-weight: 700; color: #0f172a; text-align: center;">
            #${idx + 1}
          </td>
          <td style="padding: 6px 8px;">
            <div style="font-weight: 600; color: #0f172a; font-size: 11px;">${escapeHtml(st.studentName)}</div>
            <div style="font-size: 9.5px; color: #64748b; font-family: monospace;">CPF: ${escapeHtml(st.studentCpf)}</div>
          </td>
          <td style="padding: 6px 8px; font-size: 10.5px; color: #334155;">
            ${escapeHtml(st.courseName)}
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #e11d48; font-size: 11px;">
            ${st.classAttendancePercent.toFixed(1)}%
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 600; color: #0284c7; font-size: 11px;">
            ${st.consolidatedPercent.toFixed(1)}%
          </td>
          <td style="padding: 6px 8px; text-align: center; color: #166534; font-size: 10.5px;">
            ${st.presents}
          </td>
          <td style="padding: 6px 8px; text-align: center; color: #dc2626; font-weight: 700; font-size: 10.5px;">
            ${st.absences}
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 9px; font-weight: 700; background: #fee2e2; color: #991b1b;">
              Em Risco (&lt;75%)
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
          font-size: 11.5px;
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
        .portal-name {
          font-size: 20px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: -0.5px;
        }
        .report-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 2px;
        }
        .meta-box {
          text-align: right;
          font-size: 10.5px;
          color: #64748b;
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
          font-size: 12.5px;
          font-weight: 700;
          color: #0369a1;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-top: 16px;
          margin-bottom: 10px;
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
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
          background: #f8fafc;
        }
        .kpi-label {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .kpi-sub {
          font-size: 9.5px;
          color: #64748b;
        }
        .chart-box {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
          background: #ffffff;
          margin-bottom: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          margin-bottom: 14px;
          font-size: 11px;
        }
        th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 700;
          padding: 8px 10px;
          text-align: left;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          border-bottom: 1px solid #e2e8f0;
        }
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 9.5px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="portal-name">${escapeHtml(portalName)}</div>
          <div class="report-title">Relatório de Frequência por Turma & Indicadores Acadêmicos</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            Auditoria de chamada presencial, integração EAD e critério de aprovação MEC (75%)
          </div>
        </div>
        <div class="meta-box">
          <div class="badge-period">Período: ${escapeHtml(periodLabel)}</div>
          <div>Gerado em: <strong>${formattedDate}</strong></div>
          <div>Emissor: <strong>${escapeHtml(generatedBy.name)}</strong> (${escapeHtml(generatedBy.roleTitle)})</div>
        </div>
      </div>

      <div class="section-title">
        <span>1. Indicadores Chave de Frequência (KPIs)</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Frequência Média Geral</div>
          <div class="kpi-value" style="color: ${kpis.overallConsolidatedAverage < 75 ? '#e11d48' : '#059669'};">
            ${kpis.overallConsolidatedAverage.toFixed(1)}%
          </div>
          <div class="kpi-sub">Presencial + EAD (MEC)</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Chamadas Registradas</div>
          <div class="kpi-value" style="color: #0284c7;">${kpis.totalCallsRecorded}</div>
          <div class="kpi-sub">${kpis.totalClassesCount} turmas monitoradas</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Presenças vs. Faltas</div>
          <div class="kpi-value" style="color: #10b981;">
            ${kpis.totalPresents} <span style="font-size: 11px; color: #dc2626;">/ ${kpis.totalAbsences} F</span>
          </div>
          <div class="kpi-sub">${kpis.totalJustified} justificadas</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Alunos em Risco (&lt;75%)</div>
          <div class="kpi-value" style="color: #e11d48;">${kpis.riskStudentsCount}</div>
          <div class="kpi-sub">De ${kpis.totalStudentsMonitored} alunos totais</div>
        </div>
      </div>

      <div class="section-title">
        <span>2. Comparativo de Frequência por Turma & Linha de Corte MEC</span>
      </div>

      <div class="chart-box">
        ${chartSvg}
      </div>

      <div class="section-title">
        <span>3. Detalhamento por Turma</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Turma & Curso</th>
            <th style="text-align: left;">Professor</th>
            <th style="text-align: center;">Alunos</th>
            <th style="text-align: center;">Chamadas</th>
            <th style="text-align: center;">P</th>
            <th style="text-align: center;">F</th>
            <th style="text-align: center;">J</th>
            <th style="text-align: right;">Frequência (%)</th>
            <th style="text-align: center;">Situação</th>
          </tr>
        </thead>
        <tbody>
          ${classesRowsHtml || '<tr><td colspan="9" style="padding: 12px; text-align: center; color: #64748b;">Nenhuma turma cadastrada no período</td></tr>'}
        </tbody>
      </table>

      <div class="section-title">
        <span>4. Alunos com Maior Risco de Reprovação por Frequência (&lt; 75%)</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 40px;">Pos.</th>
            <th style="text-align: left;">Aluno & CPF</th>
            <th style="text-align: left;">Curso</th>
            <th style="text-align: right;">Turma (%)</th>
            <th style="text-align: right;">Consolidado (%)</th>
            <th style="text-align: center;">P</th>
            <th style="text-align: center;">F</th>
            <th style="text-align: center;">Situação</th>
          </tr>
        </thead>
        <tbody>
          ${riskRowsHtml || '<tr><td colspan="8" style="padding: 12px; text-align: center; color: #166534; font-weight: 600;">Nenhum aluno em risco de reprovação por frequência! Parabéns à equipe acadêmica.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>PortalCursos.NG • Relatório de Frequência por Turma • Critério MEC Lei 9.394/96 Art. 24</div>
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
