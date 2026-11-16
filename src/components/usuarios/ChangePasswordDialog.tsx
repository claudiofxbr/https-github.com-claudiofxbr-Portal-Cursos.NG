import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  changeUserPassword,
  fetchUserActiveSessions,
  revokeUserSessions,
  validatePasswordComplexity,
  type UserSessionInfo,
} from '@/lib/portalDb'
import type { UserAccount } from '@/types/portal'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/portal'

const ROLE_LABELS: Record<string, string> = {
  root: 'Super Administrador (Root)',
  admin: 'Administrador(a) Geral',
  secretaria: 'Chefe de Secretaria Geral',
  financeiro: 'Gestor(a) Financeiro',
  academico: 'Pró-Reitor(a) Acadêmico',
  matricula: 'Analista de Matrículas',
  coordenador: 'Coordenador(a) de Curso',
  professor: 'Docente Permanente',
  aluno: 'Aluno(a) Regular',
}

const ROLE_BADGE_STYLES: Partial<Record<UserRole, string>> = {
  root: 'bg-red-500/15 text-red-300 border border-red-500/30',
  admin: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  secretaria: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  financeiro: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  academico: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  matricula: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
  coordenador: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
  professor: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  aluno: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',
}

export interface ChangePasswordDialogProps {
  user: UserAccount | null
  currentUser: UserAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPasswordChanged?: (user: UserAccount) => void
}

const GENERIC_ERROR = 'Não foi possível concluir a operação. Tente novamente.'

export function ChangePasswordDialog({
  user,
  currentUser,
  open,
  onOpenChange,
  onPasswordChanged,
}: ChangePasswordDialogProps) {
  const { toast } = useToast()

  const isSelf = !!user && !!currentUser && user.id === currentUser.id
  // Reset administrativo: root/admin alterando OUTRO usuário — sem senha atual.
  const needsCurrentPassword = isSelf
  // Sessões: qualquer perfil pode ver/revogar as PRÓPRIAS; root qualquer; admin exceto root.
  const callerRole = currentUser?.role
  const canManageSessions =
    !!user &&
    !!callerRole &&
    (callerRole === 'root' ||
      (callerRole === 'admin' && user.role !== 'root') ||
      user.id === currentUser?.id)
  const canViewSessions = !!user && !!currentUser && (isSelf || canManageSessions)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [sessions, setSessions] = useState<UserSessionInfo[] | null>(null)
  const [loadingSessions, setLoadingSessions] = useState(false)

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setFieldErrors({})
    setFormError('')
    setSaving(false)
    setConfirmRevokeOpen(false)
    setRevoking(false)
  }

  useEffect(() => {
    if (open) {
      resetForm()
      setSessions(null)
      setLoadingSessions(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id])

  // Carrega as sessões ativas do usuário alvo ao abrir (se permitido).
  useEffect(() => {
    if (!open || !user || !canViewSessions) {
      return
    }
    let active = true
    setLoadingSessions(true)
    fetchUserActiveSessions(user.id)
      .then((items) => {
        if (active) setSessions(items)
      })
      .catch(() => {
        if (active) setSessions(null)
      })
      .finally(() => {
        if (active) setLoadingSessions(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, canViewSessions])

  const complexityError = useMemo(() => validatePasswordComplexity(newPassword), [newPassword])
  const matchError =
    confirmPassword && newPassword !== confirmPassword ? 'As senhas não coincidem.' : null

  if (!user || !currentUser) return null

  const handleSave = async () => {
    const errors: Record<string, string> = {}

    if (needsCurrentPassword && !currentPassword.trim()) {
      errors.currentPassword = 'A senha atual é obrigatória.'
    }
    const complexity = validatePasswordComplexity(newPassword)
    if (complexity) errors.newPassword = complexity
    if (!confirmPassword) {
      errors.confirmPassword = 'A confirmação da nova senha é obrigatória.'
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem.'
    }

    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length > 0) return

    if (needsCurrentPassword && newPassword === currentPassword) {
      setFormError('A nova senha deve ser diferente da senha atual.')
      return
    }

    setSaving(true)
    try {
      const result = await changeUserPassword({
        targetUserId: user.id,
        currentPassword: needsCurrentPassword ? currentPassword : undefined,
        newPassword,
        confirmPassword,
      })
      toast({
        title: 'Senha alterada',
        description: result.message || 'Operação concluída com sucesso.',
      })
      onPasswordChanged?.(user)
      resetForm()
      onOpenChange(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : GENERIC_ERROR)
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    if (!user) return
    setRevoking(true)
    try {
      const result = await revokeUserSessions(user.id)
      toast({
        title: 'Sessões revogadas',
        description: result.message,
      })
      setSessions((prev) => (prev ? [] : prev))
      setConfirmRevokeOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : GENERIC_ERROR)
      setConfirmRevokeOpen(false)
    } finally {
      setRevoking(false)
    }
  }

  const roleLabel = ROLE_LABELS[user.role] || user.role

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? undefined : onOpenChange(false))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {isSelf ? 'Alterar minha senha' : `Alterar senha — ${user.name}`}
            </DialogTitle>
            <DialogDescription>
              {isSelf
                ? 'Informe sua senha atual e defina uma nova senha.'
                : 'Defina uma nova senha para este usuário. Ele fará login com ela no próximo acesso.'}
            </DialogDescription>
          </DialogHeader>

          {/* Dados do usuário selecionado — somente leitura */}
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  ROLE_BADGE_STYLES[user.role] || '',
                )}
              >
                {roleLabel}
              </span>
            </div>
          </div>

          {formError ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-4">
            {needsCurrentPassword && (
              <div className="space-y-2">
                <Label htmlFor="chp-current">Senha atual</Label>
                <Input
                  id="chp-current"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                />
                {fieldErrors.currentPassword ? (
                  <p className="text-sm text-destructive">{fieldErrors.currentPassword}</p>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="chp-new">Nova senha</Label>
              <div className="relative">
                <Input
                  id="chp-new"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mín. 8 caracteres, com maiúscula, minúscula, número e símbolo"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.newPassword ? (
                <p className="text-sm text-destructive">{fieldErrors.newPassword}</p>
              ) : complexityError && newPassword ? (
                <p className="text-xs text-muted-foreground">{complexityError}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chp-confirm">Confirmar nova senha</Label>
              <Input
                id="chp-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
              {fieldErrors.confirmPassword ? (
                <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
              ) : matchError ? (
                <p className="text-sm text-destructive">{matchError}</p>
              ) : null}
            </div>

            {/* Sessões ativas e revogação ("remover" no contexto de senha) */}
            {canViewSessions && (
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Sessões ativas
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {loadingSessions
                        ? 'Carregando…'
                        : sessions
                          ? `${sessions.length} sessão(ões) ativa(s) neste momento.`
                          : 'Não foi possível consultar as sessões.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={revoking || loadingSessions}
                    onClick={() => setConfirmRevokeOpen(true)}
                  >
                    {revoking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Revogar sessões
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Requisitos: mínimo de 8 caracteres, uma letra maiúscula, uma minúscula, um número e um
              símbolo.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação explícita antes de revogar sessões */}
      <Dialog
        open={open && confirmRevokeOpen}
        onOpenChange={(next) => (next ? undefined : setConfirmRevokeOpen(false))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revogar sessões ativas?</DialogTitle>
            <DialogDescription>
              {isSelf
                ? 'Você será desconectado e precisará entrar novamente.'
                : `${user?.name || 'O usuário'} será desconectado de todos os dispositivos e fará novo login.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRevokeOpen(false)}
              disabled={revoking}
            >
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Revogar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
