// 0036 — Purga de lesson_progress órfãs (causa raiz do bug "Pipelines CI/CD" caindo no portão).
//
// A migração 0034 semeara registros de progresso apontando para o curso legado
// `hme12uw71ue54ns` e aulas `engsoft-mX-lY` que NÃO existem em `ead_lessons`.
// Essas linhas fantasmas alimentavam o card "Módulo 3: ... 0/2 concluídas" na tela
// inicial (títulos vinham dos próprios campos lessonTitle/moduleName) e, ao clicar
// em Assistir, a aula resolvia para um ID inexistente — derrubando a navegação.
//
// Idempotente: em banco vazio não há linhas, e o DELETE por condição é no-op.
// Só remove progresso cujo par (courseId, lessonId) não exista mais no catálogo real.

migrate(
  (app) => {
    // 1) Progresso órfão por curso inexistente (curso legado da v0.0.63 e afins)
    const q1 = app
      .db()
      .newQuery('DELETE FROM lesson_progress WHERE courseId NOT IN (SELECT id FROM ead_courses)')
    const res1 = q1.execute()
    console.log('[0036] lesson_progress com curso inexistente removidas:', res1)

    // 2) Progresso órfão por aula inexistente (qualquer curso, inclusive futuros)
    const q2 = app
      .db()
      .newQuery('DELETE FROM lesson_progress WHERE lessonId NOT IN (SELECT id FROM ead_lessons)')
    const res2 = q2.execute()
    console.log('[0036] lesson_progress com aula inexistente removidas:', res2)
  },
  (app) => {
    // Down é no-op intencional: os registros removidos eram fantasmas sem valor
    // de recuperação (referenciavam curso/aula que nunca existiram no catálogo).
    console.log('[0036] down: nada a restaurar (linhas fantasma)')
  },
)
