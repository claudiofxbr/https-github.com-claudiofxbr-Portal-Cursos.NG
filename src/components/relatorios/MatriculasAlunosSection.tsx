import React, { useState, useMemo } from 'react'
import {
  Users,
  GraduationCap,
  UserCheck,
  UserPlus,
  Clock,
  Search,
  ArrowUpDown,
  Filter,
  BarChart3,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KpiCard } from './KpiCard'
import type {
  MatriculasReportKpis,
  StudentCourseDistribution,
  EnrollmentEvolutionPoint,
  StudentStatusCount,
} from '@/lib/reportExport'
import type { Student } from '@/types/portal'

interface MatriculasAlunosSectionProps {
  kpis: MatriculasReportKpis
  coursesDistribution: StudentCourseDistribution[]
  evolutionData: EnrollmentEvolutionPoint[]
  statusChartData: StudentStatusCount[]
  students: Student[]
  periodLabel: string
  prevPeriodLabel: string
  newEnrollmentsInPrevPeriod: number
}

type CourseSortField =
  | 'courseName'
  | 'totalStudents'
  | 'newInPeriod'
  | 'occupancyRate'
  | 'graduacaoCount'
  | 'posGraduacaoCount'

export const MatriculasAlunosSection: React.FC<MatriculasAlunosSectionProps> = ({
  kpis,
  coursesDistribution,
  evolutionData,
  statusChartData,
  students,
  periodLabel,
  prevPeriodLabel,
  newEnrollmentsInPrevPeriod,
}) => {
  // Filtros locais para a lista detalhada de alunos
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Ordenação da tabela de cursos
  const [sortField, setSortField] = useState<CourseSortField>('totalStudents')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleSortCourses = (field: CourseSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedCourses = useMemo(() => {
    return [...coursesDistribution].sort((a, b) => {
      const factor = sortOrder === 'asc' ? 1 : -1
      if (sortField === 'courseName') {
        return factor * a.courseName.localeCompare(b.courseName)
      }
      return factor * ((a[sortField] || 0) - (b[sortField] || 0))
    })
  }, [coursesDistribution, sortField, sortOrder])

  // Normalização de CPF para busca
  const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, '')

  // Filtragem da lista detalhada de alunos
  const filteredStudents = useMemo(() => {
    const rawSearch = searchTerm.trim().toLowerCase()
    const cleanSearchCpf = normalizeCpf(rawSearch)

    return students.filter((s) => {
      // Filtro de status
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false
      }

      // Filtro de tipo (graduacao vs pos)
      if (typeFilter !== 'all' && s.type !== typeFilter) {
        return false
      }

      // Filtro de curso
      if (courseFilter !== 'all' && s.courseId !== courseFilter) {
        return false
      }

      // Busca por nome, email ou CPF normalizado
      if (rawSearch) {
        const matchName = (s.fullName || '').toLowerCase().includes(rawSearch)
        const matchEmail = (s.email || '').toLowerCase().includes(rawSearch)
        const matchCpf = cleanSearchCpf && normalizeCpf(s.cpf || '').includes(cleanSearchCpf)
        const matchCourse = (s.courseName || '').toLowerCase().includes(rawSearch)

        return matchName || matchEmail || matchCpf || matchCourse
      }

      return true
    })
  }, [students, searchTerm, statusFilter, courseFilter, typeFilter])

  // Delta de novas matrículas vs período anterior
  const enrollmentDelta = useMemo(() => {
    if (newEnrollmentsInPrevPeriod <= 0) {
      return kpis.newEnrollmentsInPeriod > 0 ? 100 : 0
    }
    return (
      ((kpis.newEnrollmentsInPeriod - newEnrollmentsInPrevPeriod) / newEnrollmentsInPrevPeriod) *
      100
    )
  }, [kpis.newEnrollmentsInPeriod, newEnrollmentsInPrevPeriod])

  // Mapeador de cores e rótulos de status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
      case 'matriculado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] hover:bg-emerald-100">
            Ativo
          </Badge>
        )
      case 'pre_matricula':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] hover:bg-amber-100">
            Pré-Matrícula
          </Badge>
        )
      case 'trancado':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] hover:bg-orange-100">
            Trancado
          </Badge>
        )
      case 'inativo':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] hover:bg-slate-100">
            Inativo
          </Badge>
        )
      case 'concluido':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] hover:bg-purple-100">
            Concluído
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        )
    }
  }

  // Cores da barra de status
  const statusColorMap: Record<string, string> = {
    ativo: 'bg-emerald-500',
    matriculado: 'bg-sky-500',
    pre_matricula: 'bg-amber-500',
    trancado: 'bg-orange-500',
    inativo: 'bg-slate-400',
    concluido: 'bg-purple-500',
  }

  return (
    <div className="space-y-6">
      {/* 1. SEÇÃO DE KPIS DE MATRÍCULAS E ALUNOS */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-sky-700" />
            Indicadores de Alunos e Matrículas ({periodLabel})
          </h2>
          <span className="text-xs text-slate-400">
            Período comparativo: <strong className="text-slate-600">{prevPeriodLabel}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Total de Alunos */}
          <KpiCard
            title="Total na Base"
            value={kpis.totalStudents.toString()}
            subValue="Cadastros acumulados"
            calculationExplanation="Total histórico de alunos cadastrados na base de dados do PortalCursos.NG."
            delta={0}
            deltaLabel="Base consolidada"
            icon={Users}
          />

          {/* Novas Matrículas no Período */}
          <KpiCard
            title="Matrículas no Período"
            value={kpis.newEnrollmentsInPeriod.toString()}
            subValue={`Novos ingressos em "${periodLabel}"`}
            calculationExplanation="Quantidade de alunos cadastrados ou matriculados dentro do intervalo de datas do período selecionado (utiliza createdAt/enrolledAt)."
            delta={enrollmentDelta}
            deltaLabel={`vs. ${prevPeriodLabel}`}
            icon={UserPlus}
          />

          {/* Alunos Ativos / Matriculados */}
          <KpiCard
            title="Alunos Ativos"
            value={kpis.activeOrMatriculatedTotal.toString()}
            subValue={`${kpis.totalStudents > 0 ? ((kpis.activeOrMatriculatedTotal / kpis.totalStudents) * 100).toFixed(1) : 0}% da base total`}
            calculationExplanation="Alunos com situação 'ativo' ou 'matriculado' com acesso pleno ao ambiente acadêmico."
            delta={0}
            deltaLabel="Regularizados"
            icon={UserCheck}
          />

          {/* Graduação */}
          <KpiCard
            title="Graduação"
            value={kpis.graduacaoTotal.toString()}
            subValue={`${kpis.graduacaoInPeriod} novos no período`}
            calculationExplanation="Alunos matriculados em cursos de nível de graduação (total e novos no período)."
            delta={0}
            deltaLabel={`${kpis.totalStudents > 0 ? ((kpis.graduacaoTotal / kpis.totalStudents) * 100).toFixed(1) : 0}% da base`}
            icon={GraduationCap}
          />

          {/* Pós-Graduação */}
          <KpiCard
            title="Pós-Graduação"
            value={kpis.posGraduacaoTotal.toString()}
            subValue={`${kpis.posInPeriod} novos no período`}
            calculationExplanation="Alunos matriculados em cursos de especialização, MBA ou pós-graduação."
            delta={0}
            deltaLabel={`${kpis.totalStudents > 0 ? ((kpis.posGraduacaoTotal / kpis.totalStudents) * 100).toFixed(1) : 0}% da base`}
            icon={GraduationCap}
          />

          {/* Em Pré-Matrícula / Pendentes */}
          <KpiCard
            title="Pré-Matrículas"
            value={kpis.statusBreakdown.pre_matricula.toString()}
            subValue={`Trancados: ${kpis.statusBreakdown.trancado}`}
            calculationExplanation="Alunos em processo de pré-matrícula aguardando pagamento ou validação de documentos, além de matrículas trancadas."
            delta={0}
            deltaLabel={`Inativos: ${kpis.statusBreakdown.inativo}`}
            icon={Clock}
          />
        </div>
      </section>

      {/* 2. GRÁFICOS: EVOLUÇÃO TEMPORAL DE MATRÍCULAS & DISTRIBUIÇÃO POR STATUS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: Evolução Temporal de Matrículas (SVG Nativo) */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-700" />
              Evolução de Novas Matrículas ao Longo do Tempo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Novos alunos matriculados agrupados por período temporal ({periodLabel}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {evolutionData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                Sem registros de matrículas no período selecionado.
              </div>
            ) : (
              <div className="space-y-3">
                {/* SVG Renderizado */}
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox="0 0 450 180"
                    className="w-full h-[180px] block"
                    preserveAspectRatio="none"
                  >
                    {/* Linhas de Grade e Eixo */}
                    <line x1="35" y1="20" x2="435" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="35" y1="60" x2="435" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="35" y1="100" x2="435" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="35" y1="140" x2="435" y2="140" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Barras e Linha de Evolução */}
                    {(() => {
                      const maxVal = Math.max(3, ...evolutionData.map((d) => d.count))
                      const chartH = 120
                      const slotW = 400 / evolutionData.length
                      const barW = Math.max(8, Math.min(24, slotW * 0.45))

                      const points: Array<{ x: number; y: number }> = []

                      return (
                        <>
                          {evolutionData.map((d, idx) => {
                            const centerX = 35 + idx * slotW + slotW / 2
                            const barH = (d.count / maxVal) * chartH
                            const barY = 140 - barH
                            points.push({ x: centerX, y: barY })

                            return (
                              <g key={d.dateKey}>
                                <rect
                                  x={centerX - barW / 2}
                                  y={barY}
                                  width={barW}
                                  height={barH}
                                  fill="#0284c7"
                                  rx="2"
                                />
                                {d.count > 0 && (
                                  <text
                                    x={centerX}
                                    y={barY - 4}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight="bold"
                                    fill="#0369a1"
                                  >
                                    {d.count}
                                  </text>
                                )}
                                <text
                                  x={centerX}
                                  y="155"
                                  textAnchor="middle"
                                  fontSize="9"
                                  fill="#64748b"
                                  fontWeight="500"
                                >
                                  {d.dateLabel}
                                </text>
                              </g>
                            )
                          })}

                          {points.length > 1 && (
                            <path
                              d={points.reduce(
                                (acc, pt, i) =>
                                  i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`,
                                '',
                              )}
                              fill="none"
                              stroke="#0369a1"
                              strokeWidth="1.8"
                            />
                          )}

                          {points.map((pt, i) => (
                            <circle
                              key={i}
                              cx={pt.x}
                              cy={pt.y}
                              r="2.5"
                              fill="#0284c7"
                              stroke="#ffffff"
                              strokeWidth="1"
                            />
                          ))}
                        </>
                      )
                    })()}
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 inline-block" />
                    <span>Novas Matrículas Realizadas no Período</span>
                  </div>
                  <span className="font-semibold text-slate-700">
                    Total: {kpis.newEnrollmentsInPeriod} alunos
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: Distribuição de Alunos por Status */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-700" />
              Distribuição da Base de Alunos por Status
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Proporção de alunos ativos, pré-matrículas, trancados, inativos e concluídos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                Nenhum dado cadastral disponível.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {statusChartData.map((item) => {
                  const maxCount = Math.max(1, ...statusChartData.map((d) => d.count))
                  const barWidthPercent = (item.count / maxCount) * 100
                  const colorClass = statusColorMap[item.status] || 'bg-sky-500'

                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${colorClass}`} />
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{item.count}</span>
                          <span className="text-[10px] text-slate-400">
                            ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colorClass} transition-all duration-300 rounded-full`}
                          style={{ width: `${Math.max(2, barWidthPercent)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Base Total: <strong>{kpis.totalStudents}</strong> alunos
                  </span>
                  <span>
                    Ativos / Regulares:{' '}
                    <strong className="text-emerald-700">
                      {kpis.activeOrMatriculatedTotal} (
                      {kpis.totalStudents > 0
                        ? ((kpis.activeOrMatriculatedTotal / kpis.totalStudents) * 100).toFixed(1)
                        : 0}
                      %)
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 3. TABELA DE DISTRIBUIÇÃO DE ALUNOS POR CURSO */}
      <section>
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-sky-700" />
                  Distribuição de Alunos e Matrículas por Curso
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Contagem total de alunos matriculados, novos ingressos no período selecionado,
                  segmentação por nível e status da matrícula.
                </CardDescription>
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                {coursesDistribution.length} cursos com dados consolidados
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSortCourses('courseName')}
                    >
                      <div className="flex items-center gap-1">
                        Curso & Nível
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSortCourses('totalStudents')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Total Alunos
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSortCourses('newInPeriod')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        No Período
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSortCourses('graduacaoCount')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Grad. / Pós
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-center">Status (Ativo / Pré / Outros)</th>
                    <th className="py-2.5 px-3 text-center">Vagas</th>
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none min-w-[120px]"
                      onClick={() => handleSortCourses('occupancyRate')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Taxa Ocupação
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCourses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Nenhum curso cadastrado ou encontrado.
                      </td>
                    </tr>
                  ) : (
                    sortedCourses.map((c) => {
                      const active = (c.byStatus.ativo || 0) + (c.byStatus.matriculado || 0)
                      const pre = c.byStatus.pre_matricula || 0
                      const others =
                        (c.byStatus.trancado || 0) +
                        (c.byStatus.inativo || 0) +
                        (c.byStatus.concluido || 0)

                      return (
                        <tr key={c.courseId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{c.courseName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
                                {c.courseCode}
                              </span>
                              <span>•</span>
                              <span className="capitalize">{c.level.replace('_', ' ')}</span>
                              <span>•</span>
                              <span className="uppercase">{c.modality}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 text-sm">
                            {c.totalStudents}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {c.newInPeriod > 0 ? (
                              <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px]">
                                +{c.newInPeriod} novos
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-mono">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            <span className="font-semibold text-sky-800">{c.graduacaoCount}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="font-semibold text-purple-800">
                              {c.posGraduacaoCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5 text-[11px]">
                              <span className="text-emerald-700 font-semibold" title="Ativos">
                                {active}
                              </span>
                              <span className="text-slate-300">/</span>
                              <span className="text-amber-700 font-semibold" title="Pré-Matrículas">
                                {pre}
                              </span>
                              <span className="text-slate-300">/</span>
                              <span className="text-slate-500" title="Trancados/Inativos">
                                {others}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                            {c.vacancies}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-slate-700">
                                  {c.occupancyRate.toFixed(1)}%
                                </span>
                                <span className="text-slate-400">
                                  {c.totalStudents}/{c.vacancies}
                                </span>
                              </div>
                              <Progress value={Math.min(100, c.occupancyRate)} className="h-1.5" />
                            </div>
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
      </section>

      {/* 4. SEÇÃO DE DETALHAMENTO DE ALUNOS COM BUSCA E FILTRO */}
      <section>
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-700" />
                  Listagem Detalhada de Alunos e Situação Cadastral
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Consulte alunos cadastrados na base com busca por Nome, E-mail ou CPF normalizado.
                </CardDescription>
              </div>
              <div className="text-xs text-slate-500">
                Exibindo <strong>{filteredStudents.length}</strong> de {students.length} alunos
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por Nome, CPF ou E-mail..."
                  className="pl-8 text-xs h-8"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todos os Status
                  </SelectItem>
                  <SelectItem value="ativo" className="text-xs">
                    Ativo
                  </SelectItem>
                  <SelectItem value="matriculado" className="text-xs">
                    Matriculado
                  </SelectItem>
                  <SelectItem value="pre_matricula" className="text-xs">
                    Pré-Matrícula
                  </SelectItem>
                  <SelectItem value="trancado" className="text-xs">
                    Trancado
                  </SelectItem>
                  <SelectItem value="inativo" className="text-xs">
                    Inativo
                  </SelectItem>
                  <SelectItem value="concluido" className="text-xs">
                    Concluído
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tipo de Curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todos os Níveis
                  </SelectItem>
                  <SelectItem value="graduacao" className="text-xs">
                    Graduação
                  </SelectItem>
                  <SelectItem value="pos_graduacao" className="text-xs">
                    Pós-Graduação
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todos os Cursos
                  </SelectItem>
                  {coursesDistribution.map((c) => (
                    <SelectItem key={c.courseId} value={c.courseId} className="text-xs">
                      {c.courseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3">Aluno</th>
                    <th className="py-2 px-3">CPF</th>
                    <th className="py-2 px-3">Curso & Nível</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Data Matrícula</th>
                    <th className="py-2 px-3 text-right">Data Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum aluno encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{s.fullName}</div>
                          <div className="text-[11px] text-slate-500">{s.email}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{s.cpf}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{s.courseName}</div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {s.type === 'graduacao' ? 'Graduação' : 'Pós-Graduação'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">{getStatusBadge(s.status)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {s.createdAt
                            ? new Date(s.createdAt).toLocaleDateString('pt-BR')
                            : s.enrolledAt
                              ? new Date(s.enrolledAt).toLocaleDateString('pt-BR')
                              : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
