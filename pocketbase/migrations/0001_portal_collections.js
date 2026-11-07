/// <reference path="../pb_data/types.d.ts" />
/**
 * Cria as coleções do PortalCursos.NG no PocketBase.
 *
 * Regras de acesso: todas as coleções administrativas exigem um usuário
 * PocketBase autenticado (a app entra com a conta demo compartilhada criada
 * nesta migration). Nenhum acesso anônimo de leitura ou escrita.
 *
 * Uploads: foto 3x4 <= 2 MB (image/jpeg|png|webp), documentos <= 5 MB,
 * fotos de chamado <= 5 MB (respeitando os limites já validados no client).
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"

    function makeCollection(config) {
      // Idempotência: se já existe, apenas atualiza as regras.
      try {
        const existing = app.findCollectionByNameOrId(config.name)
        existing.listRule = config.listRule
        existing.viewRule = config.viewRule
        existing.createRule = config.createRule
        existing.updateRule = config.updateRule
        existing.deleteRule = config.deleteRule
        app.save(existing)
        return existing
      } catch {
        const collection = new Collection(config)
        app.save(collection)
        return collection
      }
    }

    // ---------------------------------------------------------------- users (app)
    makeCollection({
      type: 'base',
      name: 'app_users',
      listRule: RULE,
      viewRule: RULE,
      createRule: RULE,
      updateRule: RULE,
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true, max: 120 },
        { name: 'email', type: 'email', required: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'root',
            'admin',
            'secretaria',
            'financeiro',
            'academico',
            'matricula',
            'coordenador',
            'professor',
            'aluno',
          ],
        },
        { name: 'roleTitle', type: 'text', max: 120 },
        { name: 'department', type: 'text', max: 160 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['ativo', 'inativo', 'bloqueado'],
        },
        { name: 'cpf', type: 'text', max: 20 },
        { name: 'phone', type: 'text', max: 40 },
        { name: 'avatar', type: 'url' },
        { name: 'createdAt', type: 'text', max: 20 },
        { name: 'lastAccess', type: 'text', max: 40 },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_app_users_email ON app_users (email)'],
    })

    // ------------------------------------------------------------------- students
    makeCollection({
      type: 'base',
      name: 'students',
      listRule: RULE,
      viewRule: RULE,
      createRule: RULE,
      updateRule: RULE,
      deleteRule: null,
      fields: [
        { name: 'fullName', type: 'text', required: true, max: 160 },
        { name: 'cpf', type: 'text', required: true, max: 20 },
        { name: 'cpfRaw', type: 'text', max: 20 },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text', max: 40 },
        {
          name: 'studentType',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['graduacao', 'pos_graduacao'],
        },
        { name: 'courseId', type: 'text', max: 60 },
        { name: 'courseName', type: 'text', max: 160 },
        { name: 'photoUrl', type: 'text', max: 500 },
        {
          name: 'photo',
          type: 'file',
          maxSelect: 1,
          maxSize: 2097152,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          thumbs: ['100x100', '300x300'],
        },
        { name: 'birthDate', type: 'text', max: 20 },
        { name: 'street', type: 'text', max: 200 },
        { name: 'city', type: 'text', max: 120 },
        { name: 'state', type: 'text', max: 60 },
        { name: 'zip', type: 'text', max: 20 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['matriculado', 'pre_matricula', 'trancado', 'concluido'],
        },
        { name: 'enrolledAt', type: 'text', max: 20 },
        { name: 'documents', type: 'json', maxSize: 500000 },
        { name: 'observations', type: 'text', max: 1000 },
      ],
      indexes: [
        'CREATE INDEX idx_students_cpf_raw ON students (cpfRaw)',
        'CREATE INDEX idx_students_course ON students (courseId)',
      ],
    })

    // -------------------------------------------------------------------- courses
    makeCollection({
      type: 'base',
      name: 'courses',
      listRule: RULE,
      viewRule: RULE,
      createRule: RULE,
      updateRule: RULE,
      deleteRule: null,
      fields: [
        { name: 'code', type: 'text', required: true, max: 40 },
        { name: 'name', type: 'text', required: true, max: 160 },
        {
          name: 'level',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['graduacao', 'pos_graduacao', 'extensao'],
        },
        {
          name: 'courseType',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['bacharelado', 'licenciatura', 'tecnologo', 'especializacao', 'mba'],
        },
        {
          name: 'modality',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['presencial', 'ead', 'semipresencial'],
        },
        { name: 'durationSemesters', type: 'number', onlyInt: true, min: 1, max: 24 },
        { name: 'workloadHours', type: 'number', onlyInt: true, min: 0 },
        { name: 'coordinator', type: 'text', max: 160 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['ativo', 'em_revisao', 'trancado'],
        },
        { name: 'lockedForEditing', type: 'bool' },
        { name: 'emecCode', type: 'text', max: 20 },
        { name: 'emecConcept', type: 'number', onlyInt: true, min: 1, max: 5 },
        { name: 'emecOrdinanceNumber', type: 'text', max: 160 },
        { name: 'emecOrdinanceDate', type: 'text', max: 20 },
        { name: 'description', type: 'text', max: 2000 },
        { name: 'monthlyFee', type: 'number', min: 0 },
        { name: 'vacancies', type: 'number', onlyInt: true, min: 0 },
        { name: 'enrolledCount', type: 'number', onlyInt: true, min: 0 },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_courses_code ON courses (code)'],
    })

    // -------------------------------------------------------------------- charges
    makeCollection({
      type: 'base',
      name: 'charges',
      listRule: RULE,
      viewRule: RULE,
      createRule: RULE,
      updateRule: RULE,
      deleteRule: null,
      fields: [
        { name: 'code', type: 'text', required: true, max: 40 },
        { name: 'studentId', type: 'text', max: 60 },
        { name: 'studentName', type: 'text', max: 160 },
        { name: 'studentCpf', type: 'text', max: 20 },
        {
          name: 'category',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'mensalidade',
            'matricula',
            'rematricula',
            'taxa_diploma',
            'segunda_chamada',
            'outro',
          ],
        },
        { name: 'description', type: 'text', max: 300 },
        { name: 'amount', type: 'number', required: false, min: 0 },
        { name: 'dueDate', type: 'text', max: 20 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pendente', 'pago', 'atrasado', 'cancelado'],
        },
        {
          name: 'method',
          type: 'select',
          maxSelect: 1,
          values: ['pix', 'cartao', 'isencao'],
        },
        { name: 'paidAt', type: 'text', max: 30 },
        { name: 'pixCode', type: 'text', max: 500 },
        { name: 'pixQrUrl', type: 'text', max: 500 },
        { name: 'receiptNumber', type: 'text', max: 80 },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_charges_code ON charges (code)',
        'CREATE INDEX idx_charges_student ON charges (studentId)',
      ],
    })

    // ------------------------------------------------------------ price_table_items
    makeCollection({
      type: 'base',
      name: 'price_table_items',
      listRule: RULE,
      viewRule: RULE,
      createRule: RULE,
      updateRule: RULE,
      deleteRule: null,
      fields: [
        { name: 'category', type: 'text', required: true, max: 120 },
        {
          name: 'level',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['graduacao', 'pos_graduacao'],
        },
        { name: 'standardMonthlyFee', type: 'number', required: false, min: 0 },
        { name: 'enrollmentFee', type: 'number', required: false, min: 0 },
        { name: 'lateFeePercentage', type: 'number', min: 0, max: 100 },
        { name: 'updatedAt', type: 'text', max: 20 },
        { name: 'updatedBy', type: 'text', max: 160 },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_price_items_cat_level ON price_table_items (category, level)',
      ],
    })

    // ------------------------------------------------------------ price_audit_logs
    makeCollection({
      type: 'base',
      name: 'price_audit_logs',
      listRule: RULE,
      viewRule: RULE,
      createRule: RULE,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'timestamp', type: 'text', max: 30 },
        { name: 'userName', type: 'text', max: 160 },
        { name: 'userRole', type: 'text', max: 40 },
        { name: 'changeSummary', type: 'text', max: 400 },
        { name: 'previousValue', type: 'text', max: 400 },
        { name: 'newValue', type: 'text', max: 400 },
      ],
      indexes: ['CREATE INDEX idx_price_logs_timestamp ON price_audit_logs (timestamp)'],
    })

    // --------------------------------------------------------- billing_exceptions
    makeCollection({
      type: 'base',
      name: 'billing_exceptions',
      listRule: RULE,
      viewRule: RULE,
      createRule: RULE,
      updateRule: RULE,
      deleteRule: null,
      fields: [
        { name: 'studentId', type: 'text', max: 60 },
        { name: 'studentName', type: 'text', max: 160 },
        { name: 'reason', type: 'text', max: 300 },
        { name: 'discountPercentage', type: 'number', min: 0, max: 100 },
        { name: 'justification', type: 'text', max: 1000 },
        { name: 'requestedBy', type: 'text', max: 160 },
        { name: 'approvedBy', type: 'text', max: 160 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pendente', 'aprovado', 'rejeitado'],
        },
        { name: 'createdAt', type: 'text', max: 20 },
      ],
      indexes: ['CREATE INDEX idx_billing_exc_student ON billing_exceptions (studentId)'],
    })

    // -------------------------------------------------------- maintenance_tickets
    makeCollection({
      type: 'base',
      name: 'maintenance_tickets',
      listRule: RULE,
      viewRule: RULE,
      createRule: RULE,
      updateRule: RULE,
      deleteRule: null,
      fields: [
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 2000 },
        { name: 'location', type: 'text', max: 200 },
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
          values: ['aberto', 'em_andamento', 'concluido', 'cancelado'],
        },
        {
          name: 'category',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['eletrica', 'hidraulica', 'ar_condicionado', 'alvenaria', 'ti_redes', 'outro'],
        },
        { name: 'reporterName', type: 'text', max: 160 },
        { name: 'reporterRole', type: 'text', max: 80 },
        { name: 'assignedTo', type: 'text', max: 160 },
        { name: 'photoUrls', type: 'json', maxSize: 200000 },
        {
          name: 'photo',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          thumbs: ['600x400'],
        },
        { name: 'createdAt', type: 'text', max: 30 },
        { name: 'resolvedAt', type: 'text', max: 30 },
      ],
      indexes: ['CREATE INDEX idx_tickets_status ON maintenance_tickets (status)'],
    })

    // ------------------------------------------------------------- lgpd_requests
    makeCollection({
      type: 'base',
      name: 'lgpd_requests',
      listRule: RULE,
      viewRule: RULE,
      createRule: RULE,
      updateRule: RULE,
      deleteRule: null,
      fields: [
        { name: 'requesterName', type: 'text', required: true, max: 160 },
        { name: 'requesterCpf', type: 'text', max: 20 },
        { name: 'requesterEmail', type: 'email' },
        {
          name: 'requestType',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['eliminacao', 'acesso', 'retificacao', 'portabilidade'],
        },
        { name: 'reason', type: 'text', max: 1000 },
        { name: 'legalRetentionPeriodDays', type: 'number', onlyInt: true, min: 0 },
        { name: 'legalRetentionDeadline', type: 'text', max: 80 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['em_analise', 'retido_legalmente', 'executado', 'negado'],
        },
        { name: 'legalJustification', type: 'text', max: 2000 },
        { name: 'createdAt', type: 'text', max: 20 },
        { name: 'dpoNotes', type: 'text', max: 1000 },
      ],
      indexes: ['CREATE INDEX idx_lgpd_status ON lgpd_requests (status)'],
    })

    // ------------------------------------------------------------------ demo auth
    // Conta PocketBase compartilhada usada pela app para ler/escrever os dados
    // (a autenticação dos 9 perfis continua client-side, como na demo).
    try {
      app.findAuthRecordByEmail('users', 'portal@portalcursos.ng')
    } catch {
      const usersCollection = app.findCollectionByNameOrId('users')
      const record = new Record(usersCollection)
      record.set('email', 'portal@portalcursos.ng')
      record.set('password', 'PortalCursos#2025')
      record.set('name', 'PortalCursos Demo')
      app.save(record)
    }
  },
  (app) => {
    const names = [
      'lgpd_requests',
      'maintenance_tickets',
      'billing_exceptions',
      'price_audit_logs',
      'price_table_items',
      'charges',
      'courses',
      'students',
      'app_users',
    ]
    for (const name of names) {
      try {
        const c = app.findCollectionByNameOrId(name)
        app.delete(c)
      } catch {
        // já removida
      }
    }
  },
)
