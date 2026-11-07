/// <reference path="../pb_data/types.d.ts" />
/**
 * Cria coleções dedicadas para o Portal do Aluno:
 * - lesson_progress: acompanhamento de progresso de aulas/módulos por aluno/curso
 * - course_materials: materiais e recursos de estudo por curso (slides, apostilas, códigos, links)
 * - calendar_events: calendário acadêmico, aulas inaugurais, entregas de trabalhos, provas e bancas
 * - student_notifications: notificações, avisos e alertas com status lida/não lida
 * - student_support_tickets: chamados de suporte acadêmico, financeiro, técnico e secretaria
 *
 * Também insere dados seed idempotentes para o aluno de demonstração (Lucas Martins Ferreira).
 */
migrate(
  (app) => {
    const RULE_AUTH = "@request.auth.id != ''"

    // 1. lesson_progress
    let lessonCol
    try {
      lessonCol = app.findCollectionByNameOrId('lesson_progress')
      lessonCol.listRule = RULE_AUTH
      lessonCol.viewRule = RULE_AUTH
      lessonCol.createRule = RULE_AUTH
      lessonCol.updateRule = RULE_AUTH
      lessonCol.deleteRule = RULE_AUTH
      app.save(lessonCol)
    } catch (_) {
      lessonCol = new Collection({
        type: 'base',
        name: 'lesson_progress',
        listRule: RULE_AUTH,
        viewRule: RULE_AUTH,
        createRule: RULE_AUTH,
        updateRule: RULE_AUTH,
        deleteRule: RULE_AUTH,
        fields: [
          { name: 'studentId', type: 'text', required: true, max: 80 },
          { name: 'courseId', type: 'text', required: true, max: 80 },
          { name: 'moduleName', type: 'text', required: true, max: 160 },
          { name: 'lessonId', type: 'text', required: true, max: 80 },
          { name: 'lessonTitle', type: 'text', required: true, max: 200 },
          { name: 'durationMinutes', type: 'number', min: 0, max: 600 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['nao_iniciado', 'em_andamento', 'concluido'],
          },
          { name: 'completedAt', type: 'text', max: 30 },
          { name: 'lastWatchedSeconds', type: 'number', min: 0 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lesson_student_course ON lesson_progress (studentId, courseId)',
          'CREATE INDEX idx_lesson_student_lesson ON lesson_progress (studentId, lessonId)',
        ],
      })
      app.save(lessonCol)
    }

    // 2. course_materials
    let matCol
    try {
      matCol = app.findCollectionByNameOrId('course_materials')
      matCol.listRule = RULE_AUTH
      matCol.viewRule = RULE_AUTH
      matCol.createRule = RULE_AUTH
      matCol.updateRule = RULE_AUTH
      matCol.deleteRule = RULE_AUTH
      app.save(matCol)
    } catch (_) {
      matCol = new Collection({
        type: 'base',
        name: 'course_materials',
        listRule: RULE_AUTH,
        viewRule: RULE_AUTH,
        createRule: RULE_AUTH,
        updateRule: RULE_AUTH,
        deleteRule: RULE_AUTH,
        fields: [
          { name: 'courseId', type: 'text', required: true, max: 80 },
          { name: 'courseName', type: 'text', max: 160 },
          { name: 'subject', type: 'text', required: true, max: 160 },
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'description', type: 'text', max: 1000 },
          {
            name: 'type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['pdf', 'slide', 'video', 'codigo', 'link', 'outro'],
          },
          { name: 'fileUrl', type: 'text', max: 500 },
          { name: 'externalUrl', type: 'text', max: 500 },
          { name: 'fileSize', type: 'text', max: 50 },
          { name: 'weekOrModule', type: 'text', max: 100 },
          { name: 'uploadedBy', type: 'text', max: 120 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mat_course ON course_materials (courseId)',
          'CREATE INDEX idx_mat_subject ON course_materials (subject)',
        ],
      })
      app.save(matCol)
    }

    // 3. calendar_events
    let calCol
    try {
      calCol = app.findCollectionByNameOrId('calendar_events')
      calCol.listRule = RULE_AUTH
      calCol.viewRule = RULE_AUTH
      calCol.createRule = RULE_AUTH
      calCol.updateRule = RULE_AUTH
      calCol.deleteRule = RULE_AUTH
      app.save(calCol)
    } catch (_) {
      calCol = new Collection({
        type: 'base',
        name: 'calendar_events',
        listRule: RULE_AUTH,
        viewRule: RULE_AUTH,
        createRule: RULE_AUTH,
        updateRule: RULE_AUTH,
        deleteRule: RULE_AUTH,
        fields: [
          { name: 'courseId', type: 'text', max: 80 },
          { name: 'studentId', type: 'text', max: 80 },
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'description', type: 'text', max: 1000 },
          { name: 'subject', type: 'text', max: 160 },
          {
            name: 'type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['prova', 'trabalho', 'aula_ao_vivo', 'prazo', 'feriado', 'institucional'],
          },
          { name: 'startDate', type: 'text', required: true, max: 30 },
          { name: 'endDate', type: 'text', max: 30 },
          { name: 'locationOrLink', type: 'text', max: 300 },
          { name: 'weight', type: 'text', max: 50 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cal_start ON calendar_events (startDate)',
          'CREATE INDEX idx_cal_course ON calendar_events (courseId)',
        ],
      })
      app.save(calCol)
    }

    // 4. student_notifications
    let notifCol
    try {
      notifCol = app.findCollectionByNameOrId('student_notifications')
      notifCol.listRule = RULE_AUTH
      notifCol.viewRule = RULE_AUTH
      notifCol.createRule = RULE_AUTH
      notifCol.updateRule = RULE_AUTH
      notifCol.deleteRule = RULE_AUTH
      app.save(notifCol)
    } catch (_) {
      notifCol = new Collection({
        type: 'base',
        name: 'student_notifications',
        listRule: RULE_AUTH,
        viewRule: RULE_AUTH,
        createRule: RULE_AUTH,
        updateRule: RULE_AUTH,
        deleteRule: RULE_AUTH,
        fields: [
          { name: 'studentId', type: 'text', required: true, max: 80 },
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'message', type: 'text', required: true, max: 1500 },
          {
            name: 'type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['academico', 'financeiro', 'aviso', 'urgente', 'sistema'],
          },
          { name: 'read', type: 'bool' },
          { name: 'actionUrl', type: 'text', max: 300 },
          { name: 'readAt', type: 'text', max: 30 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_notif_student ON student_notifications (studentId)',
          'CREATE INDEX idx_notif_student_read ON student_notifications (studentId, read)',
        ],
      })
      app.save(notifCol)
    }

    // 5. student_support_tickets
    let ticketCol
    try {
      ticketCol = app.findCollectionByNameOrId('student_support_tickets')
      ticketCol.listRule = RULE_AUTH
      ticketCol.viewRule = RULE_AUTH
      ticketCol.createRule = RULE_AUTH
      ticketCol.updateRule = RULE_AUTH
      ticketCol.deleteRule = RULE_AUTH
      app.save(ticketCol)
    } catch (_) {
      ticketCol = new Collection({
        type: 'base',
        name: 'student_support_tickets',
        listRule: RULE_AUTH,
        viewRule: RULE_AUTH,
        createRule: RULE_AUTH,
        updateRule: RULE_AUTH,
        deleteRule: RULE_AUTH,
        fields: [
          { name: 'studentId', type: 'text', required: true, max: 80 },
          { name: 'studentName', type: 'text', max: 160 },
          { name: 'studentEmail', type: 'text', max: 160 },
          { name: 'courseName', type: 'text', max: 160 },
          { name: 'protocol', type: 'text', required: true, max: 40 },
          { name: 'subject', type: 'text', required: true, max: 200 },
          {
            name: 'category',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: [
              'academico',
              'secretaria',
              'financeiro',
              'tecnico',
              'diploma_certificados',
              'outro',
            ],
          },
          {
            name: 'priority',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['baixa', 'media', 'alta', 'urgente'],
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['aberto', 'em_analise', 'respondido', 'resolvido', 'fechado'],
          },
          { name: 'message', type: 'text', required: true, max: 3000 },
          { name: 'response', type: 'text', max: 3000 },
          { name: 'respondedBy', type: 'text', max: 160 },
          { name: 'respondedAt', type: 'text', max: 30 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_supp_student ON student_support_tickets (studentId)',
          'CREATE INDEX idx_supp_status ON student_support_tickets (status)',
          'CREATE UNIQUE INDEX idx_supp_protocol ON student_support_tickets (protocol)',
        ],
      })
      app.save(ticketCol)
    }

    // 6. SEED IDEMPOTENTE PARA O ALUNO DEMO (studentId = 'dbphexr97czw7cb' ou 'crs-eng-soft')
    const DEMO_STUDENT_ID = 'dbphexr97czw7cb'
    const DEMO_COURSE_ID = 'crs-eng-soft'
    const DEMO_COURSE_NAME = 'Engenharia de Software'

    // Seed de Aulas e Progresso
    const demoLessons = [
      {
        studentId: DEMO_STUDENT_ID,
        courseId: DEMO_COURSE_ID,
        moduleName: 'Módulo 1: Fundamentos de Arquitetura em Nuvem',
        lessonId: 'engsoft-m1-l1',
        lessonTitle: 'Introdução aos Princípios Cloud Native e 12-Factor Apps',
        durationMinutes: 45,
        status: 'concluido',
        completedAt: '2024-03-01 10:30',
        lastWatchedSeconds: 2700,
      },
      {
        studentId: DEMO_STUDENT_ID,
        courseId: DEMO_COURSE_ID,
        moduleName: 'Módulo 1: Fundamentos de Arquitetura em Nuvem',
        lessonId: 'engsoft-m1-l2',
        lessonTitle: 'Contêineres com Docker e Orquestração com Kubernetes',
        durationMinutes: 60,
        status: 'concluido',
        completedAt: '2024-03-05 14:15',
        lastWatchedSeconds: 3600,
      },
      {
        studentId: DEMO_STUDENT_ID,
        courseId: DEMO_COURSE_ID,
        moduleName: 'Módulo 2: Microsserviços e Mensageria',
        lessonId: 'engsoft-m2-l1',
        lessonTitle: 'Padrões de Comunicação Síncrona vs Assíncrona (RabbitMQ / Kafka)',
        durationMinutes: 55,
        status: 'concluido',
        completedAt: '2024-03-12 16:40',
        lastWatchedSeconds: 3300,
      },
      {
        studentId: DEMO_STUDENT_ID,
        courseId: DEMO_COURSE_ID,
        moduleName: 'Módulo 2: Microsserviços e Mensageria',
        lessonId: 'engsoft-m2-l2',
        lessonTitle: 'Service Mesh, API Gateways e Resiliência (Circuit Breakers)',
        durationMinutes: 50,
        status: 'em_andamento',
        completedAt: '',
        lastWatchedSeconds: 1520,
      },
      {
        studentId: DEMO_STUDENT_ID,
        courseId: DEMO_COURSE_ID,
        moduleName: 'Módulo 3: Engenharia de Software Moderna & DevOps',
        lessonId: 'engsoft-m3-l1',
        lessonTitle: 'Pipelines CI/CD com GitHub Actions e Deploy Automatizado',
        durationMinutes: 65,
        status: 'nao_iniciado',
        completedAt: '',
        lastWatchedSeconds: 0,
      },
      {
        studentId: DEMO_STUDENT_ID,
        courseId: DEMO_COURSE_ID,
        moduleName: 'Módulo 3: Engenharia de Software Moderna & DevOps',
        lessonId: 'engsoft-m3-l2',
        lessonTitle: 'Observabilidade: Logs Estruturados, Métricas e Traces com OpenTelemetry',
        durationMinutes: 40,
        status: 'nao_iniciado',
        completedAt: '',
        lastWatchedSeconds: 0,
      },
      {
        studentId: DEMO_STUDENT_ID,
        courseId: DEMO_COURSE_ID,
        moduleName: 'Módulo 4: Qualidade e Testes de Software',
        lessonId: 'engsoft-m4-l1',
        lessonTitle: 'Estratégias de Testes: Unitários, Integração e Mutação',
        durationMinutes: 50,
        status: 'nao_iniciado',
        completedAt: '',
        lastWatchedSeconds: 0,
      },
    ]

    try {
      const existingLessons = app.findRecordsByFilter(
        'lesson_progress',
        `studentId = '${DEMO_STUDENT_ID}'`,
        '',
        1,
        0,
      )
      if (existingLessons.length === 0) {
        for (const les of demoLessons) {
          const r = new Record(lessonCol)
          for (const key of Object.keys(les)) {
            r.set(key, les[key])
          }
          app.save(r)
        }
      }
    } catch (e) {
      console.log('Seed lesson_progress aviso:', e)
    }

    // Seed de Materiais de Estudo
    const demoMaterials = [
      {
        courseId: DEMO_COURSE_ID,
        courseName: DEMO_COURSE_NAME,
        subject: 'Arquitetura de Software',
        title: 'Apostila Oficial: Arquiteturas Cloud Native & Padrões Enterprise',
        description:
          'Material consolidado cobrindo microservices, CQRS, Event Sourcing e segurança.',
        type: 'pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        externalUrl: '',
        fileSize: '4.8 MB',
        weekOrModule: 'Módulo 1 & 2',
        uploadedBy: 'Profª. Dra. Vanessa Moura',
      },
      {
        courseId: DEMO_COURSE_ID,
        courseName: DEMO_COURSE_NAME,
        subject: 'Arquitetura de Software',
        title: 'Slides da Aula Magna: Resiliência em Sistemas Distribuídos',
        description:
          'Apresentação com estudos de caso de indisponibilidade e patterns de recuperação.',
        type: 'slide',
        fileUrl: '',
        externalUrl: 'https://docs.google.com/presentation',
        fileSize: '12.4 MB',
        weekOrModule: 'Semana 3',
        uploadedBy: 'Profª. Dra. Vanessa Moura',
      },
      {
        courseId: DEMO_COURSE_ID,
        courseName: DEMO_COURSE_NAME,
        subject: 'DevOps e Nuvem',
        title: 'Repositório de Exemplos Práticos: Docker Compose & Terraform Scripts',
        description:
          'Templates prontos para subida de ambiente local com Redis, PostgreSQL e RabbitMQ.',
        type: 'codigo',
        fileUrl: '',
        externalUrl: 'https://github.com/portalcursos/cloud-lab-boilerplate',
        fileSize: 'GitHub Repo',
        weekOrModule: 'Laboratório 2',
        uploadedBy: 'Prof. Dr. Rodrigo Ramos',
      },
      {
        courseId: DEMO_COURSE_ID,
        courseName: DEMO_COURSE_NAME,
        subject: 'DevOps e Nuvem',
        title: 'Gravação da Monitoria: Configuração de CI/CD Pipeline',
        description:
          'Sessão ao vivo de resolução de dúvidas e montagem do fluxo de build automatizado.',
        type: 'video',
        fileUrl: '',
        externalUrl: 'https://youtube.com/watch?v=sample-cloud-cicd',
        fileSize: '45 min (1080p)',
        weekOrModule: 'Semana 4',
        uploadedBy: 'Prof. Dr. Rodrigo Ramos',
      },
      {
        courseId: DEMO_COURSE_ID,
        courseName: DEMO_COURSE_NAME,
        subject: 'Engenharia de Requisitos',
        title: 'Guia de Boas Práticas em Especificação de Casos de Uso e User Stories',
        description: 'Checklist para validação de critérios de aceite e rastreabilidade MEC.',
        type: 'pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        externalUrl: '',
        fileSize: '2.1 MB',
        weekOrModule: 'Módulo 1',
        uploadedBy: 'Profª. Dra. Vanessa Moura',
      },
    ]

    try {
      const existingMats = app.findRecordsByFilter(
        'course_materials',
        `courseId = '${DEMO_COURSE_ID}'`,
        '',
        1,
        0,
      )
      if (existingMats.length === 0) {
        for (const mat of demoMaterials) {
          const r = new Record(matCol)
          for (const key of Object.keys(mat)) {
            r.set(key, mat[key])
          }
          app.save(r)
        }
      }
    } catch (e) {
      console.log('Seed course_materials aviso:', e)
    }

    // Seed de Calendário e Prazos
    const demoEvents = [
      {
        courseId: DEMO_COURSE_ID,
        studentId: DEMO_STUDENT_ID,
        title: 'Avaliação P2: Arquitetura de Software',
        description: 'Prova teórica e estudo de caso sobre microsserviços e gateways.',
        subject: 'Arquitetura de Software',
        type: 'prova',
        startDate: '2026-11-20 19:30',
        endDate: '2026-11-20 22:30',
        locationOrLink: 'Laboratório de Informática 3 - Bloco B',
        weight: 'Peso 4 (40% da média)',
      },
      {
        courseId: DEMO_COURSE_ID,
        studentId: DEMO_STUDENT_ID,
        title: 'Entrega do Projeto Prático de DevOps',
        description: 'Envio do link do repositório no GitHub com pipeline funcional.',
        subject: 'DevOps e Nuvem',
        type: 'prazo',
        startDate: '2026-11-25 23:59',
        endDate: '2026-11-25 23:59',
        locationOrLink: 'Portal do Aluno > Envio de Trabalhos',
        weight: 'Peso 3',
      },
      {
        courseId: DEMO_COURSE_ID,
        studentId: DEMO_STUDENT_ID,
        title: 'Masterclass Ao Vivo: IA Generativa em Produção',
        description: 'Palestra com convidado especial da indústria sobre MLOps e observabilidade.',
        subject: 'Tópicos Avançados',
        type: 'aula_ao_vivo',
        startDate: '2026-11-18 20:00',
        endDate: '2026-11-18 21:30',
        locationOrLink: 'Google Meet / Auditório Virtual PortalCursos',
        weight: 'Horas complementares: 4h',
      },
      {
        courseId: DEMO_COURSE_ID,
        studentId: DEMO_STUDENT_ID,
        title: 'Abertura do Período de Rematrícula 2027.1',
        description: 'Confirmação das disciplinas do próximo semestre com desconto antecipado.',
        subject: 'Secretaria Acadêmica',
        type: 'institucional',
        startDate: '2026-12-01 08:00',
        endDate: '2026-12-15 18:00',
        locationOrLink: 'Secretaria Virtual',
        weight: 'Geral',
      },
    ]

    try {
      const existingEvents = app.findRecordsByFilter(
        'calendar_events',
        `courseId = '${DEMO_COURSE_ID}'`,
        '',
        1,
        0,
      )
      if (existingEvents.length === 0) {
        for (const ev of demoEvents) {
          const r = new Record(calCol)
          for (const key of Object.keys(ev)) {
            r.set(key, ev[key])
          }
          app.save(r)
        }
      }
    } catch (e) {
      console.log('Seed calendar_events aviso:', e)
    }

    // Seed de Notificações
    const demoNotifications = [
      {
        studentId: DEMO_STUDENT_ID,
        title: 'Nota da Avaliação P1 Lançada',
        message: 'A professora Vanessa Moura publicou a sua nota de Arquitetura de Software: 8.5.',
        type: 'academico',
        read: false,
        actionUrl: 'minhas_notas',
        readAt: '',
      },
      {
        studentId: DEMO_STUDENT_ID,
        title: 'Material Novo Adicionado: Lab DevOps',
        message: 'O roteiro e repositório de CI/CD foram disponibilizados na seção de materiais.',
        type: 'aviso',
        read: false,
        actionUrl: 'materiais',
        readAt: '',
      },
      {
        studentId: DEMO_STUDENT_ID,
        title: 'Lembrete de Vencimento de Mensalidade',
        message: 'Sua mensalidade de novembro está disponível com desconto para pagamento via Pix.',
        type: 'financeiro',
        read: true,
        actionUrl: 'financeiro',
        readAt: '2026-11-05 10:00',
      },
      {
        studentId: DEMO_STUDENT_ID,
        title: 'Confirmação de Frequência Bimestral',
        message:
          'Seu índice atual de presença é de 91.7%, plenamente apto conforme exigências MEC.',
        type: 'academico',
        read: true,
        actionUrl: 'minhas_notas',
        readAt: '2026-11-06 09:20',
      },
    ]

    try {
      const existingNotifs = app.findRecordsByFilter(
        'student_notifications',
        `studentId = '${DEMO_STUDENT_ID}'`,
        '',
        1,
        0,
      )
      if (existingNotifs.length === 0) {
        for (const notif of demoNotifications) {
          const r = new Record(notifCol)
          for (const key of Object.keys(notif)) {
            r.set(key, notif[key])
          }
          app.save(r)
        }
      }
    } catch (e) {
      console.log('Seed student_notifications aviso:', e)
    }

    // Seed de Suporte / Tickets do Aluno
    const demoTickets = [
      {
        studentId: DEMO_STUDENT_ID,
        studentName: 'Lucas Martins Ferreira',
        studentEmail: 'aluno@portalcursos.ng',
        courseName: DEMO_COURSE_NAME,
        protocol: 'SUP-2024-001',
        subject: 'Solicitação de Declaração de Matrícula para Estágio',
        category: 'secretaria',
        priority: 'media',
        status: 'resolvido',
        message:
          'Prezados, necessito da declaração de matrícula assinada com código de autenticação digital para entrega na empresa onde realizo estágio curricular.',
        response:
          'Olá Lucas! Sua declaração de matrícula foi emitida com assinatura ICP-Brasil e está disponível para download na sua pasta institucional.',
        respondedBy: 'Secretaria Central (Mariana)',
        respondedAt: '2024-02-15 16:20',
      },
      {
        studentId: DEMO_STUDENT_ID,
        studentName: 'Lucas Martins Ferreira',
        studentEmail: 'aluno@portalcursos.ng',
        courseName: DEMO_COURSE_NAME,
        protocol: 'SUP-2024-042',
        subject: 'Dúvida sobre aproveitamento de créditos em disciplina optativa',
        category: 'academico',
        priority: 'baixa',
        status: 'em_analise',
        message:
          'Gostaria de saber se a certificação em AWS Cloud Solutions Architect pode ser aproveitada para dispensa de horas na disciplina de Computação em Nuvem.',
        response:
          'Seu requerimento foi encaminhado para a coordenação do curso da Profª Vanessa Moura para avaliação pedagógica da ementa.',
        respondedBy: 'Coordenação Acadêmica',
        respondedAt: '2024-03-02 11:00',
      },
    ]

    try {
      const existingTicks = app.findRecordsByFilter(
        'student_support_tickets',
        `studentId = '${DEMO_STUDENT_ID}'`,
        '',
        1,
        0,
      )
      if (existingTicks.length === 0) {
        for (const tk of demoTickets) {
          const r = new Record(ticketCol)
          for (const key of Object.keys(tk)) {
            r.set(key, tk[key])
          }
          app.save(r)
        }
      }
    } catch (e) {
      console.log('Seed student_support_tickets aviso:', e)
    }
  },
  (app) => {
    const toDelete = [
      'student_support_tickets',
      'student_notifications',
      'calendar_events',
      'course_materials',
      'lesson_progress',
    ]
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
