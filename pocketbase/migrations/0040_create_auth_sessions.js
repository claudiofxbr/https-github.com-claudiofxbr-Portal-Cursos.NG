migrate(
  (app) => {
    // Collection auth_sessions: gerencia os refresh tokens de sessão segura
    // Regras estritas: somente superuser/hooks têm acesso via REST nativo
    // Todo o fluxo de refresh/login/logout é intermediado pelos endpoints em pb_hooks
    const collection = new Collection({
      name: 'auth_sessions',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'userId', type: 'text', required: true },
        { name: 'userEmail', type: 'email', required: true },
        { name: 'userRole', type: 'text', required: true },
        { name: 'refreshTokenHash', type: 'text', required: true },
        { name: 'expiresAt', type: 'text', required: true },
        { name: 'revoked', type: 'bool', required: false },
        { name: 'userAgent', type: 'text', required: false },
        { name: 'ipAddress', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_auth_sessions_hash ON auth_sessions (refreshTokenHash)',
        'CREATE INDEX idx_auth_sessions_user ON auth_sessions (userId, revoked)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('auth_sessions')
      app.delete(col)
    } catch (_) {}
  },
)
