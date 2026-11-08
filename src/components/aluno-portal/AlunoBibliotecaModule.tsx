import React, { useState, useMemo } from 'react'
import { usePortal } from '@/context/PortalContext'
import { LibraryLoan } from '@/types/portal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  BookOpen,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Search,
  Library,
  Info,
  FileText,
  ShieldAlert,
} from 'lucide-react'

export interface AlunoBibliotecaModuleProps {
  initialSearch?: string
  initialTab?: 'acervo' | 'meus_emprestimos'
}

export function AlunoBibliotecaModule({
  initialSearch = '',
  initialTab = 'meus_emprestimos',
}: AlunoBibliotecaModuleProps = {}) {
  const {
    currentUser,
    students,
    libraryLoans,
    librarySettings,
    canRenewLoan,
    renewLibraryLoan,
    libraryBooks,
  } = usePortal()

  // Determina o ID do aluno associado ao usuário logado
  const currentStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
    ) || students[0]

  const effectiveStudentId = currentUser?.studentId || currentStudent?.id

  const [activeViewTab, setActiveViewTab] = useState<'acervo' | 'meus_emprestimos'>(initialTab)
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [acervoSearch, setAcervoSearch] = useState(initialSearch)
  const [selectedCategory, setSelectedCategory] = useState<string>('todos')
  const [loanToRenew, setLoanToRenew] = useState<LibraryLoan | null>(null)

  // Sincroniza busca inicial quando alterada externamente
  React.useEffect(() => {
    if (initialSearch) {
      setAcervoSearch(initialSearch)
      setSearchTerm(initialSearch)
      setActiveViewTab('acervo')
    }
  }, [initialSearch])

  React.useEffect(() => {
    if (initialTab) {
      setActiveViewTab(initialTab)
    }
  }, [initialTab])
  const [renewSubmitting, setRenewSubmitting] = useState(false)
  const [renewMessage, setRenewMessage] = useState<string | null>(null)

  // Empréstimos pertencentes estritamente a este aluno
  const myLoans = useMemo(() => {
    if (!effectiveStudentId) return []
    return libraryLoans.filter((l) => l.studentId === effectiveStudentId)
  }, [libraryLoans, effectiveStudentId])

  const filteredLoans = useMemo(() => {
    return myLoans.filter((l) => {
      const q = searchTerm.toLowerCase().trim()
      if (!q) return true
      return (
        (l.bookTitle && l.bookTitle.toLowerCase().includes(q)) ||
        (l.bookAuthor && l.bookAuthor.toLowerCase().includes(q))
      )
    })
  }, [myLoans, searchTerm])

  const activeLoans = myLoans.filter((l) => l.status === 'ativo')
  const overdueLoans = myLoans.filter((l) => l.status === 'atrasado')
  const returnedLoans = myLoans.filter((l) => l.status === 'devolvido')

  // Categorias disponíveis no acervo
  const categories = useMemo(() => {
    const set = new Set<string>()
    libraryBooks.forEach((b) => {
      if (b.category) set.add(b.category)
    })
    return Array.from(set).sort()
  }, [libraryBooks])

  // Filtragem de livros do acervo
  const filteredBooks = useMemo(() => {
    return libraryBooks.filter((book) => {
      if (selectedCategory !== 'todos' && book.category !== selectedCategory) {
        return false
      }
      const q = acervoSearch.toLowerCase().trim()
      if (!q) return true
      return (
        (book.title && book.title.toLowerCase().includes(q)) ||
        (book.author && book.author.toLowerCase().includes(q)) ||
        (book.isbn && book.isbn.toLowerCase().includes(q)) ||
        (book.category && book.category.toLowerCase().includes(q))
      )
    })
  }, [libraryBooks, acervoSearch, selectedCategory])

  const handleConfirmRenew = async () => {
    if (!loanToRenew) return
    setRenewSubmitting(true)
    setRenewMessage(null)
    try {
      const res = await renewLibraryLoan(loanToRenew.id, librarySettings.renewalDays || 7)
      if (res.success) {
        setRenewMessage(
          `Empréstimo renovado com sucesso por mais ${librarySettings.renewalDays || 7} dias!`,
        )
      } else {
        setRenewMessage(res.error || 'Não foi possível renovar o empréstimo.')
      }
      setLoanToRenew(null)
    } finally {
      setRenewSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Library className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Minha Biblioteca</h1>
          </div>
          <p className="text-xs text-slate-400">
            Acompanhe seus empréstimos físicos de livros, consulte prazos de devolução e solicite
            renovações online.
          </p>
        </div>
      </div>
      {renewMessage && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{renewMessage}</span>
          </div>
          <button
            onClick={() => setRenewMessage(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ×
          </button>
        </div>
      )}
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Livros em Mãos</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{activeLoans.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Empréstimos regulares ativos</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Empréstimos Atrasados</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">{overdueLoans.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Devolução pendente</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Histórico Devolvido</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{returnedLoans.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Obras já entregues</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Alerta de Atraso se houver */}
      {overdueLoans.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-slate-300">
            <p className="font-semibold text-rose-300">
              Atenção: Você possui {overdueLoans.length} empréstimo(s) com prazo de devolução
              vencido!
            </p>
            <p className="text-slate-400 leading-relaxed">
              Por favor, compareça à biblioteca da instituição para efetuar a devolução ou
              regularizar a renovação. Livros atrasados impedem novos empréstimos de materiais
              físicos.
            </p>
          </div>
        </div>
      )}
      {/* Abas: Meus Empréstimos vs Acervo Completo */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveViewTab('meus_emprestimos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeViewTab === 'meus_emprestimos'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Meus Empréstimos</span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${
              activeViewTab === 'meus_emprestimos'
                ? 'bg-blue-500/20 text-white border-blue-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {activeLoans.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('acervo')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeViewTab === 'acervo'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Library className="w-3.5 h-3.5" />
          <span>Consultar Acervo da Biblioteca</span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${
              activeViewTab === 'acervo'
                ? 'bg-blue-500/20 text-white border-blue-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {libraryBooks.length}
          </Badge>
        </button>
      </div>

      {activeViewTab === 'acervo' ? (
        /* Visão de Acervo */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={acervoSearch}
                onChange={(e) => setAcervoSearch(e.target.value)}
                placeholder="Buscar obras por título, autor, categoria..."
                className="pl-9 bg-slate-900 border-slate-800 text-xs text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="todos">Todas as Categorias ({libraryBooks.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <Card className="bg-slate-900/30 border-slate-800/80">
              <CardContent className="p-8 text-center space-y-2">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  Nenhuma obra encontrada no acervo
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Tente ajustar os termos de busca ou remover o filtro de categoria.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBooks.map((book) => {
                const isAvailable = (book.availableCopies || 0) > 0
                return (
                  <Card
                    key={book.id}
                    className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        {book.category && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 border-slate-700 text-slate-300 bg-slate-950"
                          >
                            {book.category}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-medium ml-auto ${
                            isAvailable
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {isAvailable
                            ? `${book.availableCopies} de ${book.totalCopies} disponível(is)`
                            : 'Esgotado'}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-2">{book.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          <span className="font-medium text-slate-300">{book.author}</span>
                          {book.year ? ` · ${book.year}` : ''}
                        </p>
                      </div>

                      {book.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {book.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1">
                        {book.publisher && <span>Ed: {book.publisher}</span>}
                        {book.isbn && <span className="font-mono text-[10px]">ISBN: {book.isbn}</span>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Visão de Meus Empréstimos */
        <div className="space-y-4">
          {/* Barra de busca */}
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título ou autor..."
                className="pl-9 bg-slate-900 border-slate-800 text-xs text-slate-200"
              />
            </div>
          </div>
        <Card className="bg-slate-900/30 border-slate-800/80">
          <CardContent className="p-8 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Nenhum empréstimo registrado no seu perfil
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Você não possui livros retirados no momento. Visite a biblioteca da instituição para
              consultar as mais de {libraryBooks.length} obras do acervo e realizar seu primeiro
              empréstimo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map((loan) => {
            const isReturned = !!loan.returnedAt
            const isOverdue = loan.status === 'atrasado'

            return (
              <Card
                key={loan.id}
                className={`bg-slate-900/60 border transition-all ${
                  isOverdue
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : isReturned
                      ? 'border-slate-800/80 opacity-75'
                      : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white line-clamp-1">
                        {loan.bookTitle}
                      </h3>
                      {isOverdue && (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] gap-1 font-semibold"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Prazo Vencido
                        </Badge>
                      )}
                      {loan.status === 'ativo' && (
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          Em Andamento
                        </Badge>
                      )}
                      {isReturned && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Devolvido
                        </Badge>
                      )}
                    </div>

                    {loan.bookAuthor && <p className="text-xs text-slate-400">{loan.bookAuthor}</p>}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Retirada: {loan.loanDate || '-'}
                      </span>
                      <span
                        className={`flex items-center gap-1 font-semibold ${
                          isOverdue ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        <Clock className="w-3 h-3 opacity-70" />
                        Devolução: {loan.dueDate}
                      </span>
                      {isReturned && (
                        <span className="text-emerald-400">Devolvido em: {loan.returnedAt}</span>
                      )}
                      {loan.renewals > 0 && (
                        <span className="text-slate-500">Renovações: {loan.renewals}x</span>
                      )}
                    </div>

                    {loan.notes && (
                      <p className="text-[11px] text-slate-500 italic flex items-center gap-1 pt-1">
                        <FileText className="w-3 h-3 text-slate-600 shrink-0" />
                        {loan.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 self-end sm:self-center shrink-0">
                    {!isReturned &&
                      (() => {
                        const check = canRenewLoan(loan)

                        if (check.allowed) {
                          return (
                            <div className="flex flex-col items-end gap-1">
                              <Button
                                size="sm"
                                onClick={() => setLoanToRenew(loan)}
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1.5 shadow-sm"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Renovar Prazo (+{librarySettings.renewalDays}d)
                              </Button>
                              <span className="text-[11px] text-blue-300 font-medium">
                                {check.message}
                              </span>
                            </div>
                          )
                        }

                        if (check.reason === 'atrasado') {
                          return (
                            <div className="flex flex-col items-end gap-1">
                              <Button
                                size="sm"
                                disabled
                                className="h-8 text-xs bg-slate-800 text-slate-500 cursor-not-allowed border border-rose-500/20"
                                title="Empréstimo atrasado, devolva primeiro"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mr-1" />
                                Renovação Indisponível
                              </Button>
                              <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Empréstimo atrasado, devolva primeiro
                              </span>
                            </div>
                          )
                        }

                        if (check.reason === 'limite_atingido') {
                          return (
                            <div className="flex flex-col items-end gap-1">
                              <Button
                                size="sm"
                                disabled
                                className="h-8 text-xs bg-slate-800 text-slate-500 cursor-not-allowed border border-amber-500/20"
                                title={`Limite de renovações atingido (${loan.renewals} de ${librarySettings.maxRenewals} usadas)`}
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 mr-1" />
                                Limite Atingido
                              </Button>
                              <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" />
                                {check.message}
                              </span>
                            </div>
                          )
                        }

                        return null
                      })()}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      {/* Regras e Orientações da Biblioteca */}
      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-400" />
            Orientações e Regulamento de Empréstimos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1 text-xs text-slate-400 space-y-1.5 leading-relaxed">
          <p>
            • O prazo padrão de empréstimo é de <strong>14 dias corridos</strong> a partir da data
            de retirada.
          </p>
          <p>
            • Cada renovação online estende o prazo em <strong>7 dias adicionais</strong>, desde que
            não haja reserva pendente de outro aluno.
          </p>
          <p>
            • A devolução dos exemplares físicos deve ser realizada presencialmente no balcão da
            biblioteca da unidade.
          </p>
        </CardContent>
      </Card>
      {/* Diálogo de Renovação do Aluno */}
      <AlertDialog open={!!loanToRenew} onOpenChange={(open) => !open && setLoanToRenew(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-white">
              Solicitar Renovação de Empréstimo
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-400 space-y-2">
              <p>
                Deseja prorrogar o prazo de devolução de{' '}
                <strong className="text-slate-200">"{loanToRenew?.bookTitle}"</strong> por mais{' '}
                <strong className="text-blue-300">{librarySettings.renewalDays} dias</strong>?
              </p>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div>
                  Data de devolução atual:{' '}
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
      </AlertDialog>{' '}
    </div>
  )
}
