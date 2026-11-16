/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0051 — CRUD de alteração de senha na tela Usuários e Equipe.
 *
 * Novos tipos de evento em auth_audit.eventType (select):
 *  - password_changed        : usuário trocou a PRÓPRIA senha (senha atual validada)
 *  - password_reset_by_admin : root/admin redefiniu a senha de OUTRO usuário
 *  - sessions_revoked        : sessões ativas de um usuário foram revogadas
 *
 * Idempotente: reconstroi a lista de valores somente com o que falta.
 * O down restaura os valores originais.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('auth_audit')
    const field = col.fields.getByName('eventType')
    if (!field) return

    const current = field.values || []
    const wanted = ['password_changed', 'password_reset_by_admin', 'sessions_revoked']
    const added = wanted.filter((v) => current.indexOf(v) === -1)

    if (added.length > 0) {
      field.values = current.concat(added)
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('auth_audit')
    const field = col.fields.getByName('eventType')
    if (!field) return

    const original = ['login_success', 'login_failed', 'refresh', 'logout', 'blocked_attempt']
    const filtered = (field.values || []).filter((v) => original.indexOf(v) !== -1)
    if (filtered.length !== (field.values || []).length) {
      field.values = filtered
      app.save(col)
    }
  },
)
