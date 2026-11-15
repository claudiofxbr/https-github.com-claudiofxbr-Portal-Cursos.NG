import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  BarChart3,
  GraduationCap,
  RefreshCw,
  Inbox,
  Trophy,
  TrendingUp,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchEnrollmentsByCourse,
  type EnrollmentsByCourseItem,
  type EnrollmentsByCourseResponse,
} from '@/lib/portalDb'

type LevelFilter = 'all' | 'graduacao' | 'pos_graduacao'
type StatusFilter = 'all' | string

const LEVEL_LABELS: Record<string, string> = {
  graduacao: 'Graduação',
  pos_graduacao: 'Pós-graduação',
  extensao: 'Extensão',
  ead: 'Curso EAD',
}

const STATUS_LABELS: Record<string, string> = {
  matriculado: 'Matriculado',
  ativo: 'Ativo',
  pre_matricula: 'Pré-matrícula',
  trancado: 'Trancado',
  concluido: 'Concluído',
  inativo: 'Inativo',
  inscrita: 'Inscrita',
  em_analise: 'Em análise',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  matriculado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ativo: 'bg-blue-100 text-blue-800 border-blue-200',
  pre_matricula: 'bg-amber-100 text-amber-800 border-amber-200',
  trancado: 'bg-orange-100 text-orange-800 border-orange-200',
  concluido: 'bg-violet-100 text-violet-800 border-violet-200',
  inativo: 'bg-slate-100 text-slate-700 border-slate-200',
  inscrita: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  em_analise: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelada: 'bg-red-100 text-red-800 border-red-200',
}

interface EnrollmentsByCourseModuleProps {
  canAccess: boolean
}

export function EnrollmentsByCourseModule({ canAccess }: EnrollmentsByCourseModuleProps) {
  const [data, setData] = useState<EnrollmentsByCourseResponse | null>(null)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!canAccess) return
    setLoading(true)
    setError(null)
    try {
      const resp = await fetchEnrollmentsByCourse({
        level: levelFilter === 'all' ? '' : levelFilter,
        status: statusFilter === 'all' ? '' : statusFilter,
      })
      setData(resp)
    } catch (err) {
      console.error('[MatriculasPorCurso] Falha ao carregar relatório:', err)
      setError('Não foi possível carregar o relatório. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [canAccess, levelFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const items = useMemo(() => data?.items || [], [data])

  const statusOptions = useMemo(() => {
    // prioriza os status que de fato aparecem nos dados atuais
    const present = new Set<string>()
    for (const it of items) {
      for (const st of Object.keys(it.byStatus)) present.add(st)
    }
    const ordered: string[] = []
    for (const st of data?.statuses || []) {
      if (present.has(st)) ordered.push(st)
    }
    // mantém no fim os status conhecidos que não aparecem com o filtro atual
    for (const st of data?.statuses || []) {
      if (!ordered.includes(st)) ordered.push(st)
    }
    return ordered
  }, [items, data])

  if (!canAccess) {
    return (
      <Card className="mx-auto mt-10 max-w-lg border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <BarChart3 className="h-5 w-5" />
            Acesso negado
          </CardTitle>
          <CardDescription>
            Este relatório é restrito aos perfis root, admin, secretaria, acadêmico, matrícula e
            coordenador. Se você acredita que deveria ter acesso, procure o administrador da
            plataforma.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const summary = data?.summary
  const hasActiveFilters = levelFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BarChart3 className="h-6 w-6 text-primary" />
          Relatório de Matrículas por Curso
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Total de matrículas e quebra por status para cada curso da instituição — graduação, pós e
          EAD. Cursos sem nenhuma matrícula aparecem com zero, para dar visibilidade de vagas
          ociosas.
        </p>
      </div>

      {/* Cartões de resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Total de matrículas
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {loading && !data ? '—' : (summary?.totalMatriculas ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Somando alunos e inscrições vinculados a cada curso
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-600" />
              Cursos listados
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {loading && !data ? '—' : (summary?.totalCursos ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Inclui cursos graduação, pós e EAD
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              Curso com mais matrículas
            </CardDescription>
            <CardTitle className="text-xl leading-snug">
              {loading && !data
                ? '—'
                : summary?.topCursoName
                  ? summary.topCursoName
                  : 'Sem matrículas'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary?.topCursoName ? `${summary.topCursoTotal} matrícula(s) no total` : '—'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Média por curso
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {loading && !data ? '—' : summary ? summary.mediaPorCurso.toFixed(1) : '0.0'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Matrículas por curso com os filtros atuais
          </CardContent>
        </Card>
      </div>

      {/* Filtros + tabela */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Matrículas por curso</CardTitle>
          <CardDescription>
            {items.length} curso(s) listado(s)
            {hasActiveFilters ? ' · valores filtrados' : ' · todos os cursos'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nível do curso</label>
              <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LevelFilter)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os níveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="graduacao">Graduação</SelectItem>
                  <SelectItem value="pos_graduacao">Pós-graduação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Status da matrícula
              </label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statusOptions.map((st) => (
                    <SelectItem key={st} value={st}>
                      {STATUS_LABELS[st] || st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLevelFilter('all')
                  setStatusFilter('all')
                }}
              >
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

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Curso</TableHead>
                  <TableHead className="whitespace-nowrap">Nível/Tipo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Quebra por status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <Inbox className="h-8 w-8 text-muted-foreground/50" />
                        <p className="font-medium text-muted-foreground">
                          Nenhum curso encontrado com os filtros atuais.
                        </p>
                        <p className="text-sm text-muted-foreground/80">
                          Ajuste o nível ou o status da matrícula para ver mais resultados.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => <CourseRow key={`${item.kind}-${item.id}`} item={item} />)
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CourseRow({ item }: { item: EnrollmentsByCourseItem }) {
  const statusEntries = Object.entries(item.byStatus).filter(([, n]) => n > 0)
  statusEntries.sort((a, b) => b[1] - a[1])

  return (
    <TableRow className={item.total === 0 ? 'opacity-70' : undefined}>
      <TableCell className="max-w-[280px]">
        <span className="block truncate font-medium" title={item.name}>
          {item.name}
        </span>
        {item.code ? (
          <span className="text-xs text-muted-foreground">{item.code}</span>
        ) : (
          <span className="text-xs text-muted-foreground">EAD</span>
        )}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            'whitespace-nowrap',
            item.level === 'graduacao'
              ? 'bg-sky-100 text-sky-800 border-sky-200'
              : item.level === 'pos_graduacao'
                ? 'bg-violet-100 text-violet-800 border-violet-200'
                : 'bg-slate-100 text-slate-700 border-slate-200',
          )}
        >
          {LEVEL_LABELS[item.level] || item.level}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">{item.total}</TableCell>
      <TableCell>
        {statusEntries.length === 0 ? (
          <span className="text-sm italic text-muted-foreground">
            Sem matrículas — vagas ociosas
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {statusEntries.map(([st, n]) => (
              <Badge
                key={st}
                variant="outline"
                className={cn(
                  'whitespace-nowrap tabular-nums',
                  STATUS_BADGE_STYLES[st] || 'bg-slate-100 text-slate-700 border-slate-200',
                )}
              >
                {STATUS_LABELS[st] || st}: {n}
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}
