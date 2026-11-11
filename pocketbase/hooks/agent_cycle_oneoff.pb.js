/// <reference path="../pb_data/types.d.ts" />

/**
 * HOOK ONE-OFF — executa o ciclo de agentes Analisador → Solucionador →
 * Gerenciador UMA ÚNICA VEZ sobre o caso dos erros 400 do lesson_progress.
 *
 * É uma ferramenta de execução única: após cumprir sua função (validação do
 * ciclo no banco vivo), este arquivo deve ser REMOVIDO do código. O circuito
 * permanente (tela Agentes) vive em agent_cycle.pb.js.
 *
 * Bugs da v0.0.72 corrigidos aqui:
 *  - "app is not defined": dentro do callback do cronAdd o app correto é $app.
 *  - "user_id and message are required": $ai.agent(slug).chat exige user_id
 *    (id REAL de registro em users) além de message.
 *  - Guarda one-shot: se já existir finding criado pelo Analisador para este
 *    caso, o hook não executa nada (idempotente em redeploy).
 */

cronAdd('agent_cycle_oneoff', '*/2 * * * *', () => {
  const app = $app

  // ---------- Guarda one-shot: não roda se o caso já foi registrado ----------
  let alreadyDone = false
  try {
    const existing = app.findRecordsByFilter(
      'agent_findings',
      'createdByAgent = "analisador-portalcursos"',
      '-created',
      1,
      0,
    )
    if (existing.length > 0) {
      alreadyDone = true
    }
  } catch (err) {
    console.log('[oneoff] aviso ao checar execução única:', err)
  }
  if (alreadyDone) {
    console.log('[oneoff] caso já registrado pelo Analisador — nada a fazer (execução única).')
    return
  }

  // ---------- user_id real para as conversas dos agentes ----------
  let userId = ''
  try {
    const u = app.findFirstRecordByFilter('users', 'email = "root@portalcursos.ng"')
    userId = u.id
  } catch (err) {
    console.log('[oneoff] FALHA ao localizar usuário root para user_id:', err)
    return
  }
  if (!userId) {
    console.log('[oneoff] FALHA: usuário root não encontrado.')
    return
  }

  const CASE_MESSAGE = [
    'CASO PARA ANÁLISE (erro histórico registrado nos logs do backend):',
    '',
    'Requisições GET /api/collections/lesson_progress/records responderam 400 no passado.',
    'Hoje as mesmas consultas voltam 200. Os 400 ocorreram possivelmente por filtros malformados',
    'nas versões anteriores às correções v0.0.63–v0.0.65, ligadas a linhas fantasma de',
    'lesson_progress apontando para curso inexistente (caso hme12uw71ue54ns / aulas engsoft-*),',
    'purgado na migração 0036.',
    '',
    'Tarefa: investigue as collections (lesson_progress, ead_lessons, ead_courses, courses),',
    'confirme se restam linhas órfãs ou outros vetores de filtro malformado, identifique a CAUSA',
    'RAIZ e registre o problema em agent_findings conforme o seu protocolo.',
  ].join('\n')

  // ---------- 1) Analisador ----------
  let analise = null
  try {
    analise = $ai.agent('analisador-portalcursos').chat({ user_id: userId, message: CASE_MESSAGE })
    console.log('[oneoff] Analisador respondeu:', String(analise.content || '').slice(0, 400))
  } catch (err) {
    console.log('[oneoff] FALHA no Analisador:', err)
    return
  }

  // ---------- 2) Solucionador ----------
  try {
    const solucao = $ai.agent('solucionador-portalcursos').chat({
      user_id: userId,
      message: [
        'O Analisador registrou um caso em agent_findings: erros 400 em GET /api/collections/lesson_progress/records.',
        'Resumo da análise do Analisador: ' + String(analise.content || '').slice(0, 1500),
        '',
        'Tarefa: leia o(s) finding(s) correspondente(s) em agent_findings e siga o seu protocolo —',
        'proponha a correção em agent_solutions (proposal, riskAnalysis, status=proposto), valide',
        'contra o estado real e registre validationResult e testResult.',
      ].join('\n'),
    })
    console.log('[oneoff] Solucionador respondeu:', String(solucao.content || '').slice(0, 400))
  } catch (err) {
    console.log('[oneoff] FALHA no Solucionador:', err)
  }

  // ---------- 3) Gerenciador ----------
  try {
    const gerencia = $ai.agent('gerenciador-portalcursos').chat({
      user_id: userId,
      message: [
        'O Analisador e o Solucionador já passaram pelo caso dos erros 400 do lesson_progress.',
        'Verifique o estado atual de agent_findings e agent_solutions, registre o evento',
        'correspondente em agent_cycle_log e informe se o ciclo permanece aberto ou foi encerrado,',
        'aplicando a sua regra literal de encerramento.',
      ].join('\n'),
    })
    console.log('[oneoff] Gerenciador respondeu:', String(gerencia.content || '').slice(0, 400))
  } catch (err) {
    console.log('[oneoff] FALHA no Gerenciador:', err)
  }
})
