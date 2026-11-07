import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Lock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Receipt,
  FileCheck,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  detectCardBrand,
  formatCardNumber,
  formatCardExpiry,
  validateLuhn,
  validateExpiry,
  validateCvv,
  validateCardHolder,
  calculateInstallments,
  formatCurrency,
  CARD_BRANDS,
} from './simuladoCardHelper'

export interface CardPaymentResult {
  receiptNumber: string
  last4: string
  cardBrand: string
  cardHolder: string
  installments: number
  installmentAmount: number
  totalAmount: number
  paidAt: string
}

interface SimuladoCardCheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  chargeCode?: string
  studentName?: string
  categoryLabel?: string
  description?: string
  onPaymentSuccess: (result: CardPaymentResult) => void
}

export const SimuladoCardCheckoutModal: React.FC<SimuladoCardCheckoutModalProps> = ({
  open,
  onOpenChange,
  amount,
  chargeCode,
  studentName = 'ALUNO DEMONSTRATIVO',
  categoryLabel = 'Mensalidade / Matrícula',
  description = 'Cobrança do Portal Acadêmico',
  onPaymentSuccess,
}) => {
  const [step, setStep] = useState<'form' | 'processing' | 'receipt'>('form')

  // Form states
  const [cardNumber, setCardNumber] = useState('4532 1122 3344 8821')
  const [cardHolder, setCardHolder] = useState(studentName.toUpperCase())
  const [cardExpiry, setCardExpiry] = useState('11/29')
  const [cardCvv, setCardCvv] = useState('789')
  const [selectedInstallments, setSelectedInstallments] = useState(1)

  // Validation errors
  const [errors, setErrors] = useState<{
    number?: string
    holder?: string
    expiry?: string
    cvv?: string
  }>({})

  // Success result
  const [paymentResult, setPaymentResult] = useState<CardPaymentResult | null>(null)

  // Recalcular installments
  const installmentOptions = calculateInstallments(amount)
  const currentInstallment =
    installmentOptions.find((opt) => opt.installments === selectedInstallments) ||
    installmentOptions[0]

  const detectedBrand = detectCardBrand(cardNumber)
  const brandInfo = CARD_BRANDS[detectedBrand]

  // Reset ao abrir modal
  useEffect(() => {
    if (open) {
      setStep('form')
      setCardNumber('4532 1122 3344 8821')
      setCardHolder(studentName.toUpperCase() || 'ALUNO DEMONSTRATIVO')
      setCardExpiry('11/29')
      setCardCvv('789')
      setSelectedInstallments(1)
      setErrors({})
      setPaymentResult(null)
    }
  }, [open, studentName])

  // Processamento com timer de 2.5s
  useEffect(() => {
    if (step !== 'processing') return

    const timer = window.setTimeout(() => {
      const cleanDigits = cardNumber.replace(/\D/g, '')
      const last4 = cleanDigits.slice(-4) || '8821'
      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 16)
      const receiptNumber = `REC-SIM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`

      const result: CardPaymentResult = {
        receiptNumber,
        last4,
        cardBrand: brandInfo.label,
        cardHolder: cardHolder.trim().toUpperCase(),
        installments: currentInstallment.installments,
        installmentAmount: currentInstallment.installmentAmount,
        totalAmount: currentInstallment.totalAmount,
        paidAt: nowIso,
      }

      setPaymentResult(result)
      setStep('receipt')
      onPaymentSuccess(result)
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [step, cardNumber, brandInfo.label, cardHolder, currentInstallment, onPaymentSuccess])

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardNumber(formatted)
    if (errors.number) setErrors((prev) => ({ ...prev, number: undefined }))
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardExpiry(e.target.value)
    setCardExpiry(formatted)
    if (errors.expiry) setErrors((prev) => ({ ...prev, expiry: undefined }))
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, brandInfo.cvvLength)
    setCardCvv(clean)
    if (errors.cvv) setErrors((prev) => ({ ...prev, cvv: undefined }))
  }

  const handleHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardHolder(e.target.value.toUpperCase())
    if (errors.holder) setErrors((prev) => ({ ...prev, holder: undefined }))
  }

  const validateForm = (): boolean => {
    const newErrors: {
      number?: string
      holder?: string
      expiry?: string
      cvv?: string
    } = {}

    // 1. Número + Luhn
    const cleanNumber = cardNumber.replace(/\D/g, '')
    if (cleanNumber.length < 13) {
      newErrors.number = 'Número de cartão incompleto'
    } else if (!validateLuhn(cleanNumber)) {
      newErrors.number =
        'Número de cartão inválido pelo dígito verificador (Luhn). Verifique se digitou corretamente.'
    }

    // 2. Titular
    const holderValidation = validateCardHolder(cardHolder)
    if (!holderValidation.valid) {
      newErrors.holder = holderValidation.error
    }

    // 3. Validade
    const expiryValidation = validateExpiry(cardExpiry)
    if (!expiryValidation.valid) {
      newErrors.expiry = expiryValidation.error
    }

    // 4. CVV
    const cvvValidation = validateCvv(cardCvv, detectedBrand)
    if (!cvvValidation.valid) {
      newErrors.cvv = cvvValidation.error
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setStep('processing')
  }

  return (
    <Dialog open={open} onOpenChange={step === 'processing' ? () => {} : onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-950 border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        {/* Banner de Demonstração Mandatório */}
        <div className="bg-gradient-to-r from-amber-500/15 via-blue-500/15 to-emerald-500/15 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-[11px] text-amber-300">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Ambiente de Demonstração — Nenhum valor real é cobrado
          </span>
          <Badge
            variant="outline"
            className="text-[9px] border-amber-500/40 text-amber-300 bg-amber-950/40"
          >
            SIMULAÇÃO ATIVA
          </Badge>
        </div>

        <div className="p-6">
          {/* STEP 1: FORMULÁRIO */}
          {step === 'form' && (
            <div className="space-y-5">
              <DialogHeader className="p-0">
                <DialogTitle className="text-base text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  Checkout de Cartão de Crédito Simulado
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Validação completa com cálculo de parcelas e recibo institucional simulado
                </DialogDescription>
              </DialogHeader>

              {/* Resumo do Pedido */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                      {categoryLabel}
                    </span>
                    <p className="text-xs font-medium text-slate-200">{description}</p>
                    {studentName && (
                      <p className="text-[11px] text-slate-400 mt-0.5">Aluno(a): {studentName}</p>
                    )}
                  </div>
                  {chargeCode && (
                    <Badge
                      variant="outline"
                      className="border-blue-500/30 text-blue-400 text-[10px] font-mono shrink-0"
                    >
                      {chargeCode}
                    </Badge>
                  )}
                </div>

                <div className="border-t border-slate-800/80 pt-2 flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Valor Total do Pedido:</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(currentInstallment.totalAmount)}
                    </span>
                    {currentInstallment.hasInterest && (
                      <span className="text-[10px] text-amber-400 block font-medium">
                        (Valor nominal: {formatCurrency(amount)} + juros simples 2% a.m.)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Parcelamento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Opção de Parcelamento
                    </span>
                    <span className="text-[10px] text-emerald-400 font-normal">
                      Sem juros até 6x • 7x a 12x (2% a.m.)
                    </span>
                  </label>
                  <select
                    value={selectedInstallments}
                    onChange={(e) => setSelectedInstallments(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {installmentOptions.map((opt) => (
                      <option key={opt.installments} value={opt.installments}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Número do Cartão */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">Número do Cartão</label>
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 px-1.5 ${brandInfo.color}`}
                    >
                      {brandInfo.label}
                    </Badge>
                  </div>
                  <div className="relative">
                    <Input
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className={`bg-slate-900 text-xs text-white font-mono pr-10 ${
                        errors.number
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : 'border-slate-700'
                      }`}
                    />
                    <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                  {errors.number && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.number}
                    </p>
                  )}
                </div>

                {/* Nome do Titular */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Nome do Titular (Como gravado no cartão)
                  </label>
                  <Input
                    value={cardHolder}
                    onChange={handleHolderChange}
                    placeholder="NOME SOBRENOME"
                    className={`bg-slate-900 text-xs text-white uppercase ${
                      errors.holder
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : 'border-slate-700'
                    }`}
                  />
                  {errors.holder && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.holder}
                    </p>
                  )}
                </div>

                {/* Validade e CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Validade</label>
                    <div className="relative">
                      <Input
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/AA"
                        maxLength={5}
                        className={`bg-slate-900 text-xs text-white font-mono ${
                          errors.expiry
                            ? 'border-red-500 focus-visible:ring-red-500'
                            : 'border-slate-700'
                        }`}
                      />
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                    {errors.expiry && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.expiry}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300">CVV</label>
                      <span className="text-[10px] text-slate-400">
                        {brandInfo.cvvLength} dígitos
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        value={cardCvv}
                        onChange={handleCvvChange}
                        placeholder={brandInfo.cvvPlaceholder}
                        maxLength={brandInfo.cvvLength}
                        className={`bg-slate-900 text-xs text-white font-mono ${
                          errors.cvv
                            ? 'border-red-500 focus-visible:ring-red-500'
                            : 'border-slate-700'
                        }`}
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                    {errors.cvv && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.cvv}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs h-11 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Pagar {currentInstallment.installments}x de{' '}
                    {formatCurrency(currentInstallment.installmentAmount)}{' '}
                    {currentInstallment.installments > 1 &&
                      `(Total: ${formatCurrency(currentInstallment.totalAmount)})`}{' '}
                    (Simulado)
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: PROCESSANDO SIMULADO */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-blue-600/10 border-2 border-blue-500/30 flex items-center justify-center animate-pulse">
                  <CreditCard className="w-7 h-7 text-blue-400" />
                </div>
                <Loader2 className="w-20 h-20 text-blue-500 animate-spin absolute -top-2 -left-2 opacity-80" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">
                  Processando pagamento simulado...
                </h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Comunicando com a adquirente demonstrativa e verificando parâmetros de segurança.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-blue-400 bg-blue-950/40 border border-blue-800/40 px-3 py-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                Autorização em andamento (Modo Demonstração)
              </div>
            </div>
          )}

          {/* STEP 3: RECIBO ENRIQUECIDO */}
          {step === 'receipt' && paymentResult && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center space-y-2 pb-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Pagamento Aprovado com Sucesso!</h3>
                <p className="text-xs text-slate-400">
                  Transação autorizada instantaneamente no ambiente de demonstração
                </p>
              </div>

              {/* Recibo Institucional */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Receipt className="w-3.5 h-3.5 text-blue-400" />
                    Recibo Oficial
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    {paymentResult.receiptNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Titular:</span>
                    <strong className="text-slate-200">{paymentResult.cardHolder}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Cartão:</span>
                    <strong className="text-slate-200">
                      {paymentResult.cardBrand} •••• {paymentResult.last4}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Condição de Pagamento:</span>
                    <strong className="text-slate-200">
                      {paymentResult.installments}x de{' '}
                      {formatCurrency(paymentResult.installmentAmount)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Data / Hora:</span>
                    <strong className="text-slate-200 font-mono">{paymentResult.paidAt}</strong>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Total Liquidado:</span>
                  <span className="text-base font-bold text-white">
                    {formatCurrency(paymentResult.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30 flex items-start gap-2 text-[11px] text-blue-300">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  A baixa foi registrada no módulo Financeiro e o comprovante foi arquivado para
                  consulta e auditoria.
                </span>
              </div>

              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-10 font-semibold flex items-center justify-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                Concluir e Fechar Recibo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
