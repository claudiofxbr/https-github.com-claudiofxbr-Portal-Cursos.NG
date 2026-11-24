import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, UserCog, Info, ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateAppUser, type UpdateUserResult } from '@/lib/portalDb'
import type { UserAccount } from '@/types/portal'

const USER_ROLES = [
  { value: 'root', label: 'Root' },
  { value: 'admin', label: 'Admin' },
  { value: 'secretaria', label: 'Secretaria' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'academico', label: 'Acadêmico' },
  { value: 'matricula', label: 'Matrícula' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'professor', label: 'Professor' },
  { value: 'aluno', label: 'Aluno' },
] as const

const USER_STATUSES = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'bloqueado', label: 'Bloqueado' },
] as const

const editUserSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.').max(150, 'Máximo de 150 caracteres.'),
  email: z.string().min(1, 'O e-mail é obrigatório.').email('Formato de e-mail inválido.'),
  roleTitle: z.string().max(100, 'Máximo de 100 caracteres.'),
  department: z.string().max(150, 'Máximo de 150 caracteres.'),
  phone: z.string().max(30, 'Máximo de 30 caracteres.'),
  cpf: z
    .string()
    .max(20, 'Máximo de 20 caracteres.')
    .refine((v) => !v || v.replace(/\D/g, '').length <= 11, 'CPF inválido (mais de 11 dígitos).'),
  role: z.string(),
  status: z.string(),
})

export type EditUserFormValues = z.infer<typeof editUserSchema>

export interface EditUserDialogProps {
  user: UserAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Perfil de quem edita: 'root' libera papel/status de terceiros. */
  canEditRoleStatus: boolean
  /** true quando o usuário logado edita o próprio cadastro. */
  isSelf: boolean
  onSaved: (updated: UpdateUserResult['user']) => void
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  canEditRoleStatus,
  isSelf,
  onSaved,
}: EditUserDialogProps) {
  const [serverError, setServerError] = useState('')
  const [errorField, setErrorField] = useState('')
  const [savedEmail, setSavedEmail] = useState('')
  const [confirmStep, setConfirmStep] = useState(false)
  const [pendingValues, setPendingValues] = useState<EditUserFormValues | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: '',
      email: '',
      roleTitle: '',
      department: '',
      phone: '',
      cpf: '',
      role: '',
      status: '',
    },
  })

  const role = watch('role')
  const status = watch('status')

  useEffect(() => {
    if (open && user) {
      reset({
        name: user.name || '',
        email: user.email || '',
        roleTitle: user.roleTitle || '',
        department: user.department || '',
        phone: user.phone || '',
        cpf: user.cpf || '',
        role: user.role || '',
        status: user.status || 'ativo',
      })
      setServerError('')
      setErrorField('')
      setSavedEmail('')
      setConfirmStep(false)
      setPendingValues(null)
    }
  }, [open, user, reset])

  // Papel/status só são exibidos quando o logado pode editá-los (root em
  // terceiros). O backend nega sempre de qualquer forma.
  const showRoleStatus = canEditRoleStatus && !isSelf

  // Confirmação exigida quando a edição afeta terceiros ou muda papel/status.
  const needsConfirm = !isSelf || showRoleStatus

  const doSubmit = async (values: EditUserFormValues) => {
    if (!user) return
    setServerError('')
    setErrorField('')
    setSavedEmail('')
    try {
      const resp = await updateAppUser({
        targetUserId: user.id,
        name: values.name.trim(),
        email: values.email.trim(),
        roleTitle: values.roleTitle.trim(),
        department: values.department.trim(),
        phone: values.phone.trim(),
        cpf: values.cpf.trim(),
        role: showRoleStatus ? values.role : '',
        status: showRoleStatus ? values.status : '',
      })
      setSavedEmail(values.email.trim())
      onSaved(resp.user || null)
      setTimeout(() => onOpenChange(false), 1200)
    } catch (err) {
      const e = err as Error & { field?: string }
      setServerError(e.message || 'Falha ao salvar os dados.')
      setErrorField(e.field || '')
      setConfirmStep(false)
      setPendingValues(null)
    }
  }

  const onSubmit = (values: EditUserFormValues) => {
    if (needsConfirm) {
      setPendingValues(values)
      setConfirmStep(true)
      return
    }
    void doSubmit(values)
  }

  const confirmSummary = (() => {
    if (!user || !pendingValues) return ''
    const parts: string[] = []
    if (pendingValues.name.trim() !== user.name) parts.push('nome')
    if (pendingValues.email.trim().toLowerCase() !== (user.email || '').toLowerCase())
      parts.push('e-mail')
    if (pendingValues.roleTitle.trim() !== (user.roleTitle || '')) parts.push('cargo')
    if (pendingValues.department.trim() !== (user.department || '')) parts.push('departamento')
    if (pendingValues.phone.trim() !== (user.phone || '')) parts.push('telefone')
    if (pendingValues.cpf.trim() !== (user.cpf || '')) parts.push('CPF')
    if (showRoleStatus && pendingValues.role !== user.role) parts.push('perfil de acesso')
    if (showRoleStatus && pendingValues.status !== (user.status || 'ativo')) parts.push('status')
    return parts.join(', ')
  })()

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {!confirmStep ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-400" />
                Alterar dados do usuário
              </DialogTitle>
              <DialogDescription>
                {isSelf
                  ? 'Você está editando o seu próprio cadastro. A senha é alterada pelo botão "Alterar senha".'
                  : `Editando o cadastro de ${user.name}. A senha é alterada pelo botão "Alterar senha".`}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="edit-user-name">
                  Nome completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-user-name"
                  placeholder="Nome completo do usuário"
                  aria-invalid={!!errors.name || errorField === 'name'}
                  className={cn(
                    'bg-slate-900 border-slate-700 text-white',
                    (errors.name || errorField === 'name') && 'border-red-500',
                  )}
                  {...register('name')}
                />
                {(errors.name || errorField === 'name') && (
                  <p className="text-xs text-red-400">{errors.name?.message || serverError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-user-email">
                  E-mail <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-user-email"
                  type="email"
                  placeholder="email@instituicao.br"
                  aria-invalid={!!errors.email || errorField === 'email'}
                  className={cn(
                    'bg-slate-900 border-slate-700 text-white',
                    (errors.email || errorField === 'email') && 'border-red-500',
                  )}
                  {...register('email')}
                />
                {(errors.email || errorField === 'email') && (
                  <p className="text-xs text-red-400">{errors.email?.message || serverError}</p>
                )}
                <p className="text-[11px] text-slate-500">
                  Alterar o e-mail exige novo login com o novo endereço (as sessões do usuário são
                  revogadas e o acesso fica registrado na Auditoria do Aplicativo).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-roletitle">Cargo</Label>
                  <Input
                    id="edit-user-roletitle"
                    placeholder="Ex.: Coordenadora Acadêmica"
                    aria-invalid={!!errors.roleTitle}
                    className="bg-slate-900 border-slate-700 text-white"
                    {...register('roleTitle')}
                  />
                  {errors.roleTitle && (
                    <p className="text-xs text-red-400">{errors.roleTitle.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-department">Departamento</Label>
                  <Input
                    id="edit-user-department"
                    placeholder="Ex.: Reitoria Executiva"
                    aria-invalid={!!errors.department}
                    className="bg-slate-900 border-slate-700 text-white"
                    {...register('department')}
                  />
                  {errors.department && (
                    <p className="text-xs text-red-400">{errors.department.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-phone">Telefone</Label>
                  <Input
                    id="edit-user-phone"
                    placeholder="(00) 00000-0000"
                    aria-invalid={!!errors.phone}
                    className="bg-slate-900 border-slate-700 text-white"
                    {...register('phone')}
                  />
                  {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-cpf">CPF</Label>
                  <Input
                    id="edit-user-cpf"
                    placeholder="000.000.000-00"
                    aria-invalid={!!errors.cpf || errorField === 'cpf'}
                    className={cn(
                      'bg-slate-900 border-slate-700 text-white font-mono',
                      errorField === 'cpf' && 'border-red-500',
                    )}
                    {...register('cpf')}
                  />
                  {(errors.cpf || errorField === 'cpf') && (
                    <p className="text-xs text-red-400">{errors.cpf?.message || serverError}</p>
                  )}
                </div>
              </div>

              {showRoleStatus ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>
                      Perfil de acesso <span className="text-red-500">*</span>
                    </Label>
                    <Select value={role} onValueChange={(v) => setValue('role', v)}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errorField === 'role' && <p className="text-xs text-red-400">{serverError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select value={status} onValueChange={(v) => setValue('status', v)}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errorField === 'status' && (
                      <p className="text-xs text-red-400">{serverError}</p>
                    )}
                  </div>
                </div>
              ) : (
                <Alert className="border-slate-800 bg-slate-900/60">
                  <Info className="h-4 w-4 text-slate-400" />
                  <AlertDescription className="text-xs text-slate-400">
                    {isSelf
                      ? 'Você não pode alterar o seu próprio perfil de acesso ou status — apenas outro Root/Admin pode.'
                      : 'Perfil de acesso e status só podem ser alterados pelo Root — e a alteração fica registrada na Auditoria do Aplicativo.'}
                  </AlertDescription>
                </Alert>
              )}

              {serverError && !errorField && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {savedEmail && !serverError && (
                <Alert className="border-emerald-800 bg-emerald-950/40">
                  <Info className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="text-emerald-300">
                    {savedEmail.toLowerCase() === (user.email || '').toLowerCase()
                      ? 'Dados salvos com sucesso. A alteração está registrada na Auditoria do Aplicativo.'
                      : `Dados salvos com sucesso. As sessões ativas foram revogadas — o próximo login deste usuário deve usar ${savedEmail}.`}
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-slate-700 text-xs"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="text-xs">
                  {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Continuar
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-300">
                <ShieldCheck className="h-5 w-5" />
                Confirmar alterações
              </DialogTitle>
              <DialogDescription>
                {isSelf
                  ? 'Revise as alterações no seu cadastro antes de salvar.'
                  : `Você está alterando dados de outro usuário (${user.name}). Confirme para salvar.`}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300 space-y-1">
              <p>
                <span className="text-slate-500">Usuário:</span> {user.name} ({user.email})
              </p>
              <p>
                <span className="text-slate-500">Campos alterados:</span>{' '}
                {confirmSummary || 'nenhum campo alterado'}
              </p>
              {showRoleStatus &&
                pendingValues &&
                (pendingValues.role !== user.role ||
                  pendingValues.status !== (user.status || 'ativo')) && (
                  <p className="text-amber-300">
                    Esta edição muda o perfil de acesso e/ou o status — ação privilegiada,
                    registrada na Auditoria do Aplicativo.
                  </p>
                )}
              {!isSelf && (
                <p className="text-amber-300">
                  Você está alterando dados de terceiros — ação registrada na Auditoria do
                  Aplicativo.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmStep(false)}
                className="border-slate-700 text-xs"
              >
                Voltar e revisar
              </Button>
              <Button
                type="button"
                onClick={() => pendingValues && void doSubmit(pendingValues)}
                disabled={isSubmitting}
                className="text-xs"
              >
                {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Confirmar e salvar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
