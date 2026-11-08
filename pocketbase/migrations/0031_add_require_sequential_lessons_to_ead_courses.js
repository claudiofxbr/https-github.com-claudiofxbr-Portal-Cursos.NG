migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ead_courses')
    if (!col.fields.getByName('requireSequentialLessons')) {
      col.fields.add(
        new BoolField({
          name: 'requireSequentialLessons',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ead_courses')
      const field = col.fields.getByName('requireSequentialLessons')
      if (field) {
        col.fields.removeByName('requireSequentialLessons')
        app.save(col)
      }
    } catch (_) {}
  },
)
