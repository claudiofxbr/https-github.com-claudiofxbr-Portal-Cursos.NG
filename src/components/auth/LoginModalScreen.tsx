import React, { useEffect, useRef, useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { DEMO_ACCOUNTS } from '@/data/portalMockData'
import { DEMO_USER_PASSWORD } from '@/lib/portalDb'
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
  CheckCircle2,
  KeyRound,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
  Send,
  HelpCircle,
  Key,
  DoorClosed,
  ArrowRight,
} from 'lucide-react'

interface ResetLockState {
  attempts: number
  lockedUntil: number
}

const STORAGE_KEY_RESET_LOCK = 'portalcursos_reset_lock'
const MAX_RESET_ATTEMPTS = 3
const RESET_LOCKOUT_MS = 60_000 // 1 minuto de bloqueio após 3 envios

function loadResetLock(): ResetLockState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_RESET_LOCK)
    if (!raw) return { attempts: 0, lockedUntil: 0 }
    const parsed = JSON.parse(raw)
    const attempts = Number(parsed?.attempts) || 0
    const lockedUntil = Number(parsed?.lockedUntil) || 0
    if (lockedUntil > 0 && lockedUntil <= Date.now()) {
      return { attempts: 0, lockedUntil: 0 }
    }
    return { attempts, lockedUntil }
  } catch {
    return { attempts: 0, lockedUntil: 0 }
  }
}

// LGPD (minimização): o lockout de reset de senha é estado anti-abuso da
// sessão — sessionStorage basta, nada persiste além do F5.
function persistResetLock(state: ResetLockState) {
  try {
    sessionStorage.setItem(STORAGE_KEY_RESET_LOCK, JSON.stringify(state))
  } catch {
    // silencioso
  }
}

export function LoginModalScreen() {
  const {
    currentUser,
    login,
    loginAttempts,
    isLoginLockedOut,
    createUser,
    requestPasswordResetEmail,
    isGateUnlocked,
    gateAttempts,
    isGateLockedOut,
    unlockGate,
  } = usePortal()

  // Portal Gate state integrado (SPEC-INIT-001 Decisão 1: portão vira parte da tela de login)
  const [gateCode, setGateCode] = useState('')
  const [gateError, setGateError] = useState(false)
  const [gateShake, setGateShake] = useState(false)

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'login' | 'demo' | 'cadastro'>('demo')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)

  // Forgot password / Reset states
  const [showForgotView, setShowForgotView] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLock, setResetLock] = useState<ResetLockState>(loadResetLock)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const isResetLockedOut = resetLock.lockedUntil > Date.now()

  // Atualiza expiração do lockout de reset
  useEffect(() => {
    if (resetLock.lockedUntil <= Date.now()) return
    const timer = window.setTimeout(() => {
      setResetLock({ attempts: 0, lockedUntil: 0 })
      persistResetLock({ attempts: 0, lockedUntil: 0 })
    }, resetLock.lockedUntil - Date.now())
    return () => window.clearTimeout(timer)
  }, [resetLock.lockedUntil])

  // Register form states
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState<UserRole>('secretaria') // 'root' não é ofertado no cadastro público
  const [regDept, setRegDept] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)
  const [regError, setRegError] = useState<string | null>(null)

  const autoLoginTimerRef = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (autoLoginTimerRef.current !== null) window.clearTimeout(autoLoginTimerRef.current)
    }
  }, [])

  // Se já há usuário logado, não renderiza tela
  if (currentUser) {
    return null
  }

  const handleUnlockGateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isGateLockedOut) return

    const success = unlockGate(gateCode)
    if (success) {
      setGateError(false)
    } else {
      setGateError(true)
      setGateShake(true)
      setTimeout(() => setGateShake(false), 500)
    }
  }

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail corporativo.')
      return
    }
    if (!password) {
      setErrorMessage('Informe a senha de acesso.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const ok = await login(email, password)
      if (!ok) {
        setErrorMessage(
          'Credenciais inválidas. Verifique o e-mail e a senha informados ou use as credenciais das contas demo.',
        )
      } else {
        setErrorMessage(null)
      }
    } catch {
      setErrorMessage('Erro de comunicação com o servidor de autenticação.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      setResetError('Informe o e-mail institucional para recuperação.')
      return
    }

    if (isResetLockedOut) {
      setResetError(
        'Limite de tentativas excedido. Aguarde alguns instantes antes de tentar novamente.',
      )
      return
    }

    setIsSubmitting(true)
    setResetError(null)
    setResetMessage(null)

    // Incrementa contagem de tentativas e aplica rate-limit se atingir o máximo
    const nextAttempts = resetLock.attempts + 1
    const nextLock: ResetLockState =
      nextAttempts >= MAX_RESET_ATTEMPTS
        ? { attempts: nextAttempts, lockedUntil: Date.now() + RESET_LOCKOUT_MS }
        : { attempts: nextAttempts, lockedUntil: 0 }
    setResetLock(nextLock)
    persistResetLock(nextLock)

    try {
      const res = await requestPasswordResetEmail(resetEmail.trim())
      setResetMessage(res.genericMessage)
    } catch {
      // Mensagem genérica mesmo em erro inesperado
      setResetMessage(
        'Se o e-mail informado estiver cadastrado no PortalCursos.NG, você receberá uma mensagem com instruções e link para criar uma nova senha.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Preenche o formulário e opcionalmente já submete o login da conta demo
  const handleSelectDemoAccount = async (demoEmail: string) => {
    if (isLoginLockedOut || isSubmitting) return
    setEmail(demoEmail)
    setPassword(DEMO_USER_PASSWORD)
    setActiveTab('login')
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const ok = await login(demoEmail, DEMO_USER_PASSWORD)
      if (!ok) {
        setErrorMessage(
          'Falha ao autenticar conta demo no PocketBase. Verifique se o backend está ativo.',
        )
      }
    } catch {
      setErrorMessage('Erro ao autenticar com a conta demo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFillDemoOnly = (demoEmail: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEmail(demoEmail)
    setPassword(DEMO_USER_PASSWORD)
    setActiveTab('login')
    setCopiedAccount(demoEmail)
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName.trim() || !regEmail.trim()) {
      setRegError('Preencha nome completo e e-mail corporativo.')
      return
    }
    const safePass = regPassword.trim() || DEMO_USER_PASSWORD
    if (safePass.length < 8) {
      setRegError('A senha deve ter no mínimo 8 caracteres (requisito de segurança PocketBase).')
      return
    }

    setIsSubmitting(true)
    setRegError(null)

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

    try {
      const created = await createUser(
        {
          name: regName.trim(),
          email: regEmail.trim(),
          role: regRole,
          roleTitle: roleTitles[regRole],
          department: regDept.trim() || 'Departamento Acadêmico',
          status: 'ativo',
        },
        safePass,
      )

      if (!created) {
        setRegError('Não foi possível registrar o usuário no servidor.')
        setIsSubmitting(false)
        return
      }

      setRegSuccess(true)
      if (autoLoginTimerRef.current !== null) window.clearTimeout(autoLoginTimerRef.current)
      autoLoginTimerRef.current = window.setTimeout(async () => {
        await login(regEmail.trim(), safePass)
      }, 1000)
    } catch {
      setRegError('Erro ao cadastrar usuário.')
      setIsSubmitting(false)
    }
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
            Acesse seu perfil institucional com e-mail e senha reais autenticados no servidor
          </p>
        </div>

        {/* SPEC-INIT-001 Decisão 1: portão vira parte da tela de login */}
        {!isGateUnlocked ? (
          <Card
            className={`border-slate-800 bg-slate-950/90 shadow-2xl text-slate-100 transition-all ${
              gateShake ? 'animate-shake border-rose-500/50' : ''
            }`}
          >
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                    <DoorClosed className="w-4 h-4 text-amber-400" />
                    Etapa 1: Código de Acesso do Portão
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Insira o código de autorização institucional para liberar o acesso ao sistema
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit text-xs border-amber-500/40 text-amber-400 font-mono"
                >
                  Portão Fechado
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {isGateLockedOut ? (
                <Alert
                  variant="destructive"
                  className="bg-rose-950/80 border-rose-800 text-rose-200"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">
                    Portão Temporariamente Bloqueado
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    Múltiplas tentativas consecutivas incorretas (4/4). Bloqueio preventivo ativado
                    por 25 segundos. O bloqueio é mantido até o término do período.
                  </AlertDescription>
                </Alert>
              ) : null}

              {gateError && !isGateLockedOut ? (
                <Alert className="bg-amber-950/60 border-amber-800 text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <AlertDescription className="text-xs">
                    Código de acesso incorreto. Falhas registradas: {gateAttempts}/4. Tente
                    novamente.
                  </AlertDescription>
                </Alert>
              ) : null}

              <form onSubmit={handleUnlockGateSubmit} className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    Código de Acesso Institucional
                  </label>
                  <Input
                    type="password"
                    placeholder="Código institucional (padrão: PORTAL2025)"
                    value={gateCode}
                    disabled={isGateLockedOut}
                    onChange={(e) => {
                      setGateCode(e.target.value)
                      if (gateError) setGateError(false)
                    }}
                    autoFocus
                    className="bg-slate-900 border-slate-700 text-white tracking-widest text-center text-sm font-mono focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 text-center">
                    Dica: use <span className="font-mono text-slate-300">PORTAL2025</span> para
                    liberar o portão
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isGateLockedOut || !gateCode.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs"
                >
                  Avançar para Identificação
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Lockout alert */}
            {isLoginLockedOut ? (
              <Alert variant="destructive" className="bg-rose-950/80 border-rose-800 text-rose-200">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">
                  Conta Temporariamente Suspensa
                </AlertTitle>
                <AlertDescription className="text-xs">
                  Múltiplas tentativas incorretas consecutivas (4/4). Bloqueio preventivo ativado
                  por 25 segundos. O bloqueio sobrevive ao recarregamento da página.
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
                    <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                      {showForgotView ? (
                        <>
                          <KeyRound className="w-4 h-4 text-amber-400" />
                          Recuperação de Senha
                        </>
                      ) : (
                        'Etapa 2: Identificação de Usuário'
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      {showForgotView
                        ? 'Receba um link de redefinição no seu e-mail institucional'
                        : 'Autenticação real por usuário com RBAC gerenciado pelo PocketBase'}
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
                {showForgotView ? (
                  <div className="max-w-md mx-auto py-2 space-y-4">
                    {/* Alerta de bloqueio por tentativas excessivas no formulário de reset */}
                    {isResetLockedOut ? (
                      <Alert
                        variant="destructive"
                        className="bg-rose-950/80 border-rose-800 text-rose-200"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle className="text-xs font-semibold">
                          Muitas solicitações recentes
                        </AlertTitle>
                        <AlertDescription className="text-xs">
                          Você atingiu o limite de {MAX_RESET_ATTEMPTS} envios. Aguarde 60 segundos
                          antes de solicitar novamente. O bloqueio é persistido para prevenir
                          abusos.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {resetError && !isResetLockedOut ? (
                      <Alert className="bg-amber-950/60 border-amber-800 text-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <AlertDescription className="text-xs">{resetError}</AlertDescription>
                      </Alert>
                    ) : null}

                    {resetMessage ? (
                      <div className="space-y-4 py-2">
                        <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 space-y-2">
                          <div className="flex items-center gap-2 font-semibold text-xs text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            Solicitação enviada com sucesso
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{resetMessage}</p>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 space-y-1.5">
                          <span className="font-semibold text-white flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-blue-400" />
                            Próximos passos:
                          </span>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Verifique sua caixa de entrada e spam. Siga o link recebido para criar a
                            nova senha no servidor. Depois volte aqui e faça login com a nova
                            credencial.
                          </p>
                          <p className="text-[10px] text-amber-400/90 pt-1 border-t border-slate-800">
                            Nota: Se o remetente de e-mail institucional estiver em modo de teste ou
                            sem SMTP configurado, verifique os logs do servidor Skip Cloud.
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setResetMessage(null)
                              setResetError(null)
                            }}
                            className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                          >
                            Enviar para outro e-mail
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setShowForgotView(false)
                              setActiveTab('login')
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
                          >
                            Voltar para o Login
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            E-mail Institucional Cadastrado
                          </label>
                          <Input
                            type="email"
                            placeholder="ex: seu.email@portalcursos.ng"
                            value={resetEmail}
                            disabled={isSubmitting || isResetLockedOut}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-white focus-visible:ring-blue-500 text-sm"
                            required
                          />
                          <p className="text-[11px] text-slate-400">
                            Enviaremos um link seguro de redefinição diretamente para seu endereço
                            de e-mail. Por motivos de segurança e privacidade, a mensagem de envio é
                            genérica.
                          </p>
                        </div>

                        <div className="space-y-2 pt-1">
                          <Button
                            type="submit"
                            disabled={isSubmitting || isResetLockedOut || !resetEmail.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enviando Solicitação...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Enviar Link de Redefinição
                              </>
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowForgotView(false)
                              setResetError(null)
                              setResetMessage(null)
                            }}
                            className="w-full text-xs text-slate-400 hover:text-white"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                            Cancelar e voltar ao login
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as 'login' | 'demo' | 'cadastro')}
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-3 bg-slate-900 border border-slate-800 mb-6">
                      <TabsTrigger
                        value="demo"
                        className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                      >
                        Contas Demo (9 Perfis)
                      </TabsTrigger>
                      <TabsTrigger
                        value="login"
                        className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                      >
                        Entrar com E-mail & Senha
                      </TabsTrigger>
                      <TabsTrigger
                        value="cadastro"
                        className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                      >
                        Novo Cadastro
                      </TabsTrigger>
                    </TabsList>

                    {/* ABA 1: Perfis Prontos com Senha e Autologin */}
                    <TabsContent value="demo" className="space-y-4">
                      <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <span className="font-semibold text-white">
                              Credencial Padrão de Demonstração:
                            </span>{' '}
                            <span className="text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              {DEMO_USER_PASSWORD}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-blue-400 font-mono">
                          9 contas autenticadas no servidor
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>
                          Clique em um cartão para autenticar no servidor ou use o botão para
                          preencher:
                        </span>
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

                          const isCopied = copiedAccount === account.email

                          return (
                            <div
                              key={account.id}
                              onClick={() => handleSelectDemoAccount(account.email)}
                              className={`group text-left p-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-blue-500/50 transition-all flex flex-col justify-between gap-2.5 relative cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 ${
                                isLoginLockedOut || isSubmitting
                                  ? 'opacity-60 cursor-not-allowed'
                                  : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
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
                                </div>
                              </div>

                              <div className="space-y-1 bg-slate-950/60 p-2 rounded border border-slate-800/80 text-[11px]">
                                <div className="flex items-center justify-between text-slate-300 font-mono truncate">
                                  <span className="truncate">{account.email}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400 font-mono">
                                  <span>Senha:</span>
                                  <span className="text-amber-300 font-semibold">
                                    {DEMO_USER_PASSWORD}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-1 pt-1">
                                <span className="text-[10px] text-slate-400 group-hover:text-blue-400 flex items-center gap-1 font-medium">
                                  <LogIn className="w-3 h-3" />
                                  Entrar direto
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleFillDemoOnly(account.email, e)}
                                  className="text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                  title="Preencher e-mail e senha no formulário"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      Preenchido
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      Preencher
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>

                    {/* ABA 2: Login manual com e-mail e senha */}
                    <TabsContent value="login">
                      <form
                        onSubmit={handleManualLogin}
                        className="space-y-4 max-w-md mx-auto py-2"
                      >
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            E-mail Institucional
                          </label>
                          <Input
                            type="email"
                            placeholder="ex: root@portalcursos.ng"
                            value={email}
                            disabled={isLoginLockedOut || isSubmitting}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-white focus-visible:ring-blue-500 text-sm"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              Senha de Acesso
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setResetEmail(email.trim())
                                setResetError(null)
                                setResetMessage(null)
                                setShowForgotView(true)
                              }}
                              className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                            >
                              Esqueci minha senha
                            </button>
                          </div>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            disabled={isLoginLockedOut || isSubmitting}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-white focus-visible:ring-blue-500 text-sm"
                            required
                          />
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>
                              Demo:{' '}
                              <span className="font-mono text-amber-300 font-semibold">
                                {DEMO_USER_PASSWORD}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setResetEmail(email.trim())
                                setResetError(null)
                                setResetMessage(null)
                                setShowForgotView(true)
                              }}
                              className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
                            >
                              <HelpCircle className="w-3 h-3" />
                              Problemas no acesso?
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={isLoginLockedOut || isSubmitting || !email || !password}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Autenticando no Servidor...
                            </>
                          ) : (
                            <>
                              <LogIn className="w-4 h-4 mr-2" />
                              Entrar no Portal
                            </>
                          )}
                        </Button>

                        {/* Link direto no rodapé do formulário */}
                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setResetEmail(email.trim())
                              setResetError(null)
                              setResetMessage(null)
                              setShowForgotView(true)
                            }}
                            className="text-xs text-slate-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                          >
                            <KeyRound className="w-3 h-3 text-amber-400" />
                            Esqueceu sua senha? Solicite uma redefinição
                          </button>
                        </div>
                      </form>
                    </TabsContent>

                    {/* ABA 3: Cadastro com senha real */}
                    <TabsContent value="cadastro">
                      {regSuccess ? (
                        <div className="p-6 text-center space-y-3">
                          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                          <h3 className="text-sm font-semibold text-white">
                            Usuário cadastrado com sucesso no banco!
                          </h3>
                          <p className="text-xs text-slate-400">
                            Autenticando sessão real com a nova credencial...
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleRegister} className="space-y-3 max-w-lg mx-auto py-2">
                          {regError && (
                            <Alert className="bg-rose-950/60 border-rose-800 text-rose-200">
                              <AlertTriangle className="h-4 w-4 text-rose-400" />
                              <AlertDescription className="text-xs">{regError}</AlertDescription>
                            </Alert>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-300">
                                Nome Completo
                              </label>
                              <Input
                                placeholder="ex: Carla Mendes"
                                value={regName}
                                disabled={isSubmitting}
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
                                disabled={isSubmitting}
                                onChange={(e) => setRegEmail(e.target.value)}
                                className="bg-slate-900 border-slate-700 text-white text-xs"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-slate-300">
                                Senha Inicial de Acesso (mín. 8 caracteres)
                              </label>
                              <span className="text-[10px] text-slate-400">
                                Padrão: {DEMO_USER_PASSWORD}
                              </span>
                            </div>
                            <Input
                              type="password"
                              placeholder={`Deixe em branco para usar ${DEMO_USER_PASSWORD}`}
                              value={regPassword}
                              disabled={isSubmitting}
                              onChange={(e) => setRegPassword(e.target.value)}
                              className="bg-slate-900 border-slate-700 text-white text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-300">
                                Perfil de Acesso (RBAC)
                              </label>
                              <select
                                value={regRole}
                                disabled={isSubmitting}
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
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-300">
                                Departamento / Lotação
                              </label>
                              <Input
                                placeholder="ex: Central de Atendimento"
                                value={regDept}
                                disabled={isSubmitting}
                                onChange={(e) => setRegDept(e.target.value)}
                                className="bg-slate-900 border-slate-700 text-white text-xs"
                              />
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                  Cadastrando no Servidor...
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5 mr-2" />
                                  Cadastrar & Acessar Sistema
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Controle de Perfis PDR (9 papéis reais)
          </span>
          <span>Autenticação Integrada PocketBase</span>
        </div>
      </div>
    </div>
  )
}
