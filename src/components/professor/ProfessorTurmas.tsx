import React, { useMemo, useState } from 'react'
import {
  ClassItem,
  ClassSchedule,
  DAY_OF_WEEK_LABELS,
  DAY_OF_WEEK_SHORT,
  Student,
} from '@/types/portal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, DoorOpen, Users, BookOpen, CalendarDays, UserCheck } from 'lucide-react'

import { AttendanceRecord } from '@/types/portal'
import { ClassAttendanceManager } from '@/components/turmas/ClassAttendanceManager'

interface ProfessorTurmasProps {
  classes: ClassItem[]
  classSchedules: ClassSchedule[]
  students: Student[]
  attendanceRecords?: AttendanceRecord[]
  teacherId?: string
  teacherName?: string
  onSaveAttendance?: (
    records: Omit<AttendanceRecord, 'id' | 'created' | 'updated'>[],
  ) => Promise<boolean>
  onOpenStudent?: (id: string) => void
}

export function ProfessorTurmas({
  classes,
  classSchedules,
  students,
  attendanceRecords = [],
  teacherId,
  teacherName,
  onSaveAttendance,
  onOpenStudent,
}: ProfessorTurmasProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classes[0]?.id || null)

  const activeClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0] || null
  }, [classes, selectedClassId])

  const activeSchedules = useMemo(() => {
    if (!activeClass) return []
    return classSchedules
      .filter((s) => s.classId === activeClass.id)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [classSchedules, activeClass])

  const enrolledStudents = useMemo(() => {
    if (!activeClass?.studentIds) return []
    const ids = new Set(activeClass.studentIds)
    return students.filter((s) => ids.has(s.id))
  }, [students, activeClass])

  if (classes.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="py-12 text-center text-slate-400">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Nenhuma turma atribuída</h3>
          <p className="text-xs text-slate-500 mt-1">
            Você ainda não possui turmas letivas vinculadas ao seu usuário.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Turma */}
      <div className="flex flex-wrap gap-2">
        {classes.map((cls) => {
          const isSelected = cls.id === activeClass?.id
          const schedCount = classSchedules.filter((s) => s.classId === cls.id).length
          const enrolledCount = cls.studentIds?.length || 0

          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-blue-600/10 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{cls.name}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    cls.status === 'em_andamento'
                      ? 'border-emerald-500/40 text-emerald-400'
                      : cls.status === 'planejada'
                        ? 'border-blue-500/40 text-blue-400'
                        : 'border-slate-600 text-slate-400'
                  }`}
                >
                  {cls.status === 'em_andamento'
                    ? 'Em Andamento'
                    : cls.status === 'planejada'
                      ? 'Planejada'
                      : 'Encerrada'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-blue-400" />
                {cls.courseName} • Período {cls.term}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {schedCount} horário(s)
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-400" />
                  {enrolledCount}/{cls.capacity} alunos
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {activeClass && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grade de Horários da Turma */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Grade de Horários
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Horários semanais e ambientes da turma {activeClass.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSchedules.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    Nenhum horário semanal cadastrado para esta turma.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeSchedules.map((sched) => (
                      <div
                        key={sched.id}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[11px] font-medium">
                            {DAY_OF_WEEK_LABELS[sched.dayOfWeek]} (
                            {DAY_OF_WEEK_SHORT[sched.dayOfWeek]})
                          </Badge>
                          <p className="text-xs font-semibold text-white flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {sched.startTime} às {sched.endTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                            <DoorOpen className="w-3 h-3 text-slate-500" />
                            {sched.room || 'Sala não definida'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeClass.notes && (
                  <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded border border-slate-800/80 mt-2">
                    <span className="font-semibold text-slate-300">Obs:</span> {activeClass.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Seção Principal: Chamada e Alunos da Turma */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Gestão de Chamada & Alunos ({enrolledStudents.length} / {activeClass.capacity})
                  </span>
                  <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                    {Math.round((enrolledStudents.length / activeClass.capacity) * 100)}% de
                    ocupação
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Lançamento de presença/falta e acompanhamento da turma {activeClass.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClassAttendanceManager
                  classItem={activeClass}
                  enrolledStudents={enrolledStudents}
                  attendanceRecords={attendanceRecords}
                  canManage={true}
                  teacherId={teacherId}
                  teacherName={teacherName}
                  onSaveAttendance={onSaveAttendance}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
