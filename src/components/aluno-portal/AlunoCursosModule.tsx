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

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tv, Play } from 'lucide-react'
import { AlunoEadCourseView } from '@/components/aluno-portal/AlunoEadCourseView'

export function AlunoCursosModule() {
  const {
    currentUser,
    students,
    courses,
    lessonProgress,
    updateLessonProgress,
    eadCourses,
    eadLessons,
  } = usePortal()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [activeLessonModal, setActiveLessonModal] = useState<LessonProgress | null>(null)
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null)
  const [activeEadCourseId, setActiveEadCourseId] = useState<string | null>(null)

  const currentStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
    ) || students[0]

  const effectiveStudentId = currentUser?.studentId || currentStudent?.id || 'dbphexr97czw7cb'

  // Cursos EAD em que o aluno está matriculado/vinculado (ou todos se não houver filtro restrito)
  const myEadCourses = eadCourses.filter((c) => {
    if (!c.enrolledStudentIds || c.enrolledStudentIds.length === 0) return true
    return c.enrolledStudentIds.includes(effectiveStudentId)
  })

  // Se o aluno clicou para assistir um curso EAD específico
  const selectedEadCourse = myEadCourses.find((c) => c.id === activeEadCourseId)
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

  // Aulas e progresso do aluno para o curso ativo
  const studentLessons = lessonProgress.filter(
    (p) => p.studentId === effectiveStudentId && (!p.courseId || p.courseId === activeCourse?.id),
  )

  // Se a lista de progresso estiver vazia, cria uma lista padrão para exibir a grade
  const displayLessons: LessonProgress[] =
    studentLessons.length > 0
      ? studentLessons
      : [
          {
            id: 'lp-1',
            studentId: effectiveStudentId,
            courseId: activeCourse?.id || 'crs-eng-soft',
            moduleName: 'Módulo 1: Fundamentos de Arquitetura Limpa',
            lessonId: 'aula-1',
            lessonTitle: 'Aula 01: Introdução aos Padrões SOLID e Coesão',
            durationMinutes: 45,
            status: 'concluido',
            completedAt: '2026-03-01 10:30',
            lastWatchedSeconds: 2700,
          },
          {
            id: 'lp-2',
            studentId: effectiveStudentId,
            courseId: activeCourse?.id || 'crs-eng-soft',
            moduleName: 'Módulo 1: Fundamentos de Arquitetura Limpa',
            lessonId: 'aula-2',
            lessonTitle: 'Aula 02: Inversão de Dependências na Prática com TS',
            durationMinutes: 50,
            status: 'concluido',
            completedAt: '2026-03-03 14:15',
            lastWatchedSeconds: 3000,
          },
          {
            id: 'lp-3',
            studentId: effectiveStudentId,
            courseId: activeCourse?.id || 'crs-eng-soft',
            moduleName: 'Módulo 2: Modelagem de Domínio & Bancos',
            lessonId: 'aula-3',
            lessonTitle: 'Aula 03: Entidades, Value Objects e Migrações SQL',
            durationMinutes: 40,
            status: 'em_andamento',
            lastWatchedSeconds: 1200,
          },
          {
            id: 'lp-4',
            studentId: effectiveStudentId,
            courseId: activeCourse?.id || 'crs-eng-soft',
            moduleName: 'Módulo 2: Modelagem de Domínio & Bancos',
            lessonId: 'aula-4',
            lessonTitle: 'Aula 04: Estratégias de Indexação e Consistência Transacional',
            durationMinutes: 55,
            status: 'nao_iniciado',
            lastWatchedSeconds: 0,
          },
          {
            id: 'lp-5',
            studentId: effectiveStudentId,
            courseId: activeCourse?.id || 'crs-eng-soft',
            moduleName: 'Módulo 3: Testes de Software & Segurança Web',
            lessonId: 'aula-5',
            lessonTitle: 'Aula 05: Testes Unitários e Integração com Vitest',
            durationMinutes: 60,
            status: 'nao_iniciado',
            lastWatchedSeconds: 0,
          },
          {
            id: 'lp-6',
            studentId: effectiveStudentId,
            courseId: activeCourse?.id || 'crs-eng-soft',
            moduleName: 'Módulo 3: Testes de Software & Segurança Web',
            lessonId: 'aula-6',
            lessonTitle: 'Aula 06: Autenticação JWT, RBAC e Prevenção de XSS/CSRF',
            durationMinutes: 45,
            status: 'nao_iniciado',
            lastWatchedSeconds: 0,
          },
        ]

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

  // Se o aluno estiver assistindo a um curso EAD específico
  if (selectedEadCourse) {
    return (
      <AlunoEadCourseView
        course={selectedEadCourse}
        lessons={selectedEadLessons}
        lessonProgress={lessonProgress}
        studentId={effectiveStudentId}
        onToggleLessonProgress={async (lessonId, completed, courseId, moduleName, lessonTitle) => {
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
        onBackToList={() => setActiveEadCourseId(null)}
      />
    )
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
            Matrícula Regular
          </Badge>
          {myEadCourses.length > 0 && (
            <Badge className="bg-indigo-600/30 text-indigo-300 border-indigo-500/40 text-xs">
              {myEadCourses.length} Curso{myEadCourses.length !== 1 ? 's' : ''} EAD
            </Badge>
          )}
        </div>
      </div>

      {/* Seção de Cursos EAD com Videoaulas */}
      {myEadCourses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Cursos EAD com Videoaulas</h2>
            </div>
            <span className="text-xs text-slate-400">
              Player integrado com YouTube, Vimeo e MP4
            </span>
          </div>

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

              return (
                <Card
                  key={eadCourse.id}
                  className="bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between overflow-hidden group shadow-md"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-indigo-600/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                        EAD Videoaulas
                      </Badge>
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
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Progresso</span>
                        <span className="font-semibold text-emerald-400 font-mono">
                          {completedLessonsCount}/{courseLessons.length} aulas ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-slate-800" />
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setActiveEadCourseId(eadCourse.id)}
                      className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Assistir Aulas ({courseLessons.length})
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

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
                                onClick={() => setActiveLessonModal(lesson)}
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
                            onClick={() => setActiveLessonModal(lesson)}
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

            {/* Simulação de Player de Vídeo Profissional */}
            <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 mb-3 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                <PlayCircle className="w-10 h-10" />
              </div>
              <p className="text-sm font-semibold text-white">
                Transmissão em Alta Definição (1080p)
              </p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Aula gravada pelo corpo docente da coordenação pedagógica. Material de apoio
                disponível na aba Materiais.
              </p>
              <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400">
                <span>00:00 / {activeLessonModal.durationMinutes}:00</span>
                <span className="text-emerald-400">● Servidor CDN Ativo</span>
              </div>
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
