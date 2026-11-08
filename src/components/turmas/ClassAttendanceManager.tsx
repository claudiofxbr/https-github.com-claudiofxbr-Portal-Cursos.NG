import React, { useState, useMemo } from 'react'
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  Clock,
  UserCheck,
  History,
  FileCheck2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ClassItem, Student, AttendanceRecord, AttendanceStatus } from '@/types/portal'
import { useToast } from '@/hooks/use-toast'

interface ClassAttendanceManagerProps {
  classItem: ClassItem
  enrolledStudents: Student[]
  attendanceRecords: AttendanceRecord[]
  canManage: boolean
  teacherId?: string
  teacherName?: string
  onSaveAttendance: (
    records: Omit<AttendanceRecord, 'id' | 'created' | 'updated'>[],
  ) => Promise<boolean>
}

export function ClassAttendanceManager({
  classItem,
  enrolledStudents,
  attendanceRecords,
  canManage,
  teacherId,
  teacherName,
  onSaveAttendance,
}: ClassAttendanceManagerProps) {
  const { toast } = useToast()
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [hours, setHours] = useState<number>(2)
  const [isSaving, setIsSaving] = useState(false)

  // Filtra presenças desta turma
  const classAttendances = useMemo(() => {
    return attendanceRecords.filter((a) => a.classId === classItem.id)
  }, [attendanceRecords, classItem.id])

  // Histórico de chamadas já lançadas agrupadas por data
  const dateHistory = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string
        total: number
        presents: number
        absences: number
        justified: number
        percent: number
        records: AttendanceRecord[]
      }
    >()

    classAttendances.forEach((rec) => {
      const existing = map.get(rec.date) || {
        date: rec.date,
        total: 0,
        presents: 0,
        absences: 0,
        justified: 0,
        percent: 0,
        records: [],
      }
      existing.total += 1
      if (rec.status === 'presente') existing.presents += 1
      else if (rec.status === 'falta_justificada') existing.justified += 1
      else existing.absences += 1
      existing.records.push(rec)
      map.set(rec.date, existing)
    })

    const list = Array.from(map.values()).map((item) => {
      const effective = item.presents + item.justified
      const percent = item.total > 0 ? Math.round((effective / item.total) * 100) : 0
      return { ...item, percent }
    })

    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [classAttendances])

  // Presenças da data selecionada
  const selectedDateRecords = useMemo(() => {
    return classAttendances.filter((a) => a.date === selectedDate)
  }, [classAttendances, selectedDate])

  // Estado local para cada aluno na data selecionada
  const [studentStatusMap, setStudentStatusMap] = useState<
    Record<string, { status: AttendanceStatus; justification: string }>
  >({})

  // Sincroniza o estado local quando muda a data selecionada ou registros da data
  React.useEffect(() => {
    const newMap: Record<string, { status: AttendanceStatus; justification: string }> = {}

    enrolledStudents.forEach((student) => {
      const existing = selectedDateRecords.find(
        (a) =>
          a.studentId === student.id ||
          (student.cpf &&
            a.studentCpf &&
            a.studentCpf.replace(/\D/g, '') === student.cpf.replace(/\D/g, '')),
      )

      if (existing) {
        newMap[student.id] = {
          status: existing.status,
          justification: existing.justification || '',
        }
      } else {
        // Padrão: presente
        newMap[student.id] = {
          status: 'presente',
          justification: '',
        }
      }
    })

    setStudentStatusMap(newMap)
  }, [selectedDate, selectedDateRecords, enrolledStudents])

  // Resumo da data atual no formulário
  const formSummary = useMemo(() => {
    let p = 0
    let f = 0
    let j = 0
    Object.values(studentStatusMap).forEach((item) => {
      if (item.status === 'presente') p += 1
      else if (item.status === 'falta_justificada') j += 1
      else f += 1
    })
    const total = enrolledStudents.length
    const percent = total > 0 ? Math.round(((p + j) / total) * 100) : 0
    return { presents: p, absences: f, justified: j, total, percent }
  }, [studentStatusMap, enrolledStudents.length])

  // Marcar todos como presentes
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated = { ...studentStatusMap }
    enrolledStudents.forEach((st) => {
      updated[st.id] = {
        status,
        justification: updated[st.id]?.justification || '',
      }
    })
    setStudentStatusMap(updated)
  }

  // Atualizar um aluno
  const handleUpdateStudent = (
    studentId: string,
    status: AttendanceStatus,
    justification?: string,
  ) => {
    setStudentStatusMap((prev) => ({
      ...prev,
      [studentId]: {
        status,
        justification:
          justification !== undefined ? justification : prev[studentId]?.justification || '',
      },
    }))
  }

  // Salvar chamada
  const handleSave = async () => {
    if (!selectedDate) {
      toast({
        title: 'Data obrigatória',
        description: 'Selecione uma data para registrar a chamada.',
        variant: 'destructive',
      })
      return
    }

    if (enrolledStudents.length === 0) {
      toast({
        title: 'Sem alunos matriculados',
        description: 'Matricule alunos na turma antes de lançar a chamada.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const recordsToSave: Omit<AttendanceRecord, 'id' | 'created' | 'updated'>[] =
        enrolledStudents.map((st) => {
          const item = studentStatusMap[st.id] || { status: 'presente', justification: '' }
          return {
            studentId: st.id,
            studentName: st.fullName,
            studentCpf: st.cpf,
            courseId: classItem.courseId,
            classId: classItem.id,
            subject: classItem.name,
            term: classItem.term,
            date: selectedDate,
            status: item.status,
            hours: Number(hours) || 2,
            teacherId: teacherId || classItem.professorUserId,
            teacherName: teacherName || classItem.professorName,
            justification: item.justification || '',
          }
        })

      const ok = await onSaveAttendance(recordsToSave)
      if (ok) {
        toast({
          title: 'Chamada registrada com sucesso!',
          description: `Chamada da turma "${classItem.name}" salva para a data ${selectedDate} (${recordsToSave.length} alunos).`,
        })
      } else {
        toast({
          title: 'Erro ao salvar chamada',
          description: 'Não foi possível gravar todos os registros.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Chamada */}
      <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              Lançamento de Chamada por Turma
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Turma: <strong className="text-slate-200">{classItem.name}</strong> • Período:{' '}
              {classItem.term} • Professor: {classItem.professorName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs"
            >
              {enrolledStudents.length} aluno(s) matriculado(s)
            </Badge>
            {selectedDateRecords.length > 0 && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"
              >
                Já lançada nesta data
              </Badge>
            )}
          </div>
        </div>

        {/* Controles: Data, Horas, Botões de marcação rápida */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <Label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Data da Chamada
            </Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-900 border-slate-800 text-white h-9 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Carga Horária (horas)
            </Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="bg-slate-900 border-slate-800 text-white h-9 text-xs"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col justify-end">
            <span className="text-xs text-slate-400 mb-1">Ações Rápidas:</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canManage || enrolledStudents.length === 0}
                onClick={() => handleMarkAll('presente')}
                className="text-xs border-emerald-600/40 text-emerald-400 hover:bg-emerald-950/40 h-9 flex-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Todos Presentes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canManage || enrolledStudents.length === 0}
                onClick={() => handleMarkAll('falta')}
                className="text-xs border-rose-600/40 text-rose-400 hover:bg-rose-950/40 h-9 flex-1"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Todos Ausentes
              </Button>
            </div>
          </div>
        </div>

        {/* Resumo da data */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Presentes: <strong className="text-emerald-400">{formSummary.presents}</strong>
            </span>
            <span className="text-slate-400">
              Faltas: <strong className="text-rose-400">{formSummary.absences}</strong>
            </span>
            <span className="text-slate-400">
              Justificadas: <strong className="text-amber-400">{formSummary.justified}</strong>
            </span>
            <span className="text-slate-400">
              Presença da aula: <strong className="text-white">{formSummary.percent}%</strong>
            </span>
          </div>

          {canManage && (
            <Button
              size="sm"
              disabled={isSaving || enrolledStudents.length === 0}
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSaving ? 'Salvando...' : 'Salvar Chamada'}
            </Button>
          )}
        </div>
      </div>

      {/* Lista de Alunos Matriculados para Chamada */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              Alunos da Turma ({enrolledStudents.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Apenas alunos matriculados nesta turma aparecem para chamada
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {enrolledStudents.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Nenhum aluno matriculado nesta turma. Matricule alunos na aba "Alunos Matriculados"
              para poder realizar a chamada.
            </div>
          ) : (
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
              {enrolledStudents.map((st) => {
                const current = studentStatusMap[st.id] || {
                  status: 'presente',
                  justification: '',
                }

                return (
                  <div
                    key={st.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-slate-700">
                        {st.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{st.fullName}</p>
                        <p className="text-xs text-slate-400">
                          CPF: {st.cpf} • ID: {st.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-md border border-slate-800 bg-slate-900 p-0.5">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => handleUpdateStudent(st.id, 'presente')}
                          className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1 font-medium ${
                            current.status === 'presente'
                              ? 'bg-emerald-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Presente
                        </button>
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => handleUpdateStudent(st.id, 'falta')}
                          className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1 font-medium ${
                            current.status === 'falta'
                              ? 'bg-rose-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Falta
                        </button>
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => handleUpdateStudent(st.id, 'falta_justificada')}
                          className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1 font-medium ${
                            current.status === 'falta_justificada'
                              ? 'bg-amber-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Justificada
                        </button>
                      </div>

                      {current.status === 'falta_justificada' && (
                        <Input
                          placeholder="Motivo da justificativa..."
                          value={current.justification}
                          disabled={!canManage}
                          onChange={(e) =>
                            handleUpdateStudent(st.id, current.status, e.target.value)
                          }
                          className="bg-slate-900 border-slate-800 text-white h-8 text-xs w-48"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Chamadas Anteriores desta Turma */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            Histórico de Chamadas Lançadas ({dateHistory.length} datas)
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Acompanhamento das datas de aula já registradas para esta turma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dateHistory.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              Nenhuma chamada registrada anteriormente para esta turma.
            </p>
          ) : (
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
              {dateHistory.map((item) => (
                <div
                  key={item.date}
                  className="p-3 flex items-center justify-between hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-slate-300 font-mono text-xs"
                    >
                      {item.date}
                    </Badge>
                    <div className="text-xs text-slate-400">
                      <span className="text-emerald-400 font-medium">
                        {item.presents} presentes
                      </span>
                      {item.justified > 0 && (
                        <span>
                          {' '}
                          • <span className="text-amber-400">{item.justified} justif.</span>
                        </span>
                      )}
                      <span>
                        {' '}
                        • <span className="text-rose-400">{item.absences} faltas</span>
                      </span>
                      <span> • total: {item.total} alunos</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      className={`text-xs ${
                        item.percent >= 75
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : item.percent >= 50
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {item.percent}% Presença
                    </Badge>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedDate(item.date)}
                      className="text-xs text-blue-400 hover:text-blue-300 h-7 px-2"
                    >
                      Editar Chamada
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
