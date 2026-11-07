import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  HelpCircle,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  LifeBuoy,
  MessageSquare,
  FileQuestion,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react'
import { StudentSupportTicket } from '@/types/portal'

export function AlunoSuporteModule() {
  const { studentSupportTickets, createStudentSupportTicket, currentUser, students } = usePortal()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<StudentSupportTicket | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulário de novo chamado
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<
    'secretaria' | 'financeiro' | 'academico' | 'ti' | 'outros'
  >('secretaria')
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta'>('media')
  const [description, setDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const currentStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
    ) || students[0]

  const effectiveStudentId = currentUser?.studentId || currentStudent?.id || 'dbphexr97czw7cb'

  // Chamados do aluno
  const myTickets = studentSupportTickets.filter(
    (t) => !t.studentId || t.studentId === effectiveStudentId,
  )

  const handleSubmitNewTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!subject.trim()) {
      setErrorMessage('Informe o assunto da solicitação.')
      return
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage('Descreva seu problema ou dúvida com pelo menos 10 caracteres.')
      return
    }

    try {
      setIsSubmitting(true)
      await createStudentSupportTicket({
        studentName: currentUser?.name || currentStudent?.fullName || 'Aluno',
        studentEmail: currentUser?.email || currentStudent?.email || 'aluno@portalcursos.ng',
        subject: subject.trim(),
        category,
        priority,
        status: 'aberto',
        message: description.trim(),
        description: description.trim(),
      })

      setIsDialogOpen(false)
      setSubject('')
      setDescription('')
      setCategory('secretaria')
      setPriority('media')
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao registrar chamado de suporte.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: StudentSupportTicket['status']) => {
    switch (status) {
      case 'aberto':
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
            Em Aberto
          </Badge>
        )
      case 'em_atendimento':
      case 'em_analise':
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase">
            {status === 'em_analise' ? 'Em Análise' : 'Em Atendimento'}
          </Badge>
        )
      case 'resolvido':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
            Resolvido
          </Badge>
        )
      case 'fechado':
        return <Badge className="bg-slate-800 text-slate-400 text-[10px]">Fechado</Badge>
      default:
        return null
    }
  }

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'secretaria':
        return 'Secretaria Acadêmica'
      case 'financeiro':
        return 'Financeiro & Mensalidades'
      case 'academico':
        return 'Coordenação Pedagógica'
      case 'ti':
        return 'Suporte Técnico & AVA'
      default:
        return 'Geral'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-cyan-400" />
            Central de Ajuda & Atendimento ao Aluno
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Abra chamados para a secretaria acadêmica, financeiro, coordenação de curso ou TI com
            protocolo seguro.
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2 text-xs font-semibold shadow-lg shadow-cyan-600/20"
        >
          <PlusCircle className="w-4 h-4" />
          Novo Chamado
        </Button>
      </div>

      {/* Cards de Canais Rápidos de Atendimento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Secretaria Acadêmica</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Declarações, histórico, trancamento e diplomas.
            </p>
            <span className="text-[10px] text-blue-400 font-mono mt-1 block">
              Atendimento: Seg-Sex 08h-20h
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Financeiro do Aluno</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Segunda via de boletos, PIX e comprovantes de IRPF.
            </p>
            <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
              Prazo médio: 24 horas úteis
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileQuestion className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Dúvidas Frequentes (FAQ)</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Acesse orientações rápidas sobre notas e frequência.
            </p>
            <span className="text-[10px] text-indigo-400 font-mono mt-1 block">
              Base de conhecimento 24/7
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Chamados do Aluno */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Minhas Solicitações Registradas
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {myTickets.length} chamado(s) encontrado(s)
          </span>
        </div>

        {myTickets.length === 0 ? (
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-8 text-center text-slate-400 text-xs sm:text-sm">
              <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Você ainda não abriu nenhum chamado. Precisa de auxílio? Clique no botão "Novo
              Chamado".
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myTickets.map((ticket) => (
              <Card
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-slate-900/70 border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-cyan-400 font-semibold">
                        #{ticket.protocol}
                      </span>
                      {getStatusBadge(ticket.status)}
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-700 text-slate-400"
                      >
                        {getCategoryLabel(ticket.category)}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-semibold text-white hover:text-cyan-300">
                      {ticket.subject}
                    </h4>

                    <p className="text-xs text-slate-300 line-clamp-2">{ticket.description}</p>

                    {ticket.response && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 mt-2">
                        <span className="font-semibold block text-[11px] text-emerald-400">
                          Resposta Institucional:
                        </span>
                        {ticket.response}
                      </div>
                    )}
                  </div>

                  <div className="self-end sm:self-center shrink-0 text-right text-xs text-slate-400 space-y-1">
                    <div className="text-[11px] font-mono text-slate-500">
                      Aberto em: {ticket.created}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-cyan-400 hover:text-white h-7 gap-1"
                    >
                      Ver detalhes
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Abertura de Novo Chamado */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-cyan-400" />
              Abrir Novo Chamado de Suporte
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Preencha os campos abaixo. Nossa equipe pedagógica e administrativa retornará no prazo
              regulamentar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitNewTicket} className="space-y-4 pt-2">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Departamento / Área:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 text-xs text-white px-3 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="secretaria">Secretaria Acadêmica (Documentos, Declarações)</option>
                <option value="financeiro">Financeiro (Boletos, Mensalidades, IRPF)</option>
                <option value="academico">Coordenação Pedagógica (Notas, Ementas)</option>
                <option value="ti">Suporte Técnico & AVA (Acesso, Senha, Vídeos)</option>
                <option value="outros">Outros Assuntos</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Assunto Resumido:</label>
              <Input
                placeholder="Ex: Solicitação de Declaração de Matrícula para Estágio"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nível de Urgência:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'baixa', label: 'Baixa (Rotina)' },
                  { id: 'media', label: 'Média (Normal)' },
                  { id: 'alta', label: 'Alta (Urgente)' },
                ].map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant={priority === p.id ? 'default' : 'outline'}
                    onClick={() => setPriority(p.id as any)}
                    className={`h-8 text-xs ${
                      priority === p.id
                        ? 'bg-cyan-600 text-white'
                        : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Descrição Detalhada do Pedido:
              </label>
              <Textarea
                rows={4}
                placeholder="Escreva claramente sua necessidade, informando semestre, disciplina ou contexto relevante..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs border-slate-700 text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {isSubmitting ? 'Enviando...' : 'Registrar Solicitação'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Chamado */}
      {selectedTicket && (
        <Dialog open={Boolean(selectedTicket)} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-slate-100">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  #{selectedTicket.protocol}
                </span>
                {getStatusBadge(selectedTicket.status)}
              </div>
              <DialogTitle className="text-base font-bold text-white">
                {selectedTicket.subject}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Aberto em {selectedTicket.created} por {selectedTicket.studentName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs pt-2">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-300 block">Mensagem do Aluno:</span>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedTicket.description}
                </p>
              </div>

              {selectedTicket.response ? (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 space-y-1">
                  <span className="font-semibold text-emerald-400 block">
                    Parecer do Atendimento:
                  </span>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-line">
                    {selectedTicket.response}
                  </p>
                  {selectedTicket.resolvedAt && (
                    <span className="text-[10px] text-emerald-500 block font-mono pt-1">
                      Finalizado em: {selectedTicket.resolvedAt}
                    </span>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/30 text-amber-300 text-xs">
                  Solicitação sob análise da equipe responsável. O retorno será emitido em até 48
                  horas.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                size="sm"
                onClick={() => setSelectedTicket(null)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
