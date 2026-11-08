/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0029: Materiais Complementares por Aula do EAD
 *
 * Cria a coleção `ead_materials`:
 * - lessonId (text, required: id da aula EAD vinculada)
 * - eadCourseId (text, id do curso EAD para facilitar filtros/regras)
 * - title (text, required: título do material)
 * - description (text: descrição/roteiro/orientação de estudo)
 * - type (select: 'link' | 'pdf' | 'exercicio' | 'artigo' | 'referencia' | 'outro')
 * - url (text, required: URL de acesso externo ou link para download)
 * - orderIndex (number: ordem de exibição)
 * - created (autodate)
 * - updated (autodate)
 *
 * Índices:
 * - idx_ead_materials_lesson ON ead_materials (lessonId)
 * - idx_ead_materials_course ON ead_materials (eadCourseId)
 *
 * Semeia materiais complementares demonstrativos para as aulas EAD existentes.
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"

    let eadMaterialsCol
    try {
      eadMaterialsCol = app.findCollectionByNameOrId('ead_materials')
      eadMaterialsCol.listRule = RULE
      eadMaterialsCol.viewRule = RULE
      eadMaterialsCol.createRule = RULE
      eadMaterialsCol.updateRule = RULE
      eadMaterialsCol.deleteRule = RULE
      app.save(eadMaterialsCol)
    } catch (_) {
      eadMaterialsCol = new Collection({
        type: 'base',
        name: 'ead_materials',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'lessonId', type: 'text', required: true, max: 60 },
          { name: 'eadCourseId', type: 'text', max: 60 },
          { name: 'title', type: 'text', required: true, max: 240 },
          { name: 'description', type: 'text', max: 2000 },
          {
            name: 'type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['link', 'pdf', 'exercicio', 'artigo', 'referencia', 'outro'],
          },
          { name: 'url', type: 'text', required: true, max: 1000 },
          { name: 'orderIndex', type: 'number', min: 0, max: 500 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ead_materials_lesson ON ead_materials (lessonId)',
          'CREATE INDEX idx_ead_materials_course ON ead_materials (eadCourseId)',
        ],
      })
      app.save(eadMaterialsCol)
    }

    // Seed demonstrativo de materiais de apoio para as aulas da coleção ead_lessons
    try {
      const existingMaterials = app.findRecordsByFilter('ead_materials', '', '-created', 1, 0)
      if (existingMaterials.length === 0) {
        // Buscar as aulas do curso de Arquitetura de Software
        const lessons = app.findRecordsByFilter('ead_lessons', '', 'orderIndex', 10, 0)

        if (lessons.length > 0) {
          const lesson1 =
            lessons.find(
              (l) => l.getString('orderIndex') === '1' || l.getInt('orderIndex') === 1,
            ) || lessons[0]
          const lesson2 =
            lessons.find(
              (l) => l.getString('orderIndex') === '2' || l.getInt('orderIndex') === 2,
            ) || lessons[1]
          const lesson3 =
            lessons.find(
              (l) => l.getString('orderIndex') === '3' || l.getInt('orderIndex') === 3,
            ) || lessons[2]

          if (lesson1) {
            const m1 = new Record(eadMaterialsCol)
            m1.set('lessonId', lesson1.id)
            m1.set('eadCourseId', lesson1.getString('eadCourseId'))
            m1.set('title', 'Artigo Original: The Clean Architecture (Uncle Bob)')
            m1.set(
              'description',
              'Artigo canônico de Robert C. Martin descrevendo a regra de dependência e os círculos concêntricos da Clean Architecture.',
            )
            m1.set('type', 'artigo')
            m1.set(
              'url',
              'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
            )
            m1.set('orderIndex', 1)
            app.save(m1)

            const m2 = new Record(eadMaterialsCol)
            m2.set('lessonId', lesson1.id)
            m2.set('eadCourseId', lesson1.getString('eadCourseId'))
            m2.set('title', 'Guia de Estudo: Princípios SOLID em Diagramas UML (PDF)')
            m2.set(
              'description',
              'Apostila complementar em PDF com resumo prático dos 5 princípios SOLID e exemplos de refatoração.',
            )
            m2.set('type', 'pdf')
            m2.set('url', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
            m2.set('orderIndex', 2)
            app.save(m2)
          }

          if (lesson2) {
            const m3 = new Record(eadMaterialsCol)
            m3.set('lessonId', lesson2.id)
            m3.set('eadCourseId', lesson2.getString('eadCourseId'))
            m3.set('title', 'Padrão Circuit Breaker na Prática (Martin Fowler)')
            m3.set(
              'description',
              'Referência bibliográfica recomendada sobre resiliência e comunicação entre microsserviços distribuídos.',
            )
            m3.set('type', 'referencia')
            m3.set('url', 'https://martinfowler.com/bliki/CircuitBreaker.html')
            m3.set('orderIndex', 1)
            app.save(m3)

            const m4 = new Record(eadMaterialsCol)
            m4.set('lessonId', lesson2.id)
            m4.set('eadCourseId', lesson2.getString('eadCourseId'))
            m4.set('title', 'Laboratório Prático: Decomposição de Monólitos')
            m4.set(
              'description',
              'Roteiro de exercícios para mapear limites de contexto (Bounded Contexts) e planejar a migração de serviços.',
            )
            m4.set('type', 'exercicio')
            m4.set(
              'url',
              'https://microservices.io/patterns/refactoring/decompose-by-business-capability.html',
            )
            m4.set('orderIndex', 2)
            app.save(m4)
          }

          if (lesson3) {
            const m5 = new Record(eadMaterialsCol)
            m5.set('lessonId', lesson3.id)
            m5.set('eadCourseId', lesson3.getString('eadCourseId'))
            m5.set('title', 'Domain-Driven Design Reference (Eric Evans)')
            m5.set(
              'description',
              'Resumo oficial dos padrões e glossário tático/estratégico do DDD compilado pelo autor Eric Evans.',
            )
            m5.set('type', 'pdf')
            m5.set('url', 'https://www.domainlanguage.com/ddd/reference/')
            m5.set('orderIndex', 1)
            app.save(m5)
          }
        }
      }
    } catch (seedErr) {
      console.log('Seed ead_materials aviso:', seedErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ead_materials')
      app.delete(col)
    } catch (_) {}
  },
)
