import PocketBase from 'pocketbase'

// Host do backend real do projeto (rotas nativas em /api/* e customizadas em /backend/v1/*).
// Sem uma base URL explícita o SDK usa "/" (origem da página de preview, estática), e
// todas as chamadas — login, refresh, logout e dados — iam para o host errado (405).
const BACKEND_FALLBACK_URL = 'https://aplicativo-de-analise-pdf-7c892.shrd01.internal.goskip.dev'

const configuredUrl = String(import.meta.env.VITE_POCKETBASE_URL || '').trim()
export const POCKETBASE_BASE_URL = (configuredUrl || BACKEND_FALLBACK_URL).replace(/\/$/, '')

const pb = new PocketBase(POCKETBASE_BASE_URL)
pb.autoCancellation(false)

export default pb
