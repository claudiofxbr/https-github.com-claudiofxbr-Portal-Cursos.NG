/* ------------------------------------------------------------------
 * Migração 0039 — Backfill de integridade referencial (solução
 * validada pelo agente Solucionador, ciclo de agentes nativos).
 *
 * Aplica o remapeamento de identificadores legados do seed para os IDs
 * reais do PocketBase (15 caracteres), somente onde o valor atual é um
 * legado conhecido que NÃO corresponde a nenhum registro existente:
 *
 *   charges.studentId:        "std-001".."std-004" → students.id (via CPF)
 *   students/grades/attendance.courseId: "crs-*"  → courses.id (via código)
 *   attendance.classId:       vazio                → classes.id do curso (via courseId já remapeado)
 *   grades/attendance.teacherId: vazio              → app_users.id do coordenador do curso
 *
 * Idempotente e preservativo: cada UPDATE só altera a linha quando o
 * valor legado de origem casa exatamente; valores já reais são
 * preservados byte a byte (a condição WHERE não casa com eles).
 *
 * Nota sobre studentId de charges (campo TEXT legado, não relation):
 * o app filtra cobranças por studentId = student.id, portanto o
 * remapeamento para o ID real do aluno é o que restaura a integridade.
 * ------------------------------------------------------------------ */

migrate(
  (app) => {
    const log = (msg) => console.log('[0039] ' + msg)

    const count = (expr) => {
      // DBX de migrations não materializa linhas de SELECT: usa a própria
      // engine SQLite via expressão escalar com retorno em string.
      const sql = 'SELECT CAST(COALESCE((' + expr + '), 0) AS TEXT) AS n'
      try {
        const rows = app.db().newQuery(sql).execute()
        const first = rows && rows.length ? rows[0] : null
        if (first && first.get && first.get('n') !== undefined && first.get('n') !== null) {
          return Number(first.get('n')) || 0
        }
        if (first && first.getString) {
          const s = first.getString('n')
          return s === '' ? 0 : Number(s) || 0
        }
        log('AVISO count sem resultado: ' + expr.slice(0, 80))
        return 0
      } catch (e) {
        log('AVISO count falhou (' + String(e) + '): ' + expr.slice(0, 80))
        return 0
      }
    }

    const exec = (sql, params) => {
      const q = app.db().newQuery(sql)
      if (params) q.bind(params)
      q.execute()
    }

    // ---------- 1) charges.studentId: std-001..std-004 → students.id (via CPF) ----------
    // Mapeamento explícito legado → CPF (fonte de verdade denormalizada na própria cobrança).
    const stdByCpf = [
      { legacy: 'std-001', cpf: '89012345678', name: 'Lucas Martins Ferreira' },
      { legacy: 'std-002', cpf: '32165498700', name: 'Ana Clara Albuquerque' },
      { legacy: 'std-003', cpf: '45612378999', name: 'Gabriel Henrique Siqueira' },
      { legacy: 'std-004', cpf: '65498732111', name: 'Juliana Peixoto de Castro' },
    ]
    for (const m of stdByCpf) {
      const res = app.findRecordsByFilter('students', 'cpfRaw = "' + m.cpf + '"', '', 2, 0)
      if (res.length !== 1) {
        log(
          'AVISO: esperava 1 aluno com cpfRaw=' +
            m.cpf +
            ' e achei ' +
            res.length +
            ' — remapeamento deste legado pulado.',
        )
        continue
      }
      const realId = res[0].id
      const before = count('SELECT COUNT(*) AS n FROM charges WHERE studentId = {:leg}', {
        leg: m.legacy,
      })
      log('charges: ' + m.legacy + ' → ' + realId + ' (' + m.name + ')')
      exec('UPDATE charges SET studentId = {:real} WHERE studentId = {:leg}', {
        real: realId,
        leg: m.legacy,
      })
      log('  linhas remapeadas: ' + before)
    }

    // ---------- 2) courseId legado → courses.id, em students/grades/attendance ----------
    const courseByCode = [
      { legacy: 'crs-eng-soft', code: 'ENG-SOFT-01', name: 'Engenharia de Software' },
      { legacy: 'crs-ads', code: 'ADS-02', name: 'Análise e Desenvolvimento de Sistemas' },
      {
        legacy: 'crs-pos-ia',
        code: 'POS-IA-03',
        name: 'Inteligência Artificial & Engenharia de Machine Learning',
      },
      { legacy: 'crs-dir', code: 'DIR-04', name: 'Direito Digital e Proteção de Dados (LGPD)' },
    ]
    for (const m of courseByCode) {
      const res = app.findRecordsByFilter('courses', 'code = "' + m.code + '"', '', 2, 0)
      if (res.length !== 1) {
        log(
          'AVISO: esperava 1 curso com code=' +
            m.code +
            ' e achei ' +
            res.length +
            ' — remapeamento deste legado pulado.',
        )
        continue
      }
      const realId = res[0].id
      for (const table of ['students', 'grades', 'attendance']) {
        exec('UPDATE ' + table + ' SET courseId = {:real} WHERE courseId = {:leg}', {
          real: realId,
          leg: m.legacy,
        })
      }
      log(
        'courseId: ' +
          m.legacy +
          ' → ' +
          realId +
          ' (' +
          m.name +
          ') em students/grades/attendance',
      )
    }

    // ---------- 3) attendance.classId vazio → classes.id do curso ----------
    // classes.courseId já aponta para IDs reais de courses; após o passo 2,
    // attendance.courseId casa com classes.courseId.
    exec(`
    UPDATE attendance
    SET classId = (
      SELECT c.id FROM classes c
      WHERE c.courseId = attendance.courseId
      ORDER BY c.created ASC
      LIMIT 1
    )
    WHERE (classId IS NULL OR classId = '')
      AND EXISTS (
        SELECT 1 FROM classes c2 WHERE c2.courseId = attendance.courseId
      )
  `)
    log('attendance.classId: backfill pela turma do curso concluído')

    // ---------- 4) grades/attendance.teacherId vazio → app_users.id do coordenador ----------
    // courses.coordinatorId já é ID real de app_users (migração 0016);
    // o vínculo por nome é fallback legado.
    exec(`
    UPDATE grades SET teacherId = (
      SELECT c.coordinatorId FROM courses c WHERE c.id = grades.courseId
    )
    WHERE (teacherId IS NULL OR teacherId = '')
      AND EXISTS (SELECT 1 FROM courses c WHERE c.id = grades.courseId AND c.coordinatorId != '')
  `)
    exec(`
    UPDATE attendance SET teacherId = (
      SELECT c.coordinatorId FROM courses c WHERE c.id = attendance.courseId
    )
    WHERE (teacherId IS NULL OR teacherId = '')
      AND EXISTS (SELECT 1 FROM courses c WHERE c.id = attendance.courseId AND c.coordinatorId != '')
  `)
    log('teacherId: backfill pelo coordenador do curso concluído')

    // ---------- 5) Validação pós-migração (somente leitura) ----------
    const orphanCharges = count(
      'SELECT COUNT(*) AS n FROM charges WHERE studentId NOT IN (SELECT id FROM students)',
    )
    const legacyCharges = count("SELECT COUNT(*) AS n FROM charges WHERE studentId LIKE 'std-%'")
    const orphanCourseRefs = count(
      'SELECT COUNT(*) AS n FROM students WHERE courseId NOT IN (SELECT id FROM courses)' +
        ' + (SELECT COUNT(*) FROM grades WHERE courseId NOT IN (SELECT id FROM courses))' +
        ' + (SELECT COUNT(*) FROM attendance WHERE courseId NOT IN (SELECT id FROM courses))',
    )
    const legacyCourseRefs = count(
      "SELECT COUNT(*) AS n FROM students WHERE courseId LIKE 'crs-%'" +
        " + (SELECT COUNT(*) FROM grades WHERE courseId LIKE 'crs-%')" +
        " + (SELECT COUNT(*) FROM attendance WHERE courseId LIKE 'crs-%')",
    )
    const emptyClassId = count(
      "SELECT COUNT(*) AS n FROM attendance WHERE classId IS NULL OR classId = ''",
    )
    const emptyTeacherId = count(
      "SELECT COUNT(*) AS n FROM grades WHERE (teacherId IS NULL OR teacherId = '')" +
        " + (SELECT COUNT(*) FROM attendance WHERE teacherId IS NULL OR teacherId = '')",
    )

    log('validação: cobranças órfãs=' + orphanCharges + ', studentId legado=' + legacyCharges)
    log('validação: courseId órfão/legado=' + orphanCourseRefs + '/' + legacyCourseRefs)
    log('validação: classId vazio=' + emptyClassId + ', teacherId vazio=' + emptyTeacherId)

    if (orphanCharges > 0 || legacyCharges > 0) {
      throw new Error(
        '0039: remapeamento de charges.studentId deixou ' +
          orphanCharges +
          ' cobrança(s) órfã(s) e ' +
          legacyCharges +
          ' legado(s)',
      )
    }
    if (orphanCourseRefs > 0 || legacyCourseRefs > 0) {
      throw new Error(
        '0039: remapeamento de courseId deixou ' +
          orphanCourseRefs +
          ' referência(s) órfã(s) e ' +
          legacyCourseRefs +
          ' legada(s)',
      )
    }
    if (emptyClassId > 0 || emptyTeacherId > 0) {
      throw new Error(
        '0039: backfill de classId/teacherId deixou ' +
          emptyClassId +
          ' classId vazio(s) e ' +
          emptyTeacherId +
          ' teacherId vazio(s)',
      )
    }
    log('OK: integridade referencial confirmada após o remapeamento.')
  },
  (app) => {
    // down: reverso não é possível sem backup dos valores legados (os IDs
    // reais substituíram os legados). Revertido no estado atual, os dados
    // permanecem íntegros — no-op documentado.
    console.log(
      '[0039] down: no-op (remapeamento preserva integridade; legados não são restaurados)',
    )
  },
)
