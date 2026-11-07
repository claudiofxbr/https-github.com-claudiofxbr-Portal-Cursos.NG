/// <reference path="../pb_data/types.d.ts" />
/**
 * Adiciona campos de perfil à coleção de auth `users` do PocketBase e
 * cadastra os 9 usuários de demonstração com credenciais reais (e-mail e senha).
 *
 * Também ajusta as regras de listagem/visualização de `users` para que usuários
 * autenticados possam consultar a lista de usuários da instituição (usada no
 * módulo de Usuários & Equipe).
 */
migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('users')

    // Permitir que qualquer usuário autenticado liste e veja perfis de usuários
    usersCollection.listRule = "@request.auth.id != ''"
    usersCollection.viewRule = "@request.auth.id != ''"
    // Criação: aberta para novos cadastros ou autenticados
    usersCollection.createRule = ''
    // Atualização: autenticado
    usersCollection.updateRule = "@request.auth.id != ''"

    const fieldsToAdd = [
      {
        name: 'role',
        type: 'select',
        required: false,
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
        required: false,
        maxSelect: 1,
        values: ['ativo', 'inativo', 'bloqueado'],
      },
      { name: 'cpf', type: 'text', max: 20 },
      { name: 'phone', type: 'text', max: 40 },
      { name: 'avatarUrl', type: 'url' },
      { name: 'createdAtText', type: 'text', max: 30 },
      { name: 'lastAccessText', type: 'text', max: 50 },
    ]

    for (const f of fieldsToAdd) {
      const exists = usersCollection.fields.some((existing) => existing.name === f.name)
      if (!exists) {
        usersCollection.fields.add(new Field(f))
      }
    }

    app.save(usersCollection)

    // Lista dos 9 usuários demo com e-mail, senha e metadados
    const demoUsers = [
      {
        email: 'root@portalcursos.ng',
        password: 'Root#2025Portal',
        name: 'Carlos Root Andrade',
        role: 'root',
        roleTitle: 'Super Administrador (Root)',
        department: 'Diretoria de Tecnologia & Governança',
        cpf: '012.345.678-90',
        phone: '(11) 98765-4321',
        avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=101',
        createdAtText: '2023-01-10',
        lastAccessText: 'Hoje às 10:42',
      },
      {
        email: 'admin@portalcursos.ng',
        password: 'Admin#2025Portal',
        name: 'Dra. Beatriz Santos',
        role: 'admin',
        roleTitle: 'Administradora Geral',
        department: 'Reitoria Executiva',
        cpf: '123.456.789-01',
        phone: '(11) 98711-2233',
        avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=female&seed=102',
        createdAtText: '2023-02-15',
        lastAccessText: 'Hoje às 09:15',
      },
      {
        email: 'secretaria@portalcursos.ng',
        password: 'Sec#2025Portal',
        name: 'Mariana Duarte',
        role: 'secretaria',
        roleTitle: 'Chefe de Secretaria Geral',
        department: 'Secretaria Acadêmica Central',
        cpf: '234.567.890-12',
        phone: '(11) 97654-3210',
        avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=female&seed=103',
        createdAtText: '2023-03-01',
        lastAccessText: 'Hoje às 11:05',
      },
      {
        email: 'financeiro@portalcursos.ng',
        password: 'Fin#2025Portal',
        name: 'Roberto Valente',
        role: 'financeiro',
        roleTitle: 'Gestor Financeiro & Tesouraria',
        department: 'Controladoria & Cobrança',
        cpf: '345.678.901-23',
        phone: '(11) 96543-2109',
        avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=104',
        createdAtText: '2023-03-12',
        lastAccessText: 'Ontem às 17:30',
      },
      {
        email: 'academico@portalcursos.ng',
        password: 'Acad#2025Portal',
        name: 'Prof. Henrique Lemos',
        role: 'academico',
        roleTitle: 'Pró-Reitor de Graduação',
        department: 'Pró-Reitoria Acadêmica',
        cpf: '456.789.012-34',
        phone: '(11) 95432-1098',
        avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=105',
        createdAtText: '2023-04-05',
        lastAccessText: 'Ontem às 15:20',
      },
      {
        email: 'matricula@portalcursos.ng',
        password: 'Mat#2025Portal',
        name: 'Camila Fernandes',
        role: 'matricula',
        roleTitle: 'Analista de Matrículas e Documentação',
        department: 'Admissões & Vestibular',
        cpf: '567.890.123-45',
        phone: '(11) 94321-0987',
        avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=female&seed=106',
        createdAtText: '2023-05-18',
        lastAccessText: 'Hoje às 08:30',
      },
      {
        email: 'coordenador@portalcursos.ng',
        password: 'Coord#2025Portal',
        name: 'Profª. Dra. Vanessa Moura',
        role: 'coordenador',
        roleTitle: 'Coordenadora de Engenharia de Software',
        department: 'Faculdade de Tecnologia & Engenharias',
        cpf: '678.901.234-56',
        phone: '(11) 93210-9876',
        avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=female&seed=107',
        createdAtText: '2023-06-01',
        lastAccessText: 'Hoje às 10:11',
      },
      {
        email: 'professor@portalcursos.ng',
        password: 'Prof#2025Portal',
        name: 'Prof. Dr. Rodrigo Ramos',
        role: 'professor',
        roleTitle: 'Docente Permanente',
        department: 'Departamento de Computação e IA',
        cpf: '789.012.345-67',
        phone: '(11) 92109-8765',
        avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=108',
        createdAtText: '2023-08-10',
        lastAccessText: 'Anteontem às 14:00',
      },
      {
        email: 'aluno@portalcursos.ng',
        password: 'Aluno#2025Portal',
        name: 'Lucas Martins Ferreira',
        role: 'aluno',
        roleTitle: 'Aluno Regular de Graduação',
        department: 'Turma B - Noturno (Engenharia de Software)',
        cpf: '890.123.456-78',
        phone: '(11) 91098-7654',
        avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=109',
        createdAtText: '2024-02-01',
        lastAccessText: 'Hoje às 07:45',
      },
    ]

    for (const u of demoUsers) {
      try {
        const existing = app.findAuthRecordByEmail('users', u.email)
        existing.set('name', u.name)
        existing.set('password', u.password)
        existing.set('role', u.role)
        existing.set('roleTitle', u.roleTitle)
        existing.set('department', u.department)
        existing.set('status', 'ativo')
        existing.set('cpf', u.cpf)
        existing.set('phone', u.phone)
        existing.set('avatarUrl', u.avatarUrl)
        existing.set('createdAtText', u.createdAtText)
        existing.set('lastAccessText', u.lastAccessText)
        app.save(existing)
      } catch {
        const record = new Record(usersCollection)
        record.set('email', u.email)
        record.set('password', u.password)
        record.set('name', u.name)
        record.set('role', u.role)
        record.set('roleTitle', u.roleTitle)
        record.set('department', u.department)
        record.set('status', 'ativo')
        record.set('cpf', u.cpf)
        record.set('phone', u.phone)
        record.set('avatarUrl', u.avatarUrl)
        record.set('createdAtText', u.createdAtText)
        record.set('lastAccessText', u.lastAccessText)
        app.save(record)
      }
    }
  },
  () => {
    // Reversão opcional
  },
)
