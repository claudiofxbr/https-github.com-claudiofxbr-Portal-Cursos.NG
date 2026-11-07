/// <reference path="../pb_data/types.d.ts" />
/**
 * Garante que o campo `studentId` exista na coleção `users` do PocketBase,
 * permitindo o vínculo institucional inequívoco entre a conta auth e o registro
 * do aluno em `students`. Também preenche o studentId de aluno@portalcursos.ng.
 */
migrate(
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!usersCol.fields.getByName('studentId')) {
        usersCol.fields.add(
          new TextField({
            name: 'studentId',
            required: false,
          }),
        )
        app.save(usersCol)
      }

      // Vincula studentId do aluno
      try {
        const alunoUser = app.findAuthRecordByEmail('_pb_users_auth_', 'aluno@portalcursos.ng')
        try {
          const studentRec = app.findFirstRecordByFilter(
            'students',
            'email = "aluno@portalcursos.ng"',
          )
          if (studentRec) {
            alunoUser.set('studentId', studentRec.id)
            app.save(alunoUser)
          }
        } catch (_) {
          alunoUser.set('studentId', 'dbphexr97czw7cb')
          app.save(alunoUser)
        }
      } catch (_) {}
    } catch (err) {
      console.warn('[0011_add_user_student_id] Erro:', err)
    }
  },
  () => {},
)
