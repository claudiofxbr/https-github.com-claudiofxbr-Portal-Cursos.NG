import React, { useEffect, useRef, useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Charge, PriceTableItem, BillingException } from '@/types/portal'
import {
  SimuladoCardCheckoutModal,
  CardPaymentResult,
} from '@/components/matricula/SimuladoCardCheckoutModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  CreditCard,
  QrCode,
  Copy,
  CheckCircle2,
  AlertCircle,
  FileText,
  Percent,
  History,
  ShieldCheck,
  Check,
  Building2,
  DollarSign,
  User,
  Search,
  X,
} from 'lucide-react'

interface FinanceiroModuleProps {
  initialChargeId?: string | null
  initialStudentCpf?: string | null
  onClearInitialFilters?: () => void
  onNavigateToAluno?: (studentId: string) => void
}

export function FinanceiroModule({
  initialChargeId,
  initialStudentCpf,
  onClearInitialFilters,
  onNavigateToAluno,
}: FinanceiroModuleProps = {}) {
  const {
    charges,
    payChargePix,
    payChargeCard,
    priceTable,
    priceAuditLogs,
    updatePriceTableItem,
    billingExceptions,
    createBillingException,
    updateBillingExceptionStatus,
    students,
    currentUser,
  } = usePortal()

  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'cobrancas' | 'tabela' | 'excecoes' | 'auditoria'>(
    'cobrancas',
  )

  // Filtros de cobranças (com suporte a navegação cruzada)
  const [chargeSearch, setChargeSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'pago'>('todos')
  const [highlightedChargeId, setHighlightedChargeId] = useState<string | null>(null)

  // Aplica parâmetros recebidos via navegação cruzada
  useEffect(() => {
    if (initialChargeId) {
      setActiveTab('cobrancas')
      setHighlightedChargeId(initialChargeId)
      // Limpa busca para a cobrança ser exibida
      setChargeSearch('')
      setStatusFilter('todos')
      onClearInitialFilters?.()
    } else if (initialStudentCpf) {
      setActiveTab('cobrancas')
      setChargeSearch(initialStudentCpf)
      setStatusFilter('todos')
      onClearInitialFilters?.()
    }
  }, [initialChargeId, initialStudentCpf, onClearInitialFilters])

  // Modais de pagamento
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null)
  const [pixModalOpen, setPixModalOpen] = useState(false)
  const [copiedPix, setCopiedPix] = useState(false)

  // Card Checkout aprimorado
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [receiptCharge, setReceiptCharge] = useState<Charge | null>(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  // Edit Preço form
  const [editPriceItem, setEditPriceItem] = useState<PriceTableItem | null>(null)
  const [editMonthly, setEditMonthly] = useState(0)
  const [editEnrollment, setEditEnrollment] = useState(0)
  const [editLateFee, setEditLateFee] = useState(2.0)
  const [editReason, setEditReason] = useState('')
  const [priceModalOpen, setPriceModalOpen] = useState(false)

  // Nova Exceção form
  const [newExcStudentId, setNewExcStudentId] = useState('')
  const [newExcReason, setNewExcReason] = useState('')
  const [newExcDiscount, setNewExcDiscount] = useState(10)
  const [newExcJustification, setNewExcJustification] = useState('')
  const [excModalOpen, setExcModalOpen] = useState(false)

  // Refs para os timers (Pix copiado, checkout de cartão): o useEffect de
  // cleanup abaixo garante clearTimeout no unmount — nada de setState após
  // o componente sair da tela.
  const copyTimerRef = useRef<number | null>(null)
  const cardTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      if (cardTimerRef.current !== null) window.clearTimeout(cardTimerRef.current)
    }
  }, [])

  // Formatações
  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // QR Code Pix: só renderizamos fontes geradas pelo próprio fluxo de pagamento
  // (data:image/* gerada aqui, ou a URL de QR do sandbox do fluxo interno).
  // Qualquer outra URL (http/https de terceiros, javascript:, etc.) não vai
  // para <img src>: cairia no ícone de fallback.
  const isTrustedPixQr = (url: string): boolean => {
    try {
      const parsed = new URL(url, window.location.origin)
      if (parsed.protocol === 'data:') {
        return /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i.test(url)
      }
      // Fonte do fluxo interno (sandbox do próprio app / CDN do fluxo)
      return (
        parsed.protocol === 'https:' &&
        (parsed.hostname === 'api.qrserver.com' || parsed.hostname === window.location.hostname)
      )
    } catch {
      return false
    }
  }

  const safePixQrUrl = selectedCharge?.pixQrUrl
    ? isTrustedPixQr(selectedCharge.pixQrUrl)
      ? selectedCharge.pixQrUrl
      : null
    : null

  // Abertura Modal Pix
  const handleOpenPix = (charge: Charge) => {
    setSelectedCharge(charge)
    setPixModalOpen(true)
    setCopiedPix(false)
  }

  // Copiar código Pix — clipboard pode falhar (permissão, contexto não seguro,
  // iframe): sempre tratamos a rejeição com feedback de erro ao usuário.
  const handleCopyPix = async () => {
    if (!selectedCharge?.pixCode) return
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API indisponível neste navegador')
      }
      await navigator.clipboard.writeText(selectedCharge.pixCode)
      setCopiedPix(true)
      toast({
        title: 'Código Pix Copiado',
        description: 'Chave copia-e-cola salva na sua área de transferência.',
      })
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedPix(false), 3000)
    } catch (err) {
      setCopiedPix(false)
      toast({
        title: 'Não foi possível copiar',
        description:
          'A cópia automática falhou. Selecione o código abaixo e copie manualmente (Ctrl+C).',
        variant: 'destructive',
      })
    }
  }

  // Confirmar Pix simulado
  const handleSimulatePixConfirmation = () => {
    if (!selectedCharge) return
    payChargePix(selectedCharge.id)
    setPixModalOpen(false)
    toast({
      title: 'Pagamento Pix Aprovado (Simulado)!',
      description: `Cobrança ${selectedCharge.code} liquidada instantaneamente via Sandbox.`,
    })
  }

  // Abertura Modal Cartão
  const handleOpenCard = (charge: Charge) => {
    setSelectedCharge(charge)
    setCardModalOpen(true)
  }

  // Sucesso no checkout aprimorado
  const handleSimulatedCardSuccess = (res: CardPaymentResult) => {
    if (!selectedCharge) return
    payChargeCard(selectedCharge.id, {
      last4: res.last4,
      holder: res.cardHolder,
      cardBrand: res.cardBrand,
      installments: res.installments,
      totalAmount: res.totalAmount,
    })
    toast({
      title: 'Transação de Cartão Aprovada!',
      description: `Cobrança ${selectedCharge.code} autorizada em ${res.installments}x de ${formatCurrency(res.installmentAmount)}. Recibo: ${res.receiptNumber}.`,
    })
  }

  // Abrir modal preço
  const handleOpenEditPrice = (item: PriceTableItem) => {
    setEditPriceItem(item)
    setEditMonthly(item.standardMonthlyFee)
    setEditEnrollment(item.enrollmentFee)
    setEditLateFee(item.lateFeePercentage)
    setEditReason('')
    setPriceModalOpen(true)
  }

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPriceItem) return

    // Bloqueia campo vazio/valor inválido antes de gravar: nada de NaN ou
    // "R$ 0" indevido na tabela nem no log de auditoria.
    if (
      !Number.isFinite(editMonthly) ||
      !Number.isFinite(editEnrollment) ||
      !Number.isFinite(editLateFee) ||
      editMonthly < 0 ||
      editEnrollment < 0 ||
      editLateFee < 0 ||
      editLateFee > 100
    ) {
      toast({
        title: 'Valores inválidos',
        description: 'Preencha mensalidade, matrícula e multa com números válidos (≥ 0).',
        variant: 'destructive',
      })
      return
    }

    updatePriceTableItem(
      editPriceItem.id,
      {
        standardMonthlyFee: Number(editMonthly),
        enrollmentFee: Number(editEnrollment),
        lateFeePercentage: Number(editLateFee),
      },
      editReason || 'Ajuste tarifário autorizado',
    )

    setPriceModalOpen(false)
    toast({
      title: 'Tabela oficial atualizada',
      description: 'Alteração registrada e log de auditoria criado.',
    })
  }

  // Criar exceção
  const handleCreateException = (e: React.FormEvent) => {
    e.preventDefault()
    const student = students.find((s) => s.id === newExcStudentId)
    if (!student) return

    createBillingException({
      studentId: student.id,
      studentName: student.fullName,
      reason: newExcReason,
      discountPercentage: Number(newExcDiscount),
      justification: newExcJustification,
      requestedBy: currentUser?.name || 'Operador',
    })

    setExcModalOpen(false)
    setNewExcReason('')
    setNewExcJustification('')
    toast({
      title: 'Exceção de cobrança enviada',
      description: 'Solicitação aguardando parecer do gestor financeiro.',
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Módulo Financeiro & Cobranças
          </h1>
          <p className="text-xs text-slate-400">
            Faturamento, checkout Pix/Cartão demonstrativo, tabela oficial e exceções • Perfil:{' '}
            {currentUser?.role}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs border-emerald-500/40 text-emerald-400 font-mono"
          >
            Pix Mock Sandbox Ativo
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-slate-900 border border-slate-800 grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="cobrancas" className="text-xs">
            Cobranças ({charges.length})
          </TabsTrigger>
          <TabsTrigger value="tabela" className="text-xs">
            Tabela de Preços Oficial
          </TabsTrigger>
          <TabsTrigger value="excecoes" className="text-xs">
            Exceções de Cobrança ({billingExceptions.length})
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="text-xs">
            Histórico & Auditoria
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: COBRANÇAS */}
        <TabsContent value="cobrancas" className="space-y-4 mt-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={chargeSearch}
                onChange={(e) => setChargeSearch(e.target.value)}
                placeholder="Buscar por aluno, CPF, código ou descrição..."
                className="pl-9 bg-slate-950 border-slate-800 text-xs text-white h-9"
              />
              {chargeSearch && (
                <button
                  type="button"
                  onClick={() => setChargeSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant={statusFilter === 'todos' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('todos')}
                className={`h-8 text-xs ${
                  statusFilter === 'todos'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'border-slate-800 text-slate-300'
                }`}
              >
                Todas
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'pendente' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pendente')}
                className={`h-8 text-xs ${
                  statusFilter === 'pendente'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'border-slate-800 text-slate-300'
                }`}
              >
                Pendentes
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'pago' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pago')}
                className={`h-8 text-xs ${
                  statusFilter === 'pago'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'border-slate-800 text-slate-300'
                }`}
              >
                Liquidadas
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">Total a Receber (Pendentes)</span>
                <div className="text-xl font-bold text-emerald-400">
                  {formatCurrency(
                    charges
                      .filter((c) => c.status === 'pendente')
                      .reduce((a, b) => a + b.amount, 0),
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">Total Liquidado (Sandbox)</span>
                <div className="text-xl font-bold text-blue-400">
                  {formatCurrency(
                    charges.filter((c) => c.status === 'pago').reduce((a, b) => a + b.amount, 0),
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">Qtd. Cobranças Emitidas</span>
                <div className="text-xl font-bold text-white">{charges.length} títulos</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {charges
              .filter((charge) => {
                if (statusFilter !== 'todos' && charge.status !== statusFilter) return false
                if (chargeSearch) {
                  const q = chargeSearch.toLowerCase().trim()
                  const cleanQ = q.replace(/\D/g, '')
                  const matchName = charge.studentName?.toLowerCase().includes(q)
                  const matchCode = charge.code?.toLowerCase().includes(q)
                  const matchDesc = charge.description?.toLowerCase().includes(q)
                  const matchCpf = cleanQ && charge.studentCpf?.replace(/\D/g, '').includes(cleanQ)
                  if (!matchName && !matchCode && !matchDesc && !matchCpf) return false
                }
                return true
              })
              .map((charge) => {
                const isPaid = charge.status === 'pago'
                const isHighlighted = highlightedChargeId === charge.id

                // Tenta localizar o aluno para permitir clique direto "Ver aluno"
                const linkedStudent = students.find(
                  (s) =>
                    s.id === charge.studentId ||
                    (charge.studentCpf &&
                      (s.cpfRaw === charge.studentCpf.replace(/\D/g, '') ||
                        s.cpf === charge.studentCpf)),
                )

                return (
                  <Card
                    key={charge.id}
                    className={`border transition-all ${
                      isHighlighted
                        ? 'ring-2 ring-blue-500 bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/10'
                        : isPaid
                          ? 'bg-slate-900/40 border-slate-800/80'
                          : 'bg-slate-900/80 border-slate-700'
                    } text-slate-100`}
                  >
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-blue-400 font-semibold">
                            {charge.code}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {isPaid ? 'LIQUIDADO' : 'PENDENTE'}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-slate-800 text-slate-300"
                          >
                            {charge.category}
                          </Badge>
                          {isHighlighted && (
                            <Badge className="text-[10px] bg-blue-600 text-white animate-pulse">
                              Cobrança Selecionada
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-sm font-semibold text-white">{charge.description}</h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            Aluno: <strong className="text-slate-200">{charge.studentName}</strong>
                            {linkedStudent && onNavigateToAluno && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onNavigateToAluno(linkedStudent.id)}
                                className="h-5 px-1.5 text-[11px] text-blue-400 hover:text-white hover:bg-slate-800"
                                title="Abrir ficha do aluno na Gestão de Alunos"
                              >
                                <User className="w-3 h-3 mr-1" />
                                Ver aluno
                              </Button>
                            )}
                          </span>
                          <span className="font-mono">CPF: {charge.studentCpf}</span>
                          <span>Vencimento: {charge.dueDate}</span>
                        </div>

                        {isPaid && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-emerald-400 font-mono flex flex-wrap items-center gap-1.5">
                              <span>
                                ✓ Pago via {charge.method?.toUpperCase()} em {charge.paidAt}
                              </span>
                              <span>
                                • Recibo: <strong>{charge.receiptNumber}</strong>
                              </span>
                              {charge.installments && charge.installments > 1 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-emerald-500/30 text-emerald-300 py-0"
                                >
                                  {charge.installments}x de{' '}
                                  {formatCurrency(charge.amount / charge.installments)}
                                </Badge>
                              )}
                              {charge.cardLast4 && (
                                <span className="text-slate-400 text-[10px]">
                                  ({charge.cardBrand ? `${charge.cardBrand} ` : ''}final{' '}
                                  {charge.cardLast4})
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Valor Nominal</span>
                          <span className="text-lg font-bold text-white">
                            {formatCurrency(charge.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isPaid ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleOpenPix(charge)}
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                              >
                                <QrCode className="w-3.5 h-3.5 mr-1" />
                                Pagar com Pix
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCard(charge)}
                                className="h-8 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Cartão (Simulado)
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReceiptCharge(charge)
                                setReceiptModalOpen(true)
                              }}
                              className="h-8 text-xs border-emerald-500/40 text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              Ver Recibo
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>

        {/* TAB 2: TABELA DE PREÇOS OFICIAL */}
        <TabsContent value="tabela" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Tabela de Preços Vigente</h2>
              <p className="text-xs text-slate-400">
                Parâmetros oficiais de mensalidade, matrícula e multas contratuais
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {priceTable.map((item) => (
              <Card key={item.id} className="bg-slate-900/60 border-slate-800 text-slate-100">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-blue-500/30 text-blue-300"
                      >
                        {item.level === 'graduacao' ? 'Graduação' : 'Pós-Graduação'}
                      </Badge>
                      <CardTitle className="text-sm text-white mt-1">{item.category}</CardTitle>
                    </div>
                    {(currentUser?.role === 'root' ||
                      currentUser?.role === 'admin' ||
                      currentUser?.role === 'financeiro') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditPrice(item)}
                        className="h-7 text-xs text-blue-400 hover:text-white hover:bg-slate-800"
                      >
                        Reajustar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Mensalidade</span>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(item.standardMonthlyFee)}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Taxa Matrícula</span>
                      <span className="font-bold text-slate-200">
                        {formatCurrency(item.enrollmentFee)}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Multa Atraso</span>
                      <span className="font-bold text-amber-400">{item.lateFeePercentage}%</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                    <span>Atualizado por: {item.updatedBy}</span>
                    <span>Em: {item.updatedAt}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: EXCEÇÕES DE COBRANÇA */}
        <TabsContent value="excecoes" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Solicitações de Exceções & Bolsas
              </h2>
              <p className="text-xs text-slate-400">
                Descontos especiais e bolsas sob parecer do Financeiro e Reitoria
              </p>
            </div>
            <Button
              onClick={() => setExcModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
            >
              <Percent className="w-3.5 h-3.5 mr-1" />
              Solicitar Exceção
            </Button>
          </div>

          <div className="space-y-3">
            {billingExceptions.map((exc) => {
              const isPending = exc.status === 'pendente'
              const canApprove =
                currentUser?.role === 'root' ||
                currentUser?.role === 'admin' ||
                currentUser?.role === 'financeiro'

              return (
                <Card key={exc.id} className="bg-slate-900/60 border-slate-800 text-slate-100">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{exc.studentName}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            exc.status === 'aprovado'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : exc.status === 'rejeitado'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {exc.status.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-indigo-500/20 text-indigo-300"
                        >
                          {exc.discountPercentage}% Desconto
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-300">
                        <strong>Motivo:</strong> {exc.reason}
                      </p>
                      <p className="text-xs text-slate-400 italic">"{exc.justification}"</p>
                      <div className="text-[11px] text-slate-500 flex gap-4 pt-1">
                        <span>Solicitado por: {exc.requestedBy}</span>
                        <span>Data: {exc.createdAt}</span>
                        {exc.approvedBy && <span>Parecer: {exc.approvedBy}</span>}
                      </div>
                    </div>

                    {isPending && canApprove && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => {
                            updateBillingExceptionStatus(exc.id, 'aprovado')
                            toast({
                              title: 'Exceção Aprovada',
                              description: `Desconto de ${exc.discountPercentage}% concedido.`,
                            })
                          }}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateBillingExceptionStatus(exc.id, 'rejeitado')
                            toast({
                              title: 'Exceção Rejeitada',
                              description: 'Solicitação arquivada.',
                              variant: 'destructive',
                            })
                          }}
                          className="h-8 text-xs border-rose-800 text-rose-300 hover:bg-rose-950"
                        >
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* TAB 4: HISTÓRICO & AUDITORIA */}
        <TabsContent value="auditoria" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Trilha de Auditoria Tarifária</h2>
              <p className="text-xs text-slate-400">
                Registro imutável de todas as modificações na tabela de valores
              </p>
            </div>
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
              <History className="w-3 h-3 mr-1" /> {priceAuditLogs.length} eventos registrados
            </Badge>
          </div>

          <div className="space-y-2">
            {priceAuditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{log.changeSummary}</span>
                  <span className="text-[11px] font-mono text-slate-500">{log.timestamp}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>
                    Operador: <strong className="text-slate-300">{log.userName}</strong> (
                    {log.userRole})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-slate-800 text-[11px]">
                  <div className="text-slate-400">
                    Anterior: <span className="font-mono text-slate-300">{log.previousValue}</span>
                  </div>
                  <div className="text-emerald-400">
                    Novo: <span className="font-mono">{log.newValue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL PIX DEMONSTRATIVO */}
      <Dialog open={pixModalOpen} onOpenChange={setPixModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" />
              Checkout Pix Demonstrativo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Simulação de recebimento instantâneo (sem cobrança bancária real)
            </DialogDescription>
          </DialogHeader>

          {selectedCharge && (
            <div className="space-y-4 py-2">
              <div className="text-center p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs text-slate-400">Valor a pagar:</span>
                <div className="text-3xl font-bold text-emerald-400">
                  {formatCurrency(selectedCharge.amount)}
                </div>
                <p className="text-xs text-slate-300 font-medium">{selectedCharge.description}</p>

                {/* QR Code Fictício Real gerado */}
                <div className="w-48 h-48 mx-auto bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
                  {safePixQrUrl ? (
                    <img
                      src={safePixQrUrl}
                      alt="QR Code Pix"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QrCode className="w-36 h-36 text-slate-900" />
                  )}
                </div>

                <div className="text-[11px] text-slate-400">
                  Escaneie o QR Code no app do banco ou copie o código abaixo:
                </div>
              </div>

              {/* Copia e Cola */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Pix Copia e Cola</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={selectedCharge.pixCode || ''}
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
        </DialogContent>
      </Dialog>

      {/* MODAL CHECKOUT DE CARTÃO SIMULADO APRIMORADO */}
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
          studentName={selectedCharge.studentName}
          chargeCode={selectedCharge.code}
          onPaymentSuccess={handleSimulatedCardSuccess}
        />
      )}

      {/* MODAL DE RECIBO ENRIQUECIDO PARA COBRANÇAS JÁ PAGAS */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Comprovante de Pagamento (Demonstração)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Recibo emitido pelo PortalCursos.NG em ambiente simulado
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
                      {receiptCharge.paidAt || 'N/D'}
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
                    {receiptCharge.cardBrand ? `${receiptCharge.cardBrand} ` : 'Cartão '}
                    {receiptCharge.cardLast4 ? `final ${receiptCharge.cardLast4}` : ''}
                    {receiptCharge.installments && receiptCharge.installments > 1
                      ? ` (${receiptCharge.installments}x de ${formatCurrency(receiptCharge.amount / receiptCharge.installments)})`
                      : ' (À vista)'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
                  <span className="text-white font-semibold">Valor Total Pago:</span>
                  <span className="text-emerald-400 font-bold">
                    {formatCurrency(receiptCharge.amount)}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-amber-300/80 bg-amber-950/20 p-2 rounded border border-amber-900/40 text-center">
                🛡️ Ambiente de demonstração — nenhum valor real foi debitado de nenhuma instituição
                financeira.
              </div>

              <Button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs h-9"
              >
                Fechar Comprovante
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL REAJUSTE TABELA */}
      <Dialog open={priceModalOpen} onOpenChange={setPriceModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base text-white">Ajustar Tabela de Preços</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {editPriceItem?.category} — {editPriceItem?.level}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePrice} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Mensalidade Padrão (R$)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(editMonthly) ? editMonthly : ''}
                onChange={(e) =>
                  setEditMonthly(e.target.value === '' ? NaN : Number(e.target.value))
                }
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Taxa de Matrícula (R$)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(editEnrollment) ? editEnrollment : ''}
                onChange={(e) =>
                  setEditEnrollment(e.target.value === '' ? NaN : Number(e.target.value))
                }
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Multa por atraso (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={Number.isFinite(editLateFee) ? editLateFee : ''}
                onChange={(e) =>
                  setEditLateFee(e.target.value === '' ? NaN : Number(e.target.value))
                }
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">
                Justificativa / Motivo da Alteração *
              </label>
              <Input
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="ex: Reajuste contratual anual IPCA"
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPriceModalOpen(false)}
                className="border-slate-700 text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                Registrar Reajuste
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SOLICITAR EXCEÇÃO */}
      <Dialog open={excModalOpen} onOpenChange={setExcModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base text-white">
              Solicitar Exceção de Cobrança
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Concessão de desconto com auditoria e aprovação
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateException} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Aluno Beneficiário *</label>
              <select
                value={newExcStudentId}
                onChange={(e) => setNewExcStudentId(e.target.value)}
                className="w-full h-9 rounded bg-slate-900 border border-slate-700 text-white text-xs px-2.5"
                required
              >
                <option value="">Selecione o aluno</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.courseName})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Percentual de Desconto (%)</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newExcDiscount}
                onChange={(e) => setNewExcDiscount(Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Motivo / Categoria</label>
              <Input
                value={newExcReason}
                onChange={(e) => setNewExcReason(e.target.value)}
                placeholder="ex: Bolsa Mérito Acadêmico ou Convênio Empresa"
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Justificativa Detalhada</label>
              <textarea
                value={newExcJustification}
                onChange={(e) => setNewExcJustification(e.target.value)}
                placeholder="Explique o enquadramento e critérios observados..."
                rows={3}
                className="w-full rounded bg-slate-900 border border-slate-700 text-white text-xs p-2 focus:outline-none resize-none"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExcModalOpen(false)}
                className="border-slate-700 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                Enviar para Aprovação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
