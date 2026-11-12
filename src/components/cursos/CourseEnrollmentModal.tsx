import { useEffect, useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Course } from '@/types/portal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GraduationCap, Clock, CalendarDays, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface CourseEnrollmentModalProps {
  course: Course | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chamado após inscrição confirmada com sucesso. */
  onEnrolled?: () => void
}

const LEVEL_LABELS: Record<Course['level'], string> = {
  graduacao: 'Graduação',
  pos_graduacao: 'Pós-graduação',
  extensao: 'Extensão',
}

const MODALITY_LABELS: Record<Course['modality'], string> = {
  presencial: 'Presencial',
  ead: 'EAD',
  semipresencial: 'Semipresencial',
}

/** Modal de inscrição em curso a partir da Biblioteca de Cursos. */
export function CourseEnrollmentModal({
  course,
  open,
  onOpenChange,
  onEnrolled,
}: CourseEnrollmentModalProps) {
  const { currentUser, students, createCourseEnrollment } = usePortal()

  // Aluno vinculado ao usuário logado (quando o perfil é aluno)
  const linkedStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
    ) || null

  const isStudent = currentUser?.role === 'aluno'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [period, setPeriod] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Perfis administrativos: escolha do aluno a ser inscrito
  const [selectedStudentId, setSelectedStudentId] = useState('')
  useEffect(() => {
    if (open) setSelectedStudentId('')
  }, [open])
  const activeStudent = isStudent
    ? linkedStudent
    : students.find((s) => s.id === selectedStudentId) || null

  const canEnroll = !!course && (isStudent ? !!linkedStudent : !!selectedStudentId)

  useEffect(() => {
    if (open) {
      setError(null)
      setSuccess(false)
      setSubmitting(false)
      setNotes('')
      setName(activeStudent?.fullName || (isStudent ? '' : ''))
      setEmail(activeStudent?.email || (isStudent ? currentUser?.email || '' : ''))
      setPeriod('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, course?.id, activeStudent?.id, isStudent])

  if (!course) return null

  const remaining = course.vacancies - course.enrolledCount
  const noVacancies = course.vacancies > 0 && remaining <= 0

  const handleSubmit = async () => {
    setError(null)

    if (!name.trim()) {
      setError('Informe o nome completo do aluno.')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido para contato.')
      return
    }

    setSubmitting(true)
    const result = await createCourseEnrollment({
      courseId: course.id,
      studentId: activeStudent?.id || '',
      requestedPeriod: period.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setSubmitting(false)

    if (!result.success) {
      setError(result.error || 'Não foi possível concluir a inscrição.')
      return
    }
    setSuccess(true)
    onEnrolled?.()
  }

  // Estado sem vagas — botão desabilitado com mensagem clara
  if (noVacancies) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Sem vagas disponíveis
            </DialogTitle>
            <DialogDescription>
              As inscrições em <strong>{course.name}</strong> estão encerradas: todas as{' '}
              {course.vacancies} vagas já foram preenchidas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Inscrição em curso
          </DialogTitle>
          <DialogDescription>
            Confirme os dados abaixo para registrar sua inscrição.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-2 space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Inscrição realizada com sucesso!</strong> Sua inscrição em{' '}
                <strong>{course.name}</strong> foi registrada com status <strong>Inscrita</strong>.
                Acompanhe o andamento em <strong>Minhas inscrições</strong> no portal do aluno.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Concluir</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo do curso */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="font-medium text-sm">{course.name}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{LEVEL_LABELS[course.level]}</Badge>
                <Badge variant="outline">{MODALITY_LABELS[course.modality]}</Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {course.workloadHours}h
                </Badge>
                {course.vacancies > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {remaining} vaga(s) restante(s)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Código: {course.code} · {course.durationSemesters} semestres
              </p>
            </div>

            {/* Dados do aluno */}
            <div className="grid gap-2">
              {!isStudent && (
                <div className="grid gap-1.5">
                  <Label>Aluno a inscrever *</Label>
                  <Select
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o aluno" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.fullName} — {s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Perfil administrativo: selecione o cadastro de aluno a ser inscrito.
                  </p>
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="enrollment-name">Nome completo *</Label>
                <Input
                  id="enrollment-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo do aluno"
                  disabled={isStudent || submitting}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="enrollment-email">E-mail *</Label>
                <Input
                  id="enrollment-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail de contato"
                  disabled={isStudent || submitting}
                />
                {isStudent && (
                  <p className="text-xs text-muted-foreground">
                    Dados da sua conta — confirmados automaticamente.
                  </p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="enrollment-period">Período/turma preferido (opcional)</Label>
                <Input
                  id="enrollment-period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="Ex.: Noturno, 1º semestre"
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="enrollment-notes">Observações (opcional)</Label>
                <Textarea
                  id="enrollment-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma informação que a secretaria precise saber"
                  rows={2}
                  disabled={submitting}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !canEnroll}>
                {submitting ? 'Registrando…' : 'Confirmar inscrição'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
