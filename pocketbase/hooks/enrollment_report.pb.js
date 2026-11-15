/// <reference path="../pb_data/types.d.ts" />

/**
 * Relatório de Matrículas por Curso do PortalCursos.NG
 *
 * GET /backend/v1/reports/enrollments-by-course — agregação servidor-side:
 * para cada curso (courses + ead_courses) devolve o total de matrículas
 * vinculadas e a quebra por status, reagindo aos filtros ?level= e ?status=.
 *
 * Fontes de matrícula:
 *  - students (vínculo por courseId; fallback por courseName único — mesma
 *    estratégia da migração 0016/0039: ID primeiro, nome só sem homônimo);
 *    status do aluno: ativo | inativo | trancado | matriculado |
 *    pre_matricula | concluido;
 *  - course_enrollments (inscrições da Biblioteca de Cursos): status
 *    inscrita | em_analise | confirmada | cancelada;
 *  - ead_courses.enrolledStudentIds (cursos EAD; o status de cada aluno é
 *    resolvido na coleção students).
 *
 * Autorização: apenas os perfis root, admin, secretaria, academico,
 * matricula e coordenador (token nativo obrigatório; 403 "Acesso negado"
 * para os demais — financeiro, professor e aluno).
 *
 * NOTAS JSVM: não existe global `app` (usar $app); callbacks de routerAdd
 * rodam em pool de VMs separado — TODA a lógica fica INLINE no callback.
 */

routerAdd('GET', '/backend/v1/reports/enrollments-by-course', (e) => {
  const app = $app

  const reqInfo = e.requestInfo()
  const headers = reqInfo.headers || {}
  const q = reqInfo.query || {}

  // --- autenticação: token nativo (mesmo mecanismo das rotas /auth/* e /data/*) ---
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

  // --- autorização: perfis autorizados a ver o relatório ---
  const viewerRole = String(viewer.getString('role') || '').toLowerCase()
  const ALLOWED = {
    root: true,
    admin: true,
    secretaria: true,
    academico: true,
    matricula: true,
    coordenador: true,
  }
  if (!ALLOWED[viewerRole]) {
    return e.json(403, { error: 'Acesso negado.' })
  }

  // --- filtros ---
  const level = String(q.level || '')
    .trim()
    .toLowerCase() // '' | graduacao | pos_graduacao
  const statusFilter = String(q.status || '')
    .trim()
    .toLowerCase()

  function normName(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
  }

  // --- 1) cursos presenciais/semipresenciais (courses) ---
  let courseRows = []
  try {
    courseRows = app.findRecordsByFilter('courses', '', '-created', 1000, 0)
  } catch (courseErr) {
    console.log('[EnrollReport] Erro ao listar cursos:', courseErr)
    return e.json(500, { error: 'Falha ao consultar os cursos.' })
  }

  const courseById = {}
  const courseNameCount = {}
  for (let i = 0; i < courseRows.length; i++) {
    const c = courseRows[i]
    courseById[c.id] = {
      id: c.id,
      kind: 'presencial',
      name: c.getString('name'),
      code: c.getString('code'),
      level: c.getString('level'),
      total: 0,
      byStatus: {},
    }
    const nm = normName(c.getString('name'))
    if (nm) {
      courseNameCount[nm] = (courseNameCount[nm] || 0) + 1
    }
  }

  // --- 2) alunos: fonte principal de matrícula por curso ---
  let studentRows = []
  try {
    studentRows = app.findRecordsByFilter('students', '', '', 5000, 0)
  } catch (studentErr) {
    console.log('[EnrollReport] Erro ao listar alunos:', studentErr)
    return e.json(500, { error: 'Falha ao consultar as matrículas.' })
  }

  const studentStatusById = {}
  for (let i = 0; i < studentRows.length; i++) {
    const s = studentRows[i]
    studentStatusById[s.id] = String(s.getString('status') || '').toLowerCase()

    let target = null
    const sid = String(s.getString('courseId') || '')
    if (sid && courseById[sid]) {
      target = courseById[sid]
    }
    if (!target) {
      // fallback legado por nome, apenas quando não há homônimo
      const nm = normName(s.getString('courseName'))
      if (nm && courseNameCount[nm] === 1) {
        for (let j = 0; j < courseRows.length; j++) {
          if (normName(courseRows[j].getString('name')) === nm) {
            target = courseById[courseRows[j].id]
            break
          }
        }
      }
    }
    if (!target) continue

    const st = String(s.getString('status') || '').toLowerCase()
    if (level && target.level !== level) continue
    if (statusFilter && st !== statusFilter) continue

    target.total++
    target.byStatus[st] = (target.byStatus[st] || 0) + 1
  }

  // --- 3) inscrições da Biblioteca de Cursos (course_enrollments) ---
  let enrollRows = []
  try {
    enrollRows = app.findRecordsByFilter('course_enrollments', '', '', 5000, 0)
  } catch (enrollErr) {
    console.log('[EnrollReport] Erro ao listar inscrições:', enrollErr)
    return e.json(500, { error: 'Falha ao consultar as inscrições.' })
  }

  for (let i = 0; i < enrollRows.length; i++) {
    const r = enrollRows[i]

    let target = null
    const cid = String(r.getString('courseId') || '')
    if (cid && courseById[cid]) {
      target = courseById[cid]
    }
    if (!target) {
      const nm = normName(r.getString('courseName'))
      if (nm && courseNameCount[nm] === 1) {
        for (let j = 0; j < courseRows.length; j++) {
          if (normName(courseRows[j].getString('name')) === nm) {
            target = courseById[courseRows[j].id]
            break
          }
        }
      }
    }
    if (!target) continue

    const st = String(r.getString('status') || '').toLowerCase()
    if (level && target.level !== level) continue
    if (statusFilter && st !== statusFilter) continue

    target.total++
    target.byStatus[st] = (target.byStatus[st] || 0) + 1
  }

  // --- 4) cursos EAD (ead_courses) — contagem por enrolledStudentIds ---
  let eadRows = []
  try {
    eadRows = app.findRecordsByFilter('ead_courses', '', '', 1000, 0)
  } catch (eadErr) {
    console.log('[EnrollReport] Erro ao listar cursos EAD:', eadErr)
    return e.json(500, { error: 'Falha ao consultar os cursos EAD.' })
  }

  const items = []
  for (let i = 0; i < courseRows.length; i++) {
    const item = courseById[courseRows[i].id]
    // curso sem matrícula continua na lista, com zero (vaga ociosa)
    if (!level || item.level === level) {
      items.push(item)
    }
  }

  for (let i = 0; i < eadRows.length; i++) {
    const ec = eadRows[i]
    if (level) continue // cursos EAD não têm nível graduação/pós

    let ids = []
    try {
      const raw = ec.get('enrolledStudentIds')
      ids = typeof raw === 'string' ? JSON.parse(raw) : raw || []
    } catch (_) {
      ids = []
    }
    if (!ids || typeof ids.length !== 'number') ids = []

    const item = {
      id: ec.id,
      kind: 'ead',
      name: ec.getString('title'),
      code: '',
      level: 'ead',
      total: 0,
      byStatus: {},
    }
    for (let j = 0; j < ids.length; j++) {
      const st = studentStatusById[String(ids[j])] || 'matriculado'
      if (statusFilter && st !== statusFilter) continue
      item.total++
      item.byStatus[st] = (item.byStatus[st] || 0) + 1
    }
    items.push(item)
  }

  // --- resumo (reage aos filtros) ---
  let totalMatriculas = 0
  let topCursoName = ''
  let topCursoTotal = 0
  for (let i = 0; i < items.length; i++) {
    totalMatriculas += items[i].total
    if (items[i].total > topCursoTotal) {
      topCursoTotal = items[i].total
      topCursoName = items[i].name
    }
  }
  const totalCursos = items.length
  const mediaPorCurso = totalCursos > 0 ? Math.round((totalMatriculas / totalCursos) * 10) / 10 : 0

  return e.json(200, {
    items: items,
    statuses: [
      'matriculado',
      'ativo',
      'pre_matricula',
      'trancado',
      'concluido',
      'inativo',
      'inscrita',
      'em_analise',
      'confirmada',
      'cancelada',
    ],
    summary: {
      totalMatriculas: totalMatriculas,
      totalCursos: totalCursos,
      topCursoName: topCursoName,
      topCursoTotal: topCursoTotal,
      mediaPorCurso: mediaPorCurso,
    },
    generatedAt: new Date().toISOString().replace('T', ' '),
  })
})
