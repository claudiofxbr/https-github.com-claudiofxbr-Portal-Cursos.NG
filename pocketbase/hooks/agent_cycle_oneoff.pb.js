/// <reference path="../pb_data/types.d.ts" />

/**
 * HOOK ONE-OFF — ETAPA 2 do ciclo de agentes: Solucionador → Gerenciador.
 *
 * O Analisador JÁ rodou (v0.0.73): há 4 findings abertos em agent_findings e
 * 1 solução "proposto" antiga (findingId legado "F1-charges-...") que não
 * referencia os IDs reais. Este hook orquestra o RESTANTE do ciclo:
 *
 *   1. Para cada finding aberto, aciona o agente nativo solucionador-
 *      portalcursos via $ai.agent(slug).chat, passando o ID e o título do
 *      finding. O agente grava a solução (proposta + validação + teste) em
 *      agent_solutions usando as próprias ferramentas da migração 0038.
 *   2. Depois aciona gerenciador-portalcursos para revisar o ciclo, registrar
 *      o evento em agent_cycle_log e decidir encerramento pela sua regra
 *      literal (só encerra sem findings abertos/em_analise/encaminhados e com
 *      toda solução validada — se os findings seguem aguardando implementação,
 *      o ciclo permanece ABERTO, o que é resultado válido).
 *
 * NÃO aplica mutações de dados de produção: para as cobranças órfãs e as
 * chaves lógicas de seed, o Solucionador deve PROPOR a migração de backfill,
 * não executá-la cegamente.
 *
 * Guarda idempotente: não roda enquanto exista solução "proposto"/"validado"
 * para CADA finding aberto (i.e. só executa quando falta cobertura de
 * soluções). Após cumprir sua função este arquivo deve ser REMOVIDO — o
 * circuito permanente (tela Agentes) vive em agent_cycle.pb.js.
 */

cronAdd('agent_cycle_oneoff', '*/2 * * * *', () => {
  const app = $app

  // ---------- 1) Carrega findings abertos (aberto/em_analise/encaminhado) ----------
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
    console.log('[oneoff2] FALHA ao listar findings abertos:', err)
    return
  }
  if (openFindings.length === 0) {
    console.log('[oneoff2] Nenhum finding aberto — encerrando guarda.')
    return
  }

  // ---------- 2) Solução existente (não legada) para cada finding? ----------
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
    console.log('[oneoff2] FALHA ao listar soluções:', err)
    return
  }

  const isRealId = (id) => /^[a-z0-9]{15}$/.test(String(id || ''))

  const missing = []
  for (const f of openFindings) {
    const fid = f.id
    const covered = solutions.some(
      (s) =>
        s.getString('findingId') === fid || s.getString('findingTitle') === f.getString('title'),
    )
    if (!covered) missing.push(f)
  }

  // Solução legada (findingId "F1-charges-...") não cobre nenhum finding real.
  const legacy = solutions.filter((s) => !isRealId(s.getString('findingId')))
  if (legacy.length > 0) {
    console.log(
      '[oneoff2] Soluções com findingId legado/não-real (ignoradas na cobertura): ' +
        legacy.map((s) => s.id + ' -> ' + s.getString('findingId')).join('; '),
    )
  }

  if (missing.length === 0) {
    console.log('[oneoff2] Todos os findings abertos já têm solução — nada a fazer.')
    return
  }

  // ---------- 3) user_id real (root) para as conversas dos agentes ----------
  let userId = ''
  try {
    const u = app.findFirstRecordByFilter('users', 'email = "root@portalcursos.ng"')
    userId = u ? u.id : ''
  } catch (err) {
    console.log('[oneoff2] FALHA ao localizar usuário root para user_id:', err)
    return
  }
  if (!userId) {
    console.log('[oneoff2] FALHA: usuário root não encontrado.')
    return
  }

  // ---------- 4) Solucionador: uma conversa por finding ----------
  for (const f of missing) {
    const fid = f.id
    const ftitle = f.getString('title')
    const fdesc = f.getString('description')
    const fcause = f.getString('rootCause')
    const fsev = f.getString('severity')

    // Pula se um disparo anterior nesta mesma passada já criou a solução.
    try {
      const fresh = app.findRecordsByFilter(
        'agent_solutions',
        'findingId = "' + fid + '"',
        '-created',
        1,
        0,
      )
      if (fresh.length > 0) {
        console.log('[oneoff2] Finding ' + fid + ' já tem solução — pulando.')
        continue
      }
    } catch (_) {}

    const msg = [
      'TAREFA: propor, validar e testar a correção de UM finding específico registrado pelo Analisador.',
      '',
      'Finding:',
      '- ID: ' + fid,
      '- Título: ' + ftitle,
      '- Severidade: ' + fsev,
      '- Descrição: ' + fdesc,
      '- Causa raiz: ' + fcause,
      '',
      'PROTOCOLO (siga exatamente):',
      '1. Se necessário, inspecione o estado real das collections citadas para confirmar o diagnóstico.',
      '2. Registre a solução em agent_solutions vinculada por findingId EXATAMENTE igual a "' +
        fid +
        '" (ID real do registro, não um rótulo), com findingTitle, proposal (correção detalhada), riskAnalysis e status = "proposto".',
      '3. IMPORTANTE — a correção deve ser PROPOSTA, não aplicada: para os casos de cobranças órfãs (charges.studentId = "std-001") e chaves lógicas de seed (courseId "crs-*"), o proposal deve DESCREVER a migração de backfill (mapeamento valor-antigo → ID real, ordem de execução, validação pós-migração e rollback), sem executar mutação nenhuma nos dados de produção.',
      '4. Em seguida, valide a solução contra o estado real do banco e registre o resultado em validationResult.',
      '5. Por fim, registre em testResult o teste da correção proposta (o que foi testado, método e resultado) — sem mutar dados de produção.',
      '6. Se após a validação e o teste a solução permanecer segura, atualize o status da solução para "validado".',
    ].join('\n')

    try {
      const resp = $ai.agent('solucionador-portalcursos').chat({
        user_id: userId,
        message: msg,
      })
      console.log(
        '[oneoff2] Solucionador (' + fid + '): ' + String(resp.content || '').slice(0, 400),
      )
    } catch (err) {
      console.log('[oneoff2] FALHA no Solucionador para finding ' + fid + ':', err)
    }
  }

  // ---------- 5) Gerenciador: revisa o ciclo e decide ----------
  try {
    const resp = $ai.agent('gerenciador-portalcursos').chat({
      user_id: userId,
      message: [
        'TAREFA: revisar o ciclo de agentes nesta etapa e decidir o estado do ciclo.',
        '',
        'Contexto: o Analisador registrou 4 findings abertos em agent_findings. O Solucionador acabou',
        'de registrar soluções (proposta + validação + teste) em agent_solutions para os findings que',
        'estavam sem cobertura. As correções de dados (cobranças órfãs e chaves lógicas de seed) foram',
        'PROPOSTAS, não aplicadas — a migração de backfill aguarda implementação.',
        '',
        'PROTOCOLO: verifique o estado real de agent_findings e agent_solutions, registre o evento',
        'correspondente em agent_cycle_log (eventType coerente) e informe a decisão, aplicando a sua',
        'regra literal de encerramento: encerrar o ciclo SOMENTE se não existir finding em aberto,',
        'em_analise ou encaminhado e toda solução estiver validada. Se os findings continuarem',
        '"aberto" aguardando a implementação das migrações de backfill, registre o estado correto',
        '(ex. encaminhado para implementação) e mantenha o ciclo ABERTO — isso é resultado válido.',
      ].join('\n'),
    })
    console.log('[oneoff2] Gerenciador respondeu: ' + String(resp.content || '').slice(0, 500))
  } catch (err) {
    console.log('[oneoff2] FALHA no Gerenciador:', err)
  }
})
