import React, { useState, useMemo } from 'react'
import { usePortal } from '@/context/PortalContext'
import { LibraryLoan, LibraryLoanStatus } from '@/types/portal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Search,
  RotateCcw,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  Clock,
  AlertTriangle,
  History,
  AlertCircle,
  FileText,
  Settings2,
  ShieldAlert,
  Info,
  Mail,
  Send,
} from 'lucide-react'
import { portalDb } from '@/lib/portalDb'

interface BibliotecaEmprestimosTabProps {
  preSelectedBookId?: string | null
  onClearPreSelectedBook?: () => void
}

export function BibliotecaEmprestimosTab({
  preSelectedBookId,
  onClearPreSelectedBook,
}: BibliotecaEmprestimosTabProps) {
  const {
    libraryBooks,
    libraryLoans,
    librarySettings,
    updateLibrarySettings,
    canRenewLoan,
    currentUser,
    students,
    createLibraryLoan,
    returnLibraryLoan,
    renewLibraryLoan,
  } = usePortal()

  const canForceRenew = currentUser?.role === 'root' || currentUser?.role === 'admin'
  const canManageSettings =
    currentUser?.role === 'root' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretaria'

  // Modal de Configurações da Biblioteca
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsMaxRenewals, setSettingsMaxRenewals] = useState(librarySettings.maxRenewals)
  const [settingsRenewalDays, setSettingsRenewalDays] = useState(librarySettings.renewalDays)
  const [settingsLibraryEmail, setSettingsLibraryEmail] = useState(
    librarySettings.libraryEmail || 'biblioteca@portalcursos.ng',
  )
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)

  // Disparo manual de verificação de atrasados
  const [triggeringNotif, setTriggeringNotif] = useState(false)
  const [triggerResult, setTriggerResult] = useState<string | null>(null)

  // Sincroniza formulário de settings quando o contexto carregar
  React.useEffect(() => {
    setSettingsMaxRenewals(librarySettings.maxRenewals)
    setSettingsRenewalDays(librarySettings.renewalDays)
    setSettingsLibraryEmail(librarySettings.libraryEmail || 'biblioteca@portalcursos.ng')
  }, [librarySettings])

  // Diálogo de confirmação de Renovação Forçada (além do limite)
  const [forceRenewTarget, setForceRenewTarget] = useState<LibraryLoan | null>(null)
  const [forceRenewSubmitting, setForceRenewSubmitting] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | LibraryLoanStatus>('todos')

  // Modal Novo Empréstimo
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(!!preSelectedBookId)
  const [selectedBookId, setSelectedBookId] = useState(preSelectedBookId || '')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14) // Prazo padrão: 14 dias
    return d.toISOString().slice(0, 10)
  })
  const [notes, setNotes] = useState('')
  const [loanError, setLoanError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Diálogo de confirmação de Devolução
  const [loanToReturn, setLoanToReturn] = useState<LibraryLoan | null>(null)
  const [returnSubmitting, setReturnSubmitting] = useState(false)

  // Diálogo de confirmação de Renovação
  const [loanToRenew, setLoanToRenew] = useState<LibraryLoan | null>(null)
  const [renewSubmitting, setRenewSubmitting] = useState(false)

  // Sincroniza preSelectedBookId quando chega via prop
  React.useEffect(() => {
    if (preSelectedBookId) {
      setSelectedBookId(preSelectedBookId)
      setIsNewLoanOpen(true)
    }
  }, [preSelectedBookId])

  const filteredLoans = useMemo(() => {
    return libraryLoans.filter((loan) => {
      const q = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (loan.bookTitle && loan.bookTitle.toLowerCase().includes(q)) ||
        (loan.studentName && loan.studentName.toLowerCase().includes(q)) ||
        (loan.studentCpf && loan.studentCpf.toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'todos' || loan.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [libraryLoans, searchTerm, statusFilter])

  const activeLoansCount = libraryLoans.filter((l) => l.status === 'ativo').length
  const overdueLoansCount = libraryLoans.filter((l) => l.status === 'atrasado').length
  const returnedLoansCount = libraryLoans.filter((l) => l.status === 'devolvido').length

  const handleOpenNewLoan = () => {
    setSelectedBookId(preSelectedBookId || '')
    setSelectedStudentId('')
    const d = new Date()
    d.setDate(d.getDate() + 14)
    setDueDate(d.toISOString().slice(0, 10))
    setNotes('')
    setLoanError(null)
    setIsNewLoanOpen(true)
  }

  const handleCloseNewLoan = () => {
    setIsNewLoanOpen(false)
    if (onClearPreSelectedBook) onClearPreSelectedBook()
  }

  const handleCreateLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoanError(null)

    if (!selectedBookId) {
      setLoanError('Selecione a obra para empréstimo.')
      return
    }
    if (!selectedStudentId) {
      setLoanError('Selecione o aluno destinatário.')
      return
    }
    if (!dueDate) {
      setLoanError('Informe a data de devolução prevista.')
      return
    }

    const book = libraryBooks.find((b) => b.id === selectedBookId)
    if (book && book.availableCopies <= 0) {
      setLoanError(
        `A obra "${book.title}" não possui exemplares disponíveis no momento. Aguarde uma devolução.`,
      )
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createLibraryLoan({
        bookId: selectedBookId,
        studentId: selectedStudentId,
        dueDate,
        notes: notes.trim() || undefined,
      })

      if (!res.success) {
        setLoanError(res.error || 'Erro ao registrar empréstimo.')
        return
      }

      handleCloseNewLoan()
    } catch {
      setLoanError('Erro ao gravar empréstimo no banco.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmReturn = async () => {
    if (!loanToReturn) return
    setReturnSubmitting(true)
    try {
      await returnLibraryLoan(loanToReturn.id)
      setLoanToReturn(null)
    } finally {
      setReturnSubmitting(false)
    }
  }

  const handleConfirmRenew = async () => {
    if (!loanToRenew) return
    setRenewSubmitting(true)
    try {
      await renewLibraryLoan(loanToRenew.id, librarySettings.renewalDays || 7)
      setLoanToRenew(null)
    } finally {
      setRenewSubmitting(false)
    }
  }

  const handleConfirmForceRenew = async () => {
    if (!forceRenewTarget) return
    setForceRenewSubmitting(true)
    try {
      await renewLibraryLoan(forceRenewTarget.id, librarySettings.renewalDays || 7, { force: true })
      setForceRenewTarget(null)
    } finally {
      setForceRenewSubmitting(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsSaving(true)
    setSettingsMessage(null)
    try {
      const res = await updateLibrarySettings({
        maxRenewals: Number(settingsMaxRenewals),
        renewalDays: Number(settingsRenewalDays),
        libraryEmail: settingsLibraryEmail.trim() || 'biblioteca@portalcursos.ng',
      })
      if (res.success) {
        setSettingsMessage('Configurações da biblioteca salvas com sucesso!')
        setTimeout(() => {
          setIsSettingsOpen(false)
          setSettingsMessage(null)
        }, 1200)
      } else {
        setSettingsMessage(res.error || 'Erro ao salvar configurações.')
      }
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleTriggerNotifications = async () => {
    setTriggeringNotif(true)
    setTriggerResult(null)
    try {
      const res = await portalDb.triggerOverdueNotifications()
      if (res && res.success) {
        setTriggerResult(
          `Disparo concluído: ${res.sentCount} e-mails enviados, ${res.skippedCount} pulados (anti-spam / sem e-mail) de ${res.overdueCount} atrasados.`,
        )
      } else {
        setTriggerResult('Aviso disparado via servidor.')
      }
    } catch {
      setTriggerResult('Erro ao disparar rotina de e-mails.')
    } finally {
      setTriggeringNotif(false)
    }
  }

  const renderStatusBadge = (status: LibraryLoanStatus) => {
    switch (status) {
      case 'ativo':
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] gap-1"
          >
            <Clock className="w-3 h-3" />
            Em Andamento
          </Badge>
        )
      case 'atrasado':
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] gap-1 font-semibold"
          >
            <AlertTriangle className="w-3 h-3" />
            Atrasado
          </Badge>
        )
      case 'devolvido':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1"
          >
            <CheckCircle2 className="w-3 h-3" />
            Devolvido
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards dos Empréstimos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Empréstimos Ativos</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{activeLoansCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Dentro do prazo regular</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Empréstimos Atrasados</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">{overdueLoansCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Prazo expirado pendente</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Histórico de Devoluções</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{returnedLoansCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Obras devolvidas com sucesso</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <History className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtro e Ações */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por obra, aluno ou CPF..."
              className="pl-9 bg-slate-950/80 border-slate-800 text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            {(['todos', 'ativo', 'atrasado', 'devolvido'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-[11px] rounded capitalize transition-all ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s === 'todos' ? 'Todos' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManageSettings && (
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(true)}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs h-9 gap-1.5"
              title="Configurar limites de renovação da biblioteca"
            >
              <Settings2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Regras de Renovação</span>
              <span className="ml-1 px-1.5 py-0.2 rounded bg-slate-900 font-mono text-[10px] text-blue-300 border border-slate-700">
                {librarySettings.maxRenewals}x / +{librarySettings.renewalDays}d
              </span>
            </Button>
          )}

          <Button
            onClick={handleOpenNewLoan}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Novo Empréstimo
          </Button>
        </div>
      </div>

      {/* Tabela / Lista de Empréstimos */}
      {filteredLoans.length === 0 ? (
        <Card className="bg-slate-900/30 border-slate-800/80">
          <CardContent className="p-8 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Nenhum empréstimo encontrado</p>
            <p className="text-xs text-slate-500">
              {searchTerm || statusFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca para encontrar o registro.'
                : 'Nenhum empréstimo registrado até o momento. Clique em "Novo Empréstimo" para começar.'}
            </p>
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
                  <th className="py-3 px-4 font-semibold">Data Empréstimo</th>
                  <th className="py-3 px-4 font-semibold">Prazo Devolução</th>
                  <th className="py-3 px-4 font-semibold text-center">Renovações</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {filteredLoans.map((loan) => {
                  const isReturned = !!loan.returnedAt
                  return (
                    <tr key={loan.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white max-w-[240px] truncate">
                          {loan.bookTitle || 'Obra desconhecida'}
                        </div>
                        {loan.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[240px] italic flex items-center gap-1 mt-0.5">
                            <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                            {loan.notes}
                          </div>
                        )}
                      </td>

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

                      <td className="py-3 px-4 font-mono text-slate-400">{loan.loanDate || '-'}</td>

                      <td className="py-3 px-4">
                        <div
                          className={`font-mono font-medium flex items-center gap-1.5 ${
                            loan.status === 'atrasado'
                              ? 'text-rose-400 font-bold'
                              : loan.status === 'devolvido'
                                ? 'text-slate-500 line-through'
                                : 'text-slate-300'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span>{loan.dueDate}</span>
                        </div>
                        {isReturned && (
                          <div className="text-[10px] text-emerald-400/90 font-mono mt-0.5">
                            Devolvido em: {loan.returnedAt}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[11px] font-medium ${
                              loan.renewals >= librarySettings.maxRenewals
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-200'
                            }`}
                            title={`${loan.renewals} de ${librarySettings.maxRenewals} renovações utilizadas`}
                          >
                            {loan.renewals}/{librarySettings.maxRenewals}
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

                      <td className="py-3 px-4">{renderStatusBadge(loan.status)}</td>

                      <td className="py-3 px-4 text-right">
                        {(() => {
                          if (isReturned) {
                            return (
                              <span className="text-[11px] text-slate-500 font-medium italic">
                                Finalizado
                              </span>
                            )
                          }

                          const check = canRenewLoan(loan)

                          return (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {check.allowed ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLoanToRenew(loan)}
                                  className="h-7 px-2.5 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-blue-300 hover:text-white gap-1"
                                  title={`Renovar por mais ${librarySettings.renewalDays} dias (${check.renewalsLeft} restante${check.renewalsLeft === 1 ? '' : 's'})`}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Renovar (+{librarySettings.renewalDays}d)
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {check.reason === 'atrasado' && (
                                    <Badge
                                      variant="outline"
                                      className="bg-rose-500/10 text-rose-300 border-rose-500/30 text-[10px] h-6 px-2 gap-1 cursor-help"
                                      title="Empréstimo atrasado, devolva primeiro"
                                    >
                                      <AlertTriangle className="w-3 h-3 shrink-0 text-rose-400" />
                                      <span>Atrasado (bloqueado)</span>
                                    </Badge>
                                  )}

                                  {check.reason === 'limite_atingido' && (
                                    <>
                                      <Badge
                                        variant="outline"
                                        className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] h-6 px-2 gap-1 cursor-help"
                                        title={`Limite esgotado: ${loan.renewals} de ${librarySettings.maxRenewals} renovações usadas`}
                                      >
                                        <ShieldAlert className="w-3 h-3 shrink-0 text-amber-400" />
                                        <span>
                                          Limite atingido ({loan.renewals}/
                                          {librarySettings.maxRenewals})
                                        </span>
                                      </Badge>

                                      {canForceRenew && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setForceRenewTarget(loan)}
                                          className="h-7 px-2 text-[10px] border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 gap-1 font-semibold"
                                          title="Root/Admin: forçar renovação extra além do limite configurado"
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                          Forçar (+{librarySettings.renewalDays}d)
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}

                              <Button
                                size="sm"
                                onClick={() => setLoanToReturn(loan)}
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1 shadow-sm"
                                title="Registrar devolução"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Devolver
                              </Button>
                            </div>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Novo Empréstimo */}
      <Dialog open={isNewLoanOpen} onOpenChange={setIsNewLoanOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-white">Registrar Novo Empréstimo</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Selecione o livro disponível no acervo e o aluno que receberá a obra.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLoanSubmit} className="space-y-4 py-2">
            {loanError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loanError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Obra / Livro <span className="text-rose-400">*</span>
              </Label>
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Selecione uma obra do acervo...</option>
                {libraryBooks.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    disabled={b.availableCopies <= 0}
                    className={
                      b.availableCopies <= 0 ? 'text-slate-500 bg-slate-900' : 'text-white'
                    }
                  >
                    {b.title} — {b.author} ({b.availableCopies}/{b.totalCopies} disponíveis)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Aluno Destinatário <span className="text-rose-400">*</span>
              </Label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Selecione o aluno cadastrado...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} — CPF: {s.cpf} ({s.courseName})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Data Prevista de Devolução <span className="text-rose-400">*</span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs text-white max-w-[180px]"
                required
              />
              <p className="text-[11px] text-slate-500">
                O prazo padrão é de 14 dias a contar de hoje.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Observações (opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Exemplar com anotações na capa, retirada no balcão"
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseNewLoan}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
              >
                {isSubmitting ? 'Registrando...' : 'Confirmar Empréstimo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Devolução */}
      <AlertDialog open={!!loanToReturn} onOpenChange={(open) => !open && setLoanToReturn(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-white">
              Confirmar Devolução da Obra
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-400 space-y-2">
              <p>
                Deseja confirmar a devolução do livro{' '}
                <strong className="text-slate-200">"{loanToReturn?.bookTitle}"</strong> pelo aluno{' '}
                <strong className="text-slate-200">{loanToReturn?.studentName}</strong>?
              </p>
              <p className="text-[11px] text-emerald-400">
                O exemplar físico retornará imediatamente à disponibilidade do acervo.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={returnSubmitting}
              onClick={handleConfirmReturn}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              {returnSubmitting ? 'Gravando...' : 'Confirmar Devolução'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Renovação Padrão */}
      <AlertDialog open={!!loanToRenew} onOpenChange={(open) => !open && setLoanToRenew(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-white">
              Renovar Prazo de Empréstimo
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-400 space-y-2">
              <p>
                Deseja estender o prazo de devolução de{' '}
                <strong className="text-slate-200">"{loanToRenew?.bookTitle}"</strong> por mais{' '}
                <strong className="text-blue-300">{librarySettings.renewalDays} dias</strong>?
              </p>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div>
                  Prazo atual:{' '}
                  <span className="font-mono font-semibold text-slate-100">
                    {loanToRenew?.dueDate}
                  </span>
                </div>
                <div>
                  Renovações utilizadas:{' '}
                  <span className="font-mono font-semibold text-blue-300">
                    {loanToRenew?.renewals || 0} de {librarySettings.maxRenewals}
                  </span>
                </div>
                {loanToRenew?.renewalHistory && loanToRenew.renewalHistory.length > 0 && (
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    Última renovação:{' '}
                    {loanToRenew.renewalHistory[loanToRenew.renewalHistory.length - 1].slice(0, 10)}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={renewSubmitting}
              onClick={handleConfirmRenew}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              {renewSubmitting
                ? 'Renovando...'
                : `Confirmar Renovação (+${librarySettings.renewalDays}d)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Renovação Forçada (Root / Admin) */}
      <AlertDialog
        open={!!forceRenewTarget}
        onOpenChange={(open) => !open && setForceRenewTarget(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-amber-500/30 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Forçar Renovação Extra (Privilégio Root/Admin)
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-300 space-y-2">
              <p>
                O empréstimo da obra{' '}
                <strong className="text-white">"{forceRenewTarget?.bookTitle}"</strong> para o aluno{' '}
                <strong className="text-white">{forceRenewTarget?.studentName}</strong> já atingiu o
                limite de{' '}
                <strong className="text-amber-300">{librarySettings.maxRenewals} renovações</strong>{' '}
                (usadas: {forceRenewTarget?.renewals}).
              </p>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
                <p className="font-semibold text-amber-300">Confirmação explícita de exceção:</p>
                <p className="text-[11px] text-amber-200/90">
                  Esta ação concederá mais <strong>{librarySettings.renewalDays} dias</strong> a
                  partir do prazo atual ({forceRenewTarget?.dueDate}), registrando a exceção no
                  histórico.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={forceRenewSubmitting}
              onClick={handleConfirmForceRenew}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
            >
              {forceRenewSubmitting
                ? 'Gravando exceção...'
                : `Sim, Forçar Renovação (+${librarySettings.renewalDays}d)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Configuração de Regras de Renovação */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-400" />
              Regras de Renovação de Empréstimos
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Defina as políticas globais de empréstimos da biblioteca. As regras são aplicadas
              tanto na gestão administrativa quanto no portal do aluno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSettings} className="space-y-4 py-2">
            {settingsMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  settingsMessage.includes('sucesso')
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                }`}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>{settingsMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-200">
                Limite Máximo de Renovações por Empréstimo
              </Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={settingsMaxRenewals}
                onChange={(e) => setSettingsMaxRenewals(Number(e.target.value))}
                className="bg-slate-950 border-slate-800 text-xs text-white"
                required
              />
              <p className="text-[11px] text-slate-500">
                Padrão recomendado: 2 vezes. Zero desativa renovações regulares.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-200">Dias Adicionados por Renovação</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={settingsRenewalDays}
                onChange={(e) => setSettingsRenewalDays(Number(e.target.value))}
                className="bg-slate-950 border-slate-800 text-xs text-white"
                required
              />
              <p className="text-[11px] text-slate-500">
                Padrão recomendado: 7 dias por ciclo de renovação.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                E-mail da Biblioteca (Cópia dos Avisos de Atraso)
              </Label>
              <Input
                type="email"
                value={settingsLibraryEmail}
                onChange={(e) => setSettingsLibraryEmail(e.target.value)}
                placeholder="biblioteca@portalcursos.ng"
                className="bg-slate-950 border-slate-800 text-xs text-white"
                required
              />
              <p className="text-[11px] text-slate-500">
                Endereço que recebe cópia institucional e atua como remetente dos alertas
                automáticos.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200 space-y-1.5">
              <p className="font-semibold text-blue-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Aviso Automático de Atraso:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                <li>Rotina cron diária automática no servidor (08:00 UTC).</li>
                <li>Envia para o e-mail do aluno e para o e-mail da biblioteca.</li>
                <li>Anti-spam: no máximo 1 e-mail por empréstimo por dia.</li>
              </ul>
              <div className="pt-2 border-t border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">Deseja forçar verificação agora?</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleTriggerNotifications}
                  disabled={triggeringNotif}
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/20 text-[11px] h-7 gap-1"
                >
                  <Send className="w-3 h-3" />
                  {triggeringNotif ? 'Verificando...' : 'Testar Envio Agora'}
                </Button>
              </div>
              {triggerResult && (
                <p className="text-[11px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                  {triggerResult}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSettingsOpen(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Fechar
              </Button>
              <Button
                type="submit"
                disabled={settingsSaving}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
              >
                {settingsSaving ? 'Salvando...' : 'Salvar Regras'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
