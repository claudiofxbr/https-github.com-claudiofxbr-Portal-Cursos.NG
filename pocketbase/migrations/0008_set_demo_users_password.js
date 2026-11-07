/// <reference path="../pb_data/types.d.ts" />
/**
 * Garante que todos os 9 usuários de demonstração da coleção auth `users`
 * do PocketBase estejam com a senha oficial 'Portal#2025' devidamente
 * gravada via record.setPassword() (com hash correto do PocketBase),
 * permitindo login com sucesso para aluno@portalcursos.ng e demais contas demo.
 */
migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('_pb_users_auth_')
    const DEMO_PASSWORD = 'Portal#2025'

    const demoUsers = [
      {
        email: 'root@portalcursos.ng',
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
        const existing = app.findAuthRecordByEmail('_pb_users_auth_', u.email)
        existing.setPassword(DEMO_PASSWORD)
        existing.setVerified(true)
        if (u.name) existing.set('name', u.name)
        if (u.role) existing.set('role', u.role)
        if (u.roleTitle) existing.set('roleTitle', u.roleTitle)
        if (u.department) existing.set('department', u.department)
        existing.set('status', 'ativo')
        if (u.cpf) existing.set('cpf', u.cpf)
        if (u.phone) existing.set('phone', u.phone)
        if (u.avatarUrl) existing.set('avatarUrl', u.avatarUrl)
        if (u.createdAtText) existing.set('createdAtText', u.createdAtText)
        if (u.lastAccessText) existing.set('lastAccessText', u.lastAccessText)
        app.save(existing)
      } catch (_) {
        const record = new Record(usersCollection)
        record.setEmail(u.email)
        record.setPassword(DEMO_PASSWORD)
        record.setVerified(true)
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
    // reversão desnecessária
  },
)
