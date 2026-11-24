/// <reference path="../pb_data/types.d.ts" />

/**
 * Guarda de foto (campo `avatar`) do cadastro de usuário (v0.0.107).
 *
 * A collection `users` tem regra de update `@request.auth.id != ''`, o que
 * permitiria a qualquer usuário trocar a foto de terceiros pela API de registros.
 * Este hook aplica a mesma regra do fluxo "Alterar":
 *  - self: pode trocar a própria foto;
 *  - root: pode trocar a foto de qualquer um;
 *  - admin: pode trocar a foto de qualquer um, exceto contas root;
 *  - demais perfis em terceiros: 403.
 *
 * REGRAS JSVM (memória do projeto): `const app = $app` dentro do callback;
 * toda a lógica inline no callback.
 */
onRecordUpdateRequest((e) => {
  const app = $app
  const info = e.requestInfo()
  const body = (info && info.body) || {}
  const touchesAvatar =
    Object.prototype.hasOwnProperty.call(body, 'avatar') ||
    Object.prototype.hasOwnProperty.call(body, 'avatarUrl')

  if (!touchesAvatar || !e.auth) {
    return e.next()
  }

  const caller = e.auth
  const isSelf = caller.id === e.record.id
  const callerRole = String(caller.getString('role') || '').toLowerCase()

  if (!isSelf) {
    if (callerRole !== 'root' && callerRole !== 'admin') {
      throw new ForbiddenError('Acesso negado.')
    }
    let targetRole = ''
    try {
      const orig = app.findRecordById('users', e.record.id)
      targetRole = String(orig.getString('role') || '').toLowerCase()
    } catch (_) {}
    if (targetRole === 'root' && callerRole !== 'root') {
      throw new ForbiddenError('Somente o perfil Root pode alterar a foto de outro Root.')
    }
  }

  return e.next()
}, 'users')
