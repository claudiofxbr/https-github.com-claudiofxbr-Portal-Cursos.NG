import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { logoutAuth } from '@/lib/portalDb'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackDescription?: string
  onReset?: () => void
  onNavigateHome?: () => void
  compact?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * SPEC-INIT-001 Inversão de Error Boundaries:
 * Em caso de falha em módulo logado, o boundary NÃO diz "Sua sessão permanece ativa".
 * Ele descarta imediatamente a sessão em memória e os estados de interface,
 * e força a transição segura para a tela de autenticação/login.
 */
export class InstitutionalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // LGPD (transparência): o log registra o evento sem despejar o objeto de
    // erro/stack, que pode conter trechos de dados pessoais em memória.
    console.error(
      '[InstitutionalErrorBoundary] Falha capturada (SPEC-INIT-001): descartando sessão',
    )
    try {
      // Descarta sessão em memória e remove rastros temporários
      logoutAuth().catch(() => {})
      sessionStorage.clear()
    } catch {
      // falha silenciosa
    }
  }

  private handleToLogin = () => {
    try {
      logoutAuth().catch(() => {})
      sessionStorage.clear()
    } catch {
      // silencioso
    }
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'Falha de Execução no Módulo',
        fallbackDescription = 'Ocorreu uma falha inesperada na aplicação. Conforme a política de integridade (SPEC-INIT-001), a sessão em memória foi descartada por segurança.',
        compact = false,
      } = this.props

      if (compact) {
        return (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-slate-200 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{fallbackTitle}</span>
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{fallbackDescription}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={this.handleToLogin}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Retornar ao Login
              </Button>
            </div>
          </div>
        )
      }

      return (
        <div className="p-6 max-w-2xl mx-auto my-8">
          <Card className="bg-slate-900 border-rose-800/60 shadow-xl text-slate-200">
            <CardHeader className="text-center pb-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg font-bold text-white">{fallbackTitle}</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-400 mt-1">
                {fallbackDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {this.state.error && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-left text-xs font-mono text-slate-400 overflow-x-auto max-h-24">
                  {this.state.error.message || 'Erro desconhecido'}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  onClick={this.handleToLogin}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Ir para Tela de Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
