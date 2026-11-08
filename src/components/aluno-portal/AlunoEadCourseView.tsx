import React, { useState, useMemo } from 'react'
import { EadCourse, EadLesson, LessonProgress } from '@/types/portal'
import { VideoPlayerEmbed } from '@/components/ead/VideoPlayerEmbed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  ChevronLeft,
  Clock,
  BookOpen,
  Award,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

interface AlunoEadCourseViewProps {
  course: EadCourse
  lessons: EadLesson[]
  lessonProgress: LessonProgress[]
  studentId: string
  canToggleProgress?: boolean
  suspensionNotice?: string
  onToggleLessonProgress: (
    lessonId: string,
    completed: boolean,
    courseId: string,
    moduleName?: string,
    lessonTitle?: string,
  ) => Promise<void>
  onBackToList?: () => void
}

export function AlunoEadCourseView({
  course,
  lessons,
  lessonProgress,
  studentId,
  canToggleProgress = true,
  suspensionNotice,
  onToggleLessonProgress,
  onBackToList,
}: AlunoEadCourseViewProps) {
  // Ordena aulas pela ordem cadastrada
  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  }, [lessons])

  const [activeLessonId, setActiveLessonId] = useState<string>(sortedLessons[0]?.id || '')
  const [isUpdating, setIsUpdating] = useState(false)

  // Aula selecionada
  const activeLesson = useMemo(() => {
    return sortedLessons.find((l) => l.id === activeLessonId) || sortedLessons[0]
  }, [sortedLessons, activeLessonId])

  // Map de progresso por lessonId
  const progressMap = useMemo(() => {
    const map = new Map<string, LessonProgress>()
    for (const p of lessonProgress) {
      if (p.studentId === studentId && p.courseId === course.id) {
        map.set(p.lessonId, p)
      }
    }
    return map
  }, [lessonProgress, studentId, course.id])

  // Contagem de concluídas e percentual
  const completedCount = useMemo(() => {
    let count = 0
    for (const l of sortedLessons) {
      const prog = progressMap.get(l.id)
      if (prog && prog.status === 'concluido') {
        count++
      }
    }
    return count
  }, [sortedLessons, progressMap])

  const totalLessons = sortedLessons.length
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const isActiveCompleted = useMemo(() => {
    if (!activeLesson) return false
    const prog = progressMap.get(activeLesson.id)
    return prog?.status === 'concluido'
  }, [activeLesson, progressMap])

  const handleToggleCurrent = async () => {
    if (!activeLesson) return
    if (!canToggleProgress) return
    setIsUpdating(true)
    try {
      await onToggleLessonProgress(
        activeLesson.id,
        !isActiveCompleted,
        course.id,
        activeLesson.moduleName,
        activeLesson.title,
      )
    } finally {
      setIsUpdating(false)
    }
  }

  // Navegar para próxima aula ao concluir
  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId)
  }

  const handleNextLesson = () => {
    const currentIndex = sortedLessons.findIndex((l) => l.id === activeLesson?.id)
    if (currentIndex >= 0 && currentIndex < sortedLessons.length - 1) {
      setActiveLessonId(sortedLessons[currentIndex + 1].id)
    }
  }

  const handlePrevLesson = () => {
    const currentIndex = sortedLessons.findIndex((l) => l.id === activeLesson?.id)
    if (currentIndex > 0) {
      setActiveLessonId(sortedLessons[currentIndex - 1].id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra superior de navegação e progresso do curso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          {onBackToList && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToList}
              className="border-slate-700 text-slate-200 hover:bg-slate-800 h-8 text-xs"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar aos Cursos
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-600/30 text-indigo-300 border-indigo-500/40 text-[10px]">
                EAD
              </Badge>
              <h2 className="text-base font-bold text-white truncate max-w-md">{course.title}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {course.workloadHours || 20}h de carga horária • Instrutor:{' '}
              {course.instructorName || 'Professor'}
            </p>
          </div>
        </div>

        {/* Progresso consolidado */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Progresso</span>
              <span className="font-semibold text-emerald-400">
                {completedCount} de {totalLessons} ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-slate-800" />
          </div>
          {progressPercent === 100 && (
            <div
              className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              title="Curso EAD 100% concluído!"
            >
              <Award className="w-5 h-5" />
            </div>
          )}
        </div>
      </div>

      {/* Grid Principal: Player à Esquerda, Lista de Aulas à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Player e Detalhes da Aula (8 colunas) */}
        <div className="lg:col-span-8 space-y-4">
          {activeLesson ? (
            <div className="space-y-4">
              {/* Player do Vídeo */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-2 sm:p-3">
                <VideoPlayerEmbed
                  videoUrl={activeLesson.videoUrl}
                  videoProvider={activeLesson.videoProvider}
                  videoEmbedId={activeLesson.videoEmbedId}
                  title={activeLesson.title}
                  autoPlay={false}
                  onEnded={() => {
                    // Ao terminar o vídeo, marca como concluído se ainda não estiver e se tiver permissão
                    if (!isActiveCompleted && canToggleProgress) {
                      handleToggleCurrent()
                    }
                  }}
                />
              </div>

              {/* Aviso se a marcação de conclusão estiver suspensa */}
              {!canToggleProgress && suspensionNotice && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-center gap-2">
                  <span className="font-semibold text-amber-300">Atenção:</span>
                  {suspensionNotice}
                </div>
              )}

              {/* Barra de Ações da Aula e Informações */}
              <Card className="bg-slate-900 border-slate-800 text-slate-100">
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                          {activeLesson.moduleName || 'Módulo Geral'}
                        </Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {activeLesson.durationMinutes || 15} minutos
                        </span>
                        {isActiveCompleted && (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                            Aula Concluída
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg font-bold text-white">
                        {activeLesson.title}
                      </CardTitle>
                    </div>

                    {/* Botão de Marcar/Desmarcar Concluída (oculto/desabilitado se não puder alterar) */}
                    {canToggleProgress ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleToggleCurrent}
                          disabled={isUpdating}
                          className={`text-xs font-semibold shadow-sm transition-all ${
                            isActiveCompleted
                              ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isActiveCompleted ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              Desmarcar Conclusão
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Marcar como Concluída
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs px-2.5 py-1"
                      >
                        Conclusão Bloqueada
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                  {activeLesson.description && (
                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs text-slate-300 whitespace-pre-line">
                      <p className="font-semibold text-slate-200 mb-1">Notas da Aula:</p>
                      {activeLesson.description}
                    </div>
                  )}

                  {/* Navegação Entre Aulas */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevLesson}
                      disabled={sortedLessons.findIndex((l) => l.id === activeLesson.id) === 0}
                      className="text-slate-300 hover:text-white disabled:opacity-30"
                    >
                      ← Aula Anterior
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextLesson}
                      disabled={
                        sortedLessons.findIndex((l) => l.id === activeLesson.id) ===
                        sortedLessons.length - 1
                      }
                      className="text-slate-300 hover:text-white disabled:opacity-30"
                    >
                      Próxima Aula →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-slate-900 border-slate-800 text-slate-400 p-8 text-center">
              Nenhuma aula cadastrada para este curso EAD.
            </Card>
          )}
        </div>

        {/* Lista Lateral de Aulas do Curso (4 colunas) */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <CardTitle className="text-sm font-semibold text-white">
                    Grade de Videoaulas
                  </CardTitle>
                </div>
                <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                  {sortedLessons.length} aula{sortedLessons.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-2 space-y-1.5 max-h-[620px] overflow-y-auto">
              {sortedLessons.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nenhuma aula disponível.
                </div>
              ) : (
                sortedLessons.map((lesson, idx) => {
                  const isCurrent = lesson.id === activeLesson?.id
                  const prog = progressMap.get(lesson.id)
                  const isCompleted = prog?.status === 'concluido'

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => handleSelectLesson(lesson.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isCurrent
                          ? 'bg-indigo-950/40 border-indigo-500/50 text-white shadow-sm ring-1 ring-indigo-500/40'
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      {/* Marcador visual de assistida */}
                      <button
                        type="button"
                        disabled={!canToggleProgress}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (canToggleProgress) {
                            onToggleLessonProgress(
                              lesson.id,
                              !isCompleted,
                              course.id,
                              lesson.moduleName,
                              lesson.title,
                            )
                          }
                        }}
                        className={`mt-0.5 shrink-0 rounded-full p-0.5 transition-colors ${
                          isCompleted
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-slate-500 hover:text-slate-300'
                        } ${!canToggleProgress ? 'cursor-default opacity-80' : ''}`}
                        title={
                          !canToggleProgress
                            ? 'Marcação de conclusão bloqueada por situação cadastral'
                            : isCompleted
                              ? 'Marcada como concluída (clique para alternar)'
                              : 'Marcar como concluída'
                        }
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 fill-emerald-500/20" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500">#{idx + 1}</span>
                          <h5
                            className={`text-xs font-medium truncate ${
                              isCurrent ? 'text-indigo-200 font-semibold' : 'text-slate-200'
                            }`}
                          >
                            {lesson.title}
                          </h5>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span>{lesson.durationMinutes || 15} min</span>
                          <span>•</span>
                          <span className="truncate">{lesson.moduleName || 'Módulo Geral'}</span>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="shrink-0 text-indigo-400">
                          <PlayCircle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
