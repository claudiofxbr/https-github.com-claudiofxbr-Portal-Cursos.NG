/// <reference path="../pb_data/types.d.ts" />

/**
 * CORS com credenciais para o PortalCursos.NG (correção pós-v0.0.88)
 *
 * PROBLEMA: o frontend (https://aplicativo-de-analise-pdf-7c892--preview.goskip.app
 * e https://aplicativo-de-analise-pdf-7c892.goskip.app) chama as rotas
 * /backend/v1/auth/* com fetch credentials: 'include' (necessário para o cookie
 * HttpOnly do refresh token). O middleware CORS PADRÃO do PocketBase (id "pbCors",
 * registrado pelo apis.Serve com AllowOrigins: ["*"] ANTES dos hooks OnServe)
 * respondia "Access-Control-Allow-Origin: *", e navegadores recusam wildcard
 * quando o modo de credenciais é "include". O preflight OPTIONS falhava, o fetch
 * morria com "Failed to fetch" e a UI exibia "Credenciais inválidas" —
 * mesmo com email/senha corretos.
 *
 * SOLUÇÃO (3 camadas de defesa):
 *  1. Middleware global "portal_cors_session" com prioridade -2000 (o pbCors é
 *     -1041; prioridade menor executa antes): valida a origem por sufixo
 *     ".goskip.app" (preview + produção) e localhost para dev; para origens
 *     permitidas ecoa o PRÓPRIO valor de Origin (nunca "*") com
 *     "Access-Control-Allow-Credentials: true" e "Vary: Origin"; responde o
 *     preflight OPTIONS com 204 + Access-Control-Allow-Methods/Headers.
 *  2. Para requisições reais (não-preflight) remove o header Origin da
 *     requisição logo após usá-lo — sem Origin, o pbCors ignora a requisição
 *     e NÃO sobrescreve "Access-Control-Allow-Origin" com "*".
 *  3. No onServe, remove o middleware pbCors do router (higiene; se não
 *     estiver disponível no JSVM, as camadas 1 e 2 já bastam).
 *
 * NÃO altera a arquitetura de sessão: access token em memória, refresh em
 * cookie HttpOnly (Set-Cookie segue sendo definido pelos handlers em
 * auth_session.pb.js; os cabeçalhos CORS aqui não removem Set-Cookie),
 * rotação no servidor e collection auth_sessions permanecem intactos.
 *
 * NOTA JSVM: toda a lógica fica INLINE nos callbacks (declarações de topo não
 * são visíveis dentro dos callbacks no pool de VMs separado).
 */

// Prioridade menor executa antes; pbCors é -1041.
const PORTAL_CORS_PRIORITY = -2000
const PORTAL_CORS_ID = 'portal_cors_session'

// Registra o middleware de eco de origem. try/catch no NÍVEL DE ARQUIVO:
// se `new Middleware`/`routerUse` não existir nesta build do JSVM, logamos e
// seguimos sem derrubar o carregamento dos demais hooks (login continua
// funcionando pela rota nativa).
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
            reqMethod ? reqMethod.toUpperCase() : 'GET,HEAD,PUT,PATCH,POST,DELETE',
          )
          resHeader.set('Access-Control-Allow-Headers', reqHeaders || 'Content-Type, Authorization')

          // Preflight resolvido aqui: interrompe a cadeia ANTES do pbCors e da rota.
          try {
            return e.noContent(204)
          } catch (_) {
            return e.json(200, '')
          }
        }

        // Requisição real: remove o Origin da requisição para que o pbCors (se
        // ainda registrado) não sobrescreva o cabeçalho com "*".
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

// Higiene: remove o middleware CORS padrão do PocketBase (best-effort).
try {
  onServe((e) => {
    try {
      e.router.unbind('pbCors')
    } catch (err) {
      console.log('[PortalCors] unbind de pbCors indisponível neste JSVM:', err)
    }
    return e.next()
  })
} catch (serveErr) {
  console.log('[PortalCors] onServe de higiene não registrado:', serveErr)
}

// Rede de segurança: middleware de prioridade MÁXIMA (executa por último,
// DEPOIS do pbCors). Se por qualquer motivo o pbCors ainda sobrescreveu
// Access-Control-Allow-Origin com "*" (ex.: del de header indisponível no
// JSVM), restaura o eco correto da origem com credenciais — os navegadores
// recusam wildcard quando credentials mode é "include".
try {
  routerUse(
    new Middleware(
      (e) => {
        // Deixa a cadeia inteira rodar (rota + pbCors) e só entao corrige os
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
        // Descobre a origem que o portal já validou salvando-a no request store
        // pelo middleware de prioridade -2000 (chave 'portal_cors_origin').
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
      9999,
      'portal_cors_fixup',
    ),
  )
} catch (fixErr) {
  console.log('[PortalCors] middleware de rede de segurança não registrado:', fixErr)
}
