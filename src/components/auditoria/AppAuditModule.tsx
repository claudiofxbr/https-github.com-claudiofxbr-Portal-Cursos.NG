import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AuthAuditEvent,
  DataAuditAction,
  DataAuditEvent,
  fetchAuthAudit,
  fetchDataAudit,
} from '@/lib/portalDb'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Lock, History, Info, RefreshCw, Search, ShieldCheck } from 'lucide-react'

// Auditoria do Aplicativo (v0.0.106): visão UNIFICADA de todas as alterações.
// Junta a trilha de dados (data_audit: criação/alteração/exclusão, campo a campo,
// com autor) e a trilha de autenticação (auth_audit: logins, falhas, trocas de
// senha/e-mail). Trilha IMUTÁVEL: consulta e filtro apenas — nada é editado ou
// excluído por esta tela.

interface AppAuditEvent {
  key: string
  source: 'dados' | 'autenticacao'
  actionLabel: string
  actionColor: string
  entity: string
  summary: string
  fields: string
  actor: string
  actorEmail: string
  createdAtLabel: string
  createdAtRaw: string
}

const ACTION_STYLE: Record<string, { label: string; color: string }> = {
  create: { label: 'Criação', color: 'border-emerald-700 text-emerald-300' },
  update: { label: 'Alteração', color: 'border-amber-700 text-amber-300' },
  delete: { label: 'Exclusão', color: 'border-red-700 text-red-300' },
  login: { label: 'Login', color: 'border-blue-700 text-blue-300' },
  login_failed: { label: 'Falha de login', color: 'border-red-700 text-red-300' },
  logout: { label: 'Logout', color: 'border-slate-600 text-slate-300' },
  refresh: { label: 'Renovação', color: 'border-slate-600 text-slate-300' },
  password_changed: { label: 'Troca de senha', color: 'border-violet-700 text-violet-300' },
  password_reset_admin: {
    label: 'Reset de senha (admin)',
    color: 'border-violet-700 text-violet-300',
  },
  email_changed: { label: 'E-mail alterado', color: 'border-cyan-700 text-cyan-300' },
}

function styleFor(source: AppAuditEvent['source'], action: string) {
  if (source === 'autenticacao')
    return ACTION_STYLE[action] || { label: action, color: 'border-slate-600 text-slate-300' }
  return ACTION_STYLE[action] || { label: action, color: 'border-slate-600 text-slate-300' }
}

function fmtWhen(raw?: string): string {
  if (!raw) return '—'
  try {
    return new Date(
      raw.replace(' ', 'T') + (raw.includes('Z') || raw.includes('+') ? '' : 'Z'),
    ).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return raw
  }
}

function sortTime(e: AppAuditEvent): number {
  try {
    return Date.parse(e.createdAtRaw.replace(' ', 'T') + 'Z')
  } catch {
    return 0
  }
}

export function AppAuditModule({ canAccess }: { canAccess: boolean }) {
  const [dataEvents, setDataEvents] = useState<DataAuditEvent[]>([])
  const [authEvents, setAuthEvents] = useState<AuthAuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'todos' | 'dados' | 'autenticacao'>('todos')
  const [actionFilter, setActionFilter] = useState<string>('todos')
  const [page, setPage] = useState(1)
  const pageSize = 25

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [d, a] = await Promise.all([
        fetchDataAudit({ page: 1, perPage: 200 }),
        fetchAuthAudit({ page: 1, perPage: 200 }),
      ])
      setDataEvents(d.items || [])
      setAuthEvents(a.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar a trilha de auditoria.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canAccess) void load()
  }, [canAccess, load])

  const unified: AppAuditEvent[] = useMemo(() => {
    const out: AppAuditEvent[] = []
    for (const e of dataEvents) {
      const style = styleFor('dados', String(e.action) as string)
      const fields = (e.changes || []).map((c) => `${c.field}: "${c.from}" → "${c.to}"`).join(' · ')
      out.push({
        key: `d:${e.id}`,
        source: 'dados',
        actionLabel: style.label,
        actionColor: style.color,
        entity: e.collectionName,
        summary: e.recordLabel ? `${e.collectionName}: ${e.recordLabel}` : e.collectionName,
        fields: fields || '—',
        actor: e.actorName || e.actorEmail || 'sistema',
        actorEmail: e.actorEmail || '—',
        createdAtLabel: fmtWhen(e.created),
        createdAtRaw: e.created || '',
      })
    }
    for (const e of authEvents) {
      const style = styleFor('autenticacao', String(e.eventType))
      out.push({
        key: `a:${e.id}`,
        source: 'autenticacao',
        actionLabel: style.label,
        actionColor: style.color,
        entity: 'autenticação',
        summary: e.email,
        fields: e.reason || '—',
        actor: e.email,
        actorEmail: e.email || '—',
        createdAtLabel: fmtWhen(e.created),
        createdAtRaw: e.created || '',
      })
    }
    out.sort((a, b) => sortTime(b) - sortTime(a))
    return out
  }, [dataEvents, authEvents])

  const actionOptions = useMemo(() => {
    const set = new Map<string, string>()
    for (const e of unified) set.set(e.actionLabel, e.actionLabel)
    return Array.from(set.entries())
  }, [unified])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return unified.filter((e) => {
      if (sourceFilter !== 'todos' && e.source !== sourceFilter) return false
      if (actionFilter !== 'todos' && e.actionLabel !== actionFilter) return false
      if (!q) return true
      return (
        e.actor.toLowerCase().includes(q) ||
        e.actorEmail.toLowerCase().includes(q) ||
        e.entity.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.fields.toLowerCase().includes(q)
      )
    })
  }, [unified, search, sourceFilter, actionFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => {
    setPage(1)
  }, [search, sourceFilter, actionFilter])

  if (!canAccess) {
    return (
      <div className="space-y-4">
        <HeaderActions />
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Acesso restrito aos perfis Root e Administrador. Solicite acesso à governança do portal.
          </AlertDescription>
        </Alert>
        <Skeleton className="h-48 w-full bg-slate-900" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <HeaderActions />
      <Alert className="border-slate-800 bg-slate-900/60">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-xs text-slate-400">
          Visão unificada de todas as alterações do aplicativo: criações, alterações (campo a campo)
          e exclusões de registros de negócio, além dos eventos de autenticação (logins, falhas,
          troca de senha e e-mail). Cada linha mostra <strong>quem fez, o que, quando</strong>.
          Trilha <strong>imutável</strong>: é possível consultar e filtrar — não é possível editar
          ou excluir registros de auditoria.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <Card className="bg-slate-900/60 border-slate-800 p-3 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Buscar por autor, e-mail, entidade, campo alterado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-slate-950 border-slate-700 text-white text-xs"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
            className="h-9 rounded bg-slate-900 border border-slate-700 text-white text-xs px-2.5"
          >
            <option value="todos">Origem: todas</option>
            <option value="dados">Dados (campo a campo)</option>
            <option value="autenticacao">Autenticação</option>
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 rounded bg-slate-900 border border-slate-700 text-white text-xs px-2.5"
          >
            <option value="todos">Ação: todas</option>
            {actionOptions.map(([label]) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            className="h-9 text-xs border-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Atualizar
          </Button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Badge variant="outline" className="border-slate-700 text-slate-400">
            {filtered.length} evento(s)
          </Badge>
          <span>
            {dataEvents.length} de dados · {authEvents.length} de autenticação
          </span>
        </div>
      </Card>

      {/* Lista unificada */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-slate-900" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-800 p-8 text-center">
          <History className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            Nenhum evento de auditoria encontrado com os filtros atuais.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {pageItems.map((e) => (
            <Card key={e.key} className="bg-slate-900/70 border-slate-800 p-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <Badge variant="outline" className={`text-[10px] ${e.actionColor}`}>
                      {e.actionLabel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-slate-700 text-slate-400"
                    >
                      {e.source === 'dados' ? 'Dados' : 'Autenticação'}
                    </Badge>
                    <span className="text-xs font-medium text-slate-200 truncate">{e.summary}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    <span className="text-slate-500">Quem:</span> {e.actor}{' '}
                    <span className="text-slate-600">({e.actorEmail})</span>
                  </p>
                  {e.source === 'dados' && (
                    <p className="text-[11px] text-slate-500 mt-0.5 break-all">
                      <span className="text-slate-600">Campos:</span> {e.fields}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {e.createdAtLabel}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Paginação */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border-slate-700 text-xs"
          >
            Anterior
          </Button>
          <span className="text-[11px] text-slate-500">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border-slate-700 text-xs"
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}

function HeaderActions() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <History className="w-6 h-6 text-blue-400" />
        Auditoria do Aplicativo
      </h1>
      <p className="text-xs text-slate-400">
        Todas as alterações registradas — quem fez, o que, campo a campo e quando
      </p>
    </div>
  )
}
