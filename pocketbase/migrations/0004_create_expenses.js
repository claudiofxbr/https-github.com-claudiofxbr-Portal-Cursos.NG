/// <reference path="../pb_data/types.d.ts" />
/**
 * Cria a coleção 'expenses' (despesas) para relatórios financeiros gerenciais
 * e inclui lançamentos de despesas de exemplo idempotentes.
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"

    let expensesCol
    try {
      expensesCol = app.findCollectionByNameOrId('expenses')
      expensesCol.listRule = RULE
      expensesCol.viewRule = RULE
      expensesCol.createRule = RULE
      expensesCol.updateRule = RULE
      expensesCol.deleteRule = RULE
      app.save(expensesCol)
    } catch {
      expensesCol = new Collection({
        type: 'base',
        name: 'expenses',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'description', type: 'text', required: true, max: 200 },
          {
            name: 'category',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: [
              'folha_pagamento',
              'infraestrutura',
              'marketing',
              'tecnologia',
              'impostos',
              'servicos_terceiros',
              'outros',
            ],
          },
          { name: 'amount', type: 'number', required: false, min: 0 },
          { name: 'date', type: 'text', required: true, max: 20 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['pago', 'pendente', 'agendado', 'cancelado'],
          },
          { name: 'courseId', type: 'text', max: 60 },
          { name: 'notes', type: 'text', max: 500 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_expenses_date ON expenses (date)',
          'CREATE INDEX idx_expenses_category ON expenses (category)',
        ],
      })
      app.save(expensesCol)
    }

    // Seed de despesas de exemplo idempotente
    const sampleExpenses = [
      {
        description: 'Folha de Pagamento Docente - Março/2025',
        category: 'folha_pagamento',
        amount: 8500.0,
        date: '2025-03-05',
        status: 'pago',
        courseId: 'crs-eng-soft',
        notes: 'Professores do núcleo de tecnologia e engenharias',
      },
      {
        description: 'Licenças de Software Cloud e Servidores AWS',
        category: 'tecnologia',
        amount: 1420.0,
        date: '2025-03-12',
        status: 'pago',
        courseId: '',
        notes: 'Infraestrutura computacional para turmas de ADS e IA',
      },
      {
        description: 'Campanha de Tráfego Pago Vestibular e Pós 2025',
        category: 'marketing',
        amount: 2200.0,
        date: '2025-03-18',
        status: 'pago',
        courseId: '',
        notes: 'Captação Google Ads e Meta Ads',
      },
      {
        description: 'Manutenção Predial e Climatização Laboratórios',
        category: 'infraestrutura',
        amount: 1150.0,
        date: '2025-03-25',
        status: 'pago',
        courseId: '',
        notes: 'Revisão dos aparelhos de ar condicionado do Bloco B',
      },
      {
        description: 'Folha de Pagamento Docente - Abril/2025',
        category: 'folha_pagamento',
        amount: 8900.0,
        date: '2025-04-05',
        status: 'pago',
        courseId: 'crs-eng-soft',
        notes: 'Pagamento professores titulares e adjuntos',
      },
      {
        description: 'Assinatura Plataforma EAD e Suporte Moodle Cloud',
        category: 'tecnologia',
        amount: 1650.0,
        date: '2025-04-10',
        status: 'pago',
        courseId: 'crs-ads',
        notes: 'Ambiente virtual de aprendizagem',
      },
      {
        description: 'Serviços Contábeis e Auditoria Fiscal',
        category: 'servicos_terceiros',
        amount: 1300.0,
        date: '2025-04-15',
        status: 'pago',
        courseId: '',
        notes: 'Assessoria fiscal do trimestre',
      },
      {
        description: 'Campanha de Rematrícula 2025.2 e Pós-Graduação',
        category: 'marketing',
        amount: 1800.0,
        date: '2025-04-20',
        status: 'pendente',
        courseId: 'crs-pos-ia',
        notes: 'Ações de marketing para nova turma de IA',
      },
    ]

    const existingCount = app.countRecords('expenses')
    if (existingCount === 0) {
      for (const item of sampleExpenses) {
        const record = new Record(expensesCol)
        record.set('description', item.description)
        record.set('category', item.category)
        record.set('amount', item.amount)
        record.set('date', item.date)
        record.set('status', item.status)
        record.set('courseId', item.courseId)
        record.set('notes', item.notes)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const expensesCol = app.findCollectionByNameOrId('expenses')
      app.delete(expensesCol)
    } catch {}
  },
)
