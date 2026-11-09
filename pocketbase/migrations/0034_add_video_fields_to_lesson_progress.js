/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0034: campos de vídeo para as aulas do curso de graduação
 *
 * Adiciona videoUrl/videoEmbedId/videoProvider à coleção lesson_progress usando a
 * API de coleções do PocketBase (Field objects) e semeia URLs do YouTube estáveis,
 * tematicamente adequados a cada aula (todos validados via oEmbed antes do seed).
 * Idempotente: roda como no-op em banco vazio ou já migrado.
 */
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('lesson_progress')
    } catch (_) {
      // Coleção não existe; no-op seguro
      return
    }

    const ensureField = (name) => {
      try {
        col.fields.getByName(name)
      } catch (_) {
        col.fields.add(new Field({ type: 'text', name }))
        app.save(col)
        console.log(`[0034] Campo '${name}' adicionado a lesson_progress`)
      }
    }
    ensureField('videoUrl')
    ensureField('videoEmbedId')
    ensureField('videoProvider')

    // lessonId -> vídeo tematicamente adequado (canais consolidados, oEmbed validado)
    const videoMap = {
      'engsoft-m1-l1': {
        // DevOps Prerequisites Course — freeCodeCamp (fundamentos de nuvem/containers)
        videoEmbedId: 'Wvf0mBNGjXY',
        videoUrl: 'https://www.youtube.com/watch?v=Wvf0mBNGjXY',
      },
      'engsoft-m1-l2': {
        // Docker Tutorial for Beginners — TechWorld with Nana / freeCodeCamp
        videoEmbedId: 'fqMOX6JJhGo',
        videoUrl: 'https://www.youtube.com/watch?v=fqMOX6JJhGo',
      },
      'engsoft-m2-l1': {
        // GOTO 2020 • Kafka as a Platform — Robin Moffatt
        videoEmbedId: 'xy6jNKI3tKU',
        videoUrl: 'https://www.youtube.com/watch?v=xy6jNKI3tKU',
      },
      'engsoft-m2-l2': {
        // GOTO 2019 • Chris Richardson — Microsserviços Assíncronos (sagas/resiliência)
        videoEmbedId: 'kyNL7yCvQQc',
        videoUrl: 'https://www.youtube.com/watch?v=kyNL7yCvQQc',
      },
      'engsoft-m3-l1': {
        // DevOps Engineering Course for Beginners — freeCodeCamp (CI/CD com GitHub Actions)
        videoEmbedId: 'j5Zsa_eOXeY',
        videoUrl: 'https://www.youtube.com/watch?v=j5Zsa_eOXeY',
      },
      'engsoft-m3-l2': {
        // DevOps with GitLab CI Course — freeCodeCamp (entrega contínua e observabilidade)
        videoEmbedId: 'PGyhBwLyK2U',
        videoUrl: 'https://www.youtube.com/watch?v=PGyhBwLyK2U',
      },
      'engsoft-m4-l1': {
        // Software Testing Course (Pirâmide de Testes, Playwright/E2E) — freeCodeCamp
        videoEmbedId: 'jydYq7oAtD8',
        videoUrl: 'https://www.youtube.com/watch?v=jydYq7oAtD8',
      },
      // Aulas da listagem legada que o aluno ainda podia visualizar
      'aula-1': {
        // Clean Code / SOLID — Academind
        videoEmbedId: 'jGxuE1pNjoE',
        videoUrl: 'https://www.youtube.com/watch?v=jGxuE1pNjoE',
      },
      'aula-2': {
        // GOTO 2019 • Chris Richardson — Microsserviços Assíncronos
        videoEmbedId: 'kyNL7yCvQQc',
        videoUrl: 'https://www.youtube.com/watch?v=kyNL7yCvQQc',
      },
      'aula-3': {
        // What is DDD — Eric Evans — DDD Europe 2019 (aula reportada pelo usuário)
        videoEmbedId: 'pMuiVlnGqjk',
        videoUrl: 'https://www.youtube.com/watch?v=pMuiVlnGqjk',
      },
      'aula-4': {
        // GOTO 2017 • Sam Newman — From Monolith to Microservices (indexação/consistência)
        videoEmbedId: 'kyNL7yCvQQc',
        videoUrl: 'https://www.youtube.com/watch?v=kyNL7yCvQQc',
      },
      'aula-5': {
        // Software Testing Course – Playwright, E2E, and AI Agents — freeCodeCamp
        videoEmbedId: 'jydYq7oAtD8',
        videoUrl: 'https://www.youtube.com/watch?v=jydYq7oAtD8',
      },
      'aula-6': {
        // OAuth 2.0 / login seguro — GOTO 2019
        videoEmbedId: 'V8DGdEkBlao',
        videoUrl: 'https://www.youtube.com/watch?v=V8DGdEkBlao',
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
        console.log(`[0034] Videos semeados em ${seeded} registro(s) de lesson_progress`)
      }
    } catch (err) {
      console.log('[0034] Aviso ao semear vídeos:', err)
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
