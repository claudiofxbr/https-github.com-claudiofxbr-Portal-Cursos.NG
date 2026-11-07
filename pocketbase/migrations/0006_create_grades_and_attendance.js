/// <reference path="../pb_data/types.d.ts" />
/**
 * Cria as coleções 'grades' (notas por disciplina) e 'attendance' (frequência / presenças)
 * com índices e regras de acesso de acordo com o RBAC institucional.
 *
 * Também insere dados iniciais de notas e frequência idempotentes para os alunos de demonstração.
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"

    let gradesCol
    try {
      gradesCol = app.findCollectionByNameOrId('grades')
      gradesCol.listRule = RULE
      gradesCol.viewRule = RULE
      gradesCol.createRule = RULE
      gradesCol.updateRule = RULE
      gradesCol.deleteRule = RULE
      app.save(gradesCol)
    } catch (_) {
      gradesCol = new Collection({
        type: 'base',
        name: 'grades',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'studentId', type: 'text', required: true, max: 60 },
          { name: 'studentName', type: 'text', max: 160 },
          { name: 'studentCpf', type: 'text', max: 20 },
          { name: 'courseId', type: 'text', max: 60 },
          { name: 'subject', type: 'text', required: true, max: 160 },
          { name: 'term', type: 'text', max: 40 },
          { name: 'assessmentType', type: 'text', max: 80 },
          { name: 'weight', type: 'number', min: 0, max: 10 },
          { name: 'value', type: 'number', required: false, min: 0, max: 10 },
          { name: 'date', type: 'text', max: 20 },
          { name: 'teacherId', type: 'text', max: 60 },
          { name: 'teacherName', type: 'text', max: 160 },
          { name: 'observations', type: 'text', max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_grades_student ON grades (studentId)',
          'CREATE INDEX idx_grades_subject ON grades (subject)',
          'CREATE INDEX idx_grades_course ON grades (courseId)',
        ],
      })
      app.save(gradesCol)
    }

    let attendanceCol
    try {
      attendanceCol = app.findCollectionByNameOrId('attendance')
      attendanceCol.listRule = RULE
      attendanceCol.viewRule = RULE
      attendanceCol.createRule = RULE
      attendanceCol.updateRule = RULE
      attendanceCol.deleteRule = RULE
      app.save(attendanceCol)
    } catch (_) {
      attendanceCol = new Collection({
        type: 'base',
        name: 'attendance',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'studentId', type: 'text', required: true, max: 60 },
          { name: 'studentName', type: 'text', max: 160 },
          { name: 'studentCpf', type: 'text', max: 20 },
          { name: 'courseId', type: 'text', max: 60 },
          { name: 'subject', type: 'text', required: true, max: 160 },
          { name: 'term', type: 'text', max: 40 },
          { name: 'date', type: 'text', required: true, max: 20 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['presente', 'falta', 'falta_justificada'],
          },
          { name: 'hours', type: 'number', min: 1, max: 10 },
          { name: 'teacherId', type: 'text', max: 60 },
          { name: 'teacherName', type: 'text', max: 160 },
          { name: 'justification', type: 'text', max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_attendance_student ON attendance (studentId)',
          'CREATE INDEX idx_attendance_subject ON attendance (subject)',
          'CREATE INDEX idx_attendance_date ON attendance (date)',
        ],
      })
      app.save(attendanceCol)
    }

    // --------------------------------------------------------------- Seed inicial
    let lucasStudentId = 'std-001'
    try {
      const foundLucas = app.findFirstRecordByFilter('students', "email = 'aluno@portalcursos.ng'")
      if (foundLucas) {
        lucasStudentId = foundLucas.id
      }
    } catch (_) {}

    // Seed de notas idempotente
    const countGrades = app.countRecords('grades')
    if (countGrades === 0) {
      const sampleGrades = [
        {
          studentId: lucasStudentId,
          studentName: 'Lucas Martins Ferreira',
          studentCpf: '890.123.456-78',
          courseId: 'crs-eng-soft',
          subject: 'Arquitetura de Software e Microsserviços',
          term: '2024.2',
          assessmentType: 'P1 - Avaliação Teórica',
          weight: 4,
          value: 8.5,
          date: '2024-10-15',
          teacherName: 'Profª. Dra. Vanessa Moura',
          observations: 'Excelente domínio em padrões de arquitetura distribuída.',
        },
        {
          studentId: lucasStudentId,
          studentName: 'Lucas Martins Ferreira',
          studentCpf: '890.123.456-78',
          courseId: 'crs-eng-soft',
          subject: 'Arquitetura de Software e Microsserviços',
          term: '2024.2',
          assessmentType: 'P2 - Projeto Prático Docker & Kubernetes',
          weight: 6,
          value: 9.0,
          date: '2024-11-28',
          teacherName: 'Profª. Dra. Vanessa Moura',
          observations: 'Projeto entregue com pipeline CI/CD completo.',
        },
        {
          studentId: lucasStudentId,
          studentName: 'Lucas Martins Ferreira',
          studentCpf: '890.123.456-78',
          courseId: 'crs-eng-soft',
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
          term: '2024.2',
          assessmentType: 'P1 - User Stories e BDD',
          weight: 5,
          value: 7.5,
          date: '2024-10-20',
          teacherName: 'Prof. Dr. Rodrigo Ramos',
          observations: 'Boa estruturação de critérios de aceite.',
        },
        {
          studentId: lucasStudentId,
          studentName: 'Lucas Martins Ferreira',
          studentCpf: '890.123.456-78',
          courseId: 'crs-eng-soft',
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
          term: '2024.2',
          assessmentType: 'P2 - Simulação de Sprint Scrum',
          weight: 5,
          value: 8.0,
          date: '2024-12-02',
          teacherName: 'Prof. Dr. Rodrigo Ramos',
          observations: 'Participação ativa nas cerimônias ágeis.',
        },
        {
          studentId: lucasStudentId,
          studentName: 'Lucas Martins Ferreira',
          studentCpf: '890.123.456-78',
          courseId: 'crs-eng-soft',
          subject: 'Bancos de Dados NoSQL e Big Data',
          term: '2024.2',
          assessmentType: 'P1 - Modelagem Documental & Key-Value',
          weight: 5,
          value: 9.2,
          date: '2024-10-25',
          teacherName: 'Prof. Dr. Rodrigo Ramos',
          observations: 'Domínio sólido de indexação em MongoDB e Redis.',
        },
        {
          studentId: lucasStudentId,
          studentName: 'Lucas Martins Ferreira',
          studentCpf: '890.123.456-78',
          courseId: 'crs-eng-soft',
          subject: 'Bancos de Dados NoSQL e Big Data',
          term: '2024.2',
          assessmentType: 'P2 - Projeto de Sharding e Replicação',
          weight: 5,
          value: 8.8,
          date: '2024-12-05',
          teacherName: 'Prof. Dr. Rodrigo Ramos',
          observations: 'Solução resiliente com tolerância a partições.',
        },
      ]

      for (const item of sampleGrades) {
        const rec = new Record(gradesCol)
        rec.set('studentId', item.studentId)
        rec.set('studentName', item.studentName)
        rec.set('studentCpf', item.studentCpf)
        rec.set('courseId', item.courseId)
        rec.set('subject', item.subject)
        rec.set('term', item.term)
        rec.set('assessmentType', item.assessmentType)
        rec.set('weight', item.weight)
        rec.set('value', item.value)
        rec.set('date', item.date)
        rec.set('teacherId', '')
        rec.set('teacherName', item.teacherName)
        rec.set('observations', item.observations)
        app.save(rec)
      }
    }

    // Seed de frequência idempotente
    const countAttendance = app.countRecords('attendance')
    if (countAttendance === 0) {
      const sampleAttendance = [
        {
          date: '2024-09-02',
          status: 'presente',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
        },
        {
          date: '2024-09-09',
          status: 'presente',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
        },
        {
          date: '2024-09-16',
          status: 'presente',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
        },
        {
          date: '2024-09-23',
          status: 'presente',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
        },
        {
          date: '2024-09-30',
          status: 'falta_justificada',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
          just: 'Atestado médico odontológico apresentado à secretaria',
        },
        {
          date: '2024-10-07',
          status: 'presente',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
        },
        {
          date: '2024-10-14',
          status: 'presente',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
        },
        {
          date: '2024-10-21',
          status: 'presente',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
        },
        {
          date: '2024-10-28',
          status: 'presente',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
        },
        {
          date: '2024-11-04',
          status: 'presente',
          hours: 2,
          subject: 'Arquitetura de Software e Microsserviços',
        },

        {
          date: '2024-09-04',
          status: 'presente',
          hours: 2,
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
        },
        {
          date: '2024-09-11',
          status: 'presente',
          hours: 2,
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
        },
        {
          date: '2024-09-18',
          status: 'falta',
          hours: 2,
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
          just: '',
        },
        {
          date: '2024-09-25',
          status: 'presente',
          hours: 2,
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
        },
        {
          date: '2024-10-02',
          status: 'presente',
          hours: 2,
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
        },
        {
          date: '2024-10-09',
          status: 'presente',
          hours: 2,
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
        },
        {
          date: '2024-10-16',
          status: 'presente',
          hours: 2,
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
        },
        {
          date: '2024-10-23',
          status: 'presente',
          hours: 2,
          subject: 'Engenharia de Requisitos e Métodos Ágeis',
        },

        {
          date: '2024-09-05',
          status: 'presente',
          hours: 2,
          subject: 'Bancos de Dados NoSQL e Big Data',
        },
        {
          date: '2024-09-12',
          status: 'presente',
          hours: 2,
          subject: 'Bancos de Dados NoSQL e Big Data',
        },
        {
          date: '2024-09-19',
          status: 'presente',
          hours: 2,
          subject: 'Bancos de Dados NoSQL e Big Data',
        },
        {
          date: '2024-09-26',
          status: 'presente',
          hours: 2,
          subject: 'Bancos de Dados NoSQL e Big Data',
        },
        {
          date: '2024-10-03',
          status: 'presente',
          hours: 2,
          subject: 'Bancos de Dados NoSQL e Big Data',
        },
        {
          date: '2024-10-10',
          status: 'presente',
          hours: 2,
          subject: 'Bancos de Dados NoSQL e Big Data',
        },
        {
          date: '2024-10-17',
          status: 'presente',
          hours: 2,
          subject: 'Bancos de Dados NoSQL e Big Data',
        },
        {
          date: '2024-10-24',
          status: 'presente',
          hours: 2,
          subject: 'Bancos de Dados NoSQL e Big Data',
        },
      ]

      for (const item of sampleAttendance) {
        const rec = new Record(attendanceCol)
        rec.set('studentId', lucasStudentId)
        rec.set('studentName', 'Lucas Martins Ferreira')
        rec.set('studentCpf', '890.123.456-78')
        rec.set('courseId', 'crs-eng-soft')
        rec.set('subject', item.subject)
        rec.set('term', '2024.2')
        rec.set('date', item.date)
        rec.set('status', item.status)
        rec.set('hours', item.hours || 2)
        rec.set('teacherId', '')
        rec.set('teacherName', 'Corpo Docente')
        rec.set('justification', item.just || '')
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      const g = app.findCollectionByNameOrId('grades')
      app.delete(g)
    } catch (_) {}
    try {
      const a = app.findCollectionByNameOrId('attendance')
      app.delete(a)
    } catch (_) {}
  },
)
