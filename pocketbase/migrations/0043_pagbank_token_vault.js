/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0043: cofre interno para o token de API do PagBank.
 *
 * Cria a collection "_pagbank_config" com TODAS as regras de acesso nulas —
 * nenhum usuário autenticado ou anônimo pode listar, ver, criar, alterar ou
 * excluir registros via API REST. O segredo só é lido/gravado pelo código do
 * pb_hook pagbank_token.pb.js usando a API de privilégio do servidor.
 *
 * Guarda apenas metadados seguros (last4, updatedAt, atualizadoPor) e o token.
 * O token NUNCA é retornado por nenhum endpoint e nunca aparece em logs.
 */
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('_pagbank_config')
    } catch (_) {
      col = null
    }

    if (!col) {
      col = new Collection({
        name: '_pagbank_config',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'token', type: 'text', required: true, min: 8, max: 500 },
          { name: 'last4', type: 'text', max: 8 },
          { name: 'updatedAt', type: 'text', max: 60 },
          { name: 'updatedBy', type: 'text', max: 200 },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('_pagbank_config')
      app.delete(col)
    } catch (_) {}
  },
)
