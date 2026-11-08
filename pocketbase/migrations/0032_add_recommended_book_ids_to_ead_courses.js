migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ead_courses')
    if (!col.fields.getByName('recommendedBookIds')) {
      col.fields.add(
        new JSONField({
          name: 'recommendedBookIds',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ead_courses')
      const field = col.fields.getByName('recommendedBookIds')
      if (field) {
        col.fields.removeByName('recommendedBookIds')
        app.save(col)
      }
    } catch (_) {}
  },
)
