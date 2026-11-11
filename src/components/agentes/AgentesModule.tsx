import React, { useCallback, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { usePortal } from '@/context/PortalContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Bot,
  Bug,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface AgentInfo {
  slug: string
  name: string
  role: string
  order: number
}

interface CycleEvent {
  id: string
  eventType: 'iniciado' | 'etapa_concluida' | 'impedimento' | 'encerrado'
  message: string
  openFindings: number
  pendingSolutions: number
  createdByAgent: string
  created: string
}

interface CycleState {
  openFindings: number
  pendingSolutions: number
  totalFindings: number
  totalSolutions: number
  closed: boolean
}

interface Overview {
  agents: AgentInfo[]
  cycle: CycleState
  events: CycleEvent[]
}

interface AgentFinding {
  id: string
  title: string
  description: string
  rootCause: string
  severity: 'baixa' | 'media' | 'alta' | 'critica'
  status: 'aberto' | 'em_analise' | 'encaminhado' | 'resolvido'
  origin: 'codigo' | 'banco' | 'github' | 'processo'
  createdByAgent: string
  created: string
}

interface AgentSolution {
  id: string
  findingId: string
  findingTitle: string
  proposal: string
  riskAnalysis: string
  validationResult: string
  testResult: string
  status: 'proposto' | 'validado' | 'aplicado' | 'rejeitado'
  createdByAgent: string
  created: string
}

interface ChatEntry {
  role: 'user' | 'agent'
  content: string
  at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stripHtml = (s: string): string =>
  (s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const severityStyle: Record<AgentFinding['severity'], string> = {
  baixa: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  media: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  alta: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  critica: 'bg-red-500/10 text-red-300 border-red-500/30',
}

const findingStatusStyle: Record<AgentFinding['status'], string> = {
  aberto: 'bg-red-500/10 text-red-300 border-red-500/30',
  em_analise: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  encaminhado: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  resolvido: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
}

const solutionStatusStyle: Record<AgentSolution['status'], string> = {
  proposto: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  validado: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  aplicado: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  rejeitado: 'bg-red-500/10 text-red-300 border-red-500/30',
}

const eventStyle: Record<CycleEvent['eventType'], string> = {
  iniciado: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  etapa_concluida: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  impedimento: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  encerrado: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
}

const originLabel: Record<AgentFinding['origin'], string> = {
  codigo: 'Código',
  banco: 'Banco',
  github: 'GitHub',
  processo: 'Processo',
}

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'analisador-portalcursos': Bug,
  'solucionador-portalcursos': Wrench,
  'gerenciador-portalcursos': ClipboardList,
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function AgentesModule() {
  const { currentUser } = usePortal()
  const isPrivileged = currentUser?.role === 'root' || currentUser?.role === 'admin'

  const [overview, setOverview] = useState<Overview | null>(null)
  const [findings, setFindings] = useState<AgentFinding[]>([])
  const [solutions, setSolutions] = useState<AgentSolution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatSlug, setChatSlug] = useState<string | null>(null)
  const [chatEntries, setChatEntries] = useState<Record<string, ChatEntry[]>>({})
  const [chatDraft, setChatDraft] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ov, f, s] = await Promise.all([
        pb.send('/backend/v1/agents/overview', { method: 'GET' }) as Promise<Overview>,
        pb.collection('agent_findings').getFullList({ sort: '-created' }) as Promise<
          AgentFinding[]
        >,
        pb.collection('agent_solutions').getFullList({ sort: '-created' }) as Promise<
          AgentSolution[]
        >,
      ])
      setOverview(ov)
      setFindings(f)
      setSolutions(s)
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Falha ao carregar os dados do ciclo de agentes.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPrivileged) void load()
  }, [isPrivileged, load])

  const sendChat = useCallback(
    async (slug: string) => {
      const text = chatDraft.trim()
      if (!text || chatSending) return
      setChatSending(true)
      setChatError(null)
      try {
        const res = (await pb.send('/backend/v1/agents/chat', {
          method: 'POST',
          body: JSON.stringify({ slug, message: text }),
        })) as { content?: string; error?: string }
        if (res.error) {
          setChatError(res.error)
        } else {
          setChatEntries((prev) => ({
            ...prev,
            [slug]: [
              ...(prev[slug] || []),
              { role: 'user', content: text, at: new Date().toISOString() },
              {
                role: 'agent',
                content: res.content || '(sem resposta)',
                at: new Date().toISOString(),
              },
            ],
          }))
        }
      } catch (err) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Falha ao falar com o agente.'
        setChatError(msg)
      } finally {
        setChatSending(false)
        setChatDraft('')
      }
    },
    [chatDraft, chatSending],
  )

  if (!isPrivileged) {
    return (
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bot className="h-5 w-5 text-blue-400" />
            Agentes Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">Seção restrita aos perfis root/admin.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Bot className="h-6 w-6 text-blue-400" />
            Agentes Inteligentes — PortalCursos.NG
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Ciclo nativo Skip Cloud na ordem Analisador → Solucionador → Gerenciador.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="py-3 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      {loading && !overview ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full bg-slate-800" />
          <Skeleton className="h-48 w-full bg-slate-800" />
          <Skeleton className="h-48 w-full bg-slate-800" />
        </div>
      ) : (
        <>
          {/* Estado do ciclo (Gerenciador) */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base text-white">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-400" />
                  Estado do ciclo
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'border font-mono text-[11px]',
                    overview?.cycle.closed
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                  )}
                >
                  {overview?.cycle.closed ? 'ENCERRADO' : 'CICLO ABERTO'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Problemas abertos', overview?.cycle.openFindings ?? 0],
                  ['Soluções pendentes', overview?.cycle.pendingSolutions ?? 0],
                  ['Problemas registrados', overview?.cycle.totalFindings ?? 0],
                  ['Soluções registradas', overview?.cycle.totalSolutions ?? 0],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="text-2xl font-bold text-white">{String(value)}</div>
                    <div className="text-[11px] text-slate-400">{String(label)}</div>
                  </div>
                ))}
              </div>

              {overview && overview.events.length > 0 && (
                <ScrollArea className="h-44 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="space-y-2.5">
                    {overview.events.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2 text-xs">
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 border font-mono text-[10px] uppercase',
                            eventStyle[ev.eventType] || eventStyle.iniciado,
                          )}
                        >
                          {ev.eventType}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-slate-300">{stripHtml(ev.message)}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {fmtDate(ev.created)} · {ev.createdByAgent || 'sistema'} · abertos:{' '}
                            {ev.openFindings} · pendentes: {ev.pendingSolutions}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Os 3 agentes */}
          <div className="grid gap-4 md:grid-cols-3">
            {(overview?.agents || []).map((a) => {
              const Icon = AGENT_ICONS[a.slug] || Bot
              const entries = chatEntries[a.slug] || []
              return (
                <Card key={a.slug} className="flex flex-col border-slate-800 bg-slate-900/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm text-white">
                      <span className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                        <Icon className="h-4 w-4 text-blue-400" />
                      </span>
                      <span>
                        <span className="block">
                          {a.order}. {a.name}
                        </span>
                        <span className="block text-[11px] font-normal text-slate-400">
                          {a.role}
                        </span>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                      onClick={() => setChatSlug(chatSlug === a.slug ? null : a.slug)}
                    >
                      Conversar com o agente
                    </Button>

                    {chatSlug === a.slug && (
                      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                        <ScrollArea className="h-32">
                          {entries.length === 0 ? (
                            <p className="text-[11px] text-slate-500">
                              Nenhuma mensagem ainda. Pergunte, por exemplo: “Analise o banco e
                              registre os problemas encontrados.”
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {entries.map((m, i) => (
                                <div
                                  key={`${a.slug}-${i}`}
                                  className={cn(
                                    'max-w-[90%] rounded-lg px-2.5 py-1.5 text-[11px]',
                                    m.role === 'user'
                                      ? 'ml-auto bg-blue-600/20 text-blue-100'
                                      : 'bg-slate-800/80 text-slate-200',
                                  )}
                                >
                                  {m.content}
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                        <form
                          className="flex gap-1.5"
                          onSubmit={(ev) => {
                            ev.preventDefault()
                            void sendChat(a.slug)
                          }}
                        >
                          <Input
                            value={chatDraft}
                            onChange={(ev) => setChatDraft(ev.target.value)}
                            placeholder="Mensagem para o agente…"
                            className="h-8 border-slate-700 bg-slate-900 text-xs text-white placeholder:text-slate-500"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={chatSending || !chatDraft.trim()}
                            className="h-8 px-2.5"
                          >
                            {chatSending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </form>
                        {chatError && <p className="text-[11px] text-red-300">{chatError}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Problemas (agent_findings) */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Bug className="h-5 w-5 text-red-400" />
                Problemas registrados pelo Analisador
              </CardTitle>
            </CardHeader>
            <CardContent>
              {findings.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhum problema registrado ainda. Converse com o Analisador e peça a análise do
                  banco/código.
                </p>
              ) : (
                <div className="space-y-3">
                  {findings.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{f.title}</span>
                        <Badge
                          variant="outline"
                          className={cn('border text-[10px]', severityStyle[f.severity])}
                        >
                          {f.severity}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn('border text-[10px]', findingStatusStyle[f.status])}
                        >
                          {f.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border border-slate-700 text-[10px] text-slate-300"
                        >
                          {originLabel[f.origin] || f.origin}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-300">{stripHtml(f.description)}</p>
                      {f.rootCause && (
                        <p className="mt-1 text-xs text-slate-400">
                          <span className="font-medium text-slate-300">Causa raiz: </span>
                          {stripHtml(f.rootCause)}
                        </p>
                      )}
                      <p className="mt-1.5 text-[10px] text-slate-500">
                        {fmtDate(f.created)} · {f.createdByAgent || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Soluções (agent_solutions) */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Wrench className="h-5 w-5 text-emerald-400" />
                Soluções propostas pelo Solucionador
              </CardTitle>
            </CardHeader>
            <CardContent>
              {solutions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhuma solução proposta ainda. Após o Analisador registrar problemas, peça ao
                  Solucionador que proponha, valide e teste as correções.
                </p>
              ) : (
                <div className="space-y-3">
                  {solutions.map((s) => {
                    const finding = findings.find((f) => f.id === s.findingId)
                    return (
                      <div
                        key={s.id}
                        className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {s.findingTitle || finding?.title || s.findingId}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn('border text-[10px]', solutionStatusStyle[s.status])}
                          >
                            {s.status}
                          </Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-300">
                          <span className="font-medium">Correção: </span>
                          {stripHtml(s.proposal)}
                        </p>
                        {s.riskAnalysis && (
                          <p className="mt-1 text-xs text-amber-200/80">
                            <span className="font-medium">Risco: </span>
                            {stripHtml(s.riskAnalysis)}
                          </p>
                        )}
                        {s.validationResult && (
                          <p className="mt-1 flex items-start gap-1 text-xs text-emerald-200/80">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                              <span className="font-medium">Validação: </span>
                              {stripHtml(s.validationResult)}
                            </span>
                          </p>
                        )}
                        {s.testResult && (
                          <p className="mt-1 flex items-start gap-1 text-xs text-cyan-200/80">
                            <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                              <span className="font-medium">Teste: </span>
                              {stripHtml(s.testResult)}
                            </span>
                          </p>
                        )}
                        <p className="mt-1.5 text-[10px] text-slate-500">
                          {fmtDate(s.created)} · {s.createdByAgent || '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Coleções do ciclo (agent_findings, agent_solutions, agent_cycle_log) restritas aos
            perfis root/admin no banco.
          </p>
        </>
      )}
    </div>
  )
}
