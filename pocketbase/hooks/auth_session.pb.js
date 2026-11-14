/// <reference path="../pb_data/types.d.ts" />

/**
 * Autenticação em Duas Camadas do PortalCursos.NG (SPEC-INIT-001)
 *
 * 1. Access Token: JWT de curta duração do PocketBase mantido SOMENTE em memória no frontend.
 * 2. Refresh Token: token criptográfico opaco salvo na collection auth_sessions com hash SHA-256
 *    e enviado via Cookie HttpOnly, Secure, SameSite=None/Lax com caminho /.
 *    Também aceito/enviado no corpo da requisição/resposta para clientes que não suportem cookies.
 * 3. Rotas:
 *    - POST /backend/v1/auth/login: valida email/senha contra collection users, cria sessão e retorna token + cookie
 *    - POST /backend/v1/auth/refresh: valida cookie/body, rotaciona refresh token, gera novo Access Token PocketBase
 *    - POST /backend/v1/auth/logout: revoga a sessão no banco e expira o cookie
 *
 * BUG CORRIGIDO (v0.0.88): o JSVM do PocketBase (goja) NÃO possui Record.createAuthToken —
 * o método correto é Record.newAuthToken() (sem duração customizável; usa a duração do
 * authToken da collection, padrão 14 dias). Antes, toda chamada de login lançava
 * TypeError e devolvia 500 "Falha ao emitir token de acesso", que o frontend exibia
 * como "Credenciais inválidas".
 *
 * BUG CORRIGIDO (v0.0.90): o JSVM do Skip Cloud NÃO expõe o global `app` — o objeto
 * correto é `$app` (padrão usado pelos demais hooks deste projeto, ex.:
 * agent_cycle_oneoff.pb.js e library_overdue.pb.js). Antes, `app.findAuthRecordByEmail`
 * lançava ReferenceError capturado pelo catch(_) do lookup, que logava
 * "[AuthLogin] usuário não encontrado" para QUALQUER e-mail, mesmo com o registro
 * existindo e a senha válida (prova: /api/collections/users/auth-with-password → 200).
 *
 * BUG CORRIGIDO (v0.0.91): "senha inválida" com hash válido no banco. Evidência
 * de produção (2026-11-14): POST /backend/v1/auth/login → 401 "[AuthLogin] senha
 * inválida" para claudio.xavier@gmail.com às 07:21:18 e 07:37:02, e NO MESMO
 * período o login nativo POST /api/collections/users/auth-with-password → 200
 * (07:09:21 e 07:20:43), com carga completa de dados em seguida. O hash é
 * válido — a divergência era a validação dentro do hook. Correção: o handler
 * DELEGA a verificação de credenciais ao mecanismo NATIVO do PocketBase (o
 * mesmo runtime de /api/collections/users/auth-with-password), via $http.send
 * POST interno /api/collections/users/auth-with-password com as credenciais
 * recebidas na requisição. Nada de comparação manual de hash no JSVM: 200
 * nativo ⇒ senha correta; 400 ⇒ senha inválida. O log granular registra etapa
 * a etapa (usuário encontrado ou não, resultado da validação nativa) sem
 * vazar senha ou hash. Requer o settings "passwordAuth.enabled" da collection
 * users (ativo por padrão e já provado pelos 200 nativos de produção).
 */

routerAdd('POST', '/backend/v1/auth/login', (e) => {
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const password = String(body.password || '')

  // v0.0.90: no JSVM do Skip Cloud o global correto é $app (a variável `app`
  // sozinha não existe e lançava ReferenceError, mascarado pelo catch abaixo).
  const app = $app

  if (!email || !password) {
    return e.json(400, { error: 'E-mail e senha são obrigatórios.' })
  }

  let userRecord
  try {
    userRecord = app.findAuthRecordByEmail('users', email)
  } catch (lookupErr) {
    // Diagnóstico detalhado: nomeia a coleção/campo consultado e o tipo de erro
    // (ReferenceError de runtime x "no rows" de registro inexistente).
    console.log(
      "[AuthLogin] lookup falhou: coleção='users' campo='email' valor='" +
        email +
        "' método='findAuthRecordByEmail' erro=" +
        lookupErr,
    )
    // Fallback de robustez: mesmo filtro, via findRecordsByFilter (evita falso
    // negativo caso findAuthRecordByEmail não esteja disponível neste runtime).
    try {
      const matches = app.findRecordsByFilter('users', 'email = {:email}', '', 1, 0, {
        email: email,
      })
      if (matches && matches.length > 0) {
        userRecord = matches[0]
        console.log(
          "[AuthLogin] lookup recuperado via filtro 'email = {:email}' na coleção 'users'",
        )
      }
    } catch (filterErr) {
      console.log(
        "[AuthLogin] lookup fallback falhou: coleção='users' filtro='email = {:email}' erro=" +
          filterErr,
      )
    }
  }

  if (!userRecord) {
    console.log(
      "[AuthLogin] usuário não encontrado: coleção='users' campo='email' valor='" +
        email +
        "' (nenhum registro correspondeu; conferir coleção, visibilidade e formato do e-mail)",
    )
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  // ---- v0.0.91: validação de senha DELEGADA ao mecanismo nativo ----
  //
  // O hash no banco é válido (prova: /api/collections/users/auth-with-password
  // → 200 no mesmo período em que este hook devolvia 401 "senha inválida").
  // Para eliminar qualquer divergência entre hook e runtime, o handler pergunta
  // ao MECANISMO NATIVO (o mesmo de /api/collections/users/auth-with-password),
  // via chamada interna $http.send ao próprio servidor (loopback):
  //   200 nativo ⇒ senha correta;  400 nativo ⇒ senha inválida.
  // Nunca comparar hash manualmente nem re-hash. Sem vazar senha ou hash nos
  // logs — apenas o e-mail (dado já registrado em auth_sessions) e o resultado.
  // IMPORTANTE: a lógica fica INLINE no callback — o JSVM executa callbacks
  // num pool de VMs separado, onde declarações top-level do arquivo não são
  // visíveis (QA v0.0.91: "Hook scoping error").
  let passwordOk = false
  let validation = ''
  try {
    // Delegação: o runtime nativo é a ÚNICA fonte de verdade sobre a senha
    // (mesmo bcrypt, mesmas regras). 200 ⇒ correta; 400 ⇒ inválida; outro
    // status ⇒ não dá para afirmar, e o login é recusado sem acusar senha.
    const baseUrl = String($app.settings().meta.appUrl || '').replace(/\/$/, '')
    const native = $http.send({
      url: baseUrl + '/api/collections/users/auth-with-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password: password }),
      timeout: 15,
    })
    validation = 'nativo:' + native.statusCode
    if (native.statusCode === 200) {
      passwordOk = true
    } else if (native.statusCode === 400) {
      passwordOk = false
      console.log(
        "[AuthLogin] senha inválida (validação nativa rejeitou): coleção='users' e-mail='" +
          email +
          "' resultado=" +
          validation,
      )
    } else {
      // Estado inesperado do mecanismo nativo (405, 5xx etc.): não há como
      // confirmar a senha com segurança — NÃO loga como "senha inválida".
      console.log(
        "[AuthLogin] validação nativa respondeu estado inesperado: e-mail='" +
          email +
          "' resultado=" +
          validation,
      )
      return e.json(503, {
        error: 'Serviço de autenticação temporariamente indisponível. Tente novamente.',
      })
    }
  } catch (pwErr) {
    // Falha de rede/loopback na delegação: não há como afirmar "senha inválida".
    console.log(
      "[AuthLogin] validação nativa não pôde correr: e-mail='" + email + "' erro=" + pwErr,
    )
    return e.json(503, {
      error: 'Serviço de autenticação temporariamente indisponível. Tente novamente.',
    })
  }

  console.log(
    "[AuthLogin] resultado da validação de senha: e-mail='" +
      email +
      "' método='" +
      validation +
      "' passwordOk=" +
      passwordOk,
  )

  if (!passwordOk) {
    console.log(
      "[AuthLogin] login recusado: e-mail='" +
        email +
        "' motivo='" +
        (validation || 'validação nativa indisponível') +
        "'",
    )
    return e.json(401, { error: 'Credenciais inválidas.' })
  }

  const userStatus = userRecord.getString('status')
  if (userStatus === 'bloqueado' || userStatus === 'inativo') {
    return e.json(403, { error: 'Usuário inativo ou bloqueado institucionalmente.' })
  }

  // Gera o Access Token do PocketBase (assinado pelo PocketBase para o registro).
  // CORREÇÃO: o JSVM (goja) só expõe Record.newAuthToken() — createAuthToken não existe
  // e lançava TypeError em TODA tentativa de login, mesmo com senha correta.
  // A duração é a do authToken da collection users (14 dias no Skip Cloud); o
  // frontend renova o token silenciosamente via /backend/v1/auth/refresh.
  let accessToken = ''
  try {
    accessToken = userRecord.newAuthToken()
  } catch (err) {
    console.log('[AuthLogin] Erro ao gerar auth token:', err)
    return e.json(500, { error: 'Falha ao emitir token de acesso.' })
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

    const headers = reqInfo.headers || {}
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

  // Define cookie HttpOnly para o refresh token
  // Cookie: pc_refresh_token=<token>; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=None
  const cookieVal =
    'pc_refresh_token=' +
    encodeURIComponent(refreshToken) +
    '; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=None'

  e.response.header().set('Set-Cookie', cookieVal)

  return e.json(200, {
    token: accessToken,
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

  // Gera novo Access Token (mesma correção do login: newAuthToken é o método exposto pelo JSVM)
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
