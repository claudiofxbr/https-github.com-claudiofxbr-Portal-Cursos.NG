import React, { useState } from 'react'
import { Student, Grade, AttendanceRecord, UserAccount, ACADEMIC_RULES } from '@/types/portal'
import {
  calculateAcademicSummary,
  getAcademicStatusBadge,
  getAttendanceBadge,
} from '@/lib/academicCalculations'
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Award,
  Sparkles,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface StudentGradesAndAttendanceTabProps {
  student: Student
  grades: Grade[]
  attendance: AttendanceRecord[]
  currentUser: UserAccount | null
  onAddGrade: (grade: Omit<Grade, 'id' | 'created' | 'updated'>) => Promise<Grade>
  onUpdateGrade: (id: string, updates: Partial<Grade>) => Promise<Grade | null>
  onDeleteGrade: (id: string) => Promise<boolean>
  onAddAttendance: (
    att: Omit<AttendanceRecord, 'id' | 'created' | 'updated'>,
  ) => Promise<AttendanceRecord>
  onUpdateAttendance: (
    id: string,
    updates: Partial<AttendanceRecord>,
  ) => Promise<AttendanceRecord | null>
  onDeleteAttendance: (id: string) => Promise<boolean>
  readOnly?: boolean
}

export const StudentGradesAndAttendanceTab: React.FC<StudentGradesAndAttendanceTabProps> = ({
  student,
  grades,
  attendance,
  currentUser,
  onAddGrade,
  onUpdateGrade,
  onDeleteGrade,
  onAddAttendance,
  onUpdateAttendance,
  onDeleteAttendance,
  readOnly = false,
}) => {
  const { toast } = useToast()

  // Permissões:
  // - Lançamento: professor, coordenador, root, admin, secretaria, matricula
  // - Edição e Exclusão: root, admin, secretaria, matricula
  // - Demais perfis (aluno, financeiro, academico): somente leitura
  const userRole = currentUser?.role || 'aluno'
  const canRegister =
    !readOnly &&
    ['professor', 'coordenador', 'root', 'admin', 'secretaria', 'matricula'].includes(userRole)
  const canEdit = !readOnly && ['root', 'admin', 'secretaria', 'matricula'].includes(userRole)
  const canDelete = !readOnly && ['root', 'admin', 'secretaria', 'matricula'].includes(userRole)

  // Filtra notas e frequência do aluno corrente
  const studentGrades = grades.filter(
    (g) =>
      g.studentId === student.id ||
      (student.cpf && g.studentCpf === student.cpf) ||
      (g.studentName && g.studentName.toLowerCase() === student.fullName.toLowerCase()),
  )

  const studentAtt = attendance.filter(
    (a) =>
      a.studentId === student.id ||
      (student.cpf && a.studentCpf === student.cpf) ||
      (a.studentName && a.studentName.toLowerCase() === student.fullName.toLowerCase()),
  )

  // Resumo consolidado por disciplina
  const summaries = calculateAcademicSummary(studentGrades, studentAtt)

  // Modais de Lançamento / Edição de Nota
  const [gradeModalOpen, setGradeModalOpen] = useState(false)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null)
  const [gradeSubject, setGradeSubject] = useState('')
  const [gradeTerm, setGradeTerm] = useState('2024.2')
  const [gradeAssessment, setGradeAssessment] = useState('P1')
  const [gradeWeight, setGradeWeight] = useState('1')
  const [gradeValue, setGradeValue] = useState('')
  const [gradeDate, setGradeDate] = useState(new Date().toISOString().split('T')[0])
  const [gradeObs, setGradeObs] = useState('')
  const [savingGrade, setSavingGrade] = useState(false)

  // Modais de Lançamento / Edição de Frequência
  const [attModalOpen, setAttModalOpen] = useState(false)
  const [editingAtt, setEditingAtt] = useState<AttendanceRecord | null>(null)
  const [attSubject, setAttSubject] = useState('')
  const [attTerm, setAttTerm] = useState('2024.2')
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0])
  const [attStatus, setAttStatus] = useState<AttendanceRecord['status']>('presente')
  const [attHours, setAttHours] = useState('2')
  const [attJustification, setAttJustification] = useState('')
  const [savingAtt, setSavingAtt] = useState(false)

  // Disciplinas sugeridas com base no curso do aluno ou existentes
  const suggestedSubjects = React.useMemo(() => {
    const list = new Set<string>()
    if (student.courseName) {
      if (
        student.courseName.toLowerCase().includes('software') ||
        student.courseName.toLowerCase().includes('computa')
      ) {
        list.add('Arquitetura de Software e Microsserviços')
        list.add('Engenharia de Requisitos e Métodos Ágeis')
        list.add('Bancos de Dados NoSQL e Big Data')
        list.add('Desenvolvimento Web Fullstack')
      } else if (student.courseName.toLowerCase().includes('direito')) {
        list.add('Direito Constitucional Aplicado')
        list.add('Direito Civil e Teoria dos Contratos')
        list.add('Direito Penal e Criminologia')
      } else if (
        student.courseName.toLowerCase().includes('administra') ||
        student.courseName.toLowerCase().includes('gestão')
      ) {
        list.add('Planejamento Estratégico e Inovação')
        list.add('Gestão Financeira e Controladoria')
        list.add('Comportamento Organizacional e Liderança')
      } else {
        list.add('Módulo 01 - Fundamentos e Nivelamento')
        list.add('Módulo 02 - Práticas Profissionais')
      }
    }
    studentGrades.forEach((g) => g.subject && list.add(g.subject))
    studentAtt.forEach((a) => a.subject && list.add(a.subject))
    return Array.from(list)
  }, [student.courseName, studentGrades, studentAtt])

  // Abertura do formulário de Nota
  const handleOpenNewGrade = (prefillSubject?: string) => {
    setEditingGrade(null)
    setGradeSubject(prefillSubject || suggestedSubjects[0] || 'Disciplina Geral')
    setGradeTerm('2024.2')
    setGradeAssessment('P1')
    setGradeWeight('1')
    setGradeValue('')
    setGradeDate(new Date().toISOString().split('T')[0])
    setGradeObs('')
    setGradeModalOpen(true)
  }

  const handleOpenEditGrade = (grade: Grade) => {
    setEditingGrade(grade)
    setGradeSubject(grade.subject)
    setGradeTerm(grade.term || '2024.2')
    setGradeAssessment(grade.assessmentType || 'P1')
    setGradeWeight(String(grade.weight ?? 1))
    setGradeValue(String(grade.value))
    setGradeDate(grade.date || new Date().toISOString().split('T')[0])
    setGradeObs(grade.observations || '')
    setGradeModalOpen(true)
  }

  // Abertura do formulário de Frequência
  const handleOpenNewAtt = (prefillSubject?: string) => {
    setEditingAtt(null)
    setAttSubject(prefillSubject || suggestedSubjects[0] || 'Disciplina Geral')
    setAttTerm('2024.2')
    setAttDate(new Date().toISOString().split('T')[0])
    setAttStatus('presente')
    setAttHours('2')
    setAttJustification('')
    setAttModalOpen(true)
  }

  const handleOpenEditAtt = (att: AttendanceRecord) => {
    setEditingAtt(att)
    setAttSubject(att.subject)
    setAttTerm(att.term || '2024.2')
    setAttDate(att.date)
    setAttStatus(att.status)
    setAttHours(String(att.hours || 2))
    setAttJustification(att.justification || '')
    setAttModalOpen(true)
  }

  // Salvar Nota
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    const numVal = parseFloat(gradeValue.replace(',', '.'))
    if (isNaN(numVal) || numVal < 0 || numVal > 10) {
      toast({
        title: 'Nota inválida',
        description: 'A nota deve ser um valor numérico entre 0.0 e 10.0.',
        variant: 'destructive',
      })
      return
    }
    if (!gradeSubject.trim()) {
      toast({
        title: 'Disciplina obrigatória',
        description: 'Informe o nome da disciplina para associar a nota.',
        variant: 'destructive',
      })
      return
    }

    setSavingGrade(true)
    try {
      const weightVal = parseFloat(gradeWeight) || 1
      const teacherName = currentUser?.name || 'Docente Responsável'

      if (editingGrade) {
        await onUpdateGrade(editingGrade.id, {
          subject: gradeSubject.trim(),
          term: gradeTerm.trim(),
          assessmentType: gradeAssessment,
          weight: weightVal,
          value: Math.round(numVal * 10) / 10,
          date: gradeDate,
          teacherName,
          observations: gradeObs.trim(),
        })
        toast({
          title: 'Nota atualizada',
          description: `Avaliação ${gradeAssessment} de ${gradeSubject} atualizada para ${numVal.toFixed(1)}.`,
        })
      } else {
        await onAddGrade({
          studentId: student.id,
          studentName: student.fullName,
          studentCpf: student.cpf,
          courseId: student.courseId,
          subject: gradeSubject.trim(),
          term: gradeTerm.trim(),
          assessmentType: gradeAssessment,
          weight: weightVal,
          value: Math.round(numVal * 10) / 10,
          date: gradeDate,
          teacherId: currentUser?.id,
          teacherName,
          observations: gradeObs.trim(),
        })
        toast({
          title: 'Nota registrada com sucesso',
          description: `Nota ${numVal.toFixed(1)} gravada em ${gradeSubject} para ${student.fullName}.`,
        })
      }
      setGradeModalOpen(false)
    } catch {
      toast({
        title: 'Erro ao salvar nota',
        description: 'Não foi possível salvar o registro no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSavingGrade(false)
    }
  }

  // Excluir Nota
  const handleDeleteGrade = async (grade: Grade) => {
    if (
      !window.confirm(
        `Confirma a exclusão da nota ${grade.value} (${grade.assessmentType}) de ${grade.subject}?`,
      )
    ) {
      return
    }
    try {
      await onDeleteGrade(grade.id)
      toast({
        title: 'Nota excluída',
        description: 'O lançamento foi removido com sucesso.',
      })
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o lançamento.',
        variant: 'destructive',
      })
    }
  }

  // Salvar Frequência
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attSubject.trim()) {
      toast({
        title: 'Disciplina obrigatória',
        description: 'Informe o nome da disciplina para lançar a frequência.',
        variant: 'destructive',
      })
      return
    }

    setSavingAtt(true)
    try {
      const hoursNum = parseFloat(attHours) || 2
      const teacherName = currentUser?.name || 'Docente Responsável'

      if (editingAtt) {
        await onUpdateAttendance(editingAtt.id, {
          subject: attSubject.trim(),
          term: attTerm.trim(),
          date: attDate,
          status: attStatus,
          hours: hoursNum,
          teacherName,
          justification: attStatus === 'falta_justificada' ? attJustification.trim() : undefined,
        })
        toast({
          title: 'Frequência atualizada',
          description: `Registro do dia ${attDate} atualizado.`,
        })
      } else {
        await onAddAttendance({
          studentId: student.id,
          studentName: student.fullName,
          studentCpf: student.cpf,
          courseId: student.courseId,
          subject: attSubject.trim(),
          term: attTerm.trim(),
          date: attDate,
          status: attStatus,
          hours: hoursNum,
          teacherId: currentUser?.id,
          teacherName,
          justification: attStatus === 'falta_justificada' ? attJustification.trim() : undefined,
        })
        toast({
          title: 'Frequência lançada',
          description: `Presença/falta registrada no diário de ${attSubject}.`,
        })
      }
      setAttModalOpen(false)
    } catch {
      toast({
        title: 'Erro ao registrar frequência',
        description: 'Não foi possível salvar no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSavingAtt(false)
    }
  }

  // Excluir Frequência
  const handleDeleteAttendance = async (att: AttendanceRecord) => {
    if (!window.confirm(`Confirma a exclusão da chamada do dia ${att.date} (${att.status})?`)) {
      return
    }
    try {
      await onDeleteAttendance(att.id)
      toast({
        title: 'Chamada excluída',
        description: 'O lançamento de presença foi removido.',
      })
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o registro de frequência.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-5 pt-2 text-xs">
      {/* Top Banner de Resumo e Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Diário de Notas e Frequência
            </span>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
              Regras MEC: Mín. {ACADEMIC_RULES.MIN_PASSING_GRADE.toFixed(1)} /{' '}
              {ACADEMIC_RULES.MIN_PASSING_ATTENDANCE_PERCENT}% pres.
            </Badge>
          </div>
          <p className="text-slate-400 text-[11px]">
            {summaries.length === 0
              ? 'Nenhuma avaliação ou chamada registrada até o momento.'
              : `${summaries.length} disciplina(s) em acompanhamento • ${studentGrades.length} nota(s) • ${studentAtt.length} registro(s) de chamada`}
          </p>
        </div>

        {canRegister && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={() => handleOpenNewGrade()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 flex-1 sm:flex-none shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Lançar Nota
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenNewAtt()}
              className="border-slate-700 hover:bg-slate-800 text-slate-200 text-xs gap-1.5 flex-1 sm:flex-none"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Registrar Frequência
            </Button>
          </div>
        )}
      </div>

      {/* Visão Consolidada por Disciplina */}
      {summaries.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-950/30 rounded-xl border border-dashed border-slate-800 space-y-3">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-slate-300 font-medium">Nenhum registro acadêmico localizado</p>
            <p className="text-slate-500 text-[11px] max-w-md mx-auto">
              Utilize os botões acima para lançar a primeira nota ou registro de presença de{' '}
              <span className="text-slate-300 font-semibold">{student.fullName}</span>.
            </p>
          </div>
          {canRegister && (
            <Button
              size="sm"
              onClick={() => handleOpenNewGrade()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Lançar Primeira Nota
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary) => {
            const statusBadge = getAcademicStatusBadge(summary.status)
            const attendanceBadge = getAttendanceBadge(summary.attendancePercent)

            return (
              <div
                key={summary.subject}
                className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-4 hover:border-slate-700 transition-colors"
              >
                {/* Cabeçalho da Disciplina */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-bold text-sm tracking-tight">
                        {summary.subject}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${statusBadge.color}`}
                      >
                        {statusBadge.label}
                      </Badge>
                      {summary.term && (
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Semestre {summary.term}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indicadores Rápidos (Média & Presença) */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Bloco Média */}
                    <div className="bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Média:</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          summary.grades.length === 0
                            ? 'text-slate-500'
                            : summary.averageGrade >= ACADEMIC_RULES.MIN_PASSING_GRADE
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                        }`}
                      >
                        {summary.grades.length === 0 ? '—' : summary.averageGrade.toFixed(1)}
                      </span>
                    </div>

                    {/* Bloco Frequência */}
                    <div
                      className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 ${attendanceBadge.bgClass}`}
                    >
                      <span className="text-[11px] opacity-80">Presença:</span>
                      <span className="font-mono font-bold text-sm">
                        {summary.totalClasses === 0 ? '100%' : `${summary.attendancePercent}%`}
                      </span>
                    </div>

                    {canRegister && (
                      <div className="flex items-center gap-1 ml-auto sm:ml-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenNewGrade(summary.subject)}
                          className="h-7 px-2 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-950/40"
                          title="Adicionar nota nesta disciplina"
                        >
                          + Nota
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenNewAtt(summary.subject)}
                          className="h-7 px-2 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                          title="Lançar chamada nesta disciplina"
                        >
                          + Chamada
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-grid: Notas da Disciplina + Chamadas/Frequência */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Coluna 1: Notas Lançadas */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Avaliações Lançadas ({summary.grades.length})</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        Mínimo aprovação: {ACADEMIC_RULES.MIN_PASSING_GRADE.toFixed(1)}
                      </span>
                    </div>

                    {summary.grades.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 bg-slate-900/40 rounded-lg border border-slate-800/60">
                        Nenhuma nota lançada para esta disciplina.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {summary.grades.map((grd) => {
                          const isApproved = grd.value >= ACADEMIC_RULES.MIN_PASSING_GRADE
                          return (
                            <div
                              key={grd.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-white">
                                    {grd.assessmentType || 'Avaliação'}
                                  </span>
                                  {grd.weight && grd.weight > 1 && (
                                    <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded">
                                      peso {grd.weight}
                                    </span>
                                  )}
                                  {grd.date && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                      • <Calendar className="w-2.5 h-2.5" />
                                      {grd.date}
                                    </span>
                                  )}
                                </div>
                                {grd.observations && (
                                  <p className="text-[11px] text-slate-400 italic line-clamp-1">
                                    "{grd.observations}"
                                  </p>
                                )}
                                {grd.teacherName && (
                                  <p className="text-[10px] text-slate-500">
                                    Lançado por: {grd.teacherName}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span
                                    className={`font-mono font-bold text-sm ${
                                      isApproved ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {grd.value.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block">/ 10.0</span>
                                </div>

                                {(canEdit || canDelete) && (
                                  <div className="flex items-center">
                                    {canEdit && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-slate-400 hover:text-white"
                                        onClick={() => handleOpenEditGrade(grd)}
                                        title="Editar nota"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {canDelete && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-slate-400 hover:text-rose-400"
                                        onClick={() => handleDeleteGrade(grd)}
                                        title="Excluir nota"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Coluna 2: Frequência e Histórico de Chamadas */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Diário de Presença ({summary.attendance.length} aulas)</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        Presenças: {summary.presentsCount} | Faltas: {summary.absencesCount}
                        {summary.justifiedAbsencesCount > 0
                          ? ` (+${summary.justifiedAbsencesCount} just.)`
                          : ''}
                      </span>
                    </div>

                    {summary.attendance.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 bg-slate-900/40 rounded-lg border border-slate-800/60">
                        Nenhum registro de chamada lançado para esta disciplina.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {summary.attendance.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {att.status === 'presente' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : att.status === 'falta_justificada' ? (
                                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 font-medium text-slate-200">
                                  <span>{att.date}</span>
                                  <span className="text-[10px] text-slate-400">
                                    ({att.hours || 2}h/a)
                                  </span>
                                </div>
                                {att.justification && (
                                  <p className="text-[10px] text-amber-300/80 italic line-clamp-1">
                                    Justificativa: {att.justification}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  att.status === 'presente'
                                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                                    : att.status === 'falta_justificada'
                                      ? 'border-amber-500/30 text-amber-300 bg-amber-950/20'
                                      : 'border-rose-500/30 text-rose-400 bg-rose-950/20'
                                }`}
                              >
                                {att.status === 'presente'
                                  ? 'Presente'
                                  : att.status === 'falta_justificada'
                                    ? 'Falta Just.'
                                    : 'Falta'}
                              </Badge>

                              {(canEdit || canDelete) && (
                                <div className="flex items-center">
                                  {canEdit && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-slate-400 hover:text-white"
                                      onClick={() => handleOpenEditAtt(att)}
                                      title="Editar frequência"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-slate-400 hover:text-rose-400"
                                      onClick={() => handleDeleteAttendance(att)}
                                      title="Excluir frequência"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL: LANÇAR / EDITAR NOTA
         ========================================================================= */}
      <Dialog open={gradeModalOpen} onOpenChange={setGradeModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              {editingGrade ? 'Editar Nota do Aluno' : 'Lançar Nota de Avaliação'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Aluno: <strong className="text-white">{student.fullName}</strong> ({student.cpf})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGrade} className="space-y-3.5 py-1 text-xs">
            {/* Disciplina */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Disciplina / Componente Curricular *</Label>
              <div className="flex gap-2">
                <Input
                  value={gradeSubject}
                  onChange={(e) => setGradeSubject(e.target.value)}
                  placeholder="Ex: Arquitetura de Software"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                  required
                />
              </div>
              {suggestedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[10px] text-slate-500">Sugestões:</span>
                  {suggestedSubjects.slice(0, 3).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setGradeSubject(s)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Linha: Avaliação e Semestre */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Tipo de Avaliação</Label>
                <Select value={gradeAssessment} onValueChange={setGradeAssessment}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                    <SelectItem value="P1">P1 - Prova 1</SelectItem>
                    <SelectItem value="P2">P2 - Prova 2</SelectItem>
                    <SelectItem value="P3">P3 - Prova Substitutiva</SelectItem>
                    <SelectItem value="Trabalho">Trabalho Prático</SelectItem>
                    <SelectItem value="Projeto">Projeto Integrador</SelectItem>
                    <SelectItem value="Seminário">Seminário / Apresentação</SelectItem>
                    <SelectItem value="Exame Final">Exame Final</SelectItem>
                    <SelectItem value="Outro">Outra Avaliação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Semestre / Termo</Label>
                <Input
                  value={gradeTerm}
                  onChange={(e) => setGradeTerm(e.target.value)}
                  placeholder="Ex: 2024.2"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            {/* Linha: Nota e Peso */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Nota Obtida (0.0 a 10.0) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  placeholder="Ex: 8.5"
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono text-base font-bold"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Data da Avaliação</Label>
                <Input
                  type="date"
                  value={gradeDate}
                  onChange={(e) => setGradeDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Observações do Docente (Opcional)</Label>
              <Textarea
                rows={2}
                value={gradeObs}
                onChange={(e) => setGradeObs(e.target.value)}
                placeholder="Ex: Bom domínio na parte teórica, revisar padrões de mensageria."
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGradeModalOpen(false)}
                className="border-slate-800 text-xs text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingGrade}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                {savingGrade ? 'Gravando...' : editingGrade ? 'Salvar Alteração' : 'Gravar Nota'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: LANÇAR / EDITAR FREQUÊNCIA
         ========================================================================= */}
      <Dialog open={attModalOpen} onOpenChange={setAttModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              {editingAtt ? 'Editar Registro de Frequência' : 'Lançar Presença / Falta no Diário'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Aluno: <strong className="text-white">{student.fullName}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAttendance} className="space-y-3.5 py-1 text-xs">
            {/* Disciplina */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Disciplina *</Label>
              <Input
                value={attSubject}
                onChange={(e) => setAttSubject(e.target.value)}
                placeholder="Ex: Arquitetura de Software"
                className="bg-slate-950 border-slate-800 text-xs text-white"
                required
              />
            </div>

            {/* Linha: Data e Carga Horária */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Data da Aula *</Label>
                <Input
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Horas-Aula</Label>
                <Input
                  type="number"
                  min="1"
                  max="8"
                  value={attHours}
                  onChange={(e) => setAttHours(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            {/* Situação */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Status de Presença *</Label>
              <Select
                value={attStatus}
                onValueChange={(val) => setAttStatus(val as AttendanceRecord['status'])}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                  <SelectItem value="presente">Presente (Compareceu)</SelectItem>
                  <SelectItem value="falta">Falta (Ausente sem justificativa)</SelectItem>
                  <SelectItem value="falta_justificada">
                    Falta Justificada (Atestado / Abono)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Justificativa (se falta_justificada) */}
            {attStatus === 'falta_justificada' && (
              <div className="space-y-1">
                <Label className="text-xs text-amber-300">Motivo / Número do Atestado</Label>
                <Input
                  value={attJustification}
                  onChange={(e) => setAttJustification(e.target.value)}
                  placeholder="Ex: Atestado médico protocolado na secretaria sob nº 1042"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAttModalOpen(false)}
                className="border-slate-800 text-xs text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingAtt}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                {savingAtt ? 'Gravando...' : editingAtt ? 'Salvar Alteração' : 'Registrar Chamada'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
