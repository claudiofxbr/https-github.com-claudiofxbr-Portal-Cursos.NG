import React, { useState } from 'react'
import {
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Expense, ExpenseCategory, Course } from '@/types/portal'
import { useToast } from '@/hooks/use-toast'

interface ExpenseManagerProps {
  expenses: Expense[]
  courses: Course[]
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>
  onDeleteExpense: (id: string) => Promise<boolean>
  selectedPeriodLabel: string
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  folha_pagamento: 'Folha de Pagamento',
  infraestrutura: 'Infraestrutura & Manutenção',
  marketing: 'Marketing & Captação',
  tecnologia: 'Tecnologia & Softwares',
  impostos: 'Tributos & Impostos',
  servicos_terceiros: 'Serviços de Terceiros',
  outros: 'Outras Despesas',
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({
  expenses,
  courses,
  onAddExpense,
  onDeleteExpense,
  selectedPeriodLabel,
}) => {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('folha_pagamento')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago')
  const [courseId, setCourseId] = useState<string>('geral')
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setDescription('')
    setCategory('folha_pagamento')
    setAmount('')
    setDate(new Date().toISOString().split('T')[0])
    setStatus('pago')
    setCourseId('geral')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(amount.replace(',', '.'))
    if (!description.trim()) {
      toast({
        title: 'Descrição obrigatória',
        description: 'Informe a descrição da despesa.',
        variant: 'destructive',
      })
      return
    }
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor positivo maior que zero.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await onAddExpense({
        description: description.trim(),
        category,
        amount: numericAmount,
        date,
        status,
        courseId: courseId === 'geral' ? undefined : courseId,
        notes: notes.trim() || undefined,
      })

      toast({
        title: 'Despesa registrada com sucesso',
        description: `Lançamento de R$ ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gravado no banco de dados.`,
      })
      resetForm()
      setIsOpen(false)
    } catch {
      toast({
        title: 'Erro ao salvar despesa',
        description: 'Não foi possível gravar no banco.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`Tem certeza que deseja remover o lançamento "${desc}"?`)) return
    try {
      const ok = await onDeleteExpense(id)
      if (ok) {
        toast({
          title: 'Despesa removida',
          description: 'O lançamento foi excluído do banco.',
        })
      }
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a despesa.',
        variant: 'destructive',
      })
    }
  }

  const totalFiltered = expenses.reduce(
    (acc, exp) => acc + (exp.status === 'pago' ? exp.amount : 0),
    0,
  )

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-600" />
            Lançamentos de Despesas ({selectedPeriodLabel})
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Lançamentos operacionais reais persistidos na coleção{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-700">
              expenses
            </code>
            . Total pago no filtro:{' '}
            <strong className="text-rose-600 font-semibold">
              R$ {totalFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </CardDescription>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Lançar Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <DollarSign className="w-5 h-5 text-rose-600" />
                Registrar Nova Despesa Operacional
              </DialogTitle>
              <DialogDescription className="text-xs">
                O lançamento entrará no cálculo de custos, margem e lucro real dos relatórios
                gerenciais.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
              <div className="space-y-1">
                <Label htmlFor="exp-desc" className="text-xs">
                  Descrição do Custo / Despesa *
                </Label>
                <Input
                  id="exp-desc"
                  placeholder="Ex: Folha Docente Maio / Licenças de Software"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="exp-cat" className="text-xs">
                    Categoria de Custo *
                  </Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                    <SelectTrigger id="exp-cat" className="text-xs h-9">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                        <SelectItem key={catKey} value={catKey} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="exp-val" className="text-xs">
                    Valor (R$) *
                  </Label>
                  <Input
                    id="exp-val"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="exp-date" className="text-xs">
                    Data de Competência *
                  </Label>
                  <Input
                    id="exp-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="exp-status" className="text-xs">
                    Status da Despesa
                  </Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as 'pago' | 'pendente')}>
                    <SelectTrigger id="exp-status" className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pago" className="text-xs">
                        Pago / Liquidado
                      </SelectItem>
                      <SelectItem value="pendente" className="text-xs">
                        Pendente / A Pagar
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="exp-course" className="text-xs">
                  Alocação de Curso (Opcional)
                </Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="exp-course" className="text-xs h-9">
                    <SelectValue placeholder="Geral Institucional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral" className="text-xs">
                      Geral / Toda a Instituição
                    </SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="exp-notes" className="text-xs">
                  Observações Internas (Opcional)
                </Label>
                <Input
                  id="exp-notes"
                  placeholder="Ex: Fornecedor, nota fiscal nº..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Gravar Despesa'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Nenhuma despesa registrada para o período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Curso Vinculado</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((item) => {
                  const linkedCourse = courses.find((c) => c.id === item.courseId)
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {item.date}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {item.description}
                        {item.notes && (
                          <span className="block text-[11px] text-slate-400 truncate max-w-xs">
                            {item.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {linkedCourse ? (
                          <span className="text-sky-700 font-medium">{linkedCourse.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Institucional Geral</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-600 whitespace-nowrap">
                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {item.status === 'pago' ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                            Pago
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]"
                          >
                            <Clock className="w-2.5 h-2.5 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDelete(item.id, item.description)}
                          title="Excluir despesa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
