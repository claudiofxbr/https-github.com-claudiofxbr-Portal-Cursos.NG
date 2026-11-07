import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  UserCheck,
  ArrowRight,
  RotateCcw,
  FileText,
  CreditCard,
  QrCode,
  Clock,
} from 'lucide-react'
import { Student } from '@/types/portal'
import { PaymentOutcome } from './MatriculaCheckoutStep'

interface MatriculaSuccessStepProps {
  student: Student
  paymentOutcome: PaymentOutcome | null
  onReset: () => void
  onNavigateToStudents?: () => void
  onNavigateToFinancial?: () => void
}

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function MatriculaSuccessStep({
  student,
  paymentOutcome,
  onReset,
  onNavigateToStudents,
  onNavigateToFinancial,
}: MatriculaSuccessStepProps) {
  const isPaid = paymentOutcome?.status === 'pago'
  const isPix = paymentOutcome?.type === 'pix'
  const isCard = paymentOutcome?.type === 'cartao'
  const isDeferred = paymentOutcome?.type === 'depois'

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-200 max-w-3xl mx-auto">
      <Card className="bg-slate-900/80 border-emerald-500/40 text-slate-100 shadow-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />
        <CardHeader className="text-center pb-2 pt-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <CardTitle className="text-xl sm:text-2xl text-white font-bold">
            Matrícula Homologada com Sucesso!
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-300">
            O aluno foi registrado no sistema e já está disponível na Gestão de Alunos.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 p-6">
          {/* Dados do Aluno Criado */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Nome do Aluno
                </span>
                <span className="text-sm font-semibold text-white">{student.fullName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[10px] border-blue-500/30 text-blue-300 bg-blue-950/30"
                >
                  {student.type === 'graduacao' ? 'Graduação' : 'Pós-Graduação'}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/30 text-emerald-300 bg-emerald-950/30"
                >
                  {student.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Curso</span>
                <span className="text-slate-200 font-medium">{student.courseName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">CPF</span>
                <span className="text-slate-200 font-mono">{student.cpf}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">E-mail</span>
                <span className="text-slate-200">{student.email}</span>
              </div>
            </div>
          </div>

          {/* Dados da Cobrança Gerada */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                Situação Financeira da Matrícula
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  isPaid
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {isPaid ? 'LIQUIDADO' : 'PENDENTE NO FINANCEIRO'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Valor da Matrícula</span>
                <span className="text-base font-bold text-white">
                  {paymentOutcome ? formatCurrency(paymentOutcome.amount) : 'Pendente'}
                </span>
                {paymentOutcome?.priceCategory && (
                  <span className="text-[11px] text-slate-400 block">
                    Categoria: {paymentOutcome.priceCategory}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Forma de Pagamento</span>
                {isCard && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Cartão Simulado (Final {paymentOutcome.cardLast4 || '8821'})
                  </span>
                )}
                {isPix && (
                  <span className="text-amber-300 font-medium flex items-center gap-1 pt-0.5">
                    <QrCode className="w-3.5 h-3.5" />
                    Pix Demonstrativo (Aguardando Liquidação)
                  </span>
                )}
                {isDeferred && (
                  <span className="text-slate-300 font-medium flex items-center gap-1 pt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    Cobrança emitida para acerto posterior
                  </span>
                )}
              </div>
            </div>

            {isCard && paymentOutcome?.receiptNumber && (
              <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
                ✓ Recibo da simulação: {paymentOutcome.receiptNumber} • Pago em{' '}
                {paymentOutcome.paidAt}
              </div>
            )}

            {isPix && (
              <div className="text-[11px] text-amber-300/90 bg-amber-950/20 p-2 rounded border border-amber-900/40">
                ℹ️ A cobrança Pix está listada no módulo Financeiro e pode ser baixada manualmente a
                qualquer momento.
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              className="w-full sm:w-auto border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs h-9"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Realizar Nova Matrícula
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onNavigateToFinancial && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onNavigateToFinancial}
                  className="w-full sm:w-auto border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-9"
                >
                  Ver no Financeiro
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
              {onNavigateToStudents && (
                <Button
                  type="button"
                  onClick={onNavigateToStudents}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 font-medium"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                  Ir para Gestão de Alunos
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
