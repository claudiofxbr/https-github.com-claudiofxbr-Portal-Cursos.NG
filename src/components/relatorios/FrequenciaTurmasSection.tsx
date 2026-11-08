import React, { useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  BarChart3,
  UserCheck,
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
import { KpiCard } from '@/components/relatorios/KpiCard'
import {
  ClassAttendanceReportItem,
  FrequenciaKpis,
  FrequenciaFilterState,
  StudentAttendanceDetail,
} from '@/lib/frequenciaReportData'

interface FrequenciaTurmasSectionProps {
  kpis: FrequenciaKpis
  classReportList: ClassAttendanceReportItem[]
  riskStudentsRanking: StudentAttendanceDetail[]
  allClassesOptions: Array<{ id: string; name: string }>
  filters: FrequenciaFilterState
  onFiltersChange: (newFilters: FrequenciaFilterState) => void
  periodLabel: string
}

export const FrequenciaTurmasSection: React.FC<FrequenciaTurmasSectionProps> = ({
  kpis,
  classReportList,
  riskStudentsRanking,
  allClassesOptions,
  filters,
  onFiltersChange,
  periodLabel,
}) => {
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())

  const toggleClassExpand = (classId: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev)
      if (next.has(classId)) {
        next.delete(classId)
      } else {
        next.add(classId)
      }
      return next
    })
  }

  // Ranking das turmas ordenado pelo menor percentual (maior risco primeiro)
  const sortedClassesByRisk = [...classReportList].sort(
    (a, b) => a.averageClassPercent - b.averageClassPercent,
  )

  return (
    <div className="space-y-6">
      {/* Barra de Filtros da Frequência */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Filtro por Turma */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Turma Específica
              </label>
              <Select
                value={filters.classId || 'all'}
                onValueChange={(val) => onFiltersChange({ ...filters, classId: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas as Turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Turmas ({allClassesOptions.length})</SelectItem>
                  {allClassesOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Inicial */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Data Inicial Chamada
              </label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={filters.startDate}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Data Final Chamada
              </label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={filters.endDate}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
              />
            </div>

            {/* Busca textual por Aluno ou Professor */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Buscar por Aluno, Turma ou Professor
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Nome, CPF ou curso..."
                  className="h-9 pl-8 text-xs"
                  value={filters.searchTerm}
                  onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. SEÇÃO DE KPIS DE FREQUÊNCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Frequência Média Geral"
          value={`${kpis.overallConsolidatedAverage.toFixed(1)}%`}
          subValue={`Critério MEC ≥ 75% (${periodLabel})`}
          calculationExplanation="Média consolidada ponderada presencial + EAD apurada conforme Lei 9.394/96 (LDB Art. 24)."
          delta={kpis.overallConsolidatedAverage - 75}
          deltaLabel="vs. meta MEC (75%)"
          icon={GraduationCap}
        />

        <KpiCard
          title="Chamadas Registradas"
          value={`${kpis.totalCallsRecorded} sessões`}
          subValue={`${kpis.totalClassesCount} turmas monitoradas`}
          calculationExplanation="Total de datas/sessões de chamada de presença registradas oficialmente pelos professores nas turmas."
          delta={0}
          deltaLabel="período ativo"
          icon={Calendar}
        />

        <KpiCard
          title="Presenças x Faltas"
          value={`${kpis.totalPresents} P / ${kpis.totalAbsences} F`}
          subValue={`${kpis.totalJustified} faltas justificadas`}
          calculationExplanation="Volume bruto acumulado de presenças registradas (P), faltas não justificadas (F) e justificativas aceitas."
          delta={
            kpis.totalPresents + kpis.totalAbsences > 0
              ? (kpis.totalPresents / (kpis.totalPresents + kpis.totalAbsences)) * 100 - 75
              : 0
          }
          deltaLabel="índice de presença"
          icon={UserCheck}
        />

        <KpiCard
          title="Alunos em Risco (<75%)"
          value={String(kpis.riskStudentsCount)}
          subValue={`de ${kpis.totalStudentsMonitored} alunos totais`}
          calculationExplanation="Alunos matriculados com índice de frequência apurado inferior ao limite de corte de 75%, sujeitos a reprovação por falta."
          delta={kpis.riskStudentsCount}
          deltaLabel="alunos críticos"
          invertDeltaColor={true}
          icon={AlertTriangle}
        />
      </div>

      {/* 2. GRÁFICO SVG NATIVO E RANKING DAS TURMAS COM MAIOR RISCO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de Barras SVG (2 colunas no desktop) */}
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-700" />
                  Comparativo de Frequência por Turma
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Percentual médio de frequência das turmas com linha de corte regulatória MEC
                  (75%).
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Regular
                  (≥75%)
                </span>
                <span className="flex items-center gap-1.5 text-rose-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Risco
                  (&lt;75%)
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {classReportList.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                Nenhuma turma cadastrada ou encontrada para os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <div className="w-full overflow-x-auto">
                  {(() => {
                    const chartW = 580
                    const chartH = 200
                    const padL = 40
                    const padR = 20
                    const padT = 20
                    const padB = 40
                    const innerW = chartW - padL - padR
                    const innerH = chartH - padT - padB

                    const mecY = padT + innerH * (1 - 75 / 100)
                    const items = classReportList.slice(0, 10)
                    const slotW = innerW / items.length
                    const barW = Math.max(10, Math.min(30, slotW * 0.5))

                    return (
                      <svg
                        viewBox={`0 0 ${chartW} ${chartH}`}
                        className="w-full h-[200px] block"
                        preserveAspectRatio="none"
                      >
                        {/* Linhas de Grade e Eixo */}
                        <line
                          x1={padL}
                          y1={padT}
                          x2={chartW - padR}
                          y2={padT}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                        />
                        <line
                          x1={padL}
                          y1={padT + innerH * 0.25}
                          x2={chartW - padR}
                          y2={padT + innerH * 0.25}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                        />
                        <line
                          x1={padL}
                          y1={padT + innerH * 0.5}
                          x2={chartW - padR}
                          y2={padT + innerH * 0.5}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                        />
                        <line
                          x1={padL}
                          y1={padT + innerH}
                          x2={chartW - padR}
                          y2={padT + innerH}
                          stroke="#cbd5e1"
                          strokeWidth="1"
                        />

                        {/* Linha MEC 75% */}
                        <line
                          x1={padL}
                          y1={mecY}
                          x2={chartW - padR}
                          y2={mecY}
                          stroke="#e11d48"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                        <text
                          x={chartW - padR}
                          y={mecY - 4}
                          textAnchor="end"
                          fontSize="9"
                          fontWeight="bold"
                          fill="#e11d48"
                        >
                          MEC 75%
                        </text>

                        {/* Rótulos Eixo Y */}
                        <text
                          x={padL - 6}
                          y={padT + 4}
                          textAnchor="end"
                          fontSize="9"
                          fill="#94a3b8"
                        >
                          100%
                        </text>
                        <text
                          x={padL - 6}
                          y={padT + innerH * 0.5 + 4}
                          textAnchor="end"
                          fontSize="9"
                          fill="#94a3b8"
                        >
                          50%
                        </text>
                        <text
                          x={padL - 6}
                          y={padT + innerH + 4}
                          textAnchor="end"
                          fontSize="9"
                          fill="#94a3b8"
                        >
                          0%
                        </text>

                        {/* Barras */}
                        {items.map((c, idx) => {
                          const x = padL + idx * slotW + (slotW - barW) / 2
                          const percentClamped = Math.max(0, Math.min(100, c.averageClassPercent))
                          const barH = (percentClamped / 100) * innerH
                          const barY = padT + innerH - barH
                          const isRisk = percentClamped < 75
                          const color = isRisk ? '#f43f5e' : '#10b981'
                          const label =
                            c.className.length > 12 ? c.className.slice(0, 10) + '…' : c.className

                          return (
                            <g key={c.classId}>
                              <rect
                                x={x}
                                y={barY}
                                width={barW}
                                height={barH}
                                fill={color}
                                rx="2.5"
                              />
                              <text
                                x={x + barW / 2}
                                y={barY - 4}
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight="bold"
                                fill={color}
                              >
                                {c.averageClassPercent.toFixed(0)}%
                              </text>
                              <text
                                x={x + barW / 2}
                                y={chartH - 12}
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight="500"
                                fill="#475569"
                              >
                                {label}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    )
                  })()}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Exibindo até 10 turmas principais no gráfico comparativo</span>
                  <span className="font-medium text-slate-700">
                    Média Geral: {kpis.overallConsolidatedAverage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ranking de Turmas com Maior Risco (1 coluna) */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              Ranking de Turmas por Risco
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Turmas ordenadas pelo menor percentual médio de frequência primeiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedClassesByRisk.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                Sem turmas para exibir no ranking.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {sortedClassesByRisk.map((c, idx) => {
                  const isRisk = c.averageClassPercent < 75
                  return (
                    <div
                      key={c.classId}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {c.className}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate">
                          {c.courseName} • Prof. {c.professorName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.enrolledStudentsCount} alunos • {c.riskStudentsCount} em risco
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-bold ${
                            isRisk ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {c.averageClassPercent.toFixed(1)}%
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9.5px] px-1.5 py-0 mt-0.5 ${
                            isRisk
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isRisk ? 'Abaixo do MEC' : 'Regular'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. TABELA DETALHADA POR TURMA COM EXPANSÃO PARA ALUNOS MATRICULADOS */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-700" />
                Detalhamento por Turma & Alunos Matriculados
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Clique na turma para expandir a lista de alunos com percentual individual e situação
                acadêmica.
              </CardDescription>
            </div>
            <div className="text-xs text-slate-500">
              Total de turmas: <strong className="text-slate-800">{classReportList.length}</strong>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-10"></th>
                    <th className="py-2.5 px-3 text-left">Turma & Curso</th>
                    <th className="py-2.5 px-3 text-left">Professor</th>
                    <th className="py-2.5 px-3 text-center">Matriculados</th>
                    <th className="py-2.5 px-3 text-center">Chamadas</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">P</th>
                    <th className="py-2.5 px-3 text-center text-rose-700">F</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">J</th>
                    <th className="py-2.5 px-3 text-right">Frequência</th>
                    <th className="py-2.5 px-3 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classReportList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Nenhuma turma encontrada para os critérios selecionados.
                      </td>
                    </tr>
                  ) : (
                    classReportList.map((cls) => {
                      const isExpanded = expandedClasses.has(cls.classId)
                      const isRisk = cls.averageClassPercent < 75

                      return (
                        <React.Fragment key={cls.classId}>
                          <tr
                            onClick={() => toggleClassExpand(cls.classId)}
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-sky-700" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{cls.className}</div>
                              <div className="text-[11px] text-slate-500">
                                {cls.courseName} • Período {cls.term}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{cls.professorName}</td>
                            <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                              {cls.enrolledStudentsCount}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                              {cls.totalCallsRecorded}
                            </td>
                            <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                              {cls.totalPresents}
                            </td>
                            <td className="py-2.5 px-3 text-center text-rose-700 font-bold">
                              {cls.totalAbsences}
                            </td>
                            <td className="py-2.5 px-3 text-center text-amber-700 font-medium">
                              {cls.totalJustified}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`text-sm font-bold ${
                                  isRisk ? 'text-rose-600' : 'text-emerald-600'
                                }`}
                              >
                                {cls.averageClassPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  isRisk
                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {isRisk ? 'Abaixo do MEC' : 'Regular (≥75%)'}
                              </Badge>
                            </td>
                          </tr>

                          {/* Sub-tabela de Alunos Matriculados quando expandido */}
                          {isExpanded && (
                            <tr className="bg-slate-50/40">
                              <td colSpan={10} className="p-3 pl-10">
                                <div className="border border-slate-200/80 rounded-md bg-white p-3 space-y-2">
                                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-sky-700" />
                                      Alunos Matriculados na Turma ({cls.students.length})
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      {cls.riskStudentsCount} aluno(s) em risco acadêmico nesta
                                      turma
                                    </div>
                                  </div>

                                  {cls.students.length === 0 ? (
                                    <div className="py-3 text-center text-slate-400 text-xs">
                                      Nenhum aluno matriculado nesta turma.
                                    </div>
                                  ) : (
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                                          <th className="py-1.5 px-2 text-left">Aluno & CPF</th>
                                          <th className="py-1.5 px-2 text-center">Presenças (P)</th>
                                          <th className="py-1.5 px-2 text-center">Faltas (F)</th>
                                          <th className="py-1.5 px-2 text-center">Justif. (J)</th>
                                          <th className="py-1.5 px-2 text-right">
                                            Freq. Turma (%)
                                          </th>
                                          <th className="py-1.5 px-2 text-right">
                                            Freq. Geral (MEC)
                                          </th>
                                          <th className="py-1.5 px-2 text-center">Situação</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {cls.students.map((st) => {
                                          const studentIsRisk = st.status === 'em_risco'
                                          return (
                                            <tr key={st.studentId} className="hover:bg-slate-50/60">
                                              <td className="py-1.5 px-2">
                                                <div className="font-medium text-slate-900">
                                                  {st.studentName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                  CPF: {st.studentCpf || '—'}
                                                </div>
                                              </td>
                                              <td className="py-1.5 px-2 text-center font-semibold text-emerald-700">
                                                {st.presents}
                                              </td>
                                              <td className="py-1.5 px-2 text-center font-bold text-rose-700">
                                                {st.absences}
                                              </td>
                                              <td className="py-1.5 px-2 text-center text-amber-700">
                                                {st.justified}
                                              </td>
                                              <td className="py-1.5 px-2 text-right font-bold">
                                                <span
                                                  className={
                                                    studentIsRisk
                                                      ? 'text-rose-600'
                                                      : 'text-emerald-600'
                                                  }
                                                >
                                                  {st.classAttendancePercent.toFixed(1)}%
                                                </span>
                                              </td>
                                              <td className="py-1.5 px-2 text-right font-medium text-sky-800">
                                                {st.consolidatedPercent.toFixed(1)}%
                                              </td>
                                              <td className="py-1.5 px-2 text-center">
                                                {studentIsRisk ? (
                                                  <Badge
                                                    variant="outline"
                                                    className="border-rose-200 bg-rose-50 text-rose-700 text-[10px] gap-1"
                                                  >
                                                    <XCircle className="w-3 h-3 text-rose-600" />
                                                    Em Risco (&lt;75%)
                                                  </Badge>
                                                ) : (
                                                  <Badge
                                                    variant="outline"
                                                    className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] gap-1"
                                                  >
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                    Aprovado (≥75%)
                                                  </Badge>
                                                )}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
