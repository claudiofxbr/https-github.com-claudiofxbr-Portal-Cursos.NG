/// <reference path="../pb_data/types.d.ts" />
/**
 * Adiciona os campos de sistema autodate `created` e `updated` às coleções
 * base criadas na migration inicial 0001 que foram definidas sem eles:
 * - app_users
 * - students
 * - courses
 * - charges
 * - price_table_items
 * - price_audit_logs
 * - billing_exceptions
 * - maintenance_tickets
 * - lgpd_requests
 *
 * Isso atende ao requisito mandatório do PocketBase onde toda coleção `base`
 * deve possuir `created` e `updated`, permitindo ordenação e consultas por data
 * de criação (ex: sort '-created') sem gerar erros HTTP 400.
 */
migrate(
  (app) => {
    const targetCollections = [
      'app_users',
      'students',
      'courses',
      'charges',
      'price_table_items',
      'price_audit_logs',
      'billing_exceptions',
      'maintenance_tickets',
      'lgpd_requests',
    ]

    for (const name of targetCollections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        let changed = false

        if (!col.fields.getByName('created')) {
          col.fields.add(
            new AutodateField({
              name: 'created',
              onCreate: true,
              onUpdate: false,
            }),
          )
          changed = true
        }

        if (!col.fields.getByName('updated')) {
          col.fields.add(
            new AutodateField({
              name: 'updated',
              onCreate: true,
              onUpdate: true,
            }),
          )
          changed = true
        }

        if (changed) {
          app.save(col)
        }
      } catch (err) {
        console.warn(`[0009_add_autodate_fields] Erro ao atualizar colecao ${name}:`, err)
      }
    }
  },
  () => {
    // reversão desnecessária
  },
)
