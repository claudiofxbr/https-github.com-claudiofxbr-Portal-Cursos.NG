import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { usePortal } from '@/context/PortalContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Building2,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { confirmPasswordResetWithToken } = usePortal()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrorMessage(
        'Token de redefinição não encontrado na URL. Verifique se clicou no link completo enviado por e-mail.',
      )
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setErrorMessage('Token de redefinição inválido ou ausente.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres (requisito de segurança).')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('A confirmação de senha não coincide com a nova senha digitada.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await confirmPasswordResetWithToken(token, password)
      if (!res.success) {
        setErrorMessage(
          res.error ||
            'Não foi possível redefinir a senha. O link pode ter expirado ou já ter sido utilizado.',
        )
      } else {
        setIsSuccess(true)
      }
    } catch {
      setErrorMessage('Erro de comunicação ao redefinir a senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-900/95 flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-md space-y-4">
        {/* Header institucional */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            <Building2 className="w-3.5 h-3.5" />
            PortalCursos.NG • Sistema Acadêmico
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Criar Nova Senha</h2>
          <p className="text-xs text-slate-400">
            Defina sua nova credencial de acesso seguro para o portal
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-950/90 shadow-2xl text-slate-100">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Redefinição de Senha
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Digite uma nova senha segura com no mínimo 8 caracteres
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {isSuccess ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">
                    Senha Redefinida com Sucesso!
                  </h3>
                  <p className="text-xs text-slate-300">
                    Sua nova senha foi salva no PocketBase. Agora você já pode acessar o sistema com
                    sua nova credencial.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => navigate('/')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm"
                  >
                    Voltar para o Login
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <Alert
                    variant="destructive"
                    className="bg-rose-950/80 border-rose-800 text-rose-200"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-semibold">Atenção</AlertTitle>
                    <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Nova Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    disabled={isSubmitting || !token}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white focus-visible:ring-blue-500 text-sm"
                    required
                  />
                  <span className="text-[11px] text-slate-400">
                    Utilize letras, números e símbolos para maior proteção.
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Confirmar Nova Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={passwordConfirm}
                    disabled={isSubmitting || !token}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white focus-visible:ring-blue-500 text-sm"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !token || !password || !passwordConfirm}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gravando Nova Senha...
                    </>
                  ) : (
                    'Salvar Nova Senha'
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Voltar para o Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Proteção Criptográfica PocketBase
          </span>
          <span>PortalCursos.NG</span>
        </div>
      </div>
    </div>
  )
}
