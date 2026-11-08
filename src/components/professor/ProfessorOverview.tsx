import { useMemo } from 'react'
import {
  AttendanceRecord,
  Course,
  EadCourse,
  EadLesson,
  Grade,
  LessonProgress,
  Student,
} from '@/types/portal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Users,
  ClipboardList,
  Tv,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

interface ProfessorOverviewProps {
  courses: Course[]
  students: Student[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  eadCourses: EadCourse[]
  eadLessons: EadLesson[]
  lessonProgress: LessonProgress[]
  onOpenTab: (tab: 'alunos' | 'lancamentos' | 'ead') => void
}

export function ProfessorOverview({
  courses,
  students,
  grades,
  attendance,
  eadCourses,
  eadLessons,
  lessonProgress,
  onOpenTab,
}: ProfessorOverviewProps) {
  const courseNameById = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses])

  const eadCourseIdSet = useMemo(() => new Set(eadCourses.map((e) => e.id)), [eadCourses])

  const studentsByCourse = useMemo(() => {
    const map = new Map<string, Student[]>()
    for (const s of students) {
      const list = map.get(s.courseId) || []
      list.push(s)
      map.set(s.courseId, list)
    }
    return map
  }, [students])

  const lastGrades = useMemo(() => {
    return [...grades]
      .sort((a, b) => (b.updated || b.created || '').localeCompare(a.updated || a.created || ''))
      .slice(0, 5)
  }, [grades])

  const lastAttendance = useMemo(() => {
    return [...attendance]
      .sort((a, b) => (b.updated || b.created || '').localeCompare(a.updated || a.created || ''))
      .slice(0, 5)
  }, [attendance])

  const eadLessonsCount = (eadCourseId: string) =>
    eadLessons.filter((l) => l.eadCourseId === eadCourseId).length

  const eadCompletedForCourse = (eadCourseId: string) => {
    const lessonIds = new Set(
      eadLessons.filter((l) => l.eadCourseId === eadCourseId).map((l) => l.id),
    )
    if (lessonIds.size === 0) return 0
    const done = lessonProgress.filter((p) => lessonIds.has(p.lessonId) && p.status === 'concluido')
    return new Set(done.map((p) => `${p.studentId}:${p.lessonId}`)).size
  }

  const totalStudents = students.length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Turmas / Cursos
            </CardDescription>
            <CardTitle className="text-3xl">{courses.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Cursos em que você atua como docente
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Alunos
            </CardDescription>
            <CardTitle className="text-3xl">{totalStudents}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Matriculados nas suas turmas
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Tv className="h-4 w-4" /> Cursos EAD
            </CardDescription>
            <CardTitle className="text-3xl">{eadCourses.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {eadLessons.length} aulas publicadas no total
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Minhas Turmas</CardTitle>
          <CardDescription>Alunos ativos por curso em que você atua</CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum curso vinculado a você ainda. Fale com a coordenação.
            </p>
          ) : (
            <ul className="divide-y">
              {courses.map((c) => {
                const count = studentsByCourse.get(c.id)?.length || 0
                const linkedEad = eadCourses.find((e) => e.catalogCourseId === c.id)
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.modality === 'ead' || linkedEad ? 'EAD' : 'Presencial'} ·{' '}
                        {c.workloadHours || 0}h
                        {linkedEad
                          ? ` · ${eadLessonsCount(linkedEad.id)} aulas · ${eadCompletedForCourse(linkedEad.id)} conclusões`
                          : ''}
                      </p>
                    </div>
                    <Badge variant="secondary">{count} alunos</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Últimos lançamentos de nota
              </span>
              <Button variant="ghost" size="sm" onClick={() => onOpenTab('lancamentos')}>
                Lançar <ChevronRight className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>As 5 notas mais recentes das suas turmas</CardDescription>
          </CardHeader>
          <CardContent>
            {lastGrades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma nota lançada ainda.</p>
            ) : (
              <ul className="divide-y">
                {lastGrades.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{g.studentName || g.studentId}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.subject}
                        {g.term ? ` · ${g.term}` : ''}
                      </p>
                    </div>
                    <Badge variant={g.value >= 6 ? 'default' : 'destructive'} className="shrink-0">
                      {g.value.toFixed(1)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Últimos registros de presença
              </span>
              <Button variant="ghost" size="sm" onClick={() => onOpenTab('lancamentos')}>
                Registrar <ChevronRight className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>Chamadas mais recentes das suas turmas</CardDescription>
          </CardHeader>
          <CardContent>
            {lastAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
            ) : (
              <ul className="divide-y">
                {lastAttendance.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{a.studentName || a.studentId}</p>
                      <p className="text-xs text-muted-foreground">
                        {courseNameById.get(a.courseId || '') || a.subject}
                        {a.date ? ` · ${a.date}` : ''}
                      </p>
                    </div>
                    {a.status === 'presente' ? (
                      <Badge className="shrink-0 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Presente
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="shrink-0 gap-1">
                        <XCircle className="h-3 w-3" /> Falta
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {eadCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Progresso nas aulas EAD</span>
              <Button variant="ghost" size="sm" onClick={() => onOpenTab('ead')}>
                Gerenciar <ChevronRight className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>Conclusões por curso EAD seu</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {eadCourses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {eadLessonsCount(e.id)} aulas · {e.enrolledStudentIds?.length || 0} alunos
                      matriculados
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {eadCompletedForCourse(e.id)} conclusões
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
