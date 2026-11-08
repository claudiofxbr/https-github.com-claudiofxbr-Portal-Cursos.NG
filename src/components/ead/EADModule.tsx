import React, { useState, useMemo } from 'react'
import { usePortal } from '@/context/PortalContext'
import { EadCourse, EadLesson } from '@/types/portal'
import { parseVideoUrl } from '@/lib/portalDb'
import { VideoPlayerEmbed } from '@/components/ead/VideoPlayerEmbed'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Video,
  PlayCircle,
  Users,
  Clock,
  PlusCircle,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Sparkles,
  UserCheck,
  Search,
  Eye,
  ShieldAlert,
  FileText,
} from 'lucide-react'
import { EadMaterialManagerModal } from '@/components/ead/EadMaterialManagerModal'

export function EADModule() {
  const {
    eadCourses,
    eadLessons,
    eadMaterials,
    courses,
    users,
    students,
    currentUser,
    lessonProgress,
    createEadCourse,
    updateEadCourse,
    deleteEadCourse,
    enrollStudentsInEadCourse,
    createEadLesson,
    updateEadLesson,
    deleteEadLesson,
    reorderEadLessons,
  } = usePortal()

  const { toast } = useToast()

  // RBAC
  const role = currentUser?.role || 'aluno'
  const isPrivilegedAdmin = role === 'root' || role === 'admin' || role === 'coordenador'
  const isProfessor = role === 'professor'
  const canManageEad = isPrivilegedAdmin || isProfessor

  // Seleção e visualização
  const [selectedCourseId, setSelectedCourseId] = useState<string>(eadCourses[0]?.id || '')
  const [searchTerm, setSearchTerm] = useState('')

  // Modais de Curso EAD
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<EadCourse | null>(null)
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseWorkload, setCourseWorkload] = useState(20)
  const [courseCatalogId, setCourseCatalogId] = useState<string>('none')
  const [courseStatus, setCourseStatus] = useState<EadCourse['status']>('publicado')
  const [requireSequentialLessons, setRequireSequentialLessons] = useState(false)
  // Vínculo professor↔curso EAD por ID de usuário (coleção `users`)
  const [courseInstructorId, setCourseInstructorId] = useState<string>('')
  const instructorOptions = useMemo(() => users.filter((u) => u.role !== 'aluno'), [users])
  const instructorNameFromId = useMemo(
    () => instructorOptions.find((u) => u.id === courseInstructorId)?.name || '',
    [instructorOptions, courseInstructorId],
  )

  // Modais de Aula EAD
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<EadLesson | null>(null)
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDesc, setLessonDesc] = useState('')
  const [lessonModule, setLessonModule] = useState('Módulo 1: Introdução')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  const [lessonDuration, setLessonDuration] = useState(15)

  // Modal de Vínculo de Alunos
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [enrollingCourse, setEnrollingCourse] = useState<EadCourse | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [studentSearchFilter, setStudentSearchFilter] = useState('')

  // Modal de Preview de Aula
  const [previewLesson, setPreviewLesson] = useState<EadLesson | null>(null)

  // Modal de Materiais Complementares da Aula
  const [materialLesson, setMaterialLesson] = useState<EadLesson | null>(null)

  // Curso selecionado atualmente
  const selectedCourse = useMemo(() => {
    return eadCourses.find((c) => c.id === selectedCourseId) || eadCourses[0]
  }, [eadCourses, selectedCourseId])

  // Aulas do curso selecionado, ordenadas
  const courseLessons = useMemo(() => {
    if (!selectedCourse) return []
    return eadLessons
      .filter((l) => l.eadCourseId === selectedCourse.id)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  }, [eadLessons, selectedCourse])

  // KPIs
  const totalCourses = eadCourses.length
  const totalLessons = eadLessons.length
  const studentsWithProgressCount = useMemo(() => {
    const studentSet = new Set<string>()
    for (const p of lessonProgress) {
      if (p.status === 'concluido' || (p.lastWatchedSeconds && p.lastWatchedSeconds > 0)) {
        studentSet.add(p.studentId)
      }
    }
    return studentSet.size
  }, [lessonProgress])

  // Cursos filtrados
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return eadCourses
    const lower = searchTerm.toLowerCase()
    return eadCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        (c.catalogCourseName && c.catalogCourseName.toLowerCase().includes(lower)) ||
        (c.description && c.description.toLowerCase().includes(lower)),
    )
  }, [eadCourses, searchTerm])

  // Handlers de Curso EAD
  const handleOpenNewCourseModal = () => {
    setEditingCourse(null)
    setCourseTitle('')
    setCourseDesc('')
    setCourseWorkload(20)
    setCourseCatalogId('none')
    setCourseStatus('publicado')
    setRequireSequentialLessons(false)
    setCourseInstructorId(currentUser?.id || '')
    setIsCourseModalOpen(true)
  }

  const handleOpenEditCourseModal = (course: EadCourse) => {
    setEditingCourse(course)
    setCourseTitle(course.title)
    setCourseDesc(course.description || '')
    setCourseWorkload(course.workloadHours || 20)
    setCourseCatalogId(course.catalogCourseId || 'none')
    setCourseStatus(course.status || 'publicado')
    setRequireSequentialLessons(Boolean(course.requireSequentialLessons))
    setCourseInstructorId(course.instructorId || '')
    setIsCourseModalOpen(true)
  }

  const handleSaveCourse = async () => {
    if (!courseTitle.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe o título do curso EAD.',
        variant: 'destructive',
      })
      return
    }

    const matchedCatalog = courses.find((c) => c.id === courseCatalogId)
    const catalogCourseId = courseCatalogId === 'none' ? '' : courseCatalogId
    const catalogCourseName = matchedCatalog ? matchedCatalog.name : ''

    if (editingCourse) {
      await updateEadCourse(editingCourse.id, {
        title: courseTitle.trim(),
        description: courseDesc.trim(),
        workloadHours: Number(courseWorkload) || 20,
        catalogCourseId,
        catalogCourseName,
        status: courseStatus,
        requireSequentialLessons,
        instructorId: courseInstructorId,
        instructorName: courseInstructorId
          ? instructorNameFromId || editingCourse.instructorName
          : '',
      })
      toast({
        title: 'Curso EAD atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    } else {
      const created = await createEadCourse({
        title: courseTitle.trim(),
        description: courseDesc.trim(),
        workloadHours: Number(courseWorkload) || 20,
        catalogCourseId,
        catalogCourseName,
        thumbnail: '',
        status: courseStatus,
        requireSequentialLessons,
        instructorId: courseInstructorId || currentUser?.id || '',
        instructorName:
          (courseInstructorId ? instructorNameFromId : currentUser?.name) || 'Professor',
        enrolledStudentIds: [],
      })
      if (created) {
        setSelectedCourseId(created.id)
      }
      toast({
        title: 'Curso EAD criado',
        description:
          'O novo curso EAD foi adicionado com sucesso. Agora você pode cadastrar videoaulas!',
      })
    }
    setIsCourseModalOpen(false)
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (
      !window.confirm('Tem certeza que deseja excluir este curso EAD e todas as suas videoaulas?')
    ) {
      return
    }
    await deleteEadCourse(courseId)
    toast({
      title: 'Curso excluído',
      description: 'O curso e suas videoaulas foram removidos.',
    })
  }

  // Handlers de Aula EAD
  const handleOpenNewLessonModal = () => {
    if (!selectedCourse) {
      toast({
        title: 'Nenhum curso selecionado',
        description: 'Selecione ou crie um curso EAD primeiro.',
        variant: 'destructive',
      })
      return
    }
    setEditingLesson(null)
    setLessonTitle('')
    setLessonDesc('')
    setLessonModule('Módulo 1: Introdução')
    setLessonVideoUrl('')
    setLessonDuration(15)
    setIsLessonModalOpen(true)
  }

  const handleOpenEditLessonModal = (lesson: EadLesson) => {
    setEditingLesson(lesson)
    setLessonTitle(lesson.title)
    setLessonDesc(lesson.description || '')
    setLessonModule(lesson.moduleName || 'Módulo 1: Introdução')
    setLessonVideoUrl(lesson.videoUrl)
    setLessonDuration(lesson.durationMinutes || 15)
    setIsLessonModalOpen(true)
  }

  const handleSaveLesson = async () => {
    if (!selectedCourse) return

    if (!lessonTitle.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe o título da videoaula.',
        variant: 'destructive',
      })
      return
    }

    const trimmedUrl = lessonVideoUrl.trim()
    if (!trimmedUrl) {
      toast({
        title: 'Link de vídeo obrigatório',
        description: 'Informe o link do YouTube, Vimeo ou MP4.',
        variant: 'destructive',
      })
      return
    }

    if (!/^https?:\/\//i.test(trimmedUrl)) {
      toast({
        title: 'Link de vídeo inválido',
        description:
          'A URL do vídeo deve começar com http:// ou https:// (ex.: https://www.youtube.com/watch?v=...)',
        variant: 'destructive',
      })
      return
    }

    const parsed = parseVideoUrl(trimmedUrl)

    if (editingLesson) {
      await updateEadLesson(editingLesson.id, {
        title: lessonTitle.trim(),
        description: lessonDesc.trim(),
        moduleName: lessonModule.trim() || 'Módulo Geral',
        videoUrl: trimmedUrl,
        videoProvider: parsed.provider,
        videoEmbedId: parsed.embedId,
        durationMinutes: Number(lessonDuration) || 15,
      })
      toast({
        title: 'Videoaula atualizada',
        description: `Aula atualizada com provedor ${parsed.provider.toUpperCase()}.`,
      })
    } else {
      const nextOrder = (courseLessons[courseLessons.length - 1]?.orderIndex || 0) + 1
      await createEadLesson({
        eadCourseId: selectedCourse.id,
        title: lessonTitle.trim(),
        description: lessonDesc.trim(),
        moduleName: lessonModule.trim() || 'Módulo Geral',
        orderIndex: nextOrder,
        videoUrl: trimmedUrl,
        videoProvider: parsed.provider,
        videoEmbedId: parsed.embedId,
        durationMinutes: Number(lessonDuration) || 15,
        isOptional: false,
      })
      toast({
        title: 'Videoaula adicionada',
        description: `Aula cadastrada com provedor ${parsed.provider.toUpperCase()} (${parsed.embedId ? `ID: ${parsed.embedId}` : 'link direto'}).`,
      })
    }
    setIsLessonModalOpen(false)
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Deseja excluir esta videoaula?')) return
    await deleteEadLesson(lessonId)
    toast({
      title: 'Aula excluída',
      description: 'A videoaula foi removida da grade do curso.',
    })
  }

  const handleMoveLesson = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= courseLessons.length) return

    const newOrder = [...courseLessons]
    const temp = newOrder[index]
    newOrder[index] = newOrder[targetIndex]
    newOrder[targetIndex] = temp

    await reorderEadLessons(newOrder.map((l) => l.id))
    toast({
      title: 'Ordem das aulas atualizada',
      description: 'A sequência de exibição no portal foi atualizada.',
    })
  }

  // Handlers de Matrícula
  const handleOpenEnrollModal = (course: EadCourse) => {
    setEnrollingCourse(course)
    setSelectedStudentIds([...(course.enrolledStudentIds || [])])
    setStudentSearchFilter('')
    setIsEnrollModalOpen(true)
  }

  const handleToggleStudentEnrollment = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId)
      }
      return [...prev, studentId]
    })
  }

  const handleSaveEnrollment = async () => {
    if (!enrollingCourse) return
    await enrollStudentsInEadCourse(enrollingCourse.id, selectedStudentIds)
    toast({
      title: 'Matrículas atualizadas',
      description: `${selectedStudentIds.length} aluno(s) vinculado(s) ao curso EAD.`,
    })
    setIsEnrollModalOpen(false)
  }

  // Se o usuário não tem permissão para gerenciar EAD
  if (!canManageEad) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-3 text-amber-800">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
              <div>
                <CardTitle className="text-xl">Acesso Restrito ao Módulo EAD</CardTitle>
                <CardDescription className="text-amber-700">
                  O gerenciamento de videoaulas e cursos EAD é restrito a coordenadores,
                  administradores e professores.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2">
            <p>
              Seu perfil atual ({currentUser?.role}) não possui privilégios para criar cursos ou
              cadastrar aulas.
            </p>
            <p className="text-xs text-slate-500">
              Alunos matriculados podem assistir às videoaulas diretamente através do{' '}
              <strong>Portal do Aluno</strong> na aba <strong>Meus Cursos</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                EAD & Videoaulas
              </h1>
              <p className="text-sm text-slate-500">
                Gestão de cursos a distância, videoaulas (YouTube, Vimeo, MP4) e matrículas de
                alunos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenNewCourseModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Novo Curso EAD
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-indigo-700">
                Cursos EAD Ativos
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCourses}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Disponíveis no catálogo EAD</p>
            </div>
            <div className="p-3 bg-indigo-100/70 text-indigo-700 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-purple-50/50 to-white shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-purple-700">
                Videoaulas Cadastradas
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalLessons}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Links validados com embed</p>
            </div>
            <div className="p-3 bg-purple-100/70 text-purple-700 rounded-xl">
              <PlayCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                Alunos com Progresso
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {studentsWithProgressCount}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Acompanhamento contínuo</p>
            </div>
            <div className="p-3 bg-emerald-100/70 text-emerald-700 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Layout com lista de Cursos à esquerda e Aulas à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna de Cursos EAD (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Cursos Disponíveis
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Selecione um curso para gerenciar suas videoaulas
                  </CardDescription>
                </div>
              </div>
              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar curso EAD..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
              {filteredCourses.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum curso EAD cadastrado.
                </div>
              ) : (
                filteredCourses.map((course) => {
                  const isSelected = selectedCourse?.id === course.id
                  const lessonCount = eadLessons.filter((l) => l.eadCourseId === course.id).length
                  const enrolledCount = course.enrolledStudentIds?.length || 0

                  return (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-1 ring-indigo-300'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-slate-900 truncate">
                              {course.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 font-normal ${
                                course.status === 'publicado'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {course.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                            </Badge>
                          </div>

                          {course.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {course.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <PlayCircle className="w-3.5 h-3.5 text-indigo-600" />
                              {lessonCount} aula{lessonCount !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {course.workloadHours || 20}h
                            </span>
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              {enrolledCount} aluno{enrolledCount !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {course.catalogCourseName && (
                            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-medium">
                              <GraduationCap className="w-3 h-3" />
                              Catálogo: {course.catalogCourseName}
                            </div>
                          )}
                        </div>

                        {/* Ações do Curso */}
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                            title="Vincular alunos"
                            onClick={() => handleOpenEnrollModal(course)}
                          >
                            <Users className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                            title="Editar curso"
                            onClick={() => handleOpenEditCourseModal(course)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          {isPrivilegedAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-600"
                              title="Excluir curso"
                              onClick={() => handleDeleteCourse(course.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna de Aulas do Curso Selecionado (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCourse ? (
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold text-slate-900">
                        {selectedCourse.title}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {courseLessons.length} aula{courseLessons.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Carga Horária: {selectedCourse.workloadHours || 20}h • Instrutor:{' '}
                      {selectedCourse.instructorName || 'Professor'}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEnrollModal(selectedCourse)}
                      className="text-xs h-8"
                    >
                      <Users className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Alunos ({selectedCourse.enrolledStudentIds?.length || 0})
                    </Button>
                    <Button
                      onClick={handleOpenNewLessonModal}
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Adicionar Aula
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {courseLessons.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl p-6">
                    <Video className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-slate-700">
                      Nenhuma videoaula cadastrada
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      Comece adicionando videoaulas com links do YouTube, Vimeo ou MP4 para
                      estruturar a grade deste curso EAD.
                    </p>
                    <Button
                      onClick={handleOpenNewLessonModal}
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                      Cadastrar Primeira Aula
                    </Button>
                  </div>
                ) : (
                  courseLessons.map((lesson, idx) => {
                    const parsed = parseVideoUrl(lesson.videoUrl)
                    const provider = lesson.videoProvider || parsed.provider

                    return (
                      <div
                        key={lesson.id}
                        className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-semibold text-slate-900 truncate">
                                {lesson.title}
                              </h5>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-4 uppercase font-semibold ${
                                  provider === 'youtube'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : provider === 'vimeo'
                                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {provider}
                              </Badge>
                              <span className="text-[11px] text-slate-400">
                                {lesson.durationMinutes || 15} min
                              </span>
                            </div>

                            {lesson.description && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {lesson.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium">
                                {lesson.moduleName || 'Módulo Geral'}
                              </span>
                              <span className="text-slate-400 truncate max-w-[280px]">
                                {lesson.videoUrl}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Ações da Aula */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Botão Materiais Complementares */}
                          {(() => {
                            const matCount = eadMaterials.filter(
                              (m) => m.lessonId === lesson.id,
                            ).length
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 px-2 text-xs transition-all ${
                                  matCount > 0
                                    ? 'text-cyan-700 border-cyan-300 bg-cyan-50/60 hover:bg-cyan-100'
                                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                onClick={() => setMaterialLesson(lesson)}
                                title="Gerenciar materiais complementares desta aula"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1 text-cyan-600" />
                                <span>Materiais</span>
                                {matCount > 0 && (
                                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-600 text-white">
                                    {matCount}
                                  </span>
                                )}
                              </Button>
                            )
                          })()}

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={() => setPreviewLesson(lesson)}
                            title="Visualizar player"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Assistir
                          </Button>

                          {/* Reordenar */}
                          <div className="flex flex-col">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveLesson(idx, 'up')}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={idx === courseLessons.length - 1}
                              onClick={() => handleMoveLesson(idx, 'down')}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                            onClick={() => handleOpenEditLessonModal(lesson)}
                            title="Editar aula"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            title="Excluir aula"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8 text-center text-slate-400">
              Selecione um curso na lista para visualizar as aulas.
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Criar / Editar Curso EAD */}
      <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Editar Curso EAD' : 'Novo Curso EAD'}</DialogTitle>
            <DialogDescription>
              Configure as informações básicas e o vínculo com a grade curricular do catálogo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Título do Curso *</label>
              <Input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Ex.: Fundamentos de Engenharia de Software EAD"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Descrição / Ementa</label>
              <textarea
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                placeholder="Breve resumo dos tópicos abordados nas videoaulas..."
                className="w-full text-xs p-2.5 border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Carga Horária (Horas)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={courseWorkload}
                  onChange={(e) => setCourseWorkload(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Status</label>
                <Select
                  value={courseStatus}
                  onValueChange={(val) => setCourseStatus(val as EadCourse['status'])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publicado">Publicado (Ativo)</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="arquivado">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Vínculo com Curso do Catálogo (Opcional)
              </label>
              <Select value={courseCatalogId} onValueChange={setCourseCatalogId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um curso ou deixe avulso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Curso EAD Livre/Avulso)</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 mt-1">
                Alunos matriculados no curso do catálogo vinculado terão acesso facilitado.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Professor Responsável (vínculo por ID)
              </label>
              <Select
                value={courseInstructorId || 'none'}
                onValueChange={(val) => setCourseInstructorId(val === 'none' ? '' : val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o professor responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum professor vinculado</SelectItem>
                  {instructorOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 mt-1">
                O curso EAD fica vinculado ao ID do usuário selecionado — professores homônimos não
                compartilham turmas.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={requireSequentialLessons}
                  onChange={(e) => setRequireSequentialLessons(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 block">
                    Exigir conclusão das aulas em ordem (pré-requisito)
                  </span>
                  <span className="text-[11px] text-slate-600 block leading-relaxed">
                    Quando ativado, o aluno só pode assistir e concluir uma aula após finalizar a
                    aula anterior. A primeira aula permanece sempre liberada. Ao desativar, todas
                    voltam a ficar livres.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCourseModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCourse}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {editingCourse ? 'Salvar Alterações' : 'Criar Curso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Criar / Editar Aula EAD */}
      <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? 'Editar Videoaula' : 'Cadastrar Nova Videoaula'}
            </DialogTitle>
            <DialogDescription>
              Cole a URL pública do vídeo (YouTube, Vimeo ou link direto MP4). O sistema extrai o ID
              do embed automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Título da Aula *</label>
              <Input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Ex.: Aula 01 - Apresentação da Disciplina e Metodologia"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Módulo / Tópico</label>
                <Input
                  value={lessonModule}
                  onChange={(e) => setLessonModule(e.target.value)}
                  placeholder="Ex.: Módulo 1: Introdução"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Duração Estimada (min)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Link do Vídeo (URL HTTP / HTTPS) *
              </label>
              <Input
                value={lessonVideoUrl}
                onChange={(e) => setLessonVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
                className="mt-1"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Suporta links normais do YouTube (<code className="text-indigo-600">watch?v=</code>{' '}
                ou <code className="text-indigo-600">youtu.be/</code>), Vimeo ou links diretos para
                arquivos <code className="text-indigo-600">.mp4</code>.
              </p>
            </div>

            {/* Preview da detecção do provedor */}
            {lessonVideoUrl.trim() && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <span className="font-semibold text-slate-700">Detecção Automática:</span>
                {(() => {
                  const p = parseVideoUrl(lessonVideoUrl.trim())
                  return (
                    <div className="text-slate-600 flex items-center gap-2">
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {p.provider}
                      </Badge>
                      <span>
                        {p.embedId ? `ID de Embed: ${p.embedId}` : 'Link direto de reprodução'}
                      </span>
                    </div>
                  )
                })()}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Descrição / Notas da Aula
              </label>
              <textarea
                value={lessonDesc}
                onChange={(e) => setLessonDesc(e.target.value)}
                placeholder="Orientações e materiais complementares para o aluno..."
                className="w-full text-xs p-2.5 border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1 min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLessonModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveLesson}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {editingLesson ? 'Salvar Videoaula' : 'Adicionar Aula'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Matricular / Vincular Alunos ao Curso EAD */}
      <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Alunos ao Curso EAD</DialogTitle>
            <DialogDescription>
              {enrollingCourse?.title}: selecione os alunos que terão acesso a este curso no Portal
              do Aluno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={studentSearchFilter}
                onChange={(e) => setStudentSearchFilter(e.target.value)}
                placeholder="Filtrar por nome ou e-mail..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1.5 border rounded-lg p-2">
              {students
                .filter((s) => {
                  if (!studentSearchFilter.trim()) return true
                  const q = studentSearchFilter.toLowerCase()
                  return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
                })
                .map((student) => {
                  const isChecked = selectedStudentIds.includes(student.id)
                  return (
                    <div
                      key={student.id}
                      onClick={() => handleToggleStudentEnrollment(student.id)}
                      className={`p-2.5 rounded-md text-xs flex items-center justify-between cursor-pointer border transition-colors ${
                        isChecked
                          ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                          : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{student.fullName}</p>
                        <p className="text-[11px] text-slate-500">{student.email}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  )
                })}
            </div>

            <div className="text-xs text-slate-500 flex items-center justify-between px-1">
              <span>{selectedStudentIds.length} aluno(s) selecionado(s)</span>
              <button
                type="button"
                onClick={() => setSelectedStudentIds(students.map((s) => s.id))}
                className="text-indigo-600 hover:underline font-medium text-[11px]"
              >
                Selecionar Todos
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEnrollModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEnrollment}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Salvar Matrículas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Gerenciamento de Materiais Complementares da Aula */}
      <EadMaterialManagerModal
        lesson={materialLesson}
        courseTitle={selectedCourse?.title}
        isOpen={Boolean(materialLesson)}
        onClose={() => setMaterialLesson(null)}
      />

      {/* Modal: Preview do Player de Vídeo */}
      <Dialog
        open={Boolean(previewLesson)}
        onOpenChange={(open) => !open && setPreviewLesson(null)}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-slate-100">{previewLesson?.title}</h3>
              <p className="text-xs text-slate-400">
                {previewLesson?.moduleName} • {previewLesson?.durationMinutes || 15} minutos
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-slate-700 text-slate-300 uppercase text-[10px]"
            >
              {previewLesson?.videoProvider}
            </Badge>
          </div>

          <div className="p-4">
            {previewLesson && (
              <VideoPlayerEmbed
                videoUrl={previewLesson.videoUrl}
                videoProvider={previewLesson.videoProvider}
                videoEmbedId={previewLesson.videoEmbedId}
                title={previewLesson.title}
                autoPlay={false}
              />
            )}
            {previewLesson?.description && (
              <p className="text-xs text-slate-300 mt-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                {previewLesson.description}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
