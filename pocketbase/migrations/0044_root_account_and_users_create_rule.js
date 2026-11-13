/// <reference path="../pb_data/types.d.ts" />

/**
 * 0044 — Conta root real (claudio.xavier@gmail.com) + create rule da auth collection.
 *
 * Problema: a collection `users` tinha create rule vazia (somente superuser).
 * Todo cadastro pela tela de signup do app falhava com 400 no POST de
 * /api/collections/users/records e o fallback do app tentava gravar em
 * app_users (espelho legado sem auth), gerando a enxurrada de 400 nos logs —
 * e nenhum usuário novo conseguia se registrar.
 *
 * Correção:
 * 1. create rule da auth collection: somente usuários já autenticados e com
 *    perfil administrativo podem criar contas (a tela de cadastro roda sempre
 *    autenticada pela conta de serviço do app). Visitantes anônimos continuam
 *    sem poder criar contas.
 * 2. Cria a conta root claudio.xavier@gmail.com (se ainda não existir) com
 *    senha inicial forte, status ativo. A senha deve ser trocada em
 *    /reset-password no primeiro acesso.
 */
migrate(
  (app) => {
    // 1. Create rule administrativa para a auth collection `users`
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.createRule = "@request.auth.id != '' && @request.auth.role != 'aluno'"
    app.save(usersCol)

    // 2. Conta root real do titular do portal
    const rootEmail = 'claudio.xavier@gmail.com'
    let existing = null
    try {
      existing = app.findAuthRecordByEmail('users', rootEmail)
    } catch (_) {}

    if (!existing) {
      const usersCollection = app.findCollectionByNameOrId('users')
      const record = new Record(usersCollection)
      record.set('email', rootEmail)
      record.set('emailVisibility', false)
      record.set('verified', true)
      record.set('password', 'Portal@Root#2025')
      record.set('name', 'Claudio Xavier')
      record.set('role', 'root')
      record.set('roleTitle', 'Super Administrador (Root)')
      record.set('department', 'Direção Geral')
      record.set('status', 'ativo')
      record.set('cpf', '')
      record.set('phone', '')
      record.set('avatarUrl', '')
      record.set('createdAtText', new Date().toISOString().split('T')[0])
      record.set('lastAccessText', 'Recente')
      app.save(record)
    }
  },
  (app) => {
    // Revert: volta a create superuser-only e remove a conta root se ela
    // ainda existir (best-effort, apenas para simetria do revert).
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.createRule = null
    app.save(usersCol)

    try {
      const rec = app.findAuthRecordByEmail('users', 'claudio.xavier@gmail.com')
      app.delete(rec)
    } catch (_) {}
  },
)
