import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ShieldCheck,
  LogIn,
  LogOut,
  RefreshCw,
  Ban,
  Inbox,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchAuthAudit, fetchAuthAuditSummary, type AuthAuditEvent } from '@/lib/portalDb'

type EventTypeFilter = 'all' | AuthAuditEvent['eventType']
type PeriodFilter = '1' | '7' | '30'

const PAGE_SIZE = 25

const EVENT_LABELS: Record<AuthAuditEvent['eventType'], string> = {
  login_success: 'Login bem-sucedido',
  login_failed: 'Login falho',
  refresh: 'Renovação de sessão',
  logout: 'Logout',
  blocked_attempt: 'Tentativa bloqueada',
}

const EVENT_BADGE_STYLES: Record<AuthAuditEvent['eventType'], string> = {
  login_success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  login_failed: 'bg-red-100 text-red-800 border-red-200',
  blocked_attempt: 'bg-orange-100 text-orange-800 border-orange-200',
  refresh: 'bg-slate-100 text-slate-700 border-slate-200',
  logout: 'bg-slate-100 text-slate-700 border-slate-200',
}

const EVENT_ICONS: Record<AuthAuditEvent['eventType'], typeof LogIn> = {
  login_success: LogIn,
  login_failed: Ban,
  refresh: RefreshCw,
  logout: LogOut,
  blocked_attempt: Ban,
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatPeriodLabel(days: PeriodFilter): string {
  return days === '1' ? 'Hoje' : `Últimos ${days} dias`
}

interface AuthAuditModuleProps {
  canAccess: boolean
}

export function AuthAuditModule({ canAccess }: AuthAuditModuleProps) {
  const [events, setEvents] = useState<AuthAuditEvent[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [eventFilter, setEventFilter] = useState<EventTypeFilter>('all')
  const [emailFilter, setEmailFilter] = useState('')
  const [appliedEmail, setAppliedEmail] = useState('')
  const [period, setPeriod] = useState<PeriodFilter>('7')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({
    loginsOk24h: 0,
    falhas24h: 0,
    sessoesAtivas: 0,
  })

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / PAGE_SIZE)), [totalItems])

  const load = useCallback(async () => {
    if (!canAccess) return
    setLoading(true)
    setError(null)
    try {
      const [pageData, summaryData] = await Promise.all([
        fetchAuthAudit({
          eventType: eventFilter === 'all' ? '' : eventFilter,
          email: appliedEmail,
          days: Number(period) as 1 | 7 | 30,
          page,
          perPage: PAGE_SIZE,
        }),
        fetchAuthAuditSummary(),
      ])
      setEvents(pageData.items || [])
      setTotalItems(pageData.totalItems || 0)
      setSummary(summaryData)
    } catch (err) {
      console.error('[AuditoriaAuth] Falha ao carregar eventos:', err)
      setError('Não foi possível carregar os eventos de auditoria. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [canAccess, eventFilter, appliedEmail, period, page])

  useEffect(() => {
    load()
  }, [load])

  // Renova os dados a cada 60s sem recarregar a página inteira.
  useEffect(() => {
    if (!canAccess) return
    const timer = setInterval(load, 60_000)
    return () => clearInterval(timer)
  }, [load, canAccess])

  if (!canAccess) {
    return (
      <Card className="mx-auto mt-10 max-w-lg border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <ShieldCheck className="h-5 w-5" />
            Acesso negado
          </CardTitle>
          <CardDescription>
            Esta área é restrita aos perfis root e admin. Se você acredita que deveria ter acesso,
            procure o administrador da plataforma.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const hasActiveFilters = eventFilter !== 'all' || appliedEmail !== '' || period !== '7'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Auditoria de Autenticação
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trilha completa de logins, falhas, renovações e logouts da plataforma. Eventos passam a
          ser registrados a partir da ativação desta função.
        </p>
      </div>

      {/* Cartões de resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <LogIn className="h-4 w-4 text-emerald-600" />
              Logins bem-sucedidos (24h)
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{summary.loginsOk24h}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-600" />
              Tentativas falhas (24h)
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{summary.falhas24h}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              Sessões ativas
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{summary.sessoesAtivas}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Eventos</CardTitle>
          <CardDescription>
            {totalItems} evento(s) encontrado(s) com os filtros atuais · {formatPeriodLabel(period)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo de evento</label>
              <Select
                value={eventFilter}
                onValueChange={(v) => {
                  setEventFilter(v as EventTypeFilter)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todos os eventos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  {(Object.keys(EVENT_LABELS) as AuthAuditEvent['eventType'][]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {EVENT_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">E-mail ou usuário</label>
              <Input
                className="w-[260px]"
                placeholder="Filtrar por e-mail…"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAppliedEmail(emailFilter)
                    setPage(1)
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <Select
                value={period}
                onValueChange={(v) => {
                  setPeriod(v as PeriodFilter)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Hoje</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAppliedEmail(emailFilter)
                setPage(1)
              }}
            >
              Aplicar e-mail
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEventFilter('all')
                  setEmailFilter('')
                  setAppliedEmail('')
                  setPeriod('7')
                  setPage(1)
                }}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={load}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
              )}
              Atualizar
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Tabela de eventos */}
          <TooltipProvider delayDuration={200}>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Data/hora</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>E-mail / usuário</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="w-[140px]">IP</TableHead>
                    <TableHead className="w-[200px]">User agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                          <Inbox className="h-8 w-8 text-muted-foreground/50" />
                          <p className="font-medium text-muted-foreground">
                            Nenhum evento de autenticação registrado ainda.
                          </p>
                          <p className="text-sm text-muted-foreground/80">
                            Os eventos passam a ser registrados a partir de agora.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((ev) => {
                      const Icon = EVENT_ICONS[ev.eventType] || ShieldCheck
                      return (
                        <TableRow key={ev.id}>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {formatDateTime(ev.created)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'gap-1 whitespace-nowrap',
                                EVENT_BADGE_STYLES[ev.eventType],
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {EVENT_LABELS[ev.eventType] || ev.eventType}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {ev.userId ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate">{ev.email}</span>
                                </TooltipTrigger>
                                <TooltipContent>{ev.userId}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="italic text-muted-foreground">
                                {ev.email || '—'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            {ev.reason ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate text-sm text-muted-foreground">
                                    {ev.reason}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">{ev.reason}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ev.ip ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate tabular-nums">{ev.ip}</span>
                                </TooltipTrigger>
                                <TooltipContent>{ev.ip}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ev.userAgent ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate text-muted-foreground">
                                    {ev.userAgent}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm break-all">
                                  {ev.userAgent}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>

          {/* Paginação */}
          {totalItems > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} · {totalItems} evento(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
