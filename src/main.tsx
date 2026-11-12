/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { logoutAuth } from './lib/portalDb'

/**
 * SPEC-INIT-001 Handler global de crash:
 * window.onerror e window.onunhandledrejection registrados no bootstrap do app.
 * Em falha fatal não capturada por boundaries locais, cumpre o contrato:
 * descarta a sessão em memória e os armazenamentos locais para evitar estados zumbis.
 */
window.addEventListener('error', (event) => {
  console.error(
    '[SPEC-INIT-001 Global Crash Handler] uncaught error:',
    event.error || event.message,
  )
  try {
    logoutAuth().catch(() => {})
    sessionStorage.clear()
  } catch {
    // silencioso
  }
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[SPEC-INIT-001 Global Crash Handler] unhandled promise rejection:', event.reason)
  // Rejeições de rede comuns (ex. 401 durante refresh) não devem derrubar a aplicação
})

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
