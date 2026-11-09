import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  Award,
  ChevronRight,
  Sparkles,
  FileCheck,
  RotateCcw,
} from 'lucide-react'
import { LessonProgress } from '@/types/portal'
import { VideoPlayerEmbed } from '@/components/ead/VideoPlayerEmbed'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tv,
  Play,
  ShieldAlert,
  AlertTriangle,
  Lock,
  RefreshCw,
  Info,
  HelpCircle,
  Download,
} from 'lucide-react'
import { AlunoEadCourseView } from '@/components/aluno-portal/AlunoEadCourseView'
import { EadCourseViewErrorBoundary } from '@/components/aluno-portal/EadCourseViewErrorBoundary'
import { InstitutionalErrorBoundary } from '@/components/common/InstitutionalErrorBoundary'
import { generateEadCertificatePdf } from '@/lib/eadCertificatePdfExport'
import { generateCourseOfflineKitPdf } from '@/lib/eadOfflineKitPdfExport'
import {
  checkEadEligibility,
  checkEadCourseAccess,
  isEadCourseActive,
} from '@/lib/eadAccessValidator'
import { useToast } from '@/hooks/use-toast'

// Aulas de fallback do curso de graduação (Engenharia de Software). Usadas quando o
// aluno ainda não tem registros em lesson_progress, para que a grade do curso
// continue exibível (com player real) mesmo sem progresso salvo no banco.
const STATIC_ENGSOFT_LESSONS: Omit<LessonProgress, 'id' | 'studentId' | 'courseId'>[] = [
  {
    moduleName: 'Módulo 1: Fundamentos de Arquitetura em Nuvem',
    lessonId: 'engsoft-m1-l1',
    lessonTitle: 'Aula 01: Introdução aos Princípios Cloud Native e 12-Factor Apps',
    durationMinutes: 45,
    status: 'nao_iniciado',
    lastWatchedSeconds: 0,
    videoProvider: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=Wvf0mBNGjXY',
    videoEmbedId: 'Wvf0mBNGjXY',
  },
  {
    moduleName: 'Módulo 1: Fundamentos de Arquitetura em Nuvem',
    lessonId: 'engsoft-m1-l2',
    lessonTitle: 'Aula 02: Contêineres com Docker e Orquestração com Kubernetes',
    durationMinutes: 60,
    status: 'nao_iniciado',
    lastWatchedSeconds: 0,
    videoProvider: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=fqMOX6JJhGo',
    videoEmbedId: 'fqMOX6JJhGo',
  },
  {
    moduleName: 'Módulo 2: Microsserviços e Mensageria',
    lessonId: 'engsoft-m2-l1',
    lessonTitle: 'Aula 03: Padrões de Comunicação Síncrona vs Assíncrona (RabbitMQ / Kafka)',
    durationMinutes: 55,
    status: 'nao_iniciado',
    lastWatchedSeconds: 0,
    videoProvider: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=xy6jNKI3tKU',
    videoEmbedId: 'xy6jNKI3tKU',
  },
  {
    moduleName: 'Módulo 2: Microsserviços e Mensageria',
    lessonId: 'engsoft-m2-l2',
    lessonTitle: 'Aula 04: Service Mesh, API Gateways e Resiliência (Circuit Breakers)',
    durationMinutes: 50,
    status: 'nao_iniciado',
    lastWatchedSeconds: 0,
    videoProvider: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=kyNL7yCvQQc',
    videoEmbedId: 'kyNL7yCvQQc',
  },
  {
    moduleName: 'Módulo 3: Engenharia de Software Moderna & DevOps',
    lessonId: 'engsoft-m3-l1',
    lessonTitle: 'Aula 05: Pipelines CI/CD com GitHub Actions e Deploy Automatizado',
    durationMinutes: 65,
    status: 'nao_iniciado',
    lastWatchedSeconds: 0,
    videoProvider: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=j5Zsa_eOXeY',
    videoEmbedId: 'j5Zsa_eOXeY',
  },
  {
    moduleName: 'Módulo 3: Engenharia de Software Moderna & DevOps',
    lessonId: 'engsoft-m3-l2',
    lessonTitle: 'Aula 06: Observabilidade: Logs Estruturados, Métricas e Traces com OpenTelemetry',
    durationMinutes: 40,
    status: 'nao_iniciado',
    lastWatchedSeconds: 0,
    videoProvider: 'youtube',
    // ID validado via oEmbed do YouTube (o anterior, gyzBTOgGKTI, foi removido do ar)
    videoUrl: 'https://www.youtube.com/watch?v=CB2nEcnBBcE',
    videoEmbedId: 'CB2nEcnBBcE',
  },
  {
    moduleName: 'Módulo 4: Qualidade e Testes de Software',
    lessonId: 'engsoft-m4-l1',
    lessonTitle: 'Aula 07: Estratégias de Testes: Unitários, Integração e Mutação',
    durationMinutes: 50,
    status: 'nao_iniciado',
    lastWatchedSeconds: 0,
    videoProvider: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=jydYq7oAtD8',
    videoEmbedId: 'jydYq7oAtD8',
  },
]

export interface AlunoCursosModuleProps {
  initialEadCourseId?: string | null
  initialEadLessonId?: string | null
  onClearInitialEadCourseId?: () => void
  onNavigateToBiblioteca?: (searchQuery?: string) => void
}

export function AlunoCursosModule({
  initialEadCourseId,
  initialEadLessonId,
  onClearInitialEadCourseId,
  onNavigateToBiblioteca,
}: AlunoCursosModuleProps = {}) {
  const {
    currentUser,
    students,
    courses,
    lessonProgress,
    updateLessonProgress,
    eadCourses,
    eadLessons,
    eadMaterials,
    isSyncing,
    isBackendReady,
    refreshDiagnostic,
    certificates,
    issueEadCertificate,
  } = usePortal()

  const { toast } = useToast()
  const { libraryBooks } = usePortal()
  const [generatingEadCertCourseId, setGeneratingEadCertCourseId] = useState<string | null>(null)
  const [generatingCourseKitId, setGeneratingCourseKitId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [activeLessonModal, setActiveLessonModal] = useState<LessonProgress | null>(null)
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null)
  const [activeEadCourseId, setActiveEadCourseId] = useState<string | null>(
    initialEadCourseId || null,
  )
  const [accessErrorMessage, setAccessErrorMessage] = useState<string | null>(null)

  // Sincroniza quando o prop initialEadCourseId for atualizado externamente
  React.useEffect(() => {
    if (initialEadCourseId) {
      setActiveEadCourseId(initialEadCourseId)
    }
  }, [initialEadCourseId])

  // Fecha a view de curso EAD (voltando à lista) limpando também a sessão de reload
  // (o AlunoPortalMaster limpa o sessionStorage correspondente)
  const closeEadCourseView = () => {
    setActiveEadCourseId(null)
    setAccessErrorMessage(null)
    if (onClearInitialEadCourseId) onClearInitialEadCourseId()
  }

  // E-mail lido de forma defensiva: registro de aluno sem e-mail não pode
  // derrubar a montagem da view (era uma das exceções do bug do player EAD).
  const safeEmail = (v?: string | null): string => (typeof v === 'string' ? v.toLowerCase() : '')
  const currentStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (!!currentUser?.email && safeEmail(s.email) === currentUser.email.toLowerCase()),
    ) || students[0]

  const effectiveStudentId = currentUser?.studentId || currentStudent?.id || 'dbphexr97czw7cb'

  // Validação de elegibilidade cadastral do aluno
  const eligibility = checkEadEligibility(currentStudent)

  // Cursos EAD: apenas cursos ATIVOS (status = 'publicado') e que o aluno esteja matriculado
  const myEadCourses = eadCourses.filter((c) => {
    // Curso inativo não aparece em Meus Cursos
    if (!isEadCourseActive(c)) return false
    // Aluno deve estar matriculado no curso
    if (!c.enrolledStudentIds || c.enrolledStudentIds.length === 0) return true
    return c.enrolledStudentIds.includes(effectiveStudentId)
  })

  // Se o aluno clicou para assistir um curso EAD específico (ou tentou abrir por ID)
  const candidateEadCourse = activeEadCourseId
    ? eadCourses.find((c) => c.id === activeEadCourseId)
    : null

  // Valida autorização e status do curso selecionado
  const courseAccessCheck = candidateEadCourse
    ? checkEadCourseAccess(candidateEadCourse, effectiveStudentId)
    : null

  const selectedEadCourse =
    candidateEadCourse && courseAccessCheck?.hasAccess ? candidateEadCourse : null

  const selectedEadLessons = selectedEadCourse
    ? eadLessons.filter((l) => l.eadCourseId === selectedEadCourse.id)
    : []

  // Cursos do aluno: o matriculado explicitamente + cursos do catálogo para navegação rica
  const enrolledCourseId = currentStudent?.courseId || courses[0]?.id || 'crs-eng-soft'
  const enrolledCourse =
    courses.find((c) => c.id === enrolledCourseId || c.name.includes('Software')) || courses[0]

  // Se não houver curso selecionado, usa o matriculado
  const activeCourse =
    courses.find((c) => c.id === (selectedCourseId || enrolledCourse?.id)) || enrolledCourse

  // Aulas e progresso do aluno para o curso ativo. Aceita também o courseId legado
  // 'crs-eng-soft' (registros antigos de seed) para não perder o progresso salvo.
  const studentLessons = lessonProgress.filter(
    (p) =>
      p.studentId === effectiveStudentId &&
      (!p.courseId ||
        p.courseId === activeCourse?.id ||
        (activeCourse?.code === 'ENG-SOFT-01' && p.courseId === 'crs-eng-soft')),
  )

  // Se a lista de progresso estiver vazia, cria uma lista padrão para exibir a grade
  const displayLessons: LessonProgress[] =
    studentLessons.length > 0
      ? studentLessons
      : STATIC_ENGSOFT_LESSONS.map((base, idx) => ({
          ...base,
          id: `lp-fallback-${idx + 1}`,
          studentId: effectiveStudentId,
          courseId: activeCourse?.id || 'crs-eng-soft',
        }))

  // Filtro de busca de aulas
  const filteredLessons = displayLessons.filter(
    (l) =>
      l.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.moduleName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Agrupamento por módulo
  const modulesMap = filteredLessons.reduce(
    (acc, lesson) => {
      const mod = lesson.moduleName || 'Módulo Geral'
      if (!acc[mod]) acc[mod] = []
      acc[mod].push(lesson)
      return acc
    },
    {} as Record<string, LessonProgress[]>,
  )

  // Estatísticas de progresso
  const totalLessons = displayLessons.length
  const completedCount = displayLessons.filter((l) => l.status === 'concluido').length
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const handleToggleLessonComplete = async (lesson: LessonProgress) => {
    setSavingLessonId(lesson.lessonId)
    const nextStatus = lesson.status === 'concluido' ? 'em_andamento' : 'concluido'
    const completedAt =
      nextStatus === 'concluido'
        ? new Date().toISOString().replace('T', ' ').substring(0, 16)
        : undefined

    await updateLessonProgress(
      lesson.lessonId,
      {
        status: nextStatus,
        completedAt,
        lastWatchedSeconds: nextStatus === 'concluido' ? (lesson.durationMinutes || 30) * 60 : 0,
      },
      activeCourse?.id,
      lesson.moduleName,
      lesson.lessonTitle,
    )

    if (activeLessonModal && activeLessonModal.lessonId === lesson.lessonId) {
      setActiveLessonModal({
        ...activeLessonModal,
        status: nextStatus,
        completedAt,
      })
    }
    setSavingLessonId(null)
  }

  // 1. ESTADO DE CARREGAMENTO INICIAL
  if (isSyncing && !isBackendReady) {
    return (
      <div className="p-12 text-center bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">Carregando Ambiente EAD...</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Sincronizando seus cursos matriculados, videoaulas e progresso com a base acadêmica.
          </p>
        </div>
      </div>
    )
  }

  // 2. BLOQUEIO DE ACESSO AO EAD POR SITUAÇÃO CADASTRAL DO ALUNO (Item 1)
  if (!eligibility.isEligibleToStudy) {
    return (
      <div className="space-y-6">
        {/* Top Header com badge de bloqueio */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-slate-400" />
              Meus Cursos & Trilhas de Videoaulas
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Ambiente Virtual de Aprendizagem (AVA) do PortalCursos.NG
            </p>
          </div>

          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-300 bg-amber-500/10 px-3 py-1 text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Lock className="w-3.5 h-3.5" />
            Situação: {eligibility.studentStatusLabel}
          </Badge>
        </div>

        {/* Painel claro de bloqueio de acesso */}
        <Card className="bg-amber-950/20 border-amber-500/30 text-slate-200">
          <CardHeader className="p-6 pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  {eligibility.reasonTitle}
                </CardTitle>
                <CardDescription className="text-sm text-amber-200/80 leading-relaxed">
                  {eligibility.reasonMessage}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-4">
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <Info className="w-4 h-4" />
                Como regularizar seu acesso:
              </div>
              <p>
                Para liberar o player de videoaulas e a continuidade do seu progresso, procure a
                secretaria acadêmica através da aba <strong>Suporte</strong> ou pelo e-mail
                institucional para reativar ou regularizar sua matrícula.
              </p>
              <p className="text-slate-400 text-[11px]">
                Seus registros anteriores de progresso e notas permanecem salvos com segurança no
                sistema.
              </p>
            </div>

            {/* Exibe o histórico de progresso existente para visualização, SEM permissão para estudar/marcar */}
            {studentLessons.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Histórico de Aulas Concluídas Anteriormente (Apenas Leitura)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {completedCount} de {totalLessons} aulas ({progressPercent}%)
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2 bg-slate-800" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // 3. SE O ALUNO TENTOU ABRIR UM CURSO EAD ESPECÍFICO
  if (activeEadCourseId) {
    // Caso 1: Curso não encontrado
    if (!candidateEadCourse) {
      return (
        <div className="space-y-6">
          <Card className="bg-slate-900/80 border-slate-800 p-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Curso EAD Não Encontrado</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                O curso solicitado não existe ou foi removido do catálogo.
              </p>
            </div>
            <Button
              onClick={closeEadCourseView}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              Voltar para Meus Cursos
            </Button>
          </Card>
        </div>
      )
    }

    // Caso 2: Curso inativo (Item 2)
    if (!courseAccessCheck?.isCourseActive) {
      return (
        <div className="space-y-6">
          <Card className="bg-amber-950/20 border-amber-500/30 p-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Curso indisponível no momento</h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                {candidateEadCourse.title} está temporariamente indisponível para exibição. A
                coordenação pedagógica suspendeu a publicação deste curso para revisão ou
                atualização curricular.
              </p>
            </div>
            <Button
              onClick={closeEadCourseView}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              Voltar para Meus Cursos
            </Button>
          </Card>
        </div>
      )
    }

    // Caso 3: Aluno não matriculado / Sem permissão (Item 3)
    if (!courseAccessCheck?.isEnrolled) {
      return (
        <div className="space-y-6">
          <Card className="bg-rose-950/20 border-rose-500/30 p-8 text-center space-y-4">
            <Lock className="w-10 h-10 text-rose-400 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Sem Permissão de Acesso</h2>
              <p className="text-xs text-rose-200/80 max-w-md mx-auto">
                Você não está matriculado neste curso EAD ({candidateEadCourse.title}). Por medidas
                de segurança e autorização acadêmica, apenas alunos com matrícula ativa nesta turma
                podem assistir às videoaulas.
              </p>
            </div>
            <Button
              onClick={closeEadCourseView}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              Voltar para Meus Cursos
            </Button>
          </Card>
        </div>
      )
    }

    // Caso 4: Acesso autorizado ao curso EAD — envolto em error boundary local:
    // qualquer exceção (aula malformada, vídeo quebrado) mantém o aluno logado
    // em Meus Cursos com mensagem institucional, nunca caindo no portão.
    if (selectedEadCourse) {
      return (
        <EadCourseViewErrorBoundary
          courseTitle={selectedEadCourse.title}
          onBackToList={closeEadCourseView}
        >
          <AlunoEadCourseView
            course={selectedEadCourse}
            lessons={selectedEadLessons}
            lessonProgress={lessonProgress}
            materials={eadMaterials}
            studentId={effectiveStudentId}
            initialLessonId={initialEadLessonId}
            onNavigateToBiblioteca={onNavigateToBiblioteca}
            onToggleLessonProgress={async (
              lessonId,
              completed,
              courseId,
              moduleName,
              lessonTitle,
            ) => {
              // Revalidação estrita antes de registrar
              if (!eligibility.canToggleProgress) {
                return
              }
              await updateLessonProgress(
                lessonId,
                {
                  status: completed ? 'concluido' : 'em_andamento',
                  completedAt: completed ? new Date().toISOString() : undefined,
                },
                courseId,
                moduleName,
                lessonTitle,
              )
            }}
            onBackToList={closeEadCourseView}
          />
        </EadCourseViewErrorBoundary>
      )
    }
  }

  const handleSelectEadCourse = (courseId: string) => {
    setActiveEadCourseId(courseId)
  }

  // Abertura do player da grade de graduação, blindada contra dados malformados:
  // aula sem ID/título/vídeo válido abre aviso institucional em vez de exceção.
  const handleOpenGraduationLesson = (lesson: LessonProgress) => {
    if (!lesson || typeof lesson !== 'object') {
      toast({
        title: 'Aula indisponível',
        description:
          'Não foi possível identificar a aula selecionada. Atualize a página ou contate o suporte.',
        variant: 'destructive',
      })
      return
    }
    if (!lesson.videoUrl && !lesson.videoEmbedId) {
      toast({
        title: 'Vídeo não cadastrado',
        description: `A aula "${lesson.lessonTitle || 'selecionada'}" ainda não possui videoaula publicada. Contate a secretaria acadêmica.`,
        variant: 'destructive',
      })
      return
    }
    setActiveLessonModal(lesson)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-400" />
            Meus Cursos & Trilhas de Videoaulas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Acompanhe a grade curricular, assista às videoaulas do EAD e conclua cada etapa com
            persistência.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-3 py-1 text-xs"
          >
            Matrícula Regular ({eligibility.studentStatusLabel})
          </Badge>
          {myEadCourses.length > 0 && (
            <Badge className="bg-indigo-600/30 text-indigo-300 border-indigo-500/40 text-xs">
              {myEadCourses.length} Curso{myEadCourses.length !== 1 ? 's' : ''} EAD
            </Badge>
          )}
        </div>
      </div>

      {/* Seção de Cursos EAD com Videoaulas ou Estado Vazio Orientador (Item 4) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Cursos EAD com Videoaulas</h2>
          </div>
          {myEadCourses.length > 0 && (
            <span className="text-xs text-slate-400">
              Player integrado com YouTube, Vimeo e MP4
            </span>
          )}
        </div>

        {myEadCourses.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-800 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Tv className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-sm font-semibold text-white">Nenhum curso EAD matriculado</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você ainda não está matriculado em nenhum curso EAD. Procure a secretaria para se
                matricular.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDiagnostic}
                className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar Dados
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myEadCourses.map((eadCourse) => {
              const courseLessons = eadLessons.filter((l) => l.eadCourseId === eadCourse.id)
              const completedLessonsCount = courseLessons.filter((l) => {
                const prog = lessonProgress.find(
                  (p) =>
                    p.studentId === effectiveStudentId &&
                    p.courseId === eadCourse.id &&
                    p.lessonId === l.id,
                )
                return prog?.status === 'concluido'
              }).length

              const pct =
                courseLessons.length > 0
                  ? Math.round((completedLessonsCount / courseLessons.length) * 100)
                  : 0
              const isCourseCompleted = pct >= 100 && courseLessons.length > 0

              return (
                <Card
                  key={eadCourse.id}
                  className="bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between overflow-hidden group shadow-md"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-indigo-600/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                          EAD Videoaulas
                        </Badge>
                        {(eadCourse.recommendedBookIds?.length || 0) > 0 && (
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" />
                            {eadCourse.recommendedBookIds?.length} obra(s)
                          </Badge>
                        )}
                        {isCourseCompleted ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                            Concluído
                          </Badge>
                        ) : pct > 0 ? (
                          <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px]">
                            {pct}%
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {eadCourse.workloadHours || 20}h
                      </span>
                    </div>

                    <CardTitle className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {eadCourse.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {eadCourse.description || 'Videoaulas exclusivas com material interativo.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Progresso Geral do Curso</span>
                        <span
                          className={`font-semibold font-mono ${
                            isCourseCompleted
                              ? 'text-emerald-400'
                              : pct > 0
                                ? 'text-indigo-300'
                                : 'text-slate-400'
                          }`}
                        >
                          {completedLessonsCount}/{courseLessons.length} aulas ({pct}%)
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        className={`h-2 bg-slate-800 ${
                          isCourseCompleted ? '[&>div]:bg-emerald-500' : '[&>div]:bg-indigo-500'
                        }`}
                      />
                    </div>

                    {/* Certificado EAD para cursos 100% concluídos */}
                    {isCourseCompleted &&
                      (() => {
                        const eadCert = certificates.find(
                          (c) =>
                            c.studentId === currentStudent?.id &&
                            (c.docType === 'certificado_ead' ||
                              c.verificationCode.startsWith('CEAD-')) &&
                            (c.eadCourseId === eadCourse.id ||
                              c.courseId === eadCourse.id ||
                              c.courseName.toLowerCase().trim() ===
                                eadCourse.title.toLowerCase().trim()) &&
                            c.status === 'ativo',
                        )

                        const handleObtainCertificate = async () => {
                          if (!currentStudent) return
                          if (eadCert) {
                            generateEadCertificatePdf(eadCert)
                            return
                          }
                          setGeneratingEadCertCourseId(eadCourse.id)
                          try {
                            const res = await issueEadCertificate({
                              studentId: currentStudent.id,
                              eadCourseId: eadCourse.id,
                            })
                            if (res.certificate) {
                              generateEadCertificatePdf(res.certificate)
                            }
                          } finally {
                            setGeneratingEadCertCourseId(null)
                          }
                        }

                        return (
                          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                Certificado Concluído
                              </span>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {eadCert
                                  ? eadCert.verificationCode
                                  : 'Disponível para emissão imediata'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleObtainCertificate}
                              disabled={generatingEadCertCourseId === eadCourse.id}
                              className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-1 shrink-0 font-semibold"
                              title="Baixar Certificado EAD em PDF"
                            >
                              <Download className="w-3 h-3" />
                              <span>
                                {generatingEadCertCourseId === eadCourse.id
                                  ? 'Gerando...'
                                  : 'Baixar PDF'}
                              </span>
                            </Button>
                          </div>
                        )
                      })()}

                    <div className="space-y-2 pt-1">
                      {/* Botão Kit de Estudo do Curso (PDF) para estudo offline */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!eligibility.isEligibleToStudy) {
                            toast({
                              title: 'Download indisponível',
                              description:
                                eligibility.reasonMessage ||
                                'O kit de estudo offline não está disponível para matrículas suspensas ou trancadas.',
                              variant: 'destructive',
                            })
                            return
                          }

                          try {
                            setGeneratingCourseKitId(eadCourse.id)
                            const courseRecommendedBooks = (eadCourse.recommendedBookIds || [])
                              .map((bookId) => libraryBooks.find((b) => b.id === bookId))
                              .filter((b): b is NonNullable<typeof b> => Boolean(b))

                            generateCourseOfflineKitPdf({
                              course: eadCourse,
                              lessons: courseLessons,
                              materials: eadMaterials,
                              recommendedBooks: courseRecommendedBooks,
                              student: currentStudent,
                              generatedBy: 'Portal do Aluno • AVA PortalCursos.NG',
                            })

                            toast({
                              title: 'Kit de Estudo do Curso gerado',
                              description:
                                'O PDF completo com todas as aulas e materiais foi gerado para estudo offline.',
                            })
                          } catch {
                            toast({
                              title: 'Erro ao gerar PDF',
                              description:
                                'Não foi possível gerar o kit de estudo do curso. Tente novamente.',
                              variant: 'destructive',
                            })
                          } finally {
                            setGeneratingCourseKitId(null)
                          }
                        }}
                        disabled={
                          !eligibility.isEligibleToStudy || generatingCourseKitId === eadCourse.id
                        }
                        className="w-full text-xs font-medium border-indigo-500/30 text-indigo-300 bg-indigo-950/20 hover:bg-indigo-900/40 hover:text-white transition-all gap-1.5 shadow-sm h-8"
                        title={
                          eligibility.isEligibleToStudy
                            ? 'Baixar Kit de Estudo do Curso em PDF (roteiro completo, materiais, bibliografia e linhas de anotação)'
                            : eligibility.reasonMessage ||
                              'Download bloqueado para este status de matrícula'
                        }
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        <span>
                          {generatingCourseKitId === eadCourse.id
                            ? 'Gerando Kit...'
                            : 'Kit de Estudo do Curso (PDF)'}
                        </span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleSelectEadCourse(eadCourse.id)}
                        className={`w-full text-xs font-semibold gap-1.5 shadow-sm text-white ${
                          isCourseCompleted
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-500'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {isCourseCompleted ? 'Rever Aulas' : 'Assistir Aulas'} (
                        {courseLessons.length})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Card do Curso Ativo com Progresso e Detalhes */}
      {activeCourse && (
        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border-slate-800 shadow-lg">
          <CardHeader className="p-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-blue-600 text-white text-[10px] font-mono">
                    {activeCourse.code || 'ENG-SOFT-01'}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    Carga Horária: {activeCourse.workloadHours || 360}h
                  </span>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold text-white">
                  {activeCourse.name}
                </CardTitle>
                <CardDescription className="text-xs text-slate-300 mt-1 line-clamp-2">
                  {activeCourse.description ||
                    'Formação profissional completa com arquitetura de software, engenharia de requisitos, testes e banco de dados.'}
                </CardDescription>
              </div>

              {/* Botão de Status */}
              <div className="sm:text-right shrink-0">
                <span className="text-xs text-slate-400 block">Progresso Geral</span>
                <span className="text-2xl font-black text-blue-400 font-mono">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Barra de Progresso Geral */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  {completedCount} de {totalLessons} aulas concluídas
                </span>
                <span>{totalLessons - completedCount} aula(s) restante(s)</span>
              </div>
              <Progress value={progressPercent} className="h-2.5 bg-slate-800" />
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Barra de Busca e Filtro de Aulas */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Pesquisar por aula ou tema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9"
          />
        </div>

        {/* Seletor de Curso para alunos multifacetados */}
        {courses.length > 1 && (
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-slate-400 shrink-0">Curso:</span>
            {courses.slice(0, 3).map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={activeCourse?.id === c.id ? 'default' : 'outline'}
                onClick={() => setSelectedCourseId(c.id)}
                className={`h-7 text-xs whitespace-nowrap ${
                  activeCourse?.id === c.id
                    ? 'bg-blue-600 text-white'
                    : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {c.name.split('-')[0].trim()}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Grade de Módulos e Aulas */}
      <div className="space-y-6">
        {Object.keys(modulesMap).length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
            Nenhuma aula encontrada para "{searchQuery}".
          </div>
        ) : (
          Object.entries(modulesMap).map(([moduleName, lessons]) => {
            const modCompleted = lessons.filter((l) => l.status === 'concluido').length
            const modPercent = Math.round((modCompleted / lessons.length) * 100)

            return (
              <Card key={moduleName} className="bg-slate-900/60 border-slate-800 overflow-hidden">
                <CardHeader className="p-4 bg-slate-900/90 border-b border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-semibold text-white">{moduleName}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>
                        {modCompleted}/{lessons.length} concluídas ({modPercent}%)
                      </span>
                      <Progress value={modPercent} className="w-20 h-1.5 bg-slate-800" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 divide-y divide-slate-800/60">
                  {lessons.map((lesson) => {
                    const isCompleted = lesson.status === 'concluido'
                    const isInProgress = lesson.status === 'em_andamento'
                    const isSaving = savingLessonId === lesson.lessonId

                    return (
                      <div
                        key={lesson.lessonId}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors ${
                          isCompleted ? 'bg-emerald-950/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleLessonComplete(lesson)}
                            disabled={isSaving}
                            className={`mt-0.5 rounded-full p-1 transition-all ${
                              isCompleted
                                ? 'text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                            title={isCompleted ? 'Desmarcar conclusão' : 'Marcar como concluída'}
                          >
                            <CheckCircle2
                              className={`w-5 h-5 ${isCompleted ? 'fill-emerald-500/20' : ''}`}
                            />
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                onClick={() => handleOpenGraduationLesson(lesson)}
                                className="text-sm font-medium text-white hover:text-blue-400 cursor-pointer"
                              >
                                {lesson.lessonTitle}
                              </h4>
                              {isCompleted && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                  Concluída
                                </Badge>
                              )}
                              {isInProgress && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                                  Em Andamento
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {lesson.durationMinutes || 30} min
                              </span>
                              {lesson.completedAt && (
                                <span className="text-emerald-400 font-mono">
                                  Concluído em: {lesson.completedAt}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleLessonComplete(lesson)}
                            disabled={isSaving}
                            className={`h-8 text-xs ${
                              isCompleted
                                ? 'text-slate-400 hover:text-white'
                                : 'text-emerald-400 hover:bg-emerald-950/30'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                Reabrir
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Concluir
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleOpenGraduationLesson(lesson)}
                            className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Assistir
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal / Player da Aula */}
      {activeLessonModal && (
        <Dialog open={Boolean(activeLessonModal)} onOpenChange={() => setActiveLessonModal(null)}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-blue-600/30 text-blue-300 border-blue-500/40 text-[10px]">
                  {activeLessonModal.moduleName}
                </Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activeLessonModal.durationMinutes} minutos
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-white">
                {activeLessonModal.lessonTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Player de Videoaula Integrado ao AVA PortalCursos.NG
              </DialogDescription>
            </DialogHeader>

            {/* Player de vídeo real (mesmo player dos cursos EAD). Envolto em boundary
                compacto: falha de vídeo/dados NUNCA desmonta o portal até o portão —
                o aluno permanece logado e pode recarregar o player. */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-2">
              <InstitutionalErrorBoundary
                compact
                fallbackTitle="Não foi possível carregar o vídeo desta aula"
                fallbackDescription="A fonte do vídeo pode estar temporariamente indisponível. Sua sessão e seu progresso estão preservados — tente recarregar o player ou abra um chamado na aba Suporte."
              >
                <VideoPlayerEmbed
                  videoUrl={activeLessonModal.videoUrl}
                  videoProvider={activeLessonModal.videoProvider}
                  videoEmbedId={activeLessonModal.videoEmbedId}
                  title={activeLessonModal.lessonTitle}
                  autoPlay={false}
                />
              </InstitutionalErrorBoundary>
            </div>

            {/* Ações dentro do modal */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Status:{' '}
                <span
                  className={
                    activeLessonModal.status === 'concluido' ? 'text-emerald-400' : 'text-blue-400'
                  }
                >
                  {activeLessonModal.status === 'concluido' ? 'Aula Concluída' : 'Em Andamento'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleLessonComplete(activeLessonModal)}
                  className="text-xs border-slate-700 text-slate-200"
                >
                  {activeLessonModal.status === 'concluido'
                    ? 'Marcar Não Concluída'
                    : 'Marcar Concluída'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setActiveLessonModal(null)}
                  className="text-xs bg-blue-600 text-white"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
