import {
  Grade,
  AttendanceRecord,
  SubjectAcademicSummary,
  ClassAttendanceSummary,
  ACADEMIC_RULES,
  EadCourse,
  EadLesson,
  LessonProgress,
  ClassItem,
} from '@/types/portal'

export interface ConsolidatedAttendanceResult {
  manualClasses: number
  manualPresents: number
  manualAbsences: number
  manualAttendancePercent: number
  eadEnrolledCoursesCount: number
  eadTotalLessons: number
  eadCompletedLessons: number
  eadAttendancePercent: number
  hasEad: boolean
  totalClassesCombined: number
  totalPresentsCombined: number
  overallAttendancePercent: number
  formulaExplanation: string
}

/**
 * Calcula a frequência consolidada MEC integrando chamadas manuais/presenciais
 * e o progresso das videoaulas EAD dos cursos matriculados (enrolledStudentIds).
 * Fórmula: (presenças manuais + aulas EAD concluídas) / (total de aulas manuais + aulas EAD matriculadas)
 */
export function calculateConsolidatedAttendance(
  studentId: string,
  attendance: AttendanceRecord[],
  eadCourses: EadCourse[] = [],
  eadLessons: EadLesson[] = [],
  lessonProgress: LessonProgress[] = [],
  studentCpf?: string,
): ConsolidatedAttendanceResult {
  const cleanCpf = studentCpf ? studentCpf.replace(/\D/g, '') : ''
  // Deduplicação cuidadosa: se um registro for idêntico por data e subject/classId, não duplica
  const rawAtt = attendance.filter(
    (a) =>
      a.studentId === studentId ||
      (cleanCpf && a.studentCpf && a.studentCpf.replace(/\D/g, '') === cleanCpf),
  )

  // Ordena para que registros de chamada por turma (com classId) tenham precedência
  const sortedAtt = [...rawAtt].sort((a, b) => {
    if (a.classId && !b.classId) return -1
    if (!a.classId && b.classId) return 1
    return 0
  })

  // Deduplicação: se houver chamada de turma e lançamento manual no mesmo dia,
  // ou múltiplos lançamentos da mesma turma na mesma data, não contar duas vezes
  const seenClassDates = new Set<string>()
  const seenDateSubjects = new Set<string>()
  const datesWithClassAttendance = new Set<string>()

  const studentAtt = sortedAtt.filter((a) => {
    const subjNorm = (a.subject || '').trim().toLowerCase()
    const dateKey = a.date

    // Chamada oficial vinculada à turma (classId)
    if (a.classId) {
      const classKey = `${a.classId}:${dateKey}`
      if (seenClassDates.has(classKey)) return false
      seenClassDates.add(classKey)
      datesWithClassAttendance.add(dateKey)
      if (subjNorm) seenDateSubjects.add(`${dateKey}:${subjNorm}`)
      return true
    }

    // Lançamento manual (sem classId):
    // Se já existe chamada de turma no mesmo dia, deduplica para não contar presença dupla no mesmo dia
    if (datesWithClassAttendance.has(dateKey)) {
      return false
    }

    const dateSubjKey = `${dateKey}:${subjNorm}`
    if (seenDateSubjects.has(dateSubjKey)) return false
    seenDateSubjects.add(dateSubjKey)
    return true
  })

  const manualClasses = studentAtt.length
  const manualPresents = studentAtt.filter(
    (a) => a.status === 'presente' || a.status === 'falta_justificada',
  ).length
  const manualAbsences = studentAtt.filter((a) => a.status === 'falta').length
  const manualAttendancePercent =
    manualClasses > 0 ? Math.round((manualPresents / manualClasses) * 1000) / 10 : 100

  // Cursos EAD em que o aluno está matriculado explicitamente
  const enrolledCourses = eadCourses.filter(
    (c) => Array.isArray(c.enrolledStudentIds) && c.enrolledStudentIds.includes(studentId),
  )
  const enrolledCourseIds = new Set(enrolledCourses.map((c) => c.id))

  // Aulas pertencentes a esses cursos
  const relevantLessons = eadLessons.filter((l) => enrolledCourseIds.has(l.eadCourseId))
  const eadTotalLessons = relevantLessons.length

  // Progresso do aluno com status 'concluido' para aulas dos cursos matriculados
  let eadCompletedLessons = 0
  if (eadTotalLessons > 0) {
    const completedLessonIds = new Set(
      lessonProgress
        .filter((p) => p.studentId === studentId && p.status === 'concluido')
        .map((p) => p.lessonId),
    )
    relevantLessons.forEach((l) => {
      if (completedLessonIds.has(l.id)) {
        eadCompletedLessons += 1
      }
    })
  }

  const hasEad = eadTotalLessons > 0
  const eadAttendancePercent =
    eadTotalLessons > 0 ? Math.round((eadCompletedLessons / eadTotalLessons) * 1000) / 10 : 100

  const totalClassesCombined = manualClasses + eadTotalLessons
  const totalPresentsCombined = manualPresents + eadCompletedLessons

  const overallAttendancePercent =
    totalClassesCombined > 0
      ? Math.round((totalPresentsCombined / totalClassesCombined) * 1000) / 10
      : manualAttendancePercent

  const formulaExplanation = hasEad
    ? `(${manualPresents} presenças presenciais + ${eadCompletedLessons} aulas EAD concluídas) ÷ (${manualClasses} aulas presenciais + ${eadTotalLessons} aulas EAD matriculadas) = ${overallAttendancePercent}%`
    : `${manualPresents} presenças presenciais ÷ ${manualClasses} aulas presenciais = ${overallAttendancePercent}%`

  return {
    manualClasses,
    manualPresents,
    manualAbsences,
    manualAttendancePercent,
    eadEnrolledCoursesCount: enrolledCourses.length,
    eadTotalLessons,
    eadCompletedLessons,
    eadAttendancePercent,
    hasEad,
    totalClassesCombined,
    totalPresentsCombined,
    overallAttendancePercent,
    formulaExplanation,
  }
}

/**
 * Calcula o resumo consolidado por disciplina para um aluno
 */
export function calculateAcademicSummary(
  grades: Grade[],
  attendance: AttendanceRecord[],
): SubjectAcademicSummary[] {
  // Identifica todas as disciplinas presentes em notas e frequências
  const subjectsSet = new Set<string>()
  grades.forEach((g) => {
    if (g.subject) subjectsSet.add(g.subject.trim())
  })
  attendance.forEach((a) => {
    if (a.subject) subjectsSet.add(a.subject.trim())
  })

  const summaries: SubjectAcademicSummary[] = []

  subjectsSet.forEach((subject) => {
    const subjectGrades = grades.filter((g) => g.subject?.trim() === subject)
    const subjectAtt = attendance.filter((a) => a.subject?.trim() === subject)

    // Cálculo da média de notas (ponderada se todos tiverem peso > 0, ou aritmética)
    let averageGrade = 0
    if (subjectGrades.length > 0) {
      const hasWeights = subjectGrades.some((g) => typeof g.weight === 'number' && g.weight > 0)
      if (hasWeights) {
        let totalWeighted = 0
        let totalWeight = 0
        subjectGrades.forEach((g) => {
          const w = typeof g.weight === 'number' && g.weight > 0 ? g.weight : 1
          totalWeighted += g.value * w
          totalWeight += w
        })
        averageGrade = totalWeight > 0 ? totalWeighted / totalWeight : 0
      } else {
        const sum = subjectGrades.reduce((acc, g) => acc + g.value, 0)
        averageGrade = sum / subjectGrades.length
      }
    }

    // Arredondar para 1 casa decimal
    averageGrade = Math.round(averageGrade * 10) / 10

    // Frequência
    const totalClasses = subjectAtt.length
    const presentsCount = subjectAtt.filter((a) => a.status === 'presente').length
    const justifiedAbsencesCount = subjectAtt.filter((a) => a.status === 'falta_justificada').length
    const absencesCount = subjectAtt.filter((a) => a.status === 'falta').length

    // Presença percentual (presenças + faltas justificadas abonadas consideram presença institucional)
    let attendancePercent = 100
    if (totalClasses > 0) {
      const effectivePresences = presentsCount + justifiedAbsencesCount
      attendancePercent = Math.round((effectivePresences / totalClasses) * 1000) / 10
    }

    // Status acadêmico
    let status: SubjectAcademicSummary['status'] = 'em_curso'
    if (subjectGrades.length >= 2 || totalClasses >= 4) {
      const gradeOk = averageGrade >= ACADEMIC_RULES.MIN_PASSING_GRADE
      const freqOk = attendancePercent >= ACADEMIC_RULES.MIN_PASSING_ATTENDANCE_PERCENT

      if (gradeOk && freqOk) {
        status = 'aprovado'
      } else if (!gradeOk && !freqOk) {
        status = 'reprovado_ambos'
      } else if (!gradeOk) {
        status = 'reprovado_nota'
      } else {
        status = 'reprovado_frequencia'
      }
    }

    const term = subjectGrades[0]?.term || subjectAtt[0]?.term || 'Atual'

    summaries.push({
      subject,
      term,
      grades: subjectGrades,
      attendance: subjectAtt,
      averageGrade,
      totalClasses,
      presentsCount,
      absencesCount,
      justifiedAbsencesCount,
      attendancePercent,
      status,
    })
  })

  // Ordena por disciplina
  return summaries.sort((a, b) => a.subject.localeCompare(b.subject))
}

/**
 * Calcula o resumo de frequência por turma para um aluno
 */
export interface ClassAttendanceBreakdownItem {
  classId: string
  className: string
  courseName: string
  term: string
  professorName: string
  totalClasses: number
  presents: number
  absents: number
  justified: number
  percent: number
}

/**
 * Calcula o resumo detalhado de presenças/faltas e percentual por turma para exibição
 * nos cards de ficha do aluno e Portal do Aluno.
 */
export function calculateClassAttendanceBreakdown(
  studentId: string,
  classes: ClassItem[],
  attendance: AttendanceRecord[],
  studentCpf?: string,
): ClassAttendanceBreakdownItem[] {
  const summaries = calculateClassAttendanceSummaries(studentId, classes, attendance, studentCpf)
  return summaries.map((s) => ({
    classId: s.classId,
    className: s.className,
    courseName: s.courseName,
    term: s.term,
    professorName: s.professorName,
    totalClasses: s.totalClasses,
    presents: s.presentsCount,
    absents: s.absencesCount,
    justified: s.justifiedAbsencesCount,
    percent: s.attendancePercent,
  }))
}

export function calculateClassAttendanceSummaries(
  studentId: string,
  classes: ClassItem[],
  attendance: AttendanceRecord[],
  studentCpf?: string,
): ClassAttendanceSummary[] {
  const cleanCpf = studentCpf ? studentCpf.replace(/\D/g, '') : ''

  // Turmas em que o aluno está matriculado ou possui presença vinculada por classId
  const relevantClasses = classes.filter(
    (c) =>
      (Array.isArray(c.studentIds) && c.studentIds.includes(studentId)) ||
      attendance.some(
        (a) =>
          a.classId === c.id &&
          (a.studentId === studentId ||
            (cleanCpf && a.studentCpf && a.studentCpf.replace(/\D/g, '') === cleanCpf)),
      ),
  )

  return relevantClasses.map((cls) => {
    const classAtt = attendance.filter(
      (a) =>
        a.classId === cls.id &&
        (a.studentId === studentId ||
          (cleanCpf && a.studentCpf && a.studentCpf.replace(/\D/g, '') === cleanCpf)),
    )

    const totalClasses = classAtt.length
    const presentsCount = classAtt.filter((a) => a.status === 'presente').length
    const justifiedAbsencesCount = classAtt.filter((a) => a.status === 'falta_justificada').length
    const absencesCount = classAtt.filter((a) => a.status === 'falta').length

    let attendancePercent = 100
    if (totalClasses > 0) {
      const effectivePresences = presentsCount + justifiedAbsencesCount
      attendancePercent = Math.round((effectivePresences / totalClasses) * 1000) / 10
    }

    return {
      classId: cls.id,
      className: cls.name,
      courseName: cls.courseName,
      term: cls.term,
      professorName: cls.professorName,
      totalClasses,
      presentsCount,
      absencesCount,
      justifiedAbsencesCount,
      attendancePercent,
      attendanceRecords: classAtt.sort((a, b) => b.date.localeCompare(a.date)),
    }
  })
}

/**
 * Retorna classe e rótulo do status acadêmico
 */
export function getAcademicStatusBadge(status: SubjectAcademicSummary['status']) {
  switch (status) {
    case 'aprovado':
      return {
        label: 'Aprovado',
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      }
    case 'reprovado_nota':
      return {
        label: 'Reprovado por Nota',
        color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      }
    case 'reprovado_frequencia':
      return {
        label: 'Reprovado por Falta',
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      }
    case 'reprovado_ambos':
      return {
        label: 'Reprovado (Nota e Falta)',
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      }
    case 'em_curso':
    default:
      return { label: 'Em Curso', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' }
  }
}

/**
 * Retorna badge visual para percentual de frequência
 * Verde >= 75%, Amarelo 50-74%, Vermelho < 50%
 */
export function getAttendanceBadge(percent: number) {
  if (percent >= 75) {
    return {
      label: `${percent}%`,
      status: 'adequado',
      bgClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
      barColor: 'bg-emerald-500',
    }
  }
  if (percent >= 50) {
    return {
      label: `${percent}%`,
      status: 'atencao',
      bgClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
      barColor: 'bg-amber-500',
    }
  }
  return {
    label: `${percent}%`,
    status: 'critico',
    bgClass: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
    barColor: 'bg-rose-500',
  }
}
