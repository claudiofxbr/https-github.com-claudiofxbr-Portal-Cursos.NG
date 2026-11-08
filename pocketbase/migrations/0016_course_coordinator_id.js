/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0016: vínculo professor↔curso por ID de usuário
 *
 * 1. Adiciona o campo `coordinatorId` (text) à coleção `courses`, referenciando
 *    o id do registro do professor na coleção de usuários (auth `users`).
 *    Nada de coleção paralela de professores — o vínculo é com a coleção existente.
 *
 * 2. Backfill idempotente: para cada curso com `coordinatorId` vazio, procura na
 *    coleção `users` um registro cujo `name` (normalizado, sem acentos, caixa
 *    baixa) seja igual ao campo `coordinator`. O vínculo por nome só é criado
 *    quando existe EXATAMENTE UM usuário com aquele nome — se houver dois
 *    professores homônimos, o curso fica sem ID (e a Área do Professor não
 *    duplica a turma para os dois).
 *
 * 3. Backfill de `ead_courses`: normaliza `instructorId` dos cursos EAD que só
 *    têm `instructorName`, com a mesma regra de unicidade.
 */
migrate(
  (app) => {
    // ---------- 1. Campo coordinatorId em courses ----------
    const coursesCol = app.findCollectionByNameOrId('courses')
    const hasField = coursesCol.fields.some((f) => f.name === 'coordinatorId')
    if (!hasField) {
      coursesCol.fields.add(new Field({ name: 'coordinatorId', type: 'text', max: 60 }))
      app.save(coursesCol)
    }

    // ---------- helpers ----------
    const normalize = (name) =>
      String(name || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const buildNameIndex = () => {
      const index = new Map()
      try {
        const users = app.findRecordsByFilter('users', "id != ''", '-created', 0, 0)
        for (const u of users) {
          const key = normalize(u.get('name'))
          if (!key) continue
          index.set(key, index.has(key) ? null : u.id) // homônimo => ambíguo
        }
      } catch (_) {}
      return index
    }

    const uniqueUserIdByName = (index, name) => {
      const key = normalize(name)
      if (!key) return ''
      const found = index.get(key)
      return found || '' // Map traz id ou null (ambíguo)
    }

    // ---------- 2. Backfill de courses.coordinatorId ----------
    const nameIndex = buildNameIndex()
    let linked = 0
    let skipped = 0
    try {
      const courseRecords = app.findRecordsByFilter('courses', "id != ''", '-created', 0, 0)
      for (const c of courseRecords) {
        if (String(c.get('coordinatorId') || '').trim() !== '') continue
        const userId = uniqueUserIdByName(nameIndex, c.get('coordinator'))
        if (userId) {
          c.set('coordinatorId', userId)
          app.save(c)
          linked++
        } else {
          skipped++
        }
      }
    } catch (err) {
      console.log('Backfill courses.coordinatorId aviso:', err)
    }

    // ---------- 3. Backfill de ead_courses.instructorId ----------
    try {
      const eadRecords = app.findRecordsByFilter('ead_courses', "id != ''", '-created', 0, 0)
      for (const e of eadRecords) {
        if (String(e.get('instructorId') || '').trim() !== '') continue
        const userId = uniqueUserIdByName(nameIndex, e.get('instructorName'))
        if (userId) {
          e.set('instructorId', userId)
          app.save(e)
          linked++
        } else {
          skipped++
        }
      }
    } catch (err) {
      console.log('Backfill ead_courses.instructorId aviso:', err)
    }

    console.log(
      `[0016] vínculo professor↔curso por ID: ${linked} registro(s) vinculado(s), ${skipped} sem correspondência única (nome ambíguo ou inexistente)`,
    )
  },
  (app) => {
    // Reversão: remove o campo coordinatorId (os vínculos de ead_courses são
    // mantidos — o campo instructorId já existia antes desta migração).
    try {
      const coursesCol = app.findCollectionByNameOrId('courses')
      const idx = coursesCol.fields.findIndex((f) => f.name === 'coordinatorId')
      if (idx >= 0) {
        coursesCol.fields.remove(idx)
        app.save(coursesCol)
      }
    } catch (_) {}
  },
)
