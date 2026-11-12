import React from 'react'
import { AlertTriangle, LogIn, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface EadCourseViewErrorBoundaryProps {
  /** Volta para a lista "Meus Cursos" mantendo o aluno logado no portal */
  onBackToList: () => void
  /** Rótulo do curso para a mensagem institucional (opcional) */
  courseTitle?: string
  children: React.ReactNode
}

interface EadCourseViewErrorBoundaryState {
  hasError: boolean
  message: string | null
}

/**
 * Fronteira de erro local do player EAD do Portal do Aluno.
 *
 * Se qualquer exceção ocorrer ao renderizar a view do curso/player
 * (aula com dados ausentes/malformados no banco, vídeo quebrado etc.),
 * o aluno permanece LOGADO e vê uma mensagem institucional com opções
 * de recuperação — nunca é deslogado nem cai no portão de acesso.
 */
export class EadCourseViewErrorBoundary extends React.Component<
  EadCourseViewErrorBoundaryProps,
  EadCourseViewErrorBoundaryState
> {
  constructor(props: EadCourseViewErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: null }
  }

  static getDerivedStateFromError(error: unknown): EadCourseViewErrorBoundaryState {
    const raw =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Erro inesperado ao abrir a aula.'
    return {
      hasError: true,
      message: raw && raw.length > 0 ? raw : null,
    }
  }

  componentDidCatch(_error: unknown): void {
    // LGPD (transparência): sem despejo do objeto de erro no console —
    // a mensagem pode conter dados pessoais (título da aula, ID do aluno).
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, message: null })
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="space-y-6">
        <Card className="bg-amber-950/20 border-amber-500/30">
          <CardHeader className="p-6 pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold text-white">
                  Instabilidade ao carregar a aula
                </CardTitle>
                <CardDescription className="text-sm text-amber-200/80 leading-relaxed">
                  {this.props.courseTitle
                    ? `Ocorreu uma falha ao renderizar os recursos do curso "${this.props.courseTitle}".`
                    : 'Ocorreu uma falha ao renderizar os recursos desta videoaula.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-4">
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Tente recarregar o player da aula ou retornar para a listagem de cursos. Se o
                problema persistir, reinicie a sessão ou contate o suporte.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleRetry}
                className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recarregar aula
              </Button>
              <Button
                size="sm"
                onClick={this.props.onBackToList}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Voltar para Meus Cursos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
