/// <reference path="../pb_data/types.d.ts" />
/**
 * Adiciona o campo transcriptNotes (texto editável para observações específicas do Histórico Escolar)
 * à coleção 'students'.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('students')

    if (!col.fields.getByName('transcriptNotes')) {
      col.fields.add(
        new TextField({
          name: 'transcriptNotes',
          max: 2000,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('students')
      if (col.fields.getByName('transcriptNotes')) {
        col.fields.removeByName('transcriptNotes')
      }
      app.save(col)
    } catch (_) {}
  },
)
