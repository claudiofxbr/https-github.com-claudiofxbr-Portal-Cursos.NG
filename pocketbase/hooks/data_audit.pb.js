/// <reference path="../pb_data/types.d.ts" />

/**
 * Log de Alterações de DADOS do PortalCursos.NG (auditoria de dados, v0.0.99)
 *
 * Grava automaticamente em `data_audit` toda operação de escrita nas principais
 * collections de negócio do portal, capturando: collection afetada, id do registro,
 * ação (create/update/delete), quem fez (id, e-mail e nome do usuário autenticado
 * no momento da operação) e o que mudou (valores antes/depois resumidos, campo a
 * campo, para update; payload resumido para create; nada para delete).
 *
 * GARANTIAS:
 *  - Gravação à prova de falhas: todo o corpo roda em try/catch silencioso — se a
 *    auditoria falhar, a operação original do usuário NÃO falha (o handler apenas
 *    chama e.next()).
 *  - Nada sensível é gravado: senha, token, hash, passwordHash etc. são removidos,
 *    e todo valor longo é truncado a 200 caracteres.
 *  - Leitura EXCLUSIVAMENTE pelas rotas customizadas (superusers only na collection):
 *      GET /backend/v1/data/audit          — lista paginada com filtros (root/admin)
 *      GET /backend/v1/data/audit/summary  — cartões de resumo (root/admin)
 *    mesmo padrão de GET /backend/v1/auth/audit da v0.0.97/98.
 *
 * NOTAS JSVM (memória do projeto):
 *  - não existe global `app` — usar `$app` (aqui: `const app = $app` dentro de cada callback);
 *  - callbacks (routerAdd/onRecord*) rodam em pool de VMs separado: TODA a lógica
 *    fica INLINE no corpo do callback (declarações top-level não são visíveis);
 *  - SELECT não materializa em subquery e countRecordsByFilter NÃO existe no JSVM:
 *    toda contagem usa findRecordsByFilter + .length (varredura em memória); o
 *    "usuários ativos" e a "coleção mais alterada" (24h) também são computados
 *    no backend via varredura de 500 registros recentes + mapa em memória.
 */

// ---------------------------------------------------------------------------
// Registro dos hooks de gravação (top-level do arquivo — a lógica em si é inline)
// ---------------------------------------------------------------------------
try {
  onRecordAfterCreateSuccess((e) => {
    // --- toda a lógica inline (pool de VMs separado) ---
    try {
      const app = $app
      const colName = String(e.collection.name || '')
      const WATCHED = {
        students: true,
        charges: true,
        courses: true,
        users: true,
        app_users: true,
        price_table_items: true,
        billing_exceptions: true,
        maintenance_tickets: true,
        lgpd_requests: true,
        expenses: true,
        course_enrollments: true,
        certificates: true,
        classes: true,
      }
      if (!WATCHED[colName]) {
        return e.next()
      }

      const rec = e.record
      const info = e.requestInfo()
      const actor = info && info.auth ? info.auth : null

      let actorId = ''
      let actorEmail = ''
      let actorName = 'Sistema'
      let src = 'sistema'
      if (actor && actor.id) {
        actorId = String(actor.id || '')
        try {
          actorEmail = String(actor.email() || '')
        } catch (_) {}
        try {
          actorName = String(actor.getString('name') || actorEmail)
        } catch (_) {
          actorName = actorEmail
        }
        src = 'app'
      }

      // Rótulo legível do registro criado
      let label = rec.id
      try {
        const labelCandidates = ['fullName', 'name', 'title', 'code', 'studentName', 'email']
        for (let li = 0; li < labelCandidates.length; li++) {
          const v = rec.getString(labelCandidates[li])
          if (v) {
            label = v
            break
          }
        }
      } catch (_) {}

      // Payload resumido (até 12 campos mais relevantes)
      const changes = []
      try {
        const SKIP = {
          id: true,
          created: true,
          updated: true,
          collectionId: true,
          collectionName: true,
        }
        let count = 0
        const fields = rec.collection().fields
        for (let fi = 0; fi < fields.length && count < 12; fi++) {
          const fname = String(fields[fi].name || '')
          if (SKIP[fname] || !fname) continue
          let v = ''
          try {
            v = rec.getString(fname)
          } catch (_) {
            continue
          }
          if (!v) continue
          if (v.length > 200) v = v.substring(0, 197) + '...'
          changes.push({ field: fname, to: v })
          count++
        }
      } catch (_) {}

      const auditCol = app.findCollectionByNameOrId('data_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('action', 'create')
      auditRec.set('collName', colName)
      auditRec.set('recordRef', rec.id)
      auditRec.set('recordLabel', String(label).substring(0, 150))
      auditRec.set('actorId', actorId)
      auditRec.set('actorEmail', actorEmail)
      auditRec.set('actorName', String(actorName).substring(0, 150))
      auditRec.set('src', src)
      try {
        auditRec.set('changesJson', changes)
      } catch (_) {}
      app.save(auditRec)
    } catch (_) {
      // auditoria à prova de falhas: nunca interrompe a operação original
    }
    return e.next()
  }, 'data_audit_create')

  onRecordAfterUpdateSuccess((e) => {
    // --- toda a lógica inline (pool de VMs separado) ---
    try {
      const app = $app
      const colName = String(e.collection.name || '')
      const WATCHED = {
        students: true,
        charges: true,
        courses: true,
        users: true,
        app_users: true,
        price_table_items: true,
        billing_exceptions: true,
        maintenance_tickets: true,
        lgpd_requests: true,
        expenses: true,
        course_enrollments: true,
        certificates: true,
        classes: true,
      }
      if (!WATCHED[colName]) {
        return e.next()
      }

      const rec = e.record
      const info = e.requestInfo()
      const actor = info && info.auth ? info.auth : null

      let actorId = ''
      let actorEmail = ''
      let actorName = 'Sistema'
      let src = 'sistema'
      if (actor && actor.id) {
        actorId = String(actor.id || '')
        try {
          actorEmail = String(actor.email() || '')
        } catch (_) {}
        try {
          actorName = String(actor.getString('name') || actorEmail)
        } catch (_) {
          actorName = actorEmail
        }
        src = 'app'
      }

      // Campos alterados: compara o registro com o estado salvo anterior
      const changes = []
      try {
        const SENSITIVE = {
          password: true,
          passwordConfirm: true,
          oldPassword: true,
          tokenKey: true,
          refreshTokenHash: true,
          passwordHash: true,
          resetToken: true,
          verificationToken: true,
          emailChangeToken: true,
        }
        const SKIP = {
          id: true,
          created: true,
          updated: true,
          collectionId: true,
          collectionName: true,
        }
        let original
        try {
          original = app.findRecordById(colName, rec.id)
        } catch (_) {}
        let count = 0
        const fields = rec.collection().fields
        for (let fi = 0; fi < fields.length && count < 12; fi++) {
          const fname = String(fields[fi].name || '')
          if (SKIP[fname] || SENSITIVE[fname] || !fname) continue
          let nowVal = ''
          let oldVal = ''
          try {
            nowVal = rec.getString(fname)
          } catch (_) {
            continue
          }
          if (original) {
            try {
              oldVal = original.getString(fname)
            } catch (_) {
              oldVal = ''
            }
          }
          if (nowVal === oldVal) continue
          if (nowVal.length > 200) nowVal = nowVal.substring(0, 197) + '...'
          if (oldVal.length > 200) oldVal = oldVal.substring(0, 197) + '...'
          changes.push({ field: fname, from: oldVal, to: nowVal })
          count++
        }
      } catch (_) {}

      let label = rec.id
      try {
        const labelCandidates = ['fullName', 'name', 'title', 'code', 'studentName', 'email']
        for (let li = 0; li < labelCandidates.length; li++) {
          const v = rec.getString(labelCandidates[li])
          if (v) {
            label = v
            break
          }
        }
      } catch (_) {}

      const auditCol = app.findCollectionByNameOrId('data_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('action', 'update')
      auditRec.set('collName', colName)
      auditRec.set('recordRef', rec.id)
      auditRec.set('recordLabel', String(label).substring(0, 150))
      auditRec.set('actorId', actorId)
      auditRec.set('actorEmail', actorEmail)
      auditRec.set('actorName', String(actorName).substring(0, 150))
      auditRec.set('src', src)
      try {
        auditRec.set('changesJson', changes)
      } catch (_) {}
      app.save(auditRec)
    } catch (_) {
      // auditoria à prova de falhas: nunca interrompe a operação original
    }
    return e.next()
  }, 'data_audit_update')

  onRecordAfterDeleteSuccess((e) => {
    // --- toda a lógica inline (pool de VMs separado) ---
    try {
      const app = $app
      const colName = String(e.collection.name || '')
      const WATCHED = {
        students: true,
        charges: true,
        courses: true,
        users: true,
        app_users: true,
        price_table_items: true,
        billing_exceptions: true,
        maintenance_tickets: true,
        lgpd_requests: true,
        expenses: true,
        course_enrollments: true,
        certificates: true,
        classes: true,
      }
      if (!WATCHED[colName]) {
        return e.next()
      }

      const rec = e.record
      const info = e.requestInfo()
      const actor = info && info.auth ? info.auth : null

      let actorId = ''
      let actorEmail = ''
      let actorName = 'Sistema'
      let src = 'sistema'
      if (actor && actor.id) {
        actorId = String(actor.id || '')
        try {
          actorEmail = String(actor.email() || '')
        } catch (_) {}
        try {
          actorName = String(actor.getString('name') || actorEmail)
        } catch (_) {
          actorName = actorEmail
        }
        src = 'app'
      }

      let label = rec.id
      try {
        const labelCandidates = ['fullName', 'name', 'title', 'code', 'studentName', 'email']
        for (let li = 0; li < labelCandidates.length; li++) {
          const v = rec.getString(labelCandidates[li])
          if (v) {
            label = v
            break
          }
        }
      } catch (_) {}

      const auditCol = app.findCollectionByNameOrId('data_audit')
      const auditRec = new Record(auditCol)
      auditRec.set('action', 'delete')
      auditRec.set('collName', colName)
      auditRec.set('recordRef', rec.id)
      auditRec.set('recordLabel', String(label).substring(0, 150))
      auditRec.set('actorId', actorId)
      auditRec.set('actorEmail', actorEmail)
      auditRec.set('actorName', String(actorName).substring(0, 150))
      auditRec.set('src', src)
      try {
        auditRec.set('changesJson', [])
      } catch (_) {}
      app.save(auditRec)
    } catch (_) {
      // auditoria à prova de falhas: nunca interrompe a operação original
    }
    return e.next()
  }, 'data_audit_delete')

  console.log('[DataAudit] hooks de gravação em data_audit registrados')
} catch (regErr) {
  console.log('[DataAudit] falha ao registrar hooks de gravação:', regErr)
}

// ---------------------------------------------------------------------------
// Leitura: GET /backend/v1/data/audit — lista paginada com filtros (root/admin)
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/data/audit', (e) => {
  const app = $app

  const reqInfo = e.requestInfo()
  const headers = reqInfo.headers || {}
  const q = reqInfo.query || {}

  // --- autenticação: token nativo (mesmo mecanismo das rotas /auth/*) ---
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
    return e.json(403, { error: 'Acesso negado.' })
  }

  // --- filtros ---
  let page = parseInt(String(q.page || '1'), 10)
  if (isNaN(page) || page < 1) page = 1
  let perPage = parseInt(String(q.perPage || '25'), 10)
  if (isNaN(perPage) || perPage < 1) perPage = 25
  if (perPage > 100) perPage = 100

  const VALID_ACTIONS = { create: true, update: true, delete: true }
  const VALID_COLL = {
    students: true,
    charges: true,
    courses: true,
    users: true,
    app_users: true,
    price_table_items: true,
    billing_exceptions: true,
    maintenance_tickets: true,
    lgpd_requests: true,
    expenses: true,
    course_enrollments: true,
    certificates: true,
    classes: true,
  }

  const filters = []
  const bind = {}

  const action = String(q.action || '').trim()
  if (action && VALID_ACTIONS[action]) {
    filters.push('action = {:action}')
    bind.action = action
  }

  const coll = String(q.collectionName || '').trim()
  if (coll && VALID_COLL[coll]) {
    filters.push('collName = {:coll}')
    bind.coll = coll
  }

  const actorQuery = String(q.actor || '').trim()
  if (actorQuery) {
    filters.push('(actorEmail ~ {:actor} || actorName ~ {:actor})')
    bind.actor = actorQuery
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
      'data_audit',
      filterExpr,
      '-created',
      perPage,
      (page - 1) * perPage,
      bind,
    )
    // countRecordsByFilter não existe no JSVM: contagem via varredura completa.
    const total = app.findRecordsByFilter(
      'data_audit',
      filterExpr,
      '-created',
      10000,
      0,
      bind,
    ).length

    const mapped = []
    for (let i = 0; i < items.length; i++) {
      const r = items[i]
      let changes = []
      try {
        const raw = r.get('changesJson')
        if (raw) {
          changes = typeof raw === 'string' ? JSON.parse(raw) : raw
        }
      } catch (_) {}
      if (!changes || typeof changes.length !== 'number') changes = []
      mapped.push({
        id: r.id,
        action: r.getString('action'),
        collectionName: r.getString('collName'),
        recordId: r.getString('recordRef'),
        recordLabel: r.getString('recordLabel'),
        actorId: r.getString('actorId'),
        actorEmail: r.getString('actorEmail'),
        actorName: r.getString('actorName'),
        src: r.getString('src'),
        changes: changes,
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
    console.log('[DataAudit] Erro ao consultar data_audit:', queryErr)
    return e.json(500, { error: 'Falha ao consultar o log de alterações.' })
  }
})

// ---------------------------------------------------------------------------
// Leitura: GET /backend/v1/data/audit/summary — cartões de resumo (root/admin)
// Devolve { alteracoes24h, usuariosAtivos, colecaoMaisAlterada }.
// "usuários ativos" e "coleção mais alterada" são computados por varredura dos
// 500 registros mais recentes (SELECT não materializa em subquery no JSVM).
// ---------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/data/audit/summary', (e) => {
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
    return e.json(403, { error: 'Acesso negado.' })
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace('T', ' ')
    // countRecordsByFilter não existe no JSVM: contagem via varredura completa.
    const alteracoes24h = app.findRecordsByFilter(
      'data_audit',
      'created >= {:since}',
      '-created',
      10000,
      0,
      { since: since },
    ).length

    // Varredura dos 500 registros mais recentes para usuários ativos e
    // coleção mais alterada (últimas 24h).
    let usuariosAtivos = 0
    let topCollection = ''
    let topCount = 0
    try {
      const recentes = app.findRecordsByFilter(
        'data_audit',
        'created >= {:since}',
        '-created',
        500,
        0,
        { since: since },
      )
      const usersMap = {}
      const collMap = {}
      for (let i = 0; i < recentes.length; i++) {
        const em = String(recentes[i].getString('actorEmail') || '')
          .trim()
          .toLowerCase()
        if (em) usersMap[em] = true
        const cn = String(recentes[i].getString('collName') || '').trim()
        if (cn) {
          collMap[cn] = (collMap[cn] || 0) + 1
        }
      }
      for (const em in usersMap) {
        if (Object.prototype.hasOwnProperty.call(usersMap, em)) usuariosAtivos++
      }
      for (const cn in collMap) {
        if (Object.prototype.hasOwnProperty.call(collMap, cn) && collMap[cn] > topCount) {
          topCount = collMap[cn]
          topCollection = cn
        }
      }
    } catch (_) {}

    return e.json(200, {
      alteracoes24h: alteracoes24h,
      usuariosAtivos: usuariosAtivos,
      colecaoMaisAlterada: topCollection,
      colecaoMaisAlteradaCount: topCount,
    })
  } catch (sumErr) {
    console.log('[DataAudit] Erro ao calcular resumo:', sumErr)
    return e.json(500, { error: 'Falha ao calcular o resumo do log de alterações.' })
  }
})
