export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'diners' | 'outro'

export interface CardBrandInfo {
  brand: CardBrand
  label: string
  cvvLength: number
  cvvPlaceholder: string
  color: string
}

export const CARD_BRANDS: Record<CardBrand, CardBrandInfo> = {
  visa: {
    brand: 'visa',
    label: 'Visa',
    cvvLength: 3,
    cvvPlaceholder: '123',
    color: 'text-blue-400 border-blue-500/40 bg-blue-950/40',
  },
  mastercard: {
    brand: 'mastercard',
    label: 'Mastercard',
    cvvLength: 3,
    cvvPlaceholder: '123',
    color: 'text-orange-400 border-orange-500/40 bg-orange-950/40',
  },
  elo: {
    brand: 'elo',
    label: 'Elo',
    cvvLength: 3,
    cvvPlaceholder: '123',
    color: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
  },
  amex: {
    brand: 'amex',
    label: 'American Express',
    cvvLength: 4,
    cvvPlaceholder: '1234',
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
  },
  hipercard: {
    brand: 'hipercard',
    label: 'Hipercard',
    cvvLength: 3,
    cvvPlaceholder: '123',
    color: 'text-red-400 border-red-500/40 bg-red-950/40',
  },
  diners: {
    brand: 'diners',
    label: 'Diners Club',
    cvvLength: 3,
    cvvPlaceholder: '123',
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
  },
  outro: {
    brand: 'outro',
    label: 'Cartão de Crédito',
    cvvLength: 3,
    cvvPlaceholder: '123',
    color: 'text-slate-400 border-slate-700 bg-slate-900',
  },
}

export function detectCardBrand(rawNumber: string): CardBrand {
  const clean = rawNumber.replace(/\D/g, '')
  if (!clean) return 'outro'

  if (
    /^(4011|4312|4389|4514|4576|5041|5066|5090|6277|6362|6363|6504|6505|6506|6507|6508|6509|6516|6550)/.test(
      clean,
    )
  ) {
    return 'elo'
  }

  if (/^3[47]/.test(clean)) return 'amex'
  if (/^(30[0-5]|36|38)/.test(clean)) return 'diners'
  if (/^(606282|3841)/.test(clean)) return 'hipercard'
  if (/^4/.test(clean)) return 'visa'
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'mastercard'

  return 'outro'
}

export function formatCardNumber(rawNumber: string): string {
  const clean = rawNumber.replace(/\D/g, '')
  const brand = detectCardBrand(clean)

  if (brand === 'amex') {
    const limited = clean.slice(0, 15)
    const part1 = limited.slice(0, 4)
    const part2 = limited.slice(4, 10)
    const part3 = limited.slice(10, 15)
    return [part1, part2, part3].filter(Boolean).join(' ')
  }

  const limited = clean.slice(0, 16)
  const parts = limited.match(/.{1,4}/g)
  return parts ? parts.join(' ') : ''
}

export function formatCardExpiry(rawExpiry: string): string {
  const clean = rawExpiry.replace(/\D/g, '').slice(0, 4)
  if (clean.length <= 2) return clean
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`
}

export function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false

  let sum = 0
  let shouldDouble = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10)
    if (isNaN(digit)) return false

    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }

    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

export function validateExpiry(expiryStr: string): { valid: boolean; error?: string } {
  const clean = expiryStr.replace(/\D/g, '')
  if (clean.length < 4) {
    return { valid: false, error: 'Informe mês e ano completo (MM/AA)' }
  }

  const month = parseInt(clean.slice(0, 2), 10)
  const year2 = parseInt(clean.slice(2, 4), 10)

  if (month < 1 || month > 12) {
    return { valid: false, error: 'Mês inválido (deve ser entre 01 e 12)' }
  }

  const now = new Date()
  const currentYear2 = now.getFullYear() % 100
  const currentMonth = now.getMonth() + 1

  if (year2 < currentYear2 || (year2 === currentYear2 && month < currentMonth)) {
    return { valid: false, error: 'Cartão com validade vencida' }
  }

  if (year2 > currentYear2 + 25) {
    return { valid: false, error: 'Ano de validade muito distante' }
  }

  return { valid: true }
}

export function validateCvv(cvv: string, brand: CardBrand): { valid: boolean; error?: string } {
  const clean = cvv.replace(/\D/g, '')
  const requiredLen = CARD_BRANDS[brand]?.cvvLength || 3

  if (clean.length === 0) {
    return { valid: false, error: 'Código de segurança (CVV) obrigatório' }
  }

  if (clean.length !== requiredLen) {
    return {
      valid: false,
      error: `CVV da bandeira ${CARD_BRANDS[brand].label} deve conter exatamente ${requiredLen} dígitos`,
    }
  }

  return { valid: true }
}

export function validateCardHolder(holder: string): { valid: boolean; error?: string } {
  const trimmed = holder.trim()
  if (!trimmed) {
    return { valid: false, error: 'Nome do titular impresso no cartão é obrigatório' }
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length < 2) {
    return { valid: false, error: 'Informe nome e sobrenome como no cartão' }
  }

  if (/[^a-zA-ZÀ-ÿ\s.'-]/.test(trimmed)) {
    return { valid: false, error: 'Nome contém caracteres não permitidos' }
  }

  return { valid: true }
}

export interface InstallmentOption {
  installments: number
  installmentAmount: number
  totalAmount: number
  hasInterest: boolean
  interestRateMonthly: number
  label: string
}

export function calculateInstallments(baseAmount: number): InstallmentOption[] {
  const options: InstallmentOption[] = []
  const safeBase = Math.max(0, baseAmount)

  for (let n = 1; n <= 12; n++) {
    if (n <= 6) {
      const installmentAmount = Math.round((safeBase / n) * 100) / 100
      options.push({
        installments: n,
        installmentAmount,
        totalAmount: safeBase,
        hasInterest: false,
        interestRateMonthly: 0,
        label:
          n === 1
            ? `1x de ${formatCurrency(safeBase)} (à vista, sem juros)`
            : `${n}x de ${formatCurrency(installmentAmount)} (sem juros)`,
      })
    } else {
      const rate = 0.02
      const totalAmount = Math.round(safeBase * (1 + rate * n) * 100) / 100
      const installmentAmount = Math.round((totalAmount / n) * 100) / 100
      options.push({
        installments: n,
        installmentAmount,
        totalAmount,
        hasInterest: true,
        interestRateMonthly: rate * 100,
        label: `${n}x de ${formatCurrency(installmentAmount)} (com juros de 2% a.m. • Total: ${formatCurrency(totalAmount)})`,
      })
    }
  }

  return options
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
