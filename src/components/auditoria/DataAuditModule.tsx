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
  Database,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Inbox,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Loader2,
  Users,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchDataAudit,
  fetchDataAuditSummary,
  type DataAuditAction,
  type DataAuditChange,
  type DataAuditEvent,
} from '@/lib/portalDb'

type ActionFilter = 'all' | DataAuditAction
type CollectionFilter = 'all' | string
type PeriodFilter = '1' | '7' | '30'

const PAGE_SIZE = 25

/** Coleções de negócio instrumentadas no hook data_audit.pb.js. */
const COLLECTION_LABELS: Record<string, string> = {
  students: 'Alunos',
  charges: 'Cobranças',
  courses: 'Cursos',
  users: 'Usuários & Equipe',
  app_users: 'Usuários & Equipe',
  price_table_items: 'Tabela de Preços',
  billing_exceptions: 'Exceções de Faturamento',
  maintenance_tickets: 'Chamados de Manutenção',
  lgpd_requests: 'Solicitações LGPD',
  expenses: 'Despesas',
  course_enrollments: 'Matrículas',
  certificates: 'Certificados',
  classes: 'Turmas',
}

const COLLECTION_BADGE_STYLES: Record<string, string> = {
  students: 'bg-sky-100 text-sky-800 border-sky-200',
  charges: 'bg-amber-100 text-amber-800 border-amber-200',
  courses: 'bg-violet-100 text-violet-800 border-violet-200',
  users: 'bg-teal-100 text-teal-800 border-teal-200',
  app_users: 'bg-teal-100 text-teal-800 border-teal-200',
  price_table_items: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  billing_exceptions: 'bg-rose-100 text-rose-800 border-rose-200',
  maintenance_tickets: 'bg-orange-100 text-orange-800 border-orange-200',
  lgpd_requests: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  expenses: 'bg-lime-100 text-lime-800 border-lime-200',
  course_enrollments: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  certificates: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  classes: 'bg-slate-100 text-slate-700 border-slate-200',
}

const ACTION_LABELS: Record<DataAuditAction, string> = {
  create: 'Criado',
  update: 'Alterado',
  delete: 'Excluído',
}

const ACTION_BADGE_STYLES: Record<DataAuditAction, string> = {
  create: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  update: 'bg-blue-100 text-blue-800 border-blue-200',
  delete: 'bg-red-100 text-red-800 border-red-200',
}

const ACTION_ICONS: Record<DataAuditAction, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Nome completo',
  email: 'E-mail',
  name: 'Nome',
  title: 'Título',
  status: 'Status',
  role: 'Perfil',
  roleTitle: 'Cargo',
  phone: 'Telefone',
  cpf: 'CPF',
  amount: 'Valor',
  dueDate: 'Vencimento',
  paidAt: 'Pago em',
  method: 'Forma de pagamento',
  description: 'Descrição',
  category: 'Categoria',
  coordinatorId: 'Coordenador',
  instructorId: 'Instrutor',
  studentId: 'Aluno',
  courseId: 'Curso',
  subject: 'Assunto',
  priority: 'Prioridade',
  price: 'Preço',
  requestType: 'Tipo de solicitação',
}

function formatFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field
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

function ChangesSummary({ changes }: { changes: DataAuditChange[] }) {
  if (!changes || changes.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  const preview = changes
    .slice(0, 3)
    .map((c) => {
      const label = formatFieldLabel(c.field)
      if (c.from === undefined) {
        return `${label}: ${c.to ?? ''}`
      }
      return `${label}: ${c.from || '(vazio)'} → ${c.to || '(vazio)'}`
    })
    .join(' · ')
  const extra = changes.length > 3 ? ` (+${changes.length - 3} campo(s))` : ''
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block truncate text-sm text-muted-foreground">
          {preview}
          {extra}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <div className="space-y-1">
          {changes.map((c, i) => (
            <div key={`${c.field}-${i}`} className="text-xs">
              <span className="font-medium">{formatFieldLabel(c.field)}</span>
              {c.from !== undefined ? (
                <span>
                  : {c.from || '(vazio)'} → {c.to || '(vazio)'}
                </span>
              ) : (
                <span>: {c.to || '(vazio)'}</span>
              )}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

interface DataAuditModuleProps {
  canAccess: boolean
}

export function DataAuditModule({ canAccess }: DataAuditModuleProps) {
  const [events, setEvents] = useState<DataAuditEvent[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all')
  const [actorFilter, setActorFilter] = useState('')
  const [appliedActor, setAppliedActor] = useState('')
  const [period, setPeriod] = useState<PeriodFilter>('7')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({
    alteracoes24h: 0,
    usuariosAtivos: 0,
    colecaoMaisAlterada: '',
    colecaoMaisAlteradaCount: 0,
  })

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / PAGE_SIZE)), [totalItems])
  const knownCollections = useMemo(() => Object.keys(COLLECTION_LABELS), [])
  const extraCollections = useMemo(() => {
    const set = new Set<string>()
    for (const ev of events) {
      if (!knownCollections.includes(ev.collectionName)) set.add(ev.collectionName)
    }
    return Array.from(set)
  }, [events, knownCollections])
  const collectionOptions = useMemo(
    () => [...knownCollections, ...extraCollections],
    [knownCollections, extraCollections],
  )

  const load = useCallback(async () => {
    if (!canAccess) return
    setLoading(true)
    setError(null)
    try {
      const [pageData, summaryData] = await Promise.all([
        fetchDataAudit({
          action: actionFilter === 'all' ? '' : actionFilter,
          collectionName: collectionFilter === 'all' ? '' : collectionFilter,
          actor: appliedActor,
          days: Number(period) as 1 | 7 | 30,
          page,
          perPage: PAGE_SIZE,
        }),
        fetchDataAuditSummary(),
      ])
      setEvents(pageData.items || [])
      setTotalItems(pageData.totalItems || 0)
      setSummary(summaryData)
    } catch (err) {
      console.error('[LogAlteracoes] Falha ao carregar eventos:', err)
      setError('Não foi possível carregar o log de alterações. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [canAccess, actionFilter, collectionFilter, appliedActor, period, page])

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
            <Database className="h-5 w-5" />
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

  const hasActiveFilters =
    actionFilter !== 'all' || collectionFilter !== 'all' || appliedActor !== '' || period !== '7'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Database className="h-6 w-6 text-primary" />
          Log de Alterações
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trilha de auditoria de dados: toda criação, alteração e exclusão de alunos, matrículas,
          cobranças, cursos, usuários, tabela de preços, chamados e solicitações LGPD. Registros
          passam a ser gravados a partir da ativação desta função.
        </p>
      </div>

      {/* Cartões de resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              Alterações (24h)
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{summary.alteracoes24h}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Usuários que alteraram dados (24h)
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{summary.usuariosAtivos}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-600" />
              Coleção mais alterada (24h)
            </CardDescription>
            <CardTitle className="text-xl">
              {summary.colecaoMaisAlterada ? (
                <>
                  {COLLECTION_LABELS[summary.colecaoMaisAlterada] || summary.colecaoMaisAlterada}
                  <span className="ml-2 text-base font-normal text-muted-foreground tabular-nums">
                    {summary.colecaoMaisAlteradaCount} evento(s)
                  </span>
                </>
              ) : (
                <span className="font-normal text-muted-foreground">—</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      </div>

      {/* Filtros + tabela */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Eventos de alteração</CardTitle>
          <CardDescription>
            {totalItems} evento(s) encontrado(s) com os filtros atuais · {formatPeriodLabel(period)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Coleção</label>
              <Select
                value={collectionFilter}
                onValueChange={(v) => {
                  setCollectionFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todas as coleções" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as coleções</SelectItem>
                  {collectionOptions.map((coll) => (
                    <SelectItem key={coll} value={coll}>
                      {COLLECTION_LABELS[coll] || coll}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ação</label>
              <Select
                value={actionFilter}
                onValueChange={(v) => {
                  setActionFilter(v as ActionFilter)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {(Object.keys(ACTION_LABELS) as DataAuditAction[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Usuário</label>
              <Input
                className="w-[240px]"
                placeholder="Filtrar por nome ou e-mail…"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAppliedActor(actorFilter)
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
                setAppliedActor(actorFilter)
                setPage(1)
              }}
            >
              Aplicar usuário
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActionFilter('all')
                  setCollectionFilter('all')
                  setActorFilter('')
                  setAppliedActor('')
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
                    <TableHead>Ação</TableHead>
                    <TableHead>Coleção</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Feito por</TableHead>
                    <TableHead>O que mudou</TableHead>
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
                            Nenhuma alteração de dados registrada ainda.
                          </p>
                          <p className="text-sm text-muted-foreground/80">
                            Toda criação, alteração e exclusão de registros passa a ser registrada
                            daqui em diante.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((ev) => {
                      const Icon = ACTION_ICONS[ev.action] || Pencil
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
                                ACTION_BADGE_STYLES[ev.action],
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {ACTION_LABELS[ev.action] || ev.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'whitespace-nowrap',
                                COLLECTION_BADGE_STYLES[ev.collectionName] ||
                                  'bg-slate-100 text-slate-700 border-slate-200',
                              )}
                            >
                              {COLLECTION_LABELS[ev.collectionName] || ev.collectionName}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate font-medium">
                                  {ev.recordLabel || ev.recordId || '—'}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs break-all">
                                {ev.recordLabel
                                  ? `${ev.recordLabel} (${ev.recordId})`
                                  : ev.recordId}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {ev.actorEmail ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate">
                                    {ev.actorName || ev.actorEmail}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs break-all">
                                  {ev.actorName}
                                  {ev.actorEmail ? ` · ${ev.actorEmail}` : ''}
                                  {ev.src === 'sistema' ? ' · operação do sistema' : ''}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="italic text-muted-foreground">
                                {ev.src === 'sistema' ? 'Sistema' : '—'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            <ChangesSummary changes={ev.changes} />
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
