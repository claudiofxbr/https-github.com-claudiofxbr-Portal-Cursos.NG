import React, { useState, useMemo, useRef } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Charge } from '@/types/portal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  CreditCard,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Receipt,
  FileText,
  DollarSign,
  Download,
  AlertCircle,
  Sparkles,
  Calendar,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import {
  SimuladoCardCheckoutModal,
  CardPaymentResult,
} from '@/components/matricula/SimuladoCardCheckoutModal'
import { useToast } from '@/hooks/use-toast'

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function isTrustedPixQr(url: string) {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'api.qrserver.com' || parsed.hostname === window.location.hostname)
    )
  } catch {
    return false
  }
}

export function AlunoCobrancasModule() {
  const { currentUser, students, charges, payChargePix, payChargeCard } = usePortal()
  const { toast } = useToast()

  // Determina dados cadastrais do aluno logado
  const currentStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
    ) || students[0]

  const effectiveStudentId = currentUser?.studentId || currentStudent?.id
  const effectiveCpf = (currentUser?.cpf || currentStudent?.cpf || '').trim()
  const cleanCpf = effectiveCpf.replace(/\D/g, '')

  // Filtragem de cobranças do aluno logado (por studentId, CPF formatado ou CPF normalizado)
  const myCharges = useMemo(() => {
    return charges.filter((chg) => {
      if (effectiveStudentId && chg.studentId === effectiveStudentId) return true
      if (effectiveCpf && chg.studentCpf === effectiveCpf) return true
      const chgCleanCpf = (chg.studentCpf || '').replace(/\D/g, '')
      if (cleanCpf && chgCleanCpf && cleanCpf === chgCleanCpf) return true
      if (
        currentStudent?.fullName &&
        chg.studentName.toLowerCase().trim() === currentStudent.fullName.toLowerCase().trim()
      ) {
        return true
      }
      return false
    })
  }, [charges, effectiveStudentId, effectiveCpf, cleanCpf, currentStudent])

  const [activeTab, setActiveTab] = useState<'todas' | 'pendentes' | 'pagas'>('todas')
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null)
  const [pixModalOpen, setPixModalOpen] = useState(false)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptCharge, setReceiptCharge] = useState<Charge | null>(null)

  // Pix state
  const [copiedPix, setCopiedPix] = useState(false)
  const copyTimerRef = useRef<number | null>(null)

  // Contadores
  const pendingCharges = myCharges.filter((c) => c.status === 'pendente' || c.status === 'atrasado')
  const paidCharges = myCharges.filter((c) => c.status === 'pago')

  const totalPendingAmount = pendingCharges.reduce((acc, c) => acc + c.amount, 0)
  const totalPaidAmount = paidCharges.reduce((acc, c) => acc + c.amount, 0)

  const displayedCharges = useMemo(() => {
    if (activeTab === 'pendentes') return pendingCharges
    if (activeTab === 'pagas') return paidCharges
    return myCharges
  }, [activeTab, pendingCharges, paidCharges, myCharges])

  // Abertura Modal Pix
  const handleOpenPix = (charge: Charge) => {
    setSelectedCharge(charge)
    setPixModalOpen(true)
    setCopiedPix(false)
  }

  // Copiar código Pix
  const handleCopyPix = async () => {
    if (!selectedCharge?.pixCode) return
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard indisponível')
      }
      await navigator.clipboard.writeText(selectedCharge.pixCode)
      setCopiedPix(true)
      toast({
        title: 'Código Pix Copiado!',
        description: 'Chave copia-e-cola salva na sua área de transferência.',
      })
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedPix(false), 3000)
    } catch {
      setCopiedPix(false)
      toast({
        title: 'Não foi possível copiar',
        description: 'Selecione o código manualmente no campo e copie (Ctrl+C).',
        variant: 'destructive',
      })
    }
  }

  // Confirmação de Pix Simulado
  const handleSimulatePixConfirmation = () => {
    if (!selectedCharge) return
    payChargePix(selectedCharge.id)
    setPixModalOpen(false)

    // Recarrega objeto de recibo para exibir imediatamente
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 16)
    setReceiptCharge({
      ...selectedCharge,
      status: 'pago',
      method: 'pix',
      paidAt: nowIso,
      receiptNumber: `REC-PIX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    })
    setReceiptModalOpen(true)

    toast({
      title: 'Pagamento Pix Aprovado (Simulado)!',
      description: `Cobrança ${selectedCharge.code} liquidada com sucesso em ambiente de demonstração.`,
    })
  }

  // Abertura Modal Cartão
  const handleOpenCard = (charge: Charge) => {
    setSelectedCharge(charge)
    setCardModalOpen(true)
  }

  // Sucesso de Cartão Simulado
  const handleSimulatedCardSuccess = (res: CardPaymentResult) => {
    if (!selectedCharge) return
    payChargeCard(selectedCharge.id, {
      last4: res.last4,
      holder: res.cardHolder,
      cardBrand: res.cardBrand,
      installments: res.installments,
      totalAmount: res.totalAmount,
    })

    const updatedCharge: Charge = {
      ...selectedCharge,
      status: 'pago',
      method: 'cartao',
      paidAt: res.paidAt,
      receiptNumber: res.receiptNumber,
      installments: res.installments,
      cardLast4: res.last4,
      cardBrand: res.cardBrand,
    }

    setReceiptCharge(updatedCharge)
    setReceiptModalOpen(true)

    toast({
      title: 'Transação de Cartão Aprovada!',
      description: `Cobrança ${selectedCharge.code} autorizada em ${res.installments}x de ${formatCurrency(res.installmentAmount)}. Recibo: ${res.receiptNumber}.`,
    })
  }

  // Visualizar Recibo
  const handleViewReceipt = (charge: Charge) => {
    setReceiptCharge(charge)
    setReceiptModalOpen(true)
  }

  // URL segura para QR Code Pix do charge selecionado
  const currentPixQrUrl = selectedCharge
    ? selectedCharge.pixQrUrl && isTrustedPixQr(selectedCharge.pixQrUrl)
      ? selectedCharge.pixQrUrl
      : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=portalcursos_cobranca_${selectedCharge.code}`
    : ''

  const currentPixCode =
    selectedCharge?.pixCode ||
    (selectedCharge
      ? `00020126580014br.gov.bcb.pix0136cob-${selectedCharge.code.toLowerCase()}520400005303986540${selectedCharge.amount.toFixed(2)}5802BR5924PORTALCURSOS NG ENSINO6009SAO PAULO62070503***6304DEMO`
      : '')

  return (
    <div className="space-y-6">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Minhas Cobranças & Mensalidades
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Acompanhe suas mensalidades e taxas, consulte recibos e realize pagamentos no ambiente
            de demonstração.
          </p>
        </div>

        <Badge
          variant="outline"
          className="border-amber-500/40 text-amber-300 bg-amber-950/30 text-[11px] flex items-center gap-1.5 py-1 px-2.5"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Ambiente de Demonstração (Sem cobrança real)</span>
        </Badge>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
              <span>Total em Aberto</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400">
              {formatCurrency(totalPendingAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            {pendingCharges.length} cobrança(s) pendente(s) ou a vencer
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
              <span>Total Quitado</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-400">
              {formatCurrency(totalPaidAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            {paidCharges.length} cobrança(s) com recibo emitido
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
              <span>Formas Aceitas (Sandbox)</span>
              <Sparkles className="w-4 h-4 text-blue-400" />
            </CardDescription>
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2 pt-1">
              <span>Pix Instantâneo + Cartão</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400 space-y-0.5">
            <div>• Pix com QR Code demonstrativo</div>
            <div>• Cartão em até 12x com validação Luhn</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs e Lista de Cobranças */}
      <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
        <CardHeader className="p-4 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-400" />
                Histórico Financeiro do Aluno
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Vinculado a {currentStudent?.fullName || currentUser?.name} (CPF:{' '}
                {effectiveCpf || 'Não cadastrado'})
              </CardDescription>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-slate-950 border border-slate-800 grid grid-cols-3 h-8 text-xs w-full sm:w-auto">
                <TabsTrigger value="todas" className="text-xs px-3">
                  Todas ({myCharges.length})
                </TabsTrigger>
                <TabsTrigger value="pendentes" className="text-xs px-3">
                  Abertas ({pendingCharges.length})
                </TabsTrigger>
                <TabsTrigger value="pagas" className="text-xs px-3">
                  Pagas ({paidCharges.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {displayedCharges.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">
                Nenhuma cobrança nesta visualização
              </p>
              <p className="text-xs text-slate-500">
                {activeTab === 'pendentes'
                  ? 'Você está em dia com todas as suas obrigações financeiras!'
                  : 'Nenhum registro financeiro encontrado para o seu cadastro.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {displayedCharges.map((chg) => {
                const isPaid = chg.status === 'pago'
                const isOverdue = chg.status === 'atrasado'
                const isPending = chg.status === 'pendente'

                return (
                  <div
                    key={chg.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-blue-400 font-semibold">
                          {chg.code}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]'
                              : isOverdue
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]'
                          }
                        >
                          {isPaid ? 'PAGO' : isOverdue ? 'VENCIDO' : 'A VENCER'}
                        </Badge>
                        <span className="text-xs text-slate-500 capitalize">
                          • Categoria: {chg.category.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-white truncate">
                        {chg.description}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          Vencimento: <span className="text-slate-300">{chg.dueDate}</span>
                        </span>
                        {isPaid && chg.paidAt && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Pago em: {chg.paidAt} ({chg.method?.toUpperCase() || 'SIMULADO'})
                          </span>
                        )}
                        {isPaid && chg.receiptNumber && (
                          <span className="text-slate-400 font-mono">
                            Recibo: {chg.receiptNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-slate-400 block">Valor:</span>
                        <span className="text-lg font-bold text-white">
                          {formatCurrency(chg.amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReceipt(chg)}
                            className="h-8 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            Ver Recibo
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleOpenPix(chg)}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                            >
                              <QrCode className="w-3.5 h-3.5 mr-1" />
                              Pagar com Pix
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleOpenCard(chg)}
                              className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              Cartão (Até 12x)
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL PIX DEMONSTRATIVO */}
      <Dialog open={pixModalOpen} onOpenChange={setPixModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
          {/* Banner de Demonstração */}
          <div className="bg-gradient-to-r from-amber-500/15 via-blue-500/15 to-emerald-500/15 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-[11px] text-amber-300">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Ambiente de Demonstração — Nenhum valor real é cobrado
            </span>
            <Badge
              variant="outline"
              className="text-[9px] border-amber-500/40 text-amber-300 bg-amber-950/40"
            >
              SIMULAÇÃO
            </Badge>
          </div>

          <div className="p-6 space-y-4">
            <DialogHeader className="p-0">
              <DialogTitle className="text-base text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                Checkout Pix Demonstrativo
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Pague sua cobrança acadêmica de forma instantânea em ambiente seguro de simulação.
              </DialogDescription>
            </DialogHeader>

            {selectedCharge && (
              <div className="space-y-4">
                <div className="text-center p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <span className="text-xs text-slate-400">Valor da cobrança:</span>
                  <div className="text-3xl font-bold text-emerald-400">
                    {formatCurrency(selectedCharge.amount)}
                  </div>
                  <p className="text-xs text-slate-300 font-medium">{selectedCharge.description}</p>

                  {/* QR Code Fictício */}
                  <div className="w-48 h-48 mx-auto bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
                    {currentPixQrUrl ? (
                      <img
                        src={currentPixQrUrl}
                        alt="QR Code Pix"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <QrCode className="w-36 h-36 text-slate-900" />
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Escaneie o QR Code demonstrativo no app do seu banco ou utilize o código Copia e
                    Cola:
                  </div>
                </div>

                {/* Copia e Cola */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Pix Copia e Cola</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={currentPixCode}
                      className="bg-slate-900 border-slate-700 text-slate-300 text-xs font-mono select-all"
                    />
                    <Button
                      type="button"
                      onClick={handleCopyPix}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 text-xs"
                    >
                      {copiedPix ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSimulatePixConfirmation}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-10 shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Simular Confirmação Instantânea de Pagamento Pix
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CHECKOUT DE CARTÃO SIMULADO (REUTILIZADO DA MATRÍCULA / FINANCEIRO) */}
      {selectedCharge && (
        <SimuladoCardCheckoutModal
          open={cardModalOpen}
          onOpenChange={setCardModalOpen}
          amount={selectedCharge.amount}
          categoryLabel={
            selectedCharge.category === 'matricula'
              ? 'Matrícula'
              : selectedCharge.category === 'mensalidade'
                ? 'Mensalidade'
                : 'Taxa / Serviço'
          }
          description={selectedCharge.description}
          studentName={selectedCharge.studentName || currentStudent?.fullName}
          chargeCode={selectedCharge.code}
          onPaymentSuccess={handleSimulatedCardSuccess}
        />
      )}

      {/* MODAL DE RECIBO DO ALUNO */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Comprovante de Pagamento (Demonstração)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Recibo acadêmico oficial emitido em ambiente simulado do PortalCursos.NG
            </DialogDescription>
          </DialogHeader>

          {receiptCharge && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/50 space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                  <span className="text-slate-400 text-[11px]">Número do Recibo</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {receiptCharge.receiptNumber || 'REC-SIM-0000'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Data de Liquidação</span>
                    <span className="text-slate-200 font-medium">
                      {receiptCharge.paidAt || 'Hoje'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Método</span>
                    <span className="text-slate-200 uppercase font-medium">
                      {receiptCharge.method || 'Cartão'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Aluno:</span>
                  <span className="text-white font-medium">{receiptCharge.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CPF:</span>
                  <span className="text-slate-300 font-mono">{receiptCharge.studentCpf}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Descrição:</span>
                  <span className="text-slate-300 text-right max-w-[220px]">
                    {receiptCharge.description}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Forma de Pagamento:</span>
                  <span className="text-slate-200">
                    {receiptCharge.method === 'pix'
                      ? 'Pix Instantâneo'
                      : `${receiptCharge.cardBrand || 'Cartão de Crédito'} ${receiptCharge.cardLast4 ? `final ${receiptCharge.cardLast4}` : ''} ${
                          receiptCharge.installments && receiptCharge.installments > 1
                            ? `(${receiptCharge.installments}x)`
                            : '(À vista)'
                        }`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-semibold">
                  <span className="text-slate-200">Valor Liquidado:</span>
                  <span className="text-emerald-400">{formatCurrency(receiptCharge.amount)}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Status de Baixa Sincronizado
                </div>
                <p>
                  Esta cobrança consta como quitada tanto no seu Portal do Aluno quanto no módulo
                  Financeiro da Secretaria e Tesouraria.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setReceiptModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs h-9"
                >
                  Fechar Comprovante
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
