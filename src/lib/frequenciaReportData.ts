import {
  ClassItem,
  AttendanceRecord,
  Student,
  Course,
  EadCourse,
  EadLesson,
  LessonProgress,
} from '@/types/portal'
import {
  calculateConsolidatedAttendance,
  ConsolidatedAttendanceResult,
} from '@/lib/academicCalculations'

export interface StudentAttendanceDetail {
  studentId: string
  studentName: string
  studentCpf: string
  courseName: string
  status: 'aprovado' | 'em_risco' // >= 75% ok, < 75% em_risco
  classAttendancePercent: number
  consolidatedPercent: number
  presents: number
  absences: number
  justified: number
  totalClassSessions: number
}

export interface ClassAttendanceReportItem {
  classId: string
  className: string
  courseId: string
  courseName: string
  term: string
  professorUserId: string
  professorName: string
  enrolledStudentsCount: number
  totalCallsRecorded: number
  totalPresents: number
  totalAbsences: number
  totalJustified: number
  averageClassPercent: number
  riskStudentsCount: number
  students: StudentAttendanceDetail[]
}

export interface FrequenciaKpis {
  overallConsolidatedAverage: number
  totalCallsRecorded: number
  totalPresents: number
  totalAbsences: number
  totalJustified: number
  riskStudentsCount: number
  totalStudentsMonitored: number
  totalClassesCount: number
}

export interface FrequenciaFilterState {
  classId: string
  startDate: string
  endDate: string
  searchTerm: string
}

export interface FrequenciaReportExportPayload {
  portalName: string
  periodLabel: string
  periodKey?: string
  generatedAt: Date
  generatedBy: {
    name: string
    roleTitle: string
    email: string
  }
  kpis: FrequenciaKpis
  classes: ClassAttendanceReportItem[]
  riskStudents: StudentAttendanceDetail[]
}

/**
 * Calcula todos os dados e métricas do Relatório de Frequência por Turma
 */
export function calculateFrequenciaReportData(params: {
  classes: ClassItem[]
  attendance: AttendanceRecord[]
  students: Student[]
  courses: Course[]
  eadCourses: EadCourse[]
  eadLessons: EadLesson[]
  lessonProgress: LessonProgress[]
  filters: FrequenciaFilterState
  currentUserRole?: string
  currentUserId?: string
}): {
  kpis: FrequenciaKpis
  classReportList: ClassAttendanceReportItem[]
  riskStudentsRanking: StudentAttendanceDetail[]
  allClassesOptions: Array<{ id: string; name: string }>
} {
  const {
    classes,
    attendance,
    students,
    courses,
    eadCourses,
    eadLessons,
    lessonProgress,
    filters,
    currentUserRole,
    currentUserId,
  } = params

  // 1. Filtragem por perfil (professor vê apenas turmas onde é o professorUserId)
  const isProfessorOnly = currentUserRole === 'professor'
  const accessibleClasses = classes.filter((c) => {
    if (isProfessorOnly && currentUserId) {
      return c.professorUserId === currentUserId
    }
    return true
  })

  const allClassesOptions = accessibleClasses.map((c) => ({
    id: c.id,
    name: c.name,
  }))

  // 2. Filtro de data das chamadas
  const hasStartDate = Boolean(filters.startDate)
  const hasEndDate = Boolean(filters.endDate)

  const filteredAttendance = attendance.filter((att) => {
    if (!att.date) return true
    if (hasStartDate && att.date < filters.startDate) return false
    if (hasEndDate && att.date > filters.endDate) return false
    return true
  })

  // Map de estudantes para lookup rápido
  const studentMap = new Map<string, Student>()
  students.forEach((s) => studentMap.set(s.id, s))

  // Map de cursos para lookup
  const courseMap = new Map<string, Course>()
  courses.forEach((c) => courseMap.set(c.id, c))

  // 3. Processa cada turma acessível
  const reportItems: ClassAttendanceReportItem[] = []

  accessibleClasses.forEach((cls) => {
    // Filtro de turma selecionada
    if (filters.classId && filters.classId !== 'all' && cls.id !== filters.classId) {
      return
    }

    const enrolledIds = cls.studentIds || []
    const classEnrolledStudents: Student[] = []
    enrolledIds.forEach((sid) => {
      const st = studentMap.get(sid)
      if (st) classEnrolledStudents.push(st)
    })

    // Registros desta turma dentro do período de datas
    const classAtt = filteredAttendance.filter((a) => a.classId === cls.id)

    // Agrupamento por data para saber quantas sessões/chamadas distintas foram feitas
    const distinctDates = new Set(classAtt.map((a) => a.date))
    const totalCallsRecorded = distinctDates.size

    let totalPresents = 0
    let totalAbsences = 0
    let totalJustified = 0

    // Detalhe individual dos alunos matriculados
    const studentDetails: StudentAttendanceDetail[] = classEnrolledStudents.map((st) => {
      const cleanCpf = (st.cpf || '').replace(/\D/g, '')

      // Frequência específica desta turma
      const stClassAtt = classAtt.filter(
        (a) =>
          a.studentId === st.id ||
          (cleanCpf && a.studentCpf && a.studentCpf.replace(/\D/g, '') === cleanCpf),
      )

      const presents = stClassAtt.filter((a) => a.status === 'presente').length
      const justified = stClassAtt.filter((a) => a.status === 'falta_justificada').length
      const absences = stClassAtt.filter((a) => a.status === 'falta').length
      const totalSessions = stClassAtt.length

      totalPresents += presents
      totalJustified += justified
      totalAbsences += absences

      let classPercent = 100
      if (totalSessions > 0) {
        classPercent = Math.round(((presents + justified) / totalSessions) * 1000) / 10
      }

      // Frequência consolidada MEC (Geral: manual + EAD)
      const consolidated: ConsolidatedAttendanceResult = calculateConsolidatedAttendance(
        st.id,
        filteredAttendance,
        eadCourses,
        eadLessons,
        lessonProgress,
        st.cpf,
      )

      const status: 'aprovado' | 'em_risco' = classPercent >= 75 ? 'aprovado' : 'em_risco'

      return {
        studentId: st.id,
        studentName: st.fullName,
        studentCpf: st.cpf,
        courseName: cls.courseName || st.courseName || '—',
        status,
        classAttendancePercent: classPercent,
        consolidatedPercent: consolidated.overallAttendancePercent,
        presents,
        absences,
        justified,
        totalClassSessions: totalSessions,
      }
    })

    // Percentual médio da turma
    let averageClassPercent = 100
    if (studentDetails.length > 0) {
      const sumPercent = studentDetails.reduce((acc, s) => acc + s.classAttendancePercent, 0)
      averageClassPercent = Math.round((sumPercent / studentDetails.length) * 10) / 10
    }

    const riskStudentsCount = studentDetails.filter((s) => s.status === 'em_risco').length

    reportItems.push({
      classId: cls.id,
      className: cls.name,
      courseId: cls.courseId,
      courseName: cls.courseName || '—',
      term: cls.term,
      professorUserId: cls.professorUserId,
      professorName: cls.professorName || '—',
      enrolledStudentsCount: classEnrolledStudents.length,
      totalCallsRecorded,
      totalPresents,
      totalAbsences,
      totalJustified,
      averageClassPercent,
      riskStudentsCount,
      students: studentDetails,
    })
  })

  // 4. Aplica filtro de busca (termo que bate com nome do aluno, professor, turma ou curso)
  const query = (filters.searchTerm || '').trim().toLowerCase()
  const cleanQueryCpf = query.replace(/\D/g, '')

  const filteredClassList = reportItems.filter((item) => {
    if (!query) return true

    const matchClassName = item.className.toLowerCase().includes(query)
    const matchCourse = item.courseName.toLowerCase().includes(query)
    const matchProf = item.professorName.toLowerCase().includes(query)

    const matchStudent = item.students.some((st) => {
      const cleanCpf = st.studentCpf.replace(/\D/g, '')
      return (
        st.studentName.toLowerCase().includes(query) ||
        (cleanQueryCpf && cleanCpf.includes(cleanQueryCpf))
      )
    })

    return matchClassName || matchCourse || matchProf || matchStudent
  })

  // 5. Coleta todos os alunos em risco para o ranking e KPIs
  const allRiskStudents: StudentAttendanceDetail[] = []
  const monitoredStudentIds = new Set<string>()

  reportItems.forEach((cls) => {
    cls.students.forEach((st) => {
      monitoredStudentIds.add(st.studentId)
      if (st.status === 'em_risco') {
        allRiskStudents.push(st)
      }
    })
  })

  // Deduplica e ordena por menor percentual primeiro (maior risco primeiro)
  const riskStudentsRanking = [...allRiskStudents].sort(
    (a, b) => a.classAttendancePercent - b.classAttendancePercent,
  )

  // 6. Calcula KPIs consolidados
  const totalCallsRecordedSum = filteredClassList.reduce((acc, c) => acc + c.totalCallsRecorded, 0)
  const totalPresentsSum = filteredClassList.reduce((acc, c) => acc + c.totalPresents, 0)
  const totalAbsencesSum = filteredClassList.reduce((acc, c) => acc + c.totalAbsences, 0)
  const totalJustifiedSum = filteredClassList.reduce((acc, c) => acc + c.totalJustified, 0)

  // Frequência média consolidada geral de todos os alunos monitorados
  let overallConsolidatedAverage = 100
  if (monitoredStudentIds.size > 0) {
    let sumConsolidated = 0
    let count = 0
    monitoredStudentIds.forEach((sid) => {
      const st = studentMap.get(sid)
      if (st) {
        const res = calculateConsolidatedAttendance(
          sid,
          filteredAttendance,
          eadCourses,
          eadLessons,
          lessonProgress,
          st.cpf,
        )
        sumConsolidated += res.overallAttendancePercent
        count += 1
      }
    })
    if (count > 0) {
      overallConsolidatedAverage = Math.round((sumConsolidated / count) * 10) / 10
    }
  }

  const kpis: FrequenciaKpis = {
    overallConsolidatedAverage,
    totalCallsRecorded: totalCallsRecordedSum,
    totalPresents: totalPresentsSum,
    totalAbsences: totalAbsencesSum,
    totalJustified: totalJustifiedSum,
    riskStudentsCount: riskStudentsRanking.length,
    totalStudentsMonitored: monitoredStudentIds.size,
    totalClassesCount: filteredClassList.length,
  }

  return {
    kpis,
    classReportList: filteredClassList,
    riskStudentsRanking,
    allClassesOptions,
  }
}
