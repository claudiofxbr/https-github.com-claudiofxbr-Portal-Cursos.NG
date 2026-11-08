/// <reference path="../pb_data/types.d.ts" />
/**
 * Módulo interno de Biblioteca: cria as coleções 'library_books' (acervo de obras
 * e exemplares) e 'library_loans' (empréstimos a alunos), com índices, regras de
 * acesso RBAC e dados de demonstração idempotentes (obras variadas, empréstimos
 * ativos e um atrasado para o aluno demo).
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"

    let booksCol
    try {
      booksCol = app.findCollectionByNameOrId('library_books')
      booksCol.listRule = RULE
      booksCol.viewRule = RULE
      booksCol.createRule = RULE
      booksCol.updateRule = RULE
      booksCol.deleteRule = RULE
      app.save(booksCol)
    } catch (_) {
      booksCol = new Collection({
        type: 'base',
        name: 'library_books',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'author', type: 'text', required: true, max: 160 },
          { name: 'isbn', type: 'text', max: 30 },
          { name: 'publisher', type: 'text', max: 120 },
          { name: 'year', type: 'number', min: 0, max: 3000 },
          { name: 'category', type: 'text', max: 80 },
          { name: 'description', type: 'text', max: 2000 },
          { name: 'totalCopies', type: 'number', required: false, min: 0, max: 10000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_library_books_title ON library_books (title)',
          'CREATE INDEX idx_library_books_author ON library_books (author)',
          'CREATE INDEX idx_library_books_isbn ON library_books (isbn)',
        ],
      })
      app.save(booksCol)
    }

    let loansCol
    try {
      loansCol = app.findCollectionByNameOrId('library_loans')
      loansCol.listRule = RULE
      loansCol.viewRule = RULE
      loansCol.createRule = RULE
      loansCol.updateRule = RULE
      loansCol.deleteRule = RULE
      app.save(loansCol)
    } catch (_) {
      loansCol = new Collection({
        type: 'base',
        name: 'library_loans',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'bookId', type: 'text', required: true, max: 60 },
          { name: 'bookTitle', type: 'text', max: 200 },
          { name: 'studentId', type: 'text', required: true, max: 60 },
          { name: 'studentName', type: 'text', max: 160 },
          { name: 'studentCpf', type: 'text', max: 20 },
          { name: 'loanDate', type: 'text', required: true, max: 20 },
          { name: 'dueDate', type: 'text', required: true, max: 20 },
          { name: 'returnedAt', type: 'text', max: 20 },
          { name: 'renewals', type: 'number', min: 0, max: 50 },
          { name: 'notes', type: 'text', max: 500 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_library_loans_book ON library_loans (bookId)',
          'CREATE INDEX idx_library_loans_student ON library_loans (studentId)',
          'CREATE INDEX idx_library_loans_due ON library_loans (dueDate)',
        ],
      })
      app.save(loansCol)
    }

    // ---------- dados de demonstração idempotentes ----------
    const iso = (d) => d.toISOString().slice(0, 10)
    const addDays = (base, days) => {
      const d = new Date(base)
      d.setDate(d.getDate() + days)
      return d
    }
    const today = new Date()

    let existingBook = null
    try {
      existingBook = app.findFirstRecordByFilter('library_books', 'id != ""')
    } catch (_) {
      existingBook = null
    }

    const bookIds = {}
    if (!existingBook) {
      const demoBooks = [
        [
          'Engenharia de Software Moderna',
          'Marco Tulio Valente',
          '9788550818495',
          'Elsevier',
          2020,
          'Tecnologia',
          'Livro-texto sobre métodos modernos de desenvolvimento de software, arquitetura e práticas ágeis.',
          5,
        ],
        [
          'Introdução à Administração',
          'Idalberto Chiavenato',
          '9788536521563',
          'Atlas',
          2019,
          'Administração',
          'Fundamentos da teoria geral da administração e práticas de gestão organizacional.',
          3,
        ],
        [
          'Cálculo Volume 1',
          'James Stewart',
          '9788522125837',
          'Cengage',
          2016,
          'Exatas',
          'Cálculo diferencial e integral com aplicações, exercícios resolvidos e desafios.',
          4,
        ],
        [
          'Direito Constitucional Esquematizado',
          'Pedro Lenza',
          '9788530985214',
          'Saraiva',
          2021,
          'Direito',
          'Obra esquematizada sobre princípios, direitos fundamentais e organização do Estado.',
          3,
        ],
        [
          'Manual de Enfermagem',
          'Kathryn L. McCance',
          '9788535290170',
          'Elsevier',
          2018,
          'Saúde',
          'Referência em pathofisiologia e cuidados de enfermagem para graduação.',
          2,
        ],
        [
          'Contabilidade Básica',
          'José Carlos Marion',
          '9788545203322',
          'Atlas',
          2020,
          'Contabilidade',
          'Introdução à contabilidade geral com foco em demonstrações financeiras.',
          3,
        ],
        [
          'Marketing 5.0',
          'Philip Kotler',
          '9788550819348',
          'Elsevier',
          2022,
          'Marketing',
          'Tecnologia para humanidade: estratégias de marketing na era digital.',
          2,
        ],
        [
          'Pedagogia da Autonomia',
          'Paulo Freire',
          '9788577590367',
          'Paz e Terra',
          2019,
          'Educação',
          'Saberes necessários à prática educativa crítica e emancipadora.',
          4,
        ],
      ]
      demoBooks.forEach((b) => {
        const rec = new Record(booksCol)
        rec.set('title', b[0])
        rec.set('author', b[1])
        rec.set('isbn', b[2])
        rec.set('publisher', b[3])
        rec.set('year', b[4])
        rec.set('category', b[5])
        rec.set('description', b[6])
        rec.set('totalCopies', b[7])
        app.save(rec)
        bookIds[b[0]] = rec.id
      })
    }

    let existingLoan = null
    try {
      existingLoan = app.findFirstRecordByFilter('library_loans', 'id != ""')
    } catch (_) {
      existingLoan = null
    }

    if (!existingLoan && !existingBook) {
      let students = []
      try {
        students = app.findRecordsByFilter('students', 'id != ""', 'created', 3, 0)
      } catch (_) {
        students = []
      }
      if (students.length > 0) {
        const s0 = students[0]
        const demoLoans = [
          // Atrasado: emprestado há 30 dias, venceu há 16
          [0, -30, -16, '', 0],
          // Ativo regular: vence em 5 dias
          [1, -9, 5, '', 0],
          // Já devolvido
          [2, -40, -26, -20, 1],
        ]
        demoLoans.forEach((l) => {
          if (!students[l[0]]) return
          const s = students[l[0]]
          const rec = new Record(loansCol)
          rec.set('bookId', bookIds['Engenharia de Software Moderna'] || '')
          rec.set('bookTitle', 'Engenharia de Software Moderna')
          rec.set('studentId', s.id)
          rec.set('studentName', s.get('fullName') || '')
          rec.set('studentCpf', s.get('cpf') || '')
          rec.set('loanDate', iso(addDays(today, l[1])))
          rec.set('dueDate', iso(addDays(today, l[2])))
          rec.set('returnedAt', l[3] ? iso(addDays(today, l[3])) : '')
          rec.set('renewals', l[4])
          app.save(rec)
        })
        // Segundo aluno com empréstimo ativo se houver
        if (students[1] && bookIds['Direito Constitucional Esquematizado']) {
          const rec = new Record(loansCol)
          rec.set('bookId', bookIds['Direito Constitucional Esquematizado'])
          rec.set('bookTitle', 'Direito Constitucional Esquematizado')
          rec.set('studentId', students[1].id)
          rec.set('studentName', students[1].get('fullName') || '')
          rec.set('studentCpf', students[1].get('cpf') || '')
          rec.set('loanDate', iso(addDays(today, -4)))
          rec.set('dueDate', iso(addDays(today, 10)))
          rec.set('returnedAt', '')
          rec.set('renewals', 0)
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    // rollback: remove as coleções do módulo de biblioteca
    try {
      app.deleteCollection('library_loans')
    } catch (_) {}
    try {
      app.deleteCollection('library_books')
    } catch (_) {}
  },
)
