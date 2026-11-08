import { useMemo, useState } from 'react'
import { AttendanceRecord, Course, Grade, Student } from '@/types/portal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, ChevronRight, Users } from 'lucide-react'

interface ProfessorStudentsProps {
  courses: Course[]
  students: Student[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  onOpenStudent: (studentId: string) => void
}

export function ProfessorStudents({
  courses,
  students,
  grades,
  attendance,
  onOpenStudent,
}: ProfessorStudentsProps) {
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState<string>('all')

  const courseNameById = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return students
      .filter((s) => courseFilter === 'all' || s.courseId === courseFilter)
      .filter(
        (s) =>
          !term ||
          s.fullName.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          s.cpf.includes(term),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [students, courseFilter, search])

  const statsFor = (studentId: string) => {
    const g = grades.filter((x) => x.studentId === studentId)
    const a = attendance.filter((x) => x.studentId === studentId)
    const avg = g.length ? g.reduce((sum, x) => sum + x.value, 0) / g.length : null
    const pres = a.filter((x) => x.status === 'presente').length
    const pct = a.length ? (pres / a.length) * 100 : null
    return { gradeCount: g.length, avg, attCount: a.length, pct }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" /> Meus Alunos ({filtered.length})
        </CardTitle>
        <CardDescription>
          Clique em um aluno para abrir a ficha completa (dados, notas e frequência)
        </CardDescription>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todas as turmas</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aluno encontrado nas suas turmas.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((s) => {
              const st = statsFor(s.id)
              const initials = s.fullName
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onOpenStudent(s.id)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {courseNameById.get(s.courseId) || 'Curso não vinculado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline">
                        {st.avg !== null ? `Média ${st.avg.toFixed(1)}` : 'Sem notas'}
                      </Badge>
                      <Badge variant="outline">
                        {st.pct !== null ? `${st.pct.toFixed(0)}% freq.` : 'Sem registros'}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
