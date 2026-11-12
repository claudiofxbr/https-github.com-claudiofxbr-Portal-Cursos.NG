import React, { useState, useMemo, useEffect } from 'react'
import { usePortal } from '@/context/PortalContext'
import { LibraryLoan } from '@/types/portal'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Search,
  Calendar,
  User,
  BookOpen,
  FileText,
  Clock,
  RotateCcw,
  X,
  Filter,
} from 'lucide-react'

export type DevolucaoPeriodFilter = 'todos' | '30dias' | 'mes_atual' | 'mes_anterior' | 'ano_atual'

// LGPD (minimização): filtros podem conter o ID do aluno e termo de busca por
// nome/CPF — ficam em sessionStorage (encerram com a aba/sessão), nunca em
// localStorage persistente.
const STORAGE_KEY_STUDENT = 'portalcursos_biblioteca_historico_student'
const STORAGE_KEY_PERIOD = 'portalcursos_biblioteca_historico_period'
const STORAGE_KEY_DELAY = 'portalcursos_biblioteca_historico_delay_only'
const STORAGE_KEY_SEARCH = 'portalcursos_biblioteca_historico_search'

export function BibliotecaHistoricoDevolucoesTab() {
  const { libraryLoans, students } = usePortal()

  // Filtros em sessionStorage: sobrevivem ao F5, mas não a sessões futuras
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_SEARCH) || ''
    } catch {
      return ''
    }
  })

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_STUDENT) || 'todos'
    } catch {
      return 'todos'
    }
  })

  const [periodFilter, setPeriodFilter] = useState<DevolucaoPeriodFilter>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_PERIOD)
      if (
        saved === 'todos' ||
        saved === '30dias' ||
        saved === 'mes_atual' ||
        saved === 'mes_anterior' ||
        saved === 'ano_atual'
      ) {
        return saved as DevolucaoPeriodFilter
      }
      return 'todos'
    } catch {
      return 'todos'
    }
  })

  const [onlyOverdueReturned, setOnlyOverdueReturned] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_DELAY) === 'true'
    } catch {
      return false
    }
  })

  // Efeitos para persistência automática
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_SEARCH, searchTerm)
    } catch {
      // noop
    }
  }, [searchTerm])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_STUDENT, selectedStudentId)
    } catch {
      // noop
    }
  }, [selectedStudentId])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_PERIOD, periodFilter)
    } catch {
      // noop
    }
  }, [periodFilter])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_DELAY, String(onlyOverdueReturned))
    } catch {
      // noop
    }
  }, [onlyOverdueReturned])

  // Limpa todos os filtros
  const handleClearFilters = () => {
    setSearchTerm('')
    setSelectedStudentId('todos')
    setPeriodFilter('todos')
    setOnlyOverdueReturned(false)
  }

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedStudentId !== 'todos' ||
    periodFilter !== 'todos' ||
    onlyOverdueReturned

  // Todos os empréstimos devolvidos (returnedAt preenchido)
  const allReturnedLoans = useMemo(() => {
    return libraryLoans.filter((l) => Boolean(l.returnedAt && l.returnedAt.trim().length > 0))
  }, [libraryLoans])

  // Helper de cálculo de datas e atraso
  const getLoanMetrics = (loan: LibraryLoan) => {
    const loanDateStr = loan.loanDate || loan.created?.slice(0, 10) || ''
    const dueDateStr = loan.dueDate || ''
    const returnedDateStr = loan.returnedAt || ''

    let durationDays = 0
    if (loanDateStr && returnedDateStr) {
      const dStart = new Date(loanDateStr + 'T00:00:00')
      const dEnd = new Date(returnedDateStr + 'T00:00:00')
      const diffMs = dEnd.getTime() - dStart.getTime()
      durationDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
    }

    let isLate = false
    let delayDays = 0
    if (dueDateStr && returnedDateStr) {
      const dDue = new Date(dueDateStr + 'T00:00:00')
      const dRet = new Date(returnedDateStr + 'T00:00:00')
      if (dRet > dDue) {
        isLate = true
        delayDays = Math.max(
          1,
          Math.round((dRet.getTime() - dDue.getTime()) / (1000 * 60 * 60 * 24)),
        )
      }
    }

    return {
      loanDateStr,
      dueDateStr,
      returnedDateStr,
      durationDays,
      isLate,
      delayDays,
    }
  }

  // Filtragem
  const filteredLoans = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed

    // Limites de período calculados sobre returnedAt
    let filterStart: Date | null = null
    let filterEnd: Date | null = null

    if (periodFilter === '30dias') {
      filterEnd = new Date(now)
      filterEnd.setHours(23, 59, 59, 999)
      filterStart = new Date(now)
      filterStart.setDate(filterStart.getDate() - 30)
      filterStart.setHours(0, 0, 0, 0)
    } else if (periodFilter === 'mes_atual') {
      filterStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0)
      filterEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    } else if (periodFilter === 'mes_anterior') {
      filterStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0)
      filterEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)
    } else if (periodFilter === 'ano_atual') {
      filterStart = new Date(currentYear, 0, 1, 0, 0, 0, 0)
      filterEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999)
    }

    return allReturnedLoans
      .filter((loan) => {
        // Filtro por texto (título, autor, aluno, cpf)
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim()
          const matchTitle = loan.bookTitle?.toLowerCase().includes(q)
          const matchAuthor = loan.bookAuthor?.toLowerCase().includes(q)
          const matchStudent = loan.studentName?.toLowerCase().includes(q)
          const matchCpf = loan.studentCpf?.toLowerCase().includes(q)
          if (!matchTitle && !matchAuthor && !matchStudent && !matchCpf) {
            return false
          }
        }

        // Filtro por aluno
        if (selectedStudentId !== 'todos') {
          if (loan.studentId !== selectedStudentId) {
            return false
          }
        }

        // Filtro por período de devolução
        if (filterStart && filterEnd && loan.returnedAt) {
          const retDate = new Date(loan.returnedAt + 'T12:00:00')
          if (retDate < filterStart || retDate > filterEnd) {
            return false
          }
        }

        // Filtro só atrasados
        if (onlyOverdueReturned) {
          const { isLate } = getLoanMetrics(loan)
          if (!isLate) return false
        }

        return true
      })
      .sort((a, b) => {
        // Ordena decrescente por data de devolução (mais recentes primeiro)
        const dateA = a.returnedAt || ''
        const dateB = b.returnedAt || ''
        return dateB.localeCompare(dateA)
      })
  }, [allReturnedLoans, searchTerm, selectedStudentId, periodFilter, onlyOverdueReturned])

  // Métricas do resumo baseadas nos itens filtrados
  const summaryMetrics = useMemo(() => {
    let totalLate = 0
    let totalOnTime = 0
    let totalDurationDays = 0

    filteredLoans.forEach((loan) => {
      const m = getLoanMetrics(loan)
      if (m.isLate) totalLate += 1
      else totalOnTime += 1
      totalDurationDays += m.durationDays
    })

    const avgDurationDays =
      filteredLoans.length > 0 ? Math.round(totalDurationDays / filteredLoans.length) : 0

    return {
      total: filteredLoans.length,
      totalLate,
      totalOnTime,
      avgDurationDays,
      latePercentage:
        filteredLoans.length > 0 ? Math.round((totalLate / filteredLoans.length) * 100) : 0,
    }
  }, [filteredLoans])

  return (
    <div className="space-y-6">
      {/* Cards Resumo / KPIs de Devoluções */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Devoluções Concluídas</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{summaryMetrics.total}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {periodFilter === 'todos' ? 'Todo o período' : 'No recorte filtrado'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Devolvidos com Atraso</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-rose-400">{summaryMetrics.totalLate}</p>
                {summaryMetrics.total > 0 && (
                  <span className="text-xs font-semibold text-rose-400/90 font-mono">
                    ({summaryMetrics.latePercentage}%)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Entregues após a data de vencimento
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Devoluções Pontuais</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{summaryMetrics.totalOnTime}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Entregues dentro do prazo regular</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Tempo Médio com Aluno</p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-2xl font-bold text-indigo-400">
                  {summaryMetrics.avgDurationDays}
                </p>
                <span className="text-xs text-slate-400 font-medium">dias</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Duração média do empréstimo</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca Persistidos */}
      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Campo de Busca textual */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por obra, autor, aluno ou CPF..."
              className="pl-9 bg-slate-950/80 border-slate-800 text-xs text-slate-200"
            />
          </div>

          {/* Seletores de Aluno e Período */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Aluno */}
            <div className="flex items-center gap-1.5 min-w-[200px]">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full h-9 px-2.5 rounded-md bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="todos">Todos os Alunos</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} {st.cpf ? `(${st.cpf})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Período */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as DevolucaoPeriodFilter)}
                className="h-9 px-2.5 rounded-md bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="todos">Todo o Histórico</option>
                <option value="30dias">Últimos 30 Dias</option>
                <option value="mes_atual">Mês Atual</option>
                <option value="mes_anterior">Mês Anterior</option>
                <option value="ano_atual">Ano Atual</option>
              </select>
            </div>

            {/* Toggle de Apenas com Atraso */}
            <button
              type="button"
              onClick={() => setOnlyOverdueReturned((prev) => !prev)}
              className={`h-9 px-3 rounded-md text-xs border flex items-center gap-1.5 transition-all ${
                onlyOverdueReturned
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-medium'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Apenas com atraso</span>
            </button>

            {/* Botão limpar filtros */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 px-2.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 gap-1"
                title="Limpar todos os filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Indicador de persistência e quantidade */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
          <span className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Exibindo <strong>{filteredLoans.length}</strong> de{' '}
            <strong>{allReturnedLoans.length}</strong> devoluções registradas
          </span>
          <span className="text-slate-500 italic">
            Filtros salvos automaticamente neste navegador.
          </span>
        </div>
      </div>

      {/* Lista / Tabela do Histórico de Devoluções */}
      {filteredLoans.length === 0 ? (
        <Card className="bg-slate-900/30 border-slate-800/80">
          <CardContent className="p-8 text-center space-y-2">
            <History className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma devolução encontrada</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Nenhum registro corresponde aos filtros selecionados. Tente limpar os filtros ou selecionar outro período.'
                : 'Nenhum empréstimo foi devolvido até o momento no sistema da biblioteca.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200 mt-2"
              >
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Obra</th>
                  <th className="py-3 px-4 font-semibold">Aluno</th>
                  <th className="py-3 px-4 font-semibold">Empréstimo</th>
                  <th className="py-3 px-4 font-semibold">Prazo Previsto</th>
                  <th className="py-3 px-4 font-semibold">Data da Devolução</th>
                  <th className="py-3 px-4 font-semibold text-center">Duração</th>
                  <th className="py-3 px-4 font-semibold text-center">Renovações</th>
                  <th className="py-3 px-4 font-semibold text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {filteredLoans.map((loan) => {
                  const {
                    loanDateStr,
                    dueDateStr,
                    returnedDateStr,
                    durationDays,
                    isLate,
                    delayDays,
                  } = getLoanMetrics(loan)

                  return (
                    <tr key={loan.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Obra */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white max-w-[220px] truncate">
                          {loan.bookTitle || 'Obra não identificada'}
                        </div>
                        {loan.bookAuthor && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {loan.bookAuthor}
                          </div>
                        )}
                        {loan.notes && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[220px] italic flex items-center gap-1 mt-0.5">
                            <FileText className="w-3 h-3 text-slate-600 shrink-0" />
                            {loan.notes}
                          </div>
                        )}
                      </td>

                      {/* Aluno */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{loan.studentName || 'Aluno'}</span>
                        </div>
                        {loan.studentCpf && (
                          <div className="text-[11px] font-mono text-slate-500 ml-5">
                            CPF: {loan.studentCpf}
                          </div>
                        )}
                      </td>

                      {/* Data de Empréstimo */}
                      <td className="py-3 px-4 font-mono text-slate-400">{loanDateStr || '-'}</td>

                      {/* Prazo Previsto de Vencimento */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{dueDateStr || '-'}</span>
                        </div>
                      </td>

                      {/* Data Efetiva de Devolução */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{returnedDateStr || '-'}</span>
                        </div>
                      </td>

                      {/* Duração do Empréstimo */}
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                          {durationDays} {durationDays === 1 ? 'dia' : 'dias'}
                        </span>
                      </td>

                      {/* Renovações Utilizadas */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                            {loan.renewals || 0}x
                          </span>
                          {loan.renewalHistory && loan.renewalHistory.length > 0 && (
                            <span
                              className="text-[10px] text-slate-400 font-mono mt-0.5"
                              title={`Histórico: ${loan.renewalHistory
                                .map((d) => d.slice(0, 10))
                                .join(', ')}`}
                            >
                              Última:{' '}
                              {loan.renewalHistory[loan.renewalHistory.length - 1].slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status / Atraso Badge */}
                      <td className="py-3 px-4 text-right">
                        {isLate ? (
                          <div className="inline-flex flex-col items-end gap-0.5">
                            <Badge
                              variant="outline"
                              className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px] gap-1 font-semibold"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Devolvido com Atraso
                            </Badge>
                            <span className="text-[10px] font-mono text-rose-400 font-medium">
                              +{delayDays} {delayDays === 1 ? 'dia de atraso' : 'dias de atraso'}
                            </span>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-medium"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            No Prazo
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
