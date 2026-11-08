import React, { useMemo, useState } from 'react'
import {
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Percent,
  Users,
  CreditCard,
  FileSpreadsheet,
  Download,
  Filter,
  BarChart3,
  Layers,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePortal } from '@/context/PortalContext'
import { toast } from '@/hooks/use-toast'
import { KpiCard } from './KpiCard'
import { CoursePerformanceTable, CoursePerformanceData } from './CoursePerformanceTable'
import { FinancialCharts } from './FinancialCharts'
import { DecisionInsights, DecisionInsight } from './DecisionInsights'
import { ExpenseManager } from './ExpenseManager'
import { Charge, Student, Course, Expense } from '@/types/portal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  exportReportToCsv,
  exportReportToPdf,
  exportMatriculasReportToCsv,
  exportMatriculasReportToPdf,
  canUserExportReports,
  ReportExportPayload,
  MatriculasReportExportPayload,
  StudentCourseDistribution,
  EnrollmentEvolutionPoint,
  StudentStatusCount,
  MatriculasReportKpis,
} from '@/lib/reportExport'
import { MatriculasAlunosSection } from './MatriculasAlunosSection'

export type PeriodFilter =
  | 'last_30_days'
  | 'current_month'
  | 'last_month'
  | 'current_year'
  | 'all_time'

const CATEGORY_LABEL_MAP: Record<string, string> = {
  mensalidade: 'Mensalidade',
  matricula: 'Matrícula',
  renegociacao: 'Renegociação',
  taxa: 'Taxas & Serviços',
  material: 'Material Didático',
  certificacao: 'Certificação',
  taxa_segunda_via: 'Taxa: 2ª Via de Documento',
  taxa_biblioteca: 'Taxa: Biblioteca / Multa',
  taxa_material: 'Taxa: Material Didático',
  taxa_rematricula: 'Taxa: Matrícula / Rematrícula',
  taxa_diploma: 'Taxa: Certificado / Diploma',
  taxa_trancamento: 'Taxa: Trancamento / Transferência',
  outros: 'Outros',
}

export const RelatoriosModule: React.FC = () => {
  const { charges, students, courses, expenses, addExpense, deleteExpense, currentUser } =
    usePortal()

  const [activeTab, setActiveTab] = useState<'financeiro' | 'matriculas'>('financeiro')
  const [period, setPeriod] = useState<PeriodFilter>('current_month')
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const canExport = canUserExportReports(currentUser?.role)

  // Date boundaries calculation
  const { dateRange, prevRange, periodLabel, prevPeriodLabel } = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed

    if (period === 'last_30_days') {
      const end = new Date(now)
      const start = new Date(now)
      start.setDate(start.getDate() - 30)

      const prevEnd = new Date(start)
      const prevStart = new Date(start)
      prevStart.setDate(prevStart.getDate() - 30)

      return {
        dateRange: { start, end },
        prevRange: { start: prevStart, end: prevEnd },
        periodLabel: 'Últimos 30 Dias',
        prevPeriodLabel: '30 dias anteriores',
      }
    }

    if (period === 'current_month') {
      const start = new Date(currentYear, currentMonth, 1)
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

      const prevStart = new Date(currentYear, currentMonth - 1, 1)
      const prevEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)

      return {
        dateRange: { start, end },
        prevRange: { start: prevStart, end: prevEnd },
        periodLabel: 'Mês Atual',
        prevPeriodLabel: 'Mês anterior',
      }
    }

    if (period === 'last_month') {
      const start = new Date(currentYear, currentMonth - 1, 1)
      const end = new Date(currentYear, currentMonth, 0, 23, 59, 59)

      const prevStart = new Date(currentYear, currentMonth - 2, 1)
      const prevEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59)

      return {
        dateRange: { start, end },
        prevRange: { start: prevStart, end: prevEnd },
        periodLabel: 'Mês Anterior',
        prevPeriodLabel: '2 meses atrás',
      }
    }

    if (period === 'current_year') {
      const start = new Date(currentYear, 0, 1)
      const end = new Date(currentYear, 11, 31, 23, 59, 59)

      const prevStart = new Date(currentYear - 1, 0, 1)
      const prevEnd = new Date(currentYear - 1, 11, 31, 23, 59, 59)

      return {
        dateRange: { start, end },
        prevRange: { start: prevStart, end: prevEnd },
        periodLabel: `Ano de ${currentYear}`,
        prevPeriodLabel: `Ano de ${currentYear - 1}`,
      }
    }

    // all_time
    return {
      dateRange: { start: new Date(2020, 0, 1), end: new Date(2035, 11, 31) },
      prevRange: { start: new Date(2020, 0, 1), end: new Date(2035, 11, 31) },
      periodLabel: 'Todo o Período Histórico',
      prevPeriodLabel: 'Período base',
    }
  }, [period])

  // Helper to test if a date string falls inside a range
  const isDateInRange = (dateStr: string, range: { start: Date; end: Date }) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d >= range.start && d <= range.end
  }

  // Date helper for student creation / enrollment
  const getStudentDate = (s: Student): string => {
    return s.createdAt || s.created || s.enrolledAt || ''
  }

  // ==========================================
  // CÁLCULOS DO RELATÓRIO DE MATRÍCULAS E ALUNOS
  // ==========================================
  const {
    matriculasKpis,
    studentCoursesDistribution,
    enrollmentEvolution,
    studentStatusChartData,
    newEnrollmentsInPrevPeriod,
  } = useMemo(() => {
    const totalStudents = students.length

    // Alunos criados no período atual vs período anterior
    const currentPeriodStudents = students.filter((s) => {
      if (period === 'all_time') return true
      const dateStr = getStudentDate(s)
      return isDateInRange(dateStr, dateRange)
    })

    const prevPeriodStudents = students.filter((s) => {
      if (period === 'all_time') return false
      const dateStr = getStudentDate(s)
      return isDateInRange(dateStr, prevRange)
    })

    // Breakdown de status da base total
    const statusBreakdown = {
      ativo: 0,
      matriculado: 0,
      pre_matricula: 0,
      trancado: 0,
      inativo: 0,
      concluido: 0,
    }

    let activeOrMatriculatedTotal = 0
    let graduacaoTotal = 0
    let posGraduacaoTotal = 0

    students.forEach((s) => {
      const st = s.status as keyof typeof statusBreakdown
      if (statusBreakdown[st] !== undefined) {
        statusBreakdown[st] += 1
      }
      if (s.status === 'ativo' || s.status === 'matriculado') {
        activeOrMatriculatedTotal += 1
      }
      if (s.type === 'graduacao') {
        graduacaoTotal += 1
      } else if (s.type === 'pos_graduacao') {
        posGraduacaoTotal += 1
      }
    })

    // Novos no período por tipo
    let graduacaoInPeriod = 0
    let posInPeriod = 0
    currentPeriodStudents.forEach((s) => {
      if (s.type === 'graduacao') {
        graduacaoInPeriod += 1
      } else if (s.type === 'pos_graduacao') {
        posInPeriod += 1
      }
    })

    const matriculasKpis: MatriculasReportKpis = {
      totalStudents,
      newEnrollmentsInPeriod: currentPeriodStudents.length,
      activeOrMatriculatedTotal,
      graduacaoTotal,
      posGraduacaoTotal,
      graduacaoInPeriod,
      posInPeriod,
      statusBreakdown,
    }

    // Distribuição por curso
    const studentCoursesDistribution: StudentCourseDistribution[] = courses.map((course) => {
      const courseStudents = students.filter((s) => s.courseId === course.id)
      const courseNewInPeriod = currentPeriodStudents.filter((s) => s.courseId === course.id)

      const byStatus: {
        ativo: number
        matriculado: number
        pre_matricula: number
        trancado: number
        inativo: number
        concluido: number
      } = {
        ativo: 0,
        matriculado: 0,
        pre_matricula: 0,
        trancado: 0,
        inativo: 0,
        concluido: 0,
      }

      let graduacaoCount = 0
      let posGraduacaoCount = 0

      courseStudents.forEach((s) => {
        const st = s.status
        if (st in byStatus) {
          byStatus[st as keyof typeof byStatus] += 1
        }
        if (s.type === 'graduacao') graduacaoCount += 1
        else if (s.type === 'pos_graduacao') posGraduacaoCount += 1
      })

      const totalCourseStudents = courseStudents.length
      const vacancies = course.vacancies || 40
      const occupancyRate = vacancies > 0 ? (totalCourseStudents / vacancies) * 100 : 0

      return {
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        level: course.level,
        modality: course.modality,
        totalStudents: totalCourseStudents,
        newInPeriod: courseNewInPeriod.length,
        graduacaoCount,
        posGraduacaoCount,
        vacancies,
        occupancyRate,
        byStatus,
      }
    })

    // Evolução temporal de novas matrículas
    let enrollmentEvolution: EnrollmentEvolutionPoint[] = []

    if (period === 'last_30_days') {
      // 4 semanas
      const buckets = [
        { label: 'Semana 1', startDay: 0, endDay: 7, count: 0, grad: 0, pos: 0 },
        { label: 'Semana 2', startDay: 7, endDay: 14, count: 0, grad: 0, pos: 0 },
        { label: 'Semana 3', startDay: 14, endDay: 21, count: 0, grad: 0, pos: 0 },
        { label: 'Semana 4', startDay: 21, endDay: 31, count: 0, grad: 0, pos: 0 },
      ]

      const nowTime = dateRange.end.getTime()
      currentPeriodStudents.forEach((s) => {
        const dStr = getStudentDate(s)
        if (!dStr) return
        const diffDays = Math.floor((nowTime - new Date(dStr).getTime()) / (1000 * 60 * 60 * 24))
        const bucket = buckets.find((b) => diffDays >= b.startDay && diffDays < b.endDay)
        if (bucket) {
          bucket.count += 1
          if (s.type === 'graduacao') bucket.grad += 1
          else if (s.type === 'pos_graduacao') bucket.pos += 1
        }
      })

      enrollmentEvolution = buckets.map((b, idx) => ({
        dateKey: `sem_${idx}`,
        dateLabel: b.label,
        count: b.count,
        graduacaoCount: b.grad,
        posCount: b.pos,
      }))
    } else if (period === 'current_month' || period === 'last_month') {
      // 4 semanas do mês
      const buckets = [
        { label: 'Dias 1-7', start: 1, end: 7, count: 0, grad: 0, pos: 0 },
        { label: 'Dias 8-14', start: 8, end: 14, count: 0, grad: 0, pos: 0 },
        { label: 'Dias 15-21', start: 15, end: 21, count: 0, grad: 0, pos: 0 },
        { label: 'Dias 22-31', start: 22, end: 31, count: 0, grad: 0, pos: 0 },
      ]

      currentPeriodStudents.forEach((s) => {
        const dStr = getStudentDate(s)
        if (!dStr) return
        const day = new Date(dStr).getDate()
        const bucket = buckets.find((b) => day >= b.start && day <= b.end)
        if (bucket) {
          bucket.count += 1
          if (s.type === 'graduacao') bucket.grad += 1
          else if (s.type === 'pos_graduacao') bucket.pos += 1
        }
      })

      enrollmentEvolution = buckets.map((b, idx) => ({
        dateKey: `week_${idx}`,
        dateLabel: b.label,
        count: b.count,
        graduacaoCount: b.grad,
        posCount: b.pos,
      }))
    } else {
      // Meses do ano (Jan .. Dez)
      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ]
      const monthBuckets = monthNames.map((name, mIdx) => ({
        monthIdx: mIdx,
        label: name,
        count: 0,
        grad: 0,
        pos: 0,
      }))

      currentPeriodStudents.forEach((s) => {
        const dStr = getStudentDate(s)
        if (!dStr) return
        const d = new Date(dStr)
        const m = d.getMonth()
        if (monthBuckets[m]) {
          monthBuckets[m].count += 1
          if (s.type === 'graduacao') monthBuckets[m].grad += 1
          else if (s.type === 'pos_graduacao') monthBuckets[m].pos += 1
        }
      })

      enrollmentEvolution = monthBuckets.map((mb) => ({
        dateKey: `m_${mb.monthIdx}`,
        dateLabel: mb.label,
        count: mb.count,
        graduacaoCount: mb.grad,
        posCount: mb.pos,
      }))
    }

    // Gráfico de distribuição por status
    const statusLabels: Record<string, string> = {
      ativo: 'Ativos',
      matriculado: 'Matriculados',
      pre_matricula: 'Pré-Matrícula',
      trancado: 'Trancados',
      inativo: 'Inativos',
      concluido: 'Concluídos',
    }

    const validStatuses: Array<
      'ativo' | 'inativo' | 'trancado' | 'matriculado' | 'pre_matricula' | 'concluido'
    > = ['ativo', 'matriculado', 'pre_matricula', 'trancado', 'inativo', 'concluido']

    const studentStatusChartData: StudentStatusCount[] = validStatuses.map((st) => {
      const count = statusBreakdown[st] || 0
      return {
        status: st,
        label: statusLabels[st] || st,
        count,
        percentage: totalStudents > 0 ? (count / totalStudents) * 100 : 0,
      }
    })

    return {
      matriculasKpis,
      studentCoursesDistribution,
      enrollmentEvolution,
      studentStatusChartData,
      newEnrollmentsInPrevPeriod: prevPeriodStudents.length,
    }
  }, [students, courses, period, dateRange, prevRange])

  // Filtered charges and expenses for current vs previous period
  const { currentCharges, prevCharges, currentExpenses, prevExpenses } = useMemo(() => {
    const cCharges = charges.filter((c) =>
      period === 'all_time' ? true : isDateInRange(c.dueDate, dateRange),
    )
    const pCharges = charges.filter((c) =>
      period === 'all_time' ? true : isDateInRange(c.dueDate, prevRange),
    )

    const cExpenses = expenses.filter((e) =>
      period === 'all_time' ? true : isDateInRange(e.date, dateRange),
    )
    const pExpenses = expenses.filter((e) =>
      period === 'all_time' ? true : isDateInRange(e.date, prevRange),
    )

    return {
      currentCharges: cCharges,
      prevCharges: pCharges,
      currentExpenses: cExpenses,
      prevExpenses: pExpenses,
    }
  }, [charges, expenses, dateRange, prevRange, period])

  // Current financial KPIs
  const currentMetrics = useMemo(() => {
    const paidCharges = currentCharges.filter((c) => c.status === 'pago')
    const overdueCharges = currentCharges.filter((c) => c.status === 'atrasado')
    const totalBilled = currentCharges.reduce((acc, c) => acc + c.amount, 0)
    const receita = paidCharges.reduce((acc, c) => acc + c.amount, 0)

    const paidExpenses = currentExpenses.filter((e) => e.status === 'pago')
    const despesas = paidExpenses.reduce((acc, e) => acc + e.amount, 0)

    const lucro = receita - despesas

    // Inadimplência: cobranças vencidas / total gerado no período
    const overdueAmount = overdueCharges.reduce((acc, c) => acc + c.amount, 0)
    const defaultRate = totalBilled > 0 ? (overdueAmount / totalBilled) * 100 : 0

    // Ticket médio: receita paga / cobranças pagas (ou alunos ativos)
    const ticketMedio = paidCharges.length > 0 ? receita / paidCharges.length : 0

    // Taxa de ocupação: total de matriculados nos cursos / total de capacidade dos cursos
    const totalEnrolled = courses.reduce((acc, c) => acc + (c.enrolledCount || 0), 0)
    const totalVacancies = courses.reduce((acc, c) => acc + (c.vacancies || 0), 0)
    const occupancyRate = totalVacancies > 0 ? (totalEnrolled / totalVacancies) * 100 : 0

    return {
      receita,
      despesas,
      lucro,
      defaultRate,
      ticketMedio,
      occupancyRate,
      paidCount: paidCharges.length,
      overdueCount: overdueCharges.length,
      totalEnrolled,
      totalVacancies,
    }
  }, [currentCharges, currentExpenses, courses])

  // Previous period financial KPIs for delta comparison
  const prevMetrics = useMemo(() => {
    const paidCharges = prevCharges.filter((c) => c.status === 'pago')
    const overdueCharges = prevCharges.filter((c) => c.status === 'atrasado')
    const totalBilled = prevCharges.reduce((acc, c) => acc + c.amount, 0)
    const receita = paidCharges.reduce((acc, c) => acc + c.amount, 0)

    const paidExpenses = prevExpenses.filter((e) => e.status === 'pago')
    const despesas = paidExpenses.reduce((acc, e) => acc + e.amount, 0)

    const lucro = receita - despesas
    const overdueAmount = overdueCharges.reduce((acc, c) => acc + c.amount, 0)
    const defaultRate = totalBilled > 0 ? (overdueAmount / totalBilled) * 100 : 0
    const ticketMedio = paidCharges.length > 0 ? receita / paidCharges.length : 0

    return {
      receita,
      despesas,
      lucro,
      defaultRate,
      ticketMedio,
    }
  }, [prevCharges, prevExpenses])

  // Deltas (% change or p.p.)
  const deltas = useMemo(() => {
    const calcPctDelta = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return ((curr - prev) / Math.abs(prev)) * 100
    }

    return {
      receita: calcPctDelta(currentMetrics.receita, prevMetrics.receita),
      despesas: calcPctDelta(currentMetrics.despesas, prevMetrics.despesas),
      lucro: calcPctDelta(currentMetrics.lucro, prevMetrics.lucro),
      defaultRate: currentMetrics.defaultRate - prevMetrics.defaultRate, // percentage points
      ticketMedio: calcPctDelta(currentMetrics.ticketMedio, prevMetrics.ticketMedio),
      occupancyRate: 0, // structural capacity
    }
  }, [currentMetrics, prevMetrics])

  // Desempenho por curso
  const coursePerformance = useMemo<CoursePerformanceData[]>(() => {
    return courses.map((course) => {
      // Alunos matriculados neste curso
      const courseStudents = students.filter((s) => s.courseId === course.id)
      const studentIds = new Set(courseStudents.map((s) => s.id))

      // Cobranças deste curso (pelo studentId do aluno)
      const courseCharges = charges.filter((c) => studentIds.has(c.studentId))
      const paidCourseCharges = courseCharges.filter((c) => c.status === 'pago')
      const overdueCourseCharges = courseCharges.filter((c) => c.status === 'atrasado')

      const revenue = paidCourseCharges.reduce((acc, c) => acc + c.amount, 0)
      const pendingAmount = overdueCourseCharges.reduce((acc, c) => acc + c.amount, 0)
      const totalBilled = courseCharges.reduce((acc, c) => acc + c.amount, 0)

      const defaultRate = totalBilled > 0 ? (pendingAmount / totalBilled) * 100 : 0
      const enrolled = course.enrolledCount || courseStudents.length
      const vacancies = course.vacancies || 1
      const occupancyRate = (enrolled / vacancies) * 100
      const ticketMedio = paidCourseCharges.length > 0 ? revenue / paidCourseCharges.length : 0

      return {
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        level: course.level,
        modality: course.modality,
        vacancies,
        enrolledStudents: enrolled,
        occupancyRate,
        revenue,
        pendingAmount,
        defaultRate,
        ticketMedio,
      }
    })
  }, [courses, students, charges])

  // Gráfico: Receita por categoria
  const categoriesChartData = useMemo(() => {
    const paid = currentCharges.filter((c) => c.status === 'pago')
    const grouped: Record<string, { amount: number; count: number }> = {}

    for (const c of paid) {
      const cat = c.category || 'outros'
      if (!grouped[cat]) grouped[cat] = { amount: 0, count: 0 }
      grouped[cat].amount += c.amount
      grouped[cat].count += 1
    }

    const totalRev = currentMetrics.receita || 1
    return Object.entries(grouped)
      .map(([catKey, val]) => ({
        category: catKey,
        label: CATEGORY_LABEL_MAP[catKey] || catKey,
        amount: val.amount,
        count: val.count,
        percentage: (val.amount / totalRev) * 100,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [currentCharges, currentMetrics.receita])

  // Gráfico: Evolução mensal (últimos 6 meses)
  const evolutionChartData = useMemo(() => {
    const monthsData: Record<string, { receitas: number; despesas: number; monthLabel: string }> =
      {}

    const now = new Date()
    // Generate last 6 months in chronological order
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      monthsData[key] = { receitas: 0, despesas: 0, monthLabel: label }
    }

    // Populate charges
    for (const c of charges) {
      if (c.status !== 'pago') continue
      const dateKey = (c.dueDate || '').slice(0, 7)
      if (monthsData[dateKey]) {
        monthsData[dateKey].receitas += c.amount
      }
    }

    // Populate expenses
    for (const e of expenses) {
      if (e.status !== 'pago') continue
      const dateKey = (e.date || '').slice(0, 7)
      if (monthsData[dateKey]) {
        monthsData[dateKey].despesas += e.amount
      }
    }

    return Object.entries(monthsData).map(([key, item]) => ({
      monthKey: key,
      monthLabel: item.monthLabel,
      receitas: item.receitas,
      despesas: item.despesas,
      lucro: item.receitas - item.despesas,
    }))
  }, [charges, expenses])

  // Regras de negócio gerenciais automáticas (Insights para apoio à decisão)
  const insights = useMemo<DecisionInsight[]>(() => {
    const list: DecisionInsight[] = []

    // 1. Inadimplência
    if (currentMetrics.defaultRate > 10) {
      list.push({
        type: 'danger',
        title: `Inadimplência Crítica: ${currentMetrics.defaultRate.toFixed(1)}%`,
        message: `O índice de cobranças vencidas ultrapassa a meta prudencial de 5%. No período, há R$ ${currentCharges
          .filter((c) => c.status === 'atrasado')
          .reduce((a, b) => a + b.amount, 0)
          .toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em atraso.`,
        actionHint: 'Ativar réguas automatizadas de cobrança Pix e renegociação parcelada.',
      })
    } else if (deltas.defaultRate > 2) {
      list.push({
        type: 'warning',
        title: `Inadimplência em Alta (+${deltas.defaultRate.toFixed(1)} p.p.)`,
        message: `Houve aumento da inadimplência em relação ao período anterior (${prevMetrics.defaultRate.toFixed(1)}% para ${currentMetrics.defaultRate.toFixed(1)}%).`,
        actionHint: 'Acompanhar vencimentos da primeira quinzena do mês.',
      })
    } else {
      list.push({
        type: 'success',
        title: `Inadimplência sob Controle: ${currentMetrics.defaultRate.toFixed(1)}%`,
        message:
          'A carteira de recebíveis mantém índices saudáveis de liquidação dentro do vencimento.',
      })
    }

    // 2. Lucratividade / Margem
    const margem =
      currentMetrics.receita > 0 ? (currentMetrics.lucro / currentMetrics.receita) * 100 : 0
    if (currentMetrics.lucro < 0) {
      list.push({
        type: 'danger',
        title: 'Resultado Operacional Negativo no Período',
        message: `As despesas líquidas (R$ ${currentMetrics.despesas.toLocaleString('pt-BR')}) superaram a arrecadação (R$ ${currentMetrics.receita.toLocaleString('pt-BR')}).`,
        actionHint: 'Rever custos operacionais fixos e antecipar captação de novas turmas.',
      })
    } else {
      list.push({
        type: 'success',
        title: `Margem Operacional Líquida de ${margem.toFixed(1)}%`,
        message: `Superávit financeiro de R$ ${currentMetrics.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerado a partir das mensalidades recebidas.`,
      })
    }

    // 3. Cursos com baixa ocupação (<50%)
    const lowOccupancyCourses = coursePerformance.filter((c) => c.occupancyRate < 50)
    if (lowOccupancyCourses.length > 0) {
      list.push({
        type: 'warning',
        title: `${lowOccupancyCourses.length} Curso(s) com Ocupação Baixa (&lt;50%)`,
        message: `Cursos como ${lowOccupancyCourses
          .map((c) => c.courseName)
          .slice(0, 2)
          .join(', ')} estão operando com capacidade ociosa relevante.`,
        actionHint: 'Intensificar campanhas de vestibular ou unificar turmas presenciais.',
      })
    }

    // 4. Curso de destaque em receita
    const topRevenueCourse = [...coursePerformance].sort((a, b) => b.revenue - a.revenue)[0]
    if (topRevenueCourse && topRevenueCourse.revenue > 0) {
      list.push({
        type: 'info',
        title: `Maior Faturamento: ${topRevenueCourse.courseName}`,
        message: `O curso responde por R$ ${topRevenueCourse.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} da arrecadação com ${topRevenueCourse.enrolledStudents} alunos matriculados.`,
      })
    }

    return list
  }, [currentMetrics, deltas, prevMetrics, currentCharges, coursePerformance])

  // Prepara payload compartilhado de exportação Financeiro
  const getFinanceiroExportPayload = (): ReportExportPayload => {
    return {
      portalName: 'PortalCursos.NG',
      periodLabel,
      periodKey: period,
      generatedAt: new Date(),
      generatedBy: {
        name: currentUser?.name || 'Administrador',
        roleTitle: currentUser?.roleTitle || 'Gestor',
        email: currentUser?.email || 'admin@portalcursos.ng',
      },
      kpis: currentMetrics,
      courses: coursePerformance,
      categoriesChartData,
      evolutionChartData,
    }
  }

  // Prepara payload compartilhado de exportação Matrículas e Alunos
  const getMatriculasExportPayload = (): MatriculasReportExportPayload => {
    return {
      portalName: 'PortalCursos.NG',
      periodLabel,
      periodKey: period,
      generatedAt: new Date(),
      generatedBy: {
        name: currentUser?.name || 'Administrador',
        roleTitle: currentUser?.roleTitle || 'Gestor',
        email: currentUser?.email || 'admin@portalcursos.ng',
      },
      kpis: matriculasKpis,
      coursesDistribution: studentCoursesDistribution,
      evolutionChartData: enrollmentEvolution,
      statusChartData: studentStatusChartData,
      detailedStudents: students.map((s) => {
        const c = courses.find((item) => item.id === s.courseId)
        return {
          id: s.id,
          fullName: s.fullName,
          cpf: s.cpf,
          email: s.email,
          courseName: c?.name || s.courseName || '—',
          type: s.type,
          status: s.status,
          enrolledAt: s.enrolledAt,
          createdAt: s.createdAt || s.created,
        }
      }),
    }
  }

  // Handler para exportação em CSV (contextual da aba ativa)
  const handleExportCsv = () => {
    if (!canExport) {
      toast({
        title: 'Acesso negado',
        description:
          'Seu perfil de acesso não possui permissão para exportar relatórios gerenciais.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsExportingCsv(true)
      if (activeTab === 'matriculas') {
        const payload = getMatriculasExportPayload()
        exportMatriculasReportToCsv(payload)
        toast({
          title: 'Exportação CSV de Matrículas concluída',
          description: `Planilha de Matrículas e Alunos gerada com sucesso para "${periodLabel}". Compatível com Excel.`,
        })
      } else {
        const payload = getFinanceiroExportPayload()
        exportReportToCsv(payload)
        toast({
          title: 'Exportação CSV Financeiro concluída',
          description: `Planilha Financeira gerada com sucesso para "${periodLabel}". Compatível com Excel.`,
        })
      }
    } catch (err) {
      console.error('Erro ao exportar CSV:', err)
      toast({
        title: 'Erro na exportação CSV',
        description: 'Não foi possível gerar a planilha no momento.',
        variant: 'destructive',
      })
    } finally {
      setIsExportingCsv(false)
    }
  }

  // Handler para exportação em PDF (contextual da aba ativa)
  const handleExportPdf = () => {
    if (!canExport) {
      toast({
        title: 'Acesso negado',
        description:
          'Seu perfil de acesso não possui permissão para exportar relatórios gerenciais.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsExportingPdf(true)
      if (activeTab === 'matriculas') {
        const payload = getMatriculasExportPayload()
        exportMatriculasReportToPdf(payload)
        toast({
          title: 'Relatório PDF de Matrículas gerado',
          description: `Janela de impressão e download de Matrículas e Alunos aberta para o período "${periodLabel}".`,
        })
      } else {
        const payload = getFinanceiroExportPayload()
        exportReportToPdf(payload)
        toast({
          title: 'Relatório PDF Financeiro gerado',
          description: `Janela de impressão e download financeiro aberta para o período "${periodLabel}".`,
        })
      }
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast({
        title: 'Erro na exportação PDF',
        description: 'Não foi possível formatar o documento PDF para impressão.',
        variant: 'destructive',
      })
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-sky-100 text-sky-800">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Relatórios Gerenciais & Apoio à Decisão
              </h1>
              <p className="text-xs text-slate-500">
                Painel analítico integrado com relatórios Financeiros e de Matrículas & Alunos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">Período:</span>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-[170px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month" className="text-xs">
                  Mês Atual
                </SelectItem>
                <SelectItem value="last_month" className="text-xs">
                  Mês Anterior
                </SelectItem>
                <SelectItem value="last_30_days" className="text-xs">
                  Últimos 30 Dias
                </SelectItem>
                <SelectItem value="current_year" className="text-xs">
                  Este Ano (2025)
                </SelectItem>
                <SelectItem value="all_time" className="text-xs">
                  Histórico Completo
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botões de Exportação protegidos por RBAC (root, admin, financeiro) */}
          {canExport && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={isExportingCsv}
                className="h-9 gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                title={`Exportar planilha CSV de ${activeTab === 'matriculas' ? 'Matrículas e Alunos' : 'Financeiro'} (BOM UTF-8)`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isExportingCsv ? 'Exportando...' : 'Exportar CSV'}</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="h-9 gap-1.5 text-xs font-medium bg-sky-700 hover:bg-sky-800 text-white shadow-xs"
                title={`Exportar relatório PDF de ${activeTab === 'matriculas' ? 'Matrículas e Alunos' : 'Financeiro'}`}
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>{isExportingPdf ? 'Gerando...' : 'Exportar PDF'}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ABAS DE RELATÓRIO: FINANCEIRO vs MATRÍCULAS E ALUNOS */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'financeiro' | 'matriculas')}
        className="w-full space-y-6"
      >
        <TabsList className="bg-slate-100/90 p-1 border border-slate-200/80 rounded-lg">
          <TabsTrigger
            value="financeiro"
            className="text-xs font-medium gap-1.5 data-[state=active]:bg-white data-[state=active]:text-sky-800 data-[state=active]:shadow-xs"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Relatório Financeiro & Despesas</span>
          </TabsTrigger>
          <TabsTrigger
            value="matriculas"
            className="text-xs font-medium gap-1.5 data-[state=active]:bg-white data-[state=active]:text-sky-800 data-[state=active]:shadow-xs"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Matrículas e Alunos</span>
            <span className="ml-1 bg-sky-100 text-sky-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              Novo
            </span>
          </TabsTrigger>
        </TabsList>

        {/* CONTEÚDO DA ABA 1: FINANCEIRO */}
        <TabsContent value="financeiro" className="space-y-6 mt-0">
          {/* 1. SEÇÃO DE KPIS (Visão Geral) */}
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-700" />
                Visão Geral dos Indicadores Chave ({periodLabel})
              </h2>
              <span className="text-xs text-slate-400">
                Comparação base: <strong className="text-slate-600">{prevPeriodLabel}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Receita */}
              <KpiCard
                title="Receita Líquida"
                value={`R$ ${currentMetrics.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subValue={`${currentMetrics.paidCount} títulos pagos`}
                calculationExplanation="Soma do valor de todas as cobranças com status 'pago' liquidadas no período selecionado."
                delta={deltas.receita}
                deltaLabel={`vs. ${prevPeriodLabel}`}
                icon={DollarSign}
              />

              {/* Despesas */}
              <KpiCard
                title="Despesas Operacionais"
                value={`R$ ${currentMetrics.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subValue={`${currentExpenses.filter((e) => e.status === 'pago').length} lançamentos pagos`}
                calculationExplanation="Total de custos operacionais (folha, infraestrutura, tecnologia e serviços) liquidados no período."
                delta={deltas.despesas}
                deltaLabel={`vs. ${prevPeriodLabel}`}
                invertDeltaColor={true} // custo subindo é alerta
                icon={TrendingDown}
              />

              {/* Lucro */}
              <KpiCard
                title="Resultado / Lucro"
                value={`R$ ${currentMetrics.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subValue={`Margem: ${currentMetrics.receita > 0 ? ((currentMetrics.lucro / currentMetrics.receita) * 100).toFixed(1) : 0}%`}
                calculationExplanation="Receita líquida realizada subtraída das despesas operacionais pagas (Receita − Despesas)."
                delta={deltas.lucro}
                deltaLabel={`vs. ${prevPeriodLabel}`}
                icon={TrendingUp}
              />

              {/* Inadimplência */}
              <KpiCard
                title="Inadimplência"
                value={`${currentMetrics.defaultRate.toFixed(1)}%`}
                subValue={`${currentMetrics.overdueCount} títulos em atraso`}
                calculationExplanation="Percentual de cobranças vencidas/atrasadas sobre o montante total faturado no período (Vencidos ÷ Total Faturado × 100)."
                delta={deltas.defaultRate}
                deltaLabel={`p.p. vs. ${prevPeriodLabel}`}
                invertDeltaColor={true} // inadimplência subindo é ruim
                icon={Percent}
              />

              {/* Ticket Médio */}
              <KpiCard
                title="Ticket Médio"
                value={`R$ ${currentMetrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subValue="Por cobrança liquidada"
                calculationExplanation="Valor médio recebido por cobrança liquidada no período (Receita Total ÷ Quantidade de Cobranças Pagas)."
                delta={deltas.ticketMedio}
                deltaLabel={`vs. ${prevPeriodLabel}`}
                icon={CreditCard}
              />

              {/* Taxa de Ocupação */}
              <KpiCard
                title="Taxa de Ocupação"
                value={`${currentMetrics.occupancyRate.toFixed(1)}%`}
                subValue={`${currentMetrics.totalEnrolled} de ${currentMetrics.totalVacancies} vagas`}
                calculationExplanation="Percentual de vagas preenchidas nos cursos em relação à capacidade total autorizada (Total de Alunos ÷ Total de Vagas × 100)."
                delta={0}
                deltaLabel="Capacidade ativa"
                icon={Users}
              />
            </div>
          </section>

          {/* 2. SUGESTÕES / OBSERVAÇÕES PARA APOIO À DECISÃO */}
          <section>
            <DecisionInsights insights={insights} />
          </section>

          {/* 3. GRÁFICOS (Evolução + Distribuição por Categoria) */}
          <section>
            <FinancialCharts
              categoriesData={categoriesChartData}
              evolutionData={evolutionChartData}
            />
          </section>

          {/* 4. DESEMPENHO POR CURSO */}
          <section>
            <CoursePerformanceTable data={coursePerformance} />
          </section>

          {/* 5. GESTÃO DE DESPESAS (Com formulário real no banco) */}
          <section>
            <ExpenseManager
              expenses={currentExpenses}
              courses={courses}
              onAddExpense={addExpense}
              onDeleteExpense={deleteExpense}
              selectedPeriodLabel={periodLabel}
            />
          </section>
        </TabsContent>

        {/* CONTEÚDO DA ABA 2: MATRÍCULAS E ALUNOS */}
        <TabsContent value="matriculas" className="space-y-6 mt-0">
          <MatriculasAlunosSection
            kpis={matriculasKpis}
            coursesDistribution={studentCoursesDistribution}
            evolutionData={enrollmentEvolution}
            statusChartData={studentStatusChartData}
            students={students}
            periodLabel={periodLabel}
            prevPeriodLabel={prevPeriodLabel}
            newEnrollmentsInPrevPeriod={newEnrollmentsInPrevPeriod}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
