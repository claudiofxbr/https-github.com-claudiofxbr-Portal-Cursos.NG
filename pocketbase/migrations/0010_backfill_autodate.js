/// <reference path="../pb_data/types.d.ts" />
/**
 * Preenche valores default de 'created' e 'updated' para registros pré-existentes
 * nas coleções onde esses campos autodate acabaram de ser adicionados.
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

    const now = new Date().toISOString().replace('T', ' ')

    for (const name of targetCollections) {
      try {
        app
          .db()
          .newQuery(`
          UPDATE ${name}
          SET created = {:now}, updated = {:now}
          WHERE created IS NULL OR created = ''
        `)
          .bind({ now })
          .execute()
      } catch (err) {
        console.warn(`[0010_backfill_autodate] Erro ao preencher ${name}:`, err)
      }
    }
  },
  () => {},
)
