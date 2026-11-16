/// <reference path="../pb_data/types.d.ts" />

/**
 * Integração PagBank — criação e consulta de pedidos no SANDBOX real.
 *
 * Endpoints (todos autenticados por token nativo PocketBase, padrão das rotas
 * de auditoria/relatório):
 *   POST /backend/v1/pagbank/orders?chargeId=<id>&method=pix|cartao
 *         → cria o pedido no sandbox e grava ids/status/QR na cobrança interna
 *   GET  /backend/v1/pagbank/orders?chargeId=<id>
 *         → consulta o status atual do pedido no sandbox e atualiza a cobrança
 *
 * Fonte do token (nunca aparece na resposta, em logs ou no frontend):
 *   1. variável de ambiente PAGBANK_SANDBOX_TOKEN ($os.getenv)
 *   2. fallback: cofre interno _pagbank_config (migração 0043, tela root)
 * Sem nenhuma das fontes → 503 "Integração PagBank não configurada
 * (token do sandbox ausente)" — nunca mascarado como erro genérico.
 *
 * NOTAS JSVM (Skip Cloud):
 *  - callbacks de routerAdd rodam em pool de VMs separado: TODA a lógica é
 *    INLINE no callback (declarações de topo não são visíveis).
 *  - usar `const app = $app` (não existe global `app`).
 *  - NÃO existe app.countRecordsByFilter — usar findRecordsByFilter.
 *  - $http.send com URL ABSOLUTA (https://sandbox.api.pagseguro.com/...):
 *    URL relativa lança 'unsupported protocol scheme'.
 */

// ---------------------------------------------------------------------------
// POST /backend/v1/pagbank/orders — cria pedido no sandbox do PagBank
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/pagbank/orders', (e) => {
  const app = $app

  // --- autenticação: token nativo (mesmo mecanismo das rotas /auth/* e /data/*) ---
  const reqInfo = e.requestInfo()
  const headers = reqInfo.headers || {}
  const authHeader = String(headers['authorization'] || headers['Authorization'] || '')
  const nativeToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!nativeToken) {
    return e.json(401, { error: 'Não autenticado.' })
  }

  let viewer
  try {
    viewer = app.findAuthRecordByToken(nativeToken, 'auth')
  } catch (tokenErr) {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }
  if (!viewer || viewer.collection().name !== 'users') {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }

  // --- parâmetros ---
  const body = reqInfo.body || {}
  const chargeId = String(body.chargeId || '').trim()
  const method = String(body.method || 'pix')
    .trim()
    .toLowerCase()
  if (!chargeId) {
    return e.json(400, { error: 'Informe o id da cobrança (chargeId).' })
  }
  if (method !== 'pix' && method !== 'cartao') {
    return e.json(400, { error: 'Método inválido: use "pix" ou "cartao".' })
  }

  // --- cobrança interna ---
  let chargeRec
  try {
    const found = app.findRecordsByFilter('charges', 'id = {:id}', '', 1, 0, { id: chargeId })
    if (found.length > 0) chargeRec = found[0]
  } catch (findErr) {
    console.log('[PagBankOrders] falha ao buscar a cobrança interna: ' + findErr)
  }
  if (!chargeRec) {
    return e.json(404, { error: 'Cobrança não encontrada.' })
  }
  if (String(chargeRec.getString('status') || '') === 'pago') {
    return e.json(400, { error: 'Esta cobrança já está liquidada.' })
  }

  // --- token: env → cofre interno; sem token → 503 específico ---
  let token = ''
  try {
    token = String($os.getenv('PAGBANK_SANDBOX_TOKEN') || '').trim()
  } catch (envErr) {
    token = ''
  }
  if (!token) {
    try {
      const vault = app.findRecordsByFilter('_pagbank_config', '', '-updated', 1, 0)
      if (vault.length > 0) {
        token = String(vault[0].getString('token') || '').trim()
      }
    } catch (vaultErr) {
      token = ''
    }
  }
  if (!token) {
    console.log(
      '[PagBankOrders] 503: token do sandbox ausente (env PAGBANK_SANDBOX_TOKEN e cofre vazios).',
    )
    return e.json(503, {
      error: 'Integração PagBank não configurada (token do sandbox ausente).',
      integrationConfigured: false,
      mode: 'demo',
    })
  }

  // --- payload do pedido (somente campos documentados pela API de Orders) ---
  const chargeCode = String(chargeRec.getString('code') || chargeRec.id)
  const description = String(chargeRec.getString('description') || 'Cobrança PortalCursos.NG')
  const studentName = String(chargeRec.getString('studentName') || 'Aluno PortalCursos')
  const studentCpfRaw = String(chargeRec.getString('studentCpf') || '').replace(/\D/g, '')
  const amountValue = Math.round(Number(chargeRec.getFloat('amount') || 0) * 100)
  if (amountValue <= 0) {
    return e.json(400, { error: 'Valor da cobrança inválido para o pedido PagBank.' })
  }

  const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')

  const paymentMethod =
    method === 'pix'
      ? { type: 'PIX', pix: { expiration_date: expiry } }
      : { type: 'CREDIT_CARD', installments: 1, capture: true }

  const orderPayload = {
    reference_id: chargeCode,
    customer: {
      name: studentName,
      email: 'financeiro@portalcursos.ng',
      tax_id: studentCpfRaw.length === 11 ? studentCpfRaw : '12345678909',
    },
    items: [
      {
        reference_id: chargeCode,
        name: description.slice(0, 120),
        quantity: 1,
        unit_amount: amountValue,
      },
    ],
    charges: [
      {
        reference_id: chargeCode,
        description: description.slice(0, 200),
        amount: { value: amountValue, currency: 'BRL' },
        payment_method: paymentMethod,
      },
    ],
  }

  // --- chamada ao sandbox (URL ABSOLUTA, Authorization apenas no header) ---
  let resp
  try {
    resp = $http.send({
      url: 'https://sandbox.api.pagseguro.com/orders',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(orderPayload),
      timeout: 25,
    })
  } catch (httpErr) {
    console.log(
      '[PagBankOrders] cobranca ' + chargeCode + ': falha de rede com o sandbox (' + httpErr + ')',
    )
    return e.json(502, { error: 'Falha de comunicação com o PagBank. Tente novamente.' })
  }

  if (resp.statusCode === 401 || resp.statusCode === 403) {
    console.log(
      '[PagBankOrders] cobranca ' +
        chargeCode +
        ': sandbox devolveu ' +
        resp.statusCode +
        ' (token inválido ou sem permissão).',
    )
    return e.json(502, {
      error: 'Token do PagBank inválido ou sem permissão. Revise o token do sandbox.',
      integrationConfigured: true,
    })
  }

  let apiBody = null
  try {
    apiBody =
      typeof resp.json !== 'undefined' && resp.json !== null ? resp.json : JSON.parse(resp.body)
  } catch (parseErr) {
    apiBody = null
  }

  if (resp.statusCode < 200 || resp.statusCode >= 300) {
    const apiMsg =
      apiBody && apiBody.error_messages && apiBody.error_messages.length > 0
        ? String(apiBody.error_messages[0].description || apiBody.error_messages[0].message || '')
        : ''
    console.log(
      '[PagBankOrders] cobranca ' +
        chargeCode +
        ': pedido recusado pelo sandbox (HTTP ' +
        resp.statusCode +
        ').',
    )
    return e.json(502, {
      error:
        'Pedido recusado pelo PagBank' +
        (apiMsg ? ': ' + apiMsg : ' (HTTP ' + resp.statusCode + ').'),
      integrationConfigured: true,
    })
  }

  // --- resposta de sucesso: extrai dados documentados (charges[0], qr_code, links) ---
  const extCharge =
    apiBody && apiBody.charges && apiBody.charges.length > 0 ? apiBody.charges[0] : null
  const extOrderId = apiBody && apiBody.id ? String(apiBody.id) : ''
  const extChargeId = extCharge && extCharge.id ? String(extCharge.id) : ''
  const extStatus = extCharge && extCharge.status ? String(extCharge.status) : 'WAITING'

  let qrText = ''
  let qrImageUrl = ''
  try {
    if (extCharge && extCharge.qr_code && extCharge.qr_code.text) {
      qrText = String(extCharge.qr_code.text)
    }
    if (extCharge && extCharge.links) {
      for (let i = 0; i < extCharge.links.length; i++) {
        if (String(extCharge.links[i].rel || '') === 'QRCODE.PNG') {
          qrImageUrl = String(extCharge.links[i].href || '')
        }
      }
    }
  } catch (qrErr) {
    qrText = ''
    qrImageUrl = ''
  }

  // --- grava na cobrança interna (ids externos, status, QR real do Pix) ---
  try {
    chargeRec.set('pagbankOrderId', extOrderId)
    chargeRec.set('pagbankChargeId', extChargeId)
    chargeRec.set('pagbankChargeStatus', extStatus)
    if (qrText) chargeRec.set('pixCode', qrText)
    if (qrImageUrl) chargeRec.set('pixQrUrl', qrImageUrl)
    app.save(chargeRec)
  } catch (saveErr) {
    console.log(
      '[PagBankOrders] cobranca ' +
        chargeCode +
        ': pedido criado, mas falha ao gravar no banco (' +
        saveErr +
        ')',
    )
    return e.json(500, {
      error:
        'Pedido criado no PagBank, mas não foi possível atualizar a cobrança interna. Consulte o status para sincronizar.',
      integrationConfigured: true,
      charge: {
        orderId: extOrderId,
        chargeId: extChargeId,
        status: extStatus,
        qrCodeText: qrText,
        qrCodeImageUrl: qrImageUrl,
      },
    })
  }

  return e.json(200, {
    ok: true,
    mode: 'sandbox',
    charge: {
      orderId: extOrderId,
      chargeId: extChargeId,
      status: extStatus,
      qrCodeText: qrText,
      qrCodeImageUrl: qrImageUrl,
      expiresAt: method === 'pix' ? expiry : '',
    },
  })
})

// ---------------------------------------------------------------------------
// GET /backend/v1/pagbank/orders?chargeId=<id> — status atual no sandbox
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/pagbank/orders', (e) => {
  const app = $app

  const reqInfo = e.requestInfo()
  const headers = reqInfo.headers || {}
  const q = reqInfo.query || {}

  const authHeader = String(headers['authorization'] || headers['Authorization'] || '')
  const nativeToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!nativeToken) {
    return e.json(401, { error: 'Não autenticado.' })
  }

  let viewer
  try {
    viewer = app.findAuthRecordByToken(nativeToken, 'auth')
  } catch (tokenErr) {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }
  if (!viewer || viewer.collection().name !== 'users') {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }

  const chargeId = String(q.chargeId || '').trim()
  if (!chargeId) {
    return e.json(400, { error: 'Informe o id da cobrança (chargeId).' })
  }

  let chargeRec
  try {
    const found = app.findRecordsByFilter('charges', 'id = {:id}', '', 1, 0, { id: chargeId })
    if (found.length > 0) chargeRec = found[0]
  } catch (findErr) {
    console.log('[PagBankOrders] falha ao buscar a cobrança interna: ' + findErr)
  }
  if (!chargeRec) {
    return e.json(404, { error: 'Cobrança não encontrada.' })
  }

  const extOrderId = String(chargeRec.getString('pagbankOrderId') || '').trim()
  if (!extOrderId) {
    return e.json(404, { error: 'Esta cobrança ainda não tem pedido PagBank associado.' })
  }

  // --- token: env → cofre interno; sem token → 503 específico ---
  let token = ''
  try {
    token = String($os.getenv('PAGBANK_SANDBOX_TOKEN') || '').trim()
  } catch (envErr) {
    token = ''
  }
  if (!token) {
    try {
      const vault = app.findRecordsByFilter('_pagbank_config', '', '-updated', 1, 0)
      if (vault.length > 0) {
        token = String(vault[0].getString('token') || '').trim()
      }
    } catch (vaultErr) {
      token = ''
    }
  }
  if (!token) {
    console.log(
      '[PagBankOrders] 503: token do sandbox ausente (env PAGBANK_SANDBOX_TOKEN e cofre vazios).',
    )
    return e.json(503, {
      error: 'Integração PagBank não configurada (token do sandbox ausente).',
      integrationConfigured: false,
      mode: 'demo',
    })
  }

  let resp
  try {
    resp = $http.send({
      url: 'https://sandbox.api.pagseguro.com/orders/' + extOrderId,
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
      },
      timeout: 20,
    })
  } catch (httpErr) {
    console.log(
      '[PagBankOrders] cobranca ' +
        chargeId +
        ': falha de rede ao consultar o sandbox (' +
        httpErr +
        ')',
    )
    return e.json(502, { error: 'Falha de comunicação com o PagBank. Tente novamente.' })
  }

  if (resp.statusCode === 401 || resp.statusCode === 403) {
    console.log(
      '[PagBankOrders] cobranca ' +
        chargeId +
        ': sandbox devolveu ' +
        resp.statusCode +
        ' na consulta (token inválido ou sem permissão).',
    )
    return e.json(502, {
      error: 'Token do PagBank inválido ou sem permissão. Revise o token do sandbox.',
    })
  }

  let apiBody = null
  try {
    apiBody =
      typeof resp.json !== 'undefined' && resp.json !== null ? resp.json : JSON.parse(resp.body)
  } catch (parseErr) {
    apiBody = null
  }

  if (resp.statusCode < 200 || resp.statusCode >= 300 || !apiBody) {
    console.log(
      '[PagBankOrders] cobranca ' +
        chargeId +
        ': consulta recusada pelo sandbox (HTTP ' +
        resp.statusCode +
        ').',
    )
    return e.json(502, {
      error: 'Pedido recusado pelo PagBank na consulta de status (HTTP ' + resp.statusCode + ').',
    })
  }

  const extCharge = apiBody.charges && apiBody.charges.length > 0 ? apiBody.charges[0] : null
  const extStatus = extCharge && extCharge.status ? String(extCharge.status) : 'UNKNOWN'

  const statusLabel =
    extStatus === 'PAID'
      ? 'Pago'
      : extStatus === 'WAITING'
        ? 'Aguardando pagamento'
        : extStatus === 'DECLINED'
          ? 'Recusado'
          : extStatus === 'CANCELED'
            ? 'Cancelado'
            : extStatus === 'IN_ANALYSIS'
              ? 'Em análise'
              : extStatus

  const isPaid = extStatus === 'PAID'

  // --- sincroniza a cobrança interna com o status real ---
  let internalStatus = String(chargeRec.getString('status') || 'pendente')
  try {
    chargeRec.set('pagbankChargeStatus', extStatus)
    if (isPaid && internalStatus !== 'pago') {
      const payMethod =
        extCharge &&
        extCharge.payment_method &&
        String(extCharge.payment_method.type || '') === 'PIX'
          ? 'pix'
          : 'cartao'
      const paidAt = new Date().toISOString().replace('T', ' ').slice(0, 16)
      chargeRec.set('status', 'pago')
      chargeRec.set('method', payMethod)
      chargeRec.set('paidAt', paidAt)
      internalStatus = 'pago'
    }
    app.save(chargeRec)
  } catch (saveErr) {
    console.log(
      '[PagBankOrders] cobranca ' +
        chargeId +
        ': falha ao sincronizar status interno (' +
        saveErr +
        ')',
    )
  }

  return e.json(200, {
    ok: true,
    orderId: extOrderId,
    externalStatus: extStatus,
    statusLabel: statusLabel,
    paid: isPaid,
    internalStatus: internalStatus,
  })
})
