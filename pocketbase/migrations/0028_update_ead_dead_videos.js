/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0028: Substitui videoaulas fora do ar no EAD por links estáveis e verificados
 *
 * Atualiza registros da coleção ead_lessons que possuem os IDs do YouTube antigos:
 * - Aula 01: kYIhykL1P3E -> jGxuE1pNjoE (The Clean Architecture EXPLAINED in 9 MINUTES)
 * - Aula 02: czgOWmtGVGs -> kyNL7yCvQQc (GOTO 2019 Chris Richardson: Asynchronous Microservices)
 * - Aula 03: yPvef9R3k-M -> pMuiVlnGqjk (What is DDD - Eric Evans - DDD Europe 2019)
 *
 * A migração é estritamente idempotente e segura para banco vazio ou já atualizado.
 */
migrate(
  (app) => {
    let eadLessonsCol
    try {
      eadLessonsCol = app.findCollectionByNameOrId('ead_lessons')
    } catch (_) {
      // Coleção não existe; no-op seguro
      return
    }

    const updates = [
      {
        oldEmbedId: 'kYIhykL1P3E',
        newEmbedId: 'jGxuE1pNjoE',
        newUrl: 'https://www.youtube.com/watch?v=jGxuE1pNjoE',
        durationMinutes: 9,
      },
      {
        oldEmbedId: 'czgOWmtGVGs',
        newEmbedId: 'kyNL7yCvQQc',
        newUrl: 'https://www.youtube.com/watch?v=kyNL7yCvQQc',
        durationMinutes: 52,
      },
      {
        oldEmbedId: 'yPvef9R3k-M',
        newEmbedId: 'pMuiVlnGqjk',
        newUrl: 'https://www.youtube.com/watch?v=pMuiVlnGqjk',
        durationMinutes: 30,
      },
    ]

    for (const item of updates) {
      try {
        const records = app.findRecordsByFilter(
          'ead_lessons',
          `videoEmbedId = "${item.oldEmbedId}" || videoUrl ~ "${item.oldEmbedId}"`,
          '-created',
          10,
          0,
        )

        for (const record of records) {
          record.set('videoEmbedId', item.newEmbedId)
          record.set('videoUrl', item.newUrl)
          record.set('videoProvider', 'youtube')
          if (item.durationMinutes) {
            record.set('durationMinutes', item.durationMinutes)
          }
          app.save(record)
        }
      } catch (err) {
        console.log(`Aviso ao atualizar aula EAD (${item.oldEmbedId} -> ${item.newEmbedId}):`, err)
      }
    }
  },
  (app) => {
    // Reversão opcional (restaura IDs anteriores se necessário)
    try {
      const rollbacks = [
        {
          currentEmbedId: 'jGxuE1pNjoE',
          oldEmbedId: 'kYIhykL1P3E',
          oldUrl: 'https://www.youtube.com/watch?v=kYIhykL1P3E',
          durationMinutes: 28,
        },
        {
          currentEmbedId: 'kyNL7yCvQQc',
          oldEmbedId: 'czgOWmtGVGs',
          oldUrl: 'https://www.youtube.com/watch?v=czgOWmtGVGs',
          durationMinutes: 35,
        },
        {
          currentEmbedId: 'pMuiVlnGqjk',
          oldEmbedId: 'yPvef9R3k-M',
          oldUrl: 'https://www.youtube.com/watch?v=yPvef9R3k-M',
          durationMinutes: 42,
        },
      ]

      for (const item of rollbacks) {
        const records = app.findRecordsByFilter(
          'ead_lessons',
          `videoEmbedId = "${item.currentEmbedId}"`,
          '-created',
          10,
          0,
        )
        for (const record of records) {
          record.set('videoEmbedId', item.oldEmbedId)
          record.set('videoUrl', item.oldUrl)
          record.set('durationMinutes', item.durationMinutes)
          app.save(record)
        }
      }
    } catch (_) {}
  },
)
