/// <reference path="../pb_data/types.d.ts" />
/**
 * Cria a coleção 'certificates' (certificados acadêmicos emitidos)
 * com índices e campos para validação de integridade.
 *
 * Campos:
 * - studentId: id do aluno no cadastro
 * - studentName: nome completo do aluno
 * - studentCpf: CPF do aluno
 * - courseId: id do curso
 * - courseName: nome do curso concluído
 * - courseLevel: graduacao, pos_graduacao, etc.
 * - workloadHours: carga horária do curso em horas (ex.: 3600)
 * - issueDate: data da emissão no formato YYYY-MM-DD
 * - verificationCode: código único de validação (ex.: CERT-XXXX-XXXX)
 * - issuedBy: nome / e-mail / cargo de quem emitiu
 * - issuedByUserId: id do usuário autenticado emissor
 * - averageGrade: média geral final obtida
 * - attendancePercent: percentual de presença acumulada
 * - status: 'ativo' | 'revogado'
 */
migrate(
  (app) => {
    // Regra de leitura: qualquer usuário autenticado pode listar/visualizar (aluno visualiza o seu, equipe visualiza todos)
    // Regra de criação: usuários autenticados da secretaria, admin, coordenador, root (e via service account no frontend)
    const RULE = "@request.auth.id != ''"

    let certificatesCol
    try {
      certificatesCol = app.findCollectionByNameOrId('certificates')
      certificatesCol.listRule = RULE
      certificatesCol.viewRule = RULE
      certificatesCol.createRule = RULE
      certificatesCol.updateRule = RULE
      certificatesCol.deleteRule = RULE
      app.save(certificatesCol)
    } catch (_) {
      certificatesCol = new Collection({
        type: 'base',
        name: 'certificates',
        listRule: RULE,
        viewRule: RULE,
        createRule: RULE,
        updateRule: RULE,
        deleteRule: RULE,
        fields: [
          { name: 'studentId', type: 'text', required: true, max: 60 },
          { name: 'studentName', type: 'text', required: true, max: 180 },
          { name: 'studentCpf', type: 'text', max: 20 },
          { name: 'courseId', type: 'text', required: true, max: 60 },
          { name: 'courseName', type: 'text', required: true, max: 180 },
          { name: 'courseLevel', type: 'text', max: 60 },
          { name: 'workloadHours', type: 'number', min: 1, max: 10000 },
          { name: 'issueDate', type: 'text', required: true, max: 20 },
          { name: 'verificationCode', type: 'text', required: true, max: 50 },
          { name: 'issuedBy', type: 'text', required: true, max: 180 },
          { name: 'issuedByUserId', type: 'text', max: 60 },
          { name: 'averageGrade', type: 'number', min: 0, max: 10 },
          { name: 'attendancePercent', type: 'number', min: 0, max: 100 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['ativo', 'revogado'],
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_certificates_student ON certificates (studentId)',
          'CREATE INDEX idx_certificates_course ON certificates (courseId)',
          'CREATE UNIQUE INDEX idx_certificates_code ON certificates (verificationCode)',
        ],
      })
      app.save(certificatesCol)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('certificates')
      app.delete(col)
    } catch (_) {}
  },
)
