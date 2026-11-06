/**
 * Gerador de identificadores únicos robusto.
 *
 * `Date.now().toString().slice(-4)` colide com facilidade (duas ações no mesmo
 * segundo, reload, múltiplas abas). Preferimos `crypto.randomUUID()` quando o
 * navegador disponibiliza (contexto seguro), com fallback para um gerador de
 * timestamp + aleatoriedade criptográfica.
 */
export function generateId(prefix = 'id'): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') {
    return `${prefix}-${c.randomUUID()}`
  }

  // Fallback: timestamp + bytes aleatórios hexadecimais (16 caracteres).
  let random = ''
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(8)
    c.getRandomValues(bytes)
    random = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  } else {
    random = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  }
  return `${prefix}-${Date.now().toString(36)}-${random}`
}
