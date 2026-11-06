import React, { useEffect, useRef, useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { DEMO_ACCOUNTS } from '@/data/portalMockData'
import { UserRole } from '@/types/portal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LogIn,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Lock,
  Mail,
  UserPlus,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react'

export function LoginModalScreen() {
  const { currentUser, login, loginAsDemoRole, loginAttempts, isLoginLockedOut, createUser } =
    usePortal()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'login' | 'demo' | 'cadastro'>('demo')

  // Register form states
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regRole, setRegRole] = useState<UserRole>('secretaria')
  const [regDept, setRegDept] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)

  // Auto-login pós-cadastro em timer próprio, limpo no unmount: sem isso o
  // setTimeout sobrevivia ao componente e fazia setState após desmontagem.
  const autoLoginTimerRef = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (autoLoginTimerRef.current !== null) window.clearTimeout(autoLoginTimerRef.current)
    }
  }, [])

  // Se já há usuário logado e não está forçando tela
  if (currentUser) {
    return null
  }

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail corporativo.')
      return
    }

    const ok = login(email, password)
    if (!ok) {
      setErrorMessage(
        'E-mail ou credenciais não encontrados no registro acadêmico. Você pode usar uma das contas demo prontas.',
      )
    } else {
      setErrorMessage(null)
    }
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName.trim() || !regEmail.trim()) {
      setErrorMessage('Preencha os campos obrigatórios para cadastro.')
      return
    }

    const roleTitles: Record<UserRole, string> = {
      root: 'Super Administrador (Root)',
      admin: 'Administrador(a) Geral',
      secretaria: 'Chefe de Secretaria',
      financeiro: 'Gestor(a) Financeiro',
      academico: 'Pró-Reitor(a) Acadêmico',
      matricula: 'Analista de Matrícula',
      coordenador: 'Coordenador(a) de Curso',
      professor: 'Docente',
      aluno: 'Estudante Regular',
    }

    createUser({
      name: regName.trim(),
      email: regEmail.trim(),
      role: regRole,
      roleTitle: roleTitles[regRole],
      department: regDept.trim() || 'Departamento Acadêmico',
      status: 'ativo',
    })

    setRegSuccess(true)
    if (autoLoginTimerRef.current !== null) window.clearTimeout(autoLoginTimerRef.current)
    autoLoginTimerRef.current = window.setTimeout(() => {
      login(regEmail.trim())
    }, 1200)
  }

  return (
    <div className="min-h-screen w-full bg-slate-900/95 flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            <Building2 className="w-3.5 h-3.5" />
            PortalCursos.NG • Sistema Acadêmico Integrado
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Autenticação & Controle de Acesso
          </h2>
          <p className="text-xs text-slate-400">
            Acesse seu perfil ou experimente as visões operacionais de demonstração
          </p>
        </div>

        {/* Lockout alert */}
        {isLoginLockedOut ? (
          <Alert variant="destructive" className="bg-rose-950/80 border-rose-800 text-rose-200">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">
              Conta Temporariamente Suspensa
            </AlertTitle>
            <AlertDescription className="text-xs">
              Múltiplas tentativas incorretas consecutivas (4/4). Bloqueio preventivo ativado por 25
              segundos.
            </AlertDescription>
          </Alert>
        ) : null}

        {errorMessage && !isLoginLockedOut ? (
          <Alert className="bg-amber-950/60 border-amber-800 text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-xs">
              {errorMessage} (Falhas registradas: {loginAttempts}/4)
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="border-slate-800 bg-slate-950/90 shadow-2xl text-slate-100">
          <CardHeader className="pb-3 border-b border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold text-white">
                  Identificação no Sistema
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Escolha um perfil rápido com permissões específicas do PDR ou faça login manual
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="w-fit text-xs border-emerald-500/40 text-emerald-400 font-mono"
              >
                Portão Aberto
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 bg-slate-900 border border-slate-800 mb-6">
                <TabsTrigger
                  value="demo"
                  className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Contas Demo Rápidas (9 Perfis)
                </TabsTrigger>
                <TabsTrigger
                  value="login"
                  className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Entrar com E-mail
                </TabsTrigger>
                <TabsTrigger
                  value="cadastro"
                  className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Novo Cadastro
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: Perfis Prontos */}
              <TabsContent value="demo" className="space-y-4">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>
                    Clique em qualquer cartão para iniciar sessão instantaneamente como aquele
                    perfil:
                  </span>
                  <span className="text-[11px] text-blue-400 font-mono">9 perfis homologados</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {DEMO_ACCOUNTS.map((account) => {
                    const roleBadgeColor: Record<UserRole, string> = {
                      root: 'bg-red-500/20 text-red-300 border-red-500/30',
                      admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                      secretaria: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                      financeiro: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                      academico: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      matricula: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                      coordenador: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                      professor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
                      aluno: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
                    }

                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => loginAsDemoRole(account.role)}
                        disabled={isLoginLockedOut}
                        className="group text-left p-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-blue-500/50 transition-all flex items-start gap-3 relative focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <Avatar className="w-10 h-10 border border-slate-700 shrink-0">
                          <AvatarImage src={account.avatar} alt={account.name} />
                          <AvatarFallback className="bg-slate-800 text-xs text-white">
                            {account.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                              {account.name}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 uppercase tracking-wide border ${roleBadgeColor[account.role]}`}
                          >
                            {account.role}
                          </Badge>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                            {account.department}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </TabsContent>

              {/* ABA 2: Login manual */}
              <TabsContent value="login">
                <form onSubmit={handleManualLogin} className="space-y-4 max-w-md mx-auto py-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      E-mail Institucional
                    </label>
                    <Input
                      type="email"
                      placeholder="ex: admin@portalcursos.ng"
                      value={email}
                      disabled={isLoginLockedOut}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white focus-visible:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Senha de Acesso
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      disabled={isLoginLockedOut}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white focus-visible:ring-blue-500 text-sm"
                    />
                    <p className="text-[11px] text-slate-500">
                      Ambiente de demonstração: qualquer senha é aceita para os e-mails cadastrados.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoginLockedOut || !email}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Entrar no Portal
                  </Button>
                </form>
              </TabsContent>

              {/* ABA 3: Cadastro */}
              <TabsContent value="cadastro">
                {regSuccess ? (
                  <div className="p-6 text-center space-y-3">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                    <h3 className="text-sm font-semibold text-white">
                      Usuário cadastrado com sucesso!
                    </h3>
                    <p className="text-xs text-slate-400">
                      Efetuando login automático no portal acadêmico...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3 max-w-lg mx-auto py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-300">Nome Completo</label>
                        <Input
                          placeholder="ex: Carla Mendes"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="bg-slate-900 border-slate-700 text-white text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-300">
                          E-mail Corporativo
                        </label>
                        <Input
                          type="email"
                          placeholder="ex: carla@portalcursos.ng"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="bg-slate-900 border-slate-700 text-white text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-300">
                          Perfil de Acesso (RBAC)
                        </label>
                        <select
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value as UserRole)}
                          className="w-full h-9 rounded-md bg-slate-900 border border-slate-700 text-white text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="admin">Administrador Geral</option>
                          <option value="secretaria">Secretaria Acadêmica</option>
                          <option value="financeiro">Financeiro / Tesouraria</option>
                          <option value="academico">Pró-Reitoria Acadêmica</option>
                          <option value="matricula">Matrícula & Admissões</option>
                          <option value="coordenador">Coordenador de Curso</option>
                          <option value="professor">Professor(a)</option>
                          <option value="aluno">Aluno(a)</option>
                          <option value="root">Super Root</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-300">
                          Departamento / Lotação
                        </label>
                        <Input
                          placeholder="ex: Central de Atendimento"
                          value={regDept}
                          onChange={(e) => setRegDept(e.target.value)}
                          className="bg-slate-900 border-slate-700 text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-2" />
                        Cadastrar & Acessar Sistema
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Controle de Perfis PDR (9 papéis)
          </span>
          <span>Ambiente de Simulação Navegável</span>
        </div>
      </div>
    </div>
  )
}
