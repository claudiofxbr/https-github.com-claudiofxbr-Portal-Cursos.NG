/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0015: Módulo de EAD (Educação a Distância) com videoaulas
 *
 * Cria duas coleções:
 * 1. ead_courses:
 *    - title (text, required)
 *    - description (text)
 *    - workloadHours (number, required)
 *    - catalogCourseId (text, vínculo opcional com curso do catálogo e-MEC)
 *    - catalogCourseName (text)
 *    - thumbnail (text / url)
 *    - status (select: 'publicado' | 'rascunho' | 'arquivado')
 *    - instructorId (text, id do professor/coordenador responsável)
 *    - instructorName (text)
 *    - enrolledStudentIds (json, lista de IDs de alunos matriculados)
 *    - created (autodate)
 *    - updated (autodate)
 *
 * 2. ead_lessons:
 *    - eadCourseId (text, required)
 *    - title (text, required)
 *    - description (text)
 *    - moduleName (text)
 *    - orderIndex (number, required)
 *    - videoUrl (text, required: link do YouTube, Vimeo ou MP4 direto)
 *    - videoProvider (select: 'youtube' | 'vimeo' | 'mp4' | 'outro')
 *    - videoEmbedId (text, ID extraído ou url do embed)
 *    - durationMinutes (number)
 *    - isOptional (bool)
 *    - created (autodate)
 *    - updated (autodate)
 *
 * E semeia 1 curso EAD demonstrativo com 3 aulas no YouTube, vinculado ao aluno demo 'dbphexr97czw7cb'.
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"

    // 1. Coleção ead_courses
    let eadCoursesCol
    try {
      eadCoursesCol = app.findCollectionByNameOrId('ead_courses')
      eadCoursesCol.listRule = RULE
      eadCoursesCol.viewRule = RULE
      eadCoursesCol.createRule = RULE
      eadCoursesCol.updateRule = RULE
      eadCoursesCol.deleteRule = RULE
      app.save(eadCoursesCol)
    } catch (_) {
      eadCoursesCol = new Collection({
        type: 'base',
        name: 'ead_courses',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'description', type: 'text', max: 2000 },
          { name: 'workloadHours', type: 'number', min: 1, max: 2000 },
          { name: 'catalogCourseId', type: 'text', max: 60 },
          { name: 'catalogCourseName', type: 'text', max: 200 },
          { name: 'thumbnail', type: 'text', max: 500 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['publicado', 'rascunho', 'arquivado'],
          },
          { name: 'instructorId', type: 'text', max: 60 },
          { name: 'instructorName', type: 'text', max: 180 },
          { name: 'enrolledStudentIds', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ead_courses_status ON ead_courses (status)',
          'CREATE INDEX idx_ead_courses_catalog ON ead_courses (catalogCourseId)',
          'CREATE INDEX idx_ead_courses_instructor ON ead_courses (instructorId)',
        ],
      })
      app.save(eadCoursesCol)
    }

    // 2. Coleção ead_lessons
    let eadLessonsCol
    try {
      eadLessonsCol = app.findCollectionByNameOrId('ead_lessons')
      eadLessonsCol.listRule = RULE
      eadLessonsCol.viewRule = RULE
      eadLessonsCol.createRule = RULE
      eadLessonsCol.updateRule = RULE
      eadLessonsCol.deleteRule = RULE
      app.save(eadLessonsCol)
    } catch (_) {
      eadLessonsCol = new Collection({
        type: 'base',
        name: 'ead_lessons',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'eadCourseId', type: 'text', required: true, max: 60 },
          { name: 'title', type: 'text', required: true, max: 220 },
          { name: 'description', type: 'text', max: 2000 },
          { name: 'moduleName', type: 'text', max: 160 },
          { name: 'orderIndex', type: 'number', min: 0, max: 500 },
          { name: 'videoUrl', type: 'text', required: true, max: 1000 },
          {
            name: 'videoProvider',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['youtube', 'vimeo', 'mp4', 'outro'],
          },
          { name: 'videoEmbedId', type: 'text', max: 200 },
          { name: 'durationMinutes', type: 'number', min: 1, max: 600 },
          { name: 'isOptional', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ead_lessons_course ON ead_lessons (eadCourseId)',
          'CREATE INDEX idx_ead_lessons_order ON ead_lessons (eadCourseId, orderIndex)',
        ],
      })
      app.save(eadLessonsCol)
    }

    // 3. Seed inicial de 1 curso EAD com 3 videoaulas
    try {
      const existing = app.findRecordsByFilter(
        'ead_courses',
        'title ~ "Arquitetura"',
        '-created',
        1,
        0,
      )
      if (existing.length === 0) {
        // Obter aluno demo para vincular
        let studentDemoId = 'dbphexr97czw7cb'
        try {
          const st = app.findFirstRecordByData('students', 'email', 'aluno@portalcursos.ng')
          studentDemoId = st.id
        } catch (_) {}

        const courseRec = new Record(eadCoursesCol)
        courseRec.set('title', 'Arquitetura de Software Moderna & Clean Code')
        courseRec.set(
          'description',
          'Curso EAD completo sobre princípios SOLID, microsserviços, Clean Architecture, Domain-Driven Design (DDD) e testes automatizados aplicados a sistemas em produção.',
        )
        courseRec.set('workloadHours', 40)
        courseRec.set('catalogCourseId', 'crs-eng-soft')
        courseRec.set('catalogCourseName', 'Engenharia de Software')
        courseRec.set('thumbnail', 'https://img.usecurling.com/p/800/450?q=code&color=blue')
        courseRec.set('status', 'publicado')
        courseRec.set('instructorId', 'x714q50ut14gcfr')
        courseRec.set('instructorName', 'Prof. Dr. Rodrigo Ramos')
        courseRec.set('enrolledStudentIds', JSON.stringify([studentDemoId]))
        app.save(courseRec)

        const courseId = courseRec.id

        // Aula 1: Clean Architecture
        const lesson1 = new Record(eadLessonsCol)
        lesson1.set('eadCourseId', courseId)
        lesson1.set('title', 'Aula 01: Fundamentos de Clean Architecture e SOLID')
        lesson1.set(
          'description',
          'Visão geral sobre camadas de domínio, casos de uso, inversão de dependência e responsabilidade única.',
        )
        lesson1.set('moduleName', 'Módulo 1: Fundamentos de Arquitetura')
        lesson1.set('orderIndex', 1)
        lesson1.set('videoUrl', 'https://www.youtube.com/watch?v=kYIhykL1P3E')
        lesson1.set('videoProvider', 'youtube')
        lesson1.set('videoEmbedId', 'kYIhykL1P3E')
        lesson1.set('durationMinutes', 28)
        lesson1.set('isOptional', false)
        app.save(lesson1)

        // Aula 2: Microsserviços e APIs REST
        const lesson2 = new Record(eadLessonsCol)
        lesson2.set('eadCourseId', courseId)
        lesson2.set('title', 'Aula 02: Padrões de Microsserviços e Comunicação Assíncrona')
        lesson2.set(
          'description',
          'Estratégias para decomposição de monólitos, mensageria com filas, resiliência e circuit breaker.',
        )
        lesson2.set('moduleName', 'Módulo 1: Fundamentos de Arquitetura')
        lesson2.set('orderIndex', 2)
        lesson2.set('videoUrl', 'https://www.youtube.com/watch?v=czgOWmtGVGs')
        lesson2.set('videoProvider', 'youtube')
        lesson2.set('videoEmbedId', 'czgOWmtGVGs')
        lesson2.set('durationMinutes', 35)
        lesson2.set('isOptional', false)
        app.save(lesson2)

        // Aula 3: Domain-Driven Design na Prática
        const lesson3 = new Record(eadLessonsCol)
        lesson3.set('eadCourseId', courseId)
        lesson3.set('title', 'Aula 03: Domain-Driven Design (DDD) e Modelagem Tática')
        lesson3.set(
          'description',
          'Entidades, Value Objects, Agregados, Repositórios e Serviços de Domínio explicados com exemplos reais.',
        )
        lesson3.set('moduleName', 'Módulo 2: Modelagem Avançada')
        lesson3.set('orderIndex', 3)
        lesson3.set('videoUrl', 'https://www.youtube.com/watch?v=yPvef9R3k-M')
        lesson3.set('videoProvider', 'youtube')
        lesson3.set('videoEmbedId', 'yPvef9R3k-M')
        lesson3.set('durationMinutes', 42)
        lesson3.set('isOptional', false)
        app.save(lesson3)
      }
    } catch (err) {
      console.log('Seed EAD aviso:', err)
    }
  },
  (app) => {
    try {
      const lessons = app.findCollectionByNameOrId('ead_lessons')
      app.delete(lessons)
    } catch (_) {}
    try {
      const courses = app.findCollectionByNameOrId('ead_courses')
      app.delete(courses)
    } catch (_) {}
  },
)
