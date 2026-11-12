/// <reference path="../pb_data/types.d.ts" />
/**
 * Módulo de Inscrição em Cursos (Biblioteca de Cursos): cria a coleção
 * 'course_enrollments' — inscrições de alunos em cursos do catálogo — com
 * índices, regras de acesso RBAC e um dado de demonstração idempotente.
 * Deduplicação de inscrições é feita no app (contexto), no padrão library_loans.
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"

    let col
    try {
      col = app.findCollectionByNameOrId('course_enrollments')
      col.listRule = RULE
      col.viewRule = RULE
      col.createRule = RULE
      col.updateRule = RULE
      col.deleteRule = RULE
      app.save(col)
    } catch (_) {
      col = new Collection({
        type: 'base',
        name: 'course_enrollments',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'courseId', type: 'text', required: true, max: 60 },
          { name: 'courseName', type: 'text', max: 200 },
          { name: 'studentId', type: 'text', required: true, max: 60 },
          { name: 'studentName', type: 'text', max: 160 },
          { name: 'studentEmail', type: 'email' },
          { name: 'period', type: 'text', max: 40 },
          {
            name: 'status',
            type: 'select',
            values: ['inscrito', 'em_analise', 'cancelada'],
            required: true,
            max: 20,
          },
          { name: 'requestedByRole', type: 'text', max: 40 },
          { name: 'notes', type: 'text', max: 500 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_course_enrollments_course ON course_enrollments (courseId)',
          'CREATE INDEX idx_course_enrollments_student ON course_enrollments (studentId)',
        ],
      })
      app.save(col)
    }

    // ---------- dado de demonstração idempotente ----------
    let existing = null
    try {
      existing = app.findFirstRecordByFilter('course_enrollments', 'id != ""')
    } catch (_) {
      existing = null
    }

    if (!existing) {
      let course = null
      let student = null
      try {
        course = app.findFirstRecordByFilter('courses', "status = 'ativo'")
      } catch (_) {
        course = null
      }
      try {
        student = app.findFirstRecordByFilter('students', 'id != ""')
      } catch (_) {
        student = null
      }
      if (course && student) {
        const rec = new Record(col)
        rec.set('courseId', course.id)
        rec.set('courseName', course.get('name') || '')
        rec.set('studentId', student.id)
        rec.set('studentName', student.get('fullName') || '')
        const email = student.get('email') || ''
        if (email) rec.set('studentEmail', email)
        rec.set('period', '2026.1')
        rec.set('status', 'inscrito')
        rec.set('requestedByRole', 'aluno')
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app.deleteCollection('course_enrollments')
    } catch (_) {}
  },
)
