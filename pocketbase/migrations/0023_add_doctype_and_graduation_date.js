/// <reference path="../pb_data/types.d.ts" />
/**
 * Adiciona o campo docType ('certificado' | 'diploma') e data de colação de grau (graduationDate)
 * à coleção 'certificates'.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('certificates')

    if (!col.fields.getByName('docType')) {
      col.fields.add(
        new SelectField({
          name: 'docType',
          values: ['certificado', 'diploma'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('graduationDate')) {
      col.fields.add(new TextField({ name: 'graduationDate', max: 50 }))
    }

    app.save(col)

    // Backfill defensivo: registros existentes sem docType viram 'certificado'
    try {
      app
        .db()
        .newQuery(
          "UPDATE certificates SET docType = 'certificado' WHERE docType IS NULL OR docType = ''",
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('certificates')
      if (col.fields.getByName('graduationDate')) col.fields.removeByName('graduationDate')
      if (col.fields.getByName('docType')) col.fields.removeByName('docType')
      app.save(col)
    } catch (_) {}
  },
)
