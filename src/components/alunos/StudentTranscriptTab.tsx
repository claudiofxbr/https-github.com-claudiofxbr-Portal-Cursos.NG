import { useState, useMemo } from 'react'
import {
  Student,
  Course,
  Grade,
  AttendanceRecord,
  Certificate,
  EadCourse,
  EadLesson,
  LessonProgress,
} from '@/types/portal'
import {
  calculateAcademicSummary,
  calculateConsolidatedAttendance,
  ACADEMIC_RULES,
} from '@/lib/academicCalculations'
import { generateTranscriptPdf } from '@/lib/transcriptPdfExport'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  FileText,
  Download,
  GraduationCap,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  BookOpen,
  Calendar,
  Layers,
} from 'lucide-react'

interface StudentTranscriptTabProps {
  student: Student
  course?: Course | null
  grades: Grade[]
  attendance: AttendanceRecord[]
  certificates: Certificate[]
  eadCourses: EadCourse[]
  eadLessons: EadLesson[]
  lessonProgress: LessonProgress[]
  canManage: boolean // root, admin, secretaria, coordenador podem editar observações
  canExport: boolean
  onUpdateNotes: (studentId: string, notes: string) => Promise<boolean>
}

export function StudentTranscriptTab({
  student,
  course,
  grades,
  attendance,
  certificates,
  eadCourses,
  eadLessons,
  lessonProgress,
  canManage,
  canExport,
  onUpdateNotes,
}: StudentTranscriptTabProps) {
  const [notes, setNotes] = useState(student.transcriptNotes || '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Atualiza campo local caso o student mude
  useMemo(() => {
    setNotes(student.transcriptNotes || '')
  }, [student.id, student.transcriptNotes])

  // Disciplinas e notas do aluno
  const studentGrades = useMemo(() => {
    const cleanCpf = student.cpfRaw || student.cpf.replace(/\D/g, '')
    return grades.filter(
      (g) =>
        g.studentId === student.id ||
        (g.studentCpf && g.studentCpf.replace(/\D/g, '') === cleanCpf),
    )
  }, [student, grades])

  const studentAttendance = useMemo(() => {
    const cleanCpf = student.cpfRaw || student.cpf.replace(/\D/g, '')
    return attendance.filter(
      (a) =>
        a.studentId === student.id ||
        (a.studentCpf && a.studentCpf.replace(/\D/g, '') === cleanCpf),
    )
  }, [student, attendance])

  // Resumo por disciplina
  const summaries = useMemo(() => {
    return calculateAcademicSummary(studentGrades, studentAttendance)
  }, [studentGrades, studentAttendance])

  // Média Geral
  const overallAverage = useMemo(() => {
    if (studentGrades.length > 0) {
      const sum = studentGrades.reduce((acc, g) => acc + g.value, 0)
      return Math.round((sum / studentGrades.length) * 10) / 10
    }
    if (summaries.length > 0) {
      const sum = summaries.reduce((acc, s) => acc + s.averageGrade, 0)
      return Math.round((sum / summaries.length) * 10) / 10
    }
    return 0
  }, [studentGrades, summaries])

  // Frequência consolidada (Presencial + EAD)
  const consolidatedAtt = useMemo(() => {
    return calculateConsolidatedAttendance(
      student.id,
      studentAttendance,
      eadCourses,
      eadLessons,
      lessonProgress,
      student.cpf,
    )
  }, [student, studentAttendance, eadCourses, eadLessons, lessonProgress])

  // Situação MEC
  const mecStatus = useMemo(() => {
    const gradeOk = overallAverage >= ACADEMIC_RULES.MIN_PASSING_GRADE
    const freqOk =
      consolidatedAtt.consolidatedPercent >= ACADEMIC_RULES.MIN_PASSING_ATTENDANCE_PERCENT

    if (student.status === 'concluido') {
      return { label: 'Concluído (Aprovado MEC)', approved: true }
    }
    if (studentGrades.length < 2 && consolidatedAtt.totalClassesCombined < 4) {
      return { label: 'Em Curso / Cursando', approved: false }
    }
    if (gradeOk && freqOk) {
      return { label: 'Aprovado (Critérios MEC)', approved: true }
    }
    return { label: 'Reprovado (Critérios MEC)', approved: false }
  }, [overallAverage, consolidatedAtt, student.status, studentGrades.length])

  // Certificados e diplomas emitidos
  const studentCertificates = useMemo(() => {
    const cleanCpf = student.cpfRaw || student.cpf.replace(/\D/g, '')
    return certificates.filter((c) => {
      if (c.status !== 'ativo') return false
      const isDiploma = c.docType === 'diploma' || c.verificationCode.startsWith('DIPL-')
      if (isDiploma) return false
      if (c.studentId === student.id) return true
      if (cleanCpf && c.studentCpf && c.studentCpf.replace(/\D/g, '') === cleanCpf) return true
      return c.studentName.toLowerCase() === student.fullName.toLowerCase()
    })
  }, [student, certificates])

  const studentDiplomas = useMemo(() => {
    const cleanCpf = student.cpfRaw || student.cpf.replace(/\D/g, '')
    return certificates.filter((c) => {
      if (c.status !== 'ativo') return false
      const isDiploma = c.docType === 'diploma' || c.verificationCode.startsWith('DIPL-')
      if (!isDiploma) return false
      if (c.studentId === student.id) return true
      if (cleanCpf && c.studentCpf && c.studentCpf.replace(/\D/g, '') === cleanCpf) return true
      return c.studentName.toLowerCase() === student.fullName.toLowerCase()
    })
  }, [student, certificates])

  // Salvar observações no banco
  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    setSaveSuccess(false)
    try {
      const ok = await onUpdateNotes(student.id, notes)
      if (ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Baixar PDF
  const handleDownloadPdf = () => {
    generateTranscriptPdf({
      student,
      course,
      summaries,
      overallAverage,
      consolidatedAtt,
      mecStatus,
      certificates: studentCertificates,
      diplomas: studentDiplomas,
      observations: notes,
      generatedBy: 'Secretaria Acadêmica Central',
    })
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Barra de Ações Superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Histórico Escolar Oficial (Transcript)
            </h4>
            <p className="text-[11px] text-slate-400">
              Consolidação curricular completa conforme as diretrizes do MEC e CNE/CES.
            </p>
          </div>
        </div>

        {canExport && (
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Histórico Escolar (PDF A4)
          </Button>
        )}
      </div>

      {/* Cartões de Indicadores MEC */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Média Geral
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl font-bold font-mono ${
                overallAverage >= ACADEMIC_RULES.MIN_PASSING_GRADE
                  ? 'text-emerald-400'
                  : overallAverage > 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
              }`}
            >
              {overallAverage.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500">/ 10,0</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Mínimo: 6,0</span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Freq. Consolidada
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl font-bold font-mono ${
                consolidatedAtt.consolidatedPercent >= ACADEMIC_RULES.MIN_PASSING_ATTENDANCE_PERCENT
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {consolidatedAtt.consolidatedPercent.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Presencial {consolidatedAtt.presencialPercent.toFixed(0)}% • EAD{' '}
            {consolidatedAtt.eadPercent.toFixed(0)}%
          </span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Carga Horária
          </span>
          <div className="text-xl font-bold text-white font-mono mt-1">
            {course?.workloadHours || 3600}h
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {course?.durationSemesters || 8} semestres •{' '}
            {course?.modality?.toUpperCase() || 'PRESENCIAL'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Situação MEC
          </span>
          <div className="mt-1">
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                mecStatus.approved
                  ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40'
                  : overallAverage === 0
                    ? 'border-blue-500/40 text-blue-300 bg-blue-950/40'
                    : 'border-rose-500/40 text-rose-300 bg-rose-950/40'
              }`}
            >
              {mecStatus.label}
            </Badge>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">
            Status da matrícula: <strong className="text-slate-300">{student.status}</strong>
          </span>
        </div>
      </div>

      {/* Resumo do Curso */}
      <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Curso:</strong> {course?.name || student.courseName}
            {course?.code ? ` (${course.code})` : ''} • Nível:{' '}
            <span className="text-white capitalize">{course?.level || student.type}</span>
          </span>
        </div>
        {course?.coordinator && (
          <span className="text-[11px] text-slate-400">
            Coordenação: <strong className="text-slate-200">{course.coordinator}</strong>
          </span>
        )}
      </div>

      {/* Tabela de Disciplinas & Notas */}
      <div className="space-y-2">
        <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          Disciplinas Cursadas e Rendimento Acadêmico ({summaries.length})
        </h5>

        {summaries.length === 0 ? (
          <div className="p-6 rounded-lg border border-slate-800 bg-slate-950/40 text-center text-slate-400 text-xs">
            Nenhuma nota ou frequência lançada para este aluno ainda. Utilize a aba "Notas & Freq."
            para registrar avaliações.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Disciplina</th>
                  <th className="py-2 px-2">Período</th>
                  <th className="py-2 px-3">Avaliações</th>
                  <th className="py-2 px-2 text-center">Média</th>
                  <th className="py-2 px-2 text-center">Frequência</th>
                  <th className="py-2 px-3 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                {summaries.map((s) => (
                  <tr key={s.subject} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-medium text-white">{s.subject}</td>
                    <td className="py-2.5 px-2 text-slate-400 font-mono text-[11px]">
                      {s.term || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-300">
                      {s.grades.length === 0 ? (
                        <span className="text-slate-500 italic">Sem provas</span>
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {s.grades.map((g, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]"
                            >
                              {g.assessmentType}: <strong>{g.value.toFixed(1)}</strong>
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold font-mono text-white">
                      {s.averageGrade.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-300">
                      {s.totalClasses > 0 ? (
                        <span className="font-mono">
                          {s.attendancePercent}% ({s.presentsCount}/{s.totalClasses})
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          s.status === 'aprovado'
                            ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30'
                            : s.status === 'em_curso'
                              ? 'border-blue-500/40 text-blue-300 bg-blue-950/30'
                              : 'border-rose-500/40 text-rose-300 bg-rose-950/30'
                        }`}
                      >
                        {s.status === 'aprovado'
                          ? 'Aprovado'
                          : s.status === 'em_curso'
                            ? 'Em Curso'
                            : 'Reprovado'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diplomas e Certificados Emitidos */}
      <div className="space-y-2">
        <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          Títulos Oficiais Registrados ({studentDiplomas.length + studentCertificates.length})
        </h5>

        {studentDiplomas.length === 0 && studentCertificates.length === 0 ? (
          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 text-xs">
            Nenhum certificado ou diploma emitido ainda para esta matrícula.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {studentDiplomas.map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-lg border border-amber-800/40 bg-gradient-to-br from-amber-950/20 to-slate-950 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Diploma de Graduação
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/40 text-emerald-300"
                  >
                    ATIVO
                  </Badge>
                </div>
                <p className="text-slate-300">
                  Código: <strong className="font-mono text-white">{d.verificationCode}</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Emissão: {d.issueDate || d.created}
                  {d.graduationDate ? ` • Colação: ${d.graduationDate}` : ''}
                </p>
              </div>
            ))}

            {studentCertificates.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg border border-blue-800/40 bg-gradient-to-br from-blue-950/20 to-slate-950 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-400" /> Certificado de Conclusão
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/40 text-emerald-300"
                  >
                    ATIVO
                  </Badge>
                </div>
                <p className="text-slate-300">
                  Código: <strong className="font-mono text-white">{c.verificationCode}</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Emissão: {c.issueDate || c.created} • Carga Horária: {c.workloadHours}h
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observações Administrativas do Histórico Escolar */}
      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Observações Oficiais do Histórico Escolar
          </label>
          {canManage && (
            <span className="text-[10px] text-slate-400">Visível no PDF do histórico escolar</span>
          )}
        </div>

        {canManage ? (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Aluno cumpriu com êxito as atividades complementares de extensão e estágio supervisionado. Dispensado de TCC por resolução colegiada nº 12/2024..."
              rows={3}
              className="text-xs bg-slate-900 border-slate-700 text-slate-200 resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {saveSuccess ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Observações salvas com sucesso no
                    banco!
                  </span>
                ) : (
                  'Edição permitida para root, admin, secretaria e coordenação.'
                )}
              </span>
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={isSavingNotes || notes === (student.transcriptNotes || '')}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                {isSavingNotes ? 'Salvando...' : 'Salvar Observações'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 italic">
            {notes || 'Nenhuma observação complementar registrada pela secretaria/coordenação.'}
          </div>
        )}
      </div>
    </div>
  )
}
