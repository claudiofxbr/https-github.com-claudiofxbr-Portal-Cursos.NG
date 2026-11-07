import React from 'react'
import { usePortal } from '@/context/PortalContext'
import { MODULE_PERMISSIONS } from '@/data/portalMockData'
import { ModuleKey } from '@/types/portal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  ArrowRight,
  Lock,
  UserCheck,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CreditCard,
  BarChart3,
  Users,
  Wrench,
  ShieldCheck,
  Cpu,
  UserCheck,
}

// Navegação validada: o atalho só dispara se o perfil pode acessar o módulo.
// (defesa em profundidade — o Index.tsx também valida, mas o componente não
// deve depender disso)
function handleNavigate(onNavigate: (mod: ModuleKey) => void, mod: ModuleKey, allowed: boolean) {
  if (allowed) onNavigate(mod)
}

export function DashboardOverview({ onNavigate }: { onNavigate: (mod: ModuleKey) => void }) {
  const { currentUser, canAccessModule, students, courses, charges, tickets, lgpdRequests } =
    usePortal()

  if (!currentUser) return null

  // Métricas resumidas
  const totalStudents = students.length
  const totalCourses = courses.length
  const pendingCharges = charges.filter((c) => c.status === 'pendente')
  const totalPendingAmount = pendingCharges.reduce((acc, c) => acc + c.amount, 0)
  const openTickets = tickets.filter(
    (t) => t.status !== 'concluido' && t.status !== 'cancelado',
  ).length
  const pendingLgpd = lgpdRequests.filter((l) => l.status === 'em_analise').length

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-slate-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-blue-500/40 text-blue-300 bg-blue-950/50 text-[11px]"
              >
                {currentUser.roleTitle}
              </Badge>
              <span className="text-xs text-slate-400 font-mono">
                Último acesso: {currentUser.lastAccess || 'Hoje'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Olá, {currentUser.name}! 👋
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Bem-vindo ao <strong>PortalCursos.NG</strong>. Seu perfil possui acesso customizado
              conforme a matriz de segurança e governança acadêmica PDR.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canAccessModule('alunos') && (
              <Button
                onClick={() => handleNavigate(onNavigate, 'alunos', canAccessModule('alunos'))}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Gestão de Alunos
              </Button>
            )}
            {canAccessModule('matriculas') && (
              <Button
                onClick={() =>
                  handleNavigate(onNavigate, 'matriculas', canAccessModule('matriculas'))
                }
                variant="outline"
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs h-9"
              >
                <GraduationCap className="w-4 h-4 mr-2 text-indigo-400" />
                Nova Matrícula
              </Button>
            )}
            {canAccessModule('financeiro') && (
              <Button
                onClick={() =>
                  handleNavigate(onNavigate, 'financeiro', canAccessModule('financeiro'))
                }
                variant="outline"
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs h-9"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Ver Cobranças Pix
              </Button>
            )}
            {canAccessModule('relatorios') && (
              <Button
                onClick={() =>
                  handleNavigate(onNavigate, 'relatorios', canAccessModule('relatorios'))
                }
                variant="outline"
                className="border-sky-700/60 bg-sky-950/40 hover:bg-sky-900/60 text-sky-200 text-xs h-9"
              >
                <BarChart3 className="w-4 h-4 mr-2 text-sky-400" />
                Relatórios Gerenciais
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Alunos Cadastrados
              <GraduationCap className="w-4 h-4 text-blue-400" />
            </span>
            <div className="text-2xl font-bold text-white">{totalStudents}</div>
            <p className="text-[11px] text-slate-500">Graduação e Pós-Graduação</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Cursos e-MEC
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </span>
            <div className="text-2xl font-bold text-white">{totalCourses}</div>
            <p className="text-[11px] text-slate-500">Cursos com portaria e trancamento</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Cobranças Pendentes
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </span>
            <div className="text-2xl font-bold text-emerald-400">
              R$ {totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500">{pendingCharges.length} faturas aguardando</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              Chamados de Manutenção
              <Wrench className="w-4 h-4 text-amber-400" />
            </span>
            <div className="text-2xl font-bold text-amber-400">{openTickets}</div>
            <p className="text-[11px] text-slate-500">Reparos prediais no campus</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Módulos Autorizados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Módulos do Sistema</h2>
            <p className="text-xs text-slate-400">
              Resumo interativo com base no perfil <strong>{currentUser.role}</strong>
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
            {MODULE_PERMISSIONS.filter((m) => canAccessModule(m.key)).length} de{' '}
            {MODULE_PERMISSIONS.length} módulos liberados
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_PERMISSIONS.map((mod) => {
            const Icon = ICON_MAP[mod.icon] || LayoutDashboard
            const isAllowed = canAccessModule(mod.key)

            return (
              <Card
                key={mod.key}
                className={`border transition-all ${
                  isAllowed
                    ? 'bg-slate-900/80 border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 group cursor-pointer'
                    : 'bg-slate-950/40 border-slate-800/40 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => handleNavigate(onNavigate, mod.key, isAllowed)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isAllowed
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {isAllowed ? (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Liberado
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Restrito
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {mod.label}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 line-clamp-2">
                    {mod.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-500">
                      Permitido a:{' '}
                      {mod.requiredRoles.length >= 9
                        ? 'Todos'
                        : mod.requiredRoles.slice(0, 3).join(', ') + '...'}
                    </span>
                    {isAllowed && (
                      <span className="text-blue-400 text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Acessar <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
