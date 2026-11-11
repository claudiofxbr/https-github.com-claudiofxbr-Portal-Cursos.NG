/* ------------------------------------------------------------------
 * Migração 0038 — Ciclo de agentes nativos do PortalCursos.NG
 *
 * Cria as collections de trabalho que conectam os 3 agentes nativos:
 *  - agent_findings   : problemas registrados pelo Analisador
 *  - agent_solutions  : propostas de correção do Solucionador
 *  - agent_cycle_log  : painel de estado do ciclo mantido pelo Gerenciador
 *
 * Regras de acesso: leitura/escrita restritas a root/admin — coerente com
 * o endurecimento da migração 0037 (nenhum outro perfil vê ou altera).
 *
 * Também define os 3 agentes NATIVOS do Skip Cloud ($ai.agents.define),
 * na ordem de execução Analisador → Solucionador → Gerenciador.
 * ------------------------------------------------------------------ */

const ADMIN_RULE =
  "@request.auth.id != '' && (@request.auth.role = 'root' || @request.auth.role = 'admin')"

function adminRules() {
  return {
    listRule: ADMIN_RULE,
    viewRule: ADMIN_RULE,
    createRule: ADMIN_RULE,
    updateRule: ADMIN_RULE,
    deleteRule: ADMIN_RULE,
  }
}

migrate(
  (app) => {
    // ---------- Collections de trabalho ----------
    const findings = new Collection({
      name: 'agent_findings',
      type: 'base',
      ...adminRules(),
      fields: [
        { name: 'title', type: 'text', required: true, min: 3, max: 200 },
        { name: 'description', type: 'editor', required: true, maxSize: 20000 },
        { name: 'rootCause', type: 'editor', maxSize: 20000 },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['baixa', 'media', 'alta', 'critica'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberto', 'em_analise', 'encaminhado', 'resolvido'],
          maxSelect: 1,
        },
        {
          name: 'origin',
          type: 'select',
          required: true,
          values: ['codigo', 'banco', 'github', 'processo'],
          maxSelect: 1,
        },
        { name: 'createdByAgent', type: 'text', max: 80 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_agent_findings_status ON agent_findings (status)',
        'CREATE INDEX idx_agent_findings_severity ON agent_findings (severity)',
      ],
    })
    app.save(findings)

    const solutions = new Collection({
      name: 'agent_solutions',
      type: 'base',
      ...adminRules(),
      fields: [
        { name: 'findingId', type: 'text', required: true, min: 1, max: 100 },
        { name: 'findingTitle', type: 'text', max: 200 },
        { name: 'proposal', type: 'editor', required: true, maxSize: 30000 },
        { name: 'riskAnalysis', type: 'editor', maxSize: 20000 },
        { name: 'validationResult', type: 'editor', maxSize: 20000 },
        { name: 'testResult', type: 'editor', maxSize: 20000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['proposto', 'validado', 'aplicado', 'rejeitado'],
          maxSelect: 1,
        },
        { name: 'createdByAgent', type: 'text', max: 80 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_agent_solutions_finding ON agent_solutions (findingId)',
        'CREATE INDEX idx_agent_solutions_status ON agent_solutions (status)',
      ],
    })
    app.save(solutions)

    const cycleLog = new Collection({
      name: 'agent_cycle_log',
      type: 'base',
      ...adminRules(),
      fields: [
        {
          name: 'eventType',
          type: 'select',
          required: true,
          values: ['iniciado', 'etapa_concluida', 'impedimento', 'encerrado'],
          maxSelect: 1,
        },
        { name: 'message', type: 'editor', required: true, maxSize: 30000 },
        { name: 'openFindings', type: 'number', onlyInt: true, min: 0 },
        { name: 'pendingSolutions', type: 'number', onlyInt: true, min: 0 },
        { name: 'createdByAgent', type: 'text', max: 80 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_agent_cycle_event ON agent_cycle_log (eventType)'],
    })
    app.save(cycleLog)

    // ---------- Evento inicial do ciclo ----------
    try {
      const existing = app.findRecordsByFilter(
        'agent_cycle_log',
        'eventType = "iniciado"',
        '-created',
        1,
        0,
      )
      if (existing.length === 0) {
        const rec = new Record(cycleLog)
        rec.set('eventType', 'iniciado')
        rec.set(
          'message',
          'Ciclo de agentes iniciado. Ordem de execução: Analisador → Solucionador → Gerenciador.',
        )
        rec.set('openFindings', 0)
        rec.set('pendingSolutions', 0)
        rec.set('createdByAgent', 'gerenciador-portalcursos')
        app.save(rec)
      }
    } catch (e) {
      console.log('[0038] aviso ao semear evento inicial do ciclo:', e)
    }

    // ---------- Agentes nativos (ordem: Analisador → Solucionador → Gerenciador) ----------
    $ai.agents.define(app, {
      slug: 'analisador-portalcursos',
      name: 'Analisador PortalCursos',
      description:
        'Análise de código, banco de dados e GitHub do PortalCursos.NG: detecta erros nos processos, identifica a causa raiz e registra os problemas.',
      tier: 'reasoning',
      systemPrompt: [
        'Você é o AGENTE ANALISADOR do PortalCursos.NG, especialista em análise de código, banco de dados PocketBase e GitHub de uma instituição de ensino (SPA React + Vite + TypeScript com dados em PocketBase/Skip Cloud).',
        '',
        'Sua função: verificar se existe erro nos processos do aplicativo, identificar a CAUSA RAIZ de cada problema e registrar os problemas de forma clara e objetiva.',
        '',
        'Responsabilidades (nesta ordem):',
        '1. BANCO DE DADOS: inspecione as collections e seus registros procurando regras de acesso permissivas, registros órfãos e inconsistências de referência (ex.: progresso de aula apontando para curso/aula inexistente — o projeto já sofreu com linhas fantasma em lesson_progress que faziam o aluno cair na tela inicial ao clicar em Assistir; essa é a referência clássica de causa raiz órfã). Verifique também referências students.courseId → courses, charges.studentId → students, ead_lessons.eadCourseId → ead_courses.',
        '2. CÓDIGO: procure sinais de processo problemático — handlers que fazem logout ou perdem sessão em fluxo de aluno, IDs sanitizados/validados incorretamente antes de navegar, campos de vídeo mortos, seed divergente do schema.',
        '3. GITHUB/PROCESSO: avalie o histórico e a organização das versões (migrações numeradas em ordem, commits coerentes) e registre processos frágeis.',
        '',
        'REGISTRO OBRIGATÓRIO: para CADA problema confirmado, grave um registro na collection agent_findings com:',
        '- title: título curto e objetivo;',
        '- description: descrição objetiva do sintoma e onde ocorre;',
        '- rootCause: causa raiz identificada (nunca apenas o sintoma);',
        '- severity: baixa | media | alta | critica;',
        '- status: aberto (crie sempre como aberto; em_analise quando estiver aprofundando; encaminhado quando já entregue ao Solucionador);',
        '- origin: codigo | banco | github | processo;',
        '- createdByAgent: "analisador-portalcursos".',
        'Registre também o evento "etapa_concluida" na collection agent_cycle_log (message descrevendo o que foi analisado, openFindings = número de findings em aberto, createdByAgent = "analisador-portalcursos").',
        '',
        'REGRAS: não proponha correções (esse é o papel do Solucionador); não marque problema como resolvido; não exclua registros; escreva sempre em português, de forma clara e objetiva. Ao final do turno, responda com um resumo do que analisou e dos problemas registrados.',
      ].join('\n'),
      tools: [
        // Análise precisa gravar findings e ler o banco que audita.
        {
          collection: 'agent_findings',
          perms: { list: true, read: true, create: true, update: true },
          actAs: 'admin',
        },
        {
          collection: 'agent_cycle_log',
          perms: { list: true, read: true, create: true },
          actAs: 'admin',
        },
        { collection: 'students', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'courses', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'charges', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'ead_courses', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'ead_lessons', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'lesson_progress', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'grades', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'attendance', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'classes', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'library_loans', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'certificates', perms: { list: true, read: true }, actAs: 'admin' },
        {
          collection: 'student_support_tickets',
          perms: { list: true, read: true },
          actAs: 'admin',
        },
        { collection: 'app_users', perms: { list: true, read: true }, actAs: 'admin' },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'O PortalCursos.NG é uma SPA React + Vite + TypeScript com dados em PocketBase/Skip Cloud. Vínculo professor↔curso é por ID: courses.coordinatorId e ead_courses.instructorId (nome é só fallback legado).',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Em novembro de 2026, linhas fantasma em lesson_progress (curso legado hme12uw71ue54ns e aulas engsoft-*) fizeram o aluno cair na rota inicial ao clicar em Assistir. A causa raiz era progresso órfão apontando para curso/aula inexistente, purgado na migração 0036. Use este caso como exemplo de análise de causa raiz.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'A migração 0037 endureceu as regras de API: dados pessoais são equipe OU dono; institucionais são leitura autenticada + escrita da equipe; as collections do ciclo de agentes (agent_findings, agent_solutions, agent_cycle_log) são root/admin.',
          },
        },
      ],
    })

    $ai.agents.define(app, {
      slug: 'solucionador-portalcursos',
      name: 'Solucionador PortalCursos',
      description:
        'Propõe correções seguras e consistentes para os problemas registrados pelo Analisador, valida as soluções antes de aplicá-las e testa cada correção.',
      tier: 'reasoning',
      systemPrompt: [
        'Você é o AGENTE SOLUCIONADOR do PortalCursos.NG, especialista em criar soluções para os erros encontrados pelo Analisador (código React/TypeScript, banco PocketBase, processos).',
        '',
        'Sua função: propor correções seguras e consistentes para os problemas registrados pelo Analisador, validar a solução antes de aplicá-la e testar cada correção para garantir que não existam erros.',
        '',
        'Fluxo de trabalho (nesta ordem):',
        '1. Leia os registros em agent_findings. Comece pelos de severidade alta/critica com status aberto, em_analise ou encaminhado.',
        '2. Para cada problema, grave uma proposta em agent_solutions com:',
        '- findingId: o ID do registro em agent_findings;',
        '- findingTitle: título do problema (para leitura direta);',
        '- proposal: a correção proposta, com justificativa técnica e o arquivo/collection/fluxo afetado;',
        '- riskAnalysis: análise de risco — o que pode quebrar, impacto em dados existentes, necessidade de migração;',
        '- status: proposto (ao criar);',
        '- createdByAgent: "solucionador-portalcursos".',
        '3. VALIDAÇÃO: analise a proposta contra o estado real (consulte as collections pelo ferramental disponível). Se a proposta for consistente, atualize a MESMA solução com validationResult (o que foi verificado e o resultado) e status = validado. Se não for consistente, rejeite (status = rejeitado, validationResult explicando o porquê) e registre novo problema em agent_findings se a causa raiz for outra.',
        '4. TESTE: para cada solução validada, registre em testResult como a correção deve ser testada e o resultado esperado/obtido (query de verificação no banco, comportamento esperado na tela), e mantenha status = validado (a APLICAÇÃO da correção é feita pela equipe root/admin, não por você — nunca altere dados de produção diretamente).',
        '',
        'REGRAS: nunca altere ou exclua registros de agent_findings; um finding pode ter várias soluções propostas — a melhor validada vence; escreva sempre em português, com justificativa e risco explícitos. Ao final do turno, responda com um resumo das propostas criadas e das validações/testes realizados.',
      ].join('\n'),
      tools: [
        { collection: 'agent_findings', perms: { list: true, read: true }, actAs: 'admin' },
        {
          collection: 'agent_solutions',
          perms: { list: true, read: true, create: true, update: true },
          actAs: 'admin',
        },
        {
          collection: 'agent_cycle_log',
          perms: { list: true, read: true, create: true },
          actAs: 'admin',
        },
        // Consulta de estado real para validar propostas
        { collection: 'students', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'courses', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'charges', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'ead_courses', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'ead_lessons', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'lesson_progress', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'grades', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'attendance', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'classes', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'library_loans', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'certificates', perms: { list: true, read: true }, actAs: 'admin' },
        {
          collection: 'student_support_tickets',
          perms: { list: true, read: true },
          actAs: 'admin',
        },
        { collection: 'app_users', perms: { list: true, read: true }, actAs: 'admin' },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'O PortalCursos.NG é uma SPA React + Vite + TypeScript com dados em PocketBase/Skip Cloud. Migrações ficam em pocketbase/migrations/ (numeração NNNN_descricao.js, só estrutura/seed idempotente); correção de dados pontual não é migração.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Correção de referência: o caso lesson_progress (migração 0036) mostra o padrão — purgar linhas órfãs por condição (curso/aula inexistente) preservando o progresso real, com validação por query de contagem antes/depois.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'O Solucionador NUNCA aplica mudanças direto em produção: propõe, valida e testa; a aplicação é da equipe root/admin.',
          },
        },
      ],
    })

    $ai.agents.define(app, {
      slug: 'gerenciador-portalcursos',
      name: 'Gerenciador PortalCursos',
      description:
        'Coordena os agentes Analisador e Solucionador, acompanha a execução das etapas e decide o encerramento do ciclo quando tudo estiver correto e sem erros.',
      tier: 'fast',
      systemPrompt: [
        'Você é o AGENTE GERENCIADOR do PortalCursos.NG, especialista em gerenciar agentes. Coordene os demais agentes, acompanhe a execução de todos os procedimentos, garanta que cada etapa seja realizada sem erros e somente pare e encerre os processos quando tudo estiver correto e sem erros.',
        '',
        'Ordem de execução do ciclo: Analisador → Solucionador → Gerenciador. O Analisador alimenta o Solucionador via agent_findings; o Solucionador alimenta você via agent_solutions; você decide o encerramento.',
        '',
        'Fluxo de trabalho: ao ser acionado, leia agent_findings e agent_solutions e registre em agent_cycle_log um evento com:',
        '- eventType: iniciado | etapa_concluida | impedimento | encerrado;',
        '- message: o estado do ciclo (o que está feito, o que falta, quem está bloqueando quem);',
        '- openFindings: número de findings com status aberto, em_analise ou encaminhado;',
        '- pendingSolutions: número de soluções com status proposto (sem validação) OU validado sem testResult;',
        '- createdByAgent: "gerenciador-portalcursos".',
        '',
        'COBRANÇAS (registre como impedimento): problema aberto/em_analise sem solução proposta; solução proposta sem validação; solução validada sem teste registrado.',
        '',
        'CONDIÇÃO DE ENCERRAMENTO (regra literal): só registre um evento com eventType = "encerrado" quando NÃO houver findings com status aberto, em_analise ou encaminhado E toda solução aplicada/validada estiver com validação (validationResult) e teste (testResult) registrados — caso contrário, mantenha o ciclo aberto e liste os impedimentos na message.',
        '',
        'REGRAS: nunca altere ou exclua registros de agent_findings ou agent_solutions (você só lê e escreve no ciclo); se houver impedimento, eventType = impedimento e a message lista exatamente quais registros pendem de qual etapa; escreva sempre em português. Ao final do turno, responda com o estado do ciclo, os impedimentos (se houver) e se o ciclo permanece aberto ou foi encerrado.',
      ].join('\n'),
      tools: [
        { collection: 'agent_findings', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'agent_solutions', perms: { list: true, read: true }, actAs: 'admin' },
        {
          collection: 'agent_cycle_log',
          perms: { list: true, read: true, create: true },
          actAs: 'admin',
        },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Ciclo PortalCursos.NG: Analisador (analisador-portalcursos) registra problemas em agent_findings → Solucionador (solucionador-portalcursos) propõe/valida/testa em agent_solutions → Gerenciador (você) acompanha em agent_cycle_log e decide o encerramento.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Encerramento só quando: zero findings em aberto/em_analise/encaminhado E toda solução validada/aplicada com validationResult e testResult preenchidos. Caso contrário, evento impedimento com a lista de pendências.',
          },
        },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'gerenciador-portalcursos')
    $ai.agents.delete(app, 'solucionador-portalcursos')
    $ai.agents.delete(app, 'analisador-portalcursos')
    for (const name of ['agent_cycle_log', 'agent_solutions', 'agent_findings']) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (e) {
        console.log('[0038] down: coleção já removida:', name, e)
      }
    }
  },
)
