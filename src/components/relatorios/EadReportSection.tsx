import React from 'react'
import {
  Tv,
  PlayCircle,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  BookOpen,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { KpiCard } from '@/components/relatorios/KpiCard'
import {
  EadReportKpis,
  EadCourseStatItem,
  EadStudentProgressItem,
  EadReportFilterState,
} from '@/lib/eadReportData'

interface EadReportSectionProps {
  kpis: EadReportKpis
  courseStats: EadCourseStatItem[]
  studentProgressList: EadStudentProgressItem[]
  courseOptions: Array<{ id: string; title: string }>
  filters: EadReportFilterState
  onFiltersChange: (updater: (prev: EadReportFilterState) => EadReportFilterState) => void
}

export function EadReportSection({
  kpis,
  courseStats,
  studentProgressList,
  courseOptions,
  filters,
  onFiltersChange,
}: EadReportSectionProps) {
  return (
    <div className="space-y-6">
      {/* 1. KPIs de EAD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KpiCard
          title="Cursos EAD Ativos"
          value={String(kpis.totalEadCourses)}
          description={`${kpis.totalLessons} videoaulas cadastradas`}
          icon={Tv}
          variant="default"
        />

        <KpiCard
          title="Total de Videoaulas"
          value={String(kpis.totalLessons)}
          description="Gravadas e disponíveis"
          icon={PlayCircle}
          variant="default"
        />

        <KpiCard
          title="Alunos em EAD"
          value={String(kpis.totalEnrolledStudents)}
          description="Com acesso ativo"
          icon={Users}
          variant="default"
        />

        <KpiCard
          title="Progresso Médio Geral"
          value={`${kpis.averageProgressPercent}%`}
          description={`${kpis.completedStudentsCount} conclusões (100%)`}
          icon={CheckCircle2}
          variant={kpis.averageProgressPercent >= 60 ? 'success' : 'default'}
        />

        <KpiCard
          title="Progresso Travado / Zero"
          value={String(kpis.stalledStudentsCount)}
          description="Sem aulas concluídas"
          icon={AlertTriangle}
          variant={kpis.stalledStudentsCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* 2. Gráfico SVG de Progresso Médio por Curso */}
      <Card className="border-slate-200/80 shadow-xs bg-white">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tv className="w-4 h-4 text-indigo-600" />
                Progresso Médio por Curso EAD
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Média percentual de conclusão de aulas por turma e engajamento dos alunos
                matriculados
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50"
            >
              {courseStats.length} curso(s)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2">
          {courseStats.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum curso EAD cadastrado na plataforma até o momento.
            </div>
          ) : (
            <div className="space-y-4">
              {courseStats.map((c) => (
                <div
                  key={c.courseId}
                  className="space-y-1.5 p-3 rounded-lg bg-slate-50/70 border border-slate-200/60"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900">{c.courseTitle}</span>
                      <p className="text-[11px] text-slate-500">
                        Instrutor: <strong className="text-slate-700">{c.instructorName}</strong> •{' '}
                        {c.workloadHours}h • {c.totalLessons} aulas • {c.enrolledStudentsCount}{' '}
                        aluno(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-500">
                        Concluídos:{' '}
                        <strong className="text-emerald-700 font-mono">
                          {c.completedStudentsCount}
                        </strong>
                      </span>
                      <span className="font-mono font-bold text-sm text-indigo-700">
                        {c.averageProgressPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Barra SVG estilizada */}
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        c.averageProgressPercent >= 75
                          ? 'bg-emerald-500'
                          : c.averageProgressPercent >= 40
                            ? 'bg-indigo-500'
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, c.averageProgressPercent))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Tabela Detalhada por Aluno com Filtros e Busca */}
      <Card className="border-slate-200/80 shadow-xs bg-white">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-700" />
                Acompanhamento Individual de Progresso
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Listagem detalhada de aulas assistidas, percentual e status de conclusão por aluno
              </CardDescription>
            </div>
            <span className="text-xs text-slate-500">
              Exibindo <strong className="text-slate-800">{studentProgressList.length}</strong>{' '}
              registro(s)
            </span>
          </div>

          {/* Filtros da Tabela */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nome, CPF ou curso..."
                value={filters.searchTerm}
                onChange={(e) =>
                  onFiltersChange((prev) => ({ ...prev, searchTerm: e.target.value }))
                }
                className="pl-9 h-9 text-xs border-slate-200"
              />
            </div>

            <Select
              value={filters.courseId}
              onValueChange={(val) => onFiltersChange((prev) => ({ ...prev, courseId: val }))}
            >
              <SelectTrigger className="h-9 text-xs border-slate-200">
                <SelectValue placeholder="Filtrar por curso EAD..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Todos os Cursos EAD
                </SelectItem>
                {courseOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    {opt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-y border-slate-200 font-semibold">
                  <th className="py-2.5 px-4">Aluno</th>
                  <th className="py-2.5 px-3">CPF</th>
                  <th className="py-2.5 px-4">Curso EAD</th>
                  <th className="py-2.5 px-3 text-center">Aulas Concluídas</th>
                  <th className="py-2.5 px-3 text-center">Progresso</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Última Atividade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentProgressList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Nenhum aluno encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  studentProgressList.map((item) => {
                    const isCompleted = item.status === 'concluido'
                    const isInProgress = item.status === 'em_andamento'

                    return (
                      <tr
                        key={`${item.studentId}-${item.courseId}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {item.studentName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {item.studentId}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-600">{item.studentCpf}</td>

                        <td className="py-2.5 px-4 text-slate-700">
                          <span className="font-medium block">{item.courseTitle}</span>
                          <span className="text-[10px] text-slate-400">
                            {item.workloadHours}h carga
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className="font-semibold text-slate-800">
                            {item.completedLessons}
                          </span>
                          <span className="text-slate-400"> / {item.totalLessons}</span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              {item.progressPercent}%
                            </span>
                            <Progress
                              value={item.progressPercent}
                              className="w-14 h-1.5 bg-slate-200"
                            />
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {isCompleted ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Concluído
                            </Badge>
                          ) : isInProgress ? (
                            <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px] font-medium">
                              <Clock className="w-3 h-3 mr-1 text-sky-600" />
                              Em Andamento
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-slate-500 border-slate-200"
                            >
                              Não Iniciado
                            </Badge>
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-center text-[11px] text-slate-500">
                          {item.lastActivityAt ? (
                            <span>{new Date(item.lastActivityAt).toLocaleDateString('pt-BR')}</span>
                          ) : (
                            <span className="text-slate-400 italic">Sem registros</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
