import { Certificate } from '@/types/portal'
import { formatDateExtendedPtBr } from './certificatePdfExport'

function escapeHtml(text: string | undefined | null): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Gera e abre o Certificado de Conclusão de Curso EAD em formato PDF institucional A4 Paisagem (Landscape).
 * Identidade visual própria do EAD do PortalCursos.NG:
 * - Cores temáticas violeta / índigo / ciano do AVA / EAD
 * - Código de autenticidade padrão CEAD-XXXX-XXXX
 * - Carga horária total do curso EAD (workloadHours)
 * - Assinatura do instrutor / coordenação EAD e Secretaria Acadêmica
 * - 100% das videoaulas e atividades concluídas no Ambiente Virtual de Aprendizagem (AVA)
 */
export function generateEadCertificatePdf(cert: Certificate): void {
  const printWindow = window.open('', '_blank', 'width=1100,height=800')
  if (!printWindow) {
    alert(
      'O navegador bloqueou a abertura da janela para exibição do Certificado EAD. Por favor, permita pop-ups para este site.',
    )
    return
  }

  const documentTitle = `certificado-ead-${cert.verificationCode}`
  const formattedIssueDate = formatDateExtendedPtBr(cert.issueDate)
  const studentCpfDisplay = cert.studentCpf ? `inscrito(a) no CPF nº ${cert.studentCpf}` : ''
  const workloadDisplay =
    cert.workloadHours > 0 ? `${cert.workloadHours} horas` : 'Carga horária integral'

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
          background-color: #0f172a;
          font-family: 'Times New Roman', Times, Georgia, serif;
          color: #0f172a;
          height: 100%;
        }
        .screen-toolbar {
          background-color: #020617;
          color: #ffffff;
          padding: 10px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          border-bottom: 1px solid #1e293b;
        }
        .screen-toolbar button {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
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
          transition: background 0.2s;
        }
        .screen-toolbar button:hover {
          background: linear-gradient(135deg, #4f46e5, #4338ca);
        }
        .page-container {
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f1f5f9;
          min-height: calc(100vh - 50px);
        }
        .certificate-sheet {
          width: 277mm;
          height: 190mm;
          background: #ffffff;
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          padding: 14mm 16mm 12mm 16mm;
          border-radius: 4px;
          overflow: hidden;
        }
        /* Moldura institucional dupla decorativa EAD (Índigo & Violeta) */
        .frame-outer {
          position: absolute;
          top: 6mm;
          bottom: 6mm;
          left: 6mm;
          right: 6mm;
          border: 3px double #4f46e5;
          pointer-events: none;
        }
        .frame-inner {
          position: absolute;
          top: 8.5mm;
          bottom: 8.5mm;
          left: 8.5mm;
          right: 8.5mm;
          border: 1px solid #c7d2fe;
          pointer-events: none;
        }
        .corner-ornament {
          position: absolute;
          width: 24px;
          height: 24px;
          border: 2px solid #4338ca;
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
          font-size: 110px;
          font-weight: 900;
          color: rgba(99, 102, 241, 0.04);
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
          color: #4338ca;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .ead-badge {
          display: inline-block;
          background: #eef2ff;
          color: #4f46e5;
          border: 1px solid #c7d2fe;
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-left: 6px;
        }
        .institution-meta {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 9.5px;
          color: #64748b;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .cert-main-title {
          font-size: 36px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 5px;
          text-transform: uppercase;
          margin: 8px 0 2px 0;
          font-family: 'Times New Roman', serif;
        }
        .cert-subtitle {
          font-size: 13px;
          font-style: italic;
          color: #4f46e5;
          font-weight: 600;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
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
          font-size: 15.5px;
          line-height: 1.75;
          color: #1e293b;
          margin: 0;
        }
        .student-highlight {
          font-size: 26px;
          font-weight: bold;
          color: #312e81;
          display: block;
          margin: 6px 0;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-family: 'Times New Roman', serif;
        }
        .course-highlight {
          font-size: 20px;
          font-weight: bold;
          color: #0f172a;
          text-decoration: underline;
          text-decoration-color: #a5b4fc;
        }
        .cert-metrics {
          margin-top: 10px;
          display: inline-flex;
          justify-content: center;
          gap: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 11px;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e0e7ff;
          padding: 4px 18px;
          border-radius: 9999px;
          margin-left: auto;
          margin-right: auto;
        }
        .cert-metrics strong {
          color: #4338ca;
        }
        .cert-date {
          margin-top: 10px;
          font-size: 13.5px;
          font-style: italic;
          color: #334155;
        }
        .cert-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 12px;
          padding-top: 8px;
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
          border: 2px dashed #4f46e5;
          background: #eef2ff;
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
          border: 1px solid #e0e7ff;
          padding: 6px 12px;
          border-radius: 6px;
        }
        .verification-code {
          font-family: monospace;
          font-size: 13px;
          font-weight: 800;
          color: #4338ca;
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
            background: #ffffff;
            min-height: auto;
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
          <strong>PortalCursos.NG</strong> — Certificado Digital de Curso EAD (Ambiente Virtual de Aprendizagem)
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
          <button onclick="window.close()" style="background: #475569;">
            Fechar
          </button>
        </div>
      </div>

      <div class="page-container">
        <div class="certificate-sheet">
          <div class="watermark">EAD • CURSOS</div>
          <div class="frame-outer"></div>
          <div class="frame-inner"></div>
          <div class="corner-ornament corner-tl"></div>
          <div class="corner-ornament corner-tr"></div>
          <div class="corner-ornament corner-bl"></div>
          <div class="corner-ornament corner-br"></div>

          <div class="cert-header">
            <div class="institution-logo">
              <!-- Ícone EAD / Monitor Acadêmico -->
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              <span class="institution-name">PortalCursos.NG</span>
              <span class="ead-badge">Educação a Distância (EAD)</span>
            </div>
            <div class="institution-meta">
              Ambiente Virtual de Aprendizagem (AVA) • Credenciamento Institucional MEC nº 1092841
            </div>
            <h1 class="cert-main-title">Certificado EAD</h1>
            <div class="cert-subtitle">de Conclusão de Curso Online / Educação a Distância</div>
          </div>

          <div class="cert-body">
            <p class="cert-text">
              A Coordenação de Educação a Distância e a Secretaria Acadêmica do <strong>PortalCursos.NG</strong> certificam que
            </p>

            <span class="student-highlight">${escapeHtml(cert.studentName)}</span>

            <p class="cert-text">
              ${escapeHtml(studentCpfDisplay)}, concluiu com aproveitamento de <strong>100% das videoaulas, atividades e materiais complementares</strong> do curso EAD
              <strong class="course-highlight">${escapeHtml(cert.courseName)}</strong>,
              ministrado em plataforma online com carga horária certificada de <strong>${escapeHtml(workloadDisplay)}</strong>,
              integrando as horas formativas e complementares da instituição.
            </p>

            <div class="cert-metrics">
              <span>Progresso no AVA: <strong>100% das aulas concluídas</strong></span> •
              <span>Modalidade: <strong>EAD Autoinstrucional</strong></span> •
              <span>Validação: <strong>Autenticidade Verificável</strong></span>
            </div>

            <div class="cert-date">
              São Paulo, ${escapeHtml(formattedIssueDate)}.
            </div>
          </div>

          <div class="cert-footer">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-name">${escapeHtml(cert.issuedBy || 'Coordenação EAD')}</div>
              <div class="signature-role">Instrutor / Coordenação EAD</div>
            </div>

            <div class="seal-block">
              <div class="seal-badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
              </div>
              <span style="font-size: 8.5px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px;">Selo Digital AVA / EAD</span>
            </div>

            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-name">Secretaria Acadêmica</div>
              <div class="signature-role">Diretoria de Registros Escolares</div>
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
