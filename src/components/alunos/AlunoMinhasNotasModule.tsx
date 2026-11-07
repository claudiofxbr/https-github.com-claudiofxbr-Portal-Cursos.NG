import React, { useMemo } from 'react'
import { usePortal } from '@/context/PortalContext'
import {
  calculateAcademicSummary,
  getAcademicStatusBadge,
  getAttendanceBadge,
} from '@/lib/academicCalculations'
import { ACADEMIC_RULES, Student } from '@/types/portal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GraduationCap,
  Award,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  UserCheck,
  TrendingUp,
  AlertCircle,
  FileCheck,
  Download,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import { generateCertificatePdf } from '@/lib/certificatePdfExport'

export function AlunoMinhasNotasModule() {
  const { currentUser, students, grades, attendance, certificates } = usePortal()

  // Localiza o aluno correspondente ao usuário logado
  const currentStudent = useMemo<Student | null>(() => {
    if (!currentUser) return null

    // 1. Procura por studentId explícito vinculado à conta
    if (currentUser.studentId) {
      const match = students.find((s) => s.id === currentUser.studentId)
      if (match) return match
    }

    // 2. Procura por e-mail correspondente
    if (currentUser.email) {
      const emailLower = currentUser.email.toLowerCase()
      const match = students.find((s) => s.email?.toLowerCase() === emailLower)
      if (match) return match
    }

    // 3. Procura por CPF correspondente (limpo ou formatado)
    if (currentUser.cpf) {
      const userCpfRaw = currentUser.cpf.replace(/\D/g, '')
      const match = students.find(
        (s) =>
          s.cpf === currentUser.cpf ||
          s.cpfRaw === userCpfRaw ||
          s.cpf.replace(/\D/g, '') === userCpfRaw,
      )
      if (match) return match
    }

    // 4. Procura por nome
    if (currentUser.name) {
      const nameLower = currentUser.name.toLowerCase()
      const match = students.find((s) => s.fullName.toLowerCase() === nameLower)
      if (match) return match
    }

    return null
  }, [currentUser, students])

  // Filtra estritamente as notas e presenças DESTE aluno autenticado
  const myGrades = useMemo(() => {
    if (!currentStudent) return []
    return grades.filter(
      (g) =>
        g.studentId === currentStudent.id ||
        (currentStudent.cpf && g.studentCpf === currentStudent.cpf) ||
        (g.studentName && g.studentName.toLowerCase() === currentStudent.fullName.toLowerCase()),
    )
  }, [currentStudent, grades])

  const myAttendance = useMemo(() => {
    if (!currentStudent) return []
    return attendance.filter(
      (a) =>
        a.studentId === currentStudent.id ||
        (currentStudent.cpf && a.studentCpf === currentStudent.cpf) ||
        (a.studentName && a.studentName.toLowerCase() === currentStudent.fullName.toLowerCase()),
    )
  }, [currentStudent, attendance])

  // Consolidação acadêmica
  const summaries = useMemo(() => {
    return calculateAcademicSummary(myGrades, myAttendance)
  }, [myGrades, myAttendance])

  // Certificado emitido para o aluno autenticado
  const myCertificate = useMemo(() => {
    if (!currentStudent) return null
    const cleanCpf = currentStudent.cpfRaw || currentStudent.cpf.replace(/\D/g, '')
    return (
      certificates.find((c) => {
        if (c.status !== 'ativo') return false
        if (c.studentId === currentStudent.id) return true
        if (cleanCpf && c.studentCpf && c.studentCpf.replace(/\D/g, '') === cleanCpf) return true
        if (c.studentName.toLowerCase() === currentStudent.fullName.toLowerCase()) return true
        return false
      }) || null
    )
  }, [currentStudent, certificates])

  // Métricas globais
  const overallMetrics = useMemo(() => {
    if (summaries.length === 0) {
      return {
        overallAverage: 0,
        overallAttendance: 100,
        approvedCount: 0,
        inProgressCount: 0,
        failedCount: 0,
      }
    }

    const totalAvg = summaries.reduce((acc, s) => acc + s.averageGrade, 0) / summaries.length
    const totalClasses = summaries.reduce((acc, s) => acc + s.totalClasses, 0)
    const totalPresents = summaries.reduce((acc, s) => acc + s.presentsCount, 0)
    const overallAtt = totalClasses > 0 ? Math.round((totalPresents / totalClasses) * 100) : 100

    const approvedCount = summaries.filter((s) => s.status === 'aprovado').length
    const failedCount = summaries.filter(
      (s) =>
        s.status === 'reprovado_nota' ||
        s.status === 'reprovado_frequencia' ||
        s.status === 'reprovado_ambos',
    ).length
    const inProgressCount = summaries.filter((s) => s.status === 'em_curso').length

    return {
      overallAverage: Math.round(totalAvg * 10) / 10,
      overallAttendance: overallAtt,
      approvedCount,
      inProgressCount,
      failedCount,
    }
  }, [summaries])

  if (!currentStudent) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum registro de matrícula associado</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Não foi encontrada uma matrícula de aluno ativa vinculada ao seu e-mail (
            {currentUser?.email}). Entre em contato com a Secretaria Acadêmica para vincular seu
            cadastro institucional.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com dados do aluno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/30 p-5 rounded-2xl border border-blue-900/40 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <GraduationCap className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Boletim & Frequência
              </h1>
              <p className="text-xs text-slate-400">
                Acompanhamento acadêmico individual de{' '}
                <strong className="text-slate-200">{currentStudent.fullName}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-right">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
              Curso Matriculado
            </span>
            <span className="text-white font-semibold">{currentStudent.courseName}</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-right">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
              Matrícula / CPF
            </span>
            <span className="text-blue-400 font-mono font-medium">{currentStudent.cpf}</span>
          </div>
        </div>
      </div>

      {/* Card Especial de Certificado de Conclusão */}
      {myCertificate ? (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner">
                <Award className="w-7 h-7 text-amber-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    🎓 Certificado Oficial de Conclusão de Curso
                  </h2>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-xs px-2.5 py-0.5">
                    {myCertificate.verificationCode}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300">
                  Parabéns! Você concluiu todos os requisitos pedagógicos do curso{' '}
                  <strong className="text-white">{myCertificate.courseName}</strong> com aprovação
                  pelo e-MEC.
                </p>
              </div>
            </div>

            <Button
              onClick={() => generateCertificatePdf(myCertificate)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm h-10 px-5 gap-2 shadow-md hover:shadow-emerald-500/20 transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              Visualizar / Baixar Certificado (PDF)
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase">
                Código Autenticidade
              </span>
              <span className="text-emerald-400 font-mono font-bold">
                {myCertificate.verificationCode}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase">Data de Emissão</span>
              <span className="text-slate-200 font-medium">{myCertificate.issueDate}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase">Carga Horária</span>
              <span className="text-slate-200 font-medium">
                {myCertificate.workloadHours} horas letivas
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase">Validação MEC</span>
              <span className="text-slate-200 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Válido Nacionalmente
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-950/40 text-blue-400 border border-blue-900/50">
              <Award className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-200 font-semibold flex items-center gap-1.5">
                Certificado de Conclusão
                <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                  Em Andamento
                </Badge>
              </p>
              <p className="text-[11px] text-slate-400">
                O certificado oficial será liberado pela Secretaria Acadêmica assim que você atingir
                os critérios regulatórios do MEC: <strong>Média geral ≥ 6,0</strong> e{' '}
                <strong>Frequência acumulada ≥ 75%</strong>.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-500 block">Status Atual</span>
            <span className="text-xs text-blue-400 font-medium">
              Média {overallMetrics.overallAverage.toFixed(1)} • Freq.{' '}
              {overallMetrics.overallAttendance}%
            </span>
          </div>
        </div>
      )}

      {/* Cards de Métricas Acadêmicas Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Média Geral */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
              <span>Média Geral Acumulada</span>
              <Award className="w-4 h-4 text-amber-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
              <span
                className={
                  overallMetrics.overallAverage >= ACADEMIC_RULES.MIN_PASSING_GRADE
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }
              >
                {overallMetrics.overallAverage.toFixed(1)}
              </span>
              <span className="text-xs font-normal text-slate-400">/ 10.0</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-slate-400">
            Média mínima para aprovação:{' '}
            <strong>{ACADEMIC_RULES.MIN_PASSING_GRADE.toFixed(1)}</strong>
          </CardContent>
        </Card>

        {/* Frequência Geral */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
              <span>Frequência Global</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
              <span
                className={
                  overallMetrics.overallAttendance >= ACADEMIC_RULES.MIN_PASSING_ATTENDANCE_PERCENT
                    ? 'text-emerald-400'
                    : overallMetrics.overallAttendance >= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }
              >
                {overallMetrics.overallAttendance}%
              </span>
              <span className="text-xs font-normal text-slate-400">presença</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-slate-400">
            Frequência mínima exigida:{' '}
            <strong>{ACADEMIC_RULES.MIN_PASSING_ATTENDANCE_PERCENT}%</strong>
          </CardContent>
        </Card>

        {/* Disciplinas em Andamento */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
              <span>Disciplinas Cursando</span>
              <BookOpen className="w-4 h-4 text-blue-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-white">
              {summaries.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-slate-400">
            {overallMetrics.inProgressCount} com avaliações em andamento
          </CardContent>
        </Card>

        {/* Status Geral */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
              <span>Situação Cadastral</span>
              <UserCheck className="w-4 h-4 text-indigo-400" />
            </CardDescription>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs border-emerald-500/40 text-emerald-300 bg-emerald-950/30 capitalize"
              >
                {currentStudent.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-slate-400">
            Matrícula regularizada no e-MEC
          </CardContent>
        </Card>
      </div>

      {/* Lista de Disciplinas Detalhadas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            Disciplinas e Componentes Curriculares
          </h2>
          <span className="text-xs text-slate-400">Visão somente leitura do aluno autenticado</span>
        </div>

        {summaries.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-white text-sm font-semibold">
              Nenhuma avaliação lançada pelos professores até o momento
            </p>
            <p className="text-slate-400 text-xs max-w-md mx-auto">
              Assim que os docentes registrarem notas ou presença no diário eletrônico, os dados
              aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary) => {
              const statusBadge = getAcademicStatusBadge(summary.status)
              const attBadge = getAttendanceBadge(summary.attendancePercent)

              return (
                <div
                  key={summary.subject}
                  className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 hover:border-slate-700 transition-colors"
                >
                  {/* Topo da disciplina */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-bold text-base">{summary.subject}</h3>
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${statusBadge.color}`}
                        >
                          {statusBadge.label}
                        </Badge>
                        {summary.term && (
                          <span className="text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            Semestre {summary.term}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{statusBadge.label}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Box Média */}
                      <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Média Final
                        </span>
                        <span
                          className={`text-lg font-mono font-bold ${
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

                      {/* Box Presença */}
                      <div
                        className={`px-3 py-1.5 rounded-lg border text-right ${attBadge.bgClass}`}
                      >
                        <span className="text-[10px] opacity-80 uppercase tracking-wider block">
                          Frequência
                        </span>
                        <span className="text-lg font-mono font-bold">
                          {summary.totalClasses === 0 ? '100%' : `${summary.attendancePercent}%`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes: Avaliações vs Chamadas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                    {/* Avaliações */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-slate-300 flex items-center justify-between">
                        <span>Notas Lançadas ({summary.grades.length})</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Mínimo: {ACADEMIC_RULES.MIN_PASSING_GRADE.toFixed(1)}
                        </span>
                      </h4>

                      {summary.grades.length === 0 ? (
                        <p className="text-slate-500 italic p-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
                          Nenhuma avaliação registrada ainda.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {summary.grades.map((grd) => {
                            const isApproved = grd.value >= ACADEMIC_RULES.MIN_PASSING_GRADE
                            return (
                              <div
                                key={grd.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/70"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-medium text-white">
                                    <span>{grd.assessmentType || 'Avaliação'}</span>
                                    {grd.weight && grd.weight > 1 && (
                                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded">
                                        peso {grd.weight}
                                      </span>
                                    )}
                                    {grd.date && (
                                      <span className="text-[10px] text-slate-500">
                                        • {grd.date}
                                      </span>
                                    )}
                                  </div>
                                  {grd.teacherName && (
                                    <p className="text-[10px] text-slate-400">
                                      Professor: {grd.teacherName}
                                    </p>
                                  )}
                                  {grd.observations && (
                                    <p className="text-[11px] text-slate-300 italic">
                                      "{grd.observations}"
                                    </p>
                                  )}
                                </div>

                                <div className="text-right">
                                  <span
                                    className={`font-mono font-bold text-base ${
                                      isApproved ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {grd.value.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block">/ 10.0</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Presenças */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-slate-300 flex items-center justify-between">
                        <span>Histórico de Chamada ({summary.attendance.length} aulas)</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Presenças: {summary.presentsCount} | Faltas: {summary.absencesCount}
                        </span>
                      </h4>

                      {summary.attendance.length === 0 ? (
                        <p className="text-slate-500 italic p-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
                          Nenhum registro de chamada lançado.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {summary.attendance.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/70"
                            >
                              <div className="flex items-center gap-2">
                                {att.status === 'presente' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : att.status === 'falta_justificada' ? (
                                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                )}
                                <div>
                                  <span className="text-white font-medium">{att.date}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">
                                    ({att.hours || 2}h/a)
                                  </span>
                                  {att.justification && (
                                    <p className="text-[10px] text-amber-300/80 italic">
                                      {att.justification}
                                    </p>
                                  )}
                                </div>
                              </div>

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
                                    ? 'Justificada'
                                    : 'Falta'}
                              </Badge>
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
      </div>
    </div>
  )
}
