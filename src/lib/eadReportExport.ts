import { EadReportExportPayload } from '@/lib/eadReportData'
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
 * Gera e dispara download de arquivo CSV formatado com BOM UTF-8 e separador ponto-e-vírgula (;)
 */
export function exportEadReportToCsv(payload: EadReportExportPayload): void {
  const { portalName, periodLabel, generatedAt, generatedBy, kpis, courses, students } = payload

  const lines: string[] = []

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  // 1. Cabeçalho de Metadados
  lines.push(
    `${escapeCell(portalName)};${escapeCell('Relatório Gerencial de Cursos e Videoaulas EAD')}`,
  )
  lines.push(`${escapeCell('Período de Referência')};${escapeCell(periodLabel)}`)
  lines.push(`${escapeCell('Data e Hora de Geração')};${escapeCell(formatDateTime(generatedAt))}`)
  lines.push(
    `${escapeCell('Gerado por')};${escapeCell(`${generatedBy.name} (${generatedBy.roleTitle}) - ${generatedBy.email}`)}`,
  )
  lines.push('')

  // 2. Seção de KPIs Principais
  lines.push(`${escapeCell('--- INDICADORES CHAVE DE EAD (KPIS) ---')};;;;`)
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
      'Total de Cursos EAD',
      `${kpis.totalEadCourses} cursos`,
      kpis.totalEadCourses,
      'Cursos EAD cadastrados no ambiente',
    ],
    [
      'Total de Videoaulas',
      `${kpis.totalLessons} aulas`,
      kpis.totalLessons,
      'Videoaulas registradas na plataforma',
    ],
    [
      'Alunos Matriculados em EAD',
      `${kpis.totalEnrolledStudents} alunos`,
      kpis.totalEnrolledStudents,
      'Estudantes com matrícula ativa em cursos EAD',
    ],
    [
      'Progresso Médio Geral',
      formatPercent(kpis.averageProgressPercent),
      kpis.averageProgressPercent,
      'Média de conclusão de aulas entre todos os inscritos',
    ],
    [
      'Alunos com Progresso Travado / Zero',
      `${kpis.stalledStudentsCount} alunos`,
      kpis.stalledStudentsCount,
      'Alunos matriculados que ainda não concluíram nenhuma aula',
    ],
    [
      'Conclusões Totais (100%)',
      `${kpis.completedStudentsCount} conclusões`,
      kpis.completedStudentsCount,
      'Alunos que concluíram 100% das videoaulas do curso',
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

  // 3. Resumo por Curso EAD
  lines.push(`${escapeCell('--- DESEMPENHO E ENGAJAMENTO POR CURSO EAD ---')};;;;;;`)
  lines.push(
    [
      escapeCell('Curso EAD'),
      escapeCell('Instrutor'),
      escapeCell('Carga Horária'),
      escapeCell('Total Aulas'),
      escapeCell('Alunos Matriculados'),
      escapeCell('Concluintes (100%)'),
      escapeCell('Progresso Médio'),
    ].join(';'),
  )

  for (const c of courses) {
    lines.push(
      [
        escapeCell(c.courseTitle),
        escapeCell(c.instructorName),
        escapeCell(`${c.workloadHours}h`),
        escapeCell(c.totalLessons),
        escapeCell(c.enrolledStudentsCount),
        escapeCell(c.completedStudentsCount),
        escapeCell(formatPercent(c.averageProgressPercent)),
      ].join(';'),
    )
  }

  lines.push('')

  // 4. Detalhamento por Aluno
  lines.push(`${escapeCell('--- DETALHAMENTO DE PROGRESSO POR ALUNO ---')};;;;;;;;`)
  lines.push(
    [
      escapeCell('Nome do Aluno'),
      escapeCell('CPF'),
      escapeCell('Curso EAD'),
      escapeCell('Aulas Concluídas'),
      escapeCell('Total de Aulas'),
      escapeCell('Progresso (%)'),
      escapeCell('Status EAD'),
      escapeCell('Última Atividade'),
    ].join(';'),
  )

  for (const s of students) {
    const statusLabel =
      s.status === 'concluido'
        ? 'Concluído'
        : s.status === 'em_andamento'
          ? 'Em Andamento'
          : 'Não Iniciado'

    lines.push(
      [
        escapeCell(s.studentName),
        escapeCell(s.studentCpf),
        escapeCell(s.courseTitle),
        escapeCell(s.completedLessons),
        escapeCell(s.totalLessons),
        escapeCell(formatPercent(s.progressPercent)),
        escapeCell(statusLabel),
        escapeCell(s.lastActivityAt || 'Sem atividade'),
      ].join(';'),
    )
  }

  // Monta arquivo com BOM UTF-8 (\uFEFF)
  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `relatorio_ead_${sanitizeFilenamePart(periodLabel)}_${timestamp}.csv`

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Gera documento HTML A4 institucional e abre janela de impressão do navegador para salvar em PDF
 */
export function exportEadReportToPdf(payload: EadReportExportPayload): void {
  const { portalName, periodLabel, generatedAt, generatedBy, kpis, courses, students } = payload

  const printWindow = window.open('', '_blank', 'width=1100,height=850')
  if (!printWindow) {
    throw new Error('Não foi possível abrir janela para geração do PDF. Permita pop-ups.')
  }

  const kpisHtml = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Cursos EAD Ativos</div>
        <div class="kpi-value text-indigo">${kpis.totalEadCourses}</div>
        <div class="kpi-sub">${kpis.totalLessons} videoaulas no total</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Alunos Matriculados</div>
        <div class="kpi-value text-sky">${kpis.totalEnrolledStudents}</div>
        <div class="kpi-sub">Estudantes com acesso EAD</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Progresso Médio Geral</div>
        <div class="kpi-value text-emerald">${formatPercent(kpis.averageProgressPercent)}</div>
        <div class="kpi-sub">${kpis.completedStudentsCount} conclusões registradas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Alunos Sem Progresso</div>
        <div class="kpi-value text-rose">${kpis.stalledStudentsCount}</div>
        <div class="kpi-sub">0% de aulas concluídas</div>
      </div>
    </div>
  `

  const coursesRows = courses
    .map(
      (c) => `
      <tr>
        <td class="font-bold">${escapeHtml(c.courseTitle)}</td>
        <td>${escapeHtml(c.instructorName)}</td>
        <td class="text-center">${c.workloadHours}h</td>
        <td class="text-center">${c.totalLessons}</td>
        <td class="text-center font-bold">${c.enrolledStudentsCount}</td>
        <td class="text-center text-emerald font-bold">${c.completedStudentsCount}</td>
        <td class="text-right font-bold">${formatPercent(c.averageProgressPercent)}</td>
      </tr>
    `,
    )
    .join('')

  const studentsRows = students
    .map((s) => {
      const statusBadge =
        s.status === 'concluido'
          ? '<span class="badge badge-emerald">Concluído</span>'
          : s.status === 'em_andamento'
            ? '<span class="badge badge-blue">Em Andamento</span>'
            : '<span class="badge badge-slate">Não Iniciado</span>'

      return `
      <tr>
        <td class="font-bold">${escapeHtml(s.studentName)}</td>
        <td class="font-mono text-center">${escapeHtml(s.studentCpf)}</td>
        <td>${escapeHtml(s.courseTitle)}</td>
        <td class="text-center font-mono">${s.completedLessons} / ${s.totalLessons}</td>
        <td class="text-center font-bold font-mono">${formatPercent(s.progressPercent)}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center text-slate">${s.lastActivityAt ? escapeHtml(s.lastActivityAt.substring(0, 16)) : '—'}</td>
      </tr>
    `
    })
    .join('')

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório Gerencial EAD - ${escapeHtml(periodLabel)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 14mm 12mm;
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
          padding: 0;
          font-size: 11px;
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
        .brand {
          font-size: 18px;
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
          font-size: 10px;
          color: #475569;
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          margin: 18px 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-left: 3px solid #0284c7;
          padding-left: 8px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
        }
        .kpi-title {
          font-size: 9px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        .kpi-value {
          font-size: 18px;
          font-weight: 800;
          margin: 4px 0 2px 0;
        }
        .kpi-sub {
          font-size: 9px;
          color: #64748b;
        }
        .text-indigo { color: #4f46e5; }
        .text-sky { color: #0284c7; }
        .text-emerald { color: #059669; }
        .text-rose { color: #e11d48; }
        .text-slate { color: #64748b; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
          font-size: 10px;
        }
        th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 700;
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1px solid #cbd5e1;
        }
        td {
          padding: 5px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        tr:nth-child(even) td {
          background: #fafafa;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 700;
        }
        .badge-emerald {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .badge-blue {
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
        }
        .badge-slate {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .footer {
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">${escapeHtml(portalName)}</div>
          <div class="report-title">Relatório Executivo de Cursos e Videoaulas EAD</div>
        </div>
        <div class="meta-box">
          <div><strong>Período:</strong> ${escapeHtml(periodLabel)}</div>
          <div><strong>Emissão:</strong> ${escapeHtml(formatDateTime(generatedAt))}</div>
          <div><strong>Responsável:</strong> ${escapeHtml(generatedBy.name)} (${escapeHtml(generatedBy.roleTitle)})</div>
        </div>
      </div>

      <div class="section-title">Indicadores de Desempenho & Conclusão (KPIs)</div>
      ${kpisHtml}

      <div class="section-title">Desempenho Geral por Curso EAD</div>
      <table>
        <thead>
          <tr>
            <th>Curso EAD</th>
            <th>Instrutor Responsável</th>
            <th class="text-center">Carga</th>
            <th class="text-center">Aulas</th>
            <th class="text-center">Matriculados</th>
            <th class="text-center">Concluintes</th>
            <th class="text-right">Progresso Médio</th>
          </tr>
        </thead>
        <tbody>
          ${coursesRows || '<tr><td colspan="7" class="text-center text-slate">Nenhum curso EAD cadastrado.</td></tr>'}
        </tbody>
      </table>

      <div class="section-title">Acompanhamento Individual de Alunos (${students.length})</div>
      <table>
        <thead>
          <tr>
            <th>Aluno</th>
            <th class="text-center">CPF</th>
            <th>Curso EAD</th>
            <th class="text-center">Aulas Concluídas</th>
            <th class="text-center">Progresso</th>
            <th class="text-center">Status</th>
            <th class="text-center">Última Atividade</th>
          </tr>
        </thead>
        <tbody>
          ${studentsRows || '<tr><td colspan="7" class="text-center text-slate">Nenhum aluno matriculado ou encontrado com os filtros atuais.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>PortalCursos.NG • Módulo de Educação a Distância (EAD) & Gestão Acadêmica Integrada</div>
        <div>Documento oficial para acompanhamento pedagógico e auditoria MEC</div>
      </div>

      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
