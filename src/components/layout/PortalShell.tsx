import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { MODULE_PERMISSIONS } from '@/data/portalMockData'
import { ModuleKey, UserRole } from '@/types/portal'
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
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CreditCard,
  Users,
  Wrench,
  ShieldCheck,
  Cpu,
  BarChart3,
  Lock,
  LogOut,
  ChevronDown,
  Building2,
  Bell,
  Menu,
  X,
  UserCheck,
  Award,
  Tv,
  Library,
  LibraryBig,
  Calendar,
  Bot,
  ClipboardList,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CreditCard,
  Users,
  Wrench,
  ShieldCheck,
  Cpu,
  BarChart3,
  UserCheck,
  Award,
  Tv,
  Library,
  LibraryBig,
  Calendar,
  Bot,
}

interface PortalHeaderAndSidebarProps {
  activeModule: ModuleKey
  setActiveModule: (m: ModuleKey) => void
  children: React.ReactNode
}

export function PortalShell({
  activeModule,
  setActiveModule,
  children,
}: PortalHeaderAndSidebarProps) {
  const { currentUser, logout, lockGate, canAccessModule } = usePortal()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!currentUser) return null

  const roleColors: Record<UserRole, string> = {
    root: 'bg-red-500/10 text-red-400 border-red-500/30',
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    secretaria: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    financeiro: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    academico: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    matricula: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    coordenador: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    professor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    aluno: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Banner: Informações de Sessão Autenticada Real */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-slate-400 font-medium whitespace-nowrap flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            Sessão Real Autenticada:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              {currentUser.email}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-mono px-2 py-0.5 border ${roleColors[currentUser.role]}`}
            >
              {currentUser.role}
            </Badge>
            <span className="hidden sm:inline text-slate-400 text-[11px]">
              • Para alternar de perfil, faça logout e entre com outra credencial
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] border-emerald-500/40 text-emerald-400 font-mono"
          >
            ● Portão Autenticado
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={lockGate}
            className="h-6 text-[11px] text-slate-400 hover:text-rose-400 px-2"
            title="Trancar portão de acesso com senha"
          >
            <Lock className="w-3 h-3 mr-1" />
            Trancar Portão
          </Button>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => setActiveModule('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-white">
                    PortalCursos
                  </span>
                  <span className="text-xs px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono font-semibold">
                    .NG
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Gestão Acadêmica & Finanças</p>
              </div>
            </div>
          </div>

          {/* User Menu & Role */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                {currentUser.roleTitle}
              </span>
            </div>

            <Badge
              variant="outline"
              className={`hidden md:inline-flex text-[11px] uppercase ${roleColors[currentUser.role]}`}
            >
              {currentUser.role}
            </Badge>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Avatar className="w-9 h-9 border border-slate-700">
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback className="bg-slate-800 text-xs text-white">
                      {currentUser.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-slate-900 border-slate-800 text-slate-200"
              >
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-white">{currentUser.name}</p>
                    <p className="text-xs text-slate-400">{currentUser.email}</p>
                    <Badge
                      variant="secondary"
                      className="w-fit text-[10px] mt-1 bg-slate-800 text-blue-300"
                    >
                      {currentUser.department}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  onClick={() => setActiveModule('dashboard')}
                  className="cursor-pointer text-xs focus:bg-slate-800 focus:text-white"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-2" />
                  Ir ao Painel Principal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveModule('diagnostico')}
                  className="cursor-pointer text-xs focus:bg-slate-800 focus:text-white"
                >
                  <Cpu className="w-3.5 h-3.5 mr-2" />
                  Diagnóstico do Sistema
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-xs text-rose-400 focus:bg-rose-950/40 focus:text-rose-300"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sair da Sessão (Logout)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main App Container: Sidebar + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Módulos do Sistema
            </div>
            {MODULE_PERMISSIONS.map((mod) => {
              const Icon = ICON_MAP[mod.icon] || LayoutDashboard
              const isAllowed = canAccessModule(mod.key)
              const isActive = activeModule === mod.key

              return (
                <button
                  key={mod.key}
                  disabled={!isAllowed}
                  onClick={() => isAllowed && setActiveModule(mod.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isAllowed
                        ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        : 'text-slate-600 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isAllowed ? 'text-blue-400' : 'text-slate-600'}`}
                    />
                    <span className="truncate">{mod.label}</span>
                  </div>
                  {!isAllowed && (
                    <span title="Perfil sem permissão neste módulo">
                      <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick Info Box */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Ambiente</span>
              <span className="text-emerald-400 font-mono text-[11px]">Sandbox Demo</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>MEC / e-MEC</span>
              <span className="text-blue-400 font-mono text-[11px]">Regulado</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Checkout Pix</span>
              <span className="text-amber-400 font-mono text-[11px]">Simulado</span>
            </div>
          </div>
        </aside>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm p-4 flex flex-col justify-start pt-20">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 max-w-sm w-full mx-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-sm font-semibold text-white">Navegar Módulos</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {MODULE_PERMISSIONS.map((mod) => {
                  const Icon = ICON_MAP[mod.icon] || LayoutDashboard
                  const isAllowed = canAccessModule(mod.key)
                  const isActive = activeModule === mod.key

                  return (
                    <button
                      key={mod.key}
                      disabled={!isAllowed}
                      onClick={() => {
                        if (isAllowed) {
                          setActiveModule(mod.key)
                          setMobileMenuOpen(false)
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isAllowed
                            ? 'text-slate-300 hover:bg-slate-800'
                            : 'text-slate-600 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{mod.label}</span>
                      </div>
                      {!isAllowed && <Lock className="w-3 h-3 text-slate-600" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
