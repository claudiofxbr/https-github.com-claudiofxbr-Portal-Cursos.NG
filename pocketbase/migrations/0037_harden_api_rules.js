/* ------------------------------------------------------------------
 * Migração 0037 — Endurecimento das regras de API (segurança)
 *
 * Antes: toda collection tinha "@request.auth.id != ''" em TODAS as
 * regras, o que dava a qualquer usuário autenticado (incluindo alunos)
 * leitura, criação, edição e exclusão de TODOS os dados — inclusive
 * CPF, documentos, cobranças e registros de outros alunos.
 *
 * Depois (todas idempotentes, aplicam apenas se a regra atual divergir):
 *  - Dados institucionais (cursos, biblioteca, calendário, materiais,
 *    turmas, horários, preço, despesas, tickets de manutenção):
 *    leitura para qualquer autenticado; escrita apenas para a equipe
 *    (qualquer perfil exceto aluno).
 *  - Dados pessoais (alunos, cobranças, notas, presenças, progresso de
 *    aula, notificações, tickets de suporte, empréstimos, certificados,
 *    perfis de usuário): leitura/escrita apenas da equipe (não-aluno) OU
 *    do próprio dono do registro.
 *  - Requisições LGPD: leitura/escrita apenas da equipe.
 *  - Logs de auditoria de preço: apenas leitura para a equipe — ninguém
 *    cria/edita via API (são escritos pelo próprio fluxo autorizado).
 * ------------------------------------------------------------------ */

const TEAM_RULE = "@request.auth.id != '' && @request.auth.role != 'aluno'"
const TEAM_OR_OWNER_STUDENT = `( ${TEAM_RULE} ) || @request.auth.studentId != '' && @request.auth.studentId = studentId`

function ownerRules(studentField) {
  const owner = `@request.auth.studentId != '' && @request.auth.studentId = ${studentField}`
  return {
    listRule: `( ${TEAM_RULE} ) || ${owner}`,
    viewRule: `( ${TEAM_RULE} ) || ${owner}`,
    createRule: TEAM_RULE,
    updateRule: `( ${TEAM_RULE} ) || ${owner}`,
    deleteRule: TEAM_RULE,
  }
}

function selfRules() {
  return {
    listRule: TEAM_RULE,
    viewRule: TEAM_RULE,
    createRule: TEAM_RULE,
    updateRule: TEAM_RULE,
    deleteRule: TEAM_RULE,
  }
}

function institutionRules() {
  return {
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: TEAM_RULE,
    updateRule: TEAM_RULE,
    deleteRule: TEAM_RULE,
  }
}

function readOnlyTeamRules() {
  return {
    listRule: TEAM_RULE,
    viewRule: TEAM_RULE,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  }
}

function publicReadRules() {
  return {
    listRule: '',
    viewRule: '',
    createRule: TEAM_RULE,
    updateRule: TEAM_RULE,
    deleteRule: TEAM_RULE,
  }
}

function sameRules(current, next) {
  for (const key of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
    if ((current[key] ?? null) !== (next[key] ?? null)) return false
  }
  return true
}

migrate(
  (app) => {
    const collections = [
      // Dados pessoais por aluno — equipe OU o próprio aluno
      ['students', ownerRules('id')],
      ['charges', ownerRules('studentId')],
      ['grades', ownerRules('studentId')],
      ['attendance', ownerRules('studentId')],
      ['lesson_progress', ownerRules('studentId')],
      ['student_notifications', ownerRules('studentId')],
      ['student_support_tickets', ownerRules('studentId')],
      ['library_loans', ownerRules('studentId')],
      ['certificates', ownerRules('studentId')],
      // Institucional — leitura autenticada, escrita só da equipe
      ['courses', institutionRules()],
      ['classes', institutionRules()],
      ['class_schedules', institutionRules()],
      ['calendar_events', institutionRules()],
      ['course_materials', institutionRules()],
      ['ead_courses', institutionRules()],
      ['ead_lessons', institutionRules()],
      ['ead_materials', institutionRules()],
      ['library_books', institutionRules()],
      ['library_settings', institutionRules()],
      ['maintenance_tickets', institutionRules()],
      ['expenses', institutionRules()],
      // Financeiro institucional — leitura/escrita só da equipe
      ['price_table_items', selfRules()],
      ['billing_exceptions', selfRules()],
      // LGPD — equipe
      ['lgpd_requests', selfRules()],
      // Perfis de usuário — equipe (o perfil do aluno editável edita
      // apenas `students`, via ownerRules acima)
      ['app_users', selfRules()],
    ]

    for (const [name, rules] of collections) {
      const collection = app.findCollectionByNameOrId(name)
      if (!collection) continue
      if (sameRules(collection, rules)) continue
      for (const key of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
        collection[key] = rules[key]
      }
      app.save(collection)
    }

    // Logs de auditoria de preço: somente leitura pela equipe.
    // Escrita fica restrita ao fluxo autorizado (não via API pública).
    const logs = app.findCollectionByNameOrId('price_audit_logs')
    if (logs && !sameRules(logs, readOnlyTeamRules())) {
      const readOnly = readOnlyTeamRules()
      for (const key of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
        logs[key] = readOnly[key]
      }
      app.save(logs)
    }

    // Catálogo público de cursos EAD publicados (listagem aberta na home).
    const ead = app.findCollectionByNameOrId('ead_courses')
    if (ead) {
      const next = publicReadRules()
      if (!sameRules(ead, next)) {
        for (const key of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
          ead[key] = next[key]
        }
        app.save(ead)
      }
    }
  },
  (app) => {
    // Down: restaura as regras amplas anteriores (idempotente).
    const open = {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
    }
    for (const name of [
      'students',
      'charges',
      'grades',
      'attendance',
      'lesson_progress',
      'student_notifications',
      'student_support_tickets',
      'library_loans',
      'certificates',
      'courses',
      'classes',
      'class_schedules',
      'calendar_events',
      'course_materials',
      'ead_courses',
      'ead_lessons',
      'ead_materials',
      'library_books',
      'library_settings',
      'maintenance_tickets',
      'expenses',
      'price_table_items',
      'billing_exceptions',
      'lgpd_requests',
      'app_users',
      'price_audit_logs',
    ]) {
      const collection = app.findCollectionByNameOrId(name)
      if (!collection) continue
      for (const key of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
        collection[key] = open[key]
      }
      app.save(collection)
    }
  },
)
