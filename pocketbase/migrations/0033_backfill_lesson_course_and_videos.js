/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0033: Player real nas aulas do curso de graduação (lesson_progress)
 *
 * 1) Backfill de courseId: as linhas de progresso do aluno demo foram semeadas com o
 *    ID fictício 'crs-eng-soft', mas o curso real na coleção courses tem id
 *    'hme12uw71ue54ns' (ENG-SOFT-01). Sem o backfill, o filtro do módulo Meus Cursos
 *    não encontra as aulas e o app cai numa lista hardcoded com player simulado.
 *
 * 2) Campos de vídeo: adiciona videoUrl/videoEmbedId/videoProvider às aulas de
 *    lesson_progress e semeia links do YouTube estáveis, tematicamente adequados a
 *    cada aula (todos validados via oEmbed antes do seed).
 *
 * Idempotente: roda como no-op em banco vazio ou já migrado.
 */
migrate(
  (app) => {
    // ---------- 1) Backfill do courseId ----------
    let col
    try {
      col = app.findCollectionByNameOrId('lesson_progress')
    } catch (_) {
      // Coleção não existe; no-op seguro
      return
    }

    const LEGACY_COURSE_ID = 'crs-eng-soft'

    // Resolve o id real do curso Engenharia de Software (code ENG-SOFT-01)
    let realCourseId = ''
    try {
      const rows = app.findRecordsByFilter('courses', "code = 'ENG-SOFT-01'", '-created', 1, 0)
      if (rows.length > 0) {
        realCourseId = rows[0].getString('id')
      }
    } catch (_) {
      realCourseId = ''
    }

    if (realCourseId && realCourseId !== LEGACY_COURSE_ID) {
      try {
        const stale = app.findRecordsByFilter(
          'lesson_progress',
          `courseId = "${LEGACY_COURSE_ID}"`,
          '',
          500,
          0,
        )
        for (const rec of stale) {
          rec.set('courseId', realCourseId)
          app.save(rec)
        }
        if (stale.length > 0) {
          console.log(
            `[0033] Backfill lesson_progress: ${stale.length} linha(s) ${LEGACY_COURSE_ID} -> ${realCourseId}`,
          )
        }
      } catch (err) {
        console.log('[0033] Aviso no backfill de courseId:', err)
      }
    }

    // ---------- 2) Campos de vídeo na coleção ----------
    const ensureField = (name, type) => {
      try {
        col.fields.getByName(name)
      } catch (_) {
        col.fields.add(new Field({ type, name }))
        app.save(col)
      }
    }
    ensureField('videoUrl', 'text')
    ensureField('videoEmbedId', 'text')
    ensureField('videoProvider', 'text')

    // ---------- 3) Seed de vídeos (todos validados via oEmbed do YouTube) ----------
    // lessonId -> vídeo tematicamente adequado
    const videoMap = {
      'engsoft-m1-l1': {
        // GOTO 2019 • Chris Richardson — Desenvolvendo Microsserviços Assíncronos
        videoEmbedId: 'kyNL7yCvQQc',
        videoUrl: 'https://www.youtube.com/watch?v=kyNL7yCvQQc',
      },
      'engsoft-m1-l2': {
        // Kubernetes Tutorial for Beginners [FULL COURSE] — TechWorld with Nana
        videoEmbedId: 'X48VuDVv0do',
        videoUrl: 'https://www.youtube.com/watch?v=X48VuDVv0do',
      },
      'engsoft-m2-l1': {
        // GOTO 2020 • Kafka as a Platform — Robin Moffatt
        videoEmbedId: 'xy6jNKI3tKU',
        videoUrl: 'https://www.youtube.com/watch?v=xy6jNKI3tKU',
      },
      'engsoft-m2-l2': {
        // GOTO 2023 • API Gateways in 4 Minutes — Daniel Bryant
        videoEmbedId: 'd77eAYTAQ0U',
        videoUrl: 'https://www.youtube.com/watch?v=d77eAYTAQ0U',
      },
      'engsoft-m3-l1': {
        // DevOps Engineering Course for Beginners — freeCodeCamp (CI/CD com GitHub Actions)
        videoEmbedId: 'j5Zsa_eOXeY',
        videoUrl: 'https://www.youtube.com/watch?v=j5Zsa_eOXeY',
      },
      'engsoft-m3-l2': {
        // DevOps with GitLab CI Course — freeCodeCamp (observabilidade/entrega contínua)
        videoEmbedId: 'PGyhBwLyK2U',
        videoUrl: 'https://www.youtube.com/watch?v=PGyhBwLyK2U',
      },
      'engsoft-m4-l1': {
        // Software Testing Course (Pirâmide de Testes, Playwright/E2E) — freeCodeCamp
        videoEmbedId: 'jydYq7oAtD8',
        videoUrl: 'https://www.youtube.com/watch?v=jydYq7oAtD8',
      },
      // Aulas reportadas pelo usuário na listagem hardcoded (Módulo "Modelagem de
      // Domínio & Bancos") — cobertas também quando o aluno ainda as visualiza.
      'aula-3': {
        // What is DDD — Eric Evans — DDD Europe 2019
        videoEmbedId: 'pMuiVlnGqjk',
        videoUrl: 'https://www.youtube.com/watch?v=pMuiVlnGqjk',
      },
      'aula-4': {
        // Not Just Events: Developing Asynchronous Microservices • Chris Richardson • GOTO 2019
        videoEmbedId: 'kyNL7yCvQQc',
        videoUrl: 'https://www.youtube.com/watch?v=kyNL7yCvQQc',
      },
      'aula-5': {
        // Software Testing Course – Playwright, E2E, and AI Agents — freeCodeCamp
        videoEmbedId: 'jydYq7oAtD8',
        videoUrl: 'https://www.youtube.com/watch?v=jydYq7oAtD8',
      },
      'aula-6': {
        // OAuth/autenticação — GOTO 2019 • The Anatomy of a Secure Login
        videoEmbedId: 'V8DGdEkBlao',
        videoUrl: 'https://www.youtube.com/watch?v=V8DGdEkBlao',
      },
      'aula-1': {
        // The Clean Architecture EXPLAINED in 9 MINUTES — Marco Lenzo
        videoEmbedId: 'jGxuE1pNjoE',
        videoUrl: 'https://www.youtube.com/watch?v=jGxuE1pNjoE',
      },
      'aula-2': {
        // GOTO 2019 • Chris Richardson — Desenvolvendo Microsserviços Assíncronos
        videoEmbedId: 'kyNL7yCvQQc',
        videoUrl: 'https://www.youtube.com/watch?v=kyNL7yCvQQc',
      },
    }

    try {
      const recs = app.findRecordsByFilter('lesson_progress', '', '', 500, 0)
      let seeded = 0
      for (const rec of recs) {
        const lessonId = rec.getString('lessonId')
        const video = videoMap[lessonId]
        if (!video) continue
        const current = rec.getString('videoUrl')
        if (current) continue // já tem vídeo; não sobrescreve (idempotência)
        rec.set('videoProvider', 'youtube')
        rec.set('videoEmbedId', video.videoEmbedId)
        rec.set('videoUrl', video.videoUrl)
        app.save(rec)
        seeded++
      }
      if (seeded > 0) {
        console.log(`[0033] Videos semeados em ${seeded} registro(s) de lesson_progress`)
      }
    } catch (err) {
      console.log('[0033] Aviso ao semear vídeos:', err)
    }
  },
  (app) => {
    // Reversão: remove apenas os campos de vídeo adicionados
    try {
      const col = app.findCollectionByNameOrId('lesson_progress')
      for (const name of ['videoUrl', 'videoEmbedId', 'videoProvider']) {
        try {
          col.fields.getByName(name)
          col.fields.removeByName(name)
        } catch (_) {
          /* campo inexistente */
        }
      }
      app.save(col)
    } catch (_) {}
  },
)
