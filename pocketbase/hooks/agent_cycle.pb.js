/// <reference path="../pb_data/types.d.ts" />

/**
 * Agentes nativos do PortalCursos.NG — proxy de chat + visão geral do ciclo.
 *
 * Os 3 agentes são definidos declarativamente na migração 0038
 * ($ai.agents.define: analisador-portalcursos, solucionador-portalcursos,
 * gerenciador-portalcursos). Este hook apenas EXPÕE a Chat API nativa
 * ($ai.agent(slug).chat) ao app, com duas garantias:
 *
 * 1. Autenticação real (token PocketBase via requireAuth) E perfil root/admin —
 *    as collections do ciclo (agent_findings, agent_solutions, agent_cycle_log)
 *    já são root/admin na migração 0038; nada aqui amplia isso.
 * 2. Nenhuma lógica de agente é reimplementada: o hook só repassa a mensagem
 *    ao agente nativo persistente (com memória e ferramentas definidas nele).
 *
 * NOTA JSVM: declarações de topo NÃO são visíveis dentro dos callbacks de rota
 * (pool de VMs separado) — toda a lógica fica inline em cada callback.
 */

routerAdd(
  'GET',
  '/backend/v1/agents/overview',
  (e) => {
    // --- inline helpers (JSVM: nada de topo entra no callback) ---
    const isAdmin = (function () {
      try {
        const role = e.auth ? e.auth.getString('role') : ''
        return role === 'root' || role === 'admin'
      } catch (_) {
        return false
      }
    })()

    const stripHtml = (s) =>
      String(s || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()

    if (!isAdmin) {
      return e.json(403, { error: 'Acesso restrito aos perfis root/admin.' })
    }

    const openStatuses = ['aberto', 'em_analise', 'encaminhado']
    let openFindings = 0
    let totalFindings = 0
    try {
      totalFindings = app.findRecordsByFilter('agent_findings', '', '-created', 500, 0).length
    } catch (_) {}
    try {
      for (const st of openStatuses) {
        openFindings += app.findRecordsByFilter(
          'agent_findings',
          'status = "' + st + '"',
          '-created',
          500,
          0,
        ).length
      }
    } catch (_) {}

    let pendingSolutions = 0
    let totalSolutions = 0
    try {
      totalSolutions = app.findRecordsByFilter('agent_solutions', '', '-created', 500, 0).length
    } catch (_) {}
    try {
      const proposed = app.findRecordsByFilter(
        'agent_solutions',
        'status = "proposto"',
        '-created',
        500,
        0,
      )
      pendingSolutions += proposed.length
      const validated = app.findRecordsByFilter(
        'agent_solutions',
        'status = "validado"',
        '-created',
        500,
        0,
      )
      for (const s of validated) {
        if (!s.getString('testResult')) pendingSolutions++
      }
    } catch (_) {}

    const events = []
    try {
      const rows = app.findRecordsByFilter('agent_cycle_log', '', '-created', 20, 0)
      for (const r of rows) {
        events.push({
          id: r.id,
          eventType: r.getString('eventType'),
          message: stripHtml(r.getString('message')),
          openFindings: r.getInt('openFindings'),
          pendingSolutions: r.getInt('pendingSolutions'),
          createdByAgent: r.getString('createdByAgent'),
          created: r.getString('created'),
        })
      }
    } catch (_) {}

    return e.json(200, {
      agents: [
        {
          slug: 'analisador-portalcursos',
          name: 'Analisador PortalCursos',
          role: 'Análise de código, banco de dados e GitHub',
          order: 1,
        },
        {
          slug: 'solucionador-portalcursos',
          name: 'Solucionador PortalCursos',
          role: 'Propor, validar e testar correções',
          order: 2,
        },
        {
          slug: 'gerenciador-portalcursos',
          name: 'Gerenciador PortalCursos',
          role: 'Coordenação do ciclo e decisão de encerramento',
          order: 3,
        },
      ],
      cycle: {
        openFindings,
        pendingSolutions,
        totalFindings,
        totalSolutions,
        closed:
          openFindings === 0 && pendingSolutions === 0 && totalFindings > 0 && totalSolutions > 0,
      },
      events,
    })
  },
  $apis.requireAuth(),
)

// Chat com um agente nativo: repassa a mensagem ao $ai.agent(slug).chat().
// Não-streaming de propósito: campo de conversa simples na tela Agentes.
routerAdd(
  'POST',
  '/backend/v1/agents/chat',
  (e) => {
    const isAdmin = (function () {
      try {
        const role = e.auth ? e.auth.getString('role') : ''
        return role === 'root' || role === 'admin'
      } catch (_) {
        return false
      }
    })()

    if (!isAdmin) {
      return e.json(403, { error: 'Acesso restrito aos perfis root/admin.' })
    }

    const body = e.requestInfo().body || {}
    const slug = String(body.slug || '')
    const message = String(body.message || '').trim()

    const allowed = [
      'analisador-portalcursos',
      'solucionador-portalcursos',
      'gerenciador-portalcursos',
    ]
    if (allowed.indexOf(slug) === -1) {
      return e.json(400, { error: 'Agente desconhecido: ' + slug })
    }
    if (!message) {
      return e.json(400, { error: 'Mensagem vazia.' })
    }
    if (message.length > 4000) {
      return e.json(400, { error: 'Mensagem muito longa (máx. 4000 caracteres).' })
    }

    try {
      const result = $ai.agent(slug).chat({ message })
      return e.json(200, {
        content: result.content || '',
        conversation_id: result.conversation_id || '',
        message_id: result.message_id || '',
        tool_calls: result.tool_calls || [],
      })
    } catch (err) {
      console.log('[AgentsChat] falha no agente ' + slug + ':', err)
      return e.json(502, {
        error:
          'O agente não respondeu. Verifique o painel Skip Cloud (agentes/credits) e tente novamente.',
      })
    }
  },
  $apis.requireAuth(),
)
