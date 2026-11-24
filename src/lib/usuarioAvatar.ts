import pb from '@/lib/pocketbase/client'

/**
 * Inclui, troca ou remove (file = null) a foto do usuário no campo `avatar`
 * da collection `users`. As regras de quem pode alterar são aplicadas pela
 * guarda do backend (pocketbase/hooks/users_avatar_guard.pb.js).
 */
export async function updateUserAvatar(userId: string, file: File | null): Promise<void> {
  const body = new FormData()
  body.append('avatar', file ?? '')
  try {
    await pb.collection('users').update(userId, body)
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 403) throw new Error('Acesso negado para alterar a foto deste usuário.')
    if (status === 413) throw new Error('Arquivo muito grande: o limite é 5 MB.')
    throw new Error('Não foi possível salvar a foto. Tente novamente.')
  }
}
