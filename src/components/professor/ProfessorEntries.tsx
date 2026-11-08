import { useMemo, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { AttendanceRecord, AttendanceStatus, Course, Grade, Student } from '@/types/portal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClipboardList, Save } from 'lucide-react'

interface ProfessorEntriesProps {
  courses: Course[]
  students: Student[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  professorId: string
  professorName: string
  onAddGrade: (data: Omit<Grade, 'id' | 'created' | 'updated'>) => Promise<Grade>
  onAddAttendance: (
    data: Omit<import('@/types/portal').AttendanceRecord, 'id' | 'created' | 'updated'>,
  ) => Promise<import('@/types/portal').AttendanceRecord>
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ProfessorEntries({
  courses,
  students,
  grades,
  attendance,
  professorId,
  professorName,
  onAddGrade,
  onAddAttendance,
}: ProfessorEntriesProps) {
  const { toast } = useToast()

  const [gradeCourseId, setGradeCourseId] = useState<string>(courses[0]?.id || 'none')
  const [gradeStudentId, setGradeStudentId] = useState<string>('none')
  const [gradeSubject, setGradeSubject] = useState('')
  const [gradeTerm, setGradeTerm] = useState('2025.1')
  const [gradeValue, setGradeValue] = useState('8.0')
  const [gradeObs, setGradeObs] = useState('')

  const [attCourseId, setAttCourseId] = useState<string>(courses[0]?.id || 'none')
  const [attDate, setAttDate] = useState<string>(todayIso())
  const [attHours, setAttHours] = useState('2')
  const [attSubject, setAttSubject] = useState('')
  const [attTerm, setAttTerm] = useState('2025.1')
  const [attStatusByStudent, setAttStatusByStudent] = useState<Record<string, AttendanceStatus>>({})

  const studentsOfGrade = useMemo(
    () =>
      students
        .filter((s) => s.courseId === gradeCourseId)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students, gradeCourseId],
  )

  const studentsOfAtt = useMemo(
    () =>
      students
        .filter((s) => s.courseId === attCourseId)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students, attCourseId],
  )

  const recentGrades = useMemo(
    () =>
      grades
        .filter((g) => (g.teacherId ? g.teacherId === professorId : true))
        .sort((a, b) => (b.created || '').localeCompare(a.created || ''))
        .slice(0, 8),
    [grades, professorId],
  )

  const handleAddGrade = async () => {
    if (gradeStudentId === 'none' || !gradeSubject.trim()) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione o aluno e informe a disciplina/avaliação.',
        variant: 'destructive',
      })
      return
    }
    const value = Number(gradeValue.replace(',', '.'))
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      toast({
        title: 'Nota inválida',
        description: 'A nota deve estar entre 0 e 10.',
        variant: 'destructive',
      })
      return
    }
    const student = students.find((s) => s.id === gradeStudentId)
    await onAddGrade({
      studentId: gradeStudentId,
      studentName: student?.fullName,
      studentCpf: student?.cpf,
      courseId: gradeCourseId,
      subject: gradeSubject.trim(),
      term: gradeTerm.trim() || undefined,
      value,
      date: todayIso(),
      teacherId: professorId || undefined,
      teacherName: professorName,
      observations: gradeObs.trim() || undefined,
    })
    toast({ title: 'Nota lançada', description: `${student?.fullName}: ${value.toFixed(1)}` })
    setGradeValue('8.0')
    setGradeObs('')
  }

  const handleSaveAttendance = async () => {
    const hours = Number(attHours) || 1
    const entries = studentsOfAtt.filter((s) => attStatusByStudent[s.id])
    if (entries.length === 0) {
      toast({
        title: 'Nada para registrar',
        description: 'Marque presença ou falta para pelo menos um aluno.',
        variant: 'destructive',
      })
      return
    }
    for (const s of entries) {
      const status = attStatusByStudent[s.id]
      await onAddAttendance({
        studentId: s.id,
        studentName: s.fullName,
        studentCpf: s.cpf,
        courseId: attCourseId,
        subject: attSubject.trim() || courses.find((c) => c.id === attCourseId)?.name || 'Aula',
        term: attTerm.trim() || undefined,
        date: attDate,
        status,
        hours,
        teacherId: professorId || undefined,
        teacherName: professorName,
      })
    }
    toast({
      title: 'Chamada registrada',
      description: `${entries.length} registro(s) salvos em ${attDate}.`,
    })
    setAttStatusByStudent({})
    setAttSubject('')
    setAttTerm('2025.1')
  }

  return (
    <Tabs defaultValue="notas" className="space-y-4">
      <TabsList>
        <TabsTrigger value="notas">Lançar Nota</TabsTrigger>
        <TabsTrigger value="presenca">Registrar Presença</TabsTrigger>
      </TabsList>

      <TabsContent value="notas">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Lançamento rápido de nota
            </CardTitle>
            <CardDescription>
              A nota é persistida na coleção de notas e entra no cálculo da média do aluno.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Turma / Curso</Label>
                <Select
                  value={gradeCourseId}
                  onValueChange={(v) => {
                    setGradeCourseId(v)
                    setGradeStudentId('none')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aluno</Label>
                <Select value={gradeStudentId} onValueChange={setGradeStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsOfGrade.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Disciplina / Avaliação</Label>
                <Input
                  value={gradeSubject}
                  onChange={(e) => setGradeSubject(e.target.value)}
                  placeholder="Ex.: Prova 1 — Banco de Dados"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Input value={gradeTerm} onChange={(e) => setGradeTerm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nota (0–10)</Label>
                  <Input value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={gradeObs}
                onChange={(e) => setGradeObs(e.target.value)}
                placeholder="Comentários sobre a avaliação..."
                rows={2}
              />
            </div>
            <Button onClick={handleAddGrade} className="gap-2">
              <Save className="h-4 w-4" /> Lançar nota
            </Button>

            {recentGrades.length > 0 && (
              <div className="pt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Últimos lançamentos
                </p>
                <ul className="divide-y rounded-md border">
                  {recentGrades.map((g) => (
                    <li key={g.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="truncate">
                        {g.studentName || g.studentId} — {g.subject}
                      </span>
                      <Badge variant={g.value >= 6 ? 'default' : 'destructive'}>
                        {g.value.toFixed(1)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="presenca">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Chamada da turma
            </CardTitle>
            <CardDescription>
              Marque presença ou falta por aluno. O registro entra no cálculo da frequência MEC.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Turma / Curso</Label>
                <Select
                  value={attCourseId}
                  onValueChange={(v) => {
                    setAttCourseId(v)
                    setAttStatusByStudent({})
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da aula</Label>
                <Input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horas de aula</Label>
                <Input
                  type="number"
                  min={1}
                  value={attHours}
                  onChange={(e) => setAttHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Input
                  value={attTerm}
                  onChange={(e) => setAttTerm(e.target.value)}
                  placeholder="Ex.: 2025.1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Disciplina / Aula (opcional)</Label>
              <Input
                value={attSubject}
                onChange={(e) => setAttSubject(e.target.value)}
                placeholder="Ex.: Aula de Algoritmos"
              />
            </div>

            {studentsOfAtt.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aluno matriculado nesta turma.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {studentsOfAtt.map((s) => {
                  const status = attStatusByStudent[s.id]
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0 truncate text-sm">{s.fullName}</span>
                      <div className="flex shrink-0 gap-1">
                        {(['presente', 'falta'] as const).map((st) => (
                          <Button
                            key={st}
                            type="button"
                            size="sm"
                            variant={
                              status === st
                                ? st === 'presente'
                                  ? 'default'
                                  : 'destructive'
                                : 'outline'
                            }
                            onClick={() =>
                              setAttStatusByStudent((prev) => ({ ...prev, [s.id]: st }))
                            }
                          >
                            {st === 'presente' ? 'Presente' : 'Falta'}
                          </Button>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <Button onClick={handleSaveAttendance} className="gap-2">
              <Save className="h-4 w-4" /> Salvar chamada
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
