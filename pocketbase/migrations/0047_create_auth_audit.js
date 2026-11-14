/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0047 — Collection de auditoria de autenticação (auth_audit).
 *
 * Um registro por evento de autenticação do PortalCursos.NG:
 *   - login_success   : login concluído (hook /backend/v1/auth/login)
 *   - login_failed    : tentativa de login rejeitada (senha errada, usuário inexistente etc.)
 *   - blocked_attempt : tentativa de usuário bloqueado/inativo
 *   - refresh         : renovação silenciosa de sessão (sucesso ou token inválido)
 *   - logout          : encerramento de sessão
 *
 * NUNCA grava senha ou hash de token — apenas e-mail tentado, motivo, IP e user agent.
 *
 * Regras de API: todas nulas (superusers only). A leitura pela tela de auditoria
 * acontece exclusivamente pela rota customizada GET /backend/v1/auth/audit,
 * restrita aos perfis root/admin no hook auth_session.pb.js.
 */
migrate(
  (app) => {
    // Idempotente: se já existir (apply re-executado), apenas segue.
    try {
      app.findCollectionByNameOrId('auth_audit')
      return
    } catch (_) {
      // não existe ainda — cria abaixo
    }

    const collection = new Collection({
      name: 'auth_audit',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'eventType',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['login_success', 'login_failed', 'refresh', 'logout', 'blocked_attempt'],
        },
        // Texto (não relation): falhas de login de usuário inexistente não têm ID.
        { name: 'userId', type: 'text' },
        // Texto (não email): a tentativa pode conter entrada inválida do usuário.
        { name: 'email', type: 'text' },
        { name: 'reason', type: 'text' },
        { name: 'ip', type: 'text' },
        { name: 'userAgent', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_auth_audit_event ON auth_audit (eventType, created)',
        'CREATE INDEX idx_auth_audit_email ON auth_audit (email)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('auth_audit')
      app.delete(col)
    } catch (_) {
      // nada a reverter
    }
  },
)
