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
import { ChevronRight, PlusCircle, Tv, Users, Video } from 'lucide-react'

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
  const { currentUser } = usePortal()

  const [selectedCourseId, setSelectedCourseId] = useState<string>(eadCourses[0]?.id || 'none')
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)

  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDesc, setLessonDesc] = useState('')
  const [lessonModule, setLessonModule] = useState('Módulo 1: Introdução')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  const [lessonDuration, setLessonDuration] = useState('15')

  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseWorkload, setCourseWorkload] = useState('20')

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
      instructorId: currentUser?.id,
      instructorName: currentUser?.name,
      enrolledStudentIds: [],
    })
    toast({ title: 'Curso EAD criado', description: courseTitle.trim() })
    setIsCourseModalOpen(false)
    setCourseTitle('')
    setCourseDesc('')
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
                  <span className="block truncate font-medium">{e.title}</span>
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
                  <CardTitle className="text-base">{selectedCourse.title}</CardTitle>
                  <CardDescription>{selectedCourse.description}</CardDescription>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 w-fit gap-2"
                    onClick={() => setIsLessonModalOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4" /> Nova aula com link de vídeo
                  </Button>
                </CardHeader>
                <CardContent>
                  {courseLessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma aula cadastrada neste curso ainda.
                    </p>
                  ) : (
                    <ol className="divide-y">
                      {courseLessons.map((l, i) => (
                        <li key={l.id} className="flex items-center gap-3 py-2">
                          <span className="text-xs text-muted-foreground">{i + 1}.</span>
                          <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{l.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {l.moduleName} · {l.durationMinutes} min
                            </p>
                          </div>
                        </li>
                      ))}
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
                      return (
                        <li key={s.id} className="py-3">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm font-medium">{s.name}</span>
                            <Badge
                              variant={pct === 100 ? 'default' : 'secondary'}
                              className="shrink-0"
                            >
                              {p.done}/{p.total} aulas
                            </Badge>
                          </div>
                          <Progress value={pct} className="h-2" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCourseModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCourse}>Criar curso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
