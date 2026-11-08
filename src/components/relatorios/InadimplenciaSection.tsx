import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Users,
  Receipt,
  DollarSign,
  TrendingDown,
  Clock,
  Search,
  ArrowUpDown,
  Filter,
  BarChart3,
  Calendar,
  ExternalLink,
  HelpCircle,
  FileText,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KpiCard } from './KpiCard'
import type {
  InadimplenciaKpis,
  DebtAgingBracket,
  DebtAgingBracketKey,
  InadimplenciaEvolutionPoint,
  InadimplenteStudentRanking,
  DetailedOverdueCharge,
} from '@/lib/reportExport'
import { formatCurrency, formatPercent } from '@/lib/reportExport'

interface InadimplenciaSectionProps {
  kpis: InadimplenciaKpis
  agingBrackets: DebtAgingBracket[]
  evolutionData: InadimplenciaEvolutionPoint[]
  studentRanking: InadimplenteStudentRanking[]
  charges: DetailedOverdueCharge[]
  periodLabel: string
  prevPeriodLabel: string
  prevPeriodOverdueAmount: number
  categoryOptions: Array<{ value: string; label: string }>
  onNavigateToStudent?: (studentId: string, studentName?: string) => void
}

type RankingSortField = 'totalDue' | 'overdueCount' | 'maxDaysOverdue' | 'studentName'
type ChargeSortField = 'daysOverdue' | 'amount' | 'dueDate' | 'studentName'

export const InadimplenciaSection: React.FC<InadimplenciaSectionProps> = ({
  kpis,
  agingBrackets,
  evolutionData,
  studentRanking,
  charges,
  periodLabel,
  prevPeriodLabel,
  prevPeriodOverdueAmount,
  categoryOptions,
  onNavigateToStudent,
}) => {
  // Filtros da listagem detalhada de cobranças
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [bracketFilter, setBracketFilter] = useState<string>('all')

  // Ordenação da listagem de cobranças
  const [chargeSortField, setChargeSortField] = useState<ChargeSortField>('daysOverdue')
  const [chargeSortOrder, setChargeSortOrder] = useState<'asc' | 'desc'>('desc')

  // Ordenação do ranking de alunos
  const [rankingSortField, setRankingSortField] = useState<RankingSortField>('totalDue')
  const [rankingSortOrder, setRankingSortOrder] = useState<'asc' | 'desc'>('desc')

  // Normalização de CPF
  const normalizeCpf = (str: string) => str.replace(/\D/g, '')

  // Delta de inadimplência em relação ao período anterior
  const overdueDelta = useMemo(() => {
    if (prevPeriodOverdueAmount <= 0) return 0
    return ((kpis.totalOverdueAmount - prevPeriodOverdueAmount) / prevPeriodOverdueAmount) * 100
  }, [kpis.totalOverdueAmount, prevPeriodOverdueAmount])

  // Ranking ordenado
  const sortedRanking = useMemo(() => {
    return [...studentRanking].sort((a, b) => {
      const factor = rankingSortOrder === 'asc' ? 1 : -1
      if (rankingSortField === 'studentName') {
        return factor * a.studentName.localeCompare(b.studentName)
      }
      return factor * ((a[rankingSortField] || 0) - (b[rankingSortField] || 0))
    })
  }, [studentRanking, rankingSortField, rankingSortOrder])

  const handleSortRanking = (field: RankingSortField) => {
    if (rankingSortField === field) {
      setRankingSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setRankingSortField(field)
      setRankingSortOrder('desc')
    }
  }

  // Cobranças filtradas e ordenadas
  const filteredCharges = useMemo(() => {
    const rawSearch = searchTerm.trim().toLowerCase()
    const cleanSearchCpf = normalizeCpf(rawSearch)

    return charges.filter((c) => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) {
        return false
      }
      if (bracketFilter !== 'all' && c.agingBracket !== bracketFilter) {
        return false
      }
      if (rawSearch) {
        const nameMatch = c.studentName.toLowerCase().includes(rawSearch)
        const codeMatch = c.code.toLowerCase().includes(rawSearch)
        const descMatch = c.description.toLowerCase().includes(rawSearch)
        const cleanCpf = normalizeCpf(c.studentCpf)
        const cpfMatch =
          cleanCpf.includes(cleanSearchCpf) || c.studentCpf.toLowerCase().includes(rawSearch)
        if (!nameMatch && !codeMatch && !descMatch && !cpfMatch) {
          return false
        }
      }
      return true
    })
  }, [charges, categoryFilter, bracketFilter, searchTerm])

  const sortedCharges = useMemo(() => {
    return [...filteredCharges].sort((a, b) => {
      const factor = chargeSortOrder === 'asc' ? 1 : -1
      if (chargeSortField === 'studentName') {
        return factor * a.studentName.localeCompare(b.studentName)
      }
      if (chargeSortField === 'dueDate') {
        return factor * a.dueDate.localeCompare(b.dueDate)
      }
      return factor * ((a[chargeSortField] || 0) - (b[chargeSortField] || 0))
    })
  }, [filteredCharges, chargeSortField, chargeSortOrder])

  const handleSortCharges = (field: ChargeSortField) => {
    if (chargeSortField === field) {
      setChargeSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setChargeSortField(field)
      setChargeSortOrder('desc')
    }
  }

  const getBracketBadge = (bracket: DebtAgingBracketKey) => {
    switch (bracket) {
      case 'ate_30':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-semibold text-[11px]">
            Até 30 dias
          </Badge>
        )
      case '31_60':
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 font-semibold text-[11px]">
            31 a 60 dias
          </Badge>
        )
      case '61_90':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-semibold text-[11px]">
            61 a 90 dias
          </Badge>
        )
      case 'mais_90':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 font-bold text-[11px]">
            Mais de 90 dias
          </Badge>
        )
      default:
        return <Badge variant="outline">Atrasado</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. KPIs da Inadimplência */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total em Atraso"
          value={formatCurrency(kpis.totalOverdueAmount)}
          subValue={`${kpis.overdueCount} cobranças vencidas acumuladas`}
          calculationExplanation="Soma do valor nominal de todas as cobranças com status 'pendente' ou 'atrasado' cuja data de vencimento expirou."
          delta={overdueDelta}
          deltaLabel={`vs. ${prevPeriodLabel}`}
          invertDeltaColor={true}
          icon={AlertTriangle}
        />

        <KpiCard
          title="Cobranças Vencidas"
          value={`${kpis.overdueCount}`}
          subValue={`Taxa de atraso de ${formatPercent(kpis.defaultRateInPeriod)}`}
          calculationExplanation="Quantidade de títulos pendentes que ultrapassaram a data limite estipulada de vencimento."
          delta={overdueDelta}
          deltaLabel={`vs. ${prevPeriodLabel}`}
          invertDeltaColor={true}
          icon={Receipt}
        />

        <KpiCard
          title="Alunos Inadimplentes"
          value={`${kpis.defaultingStudentsCount}`}
          subValue="Estudantes com débitos em aberto"
          calculationExplanation="Contagem única de alunos distintos que possuem ao menos uma cobrança pendente e vencida."
          delta={0}
          deltaLabel="Base consolidada"
          invertDeltaColor={true}
          icon={Users}
        />

        <KpiCard
          title="Ticket Médio da Dívida"
          value={formatCurrency(kpis.averageDebtPerStudent)}
          subValue={`${formatCurrency(kpis.averageDebtPerCharge)} por título vencido`}
          calculationExplanation="Montante total em atraso dividido pelo número total de alunos com pendências financeiras ativas."
          delta={0}
          deltaLabel="Média por devedor"
          invertDeltaColor={true}
          icon={DollarSign}
        />
      </div>

      {/* 2. Antiguidade da Dívida (Aging) & Evolução Histórica */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Antiguidade da Dívida */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" />
              Antiguidade da Dívida (Aging Brackets)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribuição dos valores inadimplentes por faixas de dias decorridos após o
              vencimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[240px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingBrackets} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="shortLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(val: number) => [
                      `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      'Total em Atraso',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {agingBrackets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela Resumo das Faixas de Atraso */}
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-3 text-left">Faixa de Atraso</th>
                    <th className="py-2 px-3 text-center">Títulos</th>
                    <th className="py-2 px-3 text-right">Valor em Atraso</th>
                    <th className="py-2 px-3 text-right">Participação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agingBrackets.map((bracket) => (
                    <tr key={bracket.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 px-3 flex items-center gap-2 font-medium text-slate-800">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: bracket.color }}
                        />
                        {bracket.label}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600">{bracket.count}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        {formatCurrency(bracket.amount)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-600">
                        {formatPercent(bracket.percentage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Evolução Histórica da Inadimplência */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              Evolução Temporal da Inadimplência
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Acompanhamento mensal do volume total vencido e não liquidado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[310px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={evolutionData}
                  margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(val: number) => [
                      `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      'Inadimplência Acumulada',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="overdueAmount"
                    name="Montante em Atraso (R$)"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#e11d48' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Ação de Cobrança Administrativa:</span> Cobranças
                que ultrapassam 60 dias possuem probabilidade decrescente de liquidação espontânea.
                Priorize contato ativo com os alunos do ranking abaixo.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Ranking dos Alunos Inadimplentes */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-700" />
              Ranking de Alunos Inadimplentes
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Estudantes ordenados por maior montante devido, com atalho direto para a ficha
              cadastral do aluno.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs text-slate-600 w-fit">
            Total: {studentRanking.length} alunos com pendências
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-center w-12">#</th>
                  <th
                    className="py-2.5 px-4 text-left cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortRanking('studentName')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Aluno & CPF</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 text-left">Curso Vinculado</th>
                  <th
                    className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortRanking('totalDue')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Devido</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortRanking('overdueCount')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Cobranças Vencidas</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortRanking('maxDaysOverdue')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Maior Atraso</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 text-center w-28">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRanking.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhum aluno inadimplente identificado para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  sortedRanking.map((student, idx) => (
                    <tr
                      key={student.studentId}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3 px-4 text-center font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{student.studentName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          CPF: {student.studentCpf}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {student.courseName || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600 text-sm">
                        {formatCurrency(student.totalDue)}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">
                        <Badge variant="outline" className="bg-slate-50 font-semibold">
                          {student.overdueCount} {student.overdueCount === 1 ? 'título' : 'títulos'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          className={
                            student.maxDaysOverdue > 90
                              ? 'bg-red-100 text-red-800 border-red-300 font-bold'
                              : student.maxDaysOverdue > 60
                                ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                                : 'bg-amber-50 text-amber-700 border-amber-200 font-semibold'
                          }
                        >
                          {student.maxDaysOverdue} dias
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onNavigateToStudent ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-sky-700 hover:text-sky-800 hover:bg-sky-50 font-medium"
                            onClick={() =>
                              onNavigateToStudent(student.studentId, student.studentName)
                            }
                            title="Abrir ficha do aluno na Gestão de Alunos"
                          >
                            <span>Ver Ficha</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Listagem Detalhada das Cobranças Vencidas com Filtros */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-600" />
                Listagem Detalhada de Cobranças Vencidas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Detalhamento título a título com categoria institucional, vencimento e faixa de
                atraso.
              </CardDescription>
            </div>
            <div className="text-xs text-slate-500">
              Exibindo <strong className="text-slate-900">{sortedCharges.length}</strong> de{' '}
              <strong>{charges.length}</strong> cobranças
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por aluno, CPF ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categoryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={bracketFilter} onValueChange={setBracketFilter}>
              <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Todas as faixas de atraso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Faixas de Atraso</SelectItem>
                <SelectItem value="ate_30">Até 30 dias</SelectItem>
                <SelectItem value="31_60">31 a 60 dias</SelectItem>
                <SelectItem value="61_90">61 a 90 dias</SelectItem>
                <SelectItem value="mais_90">Mais de 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-left">Código</th>
                  <th
                    className="py-2.5 px-4 text-left cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortCharges('studentName')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Aluno & CPF</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 text-left">Categoria</th>
                  <th className="py-2.5 px-4 text-left">Descrição</th>
                  <th
                    className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortCharges('amount')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Valor</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortCharges('dueDate')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Vencimento</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSortCharges('daysOverdue')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Atraso</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 text-center">Faixa</th>
                  <th className="py-2.5 px-4 text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCharges.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Nenhuma cobrança vencida encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  sortedCharges.map((chg) => (
                    <tr key={chg.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">{chg.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{chg.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          CPF: {chg.studentCpf}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-700 border-slate-200 font-medium"
                        >
                          {chg.categoryLabel}
                        </Badge>
                      </td>
                      <td
                        className="py-3 px-4 text-slate-600 max-w-xs truncate"
                        title={chg.description}
                      >
                        {chg.description}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {formatCurrency(chg.amount)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-700 font-medium">
                        {chg.dueDate}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-red-700">
                        {chg.daysOverdue} dias
                      </td>
                      <td className="py-3 px-4 text-center">{getBracketBadge(chg.agingBracket)}</td>
                      <td className="py-3 px-4 text-center">
                        {onNavigateToStudent ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-sky-700 hover:text-sky-800 hover:bg-sky-50"
                            onClick={() => onNavigateToStudent(chg.studentId, chg.studentName)}
                            title="Abrir ficha do aluno"
                          >
                            <span>Ficha</span>
                            <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
