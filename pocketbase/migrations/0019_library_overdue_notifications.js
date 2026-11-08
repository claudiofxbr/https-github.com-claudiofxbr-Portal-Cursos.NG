/// <reference path="../pb_data/types.d.ts" />
/**
 * Notificação automática de empréstimos atrasados da Biblioteca:
 * 1. Adiciona campo 'libraryEmail' (email) na coleção 'library_settings' com default 'biblioteca@portalcursos.ng'.
 * 2. Adiciona campo 'lastOverdueNotifiedAt' (text) na coleção 'library_loans' para controle anti-spam diário.
 * 3. Cria índice 'idx_library_loans_overdue_notif' em library_loans (lastOverdueNotifiedAt).
 * 4. Backfill idempotente no registro existente de library_settings garantindo o email padrão.
 */
migrate(
  (app) => {
    // 1. Campo libraryEmail em library_settings
    try {
      const settingsCol = app.findCollectionByNameOrId('library_settings')
      if (!settingsCol.fields.getByName('libraryEmail')) {
        settingsCol.fields.add(
          new EmailField({
            name: 'libraryEmail',
            required: false,
          }),
        )
        app.save(settingsCol)
      }
    } catch (err) {
      console.log('[Migration 0019] Erro ao adicionar libraryEmail em library_settings:', err)
    }

    // 2. Campo lastOverdueNotifiedAt em library_loans
    try {
      const loansCol = app.findCollectionByNameOrId('library_loans')
      if (!loansCol.fields.getByName('lastOverdueNotifiedAt')) {
        loansCol.fields.add(
          new TextField({
            name: 'lastOverdueNotifiedAt',
            required: false,
            max: 40,
          }),
        )
        app.save(loansCol)
      }
    } catch (err) {
      console.log('[Migration 0019] Erro ao adicionar lastOverdueNotifiedAt em library_loans:', err)
    }

    // 3. Índice para lastOverdueNotifiedAt
    try {
      const loansCol = app.findCollectionByNameOrId('library_loans')
      loansCol.addIndex('idx_library_loans_notif', false, 'lastOverdueNotifiedAt', '')
      app.save(loansCol)
    } catch (_) {}

    // 4. Backfill idempotente em library_settings com email padrão
    try {
      const settingsList = app.findRecordsByFilter('library_settings', 'id != ""', 'created', 1, 0)
      if (settingsList.length > 0) {
        const s = settingsList[0]
        if (!s.getString('libraryEmail')) {
          s.set('libraryEmail', 'biblioteca@portalcursos.ng')
          app.save(s)
        }
      }
    } catch (err) {
      console.log('[Migration 0019] Erro no backfill de library_settings:', err)
    }
  },
  (app) => {
    // Rollback
    try {
      const settingsCol = app.findCollectionByNameOrId('library_settings')
      const emailField = settingsCol.fields.getByName('libraryEmail')
      if (emailField) {
        settingsCol.fields.removeById(emailField.id)
        app.save(settingsCol)
      }
    } catch (_) {}

    try {
      const loansCol = app.findCollectionByNameOrId('library_loans')
      loansCol.removeIndex('idx_library_loans_notif')
      const notifField = loansCol.fields.getByName('lastOverdueNotifiedAt')
      if (notifField) {
        loansCol.fields.removeById(notifField.id)
        app.save(loansCol)
      }
    } catch (_) {}
  },
)
