import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { LgpdRequest } from '@/types/portal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  ShieldCheck,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  PlusCircle,
  Scale,
} from 'lucide-react'

const statusBadge: Record<string, { label: string; className: string }> = {
  em_analise: {
    label: 'Em Análise DPO',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  retido_legalmente: {
    label: 'Retido Legalmente (MEC)',
    className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  executado: {
    label: 'Eliminado com Sucesso',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  negado: {
    label: 'Pedido Indeferido',
    className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
}

export function LgpdModule() {
  const { lgpdRequests, addLgpdRequest, updateLgpdStatus, currentUser } = usePortal()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState<LgpdRequest['requestType']>('eliminacao')
  const [reason, setReason] = useState('')

  const isDpoOrAdmin =
    currentUser?.role === 'root' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'secretaria'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Regra legal MEC: Dados de registro acadêmico têm retenção obrigatória
    const isAcademicDossier =
      reason.toLowerCase().includes('histórico') ||
      reason.toLowerCase().includes('rg') ||
      reason.toLowerCase().includes('matrícula')
    const deadline = isAcademicDossier
      ? 'Acervo Permanente MEC (Decreto 9.235/2017)'
      : '5 anos (Art. 16, II LGPD)'

    addLgpdRequest({
      requesterName: name,
      requesterCpf: cpf,
      requesterEmail: email,
      requestType: type,
      reason,
      legalRetentionPeriodDays: isAcademicDossier ? 36500 : 1825,
      legalRetentionDeadline: deadline,
      status: isAcademicDossier ? 'retido_legalmente' : 'em_analise',
      legalJustification: isAcademicDossier
        ? 'Impedimento legal regulatório MEC (guarda compulsória de documentos acadêmicos e diplomas).'
        : 'Em averiguação com os prazos prescricionais fiscais e tributários do acervo.',
    })

    setModalOpen(false)
    setName('')
    setCpf('')
    setEmail('')
    setReason('')

    toast({
      title: 'Protocolo LGPD registrado',
      description: 'O DPO institucional processará o enquadramento em até 15 dias.',
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            Privacidade & Conformidade LGPD (Lei 13.709/2018)
          </h1>
          <p className="text-xs text-slate-400">
            Eliminação de dados, revogação de consentimento e gestão dos prazos de guarda
            compulsória do MEC
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Registrar Pedido de Titular
        </Button>
      </div>

      {/* Regra de Ouro MEC */}
      <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/30 flex items-start gap-3">
        <Scale className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-semibold text-indigo-200">
            Conflito de Normas: LGPD vs. Tabela de Temporalidade do MEC
          </span>
          <p className="text-slate-300 leading-relaxed">
            De acordo com a Portaria MEC nº 315/2018 e o Art. 16, I da LGPD, a instituição de ensino
            tem a <strong>obrigação legal de manter o acervo acadêmico permanente</strong>{' '}
            (históricos, notas, frequência e registros de diplomas), mesmo após a solicitação
            expressa de eliminação do ex-aluno.
          </p>
        </div>
      </div>

      {/* Lista de Chamados LGPD */}
      <div className="space-y-3">
        {lgpdRequests.map((req) => {
          const badgeInfo = statusBadge[req.status] || { label: req.status, className: '' }

          return (
            <Card key={req.id} className="bg-slate-900/60 border-slate-800 text-slate-100">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{req.requesterName}</span>
                    <Badge variant="outline" className={`text-[10px] ${badgeInfo.className}`}>
                      {badgeInfo.label}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-slate-800 text-slate-300 uppercase"
                    >
                      {req.requestType}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Protocolado em: {req.createdAt}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Motivação do Titular:
                    </span>
                    <p className="text-slate-300">{req.reason}</p>
                    <div className="text-[11px] text-slate-500 font-mono pt-1">
                      CPF: {req.requesterCpf} • E-mail: {req.requesterEmail}
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-indigo-300 block font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3 text-indigo-400" /> Prazo de Retenção Legal / Parecer
                      DPO:
                    </span>
                    <p className="text-slate-300 font-semibold">{req.legalRetentionDeadline}</p>
                    <p className="text-[11px] text-slate-400 italic">{req.legalJustification}</p>
                  </div>
                </div>

                {/* Ações DPO */}
                {isDpoOrAdmin && req.status === 'em_analise' && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                    <Button
                      size="sm"
                      onClick={() => {
                        updateLgpdStatus(
                          req.id,
                          'executado',
                          'Dados de marketing eliminados dos sistemas.',
                        )
                        toast({ title: 'Eliminação executada com sucesso.' })
                      }}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Executar Eliminação Permitida
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        updateLgpdStatus(
                          req.id,
                          'retido_legalmente',
                          'Enquadrado em obrigação legal do MEC.',
                        )
                        toast({ title: 'Retenção fundamentada registrada.' })
                      }}
                      className="h-7 text-xs border-indigo-700 text-indigo-300 hover:bg-indigo-950"
                    >
                      Reter por Obrigação Legal MEC
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* MODAL NOVO PEDIDO LGPD */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Protocolar Solicitação do Titular de Dados
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Registrar requisição de eliminação ou acesso conforme Art. 18 da LGPD
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Nome do Titular *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo do solicitante"
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">CPF do Titular *</label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-slate-900 border-slate-700 text-white text-xs font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">E-mail de Contato *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="titular@exemplo.com"
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Tipo de Solicitação</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full h-9 rounded bg-slate-900 border border-slate-700 text-white text-xs px-2"
              >
                <option value="eliminacao">Eliminação Total de Dados Pessoais</option>
                <option value="acesso">Relatório Completo de Dados (Acesso)</option>
                <option value="retificacao">Retificação de Dados Incorretos</option>
                <option value="portabilidade">Portabilidade para Outra IES</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Motivo e Escopo dos Dados</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: Solicito exclusão de contatos de marketing e documentos enviados no vestibular..."
                rows={3}
                className="w-full rounded bg-slate-900 border border-slate-700 text-white text-xs p-2 focus:outline-none resize-none"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-slate-700 text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                Protocolar Pedido
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
