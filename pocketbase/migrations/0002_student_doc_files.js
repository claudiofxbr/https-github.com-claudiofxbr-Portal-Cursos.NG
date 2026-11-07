/// <reference path="../pb_data/types.d.ts" />
/**
 * Adiciona o campo `docFiles` (arquivos reais dos documentos do aluno — RG,
 * histórico, diploma etc.) à coleção students. A lista de metadados continua
 * em `documents` (json); cada arquivo (<= 5 MB, pdf/imagem) é correlacionado
 * pelo nome do arquivo no client.
 */
migrate(
  (app) => {
    const students = app.findCollectionByNameOrId('students')

    const hasDocFiles = students.fields.some((f) => f.name === 'docFiles')
    if (!hasDocFiles) {
      students.fields.add(
        new Field({
          type: 'file',
          name: 'docFiles',
          maxSelect: 10,
          maxSize: 5242880,
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        }),
      )
      app.save(students)
    }
  },
  (app) => {
    const students = app.findCollectionByNameOrId('students')
    students.fields.removeByName('docFiles')
    app.save(students)
  },
)
