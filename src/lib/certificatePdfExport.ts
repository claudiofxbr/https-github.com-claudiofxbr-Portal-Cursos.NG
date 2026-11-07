import { Certificate } from '@/types/portal'

/**
 * Formata a data por extenso em língua portuguesa.
 * Exemplo: "15 de outubro de 2024"
 */
export function formatDateExtendedPtBr(dateStr: string): string {
  try {
    const parts = dateStr.slice(0, 10).split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const date = new Date(year, month, day)
      return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/** Helper para escapar HTML */
function escapeHtml(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Formata o nível acadêmico para exibição */
function formatCourseLevel(level?: string): string {
  if (!level) return 'Graduação'
  const normalized = level.toLowerCase()
  if (normalized.includes('pos') || normalized.includes('pós')) return 'Pós-Graduação Lato Sensu'
  if (normalized.includes('extensao') || normalized.includes('extensão')) return 'Curso de Extensão'
  if (normalized.includes('tecnologo') || normalized.includes('tecnólogo'))
    return 'Graduação Tecnológica'
  return 'Graduação'
}

/**
 * Gera e abre o Certificado em formato PDF para impressão/salvamento no navegador.
 * Segue o padrão de design institucional do PortalCursos.NG em A4 Paisagem (Landscape),
 * com moldura clássica, brasão/insígnia vetorial, dados completos do aluno,
 * critérios cumpridos, código de autenticidade e assinaturas oficiais.
 */
export function generateCertificatePdf(cert: Certificate): void {
  const printWindow = window.open('', '_blank', 'width=1100,height=800')
  if (!printWindow) {
    alert(
      'O navegador bloqueou a abertura da janela para exibição do Certificado. Por favor, permita pop-ups para este site.',
    )
    return
  }

  const documentTitle = `certificado-${cert.verificationCode}`
  const formattedIssueDate = formatDateExtendedPtBr(cert.issueDate)
  const courseLevelDisplay = formatCourseLevel(cert.courseLevel)
  const studentCpfDisplay = cert.studentCpf ? `inscrito(a) no CPF nº ${cert.studentCpf}` : ''

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(documentTitle)}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          background-color: #f1f5f9;
          font-family: 'Times New Roman', Times, Georgia, serif;
          color: #0f172a;
          height: 100%;
        }
        .screen-toolbar {
          background-color: #0f172a;
          color: #ffffff;
          padding: 10px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .screen-toolbar button {
          background-color: #0284c7;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }
        .screen-toolbar button:hover {
          background-color: #0369a1;
        }
        .page-container {
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .certificate-sheet {
          width: 277mm;
          height: 190mm;
          background: #ffffff;
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          padding: 14mm 16mm 12mm 16mm;
          border-radius: 4px;
          overflow: hidden;
        }
        /* Moldura institucional dupla decorativa */
        .frame-outer {
          position: absolute;
          top: 6mm;
          bottom: 6mm;
          left: 6mm;
          right: 6mm;
          border: 3px double #0284c7;
          pointer-events: none;
        }
        .frame-inner {
          position: absolute;
          top: 8.5mm;
          bottom: 8.5mm;
          left: 8.5mm;
          right: 8.5mm;
          border: 1px solid #cbd5e1;
          pointer-events: none;
        }
        .corner-ornament {
          position: absolute;
          width: 24px;
          height: 24px;
          border: 2px solid #0369a1;
        }
        .corner-tl { top: 9mm; left: 9mm; border-right: none; border-bottom: none; }
        .corner-tr { top: 9mm; right: 9mm; border-left: none; border-bottom: none; }
        .corner-bl { bottom: 9mm; left: 9mm; border-right: none; border-top: none; }
        .corner-br { bottom: 9mm; right: 9mm; border-left: none; border-top: none; }

        /* Marca d'água sutil ao fundo */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 120px;
          font-weight: 900;
          color: rgba(2, 132, 199, 0.035);
          letter-spacing: 12px;
          text-transform: uppercase;
          pointer-events: none;
          user-select: none;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          white-space: nowrap;
        }

        .cert-header {
          text-align: center;
          margin-bottom: 8px;
          position: relative;
          z-index: 2;
        }
        .institution-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }
        .institution-name {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .institution-meta {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 9.5px;
          color: #64748b;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .cert-main-title {
          font-size: 38px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 6px;
          text-transform: uppercase;
          margin: 10px 0 2px 0;
          font-family: 'Times New Roman', serif;
        }
        .cert-subtitle {
          font-size: 13px;
          font-style: italic;
          color: #475569;
          margin-bottom: 12px;
        }
        .cert-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          padding: 0 20px;
          position: relative;
          z-index: 2;
        }
        .cert-text {
          font-size: 16px;
          line-height: 1.8;
          color: #1e293b;
          margin: 0;
        }
        .student-highlight {
          font-size: 26px;
          font-weight: bold;
          color: #0369a1;
          display: block;
          margin: 8px 0;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-family: 'Times New Roman', serif;
        }
        .course-highlight {
          font-size: 20px;
          font-weight: bold;
          color: #0f172a;
          text-decoration: underline;
          text-decoration-color: #93c5fd;
        }
        .cert-metrics {
          margin-top: 10px;
          display: inline-flex;
          justify-content: center;
          gap: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 11px;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 4px 16px;
          border-radius: 9999px;
          margin-left: auto;
          margin-right: auto;
        }
        .cert-metrics strong {
          color: #0369a1;
        }
        .cert-date {
          margin-top: 12px;
          font-size: 14px;
          font-style: italic;
          color: #334155;
        }
        .cert-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 14px;
          padding-top: 10px;
          position: relative;
          z-index: 2;
        }
        .signature-block {
          text-align: center;
          width: 220px;
        }
        .signature-line {
          border-top: 1px solid #0f172a;
          margin-bottom: 4px;
        }
        .signature-name {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
        }
        .signature-role {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 9.5px;
          color: #64748b;
        }
        .seal-block {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .seal-badge {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: 2px dashed #0284c7;
          background: #f0f9ff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }
        .verification-box {
          text-align: right;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 9.5px;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 6px 12px;
          border-radius: 6px;
        }
        .verification-code {
          font-family: monospace;
          font-size: 13px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: 1.5px;
          display: block;
          margin-top: 2px;
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
          .certificate-sheet {
            box-shadow: none;
            width: 100%;
            height: 100vh;
            border-radius: 0;
            padding: 10mm 14mm 10mm 14mm;
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="screen-toolbar">
        <div>
          <strong>PortalCursos.NG</strong> — Visualização e Impressão de Certificado Acadêmico
        </div>
        <div style="display: flex; gap: 10px;">
          <button onclick="window.print()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir / Salvar PDF
          </button>
          <button onclick="window.close()" style="background-color: #475569;">
            Fechar
          </button>
        </div>
      </div>

      <div class="page-container">
        <div class="certificate-sheet">
          <div class="watermark">PORTALCURSOS</div>
          <div class="frame-outer"></div>
          <div class="frame-inner"></div>
          <div class="corner-ornament corner-tl"></div>
          <div class="corner-ornament corner-tr"></div>
          <div class="corner-ornament corner-bl"></div>
          <div class="corner-ornament corner-br"></div>

          <div class="cert-header">
            <div class="institution-logo">
              <!-- Brasão Acadêmico Vetorial -->
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
              <span class="institution-name">PortalCursos.NG</span>
            </div>
            <div class="institution-meta">
              Instituição de Ensino Superior Credenciada pelo Ministério da Educação (MEC) • Registro Geral nº 1092841
            </div>
            <h1 class="cert-main-title">Certificado</h1>
            <div class="cert-subtitle">de Conclusão e Mérito Acadêmico</div>
          </div>

          <div class="cert-body">
            <p class="cert-text">
              A Reitoria Executiva e a Secretaria Geral Acadêmica do <strong>PortalCursos.NG</strong> certificam que
            </p>

            <span class="student-highlight">${escapeHtml(cert.studentName)}</span>

            <p class="cert-text">
              ${escapeHtml(studentCpfDisplay)}, concluiu com pleno aproveitamento todos os requisitos curriculares, teóricos e práticos do curso de
              <strong class="course-highlight">${escapeHtml(cert.courseName)}</strong>,
              nível de <strong>${escapeHtml(courseLevelDisplay)}</strong>,
              com carga horária total de <strong>${cert.workloadHours} horas</strong>,
              tendo sido aprovado(a) em conformidade com as diretrizes e padrões regulatórios do MEC.
            </p>

            <div class="cert-metrics">
              ${cert.averageGrade !== undefined ? `<span>Média Final Geral: <strong>${cert.averageGrade.toFixed(1)} / 10,0</strong></span> •` : ''}
              ${cert.attendancePercent !== undefined ? `<span>Frequência Integral: <strong>${cert.attendancePercent.toFixed(1)}%</strong> (Min. 75,0%)</span> •` : ''}
              <span>Aproveitamento: <strong>Aprovado por Mérito</strong></span>
            </div>

            <div class="cert-date">
              São Paulo, ${escapeHtml(formattedIssueDate)}.
            </div>
          </div>

          <div class="cert-footer">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-name">${escapeHtml(cert.issuedBy)}</div>
              <div class="signature-role">Secretaria Acadêmica Central</div>
            </div>

            <div class="seal-block">
              <div class="seal-badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                  <circle cx="12" cy="8" r="7"></circle>
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
              </div>
              <span style="font-size: 8.5px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Selo Digital de Fé Pública</span>
            </div>

            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-name">Dra. Beatriz Santos</div>
              <div class="signature-role">Reitora e Diretoria Acadêmica</div>
            </div>

            <div class="verification-box">
              <div>Chave de Autenticidade Digital:</div>
              <span class="verification-code">${escapeHtml(cert.verificationCode)}</span>
              <div style="font-size: 8px; color: #94a3b8; margin-top: 2px;">
                Validação online: portalcursos.ng/verificar
              </div>
            </div>
          </div>
        </div>
      </div>

      <script>
        // Dispara diálogo de impressão nativo após renderização
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
