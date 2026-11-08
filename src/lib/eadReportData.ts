import { Student, EadCourse, EadLesson, LessonProgress } from '@/types/portal'

export interface EadStudentProgressItem {
  studentId: string
  studentName: string
  studentCpf: string
  courseId: string
  courseTitle: string
  workloadHours: number
  totalLessons: number
  completedLessons: number
  progressPercent: number
  status: 'concluido' | 'em_andamento' | 'nao_iniciado'
  lastActivityAt?: string
}

export interface EadCourseStatItem {
  courseId: string
  courseTitle: string
  instructorName: string
  workloadHours: number
  totalLessons: number
  enrolledStudentsCount: number
  completedStudentsCount: number
  averageProgressPercent: number
}

export interface EadReportKpis {
  totalEadCourses: number
  totalLessons: number
  totalEnrolledStudents: number
  averageProgressPercent: number
  stalledStudentsCount: number // progresso travado / zero
  completedStudentsCount: number
}

export interface EadReportFilterState {
  courseId: string
  searchTerm: string
}

export interface EadReportExportPayload {
  portalName: string
  periodLabel: string
  generatedAt: Date
  generatedBy: {
    name: string
    roleTitle: string
    email: string
  }
  kpis: EadReportKpis
  courses: EadCourseStatItem[]
  students: EadStudentProgressItem[]
}

/**
 * Calcula dados e indicadores de EAD para relatórios gerenciais
 */
export function calculateEadReportData(params: {
  eadCourses: EadCourse[]
  eadLessons: EadLesson[]
  lessonProgress: LessonProgress[]
  students: Student[]
  filters: EadReportFilterState
}): {
  kpis: EadReportKpis
  courseStats: EadCourseStatItem[]
  studentProgressList: EadStudentProgressItem[]
  courseOptions: Array<{ id: string; title: string }>
} {
  const { eadCourses, eadLessons, lessonProgress, students, filters } = params

  const courseOptions = eadCourses.map((c) => ({
    id: c.id,
    title: c.title,
  }))

  // Map rápido de aluno por ID
  const studentMap = new Map<string, Student>()
  students.forEach((s) => studentMap.set(s.id, s))

  // Map de aulas por curso EAD
  const lessonsByCourse = new Map<string, EadLesson[]>()
  eadLessons.forEach((l) => {
    const list = lessonsByCourse.get(l.eadCourseId) || []
    list.push(l)
    lessonsByCourse.set(l.eadCourseId, list)
  })

  // Coleta registros detalhados por aluno e curso EAD
  const allStudentItems: EadStudentProgressItem[] = []
  const uniqueEnrolledStudentIds = new Set<string>()

  eadCourses.forEach((course) => {
    const lessons = lessonsByCourse.get(course.id) || []
    const totalLessons = lessons.length
    const lessonIds = new Set(lessons.map((l) => l.id))

    // Alunos matriculados no curso EAD
    const enrolledIds = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds : []

    enrolledIds.forEach((studentId) => {
      uniqueEnrolledStudentIds.add(studentId)
      const student = studentMap.get(studentId)
      if (!student) return

      // Progresso desse aluno nesse curso EAD
      const studentProgress = lessonProgress.filter(
        (p) => p.studentId === studentId && (p.courseId === course.id || lessonIds.has(p.lessonId)),
      )

      const completedCount = studentProgress.filter(
        (p) => lessonIds.has(p.lessonId) && p.status === 'concluido',
      ).length

      const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

      // Última atividade registrada
      let lastActivity: string | undefined = undefined
      studentProgress.forEach((p) => {
        const dateStr = p.completedAt || p.updated || p.created
        if (dateStr && (!lastActivity || dateStr > lastActivity)) {
          lastActivity = dateStr
        }
      })

      let status: 'concluido' | 'em_andamento' | 'nao_iniciado' = 'nao_iniciado'
      if (percent >= 100 && totalLessons > 0) {
        status = 'concluido'
      } else if (percent > 0 || completedCount > 0) {
        status = 'em_andamento'
      }

      allStudentItems.push({
        studentId,
        studentName: student.fullName,
        studentCpf: student.cpf,
        courseId: course.id,
        courseTitle: course.title,
        workloadHours: course.workloadHours || 20,
        totalLessons,
        completedLessons: completedCount,
        progressPercent: percent,
        status,
        lastActivityAt: lastActivity,
      })
    })
  })

  // Estatísticas por curso
  const courseStats: EadCourseStatItem[] = eadCourses.map((c) => {
    const lessons = lessonsByCourse.get(c.id) || []
    const courseItems = allStudentItems.filter((item) => item.courseId === c.id)
    const enrolledCount = courseItems.length
    const completedCount = courseItems.filter((i) => i.status === 'concluido').length

    const totalPct = courseItems.reduce((acc, i) => acc + i.progressPercent, 0)
    const avgPct = enrolledCount > 0 ? Math.round(totalPct / enrolledCount) : 0

    return {
      courseId: c.id,
      courseTitle: c.title,
      instructorName: c.instructorName || 'Professor',
      workloadHours: c.workloadHours || 20,
      totalLessons: lessons.length,
      enrolledStudentsCount: enrolledCount,
      completedStudentsCount: completedCount,
      averageProgressPercent: avgPct,
    }
  })

  // Aplicação dos filtros na listagem de alunos
  let filteredStudents = allStudentItems
  if (filters.courseId && filters.courseId !== 'all') {
    filteredStudents = filteredStudents.filter((i) => i.courseId === filters.courseId)
  }

  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim().toLowerCase()
    filteredStudents = filteredStudents.filter(
      (i) =>
        i.studentName.toLowerCase().includes(term) ||
        i.studentCpf.toLowerCase().includes(term) ||
        i.courseTitle.toLowerCase().includes(term),
    )
  }

  // KPIs globais
  const totalCourses = eadCourses.length
  const totalLessons = eadLessons.length
  const totalEnrolled = uniqueEnrolledStudentIds.size

  const totalProgressSum = allStudentItems.reduce((acc, item) => acc + item.progressPercent, 0)
  const averageProgress =
    allStudentItems.length > 0 ? Math.round(totalProgressSum / allStudentItems.length) : 0

  const stalledCount = allStudentItems.filter((i) => i.progressPercent === 0).length
  const completedCount = allStudentItems.filter((i) => i.status === 'concluido').length

  const kpis: EadReportKpis = {
    totalEadCourses: totalCourses,
    totalLessons,
    totalEnrolledStudents: totalEnrolled,
    averageProgressPercent: averageProgress,
    stalledStudentsCount: stalledCount,
    completedStudentsCount: completedCount,
  }

  return {
    kpis,
    courseStats,
    studentProgressList: filteredStudents,
    courseOptions,
  }
}
