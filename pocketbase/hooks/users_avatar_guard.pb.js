/// <reference path="../pb_data/types.d.ts" />

/**
 * Guarda de foto (campo `avatar`) do cadastro de usuário (v0.0.111).
 *
 * A collection `users` tem regra de update `@request.auth.id != ''`, o que
 * permitiria a qualquer usuário trocar a foto de terceiros pela API de registros.
 * Este hook aplica a mesma regra do fluxo "Alterar":
 *  - self: pode trocar a própria foto;
 *  - root: pode trocar a foto de qualquer um;
 *  - admin: pode trocar a foto de qualquer um, exceto contas root;
 *  - demais perfis em terceiros: 403.
 *
 * Considera "tocar a foto" quando o corpo traz a chave `avatar` (upload,
 * troca ou remoção) ou quando o valor do campo muda em relação ao gravado.
 *
 * REGRAS JSVM (memória do projeto): `const app = $app` dentro do callback;
 * toda a lógica inline no callback.
 */
onRecordUpdateRequest((e) => {
  const app = $app
  const info = e.requestInfo()
  const body = (info && info.body) || {}
  const caller = e.auth
  if (!caller) {
    return e.next()
  }

  let original = null
  try {
    original = app.findRecordById('users', e.record.id)
  } catch (_) {}
  if (!original) {
    return e.next()
  }

  const hasAvatarKey = Object.prototype.hasOwnProperty.call(body, 'avatar')
  const beforeAvatar = String(original.getString('avatar') || '')
  const afterAvatar = String(e.record.getString('avatar') || '')
  if (!hasAvatarKey && beforeAvatar === afterAvatar) {
    return e.next()
  }

  const isSelf = caller.id === e.record.id
  if (!isSelf) {
    const callerRole = String(caller.getString('role') || '').toLowerCase()
    if (callerRole !== 'root' && callerRole !== 'admin') {
      throw new ForbiddenError('Acesso negado.')
    }
    const targetRole = String(original.getString('role') || '').toLowerCase()
    if (targetRole === 'root' && callerRole !== 'root') {
      throw new ForbiddenError('Somente o perfil Root pode alterar a foto de outro Root.')
    }
  }

  return e.next()
}, 'users')
