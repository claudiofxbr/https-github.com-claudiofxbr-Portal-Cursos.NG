import React, { useEffect, useRef, useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { PORTAL_GATE_PASSCODE } from '@/data/portalMockData'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  KeyRound,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Building2,
} from 'lucide-react'

export function PortalGateGuard({ children }: { children: React.ReactNode }) {
  const { isGateUnlocked, gateAttempts, isGateLockedOut, unlockGate } = usePortal()
  const [passcode, setPasscode] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successPing, setSuccessPing] = useState(false)

  // O bloqueio (gateLock) vive no contexto e sobrevive ao reload; aqui apenas
  // reagimos à expiração — o provider zera o estado quando o prazo acaba.
  // Nenhum timer neste componente: nada de setState após unmount.
  const gateAttemptsRef = useRef(gateAttempts)
  gateAttemptsRef.current = gateAttempts

  // Limpa mensagem de erro quando o bloqueio termina (feedback coerente)
  useEffect(() => {
    if (!isGateLockedOut && errorMsg && gateAttemptsRef.current === 0) {
      setErrorMsg(null)
    }
  }, [isGateLockedOut, errorMsg])

  if (isGateUnlocked) {
    return <>{children}</>
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passcode.trim()) {
      setErrorMsg('Por favor, informe a chave de acesso do portal.')
      return
    }

    const success = unlockGate(passcode)
    if (success) {
      setSuccessPing(true)
      setErrorMsg(null)
    } else {
      setErrorMsg('Código incorreto. Verifique a credencial do portão institucional.')
    }
  }

  const handleQuickFill = () => {
    setPasscode(PORTAL_GATE_PASSCODE)
    setErrorMsg(null)
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 border border-blue-400/30 mb-2">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">PortalCursos.NG</h1>
            <Badge variant="outline" className="text-xs border-blue-400 text-blue-300 font-mono">
              PDR v2.4.1
            </Badge>
          </div>
          <p className="text-sm text-slate-400">
            Ambiente institucional de gestão acadêmica, matrículas e finanças
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl shadow-black/60 text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-white">
                <Lock className="w-4 h-4 text-amber-400" />
                Portão de Acesso Institucional
              </CardTitle>
              <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
                Passcode Gate
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Esta instância requer a validação da chave corporativa prévia antes da autenticação de
              usuários.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {isGateLockedOut ? (
              <Alert variant="destructive" className="bg-rose-950/70 border-rose-800 text-rose-200">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">
                  Portão Temporariamente Travado
                </AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  Muitas tentativas sem sucesso (4/4). Aguarde 30 segundos antes de tentar
                  desbloquear novamente.
                </AlertDescription>
              </Alert>
            ) : null}

            {errorMsg && !isGateLockedOut ? (
              <Alert className="bg-amber-950/50 border-amber-800 text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-xs">
                  {errorMsg} (Tentativas: {gateAttempts}/4)
                </AlertDescription>
              </Alert>
            ) : null}

            {successPing ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium py-2">
                <CheckCircle2 className="w-4 h-4" />
                Código validado com sucesso! Abrindo portal...
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Código do Portão (Passcode)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    disabled={isGateLockedOut}
                    placeholder="Digite o código (ex: PORTAL2025)"
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value)
                      setErrorMsg(null)
                    }}
                    className="pl-9 font-mono tracking-widest bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isGateLockedOut || !passcode}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-blue-600/30"
              >
                Liberar Acesso ao Portal
              </Button>
            </form>

            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs text-blue-200">
                    Código padrão de homologação:{' '}
                    <strong className="font-mono text-white">{PORTAL_GATE_PASSCODE}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleQuickFill}
                  className="h-7 text-xs border-blue-700 text-blue-300 hover:bg-blue-900/60"
                >
                  Preencher
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-0 text-[11px] text-slate-500 justify-between">
            <span>Segurança perimetral ativa</span>
            <span className="flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PortalCursos.NG Gateway
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
