/// <reference path="../pb_data/types.d.ts" />

/**
 * Gestão de Senhas e Sessões do PortalCursos.NG (v0.0.105)
 *
 * Rotas (padrão /backend/v1/ das demais rotas de sessão):
 *  - POST /backend/v1/users/password  : altera senha (própria ou reset administrativo)
 *  - GET  /backend/v1/users/sessions  : lista sessões ativas (auth_sessions não revogadas)
 *  - POST /backend/v1/users/sessions/revoke : revoga TODAS as sessões ativas do usuário
 *    (força novo login — é o "remover" no contexto de senha)
 *
 * PERMISSÕES (validadas AQUI no backend; o frontend só esconde o botão):
 *  - root        : qualquer usuário (inclusive outros root)
 *  - admin       : qualquer usuário EXCETO contas root
 *  - qualquer perfil autenticado : a PRÓPRIA senha (exigindo a senha atual correta)
 *  - demais perfis em rota administrativa : 403 "Acesso negado."
 *
 * REGRAS JSVM (validadas neste projeto):
 *  - o global `app` NÃO existe: usar `const app = $app` dentro de cada callback;
 *  - callbacks de routerAdd rodam num pool de VMs separado: TODA a lógica é INLINE;
 *  - mudança de senha usa record.setPassword() (record.set('password',...) não gera hash);
 *  - countRecordsByFilter NÃO existe: findRecordsByFilter + contagem em memória;
 *  - senha atual conferida com record.validatePassword();
 *  - auditoria em auth_audit com try/catch silencioso (falha de log nunca bloqueia a troca);
 *  - nenhuma resposta jamais ecoa a senha.
 */

// ---------------------------------------------------------------------------
// POST /backend/v1/users/password
// Body: { targetUserId, currentPassword?, newPassword, confirmPassword }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/users/password', (e) => {
  const app = $app

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const headers = reqInfo.headers || {}

  const auditIp = String(headers['x-forwarded-for'] || headers['x-real-ip'] || '').slice(0, 50)
  const auditUa = String(headers['user-agent'] || headers['User-Agent'] || '').slice(0, 250)

  // --- autenticação: token nativo (mesmo mecanismo de login/refresh/audit) ---
  const authHeader = String(headers['authorization'] || headers['Authorization'] || '')
  const nativeToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!nativeToken) {
    return e.json(401, { error: 'Não autenticado.' })
  }

  let caller
  try {
    caller = app.findAuthRecordByToken(nativeToken, 'auth')
  } catch (_) {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }
  if (!caller || caller.collection().name !== 'users') {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }

  // --- entrada obrigatória ---
  const targetUserId = String(body.targetUserId || '').trim()
  const currentPassword = String(body.currentPassword || '')
  const newPassword = String(body.newPassword || '')
  const confirmPassword = String(body.confirmPassword || '')

  if (!targetUserId) {
    return e.json(400, { error: 'Usuário alvo não informado.' })
  }
  if (!newPassword) {
    return e.json(400, { error: 'A nova senha é obrigatória.' })
  }
  if (!confirmPassword) {
    return e.json(400, { error: 'A confirmação da nova senha é obrigatória.' })
  }

  // --- complexidade mínima (espelhada no cliente) ---
  if (newPassword.length < 8) {
    return e.json(400, { error: 'A senha deve ter pelo menos 8 caracteres.' })
  }
  if (!/[A-Z]/.test(newPassword)) {
    return e.json(400, { error: 'A senha deve conter ao menos 1 letra maiúscula.' })
  }
  if (!/[a-z]/.test(newPassword)) {
    return e.json(400, { error: 'A senha deve conter ao menos 1 letra minúscula.' })
  }
  if (!/[0-9]/.test(newPassword)) {
    return e.json(400, { error: 'A senha deve conter ao menos 1 número.' })
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    return e.json(400, { error: 'A senha deve conter ao menos 1 símbolo.' })
  }
  if (newPassword !== confirmPassword) {
    return e.json(400, { error: 'As senhas não coincidem.' })
  }

  // --- alvo ---
  let target
  try {
    target = app.findRecordById('users', targetUserId)
  } catch (_) {
    return e.json(404, { error: 'Usuário alvo não encontrado.' })
  }

  const callerRole = String(caller.getString('role') || '').toLowerCase()
  const targetRole = String(target.getString('role') || '').toLowerCase()
  const isSelf = caller.id === target.id

  // --- autorização ---
  if (!isSelf) {
    if (callerRole !== 'root' && callerRole !== 'admin') {
      return e.json(403, { error: 'Acesso negado.' })
    }
    if (targetRole === 'root' && callerRole !== 'root') {
      return e.json(403, { error: 'Somente o perfil Root pode alterar a senha de outro Root.' })
    }
  }

  // --- própria senha exige a senha atual correta ---
  if (isSelf) {
    if (!currentPassword) {
      return e.json(400, { error: 'A senha atual é obrigatória para alterar a própria senha.' })
    }
    let passwordOk = false
    try {
      passwordOk = target.validatePassword(currentPassword)
    } catch (_) {
      passwordOk = false
    }
    if (!passwordOk) {
      try {
        const auditCol = $app.findCollectionByNameOrId('auth_audit')
        const auditRec = new Record(auditCol)
        auditRec.set('eventType', 'password_changed')
        auditRec.set('userId', target.id)
        auditRec.set('email', target.email())
        auditRec.set('reason', 'tentativa com senha atual inválida')
        auditRec.set('ip', auditIp)
        auditRec.set('userAgent', auditUa)
        $app.save(auditRec)
      } catch (_) {}
      return e.json(400, { error: 'Credenciais inválidas.' })
    }
  }

  // --- aplica a nova senha ---
  try {
    target.setPassword(newPassword)
    app.save(target)
  } catch (saveErr) {
    console.log('[UsersPassword] falha ao salvar nova senha: ' + saveErr)
    return e.json(500, { error: 'Falha ao gravar a nova senha. Tente novamente.' })
  }

  // --- auditoria (silenciosa: nunca bloqueia a troca) ---
  try {
    const auditCol = $app.findCollectionByNameOrId('auth_audit')
    const auditRec = new Record(auditCol)
    if (isSelf) {
      auditRec.set('eventType', 'password_changed')
      auditRec.set('reason', 'alteração da própria senha (senha atual validada)')
    } else {
      auditRec.set('eventType', 'password_reset_by_admin')
      auditRec.set(
        'reason',
        'reset administrativo por ' +
          caller.email() +
          ' (perfil ' +
          callerRole +
          ') para o perfil ' +
          targetRole,
      )
    }
    auditRec.set('userId', target.id)
    auditRec.set('email', target.email())
    auditRec.set('ip', auditIp)
    auditRec.set('userAgent', auditUa)
    $app.save(auditRec)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: isSelf
      ? 'Sua senha foi alterada com sucesso.'
      : 'Senha de ' + (target.getString('name') || target.email()) + ' alterada com sucesso.',
  })
})

// ---------------------------------------------------------------------------
// GET /backend/v1/users/sessions?userId=...
// Lista sessões ativas (não revogadas) do usuário alvo.
// Permissões: a própria; root: qualquer; admin: exceto root.
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/users/sessions', (e) => {
  const app = $app

  const reqInfo = e.requestInfo()
  const headers = reqInfo.headers || {}
  const q = reqInfo.query || {}

  const authHeader = String(headers['authorization'] || headers['Authorization'] || '')
  const nativeToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!nativeToken) {
    return e.json(401, { error: 'Não autenticado.' })
  }

  let caller
  try {
    caller = app.findAuthRecordByToken(nativeToken, 'auth')
  } catch (_) {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }
  if (!caller || caller.collection().name !== 'users') {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }

  const targetUserId = String(q.userId || '').trim()
  if (!targetUserId) {
    return e.json(400, { error: 'Usuário alvo não informado.' })
  }

  let target
  try {
    target = app.findRecordById('users', targetUserId)
  } catch (_) {
    return e.json(404, { error: 'Usuário alvo não encontrado.' })
  }

  const callerRole = String(caller.getString('role') || '').toLowerCase()
  const targetRole = String(target.getString('role') || '').toLowerCase()
  const isSelf = caller.id === target.id

  if (!isSelf) {
    if (callerRole !== 'root' && callerRole !== 'admin') {
      return e.json(403, { error: 'Acesso negado.' })
    }
    if (targetRole === 'root' && callerRole !== 'root') {
      return e.json(403, { error: 'Somente o perfil Root pode consultar sessões de outro Root.' })
    }
  }

  let sessions = []
  try {
    const list = app.findRecordsByFilter(
      'auth_sessions',
      'userId = {:uid} && revoked = false',
      '-created',
      50,
      0,
      { uid: targetUserId },
    )
    for (let i = 0; i < (list ? list.length : 0); i++) {
      const s = list[i]
      sessions.push({
        id: s.id,
        created: s.getString('created'),
        expiresAt: s.getString('expiresAt'),
        ipAddress: s.getString('ipAddress'),
        userAgent: s.getString('userAgent'),
      })
    }
  } catch (err) {
    console.log('[UsersSessions] erro ao listar sessões: ' + err)
    return e.json(500, { error: 'Falha ao consultar as sessões ativas.' })
  }

  return e.json(200, { items: sessions, totalItems: sessions.length })
})

// ---------------------------------------------------------------------------
// POST /backend/v1/users/sessions/revoke
// Body: { targetUserId } — revoga TODAS as sessões ativas do usuário alvo
// (access token nativo continua válido até expirar; o refresh é invalidado).
// Permissões: a própria; root: qualquer; admin: exceto root.
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/users/sessions/revoke', (e) => {
  const app = $app

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const headers = reqInfo.headers || {}

  const auditIp = String(headers['x-forwarded-for'] || headers['x-real-ip'] || '').slice(0, 50)
  const auditUa = String(headers['user-agent'] || headers['User-Agent'] || '').slice(0, 250)

  const authHeader = String(headers['authorization'] || headers['Authorization'] || '')
  const nativeToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!nativeToken) {
    return e.json(401, { error: 'Não autenticado.' })
  }

  let caller
  try {
    caller = app.findAuthRecordByToken(nativeToken, 'auth')
  } catch (_) {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }
  if (!caller || caller.collection().name !== 'users') {
    return e.json(401, { error: 'Sessão inválida ou expirada.' })
  }

  const targetUserId = String(body.targetUserId || '').trim()
  if (!targetUserId) {
    return e.json(400, { error: 'Usuário alvo não informado.' })
  }

  let target
  try {
    target = app.findRecordById('users', targetUserId)
  } catch (_) {
    return e.json(404, { error: 'Usuário alvo não encontrado.' })
  }

  const callerRole = String(caller.getString('role') || '').toLowerCase()
  const targetRole = String(target.getString('role') || '').toLowerCase()
  const isSelf = caller.id === target.id

  if (!isSelf) {
    if (callerRole !== 'root' && callerRole !== 'admin') {
      return e.json(403, { error: 'Acesso negado.' })
    }
    if (targetRole === 'root' && callerRole !== 'root') {
      return e.json(403, { error: 'Somente o perfil Root pode revogar sessões de outro Root.' })
    }
  }

  let revokedCount = 0
  try {
    const list = app.findRecordsByFilter(
      'auth_sessions',
      'userId = {:uid} && revoked = false',
      '-created',
      200,
      0,
      { uid: targetUserId },
    )
    for (let i = 0; i < (list ? list.length : 0); i++) {
      const s = list[i]
      s.set('revoked', true)
      app.save(s)
      revokedCount++
    }
  } catch (err) {
    console.log('[UsersSessionsRevoke] erro ao revogar sessões: ' + err)
    return e.json(500, { error: 'Falha ao revogar as sessões ativas.' })
  }

  try {
    const auditCol = $app.findCollectionByNameOrId('auth_audit')
    const auditRec = new Record(auditCol)
    auditRec.set('eventType', 'sessions_revoked')
    auditRec.set('userId', target.id)
    auditRec.set('email', target.email())
    auditRec.set(
      'reason',
      (isSelf
        ? 'auto-revogação'
        : 'revogação por ' + caller.email() + ' (perfil ' + callerRole + ')') +
        ' — ' +
        revokedCount +
        ' sessão(ões) encerrada(s)',
    )
    auditRec.set('ip', auditIp)
    auditRec.set('userAgent', auditUa)
    $app.save(auditRec)
  } catch (_) {}

  return e.json(200, {
    success: true,
    revoked: revokedCount,
    message:
      revokedCount > 0
        ? revokedCount + ' sessão(ões) ativa(s) revogada(s). O usuário fará novo login.'
        : 'Nenhuma sessão ativa para revogar.',
  })
})
