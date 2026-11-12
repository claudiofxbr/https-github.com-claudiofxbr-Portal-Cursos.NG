import PocketBase, { BaseAuthStore } from 'pocketbase'

// Limpeza única e imediata de resquícios de tokens ou credenciais em localStorage
// Conforme SPEC-INIT-001: credenciais e tokens nunca devem residir em armazenamento persistente
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (
        key &&
        (key === 'pocketbase_auth' ||
          key.startsWith('pb_') ||
          key.startsWith('portal_') ||
          key.startsWith('portalcursos_current_user'))
      ) {
        keysToRemove.push(key)
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k)
    }
  }
} catch {
  // Ignora erros caso localStorage esteja indisponível ou bloqueado
}

// AuthStore estritamente em memória: não persiste no localStorage nem em cookies via client JS.
// O access token vive apenas na memória do processo (apagado em F5/fechamento de aba/crash).
// O refresh token reside no cookie HttpOnly gerenciado pelo servidor sob /backend/v1/auth/*.
// AuthStore estritamente em memória: BaseAuthStore do PocketBase SDK
// mantém token e record em propriedades da classe sem gravar em localStorage nem cookies.
// Ao fechar a aba ou dar F5, o token é descartado da memória da aplicação.
const memoryAuthStore = new BaseAuthStore()
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL, memoryAuthStore)
pb.autoCancellation(false)

export default pb
