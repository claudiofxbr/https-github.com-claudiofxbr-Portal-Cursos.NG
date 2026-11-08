import React, { useState, useMemo } from 'react'
import { usePortal } from '@/context/PortalContext'
import { LibraryBook } from '@/types/portal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  BookmarkCheck,
  AlertCircle,
  Hash,
  User,
  CheckCircle2,
} from 'lucide-react'

interface BibliotecaAcervoTabProps {
  onPreSelectBookForLoan?: (bookId: string) => void
}

export function BibliotecaAcervoTab({ onPreSelectBookForLoan }: BibliotecaAcervoTabProps) {
  const { libraryBooks, createLibraryBook, updateLibraryBook, deleteLibraryBook, libraryLoans } =
    usePortal()

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todas')

  // Modais de Criação / Edição
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    year: '',
    category: '',
    description: '',
    totalCopies: 1,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Diálogo de confirmação de exclusão
  const [bookToDelete, setBookToDelete] = useState<LibraryBook | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const categories = useMemo(() => {
    const set = new Set<string>()
    libraryBooks.forEach((b) => {
      if (b.category && b.category.trim().length > 0) set.add(b.category)
    })
    return Array.from(set).sort()
  }, [libraryBooks])

  const filteredBooks = useMemo(() => {
    return libraryBooks.filter((book) => {
      const q = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.isbn && book.isbn.toLowerCase().includes(q)) ||
        (book.publisher && book.publisher.toLowerCase().includes(q))

      const matchesCat =
        categoryFilter === 'todas' ||
        (book.category && book.category.toLowerCase() === categoryFilter.toLowerCase())

      return matchesSearch && matchesCat
    })
  }, [libraryBooks, searchTerm, categoryFilter])

  const handleOpenCreate = () => {
    setEditingBook(null)
    setFormData({
      title: '',
      author: '',
      isbn: '',
      publisher: '',
      year: new Date().getFullYear().toString(),
      category: '',
      description: '',
      totalCopies: 1,
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (book: LibraryBook) => {
    setEditingBook(book)
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      year: book.year ? book.year.toString() : '',
      category: book.category || '',
      description: book.description || '',
      totalCopies: book.totalCopies,
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.title.trim()) {
      setFormError('Informe o título da obra.')
      return
    }
    if (!formData.author.trim()) {
      setFormError('Informe o autor da obra.')
      return
    }
    const copies = Number(formData.totalCopies)
    if (isNaN(copies) || copies < 1) {
      setFormError('O total de exemplares deve ser de pelo menos 1.')
      return
    }

    // Se estiver editando, não pode reduzir totalCopies abaixo dos empréstimos ativos
    if (editingBook) {
      const activeCount = libraryLoans.filter(
        (l) => l.bookId === editingBook.id && !l.returnedAt,
      ).length
      if (copies < activeCount) {
        setFormError(
          `Não é possível definir o total para ${copies} pois existem ${activeCount} exemplar(es) atualmente emprestados.`,
        )
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        isbn: formData.isbn.trim() || undefined,
        publisher: formData.publisher.trim() || undefined,
        year: formData.year.trim() ? Number(formData.year.trim()) : undefined,
        category: formData.category.trim() || undefined,
        description: formData.description.trim() || undefined,
        totalCopies: copies,
      }

      if (editingBook) {
        await updateLibraryBook(editingBook.id, payload)
      } else {
        await createLibraryBook(payload)
      }
      setIsFormOpen(false)
    } catch {
      setFormError('Erro ao gravar obra no banco de dados.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return
    setDeleteError(null)
    const success = await deleteLibraryBook(bookToDelete.id)
    if (!success) {
      setDeleteError(
        'Esta obra possui empréstimos ativos pendentes de devolução e não pode ser excluída.',
      )
      return
    }
    setBookToDelete(null)
  }

  const totalCopiesInCatalog = libraryBooks.reduce((acc, b) => acc + (b.totalCopies || 0), 0)
  const totalAvailableCopies = libraryBooks.reduce((acc, b) => acc + (b.availableCopies || 0), 0)
  const totalLoanedCopies = totalCopiesInCatalog - totalAvailableCopies

  return (
    <div className="space-y-6">
      {/* KPI Cards do Acervo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Títulos no Acervo</p>
              <p className="text-2xl font-bold text-white mt-1">{libraryBooks.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Obras cadastradas</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Exemplares Disponíveis</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{totalAvailableCopies}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Prontos para empréstimo</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Exemplares Emprestados</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{totalLoanedCopies}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                De {totalCopiesInCatalog} cópias físicas
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BookmarkCheck className="w-5 h-5" />
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
              placeholder="Buscar por título, autor, ISBN ou editora..."
              className="pl-9 bg-slate-950/80 border-slate-800 text-xs text-slate-200"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-md bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="todas">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 gap-1.5 shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Obra
        </Button>
      </div>

      {/* Lista de Obras em Cards */}
      {filteredBooks.length === 0 ? (
        <Card className="bg-slate-900/30 border-slate-800/80">
          <CardContent className="p-8 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma obra encontrada</p>
            <p className="text-xs text-slate-500">
              {searchTerm || categoryFilter !== 'todas'
                ? 'Tente ajustar os filtros de busca para encontrar o livro desejado.'
                : 'O acervo está vazio no momento. Clique em "Cadastrar Obra" para adicionar o primeiro título.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book) => {
            const hasAvailable = book.availableCopies > 0
            return (
              <Card
                key={book.id}
                className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {book.category && (
                          <Badge
                            variant="secondary"
                            className="bg-slate-800 text-blue-300 border-slate-700 text-[10px]"
                          >
                            {book.category}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            hasAvailable
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {hasAvailable
                            ? `${book.availableCopies} de ${book.totalCopies} disponível(is)`
                            : 'Esgotado (0 disponíveis)'}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-white line-clamp-2 leading-snug">
                        {book.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{book.author}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 text-xs">
                    {book.description && (
                      <p className="text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
                        {book.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                      {book.isbn && (
                        <span className="flex items-center gap-1 font-mono">
                          <Hash className="w-3 h-3 text-slate-600" />
                          ISBN: {book.isbn}
                        </span>
                      )}
                      {book.publisher && <span>{book.publisher}</span>}
                      {book.year && <span>({book.year})</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(book)}
                        className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Editar obra"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeleteError(null)
                          setBookToDelete(book)
                        }}
                        className="h-8 px-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                        title="Excluir obra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {onPreSelectBookForLoan && (
                      <Button
                        size="sm"
                        disabled={!hasAvailable}
                        onClick={() => onPreSelectBookForLoan(book.id)}
                        className={`h-8 text-xs font-medium gap-1.5 ${
                          hasAvailable
                            ? 'bg-blue-600/90 hover:bg-blue-500 text-white'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        Emprestar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-white">
              {editingBook ? 'Editar Obra do Acervo' : 'Cadastrar Nova Obra'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Preencha os dados do livro para disponibilizá-lo para empréstimo aos alunos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Título da Obra <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Engenharia de Software Moderna"
                className="bg-slate-950 border-slate-800 text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Autor(es) <span className="text-rose-400">*</span>
                </Label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Ex: Marco Tulio Valente"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Categoria / Área</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Tecnologia, Direito, Gestão"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">ISBN</Label>
                <Input
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  placeholder="978-85-..."
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Editora</Label>
                <Input
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  placeholder="Ex: Novatec"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Ano</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2024"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Total de Exemplares Físicos <span className="text-rose-400">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={formData.totalCopies}
                onChange={(e) => setFormData({ ...formData, totalCopies: Number(e.target.value) })}
                className="bg-slate-950 border-slate-800 text-xs text-white max-w-[120px]"
                required
              />
              <p className="text-[11px] text-slate-500">
                A disponibilidade é calculada automaticamente reduzindo os empréstimos ativos.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Sinopse / Descrição</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve resumo da obra, tópicos abordados e ementa recomendada..."
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
              >
                {isSubmitting
                  ? 'Salvando...'
                  : editingBook
                    ? 'Salvar Alterações'
                    : 'Cadastrar Obra'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={!!bookToDelete} onOpenChange={(open) => !open && setBookToDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-white">
              Excluir obra do acervo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-400 space-y-2">
              <span>
                Tem certeza que deseja remover <strong>"{bookToDelete?.title}"</strong>? Esta ação
                não poderá ser desfeita.
              </span>
              {deleteError && (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{deleteError}</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
