/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0041: cria a coleção course_enrollments (inscrições em cursos
 * da Biblioteca de Cursos).
 *
 * Campos espelham o tipo Enrollment de src/types/portal.ts e o payload já
 * escrito por src/lib/portalDb.ts (createCourseEnrollment) e
 * src/lib/enrollmentDb.ts:
 *  - studentId (text, required) - id do registro em students
 *  - studentName (text, required)
 *  - studentEmail (text)
 *  - courseId (text, required) - id do registro em courses
 *  - courseCode / courseName (text)
 *  - courseLevel / courseModality (text) - nível e modalidade no momento da inscrição
 *  - workloadHours (number) - carga horária do curso
 *  - period (text) - turma/período sugerido pelo sistema
 *  - requestedPeriod (text) - período preferido informado pelo candidato
 *  - status (select: inscrita | em_analise | confirmada | cancelada)
 *  - requestedAt (text, YYYY-MM-DD)
 *  - notes (text)
 *  - reviewedBy / reviewedAt (text) - análise da secretaria
 *  - created / updated (autodate)
 *
 * Regras de acesso (padrão da migração 0037):
 *  - Aluno vê e cria as PRÓPRIAS inscrições (auth.studentId = studentId);
 *  - Equipe (qualquer perfil exceto aluno) vê, cria, analisa e cancela todas;
 *  - Nenhum acesso público.
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"
    const TEAM_RULE = "@request.auth.id != '' && @request.auth.role != 'aluno'"
    const OWNER_RULE = "@request.auth.studentId != '' && @request.auth.studentId = studentId"

    let col
    try {
      col = app.findCollectionByNameOrId('course_enrollments')
    } catch (_) {
      col = new Collection({
        type: 'base',
        name: 'course_enrollments',
        listRule: `( ${TEAM_RULE} ) || ${OWNER_RULE}`,
        viewRule: `( ${TEAM_RULE} ) || ${OWNER_RULE}`,
        createRule: `( ${TEAM_RULE} ) || ${OWNER_RULE}`,
        updateRule: TEAM_RULE,
        deleteRule: TEAM_RULE,
        fields: [
          { name: 'studentId', type: 'text', required: true, max: 60 },
          { name: 'studentName', type: 'text', required: true, max: 180 },
          { name: 'studentEmail', type: 'text', max: 180 },
          { name: 'courseId', type: 'text', required: true, max: 60 },
          { name: 'courseCode', type: 'text', max: 40 },
          { name: 'courseName', type: 'text', max: 200 },
          { name: 'courseLevel', type: 'text', max: 40 },
          { name: 'courseModality', type: 'text', max: 40 },
          { name: 'workloadHours', type: 'number', min: 0, max: 10000 },
          { name: 'period', type: 'text', max: 120 },
          { name: 'requestedPeriod', type: 'text', max: 120 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['inscrita', 'em_analise', 'confirmada', 'cancelada'],
          },
          { name: 'requestedAt', type: 'text', required: true, max: 10 },
          { name: 'notes', type: 'text', max: 2000 },
          { name: 'reviewedBy', type: 'text', max: 180 },
          { name: 'reviewedAt', type: 'text', max: 40 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_enrollments_student ON course_enrollments (studentId)',
          'CREATE INDEX idx_enrollments_course ON course_enrollments (courseId)',
          'CREATE INDEX idx_enrollments_status ON course_enrollments (status)',
        ],
      })
      app.save(col)
    }

    // Idempotente: garante que as regras fiquem no formato esperado
    if (col.listRule !== `( ${TEAM_RULE} ) || ${OWNER_RULE}` || col.updateRule !== TEAM_RULE) {
      col.listRule = `( ${TEAM_RULE} ) || ${OWNER_RULE}`
      col.viewRule = `( ${TEAM_RULE} ) || ${OWNER_RULE}`
      col.createRule = `( ${TEAM_RULE} ) || ${OWNER_RULE}`
      col.updateRule = TEAM_RULE
      col.deleteRule = TEAM_RULE
      app.save(col)
    }

    // Regra geral de autenticação aplicada acima — valida apenas que o
    // PocketBase aceitou as regras (sem registros de seed: inscrições são
    // criadas pelos próprios usuários, nunca semeadas automaticamente).
    void RULE
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('course_enrollments')
      app.delete(col)
    } catch (_) {}
  },
)
