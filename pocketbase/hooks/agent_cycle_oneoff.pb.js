/// <reference path="../pb_data/types.d.ts" />

/**
 * TEMPORÁRIO (one-off) — exercita o ciclo dos 3 agentes nativos do
 * PortalCursos.NG na ordem real Analisador → Solucionador → Gerenciador,
 * usando a MESMA Chat API nativa que a tela Agentes usa
 * ($ai.agent(slug).chat), para investigar os erros 400 históricos do
 * lesson_progress (filtros malformados / referência a curso purgado na 0036).
 *
 * Roda 1x via cron (2 min após o deploy) e registra o resultado nos logs do
 * backend (hooks stream). Este arquivo é REMOVIDO após o teste.
 */

const AGENT_RUN_VERSION = 'oneoff-lesson-400-1'

cronAdd('agent_cycle_oneoff', '*/2 * * * *', () => {
  try {
    // Garante execução única: se já houve registro desta rodada, sai.
    try {
      const prev = app.findRecordsByFilter(
        'agent_cycle_log',
        'createdByAgent = "orquestador-oneoff"',
        '-created',
        1,
        0,
      )
      if (prev.length > 0) {
        console.log('[oneoff] ciclo já executado nesta rodada; nada a fazer.')
        return
      }
    } catch (e) {
      console.log('[oneoff] aviso ao checar execução única:', e)
    }

    // ---------- 1) ANALISADOR ----------
    const promptAnalisador = [
      'Investigue os erros 400 históricos nas requisições GET /api/collections/lesson_progress/records do PortalCursos.NG.',
      'Contexto: em builds anteriores o front-end consultava lesson_progress com filtros malformados e/ou referenciando um curso legado (hme12uw71ue54ns, aulas engsoft-*) que foi purgado na migração 0036; essas requisições retornavam 400. Hoje voltam 200, o problema é histórico.',
      'Use suas ferramentas para inspecionar o estado atual de lesson_progress, ead_courses, ead_lessons e confirmar que não restam linhas órfãs.',
      'Registre o problema em agent_findings com a CAUSA RAIZ (não só o sintoma), severity, origin, status = encaminhado (o problema já está entregue ao Solucionador) e createdByAgent = "analisador-portalcursos".',
      'Registre também um evento etapa_concluida em agent_cycle_log com openFindings atualizado.',
      'Ao final, responda com um resumo do que analisou.',
    ].join('\n')

    const r1 = $ai.agent('analisador-portalcursos').chat({
      message: promptAnalisador,
    })
    console.log(
      '[oneoff] ANALISADOR ok. conversation=' +
        (r1.conversation_id || '') +
        ' answer=' +
        String(r1.content || '').slice(0, 400),
    )

    // Descobre o finding criado para passar ao Solucionador.
    let findingId = ''
    let findingTitle = ''
    try {
      const fs = app.findRecordsByFilter(
        'agent_findings',
        'createdByAgent = "analisador-portalcursos" && status = "encaminhado"',
        '-created',
        1,
        0,
      )
      if (fs.length > 0) {
        findingId = fs[0].id
        findingTitle = fs[0].getString('title')
      }
    } catch (e) {
      console.log('[oneoff] aviso ao buscar finding:', e)
    }
    console.log('[oneoff] finding encontrado: ' + findingId + ' — ' + findingTitle)

    // ---------- 2) SOLUCIONADOR ----------
    const promptSolucionador = [
      'Proponha e valide uma solução para o problema registrado pelo Analisador em agent_findings sobre os erros 400 históricos do lesson_progress (filtros malformados / referência a curso purgado na migração 0036).',
      findingId
        ? 'O finding é o registro id=' + findingId + ' ("' + findingTitle + '").'
        : 'Busque o finding mais recente do Analisador em agent_findings.',
      'Grave em agent_solutions: proposal (correção com justificativa técnica), riskAnalysis, validationResult (o que foi verificado contra o estado real do banco) e testResult (como testar), com status = validado e createdByAgent = "solucionador-portalcursos".',
      'NÃO aplique nenhuma correção em produção — apenas proponha, valide e teste.',
      'Ao final, responda com um resumo da proposta e da validação.',
    ].join('\n')

    const r2 = $ai.agent('solucionador-portalcursos').chat({
      message: promptSolucionador,
    })
    console.log(
      '[oneoff] SOLUCIONADOR ok. conversation=' +
        (r2.conversation_id || '') +
        ' answer=' +
        String(r2.content || '').slice(0, 400),
    )

    // ---------- 3) GERENCIADOR ----------
    const promptGerenciador = [
      'Acompanhe o estado atual do ciclo: leia agent_findings e agent_solutions e registre em agent_cycle_log o evento correspondente ao estado (etapa_concluida, impedimento ou encerrado, conforme a sua regra literal de encerramento — só encerre se não houver findings abertos/em_analise/encaminhados E toda solução estiver validada com validationResult e testResult).',
      'Contexto desta rodada: o Analisador registrou o problema dos erros 400 históricos do lesson_progress e o Solucionador propôs e validou a solução em agent_solutions. Nenhuma correção de código foi aplicada pela equipe ainda.',
      'Ao final, responda com o estado do ciclo, os impedimentos (se houver) e se o ciclo permanece aberto ou foi encerrado.',
    ].join('\n')

    const r3 = $ai.agent('gerenciador-portalcursos').chat({
      message: promptGerenciador,
    })
    console.log(
      '[oneoff] GERENCIADOR ok. conversation=' +
        (r3.conversation_id || '') +
        ' answer=' +
        String(r3.content || '').slice(0, 400),
    )

    console.log('[oneoff] CICLO CONCLUÍDO nesta rodada.')
  } catch (err) {
    console.log('[oneoff] FALHA no ciclo: ' + String(err && err.message ? err.message : err))
  }
})
