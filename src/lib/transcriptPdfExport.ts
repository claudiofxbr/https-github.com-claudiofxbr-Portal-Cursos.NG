import { Student, Course, Grade, Certificate } from '@/types/portal'
import { ConsolidatedAttendanceResult } from '@/lib/academicCalculations'

export interface SubjectSummary {
  subject: string
  term: string
  grades: { assessmentType: string; value: number; weight: number; date?: string }[]
  averageGrade: number
  presentsCount: number
  totalClasses: number
  attendancePercent: number
  status: 'aprovado' | 'reprovado_nota' | 'reprovado_frequencia' | 'reprovado_ambos' | 'em_curso'
}

export interface TranscriptPdfOptions {
  student: Student
  course?: Course | null
  summaries: SubjectSummary[]
  overallAverage: number
  consolidatedAtt: ConsolidatedAttendanceResult
  mecStatus: { label: string; approved: boolean }
  certificates: Certificate[]
  diplomas: Certificate[]
  observations?: string
  generatedBy?: string
}

function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return cpf || 'Não informado'
}

function formatDate(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '-'
  try {
    const d = new Date(isoOrDateStr)
    if (isNaN(d.getTime())) return isoOrDateStr
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoOrDateStr
  }
}

export function generateTranscriptPdf(options: TranscriptPdfOptions): void {
  const {
    student,
    course,
    summaries,
    overallAverage,
    consolidatedAtt,
    mecStatus,
    certificates,
    diplomas,
    observations,
    generatedBy = 'Secretaria Geral Acadêmica',
  } = options

  const printWindow = window.open('', '_blank', 'width=1024,height=900')
  if (!printWindow) {
    alert(
      'O bloqueador de pop-ups impediu a abertura do documento. Autorize os pop-ups para este site e tente novamente.',
    )
    return
  }

  const now = new Date()
  const emissionDateFormatted = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const courseLevelDisplay =
    course?.level === 'pos_graduacao'
      ? 'Pós-Graduação Lato Sensu'
      : course?.level === 'extensao'
        ? 'Extensão Universitária'
        : 'Graduação de Nível Superior'

  const courseTypeDisplay =
    course?.type === 'bacharelado'
      ? 'Bacharelado'
      : course?.type === 'licenciatura'
        ? 'Licenciatura'
        : course?.type === 'tecnologo'
          ? 'Tecnológico'
          : course?.type === 'mba'
            ? 'MBA Executivo'
            : 'Especialização'

  const courseModalityDisplay =
    course?.modality === 'ead'
      ? 'Educação a Distância (EAD)'
      : course?.modality === 'semipresencial'
        ? 'Semipresencial'
        : 'Presencial'

  const studentStatusDisplay: Record<string, string> = {
    ativo: 'Matriculado / Ativo',
    matriculado: 'Matriculado Regular',
    concluido: 'Curso Concluído',
    trancado: 'Matrícula Trancada',
    inativo: 'Inativo / Desistente',
    pre_matricula: 'Pré-matrícula',
  }

  const statusText = studentStatusDisplay[student.status] || student.status

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Histórico Escolar Oficial - ${escapeHtml(student.fullName)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 14mm 14mm 14mm 14mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #f1f5f9;
          font-size: 11px;
          line-height: 1.45;
        }

        .screen-toolbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #0f172a;
          color: #ffffff;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .screen-toolbar button {
          background: #0284c7;
          color: #ffffff;
          border: none;
          padding: 7px 16px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .screen-toolbar button:hover {
          background: #0369a1;
        }

        .page-container {
          padding: 24px 0;
          display: flex;
          justify-content: center;
        }

        .transcript-sheet {
          background: #ffffff;
          width: 210mm;
          min-height: 297mm;
          padding: 18mm 18mm 16mm 18mm;
          position: relative;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* Cabeçalho Institucional */
        .inst-header {
          border-bottom: 2px solid #0284c7;
          padding-bottom: 12px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .inst-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .inst-logo-badge {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #0284c7;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .inst-title h1 {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.3px;
        }

        .inst-title p {
          font-size: 9.5px;
          color: #64748b;
        }

        .doc-tag {
          text-align: right;
        }

        .doc-tag .title {
          font-size: 15px;
          font-weight: 800;
          color: #0284c7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .doc-tag .sub {
          font-size: 9px;
          color: #64748b;
        }

        /* Seções */
        .section-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 10px;
          font-weight: 800;
          color: #0369a1;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px dashed #cbd5e1;
          padding-bottom: 4px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 16px;
        }

        .grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px 16px;
        }

        .grid-4 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 8px 12px;
        }

        .data-field {
          font-size: 10.5px;
        }

        .data-label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          display: block;
          font-weight: 600;
        }

        .data-value {
          font-size: 11px;
          color: #0f172a;
          font-weight: 600;
        }

        .data-value.highlight {
          color: #0284c7;
          font-weight: 700;
        }

        /* Tabela de Disciplinas */
        table.records-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          font-size: 10px;
        }

        table.records-table th {
          background: #0f172a;
          color: #ffffff;
          padding: 6px 8px;
          text-align: left;
          font-weight: 700;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        table.records-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #e2e8f0;
          color: #1e293b;
        }

        table.records-table tr:nth-child(even) td {
          background: #f8fafc;
        }

        .grade-badge {
          display: inline-block;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9.5px;
        }

        .grade-badge.approved {
          background: #dcfce7;
          color: #15803d;
        }

        .grade-badge.failed {
          background: #ffe4e6;
          color: #be123c;
        }

        .grade-badge.in-progress {
          background: #dbeafe;
          color: #1d4ed8;
        }

        /* Resumo Acadêmico MEC */
        .mec-summary-bar {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mec-item {
          text-align: center;
        }

        .mec-item .label {
          font-size: 8.5px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
        }

        .mec-item .val {
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
        }

        .mec-pill {
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .mec-pill.approved {
          background: #16a34a;
          color: #ffffff;
        }

        .mec-pill.failed {
          background: #dc2626;
          color: #ffffff;
        }

        .mec-pill.in-progress {
          background: #2563eb;
          color: #ffffff;
        }

        /* Rodapé / Assinaturas */
        .transcript-footer {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #cbd5e1;
        }

        .signatures-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 12px;
        }

        .sig-block {
          width: 30%;
          text-align: center;
        }

        .sig-line {
          border-top: 1px solid #0f172a;
          margin-bottom: 4px;
        }

        .sig-name {
          font-size: 10px;
          font-weight: 700;
          color: #0f172a;
        }

        .sig-role {
          font-size: 8.5px;
          color: #64748b;
        }

        .meta-legal {
          font-size: 8.5px;
          color: #64748b;
          text-align: justify;
          line-height: 1.35;
          margin-top: 8px;
          border-top: 1px dashed #e2e8f0;
          padding-top: 6px;
        }

        .cert-tag-list {
          margin-top: 4px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cert-tag-item {
          font-size: 9.5px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 3px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @media print {
          body {
            background: #ffffff;
          }
          .screen-toolbar {
            display: none !important;
          }
          .page-container {
            padding: 0;
            margin: 0;
          }
          .transcript-sheet {
            box-shadow: none;
            width: 100%;
            min-height: auto;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="screen-toolbar">
        <div>
          <strong>Histórico Escolar Oficial</strong> — ${escapeHtml(student.fullName)} (${escapeHtml(student.courseName)})
        </div>
        <button onclick="window.print()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Imprimir / Salvar em PDF
        </button>
      </div>

      <div class="page-container">
        <div class="transcript-sheet">
          <div>
            <!-- Cabeçalho -->
            <div class="inst-header">
              <div class="inst-brand">
                <div class="inst-logo-badge">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                </div>
                <div class="inst-title">
                  <h1>PortalCursos.NG</h1>
                  <p>Secretaria Geral de Registro e Controle Acadêmico • Credenciada pelo MEC</p>
                  <p>Código e-MEC nº ${escapeHtml(course?.emecCode || '1092841')} • ${escapeHtml(course?.emecOrdinanceNumber || 'Portaria MEC nº 214/2022')}</p>
                </div>
              </div>
              <div class="doc-tag">
                <div class="title">Histórico Escolar</div>
                <div class="sub">Documento Oficial de Registro Acadêmico</div>
                <div class="sub" style="margin-top: 3px; font-weight: 600; color: #0284c7;">
                  Emissão: ${emissionDateFormatted}
                </div>
              </div>
            </div>

            <!-- Dados do Aluno -->
            <div class="section-box">
              <div class="section-title">1. Identificação do Discente</div>
              <div class="grid-3">
                <div class="data-field">
                  <span class="data-label">Nome Completo</span>
                  <span class="data-value highlight">${escapeHtml(student.fullName)}</span>
                </div>
                <div class="data-field">
                  <span class="data-label">CPF</span>
                  <span class="data-value">${escapeHtml(formatCpf(student.cpfRaw || student.cpf))}</span>
                </div>
                <div class="data-field">
                  <span class="data-label">Data de Nascimento</span>
                  <span class="data-value">${formatDate(student.birthDate)}</span>
                </div>
                <div class="data-field">
                  <span class="data-label">E-mail Acadêmico</span>
                  <span class="data-value">${escapeHtml(student.email)}</span>
                </div>
                <div class="data-field">
                  <span class="data-label">Telefone de Contato</span>
                  <span class="data-value">${escapeHtml(student.phone || 'Não informado')}</span>
                </div>
                <div class="data-field">
                  <span class="data-label">Matrícula Regular</span>
                  <span class="data-value">${escapeHtml(statusText)}</span>
                </div>
              </div>
            </div>

            <!-- Dados do Curso -->
            <div class="section-box">
              <div class="section-title">2. Estrutura Curricular e Curso</div>
              <div class="grid-4">
                <div class="data-field" style="grid-column: span 2;">
                  <span class="data-label">Curso Vinculado</span>
                  <span class="data-value highlight">${escapeHtml(course?.name || student.courseName)}</span>
                </div>
                <div class="data-field">
                  <span class="data-label">Nível / Grau</span>
                  <span class="data-value">${escapeHtml(courseLevelDisplay)}</span>
                </div>
                <div class="data-field">
                  <span class="data-label">Tipo Curricular</span>
                  <span class="data-value">${escapeHtml(courseTypeDisplay)}</span>
                </div>
                <div class="data-field">
                  <span class="data-label">Modalidade</span>
                  <span class="data-value">${escapeHtml(courseModalityDisplay)}</span>
                </div>
                <div class="data-field">
                  <span class="data-label">Carga Horária Total</span>
                  <span class="data-value">${course?.workloadHours || 3600} horas</span>
                </div>
                <div class="data-field">
                  <span class="data-label">Duração Prevista</span>
                  <span class="data-value">${course?.durationSemesters || 8} semestres</span>
                </div>
                <div class="data-field">
                  <span class="data-label">Coordenação</span>
                  <span class="data-value">${escapeHtml(course?.coordinator || 'Coordenação de Curso')}</span>
                </div>
              </div>
            </div>

            <!-- Resumo MEC Consolidado -->
            <div class="mec-summary-bar">
              <div class="mec-item">
                <span class="label">Média Geral Ponderada</span>
                <span class="val">${overallAverage.toFixed(1)} / 10,0</span>
              </div>
              <div class="mec-item">
                <span class="label">Freq. Presencial</span>
                <span class="val">${consolidatedAtt.presencialPercent.toFixed(0)}%</span>
              </div>
              <div class="mec-item">
                <span class="label">Aulas EAD Concluídas</span>
                <span class="val">${consolidatedAtt.eadCompletedLessons}/${consolidatedAtt.eadTotalLessons} (${consolidatedAtt.eadPercent.toFixed(0)}%)</span>
              </div>
              <div class="mec-item">
                <span class="label">Frequência Consolidada</span>
                <span class="val">${consolidatedAtt.consolidatedPercent.toFixed(1)}%</span>
              </div>
              <div class="mec-item">
                <span class="label">Situação MEC</span>
                <span class="mec-pill ${mecStatus.approved ? 'approved' : overallAverage === 0 ? 'in-progress' : 'failed'}">
                  ${escapeHtml(mecStatus.label)}
                </span>
              </div>
            </div>

            <!-- Tabela de Disciplinas e Notas -->
            <div class="section-box">
              <div class="section-title">3. Rendimento Acadêmico por Disciplina</div>
              ${
                summaries.length === 0
                  ? '<p style="color: #64748b; font-size: 10px; padding: 6px 0;">Nenhum lançamento de notas ou presenças registrado para este discente.</p>'
                  : `
                <table class="records-table">
                  <thead>
                    <tr>
                      <th style="width: 32%;">Disciplina Curricular</th>
                      <th style="width: 10%;">Período</th>
                      <th style="width: 24%;">Avaliações & Notas</th>
                      <th style="width: 10%; text-align: center;">Média</th>
                      <th style="width: 12%; text-align: center;">Frequência</th>
                      <th style="width: 12%; text-align: center;">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summaries
                      .map((s) => {
                        const gradesText =
                          s.grades.length > 0
                            ? s.grades
                                .map(
                                  (g) =>
                                    `${escapeHtml(g.assessmentType)}: <strong>${g.value.toFixed(1)}</strong> (P${g.weight})`,
                                )
                                .join('<br/>')
                            : '<em>Sem avaliações</em>'

                        let statusLabel = 'Em Curso'
                        let statusCls = 'in-progress'
                        if (s.status === 'aprovado') {
                          statusLabel = 'Aprovado'
                          statusCls = 'approved'
                        } else if (s.status === 'reprovado_nota') {
                          statusLabel = 'Reprov. Nota'
                          statusCls = 'failed'
                        } else if (s.status === 'reprovado_frequencia') {
                          statusLabel = 'Reprov. Freq.'
                          statusCls = 'failed'
                        } else if (s.status === 'reprovado_ambos') {
                          statusLabel = 'Reprov. Ambos'
                          statusCls = 'failed'
                        }

                        return `
                          <tr>
                            <td><strong>${escapeHtml(s.subject)}</strong></td>
                            <td>${escapeHtml(s.term || '-')}</td>
                            <td style="font-size: 9px; line-height: 1.3;">${gradesText}</td>
                            <td style="text-align: center; font-weight: 700; font-size: 11px;">${s.averageGrade.toFixed(1)}</td>
                            <td style="text-align: center;">
                              ${s.totalClasses > 0 ? `${s.attendancePercent}% (${s.presentsCount}/${s.totalClasses})` : '—'}
                            </td>
                            <td style="text-align: center;">
                              <span class="grade-badge ${statusCls}">${statusLabel}</span>
                            </td>
                          </tr>
                        `
                      })
                      .join('')}
                  </tbody>
                </table>
              `
              }
            </div>

            <!-- Certificados e Diplomas -->
            ${
              certificates.length > 0 || diplomas.length > 0
                ? `
              <div class="section-box">
                <div class="section-title">4. Títulos, Diplomas e Certificados Emitidos</div>
                <div class="cert-tag-list">
                  ${diplomas
                    .map(
                      (d) => `
                    <div class="cert-tag-item">
                      <div>
                        <strong style="color: #7c2d12;">Diploma de Graduação Oficial</strong> •
                        Código: <strong>${escapeHtml(d.verificationCode)}</strong> •
                        Emissão: ${formatDate(d.issueDate || d.created)}
                        ${d.graduationDate ? `• Colação de Grau: ${formatDate(d.graduationDate)}` : ''}
                      </div>
                      <span style="font-weight: 700; color: #15803d; text-transform: uppercase;">${escapeHtml(d.status)}</span>
                    </div>
                  `,
                    )
                    .join('')}
                  ${certificates
                    .map(
                      (c) => `
                    <div class="cert-tag-item">
                      <div>
                        <strong style="color: #0369a1;">Certificado de Conclusão de Curso</strong> •
                        Código: <strong>${escapeHtml(c.verificationCode)}</strong> •
                        Emissão: ${formatDate(c.issueDate || c.created)}
                      </div>
                      <span style="font-weight: 700; color: #15803d; text-transform: uppercase;">${escapeHtml(c.status)}</span>
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }

            <!-- Observações Acadêmicas -->
            ${
              observations
                ? `
              <div class="section-box">
                <div class="section-title">5. Observações Acadêmicas Oficiais</div>
                <p style="font-size: 10px; color: #334155; line-height: 1.4; white-space: pre-wrap;">${escapeHtml(observations)}</p>
              </div>
            `
                : ''
            }
          </div>

          <!-- Rodapé e Assinaturas -->
          <div class="transcript-footer">
            <div class="signatures-row">
              <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-name">${escapeHtml(generatedBy)}</div>
                <div class="sig-role">Secretaria Geral Acadêmica</div>
              </div>

              <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-name">${escapeHtml(course?.coordinator || 'Coordenação de Curso')}</div>
                <div class="sig-role">Coordenador(a) do Colegiado</div>
              </div>

              <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-name">Dra. Beatriz Santos</div>
                <div class="sig-role">Reitora e Direção Acadêmica</div>
              </div>
            </div>

            <div class="meta-legal">
              <strong>Observação Legal:</strong> Este histórico escolar é emitido em conformidade com as diretrizes do Ministério da Educação (MEC),
              Resoluções CNE/CES e Lei de Diretrizes e Bases da Educação Nacional (LDB nº 9.394/1996). As notas obedecem à escala decimal de 0,0 a 10,0,
              exigindo-se para aprovação média mínima ponderada de 6,0 (seis) e frequência mínima de 75% da carga horária presencial e cumprimento da grade EAD.
              Qualquer rasura ou emenda invalida o presente documento. Autenticidade verificável nos canais institucionais do PortalCursos.NG.
            </div>
          </div>
        </div>
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.focus();
          }, 350);
        });
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
