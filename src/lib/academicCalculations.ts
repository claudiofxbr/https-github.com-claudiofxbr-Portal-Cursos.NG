import {
  Grade,
  AttendanceRecord,
  SubjectAcademicSummary,
  ACADEMIC_RULES,
  EadCourse,
  EadLesson,
  LessonProgress,
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
  const studentAtt = attendance.filter(
    (a) =>
      a.studentId === studentId ||
      (cleanCpf && a.studentCpf && a.studentCpf.replace(/\D/g, '') === cleanCpf),
  )

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
