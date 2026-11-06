import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { UserAccount, UserRole } from '@/types/portal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  KeyRound,
  ShieldAlert,
} from 'lucide-react'

const ROLE_OPTIONS: { role: UserRole; label: string; desc: string }[] = [
  {
    role: 'root',
    label: 'Super Administrador (Root)',
    desc: 'Acesso irrestrito a todos os módulos, bypass de locks e infra',
  },
  {
    role: 'admin',
    label: 'Administrador(a) Geral',
    desc: 'Gestão institucional plena, usuários, diagnósticos e relatórios',
  },
  {
    role: 'secretaria',
    label: 'Chefe de Secretaria Geral',
    desc: 'Validação documental, admissões, trancamentos e certidões',
  },
  {
    role: 'financeiro',
    label: 'Gestor(a) Financeiro',
    desc: 'Controle de títulos, Pix/Cartão, tabela de preços e exceções',
  },
  {
    role: 'academico',
    label: 'Pró-Reitor(a) Acadêmico',
    desc: 'Diretrizes pedagógicas, regulação MEC e catálogo',
  },
  {
    role: 'matricula',
    label: 'Analista de Matrículas',
    desc: 'Processamento de ingressantes e conferência de fotos',
  },
  {
    role: 'coordenador',
    label: 'Coordenador(a) de Curso',
    desc: 'Gestão de turmas, docentes e chamados do departamento',
  },
  {
    role: 'professor',
    label: 'Docente Permanente',
    desc: 'Consulta de cursos, chamados prediais e diários',
  },
  {
    role: 'aluno',
    label: 'Aluno(a) Regular',
    desc: 'Consulta de disciplinas, visualização de cobranças próprias',
  },
]

export function UsuariosEquipeModule() {
  const { users, updateUserRole, createUser, currentUser } = usePortal()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [roleChangeModalOpen, setRoleChangeModalOpen] = useState(false)
  const [targetRole, setTargetRole] = useState<UserRole>('aluno')

  // Novo usuário modal
  const [newUserModalOpen, setNewUserModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('secretaria')
  const [newDept, setNewDept] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCpf, setNewCpf] = useState('')

  const isRootOrAdmin = currentUser?.role === 'root' || currentUser?.role === 'admin'

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase()),
  )

  const handleOpenRoleChange = (u: UserAccount) => {
    if (!isRootOrAdmin) {
      toast({
        title: 'Acesso Negado',
        description:
          'Apenas Administradores ou perfil Root podem alterar permissões de outros usuários.',
        variant: 'destructive',
      })
      return
    }

    if (u.role === 'root' && currentUser?.role !== 'root') {
      toast({
        title: 'Operação Restrita',
        description: 'Somente a conta Root pode alterar as permissões de outro usuário Root.',
        variant: 'destructive',
      })
      return
    }

    setSelectedUser(u)
    setTargetRole(u.role)
    setRoleChangeModalOpen(true)
  }

  const handleSaveRole = () => {
    if (!selectedUser) return
    updateUserRole(selectedUser.id, targetRole)
    setRoleChangeModalOpen(false)
    toast({
      title: 'Perfil de Acesso Atualizado',
      description: `${selectedUser.name} agora possui privilégios de [${targetRole}].`,
    })
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()

    const roleOption = ROLE_OPTIONS.find((r) => r.role === newRole)
    createUser({
      name: newName,
      email: newEmail,
      role: newRole,
      roleTitle: roleOption?.label || newRole,
      department: newDept || 'Secretaria Acadêmica',
      cpf: newCpf,
      phone: newPhone,
      status: 'ativo',
      avatar: `https://img.usecurling.com/ppl/medium?gender=female&seed=${Math.floor(Math.random() * 900)}`,
    })

    setNewUserModalOpen(false)
    setNewName('')
    setNewEmail('')
    setNewDept('')
    setNewPhone('')
    setNewCpf('')
    toast({
      title: 'Usuário cadastrado com sucesso!',
      description: `${newName} foi inserido no sistema com perfil de ${newRole}.`,
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Gestão de Usuários & Equipe
          </h1>
          <p className="text-xs text-slate-400">
            Controle de permissões (RBAC com 9 perfis), lotação institucional e equipe acadêmica
          </p>
        </div>

        {isRootOrAdmin && (
          <Button
            onClick={() => setNewUserModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Novo Membro da Equipe
          </Button>
        )}
      </div>

      {/* Busca e Resumo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <Input
          placeholder="Buscar por nome, e-mail, departamento ou perfil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md bg-slate-950 border-slate-700 text-white text-xs"
        />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Badge variant="outline" className="border-slate-700 text-slate-300">
            {users.length} usuários registrados
          </Badge>
          <span className="text-[11px] font-mono text-emerald-400">● 100% Ativos</span>
        </div>
      </div>

      {/* Grid de Usuários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const isCurrentUser = user.id === currentUser?.id

          return (
            <Card
              key={user.id}
              className={`border transition-all ${
                isCurrentUser
                  ? 'bg-blue-950/20 border-blue-500/40'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              } text-slate-100`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-12 h-12 border border-slate-700 shrink-0">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-slate-800 text-xs text-white">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-white truncate">{user.name}</h3>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                            Você
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono uppercase mt-0.5 bg-slate-800 text-blue-300 border border-slate-700"
                      >
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                  <p className="text-[11px] text-slate-300 font-medium truncate flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    {user.department}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    {user.email}
                  </p>
                  {user.phone && (
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {user.phone}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    Cadastro: {user.createdAt}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-500">{user.roleTitle}</span>
                  {isRootOrAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenRoleChange(user)}
                      className="h-7 text-xs border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
                    >
                      <KeyRound className="w-3 h-3 mr-1" />
                      Alterar Papel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* MODAL ALTERAR PAPEL / RBAC */}
      <Dialog open={roleChangeModalOpen} onOpenChange={setRoleChangeModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Permissões do Usuário: {selectedUser?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Selecione o papel do sistema que define o acesso aos módulos acadêmicos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {ROLE_OPTIONS.map((opt) => {
              const isSelected = targetRole === opt.role

              return (
                <label
                  key={opt.role}
                  onClick={() => setTargetRole(opt.role)}
                  className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 shadow-sm shadow-blue-500/20'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{opt.label}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-slate-700 text-slate-400"
                    >
                      {opt.role}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{opt.desc}</p>
                </label>
              )
            })}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleChangeModalOpen(false)}
              className="border-slate-700 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRole}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              Confirmar Permissão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVO USUÁRIO */}
      <Dialog open={newUserModalOpen} onOpenChange={setNewUserModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Adicionar Novo Usuário ou Docente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cadastre membros institucionais com papel predefinido
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Nome Completo *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex: Dr. Fernando Guimarães"
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">E-mail Institucional *</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ex: fernando@portalcursos.ng"
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">CPF</label>
                <Input
                  value={newCpf}
                  onChange={(e) => setNewCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-slate-900 border-slate-700 text-white text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Telefone</label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Perfil Inicial</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full h-9 rounded bg-slate-900 border border-slate-700 text-white text-xs px-2.5"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.role} value={opt.role}>
                    {opt.label} ({opt.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Departamento / Lotação</label>
              <Input
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                placeholder="ex: Departamento de Engenharia e Computação"
                className="bg-slate-900 border-slate-700 text-white text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewUserModalOpen(false)}
                className="border-slate-700 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                Cadastrar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
