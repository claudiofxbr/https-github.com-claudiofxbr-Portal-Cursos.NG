/// <reference path="../pb_data/types.d.ts" />

/**
 * Autenticação em Duas Camadas do PortalCursos.NG (SPEC-INIT-001)
 *
 * 1. Access Token: JWT de curta duração do PocketBase mantido SOMENTE em memória no frontend.
 * 2. Refresh Token: token criptográfico opaco salvo na collection auth_sessions com hash SHA-256
 *    e enviado via Cookie HttpOnly, Secure, SameSite=None com caminho /.
 * 3. Rotas:
 *    - POST /backend/v1/auth/login: registra a sessão de um login JÁ VALIDADO pelo PocketBase
 *      nativo (POST /api/collections/users/auth-with-password) e devolve token + cookie.
 *    - POST /backend/v1/auth/refresh: valida cookie/body, rotaciona refresh token, gera novo Access Token.
 *    - POST /backend/v1/auth/logout: revoga a sessão no banco e expira o cookie.
 *
 * DECISÃO v0.0.95: o hook de login NÃO valida mais a senha. Por quatro bugs seguidos a
 * revalidação da senha dentro do JSVM divergia do login nativo (native 200, hook
 * "validatePassword:rejeitada"). Agora a senha é validada SOMENTE pelo mecanismo nativo
 * (auth-with-password, já comprovado em produção). O hook recebe o token nativo no
 * cabeçalho Authorization e o confere in-process com $app.findAuthRecordByToken — sem
 * senha, sem HTTP interno, sem hash.
 *
 * Histórico (resumo): v0.0.88 newAuthToken (createAuthToken não existe no JSVM);
 * v0.0.90 `const app = $app` (o global `app` não existe no Skip Cloud); v0.0.92 $http.send
 * com URL relativa falhava sempre (unsupported protocol scheme).
 *
 * NOTA JSVM: toda a lógica fica INLINE nos callbacks (pool de VMs separado).
 *
 * v0.0.97 AUDITORIA: cada evento de sessão grava um registro em auth_audit
 * (eventType, userId, email, reason, ip, userAgent). A gravação é embrulhada em
 * try/catch silencioso — falha de auditoria NUNCA interrompe o fluxo de login.
 * Nada sensível é persistido: sem senha, sem token, sem hash de token.
 */

routerAdd('POST', '/backend/v1/auth/login', (e) => {
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const headers = reqInfo.headers || {}

  // v0.0.90: no JSVM do Skip Cloud o global correto é $app.
  const app = $app

  // Token nativo emitido por auth-with-password, enviado no cabeçalho Authorization
  // (aceita com ou sem o prefixo "Bearer ").
  const rawAuth = String(headers['authorization'] || headers['Authorization'] || '').trim()
  const nativeToken = rawAuth.replace(/^Bearer\s+/i, '').trim()
  const email = String(body.email || '')
    .trim()
    .toLowerCase()

  const auditIp = String(headers['x-forwarded-for'] || headers['x-real-ip'] || '').slice(0, 50)
  const auditUa = String(headers['user-agent'] || headers['User-Agent'] || '').slice(0, 250)

  if (!nativeToken) {
    console.log('[AuthLogin] login recusado: cabeçalho Authorization ausente')
    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'login_failed')
      auditRec.set('email', email)
      auditRec.set('reason', 'token nativo ausente (login sem validação prévia)')
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  let userRecord
  try {
    // Verificação in-process do token nativo (assinatura e expiração conferidas pelo PocketBase).
    userRecord = app.findAuthRecordByToken(nativeToken, 'auth')
  } catch (tokenErr) {
    console.log('[AuthLogin] login recusado: token nativo não reconhecido. erro=' + tokenErr)
    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'login_failed')
      auditRec.set('email', email)
      auditRec.set('reason', 'senha inválida ou usuário inexistente (token nativo não conferido)')
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  if (!userRecord || userRecord.collection().name !== 'users') {
    console.log('[AuthLogin] login recusado: token não pertence à coleção users')
    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'login_failed')
      auditRec.set('email', email)
      auditRec.set('reason', 'usuário não encontrado (token de coleção desconhecida)')
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  if (email && userRecord.email().toLowerCase() !== email) {
    console.log('[AuthLogin] login recusado: e-mail do corpo não confere com o token nativo')
    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'login_failed')
      auditRec.set('email', email)
      auditRec.set('reason', 'e-mail informado não confere com o da sessão validada')
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  console.log("[AuthLogin] token nativo conferido: e-mail='" + userRecord.email() + "'")

  const userStatus = userRecord.getString('status')
  if (userStatus === 'bloqueado' || userStatus === 'inativo') {
    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'blocked_attempt')
      auditRec.set('userId', userRecord.id)
      auditRec.set('email', userRecord.email())
      auditRec.set('reason', 'status da conta: ' + userStatus)
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
    return e.json(403, { error: 'Usuário inativo ou bloqueado institucionalmente.' })
  }

  // Gera Refresh Token criptograficamente seguro (64 caracteres aleatórios)
  const refreshToken = $security.randomString(64)
  const refreshTokenHash = $security.sha256(refreshToken)

  // Expiração do refresh token: 7 dias (604800 segundos)
  const now = new Date()
  const expiresAtDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const expiresAtIso = expiresAtDate.toISOString()

  // Salva a sessão na collection auth_sessions
  try {
    const sessionsCol = app.findCollectionByNameOrId('auth_sessions')
    const sessionRec = new Record(sessionsCol)
    sessionRec.set('userId', userRecord.id)
    sessionRec.set('userEmail', userRecord.email())
    sessionRec.set('userRole', userRecord.getString('role') || 'aluno')
    sessionRec.set('refreshTokenHash', refreshTokenHash)
    sessionRec.set('expiresAt', expiresAtIso)
    sessionRec.set('revoked', false)

    sessionRec.set(
      'userAgent',
      String(headers['user-agent'] || headers['User-Agent'] || '').slice(0, 250),
    )
    sessionRec.set(
      'ipAddress',
      String(headers['x-forwarded-for'] || headers['x-real-ip'] || '').slice(0, 50),
    )

    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'login_success')
      auditRec.set('userId', userRecord.id)
      auditRec.set('email', userRecord.email())
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}

    app.save(sessionRec)
  } catch (saveErr) {
    console.log('[AuthLogin] Falha ao salvar auth_session:', saveErr)
    return e.json(500, { error: 'Falha ao persistir sessão.' })
  }

  // Cookie: pc_refresh_token=<token>; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=None
  const cookieVal =
    'pc_refresh_token=' +
    encodeURIComponent(refreshToken) +
    '; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=None'

  e.response.header().set('Set-Cookie', cookieVal)

  return e.json(200, {
    token: nativeToken,
    refreshToken: refreshToken,
    record: {
      id: userRecord.id,
      email: userRecord.email(),
      name: userRecord.getString('name'),
      role: userRecord.getString('role'),
      roleTitle: userRecord.getString('roleTitle'),
      department: userRecord.getString('department'),
      status: userRecord.getString('status'),
      cpf: userRecord.getString('cpf'),
      phone: userRecord.getString('phone'),
      avatar: userRecord.getString('avatar'),
      avatarUrl: userRecord.getString('avatarUrl'),
      studentId: userRecord.getString('studentId'),
      created: userRecord.getString('created'),
      updated: userRecord.getString('updated'),
    },
  })
})

routerAdd('POST', '/backend/v1/auth/refresh', (e) => {
  // v0.0.90: mesmo padrão do login — $app é o global correto no JSVM do Skip Cloud
  const app = $app

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const headers = reqInfo.headers || {}

  // Extrai o refresh token do cookie OU do corpo (para flexibilidade cross-domain)
  let rawCookie = String(headers['cookie'] || headers['Cookie'] || '')
  let tokenFromCookie = ''
  if (rawCookie) {
    const parts = rawCookie.split(';')
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].trim()
      if (p.indexOf('pc_refresh_token=') === 0) {
        tokenFromCookie = decodeURIComponent(p.substring('pc_refresh_token='.length))
        break
      }
    }
  }

  const tokenFromBody = String(body.refreshToken || '').trim()
  const refreshToken = tokenFromCookie || tokenFromBody

  if (!refreshToken) {
    return e.json(401, { error: 'Sessão expirada ou não fornecida. Faça login.' })
  }

  // v0.0.97: dados de auditoria coletados uma única vez neste callback
  const auditIp = String(headers['x-forwarded-for'] || headers['x-real-ip'] || '').slice(0, 50)
  const auditUa = String(headers['user-agent'] || headers['User-Agent'] || '').slice(0, 250)

  const tokenHash = $security.sha256(refreshToken)

  let sessionRecord
  try {
    const list = app.findRecordsByFilter(
      'auth_sessions',
      'refreshTokenHash = {:hash} && revoked = false',
      '-created',
      1,
      0,
      { hash: tokenHash },
    )
    if (list && list.length > 0) {
      sessionRecord = list[0]
    }
  } catch (err) {
    console.log('[AuthRefresh] Erro ao consultar auth_sessions:', err)
  }

  if (!sessionRecord) {
    // Cookie inválido ou revogado -> limpa o cookie
    e.response
      .header()
      .set('Set-Cookie', 'pc_refresh_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None')
    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'refresh')
      auditRec.set('reason', 'refresh token inválido, revogado ou inexistente')
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }

  // Verifica expiração
  const expiresAtStr = sessionRecord.getString('expiresAt')
  const expiresAtTime = new Date(expiresAtStr).getTime()
  if (expiresAtTime <= Date.now()) {
    sessionRecord.set('revoked', true)
    try {
      app.save(sessionRecord)
    } catch (_) {}
    e.response
      .header()
      .set('Set-Cookie', 'pc_refresh_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None')
    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'refresh')
      auditRec.set('userId', sessionRecord.getString('userId'))
      auditRec.set('email', sessionRecord.getString('userEmail'))
      auditRec.set('reason', 'refresh token expirado')
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
    return e.json(401, { error: 'Sessão expirada. Faça login novamente.' })
  }

  // Carrega o usuário da sessão
  const userId = sessionRecord.getString('userId')
  let userRecord
  try {
    userRecord = app.findRecordById('users', userId)
  } catch (userErr) {
    console.log(
      "[AuthRefresh] usuário não encontrado: coleção='users' via findRecordById id=" +
        userId +
        ' erro=' +
        userErr,
    )
    sessionRecord.set('revoked', true)
    try {
      app.save(sessionRecord)
    } catch (_) {}
    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'refresh')
      auditRec.set('userId', userId)
      auditRec.set('email', sessionRecord.getString('userEmail'))
      auditRec.set('reason', 'usuário da sessão não encontrado')
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
    return e.json(401, { error: 'Usuário não encontrado.' })
  }

  const userStatus = userRecord.getString('status')
  if (userStatus === 'bloqueado' || userStatus === 'inativo') {
    sessionRecord.set('revoked', true)
    try {
      app.save(sessionRecord)
    } catch (_) {}
    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'blocked_attempt')
      auditRec.set('userId', userId)
      auditRec.set('email', sessionRecord.getString('userEmail'))
      auditRec.set('reason', 'refresh com conta ' + userStatus)
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
    return e.json(403, { error: 'Usuário bloqueado ou inativo.' })
  }

  // Rotação do refresh token (novo token e hash)
  const newRefreshToken = $security.randomString(64)
  const newHash = $security.sha256(newRefreshToken)

  // Renova expiração para mais 7 dias a partir de agora
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  sessionRecord.set('refreshTokenHash', newHash)
  sessionRecord.set('expiresAt', newExpiresAt)
  try {
    app.save(sessionRecord)
  } catch (err) {
    console.log('[AuthRefresh] Erro ao rotacionar refresh token:', err)
    return e.json(500, { error: 'Falha ao rotacionar sessão.' })
  }

  try {
    const auditCol = $app.findCollectionByNameOrId('auth_audit')
    const auditRec = new Record(auditCol)
    auditRec.set('eventType', 'refresh')
    auditRec.set('userId', userRecord.id)
    auditRec.set('email', userRecord.email())
    auditRec.set('ip', auditIp)
    auditRec.set('userAgent', auditUa)
    $app.save(auditRec)
  } catch (_) {}

  // Gera novo Access Token (newAuthToken é o método exposto pelo JSVM)
  let accessToken = ''
  try {
    accessToken = userRecord.newAuthToken()
  } catch (err2) {
    console.log('[AuthRefresh] Erro ao gerar auth token:', err2)
    return e.json(500, { error: 'Falha ao renovar token de acesso.' })
  }

  // Atualiza cookie
  const cookieVal =
    'pc_refresh_token=' +
    encodeURIComponent(newRefreshToken) +
    '; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=None'
  e.response.header().set('Set-Cookie', cookieVal)

  return e.json(200, {
    token: accessToken,
    refreshToken: newRefreshToken,
    record: {
      id: userRecord.id,
      email: userRecord.email(),
      name: userRecord.getString('name'),
      role: userRecord.getString('role'),
      roleTitle: userRecord.getString('roleTitle'),
      department: userRecord.getString('department'),
      status: userRecord.getString('status'),
      cpf: userRecord.getString('cpf'),
      phone: userRecord.getString('phone'),
      avatar: userRecord.getString('avatar'),
      avatarUrl: userRecord.getString('avatarUrl'),
      studentId: userRecord.getString('studentId'),
      created: userRecord.getString('created'),
      updated: userRecord.getString('updated'),
    },
  })
})

routerAdd('POST', '/backend/v1/auth/logout', (e) => {
  // v0.0.90: mesmo padrão do login — $app é o global correto no JSVM do Skip Cloud
  const app = $app

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const headers = reqInfo.headers || {}

  let rawCookie = String(headers['cookie'] || headers['Cookie'] || '')
  let tokenFromCookie = ''
  if (rawCookie) {
    const parts = rawCookie.split(';')
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].trim()
      if (p.indexOf('pc_refresh_token=') === 0) {
        tokenFromCookie = decodeURIComponent(p.substring('pc_refresh_token='.length))
        break
      }
    }
  }

  const tokenFromBody = String(body.refreshToken || '').trim()
  const refreshToken = tokenFromCookie || tokenFromBody

  // v0.0.97: coleta os dados de auditoria antes de qualquer retorno
  const auditIp = String(headers['x-forwarded-for'] || headers['x-real-ip'] || '').slice(0, 50)
  const auditUa = String(headers['user-agent'] || headers['User-Agent'] || '').slice(0, 250)

  if (refreshToken) {
    const tokenHash = $security.sha256(refreshToken)
    try {
      const list = app.findRecordsByFilter(
        'auth_sessions',
        'refreshTokenHash = {:hash}',
        '-created',
        1,
        0,
        { hash: tokenHash },
      )
      if (list && list.length > 0) {
        const sessionRec = list[0]
        sessionRec.set('revoked', true)
        app.save(sessionRec)
        try {
          const auditCol = $app.findCollectionByNameOrId('auth_audit')
          const auditRec = new Record(auditCol)
          auditRec.set('eventType', 'logout')
          auditRec.set('userId', sessionRec.getString('userId'))
          auditRec.set('email', sessionRec.getString('userEmail'))
          auditRec.set('ip', auditIp)
          auditRec.set('userAgent', auditUa)
          $app.save(auditRec)
        } catch (_) {}
      }
    } catch (err) {
      console.log('[AuthLogout] Erro ao revogar sessão:', err)
    }
  }

  // Expira cookie no navegador
  e.response
    .header()
    .set('Set-Cookie', 'pc_refresh_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None')

  return e.json(200, { success: true })
})

// v0.0.97 — Leitura de auditoria: GET /backend/v1/auth/audit — somente root/admin.
// Query params: page (>=1), perPage (<=100), eventType, email, days (1|7|30).
// Devolve { items, totalItems, page, perPage }. A collection auth_audit é
// superuser-only; a leitura pelos admins passa exclusivamente por esta rota.
routerAdd('GET', '/backend/v1/auth/audit', (e) => {
  const app = $app

  const reqInfo = e.requestInfo()
  const headers = reqInfo.headers || {}
  const q = reqInfo.query || {}

  // --- autenticação: token nativo (mesmo mecanismo do login/refresh) ---
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

  // --- autorização: apenas perfis root e admin ---
  const viewerRole = String(viewer.getString('role') || '').toLowerCase()
  if (viewerRole !== 'root' && viewerRole !== 'admin') {
    return e.json(403, { error: 'Acesso restrito aos perfis root e admin.' })
  }

  // --- filtros ---
  let page = parseInt(String(q.page || '1'), 10)
  if (isNaN(page) || page < 1) page = 1
  let perPage = parseInt(String(q.perPage || '25'), 10)
  if (isNaN(perPage) || perPage < 1) perPage = 25
  if (perPage > 100) perPage = 100

  const eventType = String(q.eventType || '').trim()
  const VALID_EVENTS = {
    login_success: true,
    login_failed: true,
    refresh: true,
    logout: true,
    blocked_attempt: true,
  }

  const filters = []
  const bind = {}

  if (eventType && VALID_EVENTS[eventType]) {
    filters.push('eventType = {:eventType}')
    bind.eventType = eventType
  }

  const emailQuery = String(q.email || '').trim()
  if (emailQuery) {
    filters.push('email ~ {:email}')
    bind.email = emailQuery
  }

  const days = parseInt(String(q.days || '30'), 10)
  const daysValid = days === 1 || days === 7 || days === 30 || days === 90 || days === 365
  if (daysValid && days > 0) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ')
    filters.push('created >= {:since}')
    bind.since = since
  }

  const filterExpr = filters.length > 0 ? filters.join(' && ') : ''

  try {
    const items = app.findRecordsByFilter(
      'auth_audit',
      filterExpr,
      '-created',
      perPage,
      (page - 1) * perPage,
      bind,
    )
    const total = app.countRecordsByFilter('auth_audit', filterExpr, bind)

    const mapped = []
    for (let i = 0; i < items.length; i++) {
      const r = items[i]
      mapped.push({
        id: r.id,
        eventType: r.getString('eventType'),
        userId: r.getString('userId'),
        email: r.getString('email'),
        reason: r.getString('reason'),
        ip: r.getString('ip'),
        userAgent: r.getString('userAgent'),
        created: r.getString('created'),
      })
    }

    return e.json(200, {
      items: mapped,
      totalItems: total,
      page: page,
      perPage: perPage,
    })
  } catch (queryErr) {
    console.log('[AuthAudit] Erro ao consultar auth_audit:', queryErr)
    return e.json(500, { error: 'Falha ao consultar eventos de auditoria.' })
  }
})

// v0.0.97 — Resumo da auditoria: GET /backend/v1/auth/audit/summary — root/admin.
// Devolve { loginsOk24h, falhas24h, sessoesAtivas }. Sessões ativas = registros
// de auth_sessions não revogados e não expirados.
routerAdd('GET', '/backend/v1/auth/audit/summary', (e) => {
  const app = $app

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

  const viewerRole = String(viewer.getString('role') || '').toLowerCase()
  if (viewerRole !== 'root' && viewerRole !== 'admin') {
    return e.json(403, { error: 'Acesso restrito aos perfis root e admin.' })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace('T', ' ')
  const now = new Date().toISOString().replace('T', ' ')

  try {
    const loginsOk24h = app.countRecordsByFilter(
      'auth_audit',
      "eventType = 'login_success' && created >= {:since}",
      { since: since },
    )
    const falhas24h = app.countRecordsByFilter(
      'auth_audit',
      "(eventType = 'login_failed' || eventType = 'blocked_attempt') && created >= {:since}",
      { since: since },
    )
    const sessoesAtivas = app.countRecordsByFilter(
      'auth_sessions',
      'revoked = false && expiresAt > {:now}',
      { now: now },
    )

    return e.json(200, {
      loginsOk24h: loginsOk24h,
      falhas24h: falhas24h,
      sessoesAtivas: sessoesAtivas,
    })
  } catch (sumErr) {
    console.log('[AuthAudit] Erro ao calcular resumo:', sumErr)
    return e.json(500, { error: 'Falha ao calcular resumo da auditoria.' })
  }
})
