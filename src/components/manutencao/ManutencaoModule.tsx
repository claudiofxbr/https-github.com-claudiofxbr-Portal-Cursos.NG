import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { MaintenanceTicket } from '@/types/portal'
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
  Wrench,
  Camera,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  ImageIcon,
} from 'lucide-react'

const priorityColor: Record<string, string> = {
  baixa: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  media: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  alta: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  urgente: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

const statusColor: Record<string, string> = {
  aberto: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  em_andamento: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  concluido: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelado: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

export function ManutencaoModule() {
  const { tickets, addTicket, updateTicketStatus, currentUser } = usePortal()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState<MaintenanceTicket['priority']>('media')
  const [category, setCategory] = useState<MaintenanceTicket['category']>('ar_condicionado')
  const [photoUrl, setPhotoUrl] = useState('')
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  // Arquivo original da foto (vai para o banco; o preview fica em base64).
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setPreviewPhoto(reader.result as string)
      setPhotoUrl(reader.result as string)
      setPhotoFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const fallbackPhoto =
      photoUrl || 'https://img.usecurling.com/p/600/400?q=building+maintenance&color=blue'

    addTicket({
      title,
      description,
      location,
      priority,
      category,
      reporterName: currentUser?.name || 'Solicitante',
      reporterRole: currentUser?.role || 'Docente',
      photoUrls: [fallbackPhoto],
      photoFiles: photoFile ? [photoFile] : undefined,
    })

    setModalOpen(false)
    setTitle('')
    setDescription('')
    setLocation('')
    setPhotoUrl('')
    setPhotoFile(null)
    setPreviewPhoto(null)

    toast({
      title: 'Chamado predial registrado',
      description: 'A equipe de infraestrutura do campus foi acionada com a foto anexada.',
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-400" />
            Manutenção Predial & Reparos
          </h1>
          <p className="text-xs text-slate-400">
            Abertura de chamados com fotos de infraestrutura, salas de aula e laboratórios
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-9"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Abrir Chamado com Foto
        </Button>
      </div>

      {/* Grid de Chamados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket) => {
          return (
            <Card
              key={ticket.id}
              className="bg-slate-900/70 border-slate-800 text-slate-100 flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Foto Anexa */}
                {ticket.photoUrls.length > 0 && (
                  <div className="w-full h-40 bg-slate-950 relative overflow-hidden border-b border-slate-800">
                    <img
                      src={ticket.photoUrls[0]}
                      alt={ticket.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold backdrop-blur-md bg-slate-900/80 ${priorityColor[ticket.priority]}`}
                      >
                        {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                )}

                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase ${statusColor[ticket.status]}`}
                    >
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {ticket.createdAt}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-semibold text-white mt-1">
                    {ticket.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 line-clamp-2">
                    {ticket.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-2">
                  <p className="text-xs text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{ticket.location}</span>
                  </p>
                  <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-800">
                    <span>Relator: {ticket.reporterName}</span>
                    {ticket.assignedTo && (
                      <span className="truncate max-w-[120px]">Resp: {ticket.assignedTo}</span>
                    )}
                  </div>
                </CardContent>
              </div>

              {/* Ações */}
              <div className="p-4 pt-0 flex gap-2">
                {ticket.status === 'aberto' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      updateTicketStatus(ticket.id, 'em_andamento')
                      toast({ title: 'Chamado em atendimento' })
                    }}
                    className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Iniciar Reparo
                  </Button>
                )}
                {ticket.status === 'em_andamento' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      updateTicketStatus(ticket.id, 'concluido')
                      toast({ title: 'Reparo concluído!' })
                    }}
                    className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Finalizar Reparo
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* MODAL NOVO CHAMADO COM FOTO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              Novo Chamado Predial com Foto
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Registre a ocorrência física para direcionamento à equipe de manutenção
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Título da Ocorrência *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Infiltração na sala 204"
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Localização Exata no Campus *</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ex: Prédio B - 2º Andar - Sala de Aula 204"
                className="bg-slate-900 border-slate-700 text-white text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full h-9 rounded bg-slate-900 border border-slate-700 text-white text-xs px-2"
                >
                  <option value="ar_condicionado">Ar-condicionado</option>
                  <option value="eletrica">Elétrica</option>
                  <option value="hidraulica">Hidráulica</option>
                  <option value="alvenaria">Alvenaria</option>
                  <option value="ti_redes">TI / Redes / Biometria</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full h-9 rounded bg-slate-900 border border-slate-700 text-white text-xs px-2"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            {/* Foto Upload */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                Foto Evidência do Problema
              </label>

              {previewPhoto ? (
                <div className="relative h-32 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                  <img src={previewPhoto} alt="Prévia" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewPhoto(null)
                      setPhotoUrl('')
                    }}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 border border-dashed border-slate-700 rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-900">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <ImageIcon className="w-6 h-6 text-slate-500 mb-1" />
                  <span className="text-xs text-slate-400">Clique para anexar foto da avaria</span>
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Descrição do Defeito</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que está ocorrendo..."
                rows={2}
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
              <Button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white text-xs">
                Enviar Chamado
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
