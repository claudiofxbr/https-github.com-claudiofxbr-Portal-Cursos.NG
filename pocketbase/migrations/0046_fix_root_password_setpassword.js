/// <reference path="../pb_data/types.d.ts" />

/**
 * 0046 — Correção da senha da conta root claudio.xavier@gmail.com.
 *
 * Causa raiz: a migração 0044 criou a conta usando record.set('password', ...)
 * que NÃO gera o hash da senha em registros de auth do PocketBase (JSVM).
 * O registro existe com e-mail/role/status corretos, mas validatePassword()
 * falha sempre — o login com essa conta devolvia "Credenciais inválidas".
 *
 * Correção (idempotente): grava a senha inicial 'Portal@Root#2025' usando a
 * API correta de auth record — record.setPassword(...) — em vez de set().
 *
 * Revert simétrico: como não há como restaurar um hash anterior, o down()
 * apenas invalida a conta root de novo (limpa a senha tornando-a não-hasheada),
 * recriando a condição original do bug.
 */
migrate(
  (app) => {
    const rootEmail = 'claudio.xavier@gmail.com'
    const ROOT_INITIAL_PASSWORD = 'Portal@Root#2025'

    let root = null
    try {
      root = app.findAuthRecordByEmail('users', rootEmail)
    } catch (_) {
      root = null
    }

    if (!root) {
      // Conta não existe (banco fresco): cria com setPassword correto.
      const usersCollection = app.findCollectionByNameOrId('users')
      root = new Record(usersCollection)
      root.setEmail(rootEmail)
      root.setEmailVisibility(false)
      root.setPassword(ROOT_INITIAL_PASSWORD)
      root.setVerified(true)
      root.set('name', 'Claudio Xavier')
      root.set('role', 'root')
      root.set('roleTitle', 'Super Administrador (Root)')
      root.set('department', 'Direção Geral')
      root.set('status', 'ativo')
      root.set('cpf', '')
      root.set('phone', '')
      root.set('avatarUrl', '')
      root.set('createdAtText', new Date().toISOString().split('T')[0])
      root.set('lastAccessText', 'Recente')
      app.save(root)
      return
    }

    // Conta existe: reseta a senha inicial de forma idempotente via setPassword.
    root.setPassword(ROOT_INITIAL_PASSWORD)
    root.set('status', 'ativo')
    root.set('role', 'root')
    root.set('verified', true)
    app.save(root)
  },
  (app) => {
    // Revert simétrico: recria a condição original do bug (senha sem hash).
    try {
      const root = app.findAuthRecordByEmail('users', 'claudio.xavier@gmail.com')
      root.set('password', 'Portal@Root#2025')
      app.save(root)
    } catch (_) {}
  },
)
