/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0042: histórico de mudanças de status das inscrições em cursos.
 *
 * Adiciona à coleção existente course_enrollments (migração 0041):
 *  - statusHistory (json) — lista de eventos { from, to, by, at, note } em
 *    ordem cronológica, gravada a cada mudança de status pela equipe.
 *  - rejectionReason (text) — motivo obrigatório ao recusar/cancelar uma
 *    inscrição.
 *
 * Idempotente: aplica apenas se o campo ainda não existir. O backfill cria o
 * evento inicial do histórico somente para inscrições antigas que já saíram
 * do estado 'inscrita' mas não têm histórico.
 *
 * As regras de acesso da 0041 permanecem inalteradas: alunos leem/escrevem
 * apenas as próprias inscrições; a equipe (qualquer perfil != aluno) atualiza.
 */
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('course_enrollments')
    } catch (_) {
      // Coleção ausente (instância nova): a 0041 cria tudo — nada a fazer aqui.
      return
    }

    let changed = false

    if (!col.fields.getByName('statusHistory')) {
      col.fields.add(new JSONField({ name: 'statusHistory', maxSize: 100000 }))
      changed = true
    }

    if (!col.fields.getByName('rejectionReason')) {
      col.fields.add(new TextField({ name: 'rejectionReason', max: 500 }))
      changed = true
    }

    if (changed) {
      app.save(col)
    }

    // Backfill idempotente: registra no histórico o estado já observado de
    // inscrições antigas, sem dados pessoais adicionais (usa reviewedBy já
    // existente no registro).
    try {
      const recs = app.findRecordsByFilter(
        'course_enrollments',
        'status != "inscrita" && statusHistory = "" && statusHistory = null',
        '-created',
        500,
        0,
      )
      recs.forEach((rec) => {
        const raw = rec.getString('statusHistory')
        if (raw && raw !== 'null' && raw !== '' && raw !== '[]') return
        const reviewedAt = rec.getString('reviewedAt')
        const event = {
          from: 'inscrita',
          to: rec.getString('status'),
          by: rec.getString('reviewedBy') || 'Equipe (pré-histórico)',
          at: reviewedAt || rec.getString('updated') || new Date().toISOString(),
          note: rec.getString('rejectionReason') || '',
        }
        rec.set('statusHistory', JSON.stringify([event]))
        app.save(rec)
      })
    } catch (_) {
      // Sem registros ou filtro de json não suportado: backfill é best-effort.
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('course_enrollments')
      try {
        if (col.fields.getByName('statusHistory')) {
          col.fields.removeByName('statusHistory')
        }
        if (col.fields.getByName('rejectionReason')) {
          col.fields.removeByName('rejectionReason')
        }
        app.save(col)
      } catch (_) {}
    } catch (_) {}
  },
)
