import { useMemo, useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { useToast } from '@/hooks/use-toast'
import { EadCourse, EadLesson, LessonProgress, Student, EadVideoProvider } from '@/types/portal'
import { parseVideoUrl } from '@/lib/portalDb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  ChevronRight,
  PlusCircle,
  Tv,
  Users,
  Video,
  FileText,
  Award,
  Download,
  CheckCircle2,
  Edit2,
  Lock,
  Unlock,
  BookOpen,
  Search,
} from 'lucide-react'
import { EadMaterialManagerModal } from '@/components/ead/EadMaterialManagerModal'
import { generateEadCertificatePdf } from '@/lib/eadCertificatePdfExport'

interface ProfessorEadProps {
  eadCourses: EadCourse[]
  eadLessons: EadLesson[]
  students: Student[]
  lessonProgress: LessonProgress[]
  onCreateCourse: (data: Omit<EadCourse, 'id' | 'created' | 'updated'>) => Promise<EadCourse | null>
  onCreateLesson: (data: Omit<EadLesson, 'id' | 'created' | 'updated'>) => Promise<EadLesson | null>
  onNavigateToEad?: () => void
}

export function ProfessorEad({
  eadCourses,
  eadLessons,
  students,
  lessonProgress,
  onCreateCourse,
  onCreateLesson,
  onNavigateToEad,
}: ProfessorEadProps) {
  const { toast } = useToast()
  const {
    currentUser,
    eadMaterials,
    certificates,
    libraryBooks,
    issueEadCertificate,
    updateEadCourse,
  } = usePortal()
  const [issuingCertStudentId, setIssuingCertStudentId] = useState<string | null>(null)

  const [selectedCourseId, setSelectedCourseId] = useState<string>(eadCourses[0]?.id || 'none')
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false)
  const [materialLesson, setMaterialLesson] = useState<EadLesson | null>(null)

  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDesc, setLessonDesc] = useState('')
  const [lessonModule, setLessonModule] = useState('Módulo 1: Introdução')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  const [lessonDuration, setLessonDuration] = useState('15')

  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseWorkload, setCourseWorkload] = useState('20')
  const [courseRequireSeq, setCourseRequireSeq] = useState(false)
  const [courseRecommendedBookIds, setCourseRecommendedBookIds] = useState<string[]>([])
  const [courseBookSearch, setCourseBookSearch] = useState('')

  // Edição de curso existente
  const [editCourseTitle, setEditCourseTitle] = useState('')
  const [editCourseDesc, setEditCourseDesc] = useState('')
  const [editCourseWorkload, setEditCourseWorkload] = useState('20')
  const [editCourseRequireSeq, setEditCourseRequireSeq] = useState(false)
  const [editRecommendedBookIds, setEditRecommendedBookIds] = useState<string[]>([])
  const [editBookSearch, setEditBookSearch] = useState('')
  const [isSavingCourseEdit, setIsSavingCourseEdit] = useState(false)
  const [isUpdatingCourseSeq, setIsUpdatingCourseSeq] = useState(false)

  const selectedCourse = useMemo(
    () => eadCourses.find((e) => e.id === selectedCourseId) || eadCourses[0],
    [eadCourses, selectedCourseId],
  )

  const courseLessons = useMemo(
    () =>
      eadLessons
        .filter((l) => l.eadCourseId === selectedCourse?.id)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    [eadLessons, selectedCourse],
  )

  const enrolledStudents = useMemo(
    () => students.filter((s) => selectedCourse?.enrolledStudentIds?.includes(s.id)),
    [students, selectedCourse],
  )

  const progressByStudent = useMemo(() => {
    if (!selectedCourse) return new Map<string, { done: number; total: number }>()
    const lessonIds = new Set(courseLessons.map((l) => l.id))
    const map = new Map<string, { done: number; total: number }>()
    for (const s of enrolledStudents) {
      const total = lessonIds.size
      const done = lessonProgress.filter(
        (p) => p.studentId === s.id && lessonIds.has(p.lessonId) && p.status === 'concluido',
      ).length
      map.set(s.id, { done, total })
    }
    return map
  }, [selectedCourse, courseLessons, enrolledStudents, lessonProgress])

  const handleCreateLesson = async () => {
    if (!selectedCourse) return
    if (!lessonTitle.trim() || !lessonVideoUrl.trim()) {
      toast({
        title: 'Dados incompletos',
        description: 'Informe o título da aula e o link do vídeo.',
        variant: 'destructive',
      })
      return
    }
    const parsed = parseVideoUrl(lessonVideoUrl.trim())
    if (!parsed) {
      toast({
        title: 'Link de vídeo inválido',
        description: 'Use um link do YouTube, Vimeo ou MP4.',
        variant: 'destructive',
      })
      return
    }
    await onCreateLesson({
      eadCourseId: selectedCourse.id,
      title: lessonTitle.trim(),
      description: lessonDesc.trim() || undefined,
      moduleName: lessonModule.trim() || 'Módulo 1',
      orderIndex: courseLessons.length + 1,
      videoUrl: lessonVideoUrl.trim(),
      videoProvider: parsed.provider as EadVideoProvider,
      videoEmbedId: parsed.embedId,
      durationMinutes: Number(lessonDuration) || 10,
    })
    toast({ title: 'Aula criada', description: `${lessonTitle.trim()} adicionada ao curso.` })
    setIsLessonModalOpen(false)
    setLessonTitle('')
    setLessonDesc('')
    setLessonVideoUrl('')
  }

  const handleCreateCourse = async () => {
    if (!courseTitle.trim()) {
      toast({
        title: 'Dados incompletos',
        description: 'Informe o título do curso EAD.',
        variant: 'destructive',
      })
      return
    }
    await onCreateCourse({
      title: courseTitle.trim(),
      description: courseDesc.trim(),
      workloadHours: Number(courseWorkload) || 20,
      status: 'publicado',
      requireSequentialLessons: courseRequireSeq,
      recommendedBookIds: courseRecommendedBookIds,
      instructorId: currentUser?.id,
      instructorName: currentUser?.name,
      enrolledStudentIds: [],
    })
    toast({ title: 'Curso EAD criado', description: courseTitle.trim() })
    setIsCourseModalOpen(false)
    setCourseTitle('')
    setCourseDesc('')
    setCourseRequireSeq(false)
    setCourseRecommendedBookIds([])
    setCourseBookSearch('')
  }

  const handleOpenEditCourse = (course: EadCourse) => {
    setEditCourseTitle(course.title)
    setEditCourseDesc(course.description || '')
    setEditCourseWorkload(String(course.workloadHours || 20))
    setEditCourseRequireSeq(Boolean(course.requireSequentialLessons))
    setEditRecommendedBookIds(course.recommendedBookIds || [])
    setEditBookSearch('')
    setIsEditCourseModalOpen(true)
  }

  const handleSaveCourseEdit = async () => {
    if (!selectedCourse) return
    if (!editCourseTitle.trim()) {
      toast({
        title: 'Dados incompletos',
        description: 'Informe o título do curso EAD.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingCourseEdit(true)
    try {
      await updateEadCourse(selectedCourse.id, {
        title: editCourseTitle.trim(),
        description: editCourseDesc.trim(),
        workloadHours: Number(editCourseWorkload) || 20,
        requireSequentialLessons: editCourseRequireSeq,
        recommendedBookIds: editRecommendedBookIds,
      })
      toast({
        title: 'Curso EAD atualizado',
        description: `As alterações de "${editCourseTitle.trim()}" foram salvas com sucesso.`,
      })
      setIsEditCourseModalOpen(false)
    } catch {
      toast({
        title: 'Erro ao atualizar curso',
        description: 'Não foi possível salvar as alterações no banco.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCourseEdit(false)
    }
  }

  const handleToggleSequentialLessons = async (checked: boolean) => {
    if (!selectedCourse) return
    setIsUpdatingCourseSeq(true)
    try {
      await updateEadCourse(selectedCourse.id, {
        requireSequentialLessons: checked,
      })
      toast({
        title: checked ? '🔒 Pré-requisito ativado' : '🔓 Pré-requisito desativado',
        description: checked
          ? 'Os alunos agora precisam concluir cada aula para liberar a seguinte.'
          : 'Todas as aulas do curso voltam a ficar livres para os alunos.',
      })
    } catch {
      toast({
        title: 'Erro ao atualizar pré-requisitos',
        description: 'Não foi possível alterar a configuração do curso.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingCourseSeq(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tv className="h-4 w-4" /> {eadCourses.length} curso(s) EAD sob sua responsabilidade
        </div>
        <div className="flex gap-2">
          {onNavigateToEad && (
            <Button variant="outline" size="sm" onClick={onNavigateToEad}>
              Abrir módulo EAD completo <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" className="gap-2" onClick={() => setIsCourseModalOpen(true)}>
            <PlusCircle className="h-4 w-4" /> Novo curso EAD
          </Button>
        </div>
      </div>

      {eadCourses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Tv className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Você ainda não é instrutor de nenhum curso EAD. Crie um curso para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="self-start">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cursos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {eadCourses.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedCourseId(e.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    e.id === selectedCourse?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="block truncate font-medium">{e.title}</span>
                    {e.requireSequentialLessons ? (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                          e.id === selectedCourse?.id
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                        title="Pré-requisito sequencial ativado"
                      >
                        <Lock className="w-2.5 h-2.5" /> Seq
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`block text-xs ${
                      e.id === selectedCourse?.id
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {e.enrolledStudentIds?.length || 0} alunos ·{' '}
                    {eadLessons.filter((l) => l.eadCourseId === e.id).length} aulas
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {selectedCourse && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base font-bold text-slate-900">
                          {selectedCourse.title}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={
                            selectedCourse.requireSequentialLessons
                              ? 'bg-amber-50 text-amber-700 border-amber-300 font-medium'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium'
                          }
                        >
                          {selectedCourse.requireSequentialLessons ? (
                            <span className="flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-600" />
                              Pré-requisito Ativo
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Unlock className="w-3 h-3 text-emerald-600" />
                              Aulas Livres
                            </span>
                          )}
                        </Badge>

                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200 font-medium flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3 text-purple-600" />
                          {selectedCourse.recommendedBookIds?.length || 0} obra(s) recomendada(s)
                        </Badge>
                      </div>
                      <CardDescription>{selectedCourse.description}</CardDescription>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8 border-slate-300 hover:bg-slate-100"
                        onClick={() => handleOpenEditCourse(selectedCourse)}
                        title="Editar título, descrição, carga horária e regras do curso"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                        Editar curso
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => setIsLessonModalOpen(true)}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Nova aula com link de vídeo
                      </Button>
                    </div>
                  </div>

                  {/* Interruptor de Pré-requisito Sequencial Visível e Destacado */}
                  <div className="mt-4 p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                          selectedCourse.requireSequentialLessons
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {selectedCourse.requireSequentialLessons ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Exigir conclusão das aulas em ordem (pré-requisito sequencial)
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              selectedCourse.requireSequentialLessons
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {selectedCourse.requireSequentialLessons ? 'ATIVADO' : 'DESATIVADO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {selectedCourse.requireSequentialLessons
                            ? 'Ativo: o aluno só pode assistir e concluir uma aula se a anterior estiver concluída. A aula #1 permanece sempre liberada.'
                            : 'Desativado: todas as aulas estão livres para o aluno assistir em qualquer ordem.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                      <Switch
                        id="course-req-seq-switch"
                        checked={Boolean(selectedCourse.requireSequentialLessons)}
                        disabled={isUpdatingCourseSeq}
                        onCheckedChange={handleToggleSequentialLessons}
                      />
                      <Label
                        htmlFor="course-req-seq-switch"
                        className="text-xs font-semibold cursor-pointer select-none text-slate-700"
                      >
                        {isUpdatingCourseSeq
                          ? 'Salvando...'
                          : selectedCourse.requireSequentialLessons
                            ? 'Ativado'
                            : 'Desativado'}
                      </Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {courseLessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma aula cadastrada neste curso ainda.
                    </p>
                  ) : (
                    <ol className="divide-y">
                      {courseLessons.map((l, i) => {
                        const matCount = eadMaterials.filter((m) => m.lessonId === l.id).length
                        return (
                          <li
                            key={l.id}
                            className="flex items-center justify-between gap-3 py-2 hover:bg-slate-50/80 px-2 rounded-md transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="text-xs text-muted-foreground font-semibold w-4 text-right">
                                {i + 1}.
                              </span>
                              <Video className="h-4 w-4 shrink-0 text-indigo-600" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {l.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {l.moduleName} · {l.durationMinutes} min
                                </p>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 px-2 text-xs shrink-0 transition-all ${
                                matCount > 0
                                  ? 'text-cyan-700 border-cyan-300 bg-cyan-50/60 hover:bg-cyan-100'
                                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                              onClick={() => setMaterialLesson(l)}
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
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" /> Progresso dos alunos
                </CardTitle>
                <CardDescription>
                  Aulas EAD concluídas contam como presença no cálculo MEC
                </CardDescription>
              </CardHeader>
              <CardContent>
                {enrolledStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum aluno matriculado. Use o módulo EAD para matricular alunos neste curso.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {enrolledStudents.map((s) => {
                      const p = progressByStudent.get(s.id) || {
                        done: 0,
                        total: courseLessons.length,
                      }
                      const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
                      const isComplete = p.total > 0 && p.done >= p.total

                      // Verificar se já possui certificado EAD para este curso
                      const existingCert = certificates.find(
                        (c) =>
                          c.studentId === s.id &&
                          (c.docType === 'certificado_ead' ||
                            c.verificationCode.startsWith('CEAD-')) &&
                          (c.eadCourseId === selectedCourse?.id ||
                            c.courseId === selectedCourse?.id ||
                            c.courseName.toLowerCase().trim() ===
                              selectedCourse?.title.toLowerCase().trim()) &&
                          c.status === 'ativo',
                      )

                      const handleEmitCertificate = async () => {
                        if (!selectedCourse) return
                        if (!isComplete) {
                          toast({
                            title: 'Emissão bloqueada',
                            description: `O aluno ${s.fullName} possui apenas ${pct}% das aulas concluídas (${p.done}/${p.total}). O certificado exige 100% de conclusão.`,
                            variant: 'destructive',
                          })
                          return
                        }
                        setIssuingCertStudentId(s.id)
                        try {
                          const res = await issueEadCertificate({
                            studentId: s.id,
                            eadCourseId: selectedCourse.id,
                          })
                          if ('certificate' in res && res.certificate) {
                            const alreadyIssued = Boolean(res.alreadyIssued)
                            toast({
                              title: alreadyIssued
                                ? 'Certificado já emitido'
                                : 'Certificado emitido com sucesso',
                              description: alreadyIssued
                                ? `Certificado já emitido para este aluno (${res.certificate.verificationCode}).`
                                : `Código: ${res.certificate.verificationCode}. Documento registrado no sistema.`,
                            })
                          } else {
                            toast({
                              title: 'Não foi possível emitir',
                              description: res.error || 'Erro ao gerar certificado EAD.',
                              variant: 'destructive',
                            })
                          }
                        } catch (err: any) {
                          toast({
                            title: 'Erro na emissão',
                            description: err?.message || 'Falha ao processar certificado.',
                            variant: 'destructive',
                          })
                        } finally {
                          setIssuingCertStudentId(null)
                        }
                      }

                      return (
                        <li key={s.id} className="py-3">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                              {s.fullName}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant={pct === 100 ? 'default' : 'secondary'}
                                className={
                                  pct === 100
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'text-slate-600'
                                }
                              >
                                {p.done}/{p.total} aulas ({pct}%)
                              </Badge>

                              {existingCert ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => generateEadCertificatePdf(existingCert)}
                                  className="h-7 px-2 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 gap-1"
                                  title={`Certificado emitido (${existingCert.verificationCode}). Clique para baixar PDF.`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                  <Download className="w-3 h-3" />
                                  <span className="font-mono text-[11px]">
                                    {existingCert.verificationCode}
                                  </span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant={isComplete ? 'default' : 'outline'}
                                  onClick={handleEmitCertificate}
                                  disabled={issuingCertStudentId === s.id}
                                  className={`h-7 px-2.5 text-xs gap-1.5 transition-all ${
                                    isComplete
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                      : 'text-slate-400 border-slate-200 hover:bg-slate-50 cursor-not-allowed opacity-80'
                                  }`}
                                  title={
                                    isComplete
                                      ? 'Emitir Certificado de Conclusão EAD'
                                      : `Bloqueado: aluno com ${pct}% concluído (necessário 100%)`
                                  }
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>
                                    {issuingCertStudentId === s.id
                                      ? 'Emitindo...'
                                      : 'Emitir Certificado'}
                                  </span>
                                </Button>
                              )}
                            </div>
                          </div>
                          <Progress
                            value={pct}
                            className={`h-2 ${pct === 100 ? '[&>div]:bg-emerald-500' : ''}`}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Materiais Complementares da Aula */}
      <EadMaterialManagerModal
        lesson={materialLesson}
        courseTitle={selectedCourse?.title}
        isOpen={Boolean(materialLesson)}
        onClose={() => setMaterialLesson(null)}
      />

      {/* Modal: Nova Aula */}
      <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova aula — {selectedCourse?.title}</DialogTitle>
            <DialogDescription>
              As videoaulas usam links externos (YouTube, Vimeo ou MP4).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da aula</Label>
              <Input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Ex.: Introdução ao tema"
              />
            </div>
            <div className="space-y-2">
              <Label>Link do vídeo</Label>
              <Input
                value={lessonVideoUrl}
                onChange={(e) => setLessonVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Módulo</Label>
                <Input value={lessonModule} onChange={(e) => setLessonModule(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={lessonDesc}
                onChange={(e) => setLessonDesc(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLessonModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLesson}>Criar aula</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Curso EAD */}
      <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo curso EAD</DialogTitle>
            <DialogDescription>Você será registrado como instrutor responsável.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título do curso</Label>
              <Input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Ex.: Fundamentos de Dados"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Carga horária (h)</Label>
              <Input
                type="number"
                min={1}
                value={courseWorkload}
                onChange={(e) => setCourseWorkload(e.target.value)}
              />
            </div>
            <div className="pt-2 border-t space-y-3">
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 block">
                    Exigir conclusão das aulas em ordem (pré-requisito sequencial)
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-relaxed">
                    Alunos devem assistir e concluir as aulas na sequência definida. A primeira aula
                    permanece sempre liberada.
                  </span>
                </div>
                <Switch
                  id="new-course-req-seq"
                  checked={courseRequireSeq}
                  onCheckedChange={setCourseRequireSeq}
                />
              </div>

              {/* Bibliografia Recomendada da Biblioteca */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    Bibliografia Recomendada (Acervo da Biblioteca)
                  </Label>
                  <span className="text-[11px] text-purple-700 font-semibold">
                    {courseRecommendedBookIds.length} selecionada(s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Selecione livros do acervo para aparecerem no player do aluno como obras de apoio
                  ao curso.
                </p>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Filtrar por título, autor ou ISBN..."
                    value={courseBookSearch}
                    onChange={(e) => setCourseBookSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-md p-1.5 space-y-1 bg-slate-50/50">
                  {libraryBooks
                    .filter((b) => {
                      if (!courseBookSearch.trim()) return true
                      const q = courseBookSearch.toLowerCase().trim()
                      return (
                        b.title.toLowerCase().includes(q) ||
                        b.author.toLowerCase().includes(q) ||
                        (b.isbn && b.isbn.toLowerCase().includes(q))
                      )
                    })
                    .map((book) => {
                      const isSelected = courseRecommendedBookIds.includes(book.id)
                      return (
                        <label
                          key={book.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${
                            isSelected
                              ? 'bg-purple-50/80 border-purple-300 text-purple-900 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCourseRecommendedBookIds([
                                    ...courseRecommendedBookIds,
                                    book.id,
                                  ])
                                } else {
                                  setCourseRecommendedBookIds(
                                    courseRecommendedBookIds.filter((id) => id !== book.id),
                                  )
                                }
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="min-w-0">
                              <span className="block truncate font-semibold">{book.title}</span>
                              <span className="block text-[10px] text-slate-500 truncate">
                                {book.author} {book.category ? `• ${book.category}` : ''}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${
                              book.availableCopies > 0
                                ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                                : 'text-slate-500 border-slate-200 bg-slate-50'
                            }`}
                          >
                            {book.availableCopies}/{book.totalCopies} disp.
                          </Badge>
                        </label>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCourseModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCourse}>Criar curso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Curso EAD */}
      <Dialog open={isEditCourseModalOpen} onOpenChange={setIsEditCourseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar curso EAD</DialogTitle>
            <DialogDescription>
              Altere os dados básicos e a configuração de pré-requisitos do curso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título do curso</Label>
              <Input
                value={editCourseTitle}
                onChange={(e) => setEditCourseTitle(e.target.value)}
                placeholder="Ex.: Fundamentos de Dados"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editCourseDesc}
                onChange={(e) => setEditCourseDesc(e.target.value)}
                rows={3}
                placeholder="Breve resumo da ementa do curso..."
              />
            </div>
            <div className="space-y-2">
              <Label>Carga horária (h)</Label>
              <Input
                type="number"
                min={1}
                value={editCourseWorkload}
                onChange={(e) => setEditCourseWorkload(e.target.value)}
              />
            </div>
            <div className="pt-2 border-t space-y-3">
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 block">
                    Exigir conclusão das aulas em ordem (pré-requisito sequencial)
                  </span>
                  <span className="text-[11px] text-slate-600 block leading-relaxed">
                    Quando ativado, o aluno só pode assistir e concluir uma aula após finalizar a
                    aula anterior. A primeira aula permanece sempre liberada. Ao desativar, todas
                    voltam a ficar livres.
                  </span>
                </div>
                <Switch
                  id="edit-course-req-seq"
                  checked={editCourseRequireSeq}
                  onCheckedChange={setEditCourseRequireSeq}
                />
              </div>

              {/* Bibliografia Recomendada no modal de Edição */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    Bibliografia Recomendada (Acervo da Biblioteca)
                  </Label>
                  <span className="text-[11px] text-purple-700 font-semibold">
                    {editRecommendedBookIds.length} selecionada(s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Vincule livros do acervo como obras de apoio recomendadas para este curso EAD.
                </p>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Filtrar por título, autor ou ISBN..."
                    value={editBookSearch}
                    onChange={(e) => setEditBookSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-md p-1.5 space-y-1 bg-slate-50/50">
                  {libraryBooks
                    .filter((b) => {
                      if (!editBookSearch.trim()) return true
                      const q = editBookSearch.toLowerCase().trim()
                      return (
                        b.title.toLowerCase().includes(q) ||
                        b.author.toLowerCase().includes(q) ||
                        (b.isbn && b.isbn.toLowerCase().includes(q))
                      )
                    })
                    .map((book) => {
                      const isSelected = editRecommendedBookIds.includes(book.id)
                      return (
                        <label
                          key={book.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${
                            isSelected
                              ? 'bg-purple-50/80 border-purple-300 text-purple-900 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditRecommendedBookIds([...editRecommendedBookIds, book.id])
                                } else {
                                  setEditRecommendedBookIds(
                                    editRecommendedBookIds.filter((id) => id !== book.id),
                                  )
                                }
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="min-w-0">
                              <span className="block truncate font-semibold">{book.title}</span>
                              <span className="block text-[10px] text-slate-500 truncate">
                                {book.author} {book.category ? `• ${book.category}` : ''}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${
                              book.availableCopies > 0
                                ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                                : 'text-slate-500 border-slate-200 bg-slate-50'
                            }`}
                          >
                            {book.availableCopies}/{book.totalCopies} disp.
                          </Badge>
                        </label>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditCourseModalOpen(false)}
              disabled={isSavingCourseEdit}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCourseEdit} disabled={isSavingCourseEdit}>
              {isSavingCourseEdit ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
