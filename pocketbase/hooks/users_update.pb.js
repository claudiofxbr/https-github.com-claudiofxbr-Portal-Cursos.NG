/// <reference path="../pb_data/types.d.ts" />

/**
 * Edição completa do cadastro de usuário do PortalCursos.NG (v0.0.106)
 *
 * Rota: POST /backend/v1/users/update
 * Body: { targetUserId, name, email, role?, status?, roleTitle?, department?, phone?, cpf? }
 *  - campos ausentes/vazios de papel/status = "não alterar";
 *  - a NUNCA altera senha aqui (fluxo próprio em users_password.pb.js).
 *
 * PERMISSÕES (validadas AQUI no backend; o frontend só esconde/mostra campos):
 *  - qualquer perfil autenticado : o PRÓPRIO cadastro (sem papel/status);
 *  - admin                       : qualquer usuário EXCETO contas root (sem papel/status);
 *  - root                        : qualquer usuário; papel/status SOMENTE de terceiros;
 *  - demais perfis em terceiros  : 403 "Acesso negado."
 *  - NINGUÉM altera o próprio papel/status (negação de escalada de privilégio),
 *    logo o root também não pode rebaixar a si mesmo.
 *
 * EFEITOS:
 *  - e-mail alterado: revoga TODAS as sessões do usuário (auth_sessions.revoked) —
 *    o acesso atual segue válido até o token expirar, o refresh é invalidado e o
 *    novo login passa a exigir o novo e-mail; evento gravado em auth_audit;
 *  - TODA alteração bem-sucedida é gravada em data_audit (diff campo a campo),
 *    com dedupe do hook automático de auditoria (data_audit.pb.js).
 *
 * REGRAS JSVM (memória do projeto):
 *  - o global `app` NÃO existe: usar `const app = $app` dentro do callback;
 *  - callbacks de routerAdd rodam num pool de VMs separado: TODA a lógica é INLINE;
 *  - countRecordsByFilter NÃO existe: findRecordsByFilter + contagem em memória;
 *  - nenhuma resposta ecoa senha/token (esta rota não lida com senha).
 */
routerAdd('POST', '/backend/v1/users/update', (e) => {
  const app = $app

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const headers = reqInfo.headers || {}

  const auditIp = String(headers['x-forwarded-for'] || headers['x-real-ip'] || '').slice(0, 50)
  const auditUa = String(headers['user-agent'] || headers['User-Agent'] || '').slice(0, 250)

  // --- autenticação: token nativo (mesmo mecanismo das demais rotas /backend/v1) ---
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

  // --- alvo ---
  const targetUserId = String(body.targetUserId || '').trim()
  if (!targetUserId) {
    return e.json(400, { field: 'targetUserId', error: 'Usuário alvo não informado.' })
  }

  let target
  try {
    target = app.findRecordById('users', targetUserId)
  } catch (_) {
    return e.json(404, { error: 'Usuário alvo não encontrado.' })
  }

  // --- entrada ---
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const roleTitle = String(body.roleTitle || '').trim()
  const department = String(body.department || '').trim()
  const phone = String(body.phone || '').trim()
  const cpf = String(body.cpf || '').trim()
  const role = String(body.role || '')
    .trim()
    .toLowerCase()
  const status = String(body.status || '')
    .trim()
    .toLowerCase()

  if (!name) {
    return e.json(400, { field: 'name', error: 'O nome completo é obrigatório.' })
  }
  if (name.length > 150) {
    return e.json(400, { field: 'name', error: 'O nome completo deve ter até 150 caracteres.' })
  }
  if (!email) {
    return e.json(400, { field: 'email', error: 'O e-mail é obrigatório.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return e.json(400, { field: 'email', error: 'Formato de e-mail inválido.' })
  }
  if (cpf && cpf.replace(/\D/g, '').length > 11) {
    return e.json(400, { field: 'cpf', error: 'CPF inválido (mais de 11 dígitos).' })
  }

  const callerRole = String(caller.getString('role') || '').toLowerCase()
  const targetRole = String(target.getString('role') || '').toLowerCase()
  const targetStatus = String(target.getString('status') || '').toLowerCase()
  const isSelf = caller.id === target.id

  // --- autorização ---
  if (!isSelf) {
    if (callerRole !== 'root' && callerRole !== 'admin') {
      return e.json(403, { error: 'Acesso negado.' })
    }
    if (targetRole === 'root' && callerRole !== 'root') {
      return e.json(403, { error: 'Somente o perfil Root pode alterar o cadastro de outro Root.' })
    }
  }

  // --- papel/status: só root, só em terceiros (ninguém altera o próprio) ---
  const VALID_ROLES = {
    root: true,
    admin: true,
    secretaria: true,
    financeiro: true,
    academico: true,
    matricula: true,
    coordenador: true,
    professor: true,
    aluno: true,
  }
  const VALID_STATUS = { ativo: true, inativo: true, bloqueado: true }

  if (role && !VALID_ROLES[role]) {
    return e.json(400, { field: 'role', error: 'Perfil inválido.' })
  }
  if (status && !VALID_STATUS[status]) {
    return e.json(400, { field: 'status', error: 'Status inválido.' })
  }

  const roleChangeRequested = role !== '' && role !== targetRole
  const statusChangeRequested = status !== '' && status !== targetStatus

  if ((roleChangeRequested || statusChangeRequested) && isSelf) {
    return e.json(403, {
      error: 'Você não pode alterar o seu próprio papel ou status de acesso.',
    })
  }
  if (roleChangeRequested || statusChangeRequested) {
    if (callerRole !== 'root') {
      return e.json(403, {
        error: 'Somente o perfil Root pode alterar papel ou status de outro usuário.',
      })
    }
    if (roleChangeRequested && role === 'root') {
      return e.json(403, { error: 'Promoção ao perfil Root deve ser feita por outro Root.' })
    }
  }

  // --- unicidade de e-mail ---
  let callerEmail = ''
  try {
    callerEmail = String(caller.email() || '')
  } catch (_) {}
  let callerName = callerEmail
  try {
    callerName = String(caller.getString('name') || callerEmail)
  } catch (_) {}

  if (email.toLowerCase() !== String(target.email() || '').toLowerCase()) {
    let dup = null
    try {
      dup = app.findFirstRecordByFilter('users', 'email = {:em} && id != {:id}', {
        em: email,
        id: target.id,
      })
    } catch (_) {}
    if (dup) {
      return e.json(400, { field: 'email', error: 'Este e-mail já está em uso por outro usuário.' })
    }
  }

  // --- diff (antes de aplicar) ---
  const FIELDS = ['name', 'email', 'role', 'status', 'roleTitle', 'department', 'phone', 'cpf']
  const origVals = {}
  for (let fi = 0; fi < FIELDS.length; fi++) {
    const f = FIELDS[fi]
    let v = ''
    try {
      v = String(target.getString(f) || '')
    } catch (_) {}
    origVals[f] = v
  }
  const emailBefore = origVals['email'] || String(target.email() || '')
  const emailChanged = email.toLowerCase() !== emailBefore.toLowerCase()

  // --- aplica ---
  try {
    target.set('name', name)
    target.set('email', email)
    target.set('roleTitle', roleTitle)
    target.set('department', department)
    target.set('phone', phone)
    target.set('cpf', cpf)
    if (roleChangeRequested) target.set('role', role)
    if (statusChangeRequested) target.set('status', status)
    app.save(target)
  } catch (saveErr) {
    console.log('[UsersUpdate] falha ao salvar: ' + saveErr)
    return e.json(400, { error: 'Falha ao salvar os dados: ' + saveErr })
  }

  // --- e-mail alterado: revoga sessões + evento de autenticação ---
  let revokedSessions = 0
  if (emailChanged) {
    try {
      const list = app.findRecordsByFilter(
        'auth_sessions',
        'userId = {:uid} && revoked = false',
        '-created',
        200,
        0,
        { uid: target.id },
      )
      for (let si = 0; si < (list ? list.length : 0); si++) {
        const s = list[si]
        s.set('revoked', true)
        app.save(s)
        revokedSessions++
      }
    } catch (_) {}

    try {
      const auditCol = $app.findCollectionByNameOrId('auth_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('eventType', 'email_changed')
      auditRec.set('userId', target.id)
      auditRec.set('email', email)
      auditRec.set(
        'reason',
        (isSelf
          ? 'alteração do próprio e-mail'
          : 'e-mail alterado por ' + callerEmail + ' (perfil ' + callerRole + ')') +
          ' — de ' +
          emailBefore +
          ' para ' +
          email +
          ' — ' +
          revokedSessions +
          ' sessão(ões) revogada(s)',
      )
      auditRec.set('ip', auditIp)
      auditRec.set('userAgent', auditUa)
      $app.save(auditRec)
    } catch (_) {}
  }

  // --- auditoria em data_audit (diff campo a campo, sem duplicar o hook automático) ---
  try {
    const changes = []
    for (let fi = 0; fi < FIELDS.length; fi++) {
      const f = FIELDS[fi]
      let nv = ''
      try {
        nv = String(target.getString(f) || '')
      } catch (_) {}
      if (nv !== origVals[f]) {
        changes.push({ field: f, from: origVals[f], to: nv })
      }
    }
    if (changes.length > 0) {
      // Dedupe: o hook automático de data_audit (data_audit.pb.js) observa a
      // collection `users` e pode já ter gravado esta alteração com o mesmo ator.
      let freshSameActor = false
      try {
        const recent = app.findRecordsByFilter(
          'data_audit',
          "collName = 'users' && recordRef = {:rid} && action = 'update'",
          '-created',
          1,
          0,
          { rid: target.id },
        )
        if (recent && recent.length > 0) {
          const createdStr = String(recent[0].getString('created')).replace(' ', 'T')
          const createdMs = Date.parse(createdStr)
          if (!isNaN(createdMs) && Date.now() - createdMs < 60000) {
            const aEmail = String(recent[0].getString('actorEmail') || '')
            if (aEmail === callerEmail) freshSameActor = true
          }
        }
      } catch (_) {}

      if (!freshSameActor) {
        const auditCol = app.findCollectionByNameOrId('data_audit')
        const auditRec = new Record(auditCol)
        auditRec.set('action', 'update')
        auditRec.set('collName', 'users')
        auditRec.set('recordRef', target.id)
        auditRec.set('recordLabel', String(name).substring(0, 150))
        auditRec.set('actorId', caller.id)
        auditRec.set('actorEmail', callerEmail)
        auditRec.set('actorName', String(callerName).substring(0, 150))
        auditRec.set('src', 'app')
        try {
          auditRec.set('changesJson', changes)
        } catch (_) {}
        app.save(auditRec)
      }
    }
  } catch (_) {
    // auditoria à prova de falhas: nunca interrompe a resposta da rota
  }

  return e.json(200, {
    success: true,
    emailChanged: emailChanged,
    revokedSessions: revokedSessions,
    message: isSelf
      ? 'Seus dados foram atualizados com sucesso.'
      : 'Dados de ' + name + ' atualizados com sucesso.',
    user: {
      id: target.id,
      name: name,
      email: email,
      role: String(target.getString('role') || ''),
      status: String(target.getString('status') || ''),
      roleTitle: roleTitle,
      department: department,
      phone: phone,
      cpf: cpf,
    },
  })
})
