import React, { useMemo, useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { AttendanceRecord, Grade, Student } from '@/types/portal'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutDashboard, Users, ClipboardList, Tv } from 'lucide-react'
import { ProfessorOverview } from './ProfessorOverview'
import { ProfessorStudents } from './ProfessorStudents'
import { ProfessorEntries } from './ProfessorEntries'
import { ProfessorEad } from './ProfessorEad'

type TabKey = 'visao' | 'alunos' | 'lancamentos' | 'ead'

interface ProfessorAreaModuleProps {
  onNavigateToStudent?: (studentId: string) => void
}

/** Perfis de gestão acadêmica que também enxergam a área (visão consolidada). */
export const MANAGEMENT_ROLES = ['root', 'admin', 'coordenador', 'secretaria']

export function ProfessorAreaModule({ onNavigateToStudent }: ProfessorAreaModuleProps) {
  const {
    currentUser,
    users,
    students,
    courses,
    grades,
    attendance,
    eadCourses,
    eadLessons,
    lessonProgress,
    addGrade,
    addAttendance,
    createEadCourse,
    createEadLesson,
  } = usePortal()

  const isManagement = !!currentUser && MANAGEMENT_ROLES.includes(currentUser.role)

  // Vínculo professor↔curso por ID do usuário logado (coleção `users`):
  // - cursos de graduação/pós: `Course.coordinatorId` (campo novo; cursos antigos
  //   sem ID recebem backfill pela migração 0016, que casa o nome com um usuário);
  // - cursos EAD: `EadCourse.instructorId`.
  // Fallback legado: se nenhum registro da instituição usa o vínculo por ID,
  // um curso antigo só com nome (`coordinator`) ainda é reconhecido — mas NUNCA
  // quando houver mais de um professor/atendente com o mesmo nome (ambiguidade).
  const professorNameKey = useMemo(
    () => (currentUser ? currentUser.name.trim().toLowerCase() : ''),
    [currentUser],
  )

  const legacyNameIsAmbiguous = useMemo(
    () => users.filter((u) => (u.name || '').trim().toLowerCase() === professorNameKey).length > 1,
    [users, professorNameKey],
  )

  const anyIdLinkInUse = useMemo(
    () => courses.some((c) => !!c.coordinatorId) || eadCourses.some((e) => !!e.instructorId),
    [courses, eadCourses],
  )

  const myCourses = useMemo(() => {
    if (isManagement) return courses
    if (!currentUser) return []
    return courses.filter((c) => {
      if (c.coordinatorId) return c.coordinatorId === currentUser.id
      if (legacyNameIsAmbiguous || anyIdLinkInUse) return false
      return (c.coordinator || '').trim().toLowerCase() === professorNameKey
    })
  }, [courses, currentUser, isManagement, professorNameKey, legacyNameIsAmbiguous, anyIdLinkInUse])

  const myEadCourses = useMemo(() => {
    if (isManagement) return eadCourses
    if (!currentUser) return []
    return eadCourses.filter((e) => {
      if (e.instructorId) return e.instructorId === currentUser.id
      if (legacyNameIsAmbiguous || anyIdLinkInUse) return false
      return (e.instructorName || '').trim().toLowerCase() === professorNameKey
    })
  }, [
    eadCourses,
    currentUser,
    isManagement,
    professorNameKey,
    legacyNameIsAmbiguous,
    anyIdLinkInUse,
  ])

  const myCourseIds = useMemo(() => new Set(myCourses.map((c) => c.id)), [myCourses])

  const myStudents = useMemo(
    () => students.filter((s) => myCourseIds.has(s.courseId)),
    [students, myCourseIds],
  )

  const myStudentsIds = useMemo(() => new Set(myStudents.map((s) => s.id)), [myStudents])

  const myGrades = useMemo(
    () => grades.filter((g) => myCourseIds.has(g.courseId || '') || myStudentsIds.has(g.studentId)),
    [grades, myCourseIds, myStudentsIds],
  )

  const myAttendance = useMemo(
    () =>
      attendance.filter((a) => myCourseIds.has(a.courseId || '') || myStudentsIds.has(a.studentId)),
    [attendance, myCourseIds, myStudentsIds],
  )

  const [tab, setTab] = useState<TabKey>('visao')

  const professorName = currentUser?.name || 'Professor'
  const professorId = currentUser?.id || ''

  if (!currentUser) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Área do Professor</h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo(a), {professorName}. Seu trabalho docente reunido em um só lugar.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="visao" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="alunos" className="gap-2">
            <Users className="h-4 w-4" /> Meus Alunos
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Lançamentos
          </TabsTrigger>
          <TabsTrigger value="ead" className="gap-2">
            <Tv className="h-4 w-4" /> Meus Cursos EAD
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'visao' && (
        <ProfessorOverview
          courses={myCourses}
          students={myStudents}
          grades={myGrades}
          attendance={myAttendance}
          eadCourses={myEadCourses}
          eadLessons={eadLessons}
          lessonProgress={lessonProgress}
          onOpenTab={setTab}
        />
      )}

      {tab === 'alunos' && (
        <ProfessorStudents
          courses={myCourses}
          students={myStudents}
          grades={myGrades}
          attendance={myAttendance}
          onOpenStudent={(id) => onNavigateToStudent?.(id)}
        />
      )}

      {tab === 'lancamentos' && (
        <ProfessorEntries
          courses={myCourses}
          students={myStudents}
          grades={myGrades}
          attendance={myAttendance}
          professorId={professorId}
          professorName={professorName}
          onAddGrade={addGrade}
          onAddAttendance={addAttendance}
        />
      )}

      {tab === 'ead' && (
        <ProfessorEad
          eadCourses={myEadCourses}
          eadLessons={eadLessons}
          students={students}
          lessonProgress={lessonProgress}
          onCreateCourse={createEadCourse}
          onCreateLesson={createEadLesson}
        />
      )}
    </div>
  )
}

export type { TabKey as ProfessorTabKey }
export type { Grade, AttendanceRecord, Student }
