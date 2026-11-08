import React, { useState, useMemo } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Certificate } from '@/types/portal'
import { generateCertificatePdf } from '@/lib/certificatePdfExport'
import { generateDiplomaPdf } from '@/lib/diplomaPdfExport'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  Award,
  FileCheck2,
  FileX,
  Search,
  Download,
  Ban,
  ShieldAlert,
  Info,
  Calendar,
  GraduationCap,
  Sparkles,
  RotateCcw,
} from 'lucide-react'

export function DiplomasCertificadosModule() {
  const { certificates, currentUser, revokeCertificate } = usePortal()
  const { toast } = useToast()

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'todos' | 'certificado' | 'diploma'>('todos')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'revogado' | 'substituido'>(
    'todos',
  )
  const [periodFilter, setPeriodFilter] = useState<'todos' | '30d' | '90d' | '365d'>('todos')

  // Modal de Revogação
  const [selectedDocToRevoke, setSelectedDocToRevoke] = useState<Certificate | null>(null)
  const [revocationReason, setRevocationReason] = useState('')
  const [isRevoking, setIsRevoking] = useState(false)

  // Modal de Detalhes
  const [viewDetailsDoc, setViewDetailsDoc] = useState<Certificate | null>(null)

  // Permissões
  const canManage = useMemo(() => {
    if (!currentUser) return false
    return ['root', 'admin', 'secretaria'].includes(currentUser.role)
  }, [currentUser])

  // Normalização e filtragem
  const filteredDocuments = useMemo(() => {
    return certificates.filter((doc) => {
      // 1. Tipo
      const isDiploma = doc.docType === 'diploma' || doc.verificationCode.startsWith('DIPL-')
      const docType: 'certificado' | 'diploma' = isDiploma ? 'diploma' : 'certificado'
      if (typeFilter !== 'todos' && docType !== typeFilter) {
        return false
      }

      // 2. Status
      if (statusFilter !== 'todos' && doc.status !== statusFilter) {
        return false
      }

      // 3. Período
      if (periodFilter !== 'todos') {
        const rawDate = doc.issueDate || doc.created
        if (rawDate) {
          const docTime = new Date(rawDate).getTime()
          const now = Date.now()
          const daysDiff = (now - docTime) / (1000 * 60 * 60 * 24)
          if (periodFilter === '30d' && daysDiff > 30) return false
          if (periodFilter === '90d' && daysDiff > 90) return false
          if (periodFilter === '365d' && daysDiff > 365) return false
        }
      }

      // 4. Busca textual (nome aluno, CPF com/sem pontuação, curso, código)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const queryClean = query.replace(/\D/g, '')

        const nameMatch = doc.studentName.toLowerCase().includes(query)
        const courseMatch = doc.courseName.toLowerCase().includes(query)
        const codeMatch = doc.verificationCode.toLowerCase().includes(query)
        const cpfMatch = doc.studentCpf ? doc.studentCpf.toLowerCase().includes(query) : false
        const cpfRawMatch =
          queryClean.length >= 3 && doc.studentCpf
            ? doc.studentCpf.replace(/\D/g, '').includes(queryClean)
            : false

        if (!nameMatch && !courseMatch && !codeMatch && !cpfMatch && !cpfRawMatch) {
          return false
        }
      }

      return true
    })
  }, [certificates, typeFilter, statusFilter, periodFilter, searchTerm])

  // KPIs
  const kpis = useMemo(() => {
    const total = certificates.length
    const vigentes = certificates.filter((c) => c.status === 'ativo').length
    const revogados = certificates.filter((c) => c.status === 'revogado').length
    const diplomasTotal = certificates.filter(
      (c) => c.docType === 'diploma' || c.verificationCode.startsWith('DIPL-'),
    ).length
    return { total, vigentes, revogados, diplomasTotal }
  }, [certificates])

  // Ações de download
  const handleDownloadDoc = (doc: Certificate) => {
    const isDiploma = doc.docType === 'diploma' || doc.verificationCode.startsWith('DIPL-')
    if (isDiploma) {
      generateDiplomaPdf(doc)
    } else {
      generateCertificatePdf(doc)
    }
  }

  // Ação de revogação
  const handleConfirmRevoke = async () => {
    if (!selectedDocToRevoke) return
    setIsRevoking(true)
    try {
      const isDiploma =
        selectedDocToRevoke.docType === 'diploma' ||
        selectedDocToRevoke.verificationCode.startsWith('DIPL-')
      const docLabel = isDiploma ? 'Diploma' : 'Certificado'

      const ok = await revokeCertificate(selectedDocToRevoke.id, {
        reason: revocationReason.trim() || `Revogado por ${currentUser?.name || 'Administrador'}`,
      })

      if (ok) {
        toast({
          title: `${docLabel} Revogado com Sucesso`,
          description: `O código ${selectedDocToRevoke.verificationCode} foi invalidado no sistema.`,
        })
        setSelectedDocToRevoke(null)
        setRevocationReason('')
      } else {
        toast({
          variant: 'destructive',
          title: 'Não foi possível revogar',
          description: 'Verifique suas permissões de acesso.',
        })
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao revogar documento',
        description:
          err instanceof Error ? err.message : 'Falha inesperada ao registrar revogação.',
      })
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <Award className="w-8 h-8 text-amber-400" />
              Diplomas & Certificados Digitais
            </h1>
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs"
            >
              MEC / e-MEC
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestão unificada de documentos acadêmicos digitais, autenticidade, ciclo de vida e
            histórico de auditoria.
          </p>
        </div>

        {!canManage && (
          <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/30 px-3 py-1.5 self-start sm:self-auto text-xs">
            Modo Visualização (Coordenação)
          </Badge>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Total Emitidos
              <FileCheck2 className="w-4 h-4 text-blue-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-white">{kpis.total}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Certificados e diplomas expedidos</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Documentos Vigentes
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-400">{kpis.vigentes}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Válidos e com código ativo</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Diplomas Digitais
              <GraduationCap className="w-4 h-4 text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-400">{kpis.diplomasTotal}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Graus acadêmicos outorgados</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Revogados / Inválidos
              <FileX className="w-4 h-4 text-rose-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-rose-400">{kpis.revogados}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Cancelados com registro de motivo</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Busca */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Buscar por aluno, CPF, curso ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-950/60 border-slate-800 text-sm h-10"
              />
            </div>

            {/* Filtro por Tipo */}
            <div className="lg:col-span-2">
              <Select
                value={typeFilter}
                onValueChange={(val: 'todos' | 'certificado' | 'diploma') => setTypeFilter(val)}
              >
                <SelectTrigger className="bg-slate-950/60 border-slate-800 h-10 text-xs">
                  <SelectValue placeholder="Tipo de Documento" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="certificado">Certificados</SelectItem>
                  <SelectItem value="diploma">Diplomas Digitais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div className="lg:col-span-2">
              <Select
                value={statusFilter}
                onValueChange={(val: 'todos' | 'ativo' | 'revogado' | 'substituido') =>
                  setStatusFilter(val)
                }
              >
                <SelectTrigger className="bg-slate-950/60 border-slate-800 h-10 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="ativo">Vigente (Ativo)</SelectItem>
                  <SelectItem value="revogado">Revogado</SelectItem>
                  <SelectItem value="substituido">Substituído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Período */}
            <div className="lg:col-span-2">
              <Select
                value={periodFilter}
                onValueChange={(val: 'todos' | '30d' | '90d' | '365d') => setPeriodFilter(val)}
              >
                <SelectTrigger className="bg-slate-950/60 border-slate-800 h-10 text-xs">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                  <SelectItem value="todos">Qualquer Período</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="365d">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limpar Filtros */}
            <div className="lg:col-span-1 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setTypeFilter('todos')
                  setStatusFilter('todos')
                  setPeriodFilter('todos')
                }}
                className="w-full text-slate-400 hover:text-white h-10 text-xs"
                title="Redefinir filtros"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Documentos */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="p-4 pb-2 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-200">
                Documentos Acadêmicos ({filteredDocuments.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Registros oficiais com carimbo de autenticidade para validação pelo e-MEC
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Award className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">Nenhum documento encontrado</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tente ajustar os filtros acima ou emita certificados e diplomas através da ficha do
                aluno na Gestão de Alunos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400">Documento / Código</TableHead>
                    <TableHead className="text-xs text-slate-400">Aluno</TableHead>
                    <TableHead className="text-xs text-slate-400">Curso</TableHead>
                    <TableHead className="text-xs text-slate-400">Emissão / Colação</TableHead>
                    <TableHead className="text-xs text-slate-400">Emitido Por</TableHead>
                    <TableHead className="text-xs text-slate-400">Status</TableHead>
                    <TableHead className="text-xs text-slate-400 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const isDiploma =
                      doc.docType === 'diploma' || doc.verificationCode.startsWith('DIPL-')

                    return (
                      <TableRow key={doc.id} className="border-slate-800/80 hover:bg-slate-800/40">
                        {/* Tipo / Código */}
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            {isDiploma ? (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] gap-1 px-1.5 py-0.5">
                                <GraduationCap className="w-3 h-3" />
                                Diploma
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] gap-1 px-1.5 py-0.5">
                                <Award className="w-3 h-3" />
                                Certificado
                              </Badge>
                            )}
                            <span className="font-bold text-slate-200">{doc.verificationCode}</span>
                          </div>
                        </TableCell>

                        {/* Aluno */}
                        <TableCell className="text-xs">
                          <div className="font-semibold text-slate-100">{doc.studentName}</div>
                          {doc.studentCpf && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              CPF: {doc.studentCpf}
                            </div>
                          )}
                        </TableCell>

                        {/* Curso */}
                        <TableCell className="text-xs">
                          <div className="text-slate-200">{doc.courseName}</div>
                          <div className="text-[11px] text-slate-400">
                            {doc.workloadHours}h letivas
                          </div>
                        </TableCell>

                        {/* Data Emissão */}
                        <TableCell className="text-xs text-slate-300">
                          <div>{doc.issueDate}</div>
                          {doc.graduationDate && (
                            <div className="text-[10px] text-amber-300/80">
                              Colação: {doc.graduationDate}
                            </div>
                          )}
                        </TableCell>

                        {/* Emitido Por */}
                        <TableCell className="text-xs text-slate-400">
                          {doc.issuedBy || 'Secretaria Acadêmica'}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-xs">
                          {doc.status === 'ativo' && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px]">
                              Vigente
                            </Badge>
                          )}
                          {doc.status === 'revogado' && (
                            <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-[11px]">
                              Revogado
                            </Badge>
                          )}
                          {doc.status === 'substituido' && (
                            <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/30 text-[11px]">
                              Substituído
                            </Badge>
                          )}
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-xs text-right space-x-1.5 whitespace-nowrap">
                          {/* Baixar / Visualizar PDF */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadDoc(doc)}
                            className="bg-slate-950/60 border-slate-800 hover:bg-slate-800 text-slate-200 h-8 px-2.5 text-xs gap-1.5"
                            title="Visualizar e Baixar PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-400" />
                            PDF
                          </Button>

                          {/* Detalhes / Auditoria */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewDetailsDoc(doc)}
                            className="text-slate-400 hover:text-white h-8 px-2"
                            title="Auditoria & Detalhes"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </Button>

                          {/* Revogar (se vigente e autorizado) */}
                          {canManage && doc.status === 'ativo' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDocToRevoke(doc)
                                setRevocationReason('')
                              }}
                              className="border-rose-900/60 hover:bg-rose-950/40 text-rose-400 h-8 px-2.5 text-xs gap-1"
                              title="Revogar este documento"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Revogar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Revogação */}
      <Dialog
        open={!!selectedDocToRevoke}
        onOpenChange={(open) => !open && setSelectedDocToRevoke(null)}
      >
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              Revogar Documento Digital
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Esta ação invalida permanentemente a autenticidade do documento perante o e-MEC e
              registra auditoria completa.
            </DialogDescription>
          </DialogHeader>

          {selectedDocToRevoke && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Código de Verificação:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {selectedDocToRevoke.verificationCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Aluno:</span>
                  <span className="font-semibold text-white">
                    {selectedDocToRevoke.studentName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Curso:</span>
                  <span className="text-slate-300">{selectedDocToRevoke.courseName}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="revoke-reason" className="text-xs text-slate-300">
                  Motivo da Revogação <span className="text-rose-400">*</span>
                </Label>
                <Textarea
                  id="revoke-reason"
                  placeholder="Ex: Cancelamento por duplicidade, cancelamento de matrícula, determinação judicial..."
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  className="bg-slate-950/80 border-slate-800 text-xs min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setSelectedDocToRevoke(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={isRevoking || !revocationReason.trim()}
              className="bg-rose-600 hover:bg-rose-500 text-xs"
            >
              {isRevoking ? 'Revogando...' : 'Confirmar Revogação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes e Auditoria */}
      <Dialog open={!!viewDetailsDoc} onOpenChange={(open) => !open && setViewDetailsDoc(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100 text-base">
              <Award className="w-5 h-5 text-amber-400" />
              Auditoria de Autenticidade Digital
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Dados canônicos registrados no banco de dados e conferência e-MEC
            </DialogDescription>
          </DialogHeader>

          {viewDetailsDoc && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Tipo</span>
                  <span className="font-semibold text-slate-200 uppercase">
                    {viewDetailsDoc.docType ||
                      (viewDetailsDoc.verificationCode.startsWith('DIPL-')
                        ? 'diploma'
                        : 'certificado')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">
                    Código Autenticidade
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {viewDetailsDoc.verificationCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">
                    Data de Emissão
                  </span>
                  <span className="text-slate-200">{viewDetailsDoc.issueDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Emitido Por</span>
                  <span className="text-slate-200">{viewDetailsDoc.issuedBy}</span>
                </div>
                {viewDetailsDoc.graduationDate && (
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">
                      Data de Colação
                    </span>
                    <span className="text-amber-300 font-medium">
                      {viewDetailsDoc.graduationDate}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Carga Horária</span>
                  <span className="text-slate-200">{viewDetailsDoc.workloadHours} horas</span>
                </div>
              </div>

              {/* Registro de Revogação se aplicável */}
              {viewDetailsDoc.status === 'revogado' && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-lg space-y-1">
                  <div className="text-rose-400 font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4" />
                    Documento Revogado
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    <strong>Data:</strong> {viewDetailsDoc.revokedAt || 'Não informada'}
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    <strong>Autor:</strong> {viewDetailsDoc.revokedBy || 'Sistema'}
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    <strong>Motivo:</strong>{' '}
                    {viewDetailsDoc.revocationReason || 'Sem motivo registrado'}
                  </div>
                </div>
              )}

              {viewDetailsDoc.status === 'substituido' && (
                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Documento Substituído
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {viewDetailsDoc.revocationReason ||
                      'Substituído por nova via/reemissão oficial.'}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {viewDetailsDoc && (
              <Button
                onClick={() => handleDownloadDoc(viewDetailsDoc)}
                className="bg-blue-600 hover:bg-blue-500 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar PDF
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setViewDetailsDoc(null)}
              className="text-xs bg-slate-800 hover:bg-slate-700"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
