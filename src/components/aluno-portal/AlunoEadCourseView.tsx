import React, { useState, useMemo } from 'react'
import { EadCourse, EadLesson, EadMaterial, LessonProgress, LibraryBook } from '@/types/portal'
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
  ExternalLink,
  FileText,
  FileCode2,
  BookmarkCheck,
  Link as LinkIcon,
  HelpCircle,
  Info,
  Lock,
  Library,
  ArrowRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePortal } from '@/context/PortalContext'

interface AlunoEadCourseViewProps {
  course: EadCourse
  lessons: EadLesson[]
  lessonProgress: LessonProgress[]
  materials?: EadMaterial[]
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
  onNavigateToBiblioteca?: (searchQuery?: string) => void
}

export function AlunoEadCourseView({
  course,
  lessons,
  lessonProgress,
  materials = [],
  studentId,
  canToggleProgress = true,
  suspensionNotice,
  onToggleLessonProgress,
  onBackToList,
  onNavigateToBiblioteca,
}: AlunoEadCourseViewProps) {
  const { libraryBooks } = usePortal()
  // Ordena aulas pela ordem cadastrada
  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  }, [lessons])

  const { toast } = useToast()
  const [activeLessonId, setActiveLessonId] = useState<string>(sortedLessons[0]?.id || '')
  const [isUpdating, setIsUpdating] = useState(false)

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

  // Regra de pré-requisitos sequenciais: se requireSequentialLessons estiver ativado no curso
  // uma aula (índice > 0) só está liberada se a aula anterior estiver concluída
  const isLessonLocked = (index: number): boolean => {
    if (!course.requireSequentialLessons) return false
    if (index === 0) return false
    const prevLesson = sortedLessons[index - 1]
    if (!prevLesson) return false
    const prevProg = progressMap.get(prevLesson.id)
    return prevProg?.status !== 'concluido'
  }

  // Aula selecionada
  const activeLesson = useMemo(() => {
    return sortedLessons.find((l) => l.id === activeLessonId) || sortedLessons[0]
  }, [sortedLessons, activeLessonId])

  const activeLessonIndex = useMemo(() => {
    if (!activeLesson) return 0
    return sortedLessons.findIndex((l) => l.id === activeLesson.id)
  }, [sortedLessons, activeLesson])

  const isActiveLocked = useMemo(() => {
    return isLessonLocked(activeLessonIndex)
  }, [activeLessonIndex, course.requireSequentialLessons, sortedLessons, progressMap])

  // Materiais complementares da aula selecionada
  const activeLessonMaterials = useMemo(() => {
    if (!activeLesson) return []
    return materials
      .filter((m) => m.lessonId === activeLesson.id)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  }, [materials, activeLesson])

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

  // Obras da bibliografia recomendada vinculadas a este curso EAD
  const recommendedBooks = useMemo<LibraryBook[]>(() => {
    if (!course.recommendedBookIds || course.recommendedBookIds.length === 0) return []
    const bookMap = new Map<string, LibraryBook>()
    for (const b of libraryBooks) {
      bookMap.set(b.id, b)
    }
    return course.recommendedBookIds
      .map((id) => bookMap.get(id))
      .filter((b): b is LibraryBook => Boolean(b))
  }, [course.recommendedBookIds, libraryBooks])

  const isActiveCompleted = useMemo(() => {
    if (!activeLesson) return false
    const prog = progressMap.get(activeLesson.id)
    return prog?.status === 'concluido'
  }, [activeLesson, progressMap])

  const handleToggleCurrent = async () => {
    if (!activeLesson) return
    if (!canToggleProgress) return
    if (isActiveLocked) {
      toast({
        title: 'Aula bloqueada por pré-requisito',
        description: 'Conclua a aula anterior para liberar esta videoaula.',
        variant: 'destructive',
      })
      return
    }
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
              {/* Bloqueio por pré-requisito: se a aula estiver bloqueada, exibe card orientador em vez do player */}
              {isActiveLocked ? (
                <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-8 text-center space-y-3 shadow-2xl">
                  <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-white">
                      Aula Bloqueada por Pré-requisito
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Conclua a aula anterior para liberar esta videoaula e seu material.
                      {activeLessonIndex > 0 && sortedLessons[activeLessonIndex - 1] && (
                        <span className="block mt-1 text-amber-300/90 font-medium">
                          Aula pendente: #{activeLessonIndex} -{' '}
                          {sortedLessons[activeLessonIndex - 1].title}
                        </span>
                      )}
                    </p>
                  </div>
                  {activeLessonIndex > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectLesson(sortedLessons[activeLessonIndex - 1].id)}
                      className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs mt-2"
                    >
                      Ir para aula anterior liberada
                    </Button>
                  )}
                </div>
              ) : (
                /* Player do Vídeo */
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-2 sm:p-3">
                  <VideoPlayerEmbed
                    videoUrl={activeLesson.videoUrl}
                    videoProvider={activeLesson.videoProvider}
                    videoEmbedId={activeLesson.videoEmbedId}
                    title={activeLesson.title}
                    autoPlay={false}
                    onEnded={() => {
                      // Ao terminar o vídeo, marca como concluído se ainda não estiver e se tiver permissão
                      if (!isActiveCompleted && canToggleProgress && !isActiveLocked) {
                        handleToggleCurrent()
                      }
                    }}
                  />
                </div>
              )}

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
                        {isActiveLocked && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Bloqueada
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg font-bold text-white">
                        {activeLesson.title}
                      </CardTitle>
                    </div>

                    {/* Botão de Marcar/Desmarcar Concluída (bloqueado/desabilitado se bloqueada ou suspensa) */}
                    {isActiveLocked ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs px-2.5 py-1 flex items-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        Conclusão Bloqueada (Pré-requisito)
                      </Badge>
                    ) : canToggleProgress ? (
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

                  {/* Seção de Material Complementar da Aula */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-sm font-semibold text-white">Material Complementar</h4>
                        <Badge
                          variant="outline"
                          className="border-slate-700 text-slate-400 text-[10px] px-2"
                        >
                          {activeLessonMaterials.length}{' '}
                          {activeLessonMaterials.length === 1 ? 'item' : 'itens'}
                        </Badge>
                      </div>

                      {/* Aviso explicativo de que material não afeta progresso nem frequência MEC */}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        Leitura opcional: o progresso é registrado apenas pelo botão de conclusão da
                        aula
                      </span>
                    </div>

                    {activeLessonMaterials.length === 0 ? (
                      <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/60 text-center space-y-1">
                        <p className="text-xs text-slate-400">
                          Nenhum material complementar cadastrado para esta aula.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Os slides, links e referências extras serão listados aqui quando
                          disponibilizados pelo professor.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {activeLessonMaterials.map((mat) => {
                          const badgeMap: Record<
                            string,
                            { label: string; color: string; icon: React.ReactNode }
                          > = {
                            pdf: {
                              label: 'PDF / Documento',
                              color: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                              icon: <FileText className="w-3 h-3 text-rose-400" />,
                            },
                            exercicio: {
                              label: 'Exercício / Desafio',
                              color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                              icon: <FileCode2 className="w-3 h-3 text-amber-400" />,
                            },
                            artigo: {
                              label: 'Artigo / Leitura',
                              color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                              icon: <BookmarkCheck className="w-3 h-3 text-emerald-400" />,
                            },
                            referencia: {
                              label: 'Referência Bibliográfica',
                              color: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
                              icon: <BookOpen className="w-3 h-3 text-purple-400" />,
                            },
                            link: {
                              label: 'Link Externo',
                              color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                              icon: <LinkIcon className="w-3 h-3 text-cyan-400" />,
                            },
                            outro: {
                              label: 'Material de Apoio',
                              color: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
                              icon: <HelpCircle className="w-3 h-3 text-blue-400" />,
                            },
                          }

                          const meta = badgeMap[mat.type || 'link'] || badgeMap.link

                          return (
                            <div
                              key={mat.id}
                              className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-2.5"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${meta.color}`}
                                  >
                                    {meta.icon}
                                    {meta.label}
                                  </Badge>
                                </div>
                                <h5 className="text-xs font-semibold text-slate-100 line-clamp-2">
                                  {mat.title}
                                </h5>
                                {mat.description && (
                                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                    {mat.description}
                                  </p>
                                )}
                              </div>

                              <a
                                href={mat.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 w-full text-xs font-medium px-3 py-1.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 transition-all"
                              >
                                <span>Acessar Material</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Seção de Bibliografia Recomendada do Curso EAD */}
                  {recommendedBooks.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <Library className="w-4 h-4 text-amber-400" />
                          <h4 className="text-sm font-semibold text-white">
                            Bibliografia Recomendada
                          </h4>
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] px-2"
                          >
                            {recommendedBooks.length}{' '}
                            {recommendedBooks.length === 1 ? 'obra' : 'obras'}
                          </Badge>
                        </div>

                        {onNavigateToBiblioteca && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigateToBiblioteca()}
                            className="text-[11px] h-7 px-2 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950/40 gap-1 self-start sm:self-center"
                          >
                            <Library className="w-3 h-3" />
                            <span>Ver acervo completo</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Obras da biblioteca institucional selecionadas para apoiar os seus estudos
                        neste curso.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {recommendedBooks.map((book) => {
                          const isAvailable = (book.availableCopies || 0) > 0
                          return (
                            <div
                              key={book.id}
                              className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-2.5"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                  {book.category && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-2 py-0.2 border-slate-700 text-slate-300 bg-slate-900"
                                    >
                                      {book.category}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-2 py-0.2 font-medium ${
                                      isAvailable
                                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                    }`}
                                  >
                                    {isAvailable
                                      ? `${book.availableCopies} de ${book.totalCopies} disponível(is)`
                                      : 'Exemplares esgotados'}
                                  </Badge>
                                </div>

                                <h5 className="text-xs font-semibold text-slate-100 line-clamp-2">
                                  {book.title}
                                </h5>

                                <p className="text-[11px] text-slate-400">
                                  <span className="font-medium text-slate-300">{book.author}</span>
                                  {book.year ? ` · ${book.year}` : ''}
                                  {book.publisher ? ` · ${book.publisher}` : ''}
                                </p>

                                {book.description && (
                                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                    {book.description}
                                  </p>
                                )}
                              </div>

                              {onNavigateToBiblioteca && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onNavigateToBiblioteca(book.title)}
                                  className="w-full text-xs h-7 text-indigo-300 border-indigo-500/30 bg-indigo-950/30 hover:bg-indigo-900/40 hover:text-white transition-all gap-1.5"
                                >
                                  <Library className="w-3 h-3" />
                                  <span>Consultar na Biblioteca</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )
                        })}
                      </div>
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
                          sortedLessons.length - 1 ||
                        (course.requireSequentialLessons && !isActiveCompleted)
                      }
                      className="text-slate-300 hover:text-white disabled:opacity-30"
                      title={
                        course.requireSequentialLessons && !isActiveCompleted
                          ? 'Conclua a aula atual para avançar para a próxima'
                          : undefined
                      }
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
                  const isLocked = isLessonLocked(idx)

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => handleSelectLesson(lesson.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isCurrent
                          ? isLocked
                            ? 'bg-amber-950/30 border-amber-500/40 text-amber-100 shadow-sm ring-1 ring-amber-500/30'
                            : 'bg-indigo-950/40 border-indigo-500/50 text-white shadow-sm ring-1 ring-indigo-500/40'
                          : isLocked
                            ? 'bg-slate-950/20 border-slate-800/40 hover:bg-slate-900/40 text-slate-400 opacity-75'
                            : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      {/* Marcador visual de assistida ou cadeado */}
                      {isLocked ? (
                        <div
                          className="mt-0.5 shrink-0 rounded-full p-0.5 text-amber-400/80"
                          title="Aula bloqueada: conclua a aula anterior para liberar"
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : (
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
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500">#{idx + 1}</span>
                          <h5
                            className={`text-xs font-medium truncate ${
                              isCurrent
                                ? isLocked
                                  ? 'text-amber-200 font-semibold'
                                  : 'text-indigo-200 font-semibold'
                                : isLocked
                                  ? 'text-slate-400'
                                  : 'text-slate-200'
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

                        {isLocked && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400/90 font-medium">
                            <Lock className="w-3 h-3 shrink-0" />
                            <span>Conclua a aula #{idx} para liberar</span>
                          </div>
                        )}
                      </div>

                      {isCurrent && (
                        <div
                          className={`shrink-0 ${isLocked ? 'text-amber-400' : 'text-indigo-400'}`}
                        >
                          {isLocked ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <PlayCircle className="w-4 h-4" />
                          )}
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
