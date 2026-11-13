import { useMemo, useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Enrollment, EnrollmentStatus, ENROLLMENT_STATUS_LABELS } from '@/types/portal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  GraduationCap,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ClipboardList,
  History,
} from 'lucide-react'

const STATUS_OPTIONS: EnrollmentStatus[] = ['inscrita', 'em_analise', 'confirmada', 'cancelada']

const LEVEL_LABELS: Record<string, string> = {
  graduacao: 'Graduação',
  pos_graduacao: 'Pós-graduação',
  extensao: 'Extensão',
}

const MODALITY_LABELS: Record<string, string> = {
  presencial: 'Presencial',
  ead: 'EAD',
  semipresencial: 'Semipresencial',
}

const STATUS_BADGE_CLASSES: Record<EnrollmentStatus, string> = {
  inscrita: 'bg-blue-100 text-blue-800 border-blue-200',
  em_analise: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelada: 'bg-red-100 text-red-800 border-red-200',
}

const STATUS_ICONS: Record<EnrollmentStatus, React.ReactNode> = {
  inscrita: <ClipboardList className="h-4 w-4" />,
  em_analise: <Clock className="h-4 w-4" />,
  confirmada: <CheckCircle2 className="h-4 w-4" />,
  cancelada: <XCircle className="h-4 w-4" />,
}

/** Fluxo permitido: inscrita → em_analise → confirmada/cancelada (cancelamento a partir de qualquer etapa). */
const ALLOWED_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  inscrita: ['em_analise', 'confirmada', 'cancelada'],
  em_analise: ['confirmada', 'cancelada'],
  confirmada: ['cancelada'],
  cancelada: [],
}

function formatDate(value?: string): string {
  if (!value) return '—'
  const isoLike = value.includes('T') ? value : `${value}T12:00:00`
  const d = new Date(isoLike)
  if (isNaN(d.getTime())) return value
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface GestaoInscricoesModuleProps {
  embedded?: boolean
}

/** Módulo administrativo de gestão de inscrições em cursos (Matrículas). */
export function GestaoInscricoesModule({ embedded }: GestaoInscricoesModuleProps) {
  const { currentUser, courseEnrollments, updateEnrollmentStatus } = usePortal()

  const [statusFilter, setStatusFilter] = useState<'todas' | EnrollmentStatus>('todas')
  const [levelFilter, setLevelFilter] = useState<'todos' | 'graduacao' | 'pos_graduacao'>('todos')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<Enrollment | null>(null)
  const [nextStatus, setNextStatus] = useState<EnrollmentStatus | ''>('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const base: Record<EnrollmentStatus, number> = {
      inscrita: 0,
      em_analise: 0,
      confirmada: 0,
      cancelada: 0,
    }
    courseEnrollments.forEach((e) => {
      base[e.status] = (base[e.status] || 0) + 1
    })
    return base
  }, [courseEnrollments])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return courseEnrollments
      .filter((e) => (statusFilter === 'todas' ? true : e.status === statusFilter))
      .filter((e) => (levelFilter === 'todos' ? true : e.courseLevel === levelFilter))
      .filter((e) =>
        q
          ? e.studentName?.toLowerCase().includes(q) ||
            e.courseName?.toLowerCase().includes(q) ||
            e.courseCode?.toLowerCase().includes(q)
          : true,
      )
  }, [courseEnrollments, statusFilter, levelFilter, search])

  const detailLive = detail ? courseEnrollments.find((e) => e.id === detail.id) || detail : null

  const transitions = detailLive ? ALLOWED_TRANSITIONS[detailLive.status] : []

  const openDetail = (enrollment: Enrollment) => {
    setDetail(enrollment)
    setNextStatus('')
    setNote('')
    setError(null)
  }

  const requiresNote =
    nextStatus === 'cancelada' || (nextStatus !== '' && detailLive?.status === 'confirmada')

  const handleSubmit = async () => {
    if (!detailLive || !nextStatus) return
    if (requiresNote && !note.trim()) {
      setError('O motivo é obrigatório para cancelar ou revisar uma confirmação.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await updateEnrollmentStatus(detailLive.id, {
      status: nextStatus,
      note: note.trim() || undefined,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Não foi possível atualizar a inscrição.')
      return
    }
    setDetail(null)
  }

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 space-y-6'}>
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Gestão de Inscrições
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Analise e atualize as inscrições realizadas na Biblioteca de Cursos. Toda alteração de
          status fica registrada no histórico da inscrição.
        </p>
      </div>

      {/* Contadores por status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(statusFilter === status ? 'todas' : status)}
            className={`text-left rounded-lg border p-4 transition-colors ${
              statusFilter === status ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {STATUS_ICONS[status]}
              {ENROLLMENT_STATUS_LABELS[status]}
            </div>
            <div className="text-2xl font-bold mt-1">{counts[status]}</div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aluno, curso ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'todas' | EnrollmentStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ENROLLMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select
              value={levelFilter}
              onValueChange={(v) => setLevelFilter(v as 'todos' | 'graduacao' | 'pos_graduacao')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os níveis</SelectItem>
                <SelectItem value="graduacao">Graduação</SelectItem>
                <SelectItem value="pos_graduacao">Pós-graduação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Listagem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Inscrições ({filtered.length}
            {filtered.length !== courseEnrollments.length ? ` de ${courseEnrollments.length}` : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma inscrição encontrada com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Aluno</th>
                    <th className="py-2 pr-3 font-medium">Curso</th>
                    <th className="py-2 pr-3 font-medium">Nível</th>
                    <th className="py-2 pr-3 font-medium">Solicitada em</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{e.studentName || '—'}</div>
                        <div className="text-xs text-muted-foreground">{e.studentEmail || ''}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div>{e.courseName || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.courseCode || ''}
                          {e.courseModality
                            ? ` · ${MODALITY_LABELS[e.courseModality] || e.courseModality}`
                            : ''}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        {LEVEL_LABELS[e.courseLevel] || e.courseLevel || '—'}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{formatDate(e.requestedAt)}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline" className={STATUS_BADGE_CLASSES[e.status]}>
                          {ENROLLMENT_STATUS_LABELS[e.status]}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        <Button variant="outline" size="sm" onClick={() => openDetail(e)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhe e mudança de status */}
      <Dialog open={!!detailLive} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detailLive && (
            <>
              <DialogHeader>
                <DialogTitle>Inscrição de {detailLive.studentName}</DialogTitle>
                <DialogDescription>
                  {detailLive.courseName}
                  {detailLive.courseCode ? ` (${detailLive.courseCode})` : ''} ·{' '}
                  {LEVEL_LABELS[detailLive.courseLevel] || detailLive.courseLevel || '—'} ·{' '}
                  {MODALITY_LABELS[detailLive.courseModality] || detailLive.courseModality || '—'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Status atual</div>
                    <Badge
                      variant="outline"
                      className={`mt-1 ${STATUS_BADGE_CLASSES[detailLive.status]}`}
                    >
                      {ENROLLMENT_STATUS_LABELS[detailLive.status]}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Solicitada em</div>
                    <div className="mt-1">{formatDate(detailLive.requestedAt)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Última revisão</div>
                    <div className="mt-1">
                      {detailLive.reviewedBy ? (
                        <>
                          {detailLive.reviewedBy} · {formatDate(detailLive.reviewedAt)}
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Período solicitado</div>
                    <div className="mt-1">
                      {detailLive.requestedPeriod || detailLive.period || '—'}
                    </div>
                  </div>
                  {detailLive.workloadHours ? (
                    <div>
                      <div className="text-muted-foreground">Carga horária</div>
                      <div className="mt-1">{detailLive.workloadHours} h</div>
                    </div>
                  ) : null}
                  {detailLive.notes ? (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Observações do aluno</div>
                      <div className="mt-1 whitespace-pre-wrap">{detailLive.notes}</div>
                    </div>
                  ) : null}
                </div>

                {detailLive.rejectionReason ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                    <div className="font-medium text-red-800">Motivo do cancelamento/recusa</div>
                    <div className="text-red-700 mt-0.5">{detailLive.rejectionReason}</div>
                  </div>
                ) : null}

                {/* Histórico */}
                {detailLive.statusHistory && detailLive.statusHistory.length > 0 ? (
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <History className="h-4 w-4" />
                      Histórico de status
                    </div>
                    <ol className="space-y-2">
                      {detailLive.statusHistory.map((ev, i) => (
                        <li key={i} className="text-sm border-l-2 pl-3 border-muted">
                          <div>
                            {ev.from ? `${ENROLLMENT_STATUS_LABELS[ev.from] || ev.from} → ` : ''}
                            <span className="font-medium">
                              {ENROLLMENT_STATUS_LABELS[ev.to] || ev.to}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(ev.at)}
                            {ev.by ? ` · por ${ev.by}` : ''}
                            {ev.note ? ` · ${ev.note}` : ''}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {/* Mudança de status */}
                {transitions.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Alterar status</Label>
                    <Select
                      value={nextStatus}
                      onValueChange={(v) => {
                        setNextStatus(v as EnrollmentStatus)
                        setError(null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o novo status" />
                      </SelectTrigger>
                      <SelectContent>
                        {transitions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {ENROLLMENT_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requiresNote ? (
                      <div className="space-y-1">
                        <Label htmlFor="enrollment-note">
                          Motivo {nextStatus === 'cancelada' ? '(obrigatório)' : '(obrigatório)'}
                        </Label>
                        <Textarea
                          id="enrollment-note"
                          placeholder="Descreva o motivo da alteração — fica registrado no histórico e visível ao aluno."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={3}
                        />
                      </div>
                    ) : null}
                    {error ? <p className="text-sm text-red-600">{error}</p> : null}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button variant="outline" onClick={() => setDetail(null)} disabled={saving}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSubmit} disabled={!nextStatus || saving}>
                        {saving ? 'Salvando...' : 'Salvar alteração'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Esta inscrição está cancelada — nenhuma transição de status disponível.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground px-1">
        Revisado por {currentUser?.name || '—'} · fluxo: inscrita → em análise → aprovada ou
        cancelada (com motivo obrigatório).
      </p>
    </div>
  )
}
