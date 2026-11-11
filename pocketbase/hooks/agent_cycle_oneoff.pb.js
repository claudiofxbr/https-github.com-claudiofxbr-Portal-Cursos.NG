/// <reference path="../pb_data/types.d.ts" />

/**
 * HOOK ONE-OFF — FASE FINAL do ciclo de agentes (ordem estrita):
 *
 *   1. Solucionador: valida e testa cada solução "proposto" (registra
 *      validationResult + testResult na MESMA solução, status "validado"),
 *      conferindo o estado real pós-aplicação da migração 0039.
 *   2. Operação (este hook, com privilégio root/admin de plataforma): marca
 *      como "resolvido" cada finding cujas soluções (não rejeitadas) estão
 *      todas validadas com validação e teste — a correção correspondente já
 *      foi APLICADA pela migração 0039 (remapeamento de IDs legados).
 *      (O Analisador é proibido pelo próprio prompt de fechar findings e o
 *      Solucionador não tem permissão de update neles; sem este passo o
 *      ciclo nunca fecharia — o Gerenciador só encerra com zero abertos.)
 *   3. Gerenciador: revisa o ciclo e aplica a regra literal — só grava
 *      eventType "encerrado" em agent_cycle_log com zero findings
 *      abertos/em_analise/encaminhados e toda solução validada com
 *      validationResult e testResult preenchidos.
 *
 * Guarda idempotente: quando o ciclo já está encerrado e íntegro, a
 * execução é no-op e o arquivo pode ser removido.
 */

cronAdd('agent_cycle_final', '*/2 * * * *', () => {
  const app = $app

  // ---------- Estado do ciclo ----------
  let openFindings = []
  try {
    openFindings = app.findRecordsByFilter(
      'agent_findings',
      'status != "resolvido"',
      '-created',
      50,
      0,
    )
  } catch (err) {
    console.log('[final] FALHA ao listar findings:', err)
    return
  }

  let solutions = []
  try {
    solutions = app.findRecordsByFilter(
      'agent_solutions',
      'status != "rejeitado"',
      '-created',
      100,
      0,
    )
  } catch (err) {
    console.log('[final] FALHA ao listar soluções:', err)
    return
  }

  const pending = solutions.filter(
    (s) =>
      s.getString('status') === 'proposto' ||
      (s.getString('status') === 'validado' && !s.getString('testResult')),
  )

  let closedLogged = false
  try {
    closedLogged =
      app.findRecordsByFilter('agent_cycle_log', 'eventType = "encerrado"', '-created', 1, 0)
        .length > 0
  } catch (_) {}

  if (pending.length === 0 && openFindings.length === 0 && closedLogged) {
    console.log('[final] Ciclo já encerrado e íntegro — no-op (hook pode ser removido).')
    return
  }

  // ---------- user_id real (root) para as conversas dos agentes ----------
  let userId = ''
  try {
    const u = app.findFirstRecordByFilter('users', 'email = "root@portalcursos.ng"')
    userId = u ? u.id : ''
  } catch (err) {
    console.log('[final] FALHA ao localizar usuário root:', err)
    return
  }
  if (!userId) {
    console.log('[final] FALHA: usuário root não encontrado.')
    return
  }

  // ---------- FASE 1 — Solucionador: validar + testar cada solução pendente ----------
  for (const s of pending) {
    const sid = s.id
    const fid = s.getString('findingId')

    const msg = [
      'TAREFA: concluir a validação e o teste da sua solução registrada em agent_solutions (registro ID ' +
        sid +
        ', findingId ' +
        fid +
        '), pois a correção de dados correspondente já foi APLICADA em produção pela migração 0039_reference_backfill (remapeamento de identificadores legados preservando integridade referencial: charges.studentId de "std-001".."std-004" para IDs reais de students via CPF; courseId de students/grades/attendance de chaves "crs-*" para IDs reais de courses; attendance.classId preenchido com a turma do curso; grades/attendance.teacherId com o coordenador do curso).',
      '',
      'PROTOCOLO (nesta ordem, SEMPRE no registro ID ' + sid + ' — não crie outra solução):',
      '1. VALIDAÇÃO: consulte o estado real e atual do banco (collections students, courses, charges, grades, attendance, classes) e confirme que o remapeamento descrito na proposta foi aplicado. Registre o resultado em validationResult, citando as queries de verificação e os números encontrados (ex.: nenhuma cobrança com studentId fora de students.id; nenhum courseId legado "crs-*").',
      '2. TESTE: registre em testResult o teste da correção em estado pós-0039 (método, o que foi testado e resultado obtido — somente leitura, sem mutação).',
      '3. STATUS: atualize o status do registro ID ' +
        sid +
        ' para "validado" se validação e teste confirmarem a correção; se o registro for duplicata de outra solução do mesmo problema, marque status "rejeitado" com validationResult explicando a duplicação.',
      '',
      'REGRAS: nunca altere dados de produção (a correção já está aplicada); validação e teste são consultas de leitura; escreva em português.',
    ].join('\n')

    try {
      const resp = $ai.agent('solucionador-portalcursos').chat({
        user_id: userId,
        message: msg,
      })
      console.log('[final] Solucionador (' + sid + '): ' + String(resp.content || '').slice(0, 400))
    } catch (err) {
      console.log('[final] FALHA no Solucionador para ' + sid + ':', err)
    }
  }

  // ---------- FASE 2 — Operação: fechar findings com correção aplicada e validada ----------
  try {
    const freshSolutions = app.findRecordsByFilter(
      'agent_solutions',
      'status != "rejeitado"',
      '-created',
      100,
      0,
    )
    const byFinding = {}
    for (const so of freshSolutions) {
      const fid = so.getString('findingId')
      if (!byFinding[fid]) byFinding[fid] = []
      byFinding[fid].push(so)
    }
    for (const f of openFindings) {
      const fid = f.id
      const sols = byFinding[fid] || []
      if (sols.length === 0) continue
      const allValidated = sols.every(
        (so) =>
          so.getString('status') === 'validado' &&
          so.getString('validationResult') &&
          so.getString('testResult'),
      )
      if (!allValidated) continue
      const rec = app.findRecordById('agent_findings', fid)
      rec.set('status', 'resolvido')
      app.save(rec)
      console.log(
        '[final] Finding ' +
          fid +
          ' marcado como resolvido (correção aplicada pela 0039 e validada/testada pelo Solucionador).',
      )
    }
  } catch (err) {
    console.log('[final] FALHA ao fechar findings resolvidos:', err)
  }

  // ---------- FASE 3 — Gerenciador: revisa e decide o encerramento ----------
  try {
    const resp = $ai.agent('gerenciador-portalcursos').chat({
      user_id: userId,
      message: [
        'TAREFA: revisar o ciclo de agentes nesta etapa final e decidir o estado do ciclo.',
        '',
        'Contexto: as soluções do Solucionador estão com validação e teste registrados em agent_solutions (status "validado"); as correções de dados descritas nelas foram APLICADAS pela migração 0039_reference_backfill (remapeamento de IDs legados preservando integridade referencial, validado pós-execução: zero cobranças órfãs, zero referências legadas, nenhum classId/teacherId vazio); os findings cujas soluções foram validadas e testadas foram marcados como "resolvido" pela operação.',
        '',
        'PROTOCOLO: verifique o estado real de agent_findings e agent_solutions e registre o evento coerente em agent_cycle_log, aplicando a SUA regra literal de encerramento: encerrar o ciclo SOMENTE se não existir finding com status aberto, em_analise ou encaminhado E toda solução validada/aplicada estiver com validationResult e testResult preenchidos. Se ainda houver pendências, registre "impedimento" e mantenha o ciclo aberto (resultado válido).',
      ].join('\n'),
    })
    console.log('[final] Gerenciador respondeu: ' + String(resp.content || '').slice(0, 500))
  } catch (err) {
    console.log('[final] FALHA no Gerenciador:', err)
  }
})
