import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CreditCard,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ShieldCheck,
  DollarSign,
  Lock,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Course, PriceTableItem, StudentDocument } from '@/types/portal'
import { MatchedPrice } from './matriculaPriceHelper'

export interface StudentFormData {
  fullName: string
  cpf: string
  email: string
  phone: string
  birthDate: string
  type: 'graduacao' | 'pos_graduacao'
  courseId: string
  courseName: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  photoUrl: string
  photoFile?: File
  documents: StudentDocument[]
  observations: string
}

export interface PaymentOutcome {
  type: 'pix' | 'cartao' | 'depois'
  amount: number
  status: 'pendente' | 'pago'
  method?: 'pix' | 'cartao'
  paidAt?: string
  receiptNumber?: string
  priceCategory?: string
  pixCode?: string
  pixQrUrl?: string
  cardLast4?: string
  cardHolder?: string
}

interface MatriculaCheckoutStepProps {
  formData: StudentFormData
  selectedCourse?: Course
  matchedPrice: MatchedPrice | null
  priceTable: PriceTableItem[]
  onSelectPriceItem: (item: PriceTableItem) => void
  onConfirmPayment: (outcome: PaymentOutcome) => void
  onBack: () => void
  isSubmitting: boolean
}

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Máscaras de entrada para o cartão
const maskCardNumber = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

const maskCardExpiry = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 4)
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

const maskCardCvv = (val: string) => val.replace(/\D/g, '').slice(0, 4)

export function MatriculaCheckoutStep({
  formData,
  selectedCourse,
  matchedPrice,
  priceTable,
  onSelectPriceItem,
  onConfirmPayment,
  onBack,
  isSubmitting,
}: MatriculaCheckoutStepProps) {
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'cartao' | 'depois'>('pix')

  // Pix state
  const [copiedPix, setCopiedPix] = useState(false)
  const copyTimerRef = useRef<number | null>(null)

  // Cartão state
  const [cardNumber, setCardNumber] = useState('4532 8920 1123 8821')
  const [cardHolder, setCardHolder] = useState(formData.fullName.toUpperCase())
  const [cardExpiry, setCardExpiry] = useState('11/29')
  const [cardCvv, setCardCvv] = useState('789')
  const [cardProcessing, setCardProcessing] = useState(false)
  const cardTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      if (cardTimerRef.current !== null) window.clearTimeout(cardTimerRef.current)
    }
  }, [])

  const currentPriceItem = matchedPrice?.item
  const enrollmentFee = matchedPrice ? matchedPrice.suggestedFee : 0
  const monthlyFee = matchedPrice ? matchedPrice.monthlyFee : 0

  // Gera chave fictícia de Pix para cópia
  const pixCleanCpf = formData.cpf.replace(/\D/g, '')
  const pixCode = `00020126580014br.gov.bcb.pix0136cob-portalcursos-std-${pixCleanCpf || 'demo'}520400005303986540${enrollmentFee.toFixed(2)}5802BR5924PORTALCURSOS NG ENSINO6009SAO PAULO62070503***6304DEMO`
  const pixQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=portalcursos_pix_matricula_${pixCleanCpf || 'demo'}`

  const handleCopyPix = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard indisponível')
      }
      await navigator.clipboard.writeText(pixCode)
      setCopiedPix(true)
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedPix(false), 3000)
    } catch {
      setCopiedPix(false)
    }
  }

  const handleConfirmPix = () => {
    onConfirmPayment({
      type: 'pix',
      amount: enrollmentFee,
      status: 'pendente',
      method: 'pix',
      priceCategory: currentPriceItem?.category,
      pixCode,
      pixQrUrl,
    })
  }

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCardProcessing(true)
    if (cardTimerRef.current !== null) window.clearTimeout(cardTimerRef.current)
    cardTimerRef.current = window.setTimeout(() => {
      setCardProcessing(false)
      const last4 = cardNumber.replace(/\D/g, '').slice(-4) || '8821'
      const receiptNumber = `REC-CARD-${Date.now().toString().slice(-6)}`
      const paidAt = new Date().toISOString().replace('T', ' ').slice(0, 16)
      onConfirmPayment({
        type: 'cartao',
        amount: enrollmentFee,
        status: 'pago',
        method: 'cartao',
        paidAt,
        receiptNumber,
        priceCategory: currentPriceItem?.category,
        cardLast4: last4,
        cardHolder: cardHolder.trim() || formData.fullName,
      })
    }, 1100)
  }

  const handleLater = () => {
    onConfirmPayment({
      type: 'depois',
      amount: enrollmentFee,
      status: 'pendente',
      priceCategory: currentPriceItem?.category,
      pixCode,
      pixQrUrl,
    })
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner de Demonstração Obrigatório */}
      <div className="p-3.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 flex items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <strong className="font-semibold block text-amber-100">
              Ambiente de demonstração — nenhuma cobrança real é efetuada
            </strong>
            <span className="text-amber-300/80 text-[11px]">
              Os valores e parâmetros são lidos da tabela oficial do banco (price_table). Simule
              pagamento via Pix ou Cartão de Teste.
            </span>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-amber-500/50 text-amber-300 bg-amber-950/40 text-[10px] shrink-0"
        >
          DEMO CHECKOUT
        </Badge>
      </div>

      {/* Resumo da Matrícula + Tabela de Preços */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resumo do Aluno e Curso */}
        <Card className="bg-slate-900/60 border-slate-800 text-slate-100 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Resumo da Matrícula & Categoria
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] border-blue-500/30 text-blue-300 bg-blue-950/30"
              >
                {formData.type === 'graduacao' ? 'Graduação' : 'Pós-Graduação'}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Verifique os dados acadêmicos e os valores calculados conforme a tabela oficial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[11px]">Aluno</span>
                <span className="text-white font-medium">{formData.fullName}</span>
                <span className="text-slate-400 block text-[11px] font-mono">
                  CPF: {formData.cpf}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Curso Selecionado</span>
                <span className="text-white font-medium">{formData.courseName}</span>
                {selectedCourse && (
                  <span className="text-slate-400 block text-[11px]">
                    Código: {selectedCourse.code} • Modalidade:{' '}
                    {selectedCourse.modality.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Aviso de Preço Não Encontrado ou Seleção de Categoria */}
            {!matchedPrice ? (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-semibold">
                    Nenhum preço configurado para a categoria de{' '}
                    {formData.type === 'graduacao' ? 'Graduação' : 'Pós-Graduação'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  A tabela de preços no banco não possui faixas ativas para este nível. Você pode
                  gerar a cobrança depois pela secretaria ou selecionar manualmente uma categoria
                  existente.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Categoria aplicada:
                  </span>
                  <span className="text-white font-medium text-[11px]">
                    {currentPriceItem?.category}
                  </span>
                </div>

                {/* Seletor alternativo de categorias da tabela caso queira mudar */}
                {priceTable.filter((p) => p.level === formData.type).length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500">Outras categorias:</span>
                    {priceTable
                      .filter((p) => p.level === formData.type)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onSelectPriceItem(p)}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            p.id === currentPriceItem?.id
                              ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-medium'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {p.category}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Box com o Total do Checkout */}
        <Card className="bg-slate-900/60 border-slate-800 text-slate-100 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Taxa de Matrícula Devida
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-white pt-1">
              {matchedPrice ? formatCurrency(enrollmentFee) : 'A definir'}
            </div>
            <CardDescription className="text-[11px] text-slate-400 pt-1">
              Valor de entrada obrigatório para homologação institucional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Mensalidade futura</span>
                <span className="text-emerald-400 font-medium">
                  {matchedPrice ? formatCurrency(monthlyFee) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Multa atraso padrão</span>
                <span className="text-amber-400 font-medium">
                  {currentPriceItem?.lateFeePercentage ?? 2}%
                </span>
              </div>
              <div className="flex justify-between text-[11px] border-t border-slate-800/80 pt-1 text-slate-500">
                <span>Vencimento sugerido</span>
                <span>Em 5 dias corridos</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleLater}
              disabled={isSubmitting}
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8"
            >
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Gerar cobrança depois (Secretaria)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Escolha do Método de Pagamento Demonstrativo */}
      <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            Métodos de Pagamento na Demonstração
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Selecione como deseja simular o pagamento da taxa de matrícula
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedMethod}
            onValueChange={(v) => setSelectedMethod(v as 'pix' | 'cartao' | 'depois')}
          >
            <TabsList className="bg-slate-950 border border-slate-800 grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="pix" className="text-xs flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                Pix Instantâneo (QR Demo)
              </TabsTrigger>
              <TabsTrigger value="cartao" className="text-xs flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                Cartão de Crédito Simulado
              </TabsTrigger>
            </TabsList>

            {/* ABA PIX */}
            <TabsContent value="pix" className="space-y-4 pt-4">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 max-w-2xl mx-auto space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Code Container */}
                  <div className="w-36 h-36 bg-white p-2 rounded-lg flex items-center justify-center shrink-0 border border-slate-700 shadow-md">
                    <img
                      src={pixQrUrl}
                      alt="QR Code Pix Demonstrativo"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                        PIX SANDBOX
                      </Badge>
                      <span className="text-xs font-semibold text-white">
                        {formatCurrency(enrollmentFee)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Escaneie o QR Code demonstrativo no aplicativo do seu banco ou utilize a chave
                      Copia-e-Cola abaixo.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Ao confirmar, a cobrança é criada com status{' '}
                      <strong className="text-amber-400">pendente</strong> no Financeiro, vinculada
                      ao aluno.
                    </p>
                  </div>
                </div>

                {/* Copia e Cola */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                    <span>Pix Copia e Cola</span>
                    <span className="text-[10px] text-slate-500">Chave fictícia</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={pixCode}
                      className="bg-slate-900 border-slate-700 text-slate-300 text-xs font-mono select-all"
                    />
                    <Button
                      type="button"
                      onClick={handleCopyPix}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 text-xs px-3"
                    >
                      {copiedPix ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleConfirmPix}
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-10 font-semibold shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isSubmitting
                      ? 'Confirmando Matrícula...'
                      : 'Confirmar Pix e Concluir Matrícula'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ABA CARTÃO */}
            <TabsContent value="cartao" className="space-y-4 pt-4">
              <form
                onSubmit={handleCardSubmit}
                className="p-4 rounded-lg bg-slate-950 border border-slate-800 max-w-xl mx-auto space-y-3.5"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-white">
                      Checkout com Cartão de Teste
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-blue-500/40 text-blue-300 bg-blue-950/40"
                  >
                    APROVAÇÃO INSTANTÂNEA DEMO
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300">Número do Cartão</label>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="bg-slate-900 border-slate-700 text-white text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-500">
                    Número simulado com máscara automática (cartão de teste).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300">Nome do Titular (Como no cartão)</label>
                  <Input
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="NOME COMPLETO"
                    className="bg-slate-900 border-slate-700 text-white text-xs uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Validade</label>
                    <Input
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(maskCardExpiry(e.target.value))}
                      placeholder="MM/AA"
                      maxLength={5}
                      className="bg-slate-900 border-slate-700 text-white text-xs font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">CVV</label>
                    <Input
                      value={cardCvv}
                      onChange={(e) => setCardCvv(maskCardCvv(e.target.value))}
                      placeholder="123"
                      maxLength={4}
                      className="bg-slate-900 border-slate-700 text-white text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={cardProcessing || isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs h-10 font-semibold shadow-md shadow-blue-600/20"
                  >
                    {cardProcessing || isSubmitting ? (
                      'Autorizando pagamento simulado...'
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Pagar {formatCurrency(enrollmentFee)} e Concluir Matrícula
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Botões de navegação */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting || cardProcessing}
          className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Voltar aos Dados do Aluno
        </Button>

        <span className="text-[11px] text-slate-500">Etapa 2 de 2 • Checkout Demonstrativo</span>
      </div>
    </div>
  )
}
