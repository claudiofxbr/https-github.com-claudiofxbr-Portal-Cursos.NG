import { Certificate } from '@/types/portal'
import { formatDateExtendedPtBr } from './certificatePdfExport'

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

/** Formata o nível acadêmico solene para o Diploma */
function formatDegreeLevel(level?: string): string {
  if (!level) return 'Graduação'
  const normalized = level.toLowerCase()
  if (normalized.includes('pos') || normalized.includes('pós')) return 'Pós-Graduação Lato Sensu'
  if (normalized.includes('mestrado')) return 'Mestrado Profissional'
  if (normalized.includes('tecnologo') || normalized.includes('tecnólogo'))
    return 'Graduação Tecnológica'
  if (normalized.includes('bacharel')) return 'Bacharelado'
  if (normalized.includes('licenciatura')) return 'Licenciatura'
  return 'Graduação'
}

/** Formata o título conferido de acordo com o nível */
function formatConferredTitle(level?: string): string {
  if (!level) return 'o grau correspondente'
  const normalized = level.toLowerCase()
  if (normalized.includes('pos') || normalized.includes('pós')) return 'o título de Especialista'
  if (normalized.includes('tecnologo') || normalized.includes('tecnólogo'))
    return 'o grau de Tecnólogo'
  if (normalized.includes('licenciatura')) return 'o grau de Licenciado'
  return 'o grau de Bacharel'
}

/**
 * Gera e abre o DIPLOMA DIGITAL em formato PDF para impressão/salvamento no navegador.
 * Segue o padrão de design institucional do PortalCursos.NG em A4 Paisagem (Landscape),
 * com moldura clássica de ornatos solenes em dourado/azul marinho, brasão da República/Instituição,
 * texto solene de outorga de grau, data de colação de grau por extenso em português,
 * código de autenticidade DIPL-XXXX-XXXX, registro MEC e assinaturas do Reitor e Secretário Geral.
 */
export function generateDiplomaPdf(diploma: Certificate): void {
  const printWindow = window.open('', '_blank', 'width=1120,height=820')
  if (!printWindow) {
    alert(
      'O navegador bloqueou a abertura da janela para exibição do Diploma. Por favor, permita pop-ups para este site.',
    )
    return
  }

  const documentTitle = `diploma-digital-${diploma.verificationCode}`
  const formattedIssueDate = formatDateExtendedPtBr(diploma.issueDate)
  const graduationDateStr = diploma.graduationDate || diploma.issueDate
  const formattedGraduationDate = formatDateExtendedPtBr(graduationDateStr)
  const courseLevelDisplay = formatDegreeLevel(diploma.courseLevel)
  const conferredTitle = formatConferredTitle(diploma.courseLevel)
  const studentCpfDisplay = diploma.studentCpf
    ? `inscrito(a) no CPF sob o nº ${diploma.studentCpf}`
    : ''

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
          color: #f8fafc;
          padding: 12px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .screen-toolbar .info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .screen-toolbar .badge {
          background: rgba(217, 119, 6, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
          padding: 3px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: 700;
          font-size: 12px;
        }
        .screen-toolbar button {
          background: linear-space, #d97706;
          background-color: #b45309;
          color: #ffffff;
          border: none;
          padding: 9px 20px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          box-shadow: 0 2px 6px rgba(180, 83, 9, 0.4);
          transition: background-color 0.15s ease;
        }
        .screen-toolbar button:hover {
          background-color: #92400e;
        }
        .page-container {
          padding: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 60px);
        }
        .diploma-sheet {
          width: 277mm;
          height: 190mm;
          background: #ffffff;
          position: relative;
          box-shadow: 0 16px 40px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          padding: 13mm 16mm 10mm 16mm;
          border-radius: 3px;
          overflow: hidden;
        }

        /* Molduras Solenes Clássicas */
        .frame-outer {
          position: absolute;
          top: 6mm;
          bottom: 6mm;
          left: 6mm;
          right: 6mm;
          border: 4px double #b45309; /* Tom Dourado Nobre */
          pointer-events: none;
        }
        .frame-inner {
          position: absolute;
          top: 8.5mm;
          bottom: 8.5mm;
          left: 8.5mm;
          right: 8.5mm;
          border: 1px solid #1e3a8a; /* Azul Marinho Solene */
          pointer-events: none;
        }
        .frame-micro {
          position: absolute;
          top: 9.8mm;
          bottom: 9.8mm;
          left: 9.8mm;
          right: 9.8mm;
          border: 0.5px dashed #cbd5e1;
          pointer-events: none;
        }

        /* Cantoneiras Nobres */
        .corner-ornament {
          position: absolute;
          width: 28px;
          height: 28px;
          border: 2.5px solid #b45309;
        }
        .corner-tl { top: 10.5mm; left: 10.5mm; border-right: none; border-bottom: none; }
        .corner-tr { top: 10.5mm; right: 10.5mm; border-left: none; border-bottom: none; }
        .corner-bl { bottom: 10.5mm; left: 10.5mm; border-right: none; border-top: none; }
        .corner-br { bottom: 10.5mm; right: 10.5mm; border-left: none; border-top: none; }

        /* Selo / Marca D'água */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 130px;
          font-weight: 900;
          color: rgba(180, 83, 9, 0.03);
          letter-spacing: 14px;
          text-transform: uppercase;
          pointer-events: none;
          user-select: none;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          white-space: nowrap;
        }

        .diploma-header {
          text-align: center;
          margin-bottom: 6px;
          position: relative;
          z-index: 2;
        }
        .republica-title {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 10px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #475569;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .institution-logo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin: 2px 0 3px 0;
        }
        .institution-name {
          font-family: 'Times New Roman', Georgia, serif;
          font-size: 24px;
          font-weight: 800;
          color: #1e3a8a;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .institution-meta {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 9px;
          color: #64748b;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .diploma-main-title {
          font-size: 42px;
          font-weight: 700;
          color: #b45309;
          letter-spacing: 8px;
          text-transform: uppercase;
          margin: 6px 0 2px 0;
          font-family: 'Times New Roman', serif;
          text-shadow: 1px 1px 0px rgba(0,0,0,0.06);
        }
        .diploma-subtitle {
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #1e3a8a;
          font-weight: 600;
          margin-bottom: 8px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .diploma-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          padding: 0 16px;
          position: relative;
          z-index: 2;
        }
        .outorga-intro {
          font-size: 14px;
          font-style: italic;
          color: #334155;
          margin-bottom: 6px;
          line-height: 1.4;
        }
        .student-name {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 1.5px;
          margin: 4px 0;
          font-family: 'Times New Roman', Georgia, serif;
          border-bottom: 1.5px solid #e2e8f0;
          display: inline-block;
          padding-bottom: 2px;
        }
        .student-meta {
          font-size: 12px;
          color: #475569;
          margin-bottom: 8px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .outorga-text {
          font-size: 14px;
          color: #1e293b;
          line-height: 1.5;
          max-width: 820px;
          margin: 0 auto;
        }
        .course-highlight {
          font-size: 18px;
          font-weight: 700;
          color: #1e3a8a;
          letter-spacing: 0.5px;
        }

        .colacao-date-box {
          margin-top: 10px;
          font-size: 13.5px;
          color: #0f172a;
          font-style: italic;
        }

        .diploma-footer {
          margin-top: auto;
          position: relative;
          z-index: 2;
        }
        .signatures-row {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          margin: 10px 0 8px 0;
          padding: 0 10px;
        }
        .signature-block {
          text-align: center;
          width: 220px;
        }
        .signature-line {
          border-top: 1px solid #1e293b;
          margin-bottom: 4px;
        }
        .signature-name {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .signature-role {
          font-size: 9.5px;
          color: #64748b;
          font-style: italic;
        }

        .audit-strip {
          border-top: 1px solid #cbd5e1;
          padding-top: 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 8.5px;
          color: #64748b;
        }
        .audit-code {
          font-family: monospace;
          font-size: 10.5px;
          font-weight: 700;
          color: #b45309;
          background: #fef3c7;
          padding: 2px 6px;
          border-radius: 3px;
          border: 1px solid #fde68a;
        }

        @media print {
          body {
            background-color: #ffffff;
          }
          .screen-toolbar {
            display: none !important;
          }
          .page-container {
            padding: 0 !important;
            min-height: auto !important;
          }
          .diploma-sheet {
            box-shadow: none !important;
            margin: 0 auto;
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="screen-toolbar">
        <div class="info">
          <strong>🎓 Visualização Oficial do Diploma Digital</strong>
          <span class="badge">${escapeHtml(diploma.verificationCode)}</span>
          <span>Aluno: <strong>${escapeHtml(diploma.studentName)}</strong></span>
        </div>
        <button onclick="window.print()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Imprimir / Salvar PDF
        </button>
      </div>

      <div class="page-container">
        <div class="diploma-sheet">
          <!-- Molduras Solenes Triplas -->
          <div class="frame-outer"></div>
          <div class="frame-inner"></div>
          <div class="frame-micro"></div>

          <!-- Cantoneiras Nobres -->
          <div class="corner-ornament corner-tl"></div>
          <div class="corner-ornament corner-tr"></div>
          <div class="corner-ornament corner-bl"></div>
          <div class="corner-ornament corner-br"></div>

          <!-- Marca D'água Central -->
          <div class="watermark">DIPLOMA</div>

          <!-- Cabeçalho Institucional Solene -->
          <div class="diploma-header">
            <div class="republica-title">República Federativa do Brasil • Ministério da Educação</div>
            <div class="institution-logo">
              <!-- Brasão Solene Vetorial -->
              <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="#b45309" stroke-width="2" fill="#fffbeb"/>
                <path d="M24 8L34 16V28C34 35 24 40 24 40C24 40 14 35 14 28V16L24 8Z" fill="#1e3a8a" stroke="#b45309" stroke-width="1.5"/>
                <polygon points="24,14 26.5,21 34,21 28,25.5 30.5,32.5 24,28 17.5,32.5 20,25.5 14,21 21.5,21" fill="#f59e0b"/>
              </svg>
              <div class="institution-name">PortalCursos.NG Instituição de Ensino Superior</div>
            </div>
            <div class="institution-meta">
              Credenciada pela Portaria Ministerial MEC nº 1.482/2018 • Sistema Nacional de Educação Superior • e-MEC
            </div>
            <div class="diploma-main-title">D I P L O M A</div>
            <div class="diploma-subtitle">Documento Oficial de Registro de Grau Acadêmico Nacional</div>
          </div>

          <!-- Corpo do Diploma: Outorga de Grau -->
          <div class="diploma-body">
            <div class="outorga-intro">
              O Reitor e a Congregação Geral da Instituição, no uso de suas atribuições legais e regimentais, conferem a
            </div>

            <div>
              <div class="student-name">${escapeHtml(diploma.studentName)}</div>
            </div>

            <div class="student-meta">
              de nacionalidade brasileira, ${escapeHtml(studentCpfDisplay)},
            </div>

            <div class="outorga-text">
              tendo concluído com pleno êxito todos os componentes curriculares, estágios e exigências legais do curso de
              <div class="course-highlight" style="margin: 4px 0;">
                ${escapeHtml(courseLevelDisplay)} em ${escapeHtml(diploma.courseName)}
              </div>
              com carga horária letiva total de <strong>${escapeHtml(diploma.workloadHours)} horas</strong>,
              outorga-lhe <strong>${escapeHtml(conferredTitle)}</strong> com todos os direitos, prerrogativas e deveres
              assegurados pelas leis da República Federativa do Brasil.
            </div>

            <div class="colacao-date-box">
              Colação de grau realizada solenemente em <strong>${escapeHtml(formattedGraduationDate)}</strong>.
            </div>
          </div>

          <!-- Rodapé com Assinaturas Oficiais e Auditoria Digital -->
          <div class="diploma-footer">
            <div class="signatures-row">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">${escapeHtml(diploma.studentName)}</div>
                <div class="signature-role">Diplomado(a)</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">${escapeHtml(diploma.issuedBy || 'Secretaria Geral Acadêmica')}</div>
                <div class="signature-role">Secretário(a) Geral de Registro Acadêmico</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">Prof. Dr. Ricardo Albuquerque de Castro</div>
                <div class="signature-role">Reitor da Instituição</div>
              </div>
            </div>

            <div class="audit-strip">
              <div>
                <strong>Registro Institucional de Diplomas:</strong> Livro D-04 • Folha 128 • Processo nº MEC/e-MEC 2026/0891
              </div>
              <div>
                Código de Autenticidade Digital: <span class="audit-code">${escapeHtml(diploma.verificationCode)}</span>
              </div>
              <div>
                Expedido em São Paulo - SP, ${escapeHtml(formattedIssueDate)}.
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
