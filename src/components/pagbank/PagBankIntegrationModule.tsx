import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Eye, EyeOff, ShieldCheck, Trash2, PlugZap, RefreshCw } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface PagBankStatus {
  configured: boolean
  last4?: string
  updatedAt?: string
}

interface TestResult {
  ok: boolean
  message: string
}

function formatDateTime(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Módulo "Integração PagBank" — cadastro e validação do token de API.
 *
 * Segurança:
 *  - O token digitado vive apenas no estado deste componente, é enviado UMA vez
 *    por POST e nunca é persistido no navegador (nada em localStorage/
 *    sessionStorage) nem exibido após o salvamento.
 *  - O servidor guarda o token na collection interna _pagbank_config (sem
 *    regras de API REST) e devolve apenas o estado mascarado (últimas 4).
 *  - Tela e endpoints restritos ao perfil root.
 */
export function PagBankIntegrationModule() {
  const { toast } = useToast()

  const [status, setStatus] = useState<PagBankStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [tokenDraft, setTokenDraft] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const res = (await pb.send('/backend/v1/pagbank/status', {
        method: 'GET',
      })) as PagBankStatus
      setStatus(res)
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Não foi possível consultar o status da integração.'
      setActionError(msg)
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleSave = async () => {
    const token = tokenDraft.trim()
    if (!token) {
      setActionError('Cole o token de API do PagBank antes de salvar.')
      return
    }
    setSaving(true)
    setActionError(null)
    setTestResult(null)
    try {
      await pb.send('/backend/v1/pagbank/token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
      // Descarta o valor do formulário imediatamente: nada do token fica no cliente.
      setTokenDraft('')
      setShowToken(false)
      toast({
        title: 'Token salvo',
        description: 'O token de API do PagBank foi armazenado com segurança no servidor.',
      })
      await loadStatus()
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Não foi possível salvar o token.'
      setActionError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setActionError(null)
    setTestResult(null)
    try {
      const res = (await pb.send('/backend/v1/pagbank/test', {
        method: 'POST',
        body: JSON.stringify({}),
      })) as TestResult
      setTestResult({ ok: !!res.ok, message: res.message || 'Resposta vazia do servidor.' })
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Falha ao testar a conexão com o PagBank.'
      setTestResult({ ok: false, message: msg })
    } finally {
      setTesting(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await pb.send('/backend/v1/pagbank/remove', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setTestResult(null)
      toast({
        title: 'Token removido',
        description: 'O token de API do PagBank foi apagado do servidor.',
      })
      await loadStatus()
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Não foi possível remover o token.'
      setActionError(msg)
    } finally {
      setRemoving(false)
      setRemoveOpen(false)
    }
  }

  const configured = !!status?.configured

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-primary" />
          Integração PagBank
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre o token de API usado pelo portal para falar com o PagBank (ambiente sandbox). O
          token é armazenado apenas no servidor e nunca é exibido novamente após o salvamento.
        </p>
      </div>

      {/* Status atual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Status do token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingStatus ? (
            <p className="text-sm text-muted-foreground">Consultando status…</p>
          ) : configured ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-800 border-emerald-200"
              >
                Token configurado
              </Badge>
              <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded border">
                ••••••••{status?.last4}
              </span>
              <span className="text-sm text-muted-foreground">
                Atualizado em {formatDateTime(status?.updatedAt)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                Nenhum token configurado
              </Badge>
              <span className="text-sm text-muted-foreground">
                Cadastre o token abaixo para habilitar a integração.
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadStatus()}
            disabled={loadingStatus}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingStatus ? 'animate-spin' : ''}`} />
            Atualizar status
          </Button>
        </CardContent>
      </Card>

      {/* Cadastro do token */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cadastrar / substituir token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pagbank-token">Token de API do PagBank (sandbox)</Label>
            <div className="flex gap-2">
              <Input
                id="pagbank-token"
                type={showToken ? 'text' : 'password'}
                placeholder="Cole aqui o token de API"
                value={tokenDraft}
                onChange={(e) => setTokenDraft(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken((v) => !v)}
                title={showToken ? 'Ocultar token' : 'Mostrar token'}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleSave()} disabled={saving || !tokenDraft.trim()}>
              {saving ? 'Salvando…' : 'Salvar token'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRemoveOpen(true)}
              disabled={!configured || removing}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remover token
            </Button>
          </div>
          {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
        </CardContent>
      </Card>

      {/* Teste de conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-blue-500" />
            Teste de conexão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O servidor fará uma chamada de teste à API sandbox do PagBank usando o token salvo e
            devolverá apenas sucesso ou falha — o token nunca é transmitido de volta ao navegador.
          </p>
          <Button onClick={() => void handleTest()} disabled={testing}>
            {testing ? 'Testando…' : 'Testar conexão'}
          </Button>
          {testResult ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                testResult.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {testResult.ok ? '✓ Sucesso: ' : '✗ Falha: '}
              {testResult.message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Boas práticas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boas práticas de segurança</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              Nunca envie o token por e-mail, chat, capturas de tela ou documentos — ele dá acesso
              financeiro à conta PagBank da instituição.
            </li>
            <li>
              Apenas o perfil <strong>root</strong> acessa esta tela e os endpoints de token; o
              valor é guardado no servidor, fora do alcance de qualquer navegador.
            </li>
            <li>
              Para revogar ou trocar o token, gere um novo na área de desenvolvedor do PagBank,
              salve-o aqui (a substituição é imediata) e remova o antigo da conta PagBank.
            </li>
            <li>
              Ao suspeitar de exposição, remova o token aqui imediatamente e revogue-o no painel do
              PagBank antes de cadastrar um novo.
            </li>
            <li>
              Use o botão “Testar conexão” após cada troca para confirmar que o token está válido no
              ambiente sandbox.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Confirmação de remoção */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover token do PagBank?</DialogTitle>
            <DialogDescription>
              O token será apagado do servidor e a integração deixa de funcionar até que um novo
              token seja cadastrado. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)} disabled={removing}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void handleRemove()} disabled={removing}>
              {removing ? 'Removendo…' : 'Remover token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
