import React, { useState, useEffect } from 'react'
import { Student, PriceTableItem, Charge } from '@/types/portal'
import {
  INSTITUTIONAL_FEE_CATEGORIES,
  FEE_CATEGORY_MAP,
  FeeCategoryOption,
} from '@/lib/feeCategories'
import { generateId } from '@/lib/id'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Receipt, User, Calendar, DollarSign, Tag, Info, Sparkles } from 'lucide-react'

interface EmitirTaxaAvulsaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  priceTable: PriceTableItem[]
  preselectedStudentId?: string | null
  onSubmit: (newCharge: Charge) => Promise<void> | void
}

export const EmitirTaxaAvulsaModal: React.FC<EmitirTaxaAvulsaModalProps> = ({
  open,
  onOpenChange,
  students,
  priceTable,
  preselectedStudentId,
  onSubmit,
}) => {
  const [studentId, setStudentId] = useState<string>('')
  const [categoryKey, setCategoryKey] = useState<FeeCategoryOption['key']>('taxa_segunda_via')
  const [description, setDescription] = useState<string>('')
  const [amount, setAmount] = useState<string>('35,00')
  const [dueDate, setDueDate] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Sugere vencimento padrão: hoje + 10 dias
  const getDefaultDueDate = (): string => {
    const d = new Date()
    d.setDate(d.getDate() + 10)
    return d.toISOString().split('T')[0]
  }

  // Preenche dados padrão ao abrir ou alterar categoria/aluno
  useEffect(() => {
    if (open) {
      setErrorMsg(null)
      setIsSubmitting(false)
      if (preselectedStudentId) {
        setStudentId(preselectedStudentId)
      } else if (!studentId && students.length > 0) {
        setStudentId(students[0].id)
      }
      if (!dueDate) {
        setDueDate(getDefaultDueDate())
      }
    }
  }, [open, preselectedStudentId, students])

  // Recalcula valor sugerido e descrição padrão ao alterar a categoria
  useEffect(() => {
    const cat = FEE_CATEGORY_MAP[categoryKey]
    if (!cat) return

    // Tenta buscar da tabela de preços se for rematrícula ou afim
    let suggested = cat.suggestedAmount
    if (cat.priceTableMatch === 'enrollmentFee' && priceTable.length > 0) {
      // Prioriza a média ou o primeiro item da tabela oficial
      const item = priceTable[0]
      if (item && item.enrollmentFee > 0) {
        suggested = item.enrollmentFee
      }
    }

    setAmount(suggested.toFixed(2).replace('.', ','))
    setDescription(cat.label)
  }, [categoryKey, priceTable])

  const selectedStudent = students.find((s) => s.id === studentId)
  const selectedCat = FEE_CATEGORY_MAP[categoryKey]

  const handleApplySuggested = () => {
    if (selectedCat) {
      setAmount(selectedCat.suggestedAmount.toFixed(2).replace('.', ','))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedStudent) {
      setErrorMsg('Selecione um aluno para vincular a cobrança da taxa.')
      return
    }

    const cleanAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero (ex: 35,00).')
      return
    }

    if (!dueDate) {
      setErrorMsg('Selecione a data de vencimento da taxa.')
      return
    }

    const finalDescription = description.trim() || selectedCat?.label || 'Taxa Institucional Avulsa'

    setIsSubmitting(true)

    try {
      const year = new Date().getFullYear()
      const randomSuffix = Math.floor(1000 + Math.random() * 9000)
      const chargeCode = `TAX-${year}-${randomSuffix}`

      // LGPD: nenhum dado pessoal (CPF, e-mail, ID) é embutido no código Pix nem na URL do serviço
      // externo de QR — o QR é gerado com um identificador neutro da cobrança (chargeCode).
      const mockPixCode = `00020126580014br.gov.bcb.pix0136cob-portalcursos-tax-${chargeCode}520400005303986540${cleanAmount.toFixed(2)}5802BR5924PORTALCURSOS NG ENSINO6009SAO PAULO62070503***6304DEMO`
      const mockPixQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=portalcursos_pix_taxa_${chargeCode}`

      const newCharge: Charge = {
        id: generateId('chg-taxa'),
        code: chargeCode,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        studentCpf: selectedStudent.cpf,
        category: categoryKey,
        description: finalDescription,
        amount: cleanAmount,
        dueDate,
        status: 'pendente',
        pixCode: mockPixCode,
        pixQrUrl: mockPixQrUrl,
      }

      await onSubmit(newCharge)
      onOpenChange(false)
    } catch (err: any) {
      console.error('[EmitirTaxaAvulsaModal] Erro ao emitir taxa:', err)
      setErrorMsg(err?.message || 'Falha ao salvar a taxa no banco. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-950 border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Emitir Cobrança de Taxa Avulsa
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/40 text-emerald-400"
                >
                  Simulação Ativa
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Crie um título de taxa institucional (2ª via, biblioteca, material, diploma)
                vinculado a um aluno
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seleção do Aluno */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              Aluno Beneficiário / Pagador *
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full h-9 rounded-md bg-slate-900 border border-slate-700 text-white text-xs px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            >
              <option value="">Selecione o aluno cadastrado...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} • CPF: {s.cpf} • {s.courseName}
                </option>
              ))}
            </select>
            {selectedStudent && (
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>
                  Curso: <strong className="text-slate-300">{selectedStudent.courseName}</strong>
                </span>
                <span>• E-mail: {selectedStudent.email}</span>
              </p>
            )}
          </div>

          {/* Categoria da Taxa */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              Categoria da Taxa Institucional *
            </label>
            <select
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value as FeeCategoryOption['key'])}
              className="w-full h-9 rounded-md bg-slate-900 border border-slate-700 text-white text-xs px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            >
              {INSTITUTIONAL_FEE_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label} (Sugerido: R$ {cat.suggestedAmount.toFixed(2).replace('.', ',')})
                </option>
              ))}
            </select>
            {selectedCat && (
              <div className="p-2.5 rounded-md bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>{selectedCat.description}</p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-500">
                    Valor sugerido na tabela institucional:{' '}
                    <strong className="text-emerald-400">
                      R$ {selectedCat.suggestedAmount.toFixed(2).replace('.', ',')}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleApplySuggested}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    Aplicar sugerido
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Descrição Personalizada */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              Descrição do Título / Cobrança
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Taxa de emissão de segunda via do histórico escolar"
              className="bg-slate-900 border-slate-700 text-xs text-white h-9"
            />
            <span className="text-[10px] text-slate-500">
              Aparece no comprovante, recibo e no Portal do Aluno.
            </span>
          </div>

          {/* Grid de Valor e Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Valor da Taxa (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                  R$
                </span>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="35,00"
                  className="pl-9 bg-slate-900 border-slate-700 text-xs text-white font-mono h-9 font-semibold"
                  required
                />
              </div>
              <span className="text-[10px] text-slate-500">Editável conforme deferimento.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data de Vencimento *
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-slate-900 border-slate-700 text-xs text-white h-9"
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-slate-300 space-y-1">
            <p className="font-semibold text-blue-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Ciclo de Cobrança Integrado:
            </p>
            <p className="text-slate-400 leading-relaxed">
              O título será emitido com status <strong>PENDENTE</strong>. Ele ficará visível no
              módulo Financeiro, na aba de Cobranças da ficha do aluno e no Portal do Aluno (em
              Minhas Cobranças), onde o aluno poderá liquidar via Pix instantâneo ou cartão simulado
              com comprovante oficial.
            </p>
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-slate-800 text-slate-300 text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 shadow-md shadow-emerald-600/20"
            >
              {isSubmitting ? 'Gravando no banco...' : 'Confirmar Emissão da Taxa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
