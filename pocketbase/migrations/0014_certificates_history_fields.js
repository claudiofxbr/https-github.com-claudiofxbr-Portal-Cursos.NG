/// <reference path="../pb_data/types.d.ts" />
/**
 * Atualiza a coleção 'certificates' com campos de auditoria e ciclo de vida:
 * - status: valores 'ativo', 'revogado', 'substituido'
 * - revokedAt: data/hora da revogação ou substituição
 * - revokedBy: nome do usuário que revogou ou 'Sistema'
 * - revokedByUserId: id do usuário que revogou
 * - revocationReason: motivo da revogação (ex: "Substituído por nova emissão")
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('certificates')

    // 1. Atualiza campo status para incluir 'substituido'
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = ['ativo', 'revogado', 'substituido']
    }

    // 2. Adiciona campos de auditoria de revogação/substituição se não existirem
    if (!col.fields.getByName('revokedAt')) {
      col.fields.add(new TextField({ name: 'revokedAt', max: 50 }))
    }
    if (!col.fields.getByName('revokedBy')) {
      col.fields.add(new TextField({ name: 'revokedBy', max: 180 }))
    }
    if (!col.fields.getByName('revokedByUserId')) {
      col.fields.add(new TextField({ name: 'revokedByUserId', max: 60 }))
    }
    if (!col.fields.getByName('revocationReason')) {
      col.fields.add(new TextField({ name: 'revocationReason', max: 300 }))
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('certificates')
      if (col.fields.getByName('revocationReason')) col.fields.removeByName('revocationReason')
      if (col.fields.getByName('revokedByUserId')) col.fields.removeByName('revokedByUserId')
      if (col.fields.getByName('revokedBy')) col.fields.removeByName('revokedBy')
      if (col.fields.getByName('revokedAt')) col.fields.removeByName('revokedAt')
      const statusField = col.fields.getByName('status')
      if (statusField) {
        statusField.values = ['ativo', 'revogado']
      }
      app.save(col)
    } catch (_) {}
  },
)
