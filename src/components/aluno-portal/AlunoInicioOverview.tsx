import React from 'react'
import { usePortal } from '@/context/PortalContext'
import { StudentPortalTab } from '@/types/portal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Bell,
  Award,
  HelpCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileText,
  AlertCircle,
  PlayCircle,
  FolderDown,
  User,
} from 'lucide-react'

interface AlunoInicioOverviewProps {
  setActiveTab: (tab: StudentPortalTab) => void
}

export function AlunoInicioOverview({ setActiveTab }: AlunoInicioOverviewProps) {
  const {
    currentUser,
    students,
    courses,
    lessonProgress,
    courseMaterials,
    calendarEvents,
    studentNotifications,
    studentSupportTickets,
    grades,
    attendance,
  } = usePortal()

  const currentStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
    ) || students[0]

  const effectiveStudentId = currentUser?.studentId || currentStudent?.id || 'dbphexr97czw7cb'

  // Curso matriculado
  const myCourse =
    courses.find((c) => c.id === currentStudent?.courseId || c.name.includes('Software')) ||
    courses[0]

  // Progresso de aulas
  const myProgress = lessonProgress.filter((p) => p.studentId === effectiveStudentId)
  const totalLessonsKnown = Math.max(myProgress.length, 6)
  const completedCount = myProgress.filter((p) => p.status === 'concluido').length
  const progressPercent = Math.round((completedCount / totalLessonsKnown) * 100)

  // Próxima aula sugerida
  const nextLesson =
    myProgress.find((p) => p.status === 'em_andamento') ||
    myProgress.find((p) => p.status === 'nao_iniciado') ||
    myProgress[0]

  // Notificações recentes
  const myNotifications = studentNotifications
    .filter((n) => n.studentId === effectiveStudentId)
    .slice(0, 3)

  // Próximos eventos
  const upcomingEvents = calendarEvents
    .filter((e) => !e.studentId || e.studentId === effectiveStudentId)
    .slice(0, 3)

  // Materiais recentes
  const recentMaterials = courseMaterials.slice(0, 3)

  // Notas e Frequência do aluno
  const myGrades = grades.filter(
    (g) =>
      g.studentId === effectiveStudentId ||
      (currentStudent && g.studentName === currentStudent.fullName),
  )
  const myAttendance = attendance.filter(
    (a) =>
      a.studentId === effectiveStudentId ||
      (currentStudent && a.studentName === currentStudent.fullName),
  )

  const gpa =
    myGrades.length > 0
      ? (myGrades.reduce((acc, g) => acc + g.value, 0) / myGrades.length).toFixed(1)
      : '8.8'

  const attendanceRate =
    myAttendance.length > 0
      ? Math.round(
          (myAttendance.filter((a) => a.status === 'presente' || a.status === 'falta_justificada')
            .length /
            myAttendance.length) *
            100,
        )
      : 92

  return (
    <div className="space-y-6">
      {/* Banner de Boas-vindas com Destaque Acadêmico */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-6 sm:p-8 border border-blue-800/40 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Ano Letivo 2026 • 1º Semestre</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Olá, {currentUser?.name?.split(' ')[0] || 'Aluno'}! Bom ver você de volta.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Acompanhe suas disciplinas, prazos de entrega e materiais pedagógicos no curso de{' '}
            <span className="text-white font-semibold">
              {currentStudent?.courseName || myCourse?.name || 'Engenharia de Software'}
            </span>
            . Mantenha seu ritmo de estudos em dia!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => setActiveTab('cursos')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 gap-2 text-xs sm:text-sm"
            >
              <PlayCircle className="w-4 h-4" />
              Continuar Assistindo
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab('calendario')}
              className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 gap-2 text-xs sm:text-sm"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              Ver Agenda e Prazos
            </Button>
          </div>
        </div>

        {/* Efeito decorativo de fundo */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grid de Métricas Principais (Progresso, Média, Frequência, Avisos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Progresso */}
        <Card className="bg-slate-900/70 border-slate-800 hover:border-slate-700 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400">
              Progresso das Aulas
            </CardTitle>
            <BookOpen className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white font-mono">{progressPercent}%</span>
              <span className="text-xs text-slate-400 font-mono">
                {completedCount}/{totalLessonsKnown} aulas
              </span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-slate-800" />
            <p className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Módulo Atual</span>
              <span className="text-blue-300 font-medium truncate max-w-[140px]">
                {nextLesson?.moduleName || 'Módulo 1'}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Card Boletim / Média Geral */}
        <Card className="bg-slate-900/70 border-slate-800 hover:border-slate-700 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400">
              Média Acadêmica (CR)
            </CardTitle>
            <Award className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-400 font-mono">{gpa}</span>
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 text-[10px]"
              >
                Aprovado
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">Média mínima requerida: 6.0</p>
            <button
              onClick={() => setActiveTab('minhas_notas')}
              className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1 pt-1"
            >
              Consultar boletim completo <ArrowRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>

        {/* Card Frequência */}
        <Card className="bg-slate-900/70 border-slate-800 hover:border-slate-700 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400">Frequência Global</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white font-mono">{attendanceRate}%</span>
              <span className="text-[10px] text-slate-400">Exigido: 75%</span>
            </div>
            <Progress value={attendanceRate} className="h-2 bg-slate-800" />
            <p className="text-[11px] text-emerald-400 font-medium pt-1">
              Situação regular perante o MEC
            </p>
          </CardContent>
        </Card>

        {/* Card Chamados de Suporte */}
        <Card className="bg-slate-900/70 border-slate-800 hover:border-slate-700 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400">
              Central de Atendimento
            </CardTitle>
            <HelpCircle className="w-4 h-4 text-cyan-400" />
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white font-mono">
                {studentSupportTickets.length}
              </span>
              <span className="text-[11px] text-slate-400">tickets abertos</span>
            </div>
            <p className="text-[11px] text-slate-400">Secretaria, Financeiro & TI</p>
            <button
              onClick={() => setActiveTab('suporte')}
              className="text-[11px] text-cyan-400 hover:underline inline-flex items-center gap-1 pt-1"
            >
              Abrir novo chamado <ArrowRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Seção Principal: Em Andamento + Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Curso em Andamento & Próxima Aula (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  Continue de Onde Parou
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  {myCourse?.name || 'Engenharia de Software'} • 360 horas
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('cursos')}
                className="h-8 text-xs border-slate-700 text-blue-400 hover:bg-slate-800"
              >
                Ver Todas as Aulas
              </Button>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-4">
              {nextLesson ? (
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-[10px]">
                        {nextLesson.moduleName}
                      </Badge>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {nextLesson.durationMinutes} min
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{nextLesson.lessonTitle}</h3>
                    <p className="text-xs text-slate-400">
                      {nextLesson.status === 'concluido'
                        ? 'Aula já concluída. Clique para revisar o conteúdo.'
                        : 'Aula pronta para reprodução. Conteúdo com quiz ao final.'}
                    </p>
                  </div>

                  <Button
                    onClick={() => setActiveTab('cursos')}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white shrink-0 gap-2 text-xs"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {nextLesson.status === 'concluido' ? 'Rever Aula' : 'Assistir Agora'}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhuma aula pendente no momento.</p>
              )}

              {/* Materiais Recomendados da Semana */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FolderDown className="w-3.5 h-3.5 text-indigo-400" />
                    Materiais Pedagógicos Recomendados
                  </h4>
                  <button
                    onClick={() => setActiveTab('materiais')}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Ver acervo completo
                  </button>
                </div>
                <div className="space-y-2">
                  {recentMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-200 truncate">{mat.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {mat.subject} • {mat.fileSize || 'PDF'}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveTab('materiais')}
                        className="h-7 text-xs text-blue-400 hover:bg-blue-950/40 shrink-0"
                      >
                        Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Calendário de Prazos & Notificações (1 col) */}
        <div className="space-y-6">
          {/* Card Notificações / Avisos */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                Alertas e Notificações
              </CardTitle>
              <button
                onClick={() => setActiveTab('notificacoes')}
                className="text-[11px] text-blue-400 hover:underline"
              >
                Ver todas
              </button>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2.5">
              {myNotifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Nenhum aviso no momento.</p>
              ) : (
                myNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => setActiveTab('notificacoes')}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      notif.read
                        ? 'bg-slate-900/30 border-slate-800 text-slate-400'
                        : 'bg-blue-950/20 border-blue-800/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-white text-xs truncate">
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2">{notif.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Card Próximos Prazos / Agenda */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Próximos Prazos
              </CardTitle>
              <button
                onClick={() => setActiveTab('calendario')}
                className="text-[11px] text-blue-400 hover:underline"
              >
                Calendário
              </button>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2.5">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Nenhum prazo cadastrado.</p>
              ) : (
                upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-white text-xs">{ev.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {ev.subject || 'Atividade Acadêmica'}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 pt-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>Entrega: {ev.startDate}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize border-slate-700 text-slate-300 shrink-0"
                    >
                      {ev.type}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Acesso Rápido ao Perfil */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Dados Pessoais & Documentos</p>
                <p className="text-[11px] text-slate-400">Mantenha seu contato atualizado</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('perfil')}
              className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              Editar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
