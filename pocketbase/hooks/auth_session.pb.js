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

  if (!nativeToken) {
    console.log('[AuthLogin] login recusado: cabeçalho Authorization ausente')
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  let userRecord
  try {
    // Verificação in-process do token nativo (assinatura e expiração conferidas pelo PocketBase).
    userRecord = app.findAuthRecordByToken(nativeToken, 'auth')
  } catch (tokenErr) {
    console.log('[AuthLogin] login recusado: token nativo não reconhecido. erro=' + tokenErr)
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  if (!userRecord || userRecord.collection().name !== 'users') {
    console.log('[AuthLogin] login recusado: token não pertence à coleção users')
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  if (email && userRecord.email().toLowerCase() !== email) {
    console.log('[AuthLogin] login recusado: e-mail do corpo não confere com o token nativo')
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  console.log("[AuthLogin] token nativo conferido: e-mail='" + userRecord.email() + "'")

  const userStatus = userRecord.getString('status')
  if (userStatus === 'bloqueado' || userStatus === 'inativo') {
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
    return e.json(401, { error: 'Usuário não encontrado.' })
  }

  const userStatus = userRecord.getString('status')
  if (userStatus === 'bloqueado' || userStatus === 'inativo') {
    sessionRecord.set('revoked', true)
    try {
      app.save(sessionRecord)
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
