/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0026: Gestão de Turmas (classes) e Horários (class_schedules)
 *
 * Cria duas coleções no PocketBase:
 * 1. classes:
 *    - name (text, required)
 *    - courseId (text, required - id do curso)
 *    - courseName (text - nome do curso para exibição direta)
 *    - professorUserId (text, required - id do usuário professor na coleção users)
 *    - professorName (text - nome do professor)
 *    - term (text, required - ex: "2025.1", "2025.2")
 *    - capacity (number, required - capacidade de alunos)
 *    - status (select: 'planejada' | 'em_andamento' | 'encerrada')
 *    - studentIds (json - array com IDs dos alunos matriculados na turma)
 *    - notes (text - observações/ementa da turma)
 *    - created (autodate)
 *    - updated (autodate)
 *
 * 2. class_schedules:
 *    - classId (text, required - vínculo com classes.id)
 *    - dayOfWeek (select: 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado')
 *    - startTime (text, required - formato "HH:mm", ex: "19:00")
 *    - endTime (text, required - formato "HH:mm", ex: "22:30")
 *    - room (text - sala, laboratório ou link virtual)
 *    - created (autodate)
 *    - updated (autodate)
 *
 * E semeia turmas de demonstração vinculadas aos cursos demo, com horários e alunos matriculados.
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"

    // 1. Coleção classes
    let classesCol
    try {
      classesCol = app.findCollectionByNameOrId('classes')
      classesCol.listRule = RULE
      classesCol.viewRule = RULE
      classesCol.createRule = RULE
      classesCol.updateRule = RULE
      classesCol.deleteRule = RULE
      app.save(classesCol)
    } catch (_) {
      classesCol = new Collection({
        type: 'base',
        name: 'classes',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'name', type: 'text', required: true, max: 200 },
          { name: 'courseId', type: 'text', required: true, max: 60 },
          { name: 'courseName', type: 'text', max: 200 },
          { name: 'professorUserId', type: 'text', required: true, max: 60 },
          { name: 'professorName', type: 'text', max: 180 },
          { name: 'term', type: 'text', required: true, max: 40 },
          { name: 'capacity', type: 'number', required: true, min: 1, max: 500 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['planejada', 'em_andamento', 'encerrada'],
          },
          { name: 'studentIds', type: 'json' },
          { name: 'notes', type: 'text', max: 2000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_classes_course ON classes (courseId)',
          'CREATE INDEX idx_classes_prof ON classes (professorUserId)',
          'CREATE INDEX idx_classes_status ON classes (status)',
          'CREATE INDEX idx_classes_term ON classes (term)',
        ],
      })
      app.save(classesCol)
    }

    // 2. Coleção class_schedules
    let schedulesCol
    try {
      schedulesCol = app.findCollectionByNameOrId('class_schedules')
      schedulesCol.listRule = RULE
      schedulesCol.viewRule = RULE
      schedulesCol.createRule = RULE
      schedulesCol.updateRule = RULE
      schedulesCol.deleteRule = RULE
      app.save(schedulesCol)
    } catch (_) {
      schedulesCol = new Collection({
        type: 'base',
        name: 'class_schedules',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'classId', type: 'text', required: true, max: 60 },
          {
            name: 'dayOfWeek',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
          },
          { name: 'startTime', type: 'text', required: true, max: 10 },
          { name: 'endTime', type: 'text', required: true, max: 10 },
          { name: 'room', type: 'text', max: 120 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_schedules_class ON class_schedules (classId)',
          'CREATE INDEX idx_schedules_day ON class_schedules (dayOfWeek)',
        ],
      })
      app.save(schedulesCol)
    }

    // 3. Seed inicial de turmas demonstrativas e horários
    try {
      const existingClasses = app.findRecordsByFilter('classes', 'name != ""', '-created', 1, 0)
      if (existingClasses.length === 0) {
        // Encontrar professor demo (Prof. Dr. Rodrigo Ramos)
        let profUserId = 'x714q50ut14gcfr'
        let profName = 'Prof. Dr. Rodrigo Ramos'
        try {
          const profUser = app.findFirstRecordByData('users', 'email', 'professor@portalcursos.ng')
          profUserId = profUser.id
          profName = profUser.getString('name') || profName
        } catch (_) {}

        // Encontrar outro docente (coordenadora Profª Dra. Vanessa Moura)
        let coordUserId = 'gr2mngwa0366ux1'
        let coordName = 'Profª. Dra. Vanessa Moura'
        try {
          const coordUser = app.findFirstRecordByData(
            'users',
            'email',
            'coordenador@portalcursos.ng',
          )
          coordUserId = coordUser.id
          coordName = coordUser.getString('name') || coordName
        } catch (_) {}

        // Encontrar alunos demo
        let studentLucasId = 'dbphexr97czw7cb'
        try {
          const st = app.findFirstRecordByData('students', 'email', 'aluno@portalcursos.ng')
          studentLucasId = st.id
        } catch (_) {}

        let studentAnaId = '03fmh1fgyltwmiw'
        try {
          const stAna = app.findFirstRecordByData('students', 'fullName', 'Ana Clara Albuquerque')
          studentAnaId = stAna.id
        } catch (_) {}

        let studentGabrielId = '5gek3dx3dbp4tpd'
        try {
          const stGab = app.findFirstRecordByData(
            'students',
            'fullName',
            'Gabriel Henrique Siqueira',
          )
          studentGabrielId = stGab.id
        } catch (_) {}

        // Encontrar ID do curso Engenharia de Software
        let engSoftCourseId = 'hme12uw71ue54ns'
        let engSoftName = 'Engenharia de Software'
        try {
          const cEng = app.findFirstRecordByFilter('courses', 'name ~ "Engenharia de Software"')
          engSoftCourseId = cEng.id
          engSoftName = cEng.getString('name')
        } catch (_) {}

        // Encontrar ID do curso ADS
        let adsCourseId = 'iwv4f5zaiqn1gr5'
        let adsName = 'Análise e Desenvolvimento de Sistemas'
        try {
          const cAds = app.findFirstRecordByFilter('courses', 'name ~ "Análise e Desenvolvimento"')
          adsCourseId = cAds.id
          adsName = cAds.getString('name')
        } catch (_) {}

        // Encontrar ID do curso Pós em IA
        let posIaCourseId = '4lbbryxzjbnx7kk'
        let posIaName = 'Inteligência Artificial & Engenharia de Machine Learning'
        try {
          const cIa = app.findFirstRecordByFilter('courses', 'name ~ "Inteligência Artificial"')
          posIaCourseId = cIa.id
          posIaName = cIa.getString('name')
        } catch (_) {}

        // --- Turma 1: Eng. Software - Turma A - Noturno 2025.1 ---
        const class1 = new Record(classesCol)
        class1.set('name', 'Engenharia de Software - Turma A (Noturno)')
        class1.set('courseId', engSoftCourseId)
        class1.set('courseName', engSoftName)
        class1.set('professorUserId', profUserId)
        class1.set('professorName', profName)
        class1.set('term', '2025.1')
        class1.set('capacity', 40)
        class1.set('status', 'em_andamento')
        class1.set('studentIds', JSON.stringify([studentLucasId, studentGabrielId]))
        class1.set(
          'notes',
          'Turma presencial de Engenharia de Software. Disciplina foco: Arquitetura de Software e DevOps.',
        )
        app.save(class1)

        // Horários Turma 1: Terça e Quinta 19:15 - 22:30 no Lab 102
        const s1_1 = new Record(schedulesCol)
        s1_1.set('classId', class1.id)
        s1_1.set('dayOfWeek', 'terca')
        s1_1.set('startTime', '19:15')
        s1_1.set('endTime', '22:30')
        s1_1.set('room', 'Lab 102 - Bloco Central')
        app.save(s1_1)

        const s1_2 = new Record(schedulesCol)
        s1_2.set('classId', class1.id)
        s1_2.set('dayOfWeek', 'quinta')
        s1_2.set('startTime', '19:15')
        s1_2.set('endTime', '22:30')
        s1_2.set('room', 'Lab 102 - Bloco Central')
        app.save(s1_2)

        // --- Turma 2: Pós em IA - Turma 01 - Semipresencial 2025.1 ---
        const class2 = new Record(classesCol)
        class2.set('name', 'Pós em IA & Machine Learning - Turma 01')
        class2.set('courseId', posIaCourseId)
        class2.set('courseName', posIaName)
        class2.set('professorUserId', profUserId)
        class2.set('professorName', profName)
        class2.set('term', '2025.1')
        class2.set('capacity', 30)
        class2.set('status', 'em_andamento')
        class2.set('studentIds', JSON.stringify([studentAnaId]))
        class2.set(
          'notes',
          'Aulas teóricas e práticas com LLMs, visão computacional e deploy de modelos.',
        )
        app.save(class2)

        // Horários Turma 2: Sábado 08:30 - 12:30 e Quarta 19:30 - 21:30 (Online)
        const s2_1 = new Record(schedulesCol)
        s2_1.set('classId', class2.id)
        s2_1.set('dayOfWeek', 'quarta')
        s2_1.set('startTime', '19:30')
        s2_1.set('endTime', '21:30')
        s2_1.set('room', 'Sala Virtual Meet #IA-01')
        app.save(s2_1)

        const s2_2 = new Record(schedulesCol)
        s2_2.set('classId', class2.id)
        s2_2.set('dayOfWeek', 'sabado')
        s2_2.set('startTime', '08:30')
        s2_2.set('endTime', '12:30')
        s2_2.set('room', 'Auditório de Inovação & IA')
        app.save(s2_2)

        // --- Turma 3: ADS - Turma Matutino 2025.2 (Planejada) ---
        const class3 = new Record(classesCol)
        class3.set('name', 'ADS - Fundamentos Web & Banco de Dados')
        class3.set('courseId', adsCourseId)
        class3.set('courseName', adsName)
        class3.set('professorUserId', coordUserId)
        class3.set('professorName', coordName)
        class3.set('term', '2025.2')
        class3.set('capacity', 35)
        class3.set('status', 'planejada')
        class3.set('studentIds', JSON.stringify([]))
        class3.set(
          'notes',
          'Turma programada para início no segundo semestre com foco em tecnologias full-stack.',
        )
        app.save(class3)

        const s3_1 = new Record(schedulesCol)
        s3_1.set('classId', class3.id)
        s3_1.set('dayOfWeek', 'segunda')
        s3_1.set('startTime', '08:00')
        s3_1.set('endTime', '11:40')
        s3_1.set('room', 'Lab 204 - Bloco Tecnológico')
        app.save(s3_1)

        const s3_2 = new Record(schedulesCol)
        s3_2.set('classId', class3.id)
        s3_2.set('dayOfWeek', 'sexta')
        s3_2.set('startTime', '08:00')
        s3_2.set('endTime', '11:40')
        s3_2.set('room', 'Lab 204 - Bloco Tecnológico')
        app.save(s3_2)
      }
    } catch (err) {
      console.log('Seed classes/schedules aviso:', err)
    }
  },
  (app) => {
    try {
      const schedules = app.findCollectionByNameOrId('class_schedules')
      app.delete(schedules)
    } catch (_) {}
    try {
      const classes = app.findCollectionByNameOrId('classes')
      app.delete(classes)
    } catch (_) {}
  },
)
