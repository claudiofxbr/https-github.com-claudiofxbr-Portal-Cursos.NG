/// <reference path="../pb_data/types.d.ts" />
/**
 * Migração 0027: Controle de Frequência por Turma
 *
 * Adiciona o campo 'classId' na coleção 'attendance' para vincular lançamentos de presença/chamada
 * diretamente a uma turma específica da coleção 'classes'.
 *
 * Idempotente: se o campo 'classId' já existir, mantém sem erro.
 * Também cria índice para buscas por classId.
 */
migrate(
  (app) => {
    try {
      const attendanceCol = app.findCollectionByNameOrId('attendance')

      // Verifica se o campo classId já existe
      const hasClassId = attendanceCol.fields.find((f) => f.name === 'classId')
      if (!hasClassId) {
        attendanceCol.fields.add(
          new TextField({
            name: 'classId',
            required: false,
            max: 60,
          }),
        )

        // Adiciona índice se ainda não existir
        const hasIdx = (attendanceCol.indexes || []).some((idx) =>
          idx.includes('idx_attendance_class'),
        )
        if (!hasIdx) {
          const indexes = attendanceCol.indexes || []
          indexes.push('CREATE INDEX idx_attendance_class ON attendance (classId)')
          attendanceCol.indexes = indexes
        }

        app.save(attendanceCol)
      }
    } catch (err) {
      console.log('[Migration 0027] Erro ao adicionar classId em attendance:', err)
    }
  },
  (app) => {
    try {
      const attendanceCol = app.findCollectionByNameOrId('attendance')
      attendanceCol.fields.removeByName('classId')
      app.save(attendanceCol)
    } catch (_) {}
  },
)
