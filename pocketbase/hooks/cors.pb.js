/// <reference path="../pb_data/types.d.ts" />

/**
 * CORS com credenciais para as rotas /backend/v1/auth/* do PortalCursos.NG.
 *
 * PROBLEMA: o frontend (https://aplicativo-de-analise-pdf-7c892--preview.goskip.app
 * e https://aplicativo-de-analise-pdf-7c892.goskip.app) chama /backend/v1/auth/*
 * com fetch credentials:'include' (cookie HttpOnly do refresh token). O middleware
 * CORS padrão do PocketBase (pbCors, AllowOrigins ["*"]) respondia
 * "Access-Control-Allow-Origin: *" e os navegadores recusam wildcard quando o modo
 * de credenciais é "include" — o preflight falhava, o fetch morria com
 * "Failed to fetch" e a UI exibia "Credenciais inválidas" mesmo com senha correta.
 *
 * SOLUÇÃO: middleware GLOBAL via routerUse() registrado no NÍVEL SUPERIOR do
 * arquivo (executa uma vez no carregamento; é o mecanismo correto no runtime —
 * onServe não existe no JSVM e rotas duplicadas colidem na inicialização).
 * A prioridade -2000 executa ANTES do pbCors (DefaultCorsMiddlewarePriority =
 * ActivityLogger - 1, ~-1040). Para origens permitidas o middleware ecoa o valor
 * EXATO do header Origin (nunca "*"), define Access-Control-Allow-Credentials: true
 * e responde o preflight OPTIONS com 204 + Allow-Methods/Allow-Headers.
 * Para requisições reais, remove o header Origin da requisição logo após validá-lo,
 * impedindo que o pbCors sobrescreva o cabeçalho com o wildcard. Se o pbCors ainda
 * assim definir "*" (ex.: del de header indisponível), um middleware de prioridade
 * 9999 restaura o eco correto usando a origem validada gravada em e.set().
 *
 * NOTA JSVM: toda a lógica fica INLINE nos callbacks — declarações de topo não
 * são visíveis dentro dos callbacks no pool de VMs separado.
 */

// Prioridade menor executa antes; pbCors é ~-1040.
const PORTAL_CORS_PRIORITY = -2000
const PORTAL_CORS_ID = 'portal_cors_session'
const PORTAL_CORS_FIXUP_PRIORITY = 9999
const PORTAL_CORS_FIXUP_ID = 'portal_cors_fixup'

// ------------------- MIDDLEWARE PRINCIPAL (antes do pbCors) -------------------
try {
  routerUse(
    new Middleware(
      (e) => {
        // --- lê o header Origin (com fallback via requestInfo, se necessário) ---
        let origin = ''
        try {
          origin = String(e.request.header.get('Origin') || '')
        } catch (_) {}
        if (!origin) {
          try {
            const headers = e.requestInfo().headers || {}
            origin = String(headers['origin'] || '')
          } catch (_) {}
        }

        // Sem Origin (curl, health-check, mesma origem): nada a fazer.
        if (!origin) {
          return e.next()
        }

        // --- valida a origem por sufixo (sem usar URL: não existe no goja) ---
        const originLower = origin.toLowerCase()
        let host = ''
        const hostMatch = /^https?:\/\/([^\/?#]+)/.exec(originLower)
        if (hostMatch) {
          host = hostMatch[1]
        }
        const isGoskipApp = host.endsWith('.goskip.app')
        const isLocalDev = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
        if (!isGoskipApp && !isLocalDev) {
          // Origem não permitida: segue SEM cabeçalhos CORS (o navegador bloqueia).
          return e.next()
        }

        // --- origem permitida: ecoa o valor exato, NUNCA "*" ---
        try {
          e.set('portal_cors_origin', origin)
        } catch (_) {}
        const resHeader = e.response.header()
        resHeader.set('Access-Control-Allow-Origin', origin)
        resHeader.set('Access-Control-Allow-Credentials', 'true')
        resHeader.set('Vary', 'Origin')
        resHeader.set('Access-Control-Max-Age', '600')

        const method = String(e.request.method || '').toUpperCase()
        if (method === 'OPTIONS') {
          let reqMethod = ''
          let reqHeaders = ''
          try {
            reqMethod = String(e.request.header.get('Access-Control-Request-Method') || '')
            reqHeaders = String(e.request.header.get('Access-Control-Request-Headers') || '')
          } catch (_) {}

          resHeader.set(
            'Access-Control-Allow-Methods',
            reqMethod ? reqMethod.toUpperCase() : 'GET, HEAD, POST, OPTIONS',
          )
          resHeader.set('Access-Control-Allow-Headers', reqHeaders || 'Content-Type, Authorization')

          // Preflight resolvido aqui: interrompe a cadeia ANTES do pbCors e da rota.
          try {
            return e.noContent(204)
          } catch (_) {
            return e.json(204, '')
          }
        }

        // Requisição real: remove o Origin da requisição para que o pbCors (que
        // ignora requisições sem Origin) não sobrescreva o cabeçalho com "*".
        try {
          e.request.header.del('Origin')
        } catch (_) {}

        return e.next()
      },
      PORTAL_CORS_PRIORITY,
      PORTAL_CORS_ID,
    ),
  )
} catch (regErr) {
  console.log('[PortalCors] middleware de eco de origem não registrado:', regErr)
}

// ---------------- REDE DE SEGURANÇA (executa DEPOIS do pbCors) ----------------
// Se por qualquer motivo o pbCors ainda sobrescreveu Access-Control-Allow-Origin
// com "*" (ex.: del de header indisponível no JSVM), restaura o eco correto da
// origem com credenciais — navegadores recusam wildcard com credentials "include".
try {
  routerUse(
    new Middleware(
      (e) => {
        // Deixa a cadeia inteira rodar (rota + pbCors) e então corrige os
        // headers da resposta, quando já estão definidos.
        const chainResult = e.next()

        const resHeader = e.response.header()
        let acao = ''
        try {
          acao = String(resHeader.get('Access-Control-Allow-Origin') || '')
        } catch (_) {}
        if (acao !== '*') {
          return chainResult
        }
        // Origem que o middleware principal validou e gravou no request store.
        let validated = ''
        try {
          validated = String(e.get('portal_cors_origin') || '')
        } catch (_) {}
        if (!validated) {
          return chainResult
        }
        try {
          resHeader.set('Access-Control-Allow-Origin', validated)
          resHeader.set('Access-Control-Allow-Credentials', 'true')
          resHeader.set('Vary', 'Origin')
        } catch (_) {}
        return chainResult
      },
      PORTAL_CORS_FIXUP_PRIORITY,
      PORTAL_CORS_FIXUP_ID,
    ),
  )
} catch (fixErr) {
  console.log('[PortalCors] middleware de rede de segurança não registrado:', fixErr)
}
