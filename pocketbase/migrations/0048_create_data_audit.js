/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0048 — Collection de auditoria de DADOS (data_audit) do PortalCursos.NG.
 *
 * Um registro por operação de escrita nas collections de negócio do portal:
 *   - action          : create | update | delete
 *   - collName        : nome real da collection afetada (students, charges, users…)
 *   - recordRef       : id do registro afetado
 *   - recordLabel     : rótulo legível do registro (ex.: nome do aluno, código da cobrança)
 *   - actorId         : id do usuário autenticado que fez a operação (se conhecido)
 *   - actorEmail      : e-mail de quem fez (texto — operações de sistema não têm e-mail)
 *   - actorName       : nome de quem fez (quando resolvível)
 *   - src             : "app" (escrita pelo portal) ou "sistema" (sem usuário autenticado)
 *   - changesJson     : JSON com o resumo campo a campo:
 *        update → [{ field, from, to }]   create → [{ field, to }]   delete → []
 *     Valores são TRUNCADOS (máx. 200 caracteres) e campos sensíveis
 *     (senha, token, hash etc.) NUNCA são gravados.
 *
 * Regras de API: todas nulas (superusers only), no mesmo padrão da auth_audit
 * (migração 0047). A leitura pela nova tela "Log de Alterações" acontece
 * exclusivamente pelas rotas customizadas
 *   GET /backend/v1/data/audit          (lista paginada com filtros)
 *   GET /backend/v1/data/audit/summary  (cartões de resumo)
 * restritas no hook data_audit.pb.js aos perfis root/admin via token nativo.
 *
 * NOTA: os nomes dos campos evitam palavras reservadas do PB
 * ("recordId", "changes", "source" etc. são rejeitadas com
 *  "must not be in list" na validação da collection).
 */
migrate(
  (app) => {
    // Idempotente: se já existir (apply re-executado), apenas segue.
    try {
      app.findCollectionByNameOrId('data_audit')
      return
    } catch (_) {
      // não existe ainda — cria abaixo
    }

    const collection = new Collection({
      name: 'data_audit',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'action',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['create', 'update', 'delete'],
        },
        { name: 'collName', type: 'text', required: true },
        { name: 'recordRef', type: 'text' },
        { name: 'recordLabel', type: 'text' },
        { name: 'actorId', type: 'text' },
        { name: 'actorEmail', type: 'text' },
        { name: 'actorName', type: 'text' },
        { name: 'src', type: 'text' },
        { name: 'changesJson', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_data_audit_coll ON data_audit (collName, created)',
        'CREATE INDEX idx_data_audit_action ON data_audit (action, created)',
        'CREATE INDEX idx_data_audit_actor ON data_audit (actorEmail)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('data_audit')
      app.delete(col)
    } catch (_) {
      // nada a reverter
    }
  },
)
