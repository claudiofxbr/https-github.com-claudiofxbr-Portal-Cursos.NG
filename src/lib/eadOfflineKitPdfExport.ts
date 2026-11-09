import { EadCourse, EadLesson, EadMaterial, LibraryBook, Student } from '@/types/portal'

function escapeHtml(text: string | undefined | null): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function formatMaterialTypeLabel(type?: string): string {
  switch (type) {
    case 'pdf':
      return 'PDF / Documento'
    case 'exercicio':
      return 'Exercício / Desafio'
    case 'artigo':
      return 'Artigo / Leitura'
    case 'referencia':
      return 'Referência Bibliográfica'
    case 'link':
      return 'Link Externo'
    default:
      return 'Material de Apoio'
  }
}

export interface LessonOfflineKitOptions {
  course: EadCourse
  lesson: EadLesson
  lessonIndex: number
  materials: EadMaterial[]
  recommendedBooks?: LibraryBook[]
  student?: Student | null
  generatedBy?: string
}

export interface CourseOfflineKitOptions {
  course: EadCourse
  lessons: EadLesson[]
  materials: EadMaterial[]
  recommendedBooks?: LibraryBook[]
  student?: Student | null
  generatedBy?: string
}

const COMMON_CSS = `
  @page {
    size: A4 portrait;
    margin: 12mm 14mm 14mm 14mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #f8fafc;
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
  .screen-toolbar .title-block {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
  }
  .screen-toolbar button {
    background: #4f46e5;
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
    transition: background 0.15s ease;
  }
  .screen-toolbar button:hover {
    background: #4338ca;
  }
  .screen-toolbar .btn-close {
    background: #334155;
  }
  .screen-toolbar .btn-close:hover {
    background: #475569;
  }
  .page-container {
    padding: 24px 16px;
    display: flex;
    justify-content: center;
  }
  .doc-sheet {
    background: #ffffff;
    width: 210mm;
    min-height: 297mm;
    padding: 16mm 18mm;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border-radius: 4px;
    position: relative;
  }
  .header-institution {
    border-bottom: 2px solid #4f46e5;
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand-logo-icon {
    width: 36px;
    height: 36px;
    background: #eef2ff;
    border: 1.5px solid #6366f1;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4f46e5;
  }
  .brand-text h1 {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.3px;
    margin: 0;
  }
  .brand-text p {
    font-size: 10px;
    color: #64748b;
    margin-top: 1px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .header-badge {
    text-align: right;
  }
  .kit-tag {
    display: inline-block;
    background: #eef2ff;
    color: #4338ca;
    border: 1px solid #c7d2fe;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 9999px;
    letter-spacing: 0.5px;
  }
  .kit-date {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 4px;
  }
  .banner-box {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #4f46e5;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 16px;
  }
  .banner-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
  }
  .banner-item {
    font-size: 10.5px;
  }
  .banner-label {
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 1px;
  }
  .banner-value {
    color: #0f172a;
    font-weight: 600;
  }
  .offline-notice {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 16px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 10px;
    color: #92400e;
    line-height: 1.4;
  }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #1e1b4b;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 16px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .material-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 9px 12px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .material-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 4px;
  }
  .material-title {
    font-size: 11.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .material-type-pill {
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #cbd5e1;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
    text-transform: uppercase;
  }
  .material-desc {
    font-size: 10px;
    color: #475569;
    margin-bottom: 5px;
    line-height: 1.35;
  }
  .material-url-box {
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 4px;
    padding: 4px 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 9.5px;
    color: #4338ca;
    word-break: break-all;
    line-height: 1.3;
  }
  .book-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #8b5cf6;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 6px;
    page-break-inside: avoid;
  }
  .book-title {
    font-size: 11px;
    font-weight: 700;
    color: #0f172a;
  }
  .book-meta {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 2px;
  }
  .notes-section {
    margin-top: 18px;
    page-break-inside: avoid;
  }
  .notes-box {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    padding: 10px 14px;
    min-height: 140px;
  }
  .note-lines {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .note-line {
    border-bottom: 1px dashed #cbd5e1;
    height: 1px;
  }
  .footer-doc {
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9px;
    color: #94a3b8;
    page-break-inside: avoid;
  }
  .lesson-divider {
    border-top: 2px dashed #cbd5e1;
    margin: 20px 0 16px 0;
    page-break-before: auto;
  }
  .lesson-block {
    margin-bottom: 18px;
    page-break-inside: avoid;
  }
  .lesson-block-title {
    font-size: 12.5px;
    font-weight: 700;
    color: #1e1b4b;
    background: #f1f5f9;
    padding: 6px 10px;
    border-radius: 4px;
    border-left: 3px solid #4f46e5;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    .doc-sheet {
      box-shadow: none;
      padding: 0;
      width: 100%;
      min-height: auto;
      border-radius: 0;
    }
  }
`

/**
 * Gera e abre o Kit de Estudo da Aula em formato PDF A4 institucional
 */
export function generateLessonOfflineKitPdf(options: LessonOfflineKitOptions): void {
  const {
    course,
    lesson,
    lessonIndex,
    materials,
    recommendedBooks = [],
    student,
    generatedBy,
  } = options

  const printWindow = window.open('', '_blank', 'width=1024,height=850')
  if (!printWindow) {
    alert(
      'O navegador bloqueou a abertura da janela do Kit de Estudo. Por favor, autorize pop-ups para este site.',
    )
    return
  }

  const now = new Date()
  const generatedAtFormatted = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const studentNameDisplay = student?.fullName || 'Estudante Autenticado'
  const studentCpfDisplay = student?.cpf ? `CPF: ${student.cpf}` : 'Vínculo Regular AVA'
  const lessonNumberDisplay = String(lessonIndex + 1).padStart(2, '0')
  const slugTitle = sanitizeSlug(lesson.title || 'aula')
  const filename = `kit-estudo-aula-${lessonNumberDisplay}-${slugTitle}.pdf`

  const materialsHtml =
    materials.length === 0
      ? `
        <div style="padding: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center; color: #64748b; font-size: 10.5px;">
          Nenhum material complementar cadastrado especificamente para esta aula. Utilize os tópicos e a bibliografia recomendada abaixo para seus estudos offline.
        </div>
      `
      : materials
          .map((mat) => {
            const hasValidUrl = mat.url && mat.url.trim().length > 0 && mat.url !== '#'
            return `
              <div class="material-card">
                <div class="material-header">
                  <span class="material-title">${escapeHtml(mat.title)}</span>
                  <span class="material-type-pill">${escapeHtml(formatMaterialTypeLabel(mat.type))}</span>
                </div>
                ${mat.description ? `<p class="material-desc">${escapeHtml(mat.description)}</p>` : ''}
                ${
                  hasValidUrl
                    ? `
                      <div class="material-url-box">
                        <strong>Link direto para download / acesso offline:</strong><br/>
                        ${escapeHtml(mat.url)}
                      </div>
                    `
                    : '<div style="font-size: 9.5px; color: #94a3b8; font-style: italic;">Material interno disponibilizado no AVA</div>'
                }
              </div>
            `
          })
          .join('')

  const booksHtml =
    recommendedBooks.length === 0
      ? `
        <div style="padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center; color: #64748b; font-size: 10px;">
          Nenhuma obra cadastrada na bibliografia do curso.
        </div>
      `
      : recommendedBooks
          .map((b) => {
            const metaParts = [
              b.author ? `Autor(a): ${b.author}` : '',
              b.year ? `Ano: ${b.year}` : '',
              b.publisher ? `Editora: ${b.publisher}` : '',
              b.isbn ? `ISBN: ${b.isbn}` : '',
              b.category ? `Categoria: ${b.category}` : '',
            ].filter(Boolean)

            return `
              <div class="book-card">
                <div class="book-title">${escapeHtml(b.title)}</div>
                <div class="book-meta">${escapeHtml(metaParts.join(' • '))}</div>
                ${b.description ? `<p style="font-size: 9.5px; color: #475569; margin-top: 3px; line-height: 1.3;">${escapeHtml(b.description)}</p>` : ''}
              </div>
            `
          })
          .join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(filename)}</title>
      <style>${COMMON_CSS}</style>
    </head>
    <body>
      <div class="screen-toolbar">
        <div class="title-block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <div>
            <strong>PortalCursos.NG</strong> — Kit de Estudo da Aula (Offline)
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.print()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir / Salvar PDF
          </button>
          <button onclick="window.close()" class="btn-close">Fechar</button>
        </div>
      </div>

      <div class="page-container">
        <div class="doc-sheet">
          <div class="header-institution">
            <div class="header-brand">
              <div class="brand-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div class="brand-text">
                <h1>PortalCursos.NG</h1>
                <p>Educação a Distância • Ambiente Virtual de Aprendizagem</p>
              </div>
            </div>
            <div class="header-badge">
              <span class="kit-tag">Kit de Estudo da Aula</span>
              <div class="kit-date">Gerado em ${escapeHtml(generatedAtFormatted)}</div>
            </div>
          </div>

          <div class="banner-box">
            <div class="banner-grid">
              <div class="banner-item">
                <span class="banner-label">Curso EAD</span>
                <span class="banner-value">${escapeHtml(course.title)}</span>
              </div>
              <div class="banner-item">
                <span class="banner-label">Estudante</span>
                <span class="banner-value">${escapeHtml(studentNameDisplay)} (${escapeHtml(studentCpfDisplay)})</span>
              </div>
              <div class="banner-item">
                <span class="banner-label">Aula</span>
                <span class="banner-value">#${lessonNumberDisplay} — ${escapeHtml(lesson.title)}</span>
              </div>
              <div class="banner-item">
                <span class="banner-label">Módulo & Carga Horária</span>
                <span class="banner-value">${escapeHtml(lesson.moduleName || 'Geral')} • ${lesson.durationMinutes || 15} min (Curso: ${course.workloadHours || 20}h)</span>
              </div>
            </div>
          </div>

          <div class="offline-notice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <strong>Instruções para Estudo Offline:</strong>
              As videoaulas exigem streaming em rede. Para estudar desconectado, salve antecipadamente os links e documentos PDF indicados abaixo. Anote dúvidas e resoluções à mão nas linhas ao final da folha.
            </div>
          </div>

          ${
            lesson.description
              ? `
                <div style="margin-bottom: 16px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                  <span style="display: block; font-weight: 700; font-size: 10px; color: #334155; text-transform: uppercase; margin-bottom: 3px;">Notas e Roteiro da Aula:</span>
                  <div style="font-size: 10.5px; color: #1e293b; white-space: pre-line; line-height: 1.45;">${escapeHtml(lesson.description)}</div>
                </div>
              `
              : ''
          }

          <div class="section-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Materiais Complementares da Aula (${materials.length})
          </div>
          ${materialsHtml}

          <div class="section-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Bibliografia Recomendada do Curso (${recommendedBooks.length})
          </div>
          ${booksHtml}

          <div class="notes-section">
            <div class="section-title" style="margin-top: 14px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
              Anotações do Aluno (Estudo Offline)
            </div>
            <div class="notes-box">
              <span style="font-size: 9.5px; color: #64748b; font-style: italic;">
                Espaço para resumos manuais, anotação de dúvidas, exercícios e pontos-chave para revisão:
              </span>
              <div class="note-lines">
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
              </div>
            </div>
          </div>

          <div class="footer-doc">
            <div>PortalCursos.NG • Material exclusivo para uso acadêmico pessoal • Não substitui a presença/conclusão na plataforma</div>
            <div>${escapeHtml(generatedBy || 'Secretaria Acadêmica')}</div>
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

/**
 * Gera e abre o Kit de Estudo do Curso Completo em formato PDF A4 institucional
 */
export function generateCourseOfflineKitPdf(options: CourseOfflineKitOptions): void {
  const { course, lessons, materials, recommendedBooks = [], student, generatedBy } = options

  const printWindow = window.open('', '_blank', 'width=1024,height=850')
  if (!printWindow) {
    alert(
      'O navegador bloqueou a abertura da janela do Kit de Estudo do Curso. Por favor, autorize pop-ups para este site.',
    )
    return
  }

  const now = new Date()
  const generatedAtFormatted = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const studentNameDisplay = student?.fullName || 'Estudante Autenticado'
  const studentCpfDisplay = student?.cpf ? `CPF: ${student.cpf}` : 'Vínculo Regular AVA'
  const slugTitle = sanitizeSlug(course.title || 'curso-ead')
  const filename = `kit-estudo-curso-${slugTitle}.pdf`

  const sortedLessons = [...lessons].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))

  const lessonsBlocksHtml = sortedLessons
    .map((l, idx) => {
      const lessonMaterials = materials
        .filter((m) => m.lessonId === l.id)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))

      const materialsListHtml =
        lessonMaterials.length === 0
          ? '<p style="font-size: 10px; color: #94a3b8; font-style: italic; margin-left: 8px;">Sem materiais complementares específicos cadastrados.</p>'
          : lessonMaterials
              .map((mat) => {
                const hasValidUrl = mat.url && mat.url.trim().length > 0 && mat.url !== '#'
                return `
                  <div style="margin-left: 6px; margin-bottom: 6px; padding: 6px 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
                      <span style="font-weight: 700; font-size: 10.5px; color: #0f172a;">${escapeHtml(mat.title)}</span>
                      <span class="material-type-pill">${escapeHtml(formatMaterialTypeLabel(mat.type))}</span>
                    </div>
                    ${mat.description ? `<p style="font-size: 9.5px; color: #64748b; margin-top: 2px;">${escapeHtml(mat.description)}</p>` : ''}
                    ${
                      hasValidUrl
                        ? `
                          <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9px; color: #4338ca; word-break: break-all;">
                            URL: ${escapeHtml(mat.url)}
                          </div>
                        `
                        : ''
                    }
                  </div>
                `
              })
              .join('')

      return `
        <div class="lesson-block">
          <div class="lesson-block-title">
            <span>Aula ${String(idx + 1).padStart(2, '0')}: ${escapeHtml(l.title)}</span>
            <span style="font-size: 10px; color: #475569; font-weight: normal;">
              ${escapeHtml(l.moduleName || 'Módulo Geral')} • ${l.durationMinutes || 15} min
            </span>
          </div>
          ${
            l.description
              ? `<div style="font-size: 10px; color: #334155; margin-bottom: 6px; margin-left: 6px; line-height: 1.4;"><strong>Roteiro da Aula:</strong> ${escapeHtml(l.description)}</div>`
              : ''
          }
          <div style="font-size: 10px; font-weight: 600; color: #475569; margin-left: 6px; margin-bottom: 4px;">
            Materiais de Apoio da Aula (${lessonMaterials.length}):
          </div>
          ${materialsListHtml}
        </div>
      `
    })
    .join('')

  const booksHtml =
    recommendedBooks.length === 0
      ? `
        <div style="padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center; color: #64748b; font-size: 10px;">
          Nenhuma obra cadastrada na bibliografia do curso.
        </div>
      `
      : recommendedBooks
          .map((b) => {
            const metaParts = [
              b.author ? `Autor(a): ${b.author}` : '',
              b.year ? `Ano: ${b.year}` : '',
              b.publisher ? `Editora: ${b.publisher}` : '',
              b.isbn ? `ISBN: ${b.isbn}` : '',
              b.category ? `Categoria: ${b.category}` : '',
            ].filter(Boolean)

            return `
              <div class="book-card">
                <div class="book-title">${escapeHtml(b.title)}</div>
                <div class="book-meta">${escapeHtml(metaParts.join(' • '))}</div>
                ${b.description ? `<p style="font-size: 9.5px; color: #475569; margin-top: 3px; line-height: 1.3;">${escapeHtml(b.description)}</p>` : ''}
              </div>
            `
          })
          .join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(filename)}</title>
      <style>${COMMON_CSS}</style>
    </head>
    <body>
      <div class="screen-toolbar">
        <div class="title-block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <div>
            <strong>PortalCursos.NG</strong> — Kit de Estudo do Curso Completo (Offline)
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.print()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir / Salvar PDF
          </button>
          <button onclick="window.close()" class="btn-close">Fechar</button>
        </div>
      </div>

      <div class="page-container">
        <div class="doc-sheet">
          <div class="header-institution">
            <div class="header-brand">
              <div class="brand-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div class="brand-text">
                <h1>PortalCursos.NG</h1>
                <p>Educação a Distância • Ambiente Virtual de Aprendizagem</p>
              </div>
            </div>
            <div class="header-badge">
              <span class="kit-tag">Guia Integral do Curso</span>
              <div class="kit-date">Gerado em ${escapeHtml(generatedAtFormatted)}</div>
            </div>
          </div>

          <div class="banner-box">
            <div class="banner-grid">
              <div class="banner-item">
                <span class="banner-label">Curso EAD</span>
                <span class="banner-value">${escapeHtml(course.title)}</span>
              </div>
              <div class="banner-item">
                <span class="banner-label">Estudante</span>
                <span class="banner-value">${escapeHtml(studentNameDisplay)} (${escapeHtml(studentCpfDisplay)})</span>
              </div>
              <div class="banner-item">
                <span class="banner-label">Instrutor Responsável</span>
                <span class="banner-value">${escapeHtml(course.instructorName || 'Coordenação EAD')}</span>
              </div>
              <div class="banner-item">
                <span class="banner-label">Carga Horária & Aulas</span>
                <span class="banner-value">${course.workloadHours || 20} horas • ${sortedLessons.length} videoaulas cadastradas</span>
              </div>
            </div>
          </div>

          <div class="offline-notice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <strong>Guia de Estudos Offline para o Curso Inteiro:</strong>
              Este roteiro reúne todas as videoaulas, conteúdos e links de materiais do curso para que você possa planejar leituras, baixar os PDFs enquanto conectado e registrar seus apontamentos sem depender de sinal de internet contínuo.
            </div>
          </div>

          <div class="section-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Grade Curricular de Videoaulas e Materiais de Apoio (${sortedLessons.length} aulas)
          </div>
          ${lessonsBlocksHtml}

          <div class="section-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Bibliografia Recomendada do Curso (${recommendedBooks.length})
          </div>
          ${booksHtml}

          <div class="notes-section">
            <div class="section-title" style="margin-top: 14px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
              Anotações e Síntese Geral do Aluno (Estudo Offline)
            </div>
            <div class="notes-box">
              <span style="font-size: 9.5px; color: #64748b; font-style: italic;">
                Espaço para sintetizar os conceitos fundamentais do curso, cronograma pessoal e dúvidas a tirar com o professor:
              </span>
              <div class="note-lines">
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
                <div class="note-line"></div>
              </div>
            </div>
          </div>

          <div class="footer-doc">
            <div>PortalCursos.NG • Guia de Apoio para Estudos Offline • A conclusão deve ser homologada online no AVA</div>
            <div>${escapeHtml(generatedBy || 'Secretaria Acadêmica')}</div>
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
