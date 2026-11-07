/// <reference path="../types.d.ts" />

migrate(
  (app) => {
    const students = app.findCollectionByNameOrId('students')

    // 1. Garante que deleteRule permita exclusão por usuários autenticados
    // (a restrição adicional para apenas root/admin é aplicada pelo RBAC no frontend e nas checagens da aplicação)
    students.deleteRule = "@request.auth.id != ''"

    // 2. Atualiza os valores do campo 'status' para suportar:
    // 'ativo', 'inativo', 'trancado', 'matriculado', 'pre_matricula', 'concluido'
    const statusField = students.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'ativo',
        'inativo',
        'trancado',
        'matriculado',
        'pre_matricula',
        'concluido',
      ]
      statusField.maxSelect = 1
      statusField.required = false
    }

    app.save(students)
  },
  (app) => {
    const students = app.findCollectionByNameOrId('students')
    students.deleteRule = null
    const statusField = students.fields.getByName('status')
    if (statusField) {
      statusField.values = ['matriculado', 'pre_matricula', 'trancado', 'concluido']
    }
    app.save(students)
  },
)
