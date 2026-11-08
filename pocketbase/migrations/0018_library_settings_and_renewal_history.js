/// <reference path="../pb_data/types.d.ts" />
/**
 * Regras de renovação da Biblioteca:
 * 1. Cria a coleção 'library_settings' (documento único com maxRenewals e renewalDays).
 * 2. Adiciona o campo 'renewalHistory' (json) e garante 'renewals' (number) na coleção 'library_loans'.
 * 3. Seed idempotente da configuração padrão: maxRenewals = 2, renewalDays = 7.
 * 4. Backfill idempotente em library_loans garantindo renewalHistory como array de strings/timestamps.
 */
migrate(
  (app) => {
    const RULE = "@request.auth.id != ''"

    // 1. Coleção library_settings
    let settingsCol
    try {
      settingsCol = app.findCollectionByNameOrId('library_settings')
      settingsCol.listRule = RULE
      settingsCol.viewRule = RULE
      settingsCol.createRule = RULE
      settingsCol.updateRule = RULE
      settingsCol.deleteRule = RULE
      app.save(settingsCol)
    } catch (_) {
      settingsCol = new Collection({
        type: 'base',
        name: 'library_settings',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'maxRenewals', type: 'number', required: false, min: 0, max: 20 },
          { name: 'renewalDays', type: 'number', required: false, min: 1, max: 90 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(settingsCol)
    }

    // 2. Adiciona campo renewalHistory em library_loans caso não exista
    let loansCol
    try {
      loansCol = app.findCollectionByNameOrId('library_loans')
      if (!loansCol.fields.getByName('renewalHistory')) {
        loansCol.fields.add(new JSONField({ name: 'renewalHistory', maxSize: 50000 }))
        app.save(loansCol)
      }
    } catch (_) {}

    // 3. Seed idempotente do registro único de library_settings
    try {
      const existingSettings = app.findFirstRecordByFilter('library_settings', 'id != ""')
      if (!existingSettings) {
        const rec = new Record(settingsCol)
        rec.set('maxRenewals', 2)
        rec.set('renewalDays', 7)
        app.save(rec)
      }
    } catch (_) {
      const rec = new Record(settingsCol)
      rec.set('maxRenewals', 2)
      rec.set('renewalDays', 7)
      app.save(rec)
    }

    // 4. Backfill idempotente em library_loans com registros existentes
    try {
      const loans = app.findRecordsByFilter('library_loans', 'id != ""', 'created', 200, 0)
      loans.forEach((loan) => {
        let changed = false
        const currentRenewals = loan.getInt('renewals')
        const histRaw = loan.getString('renewalHistory')
        if (!histRaw || histRaw === 'null' || histRaw === '') {
          // Se já tem renovação, inicializa histórico compatível
          const initialHistory = []
          if (currentRenewals > 0) {
            initialHistory.push(loan.getString('loanDate') || new Date().toISOString().slice(0, 10))
          }
          loan.set('renewalHistory', JSON.stringify(initialHistory))
          changed = true
        }
        if (changed) {
          app.save(loan)
        }
      })
    } catch (_) {}
  },
  (app) => {
    try {
      app.deleteCollection('library_settings')
    } catch (_) {}
  },
)
