/// <reference path="../pb_data/types.d.ts" />

/**
 * 0045 — Auditoria de preços gravável por usuários autenticados (não-root).
 *
 * price_audit_logs tinha apenas list/view rules: create/update/delete só eram
 * possíveis para superusers, o que produzia 403 ("Only superusers can perform
 * this action") em massa sempre que o módulo financeiro gravava um log de
 * auditoria. Alinha a collection com price_table_items e billing_exceptions
 * (escrita liberada para qualquer usuário autenticado não-aluno).
 */
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('price_audit_logs')
    collection.createRule = "@request.auth.id != '' && @request.auth.role != 'aluno'"
    collection.updateRule = "@request.auth.id != '' && @request.auth.role != 'aluno'"
    collection.deleteRule = "@request.auth.id != '' && @request.auth.role != 'aluno'"
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('price_audit_logs')
    collection.createRule = null
    collection.updateRule = null
    collection.deleteRule = null
    app.save(collection)
  },
)
