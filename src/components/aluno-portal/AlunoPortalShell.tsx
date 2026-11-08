import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { StudentPortalTab } from '@/types/portal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  User,
  GraduationCap,
  FolderDown,
  Calendar,
  Bell,
  Award,
  HelpCircle,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react'

interface AlunoPortalShellProps {
  activeTab: StudentPortalTab
  setActiveTab: (tab: StudentPortalTab) => void
  children: React.ReactNode
}

interface NavItem {
  id: StudentPortalTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
}

export function AlunoPortalShell({ activeTab, setActiveTab, children }: AlunoPortalShellProps) {
  const {
    currentUser,
    students,
    logout,
    studentNotifications,
    studentSupportTickets,
    lessonProgress,
  } = usePortal()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Vincula dados cadastrais do aluno logado
  const currentStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
    ) || students[0]

  const effectiveStudentId = currentUser?.studentId || currentStudent?.id || 'dbphexr97czw7cb'

  // Notificações não lidas
  const unreadCount = studentNotifications.filter(
    (n) => n.studentId === effectiveStudentId && !n.read,
  ).length

  // Tickets abertos
  const openTicketsCount = studentSupportTickets.filter(
    (t) => t.studentId === effectiveStudentId && t.status !== 'fechado',
  ).length

  // Progresso geral de aulas concluídas
  const studentLessons = lessonProgress.filter((p) => p.studentId === effectiveStudentId)
  const completedLessonsCount = studentLessons.filter((p) => p.status === 'concluido').length

  const navItems: NavItem[] = [
    { id: 'inicio', label: 'Início / Painel', icon: Home },
    { id: 'cursos', label: 'Meus Cursos & Aulas', icon: GraduationCap },
    { id: 'materiais', label: 'Materiais de Estudo', icon: FolderDown },
    { id: 'calendario', label: 'Calendário & Prazos', icon: Calendar },
    {
      id: 'notificacoes',
      label: 'Notificações',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { id: 'minhas_notas', label: 'Minhas Notas e Frequência', icon: Award },
    { id: 'biblioteca', label: 'Minha Biblioteca', icon: BookOpen },
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    {
      id: 'suporte',
      label: 'Suporte & Ajuda',
      icon: HelpCircle,
      badge: openTicketsCount > 0 ? `${openTicketsCount} aberto(s)` : undefined,
    },
  ]

  const currentCourseName = currentStudent?.courseName || 'Engenharia de Software'
  const studentInitials = (currentUser?.name || currentStudent?.fullName || 'AL')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Banner de Identificação Institucional do Aluno */}
      <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-blue-900/40 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-[10px] font-mono uppercase tracking-wider"
          >
            Portal do Aluno
          </Badge>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Bem-vindo(a), <span className="text-white font-medium">{currentUser?.name}</span>
          </span>
          <span className="text-slate-500 text-[11px] hidden md:inline">
            • Matrícula Ativa: {currentCourseName}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Aulas Concluídas:</span>
            <span className="font-semibold text-emerald-400 font-mono">
              {completedLessonsCount}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <button
            onClick={() => setActiveTab('notificacoes')}
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors relative"
            title="Ver notificações"
          >
            <Bell className="w-3.5 h-3.5 text-blue-400" />
            <span>Avisos</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center bg-rose-500 text-white rounded-full text-[10px] w-4 h-4 font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Header Principal */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo e Botão Mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800"
              aria-label="Menu de Navegação"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => setActiveTab('inicio')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-white">
                    PortalCursos
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-semibold">
                    Aluno
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Ambiente Virtual de Aprendizagem</p>
              </div>
            </div>
          </div>

          {/* Navegação Rápida Topbar (Telas Grandes) */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 text-xs">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label.split('&')[0].trim()}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Perfil do Aluno e Menu de Ações */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white leading-tight truncate max-w-[160px]">
                {currentUser?.name || 'Aluno'}
              </span>
              <span className="text-[11px] text-blue-400 truncate max-w-[160px]">
                {currentCourseName}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full p-1 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Avatar className="w-9 h-9 border border-blue-500/30">
                    <AvatarImage
                      src={currentUser?.avatar || currentStudent?.photoUrl}
                      alt={currentUser?.name}
                    />
                    <AvatarFallback className="bg-gradient-to-tr from-blue-700 to-indigo-700 text-xs text-white font-bold">
                      {studentInitials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-slate-900 border-slate-800 text-slate-200"
              >
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-white">{currentUser?.name}</p>
                    <p className="text-xs text-slate-400">{currentUser?.email}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/30"
                      >
                        Matrícula Ativa
                      </Badge>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {currentStudent?.cpf ? `CPF: ${currentStudent.cpf.slice(0, 7)}***` : ''}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  onClick={() => setActiveTab('perfil')}
                  className="cursor-pointer text-xs focus:bg-slate-800 focus:text-white"
                >
                  <User className="w-3.5 h-3.5 mr-2 text-blue-400" />
                  Meu Perfil & Cadastro
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveTab('cursos')}
                  className="cursor-pointer text-xs focus:bg-slate-800 focus:text-white"
                >
                  <GraduationCap className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                  Meus Cursos e Aulas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveTab('minhas_notas')}
                  className="cursor-pointer text-xs focus:bg-slate-800 focus:text-white"
                >
                  <Award className="w-3.5 h-3.5 mr-2 text-amber-400" />
                  Boletim / Minhas Notas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveTab('suporte')}
                  className="cursor-pointer text-xs focus:bg-slate-800 focus:text-white"
                >
                  <HelpCircle className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                  Central de Ajuda
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-xs text-rose-400 focus:bg-rose-950/40 focus:text-rose-300"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sair do Portal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Sidebar Desktop Própria do Aluno */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Menu do Aluno</span>
              <Sparkles className="w-3 h-3 text-blue-400" />
            </div>

            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-400'}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : typeof item.badge === 'number'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Card Resumo do Curso */}
          <div className="p-4 rounded-xl border border-blue-900/30 bg-gradient-to-br from-blue-950/40 to-slate-900/70 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              <GraduationCap className="w-4 h-4" />
              <span>Curso Principal</span>
            </div>
            <p className="text-white font-medium text-xs leading-snug">{currentCourseName}</p>
            <div className="pt-1 border-t border-slate-800 text-[11px] space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Modalidade</span>
                <span className="text-slate-200">EAD / Híbrido</span>
              </div>
              <div className="flex justify-between">
                <span>Semestre Vigente</span>
                <span className="text-slate-200">2026/1</span>
              </div>
              <div className="flex justify-between">
                <span>Status da Matrícula</span>
                <span className="text-emerald-400 font-medium">Regular</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('cursos')}
              className="w-full h-8 text-[11px] border-blue-500/30 text-blue-300 hover:bg-blue-950/50 mt-1"
            >
              Continuar Aulas
            </Button>
          </div>
        </aside>

        {/* Menu Mobile / Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-sm p-4 flex flex-col justify-start pt-20 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 max-w-sm w-full mx-auto shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-white">Portal do Aluno</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 py-1 max-h-[60vh] overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-blue-400" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                <span>{currentUser?.email}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={logout}
                  className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 p-1"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Área de Conteúdo */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
