/// <reference path="../pb_data/types.d.ts" />
/**
 * Adiciona os campos de parcelamento e dados do cartão na coleção `charges`:
 * - installments: número de parcelas escolhidas no checkout (1 a 12)
 * - cardLast4: últimos 4 dígitos do cartão utilizado
 * - cardBrand: bandeira detectada no checkout (visa, mastercard, elo, amex, etc.)
 */
migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('charges')

      if (!col.fields.getByName('installments')) {
        col.fields.add(
          new NumberField({
            name: 'installments',
            min: 1,
            max: 12,
            onlyInt: true,
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('cardLast4')) {
        col.fields.add(
          new TextField({
            name: 'cardLast4',
            max: 4,
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('cardBrand')) {
        col.fields.add(
          new TextField({
            name: 'cardBrand',
            max: 30,
            required: false,
          }),
        )
      }

      app.save(col)
    } catch (err) {
      console.warn('[0012_add_charge_installments] Erro:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('charges')
      const f1 = col.fields.getByName('installments')
      if (f1) col.fields.remove(f1)
      const f2 = col.fields.getByName('cardLast4')
      if (f2) col.fields.remove(f2)
      const f3 = col.fields.getByName('cardBrand')
      if (f3) col.fields.remove(f3)
      app.save(col)
    } catch (_) {}
  },
)
