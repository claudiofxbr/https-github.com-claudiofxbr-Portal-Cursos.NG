/// <reference path="../pb_data/types.d.ts" />

/**
 * DESPACHANTE DO CICLO DE AGENTES (reativado na v0.0.102, idempotente).
 *
 * Ciclo: Analisador (findings) → Solucionador (uma solução por vez) → Gerenciador
 * (controle de sequência e encerramento). Especialização: login/autenticação
 * e saúde do banco (ver migração 0050).
 *
 * GUARDAS NO CÓDIGO (não apenas no prompt):
 *  1. Só avalia a solução PENDENTE MAIS ANTIGA por execução: propostas
 *     "proposto" ou "validado" sem testResult. Nenhuma nova proposta é criada
 *     aqui (não acumula não validadas).
 *  2. Uma solução só pode ser considerada aprovada se tiver validationResult
 *     E testResult registrados; sem isso, permanece pendente.
 *  3. Um finding só vira "resolvido" quando todas as suas soluções não
 *     rejeitadas estão validadas com validationResult e testResult.
 *  4. Idempotência: se não há pendências nem findings abertos e o ciclo já
 *     tem evento "encerrado" como último evento, a execução é no-op. O
 *     Gerenciador só é acionado quando o estado mudou desde o último evento.
 *  5. Gerenciador só encerra sem pendências (regra literal no prompt e aqui:
 *     o evento "encerrado" só é gravado se não houver pendências).
 *
 * Falhas de qualquer etapa são registradas no console e não derrubam o ciclo.
 */

cronAdd('agent_cycle_final', '0 */6 * * *', () => {
  const app = $app

  // ---------- Estado atual ----------
  let findings = []
  let solutions = []
  try {
    findings = app.findRecordsByFilter(
      'agent_findings',
      'status != "resolvido"',
      '-created',
      200,
      0,
    )
    solutions = app.findRecordsByFilter(
      'agent_solutions',
      'status != "rejeitado"',
      'created',
      500,
      0,
    )
  } catch (err) {
    console.log('[ciclo] FALHA ao ler agent_findings/agent_solutions:', err)
    return
  }

  // Pendentes: proposta sem validação, ou validada sem teste registrado.
  const pending = solutions.filter((s) => {
    const st = s.getString('status')
    return st === 'proposto' || (st === 'validado' && !s.getString('testResult'))
  })

  // Último evento do ciclo (para idempotência).
  let lastEvent = ''
  try {
    const last = app.findRecordsByFilter('agent_cycle_log', 'id != ""', '-created', 1, 0)
    lastEvent = last.length > 0 ? last[0].getString('eventType') : ''
  } catch (err) {
    console.log('[ciclo] aviso ao ler agent_cycle_log:', err)
  }

  if (pending.length === 0 && findings.length === 0 && lastEvent === 'encerrado') {
    console.log('[ciclo] Ciclo encerrado e íntegro — no-op (idempotente).')
    return
  }

  // ---------- Usuário root para as conversas dos agentes ----------
  let userId = ''
  try {
    const u = app.findFirstRecordByFilter('users', 'email = "root@portalcursos.ng"')
    userId = u ? u.id : ''
  } catch (err) {
    console.log('[ciclo] FALHA ao localizar usuário root:', err)
    return
  }
  if (!userId) {
    console.log('[ciclo] FALHA: usuário root não encontrado.')
    return
  }

  // ---------- ETAPA 1 — Solucionador: UMA solução pendente por execução ----------
  // pending vem ordenado por created ascendente (mais antiga primeiro).
  if (pending.length > 0) {
    const s = pending[0]
    const sid = s.id
    const fid = s.getString('findingId')
    const msg = [
      'TAREFA: avaliar UMA solução pendente, individualmente, em agent_solutions (registro ID ' +
        sid +
        ', findingId ' +
        fid +
        ').',
      '',
      'PROTOCOLO (somente este registro; não crie outra proposta):',
      '1. Leia o finding ' +
        fid +
        ' em agent_findings e o estado real das collections citadas (somente leitura).',
      '2. Registre em validationResult o que foi verificado, a leitura usada e o resultado.',
      '3. Registre em testResult o método de teste, o resultado esperado e o obtido (somente leitura).',
      '4. Atualize o status para "validado" somente se validação e teste confirmarem a correção; caso contrário, "rejeitado" com o motivo.',
      '',
      'REGRAS: nunca altere agent_findings, dados de produção, rotas de login ou hooks de autenticação; escreva em português.',
    ].join('\n')
    try {
      const resp = $ai.agent('solucionador-portalcursos').chat({ user_id: userId, message: msg })
      console.log('[ciclo] Solucionador (' + sid + '): ' + String(resp.content || '').slice(0, 400))
    } catch (err) {
      console.log('[ciclo] FALHA no Solucionador para ' + sid + ':', err)
    }
  }

  // ---------- ETAPA 2 — Fechar findings com todas as soluções validadas e testadas ----------
  try {
    const fresh = app.findRecordsByFilter(
      'agent_solutions',
      'status != "rejeitado"',
      'created',
      500,
      0,
    )
    const byFinding = {}
    for (const so of fresh) {
      const fid = so.getString('findingId')
      if (!byFinding[fid]) byFinding[fid] = []
      byFinding[fid].push(so)
    }
    for (const f of findings) {
      const sols = byFinding[f.id] || []
      if (sols.length === 0) continue
      const approved = sols.every(
        (so) =>
          so.getString('status') === 'validado' &&
          so.getString('validationResult') &&
          so.getString('testResult'),
      )
      if (!approved) continue
      f.set('status', 'resolvido')
      app.save(f)
      console.log(
        '[ciclo] Finding ' + f.id + ' resolvido (todas as soluções validadas e testadas).',
      )
    }
  } catch (err) {
    console.log('[ciclo] FALHA ao fechar findings:', err)
  }

  // ---------- ETAPA 3 — Gerenciador: controle de sequência e encerramento ----------
  try {
    const resp = $ai.agent('gerenciador-portalcursos').chat({
      user_id: userId,
      message: [
        'TAREFA: revisar o estado do ciclo e registrar o evento coerente em agent_cycle_log.',
        '',
        'PROTOCOLO: leia agent_findings e agent_solutions. Registre "impedimento" listando os IDs de soluções em "proposto" ou "validado" sem testResult, e de findings não resolvidos sem solução. Registre "encerrado" SOMENTE se não houver findings aberto/em_analise/encaminhado e nenhuma solução pendente sem validationResult e testResult. Não repita evento idêntico ao último registrado.',
        'Registre também, para a solução testada nesta execução, se o teste foi aprovado, reprovado ou está incompleto.',
      ].join('\n'),
    })
    console.log('[ciclo] Gerenciador respondeu: ' + String(resp.content || '').slice(0, 500))
  } catch (err) {
    console.log('[ciclo] FALHA no Gerenciador:', err)
  }
})
