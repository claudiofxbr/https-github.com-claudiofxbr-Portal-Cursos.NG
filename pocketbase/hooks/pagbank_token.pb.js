/// <reference path="../pb_data/types.d.ts" />

/**
 * Integração PagBank — cofre do token de API (somente perfil root).
 *
 * Endpoints (todas sob autenticação PocketBase + perfil root):
 *   GET  /backend/v1/pagbank/status  → { configured, last4?, updatedAt? }
 *   POST /backend/v1/pagbank/token   → grava o token no cofre interno
 *   POST /backend/v1/pagbank/remove  → apaga o token do cofre
 *   POST /backend/v1/pagbank/test    → chama a API sandbox do PagBank com o
 *                                      token salvo e devolve ok/message genérica
 *
 * Garantias de segurança:
 *  - O token NUNCA é retornado por nenhum endpoint, nem em mensagens de erro.
 *  - Nenhum console.log inclui o token (erros do PagBank são generalizados).
 *  - Persistência apenas na collection interna _pagbank_config (migração 0043),
 *    com todas as regras de API nulas — inacessível via REST para qualquer
 *    usuário; leitura/escrita só pelo código do servidor aqui.
 *
 * NOTA JSVM: declarações de topo NÃO são visíveis dentro dos callbacks de rota
 * (pool de VMs separado) — toda a lógica fica inline em cada callback.
 */

routerAdd(
  'GET',
  '/backend/v1/pagbank/status',
  (e) => {
    const isRoot = (function () {
      try {
        return e.auth ? e.auth.getString('role') === 'root' : false
      } catch (_) {
        return false
      }
    })()
    if (!isRoot) {
      return e.json(403, { error: 'Acesso restrito ao perfil root.' })
    }

    let configured = false
    let last4 = ''
    let updatedAt = ''
    try {
      const recs = app.findRecordsByFilter('_pagbank_config', '', '-updated', 1, 0)
      if (recs.length > 0) {
        const token = recs[0].getString('token')
        if (token) {
          configured = true
          last4 = recs[0].getString('last4') || token.slice(-4)
          updatedAt = recs[0].getString('updatedAt') || recs[0].getString('updated')
        }
      }
    } catch (_) {
      // Cofre ainda não criado (migração pendente): trata como não configurado.
      configured = false
    }

    return e.json(200, { configured, last4, updatedAt })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/pagbank/token',
  (e) => {
    const isRoot = (function () {
      try {
        return e.auth ? e.auth.getString('role') === 'root' : false
      } catch (_) {
        return false
      }
    })()
    if (!isRoot) {
      return e.json(403, { error: 'Acesso restrito ao perfil root.' })
    }

    const body = e.requestInfo().body || {}
    const token = String(body.token || '').trim()
    if (token.length < 8 || token.length > 500) {
      return e.json(400, { error: 'Token inválido: informe o token de API do PagBank.' })
    }

    let updatedBy = ''
    try {
      updatedBy = e.auth.getString('email')
    } catch (_) {}

    const nowIso = new Date().toISOString()
    const last4 = token.slice(-4)

    try {
      let rec
      const existing = app.findRecordsByFilter('_pagbank_config', '', '-updated', 1, 0)
      if (existing.length > 0) {
        rec = existing[0]
      } else {
        rec = new Record(app.findCollectionByNameOrId('_pagbank_config'))
      }
      rec.set('token', token)
      rec.set('last4', last4)
      rec.set('updatedAt', nowIso)
      rec.set('updatedBy', updatedBy)
      app.save(rec)
    } catch (err) {
      // Loga apenas o tipo de falha, JAMAIS o token nem o corpo da requisição.
      console.log('[PagBankToken] falha ao gravar o cofre (sem detalhes do conteúdo).')
      return e.json(500, { error: 'Não foi possível salvar o token. Tente novamente.' })
    }

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/pagbank/remove',
  (e) => {
    const isRoot = (function () {
      try {
        return e.auth ? e.auth.getString('role') === 'root' : false
      } catch (_) {
        return false
      }
    })()
    if (!isRoot) {
      return e.json(403, { error: 'Acesso restrito ao perfil root.' })
    }

    try {
      const recs = app.findRecordsByFilter('_pagbank_config', '', '-updated', 50, 0)
      for (const rec of recs) {
        app.delete(rec)
      }
    } catch (_) {}

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/pagbank/test',
  (e) => {
    const isRoot = (function () {
      try {
        return e.auth ? e.auth.getString('role') === 'root' : false
      } catch (_) {
        return false
      }
    })()
    if (!isRoot) {
      return e.json(403, { error: 'Acesso restrito ao perfil root.' })
    }

    let token = ''
    try {
      const recs = app.findRecordsByFilter('_pagbank_config', '', '-updated', 1, 0)
      if (recs.length > 0) token = recs[0].getString('token')
    } catch (_) {}

    if (!token) {
      return e.json(400, {
        ok: false,
        message: 'Nenhum token configurado. Cadastre o token antes de testar a conexão.',
      })
    }

    try {
      // Chamada leve de validação na API sandbox do PagBank (listagem de pedidos).
      const resp = $http.send({
        url: 'https://sandbox.api.pagseguro.com/orders?limit=1',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      // 2xx = token aceito pelo sandbox. Não logamos corpo nem headers.
      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        return e.json(200, {
          ok: true,
          message: 'Conexão estabelecida: o token foi aceito pela API sandbox do PagBank.',
        })
      }
      if (resp.statusCode === 401 || resp.statusCode === 403) {
        return e.json(200, {
          ok: false,
          message:
            'O PagBank rejeitou o token (não autorizado). Verifique o token e tente de novo.',
        })
      }
      return e.json(200, {
        ok: false,
        message:
          'O PagBank sandbox respondeu com status ' +
          resp.statusCode +
          '. Revise o token e o ambiente.',
      })
    } catch (_) {
      console.log('[PagBankToken] falha de rede ao contatar o sandbox (sem detalhes).')
      return e.json(200, {
        ok: false,
        message: 'Falha de comunicação com o PagBank sandbox. Tente novamente mais tarde.',
      })
    }
  },
  $apis.requireAuth(),
)
