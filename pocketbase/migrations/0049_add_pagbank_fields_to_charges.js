/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0049 — Integração PagBank (sandbox): campos de rastreio em `charges`.
 *
 * - pagbankOrderId      : id do pedido externo ORDE_... criado no sandbox
 * - pagbankChargeStatus : status devolvido pela API (AUTHORIZED|PAID|IN_ANALYSIS|
 *                         DECLINED|CANCELED|WAITING)
 * - pagbankChargeId     : id da charge externa (CHN_...) quando presente
 * - pagbankCreatedAt    : data/hora (ISO) em que o pedido foi criado no sandbox
 *
 * Idempotente: usa col.fields.getByName antes de cada add (padrão 0012/0014).
 * O down remove os quatro campos.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('charges')

    if (!col.fields.getByName('pagbankOrderId')) {
      col.fields.add(new TextField({ name: 'pagbankOrderId', max: 120, required: false }))
    }
    if (!col.fields.getByName('pagbankChargeStatus')) {
      col.fields.add(new TextField({ name: 'pagbankChargeStatus', max: 40, required: false }))
    }
    if (!col.fields.getByName('pagbankChargeId')) {
      col.fields.add(new TextField({ name: 'pagbankChargeId', max: 120, required: false }))
    }
    if (!col.fields.getByName('pagbankCreatedAt')) {
      col.fields.add(new TextField({ name: 'pagbankCreatedAt', max: 40, required: false }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('charges')
    const names = ['pagbankOrderId', 'pagbankChargeStatus', 'pagbankChargeId', 'pagbankCreatedAt']
    let removed = false
    for (const name of names) {
      const f = col.fields.getByName(name)
      if (f) {
        col.fields.remove(f)
        removed = true
      }
    }
    if (removed) app.save(col)
  },
)
