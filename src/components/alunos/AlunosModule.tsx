import React, { useMemo, useState, useEffect } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Student, Charge, StudentDocument, ACADEMIC_RULES } from '@/types/portal'
import {
  calculateAcademicSummary,
  getAcademicStatusBadge,
  getAttendanceBadge,
} from '@/lib/academicCalculations'
import { StudentGradesAndAttendanceTab } from '@/components/alunos/StudentGradesAndAttendanceTab'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Users,
  GraduationCap,
  Filter,
  Eye,
  Edit3,
  Trash2,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  UserCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldAlert,
  ArrowUpDown,
  X,
  ExternalLink,
} from 'lucide-react'

interface AlunosModuleProps {
  initialStudentId?: string | null
  onClearInitialStudent?: () => void
  onNavigateToFinanceiro?: (options?: { chargeId?: string; studentCpf?: string }) => void
}

export function AlunosModule({
  initialStudentId,
  onClearInitialStudent,
  onNavigateToFinanceiro,
}: AlunosModuleProps = {}) {
  const {
    currentUser,
    students,
    courses,
    charges,
    updateStudent,
    deleteStudent,
    grades,
    attendance,
    addGrade,
    updateGrade,
    deleteGrade,
    addAttendance,
    updateAttendance,
    deleteAttendance,
    certificates,
    issueCertificate,
  } = usePortal()
  const { toast } = useToast()

  // Permissões
  // root, admin, secretaria, matricula: gerenciar (criar/editar/status)
  // coordenador, professor: apenas visualizar
  const role = currentUser?.role || 'aluno'
  const canManage = ['root', 'admin', 'secretaria', 'matricula'].includes(role)
  const canDelete = ['root', 'admin'].includes(role)

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'todos' | 'graduacao' | 'pos_graduacao'>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Modais
  const [viewStudent, setViewStudent] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)

  // Responde à navegação cruzada abrindo a ficha do aluno solicitado
  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const found = students.find((s) => s.id === initialStudentId)
      if (found) {
        setViewStudent(found)
      }
      onClearInitialStudent?.()
    }
  }, [initialStudentId, students, onClearInitialStudent])
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Formulário de Edição
  const [editForm, setEditForm] = useState<{
    fullName: string
    cpf: string
    email: string
    phone: string
    type: 'graduacao' | 'pos_graduacao'
    courseId: string
    courseName: string
    status: Student['status']
    birthDate: string
    street: string
    city: string
    state: string
    zip: string
    observations: string
  }>({
    fullName: '',
    cpf: '',
    email: '',
    phone: '',
    type: 'graduacao',
    courseId: '',
    courseName: '',
    status: 'ativo',
    birthDate: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    observations: '',
  })

  // Cobranças do aluno selecionado
  const selectedStudentCharges = useMemo<Charge[]>(() => {
    if (!viewStudent) return []
    const cleanStudentCpf = viewStudent.cpfRaw || viewStudent.cpf.replace(/\D/g, '')
    return charges.filter(
      (c) =>
        c.studentId === viewStudent.id ||
        (c.studentCpf && c.studentCpf.replace(/\D/g, '') === cleanStudentCpf),
    )
  }, [viewStudent, charges])

  // Notas e frequência do aluno selecionado
  const selectedStudentGrades = useMemo(() => {
    if (!viewStudent) return []
    const cleanCpf = viewStudent.cpfRaw || viewStudent.cpf.replace(/\D/g, '')
    return grades.filter(
      (g) =>
        g.studentId === viewStudent.id ||
        (g.studentCpf && g.studentCpf.replace(/\D/g, '') === cleanCpf),
    )
  }, [viewStudent, grades])

  const selectedStudentAttendance = useMemo(() => {
    if (!viewStudent) return []
    const cleanCpf = viewStudent.cpfRaw || viewStudent.cpf.replace(/\D/g, '')
    return attendance.filter(
      (a) =>
        a.studentId === viewStudent.id ||
        (a.studentCpf && a.studentCpf.replace(/\D/g, '') === cleanCpf),
    )
  }, [viewStudent, attendance])

  // Resumo acadêmico consolidado por disciplina e global
  const academicConsolidated = useMemo(() => {
    if (!viewStudent) {
      return {
        summaries: [],
        overallAverage: 0,
        overallAttendancePercent: 100,
        totalClasses: 0,
        totalPresents: 0,
        status: 'em_curso' as 'aprovado' | 'reprovado' | 'em_curso',
        hasData: false,
      }
    }

    const summaries = calculateAcademicSummary(selectedStudentGrades, selectedStudentAttendance)

    if (
      summaries.length === 0 &&
      selectedStudentGrades.length === 0 &&
      selectedStudentAttendance.length === 0
    ) {
      return {
        summaries: [],
        overallAverage: 0,
        overallAttendancePercent: 100,
        totalClasses: 0,
        totalPresents: 0,
        status: 'em_curso' as 'aprovado' | 'reprovado' | 'em_curso',
        hasData: false,
      }
    }

    // Média geral das notas
    let overallAverage = 0
    if (selectedStudentGrades.length > 0) {
      const sum = selectedStudentGrades.reduce((acc, g) => acc + g.value, 0)
      overallAverage = Math.round((sum / selectedStudentGrades.length) * 10) / 10
    } else if (summaries.length > 0) {
      const sumAvg = summaries.reduce((acc, s) => acc + s.averageGrade, 0)
      overallAverage = Math.round((sumAvg / summaries.length) * 10) / 10
    }

    // % de Frequência acumulada
    let overallAttendancePercent = 100
    let totalClasses = 0
    let totalPresents = 0
    if (selectedStudentAttendance.length > 0) {
      totalClasses = selectedStudentAttendance.length
      totalPresents = selectedStudentAttendance.filter(
        (a) => a.status === 'presente' || a.status === 'falta_justificada',
      ).length
      overallAttendancePercent = Math.round((totalPresents / totalClasses) * 1000) / 10
    }

    // Situação geral MEC: aprovado se média >= 6.0 e frequência >= 75%
    let status: 'aprovado' | 'reprovado' | 'em_curso' = 'em_curso'
    if (selectedStudentGrades.length >= 2 || totalClasses >= 4) {
      const gradeOk = overallAverage >= ACADEMIC_RULES.MIN_PASSING_GRADE
      const freqOk = overallAttendancePercent >= ACADEMIC_RULES.MIN_PASSING_ATTENDANCE_PERCENT
      status = gradeOk && freqOk ? 'aprovado' : 'reprovado'
    }

    return {
      summaries,
      overallAverage,
      overallAttendancePercent,
      totalClasses,
      totalPresents,
      status,
      hasData: true,
    }
  }, [viewStudent, selectedStudentGrades, selectedStudentAttendance])

  // Filtragem de alunos (busca por nome e CPF normalizado sem pontuação)
  const filteredStudents = useMemo(() => {
    const rawSearch = searchTerm.trim().toLowerCase()
    const cleanDigits = rawSearch.replace(/\D/g, '')

    return students.filter((s) => {
      // Filtro tipo
      if (typeFilter !== 'todos' && s.type !== typeFilter) return false

      // Filtro status
      if (statusFilter !== 'todos') {
        if (statusFilter === 'ativo' && s.status !== 'ativo' && s.status !== 'matriculado') {
          return false
        }
        if (statusFilter === 'inativo' && s.status !== 'inativo') {
          return false
        }
        if (statusFilter === 'trancado' && s.status !== 'trancado') {
          return false
        }
        if (
          statusFilter !== 'ativo' &&
          statusFilter !== 'inativo' &&
          statusFilter !== 'trancado' &&
          s.status !== statusFilter
        ) {
          return false
        }
      }

      // Busca texto / CPF
      if (!rawSearch) return true

      const nameMatch = s.fullName.toLowerCase().includes(rawSearch)
      const emailMatch = s.email?.toLowerCase().includes(rawSearch)
      const courseMatch = s.courseName?.toLowerCase().includes(rawSearch)

      const sCpfDigits = (s.cpfRaw || s.cpf || '').replace(/\D/g, '')
      const cpfMatch =
        cleanDigits.length > 0 && (sCpfDigits.includes(cleanDigits) || s.cpf.includes(rawSearch))

      return nameMatch || emailMatch || courseMatch || cpfMatch
    })
  }, [students, searchTerm, typeFilter, statusFilter])

  // Contadores
  const stats = useMemo(() => {
    const total = students.length
    const graduacao = students.filter((s) => s.type === 'graduacao').length
    const pos = students.filter((s) => s.type === 'pos_graduacao').length
    const ativos = students.filter((s) => s.status === 'ativo' || s.status === 'matriculado').length
    const trancados = students.filter((s) => s.status === 'trancado').length
    const inativos = students.filter((s) => s.status === 'inativo').length
    return { total, graduacao, pos, ativos, trancados, inativos }
  }, [students])

  // Abertura do formulário de edição
  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student)
    setEditForm({
      fullName: student.fullName,
      cpf: student.cpf,
      email: student.email,
      phone: student.phone,
      type: student.type,
      courseId: student.courseId,
      courseName: student.courseName,
      status: student.status,
      birthDate: student.birthDate || '',
      street: student.address?.street || '',
      city: student.address?.city || '',
      state: student.address?.state || '',
      zip: student.address?.zip || '',
      observations: student.observations || '',
    })
  }

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!editingStudent) return
    setIsSaving(true)
    try {
      const selectedCourse = courses.find((c) => c.id === editForm.courseId)
      const finalCourseName = selectedCourse ? selectedCourse.name : editForm.courseName

      const updates: Partial<Student> = {
        fullName: editForm.fullName,
        cpf: editForm.cpf,
        cpfRaw: editForm.cpf.replace(/\D/g, ''),
        email: editForm.email,
        phone: editForm.phone,
        type: editForm.type,
        courseId: editForm.courseId,
        courseName: finalCourseName,
        status: editForm.status,
        birthDate: editForm.birthDate,
        address: {
          street: editForm.street,
          city: editForm.city,
          state: editForm.state,
          zip: editForm.zip,
        },
        observations: editForm.observations,
      }

      const res = await updateStudent(editingStudent.id, updates)
      toast({
        title: 'Aluno atualizado com sucesso!',
        description: `Dados de ${editForm.fullName} foram salvos e persistidos no banco.`,
      })

      // Atualiza visualização aberta caso seja o mesmo aluno
      if (viewStudent && viewStudent.id === editingStudent.id) {
        setViewStudent((prev) => (prev ? { ...prev, ...updates } : null))
      }

      setEditingStudent(null)
    } catch (err) {
      toast({
        title: 'Erro ao salvar aluno',
        description: 'Ocorreu um erro ao atualizar os dados. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Alteração rápida de status
  const handleQuickStatusChange = async (student: Student, newStatus: Student['status']) => {
    try {
      await updateStudent(student.id, { status: newStatus })
      toast({
        title: 'Status alterado!',
        description: `Status de ${student.fullName} atualizado para "${formatStatus(newStatus)}".`,
      })
      if (viewStudent && viewStudent.id === student.id) {
        setViewStudent((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    } catch {
      toast({
        title: 'Erro ao alterar status',
        description: 'Não foi possível alterar o status do aluno.',
        variant: 'destructive',
      })
    }
  }

  // Exclusão com confirmação
  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return
    setIsDeleting(true)
    try {
      const ok = await deleteStudent(studentToDelete.id)
      if (ok) {
        toast({
          title: 'Aluno excluído',
          description: `O registro de ${studentToDelete.fullName} foi removido com sucesso.`,
        })
        if (viewStudent && viewStudent.id === studentToDelete.id) {
          setViewStudent(null)
        }
      } else {
        toast({
          title: 'Exclusão não permitida',
          description: 'Não foi possível excluir o aluno do banco.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Ocorreu uma falha durante a exclusão.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setStudentToDelete(null)
    }
  }

  // Badges e formatações visuais
  const formatStatus = (st: Student['status']) => {
    switch (st) {
      case 'ativo':
      case 'matriculado':
        return 'Ativo'
      case 'inativo':
        return 'Inativo'
      case 'trancado':
        return 'Trancado'
      case 'pre_matricula':
        return 'Pré-matrícula'
      case 'concluido':
        return 'Concluído'
      default:
        return st
    }
  }

  const renderStatusBadge = (st: Student['status']) => {
    switch (st) {
      case 'ativo':
      case 'matriculado':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
          </Badge>
        )
      case 'trancado':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30">
            <Clock className="w-3 h-3 mr-1" /> Trancado
          </Badge>
        )
      case 'inativo':
        return (
          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30">
            <AlertCircle className="w-3 h-3 mr-1" /> Inativo
          </Badge>
        )
      case 'pre_matricula':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30">
            Pré-matrícula
          </Badge>
        )
      case 'concluido':
        return (
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30">
            Concluído
          </Badge>
        )
      default:
        return <Badge variant="outline">{st}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com resumo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Gestão de Alunos</h1>
            <Badge variant="outline" className="border-slate-700 text-slate-300 text-[11px]">
              {canManage ? 'Modo Gerencial' : 'Modo Visualização'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cadastro completo de discentes, documentação comprobatória, histórico de cobranças e
            controle de status.
          </p>
        </div>

        {/* Indicador de perfil e permissões */}
        <div className="flex items-center gap-2">
          {!canManage && (
            <div className="flex items-center gap-1.5 text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                Visualização restrita ao perfil <strong>{role}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-slate-900/60 border-slate-800 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Total de Alunos</span>
          <div className="text-xl font-bold text-white">{stats.total}</div>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Ativos</span>
          <div className="text-xl font-bold text-emerald-400">{stats.ativos}</div>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Trancados</span>
          <div className="text-xl font-bold text-amber-400">{stats.trancados}</div>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Inativos</span>
          <div className="text-xl font-bold text-rose-400">{stats.inativos}</div>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Graduação</span>
          <div className="text-xl font-bold text-blue-400">{stats.graduacao}</div>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Pós-Graduação</span>
          <div className="text-xl font-bold text-purple-400">{stats.pos}</div>
        </Card>
      </div>

      {/* Filtros e Barra de Busca */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Campo de Busca */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nome ou CPF (com ou sem pontuação)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por Tipo */}
            <div className="md:col-span-3">
              <Select
                value={typeFilter}
                onValueChange={(v: 'todos' | 'graduacao' | 'pos_graduacao') => setTypeFilter(v)}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white h-9">
                  <SelectValue placeholder="Tipo de Curso" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                  <SelectItem value="todos">Todos os Níveis</SelectItem>
                  <SelectItem value="graduacao">Graduação</SelectItem>
                  <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div className="md:col-span-3">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white h-9">
                  <SelectValue placeholder="Status do Aluno" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="ativo">Ativo (Matriculado)</SelectItem>
                  <SelectItem value="trancado">Trancado</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="pre_matricula">Pré-matrícula</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Alunos */}
      <Card className="bg-slate-900/80 border-slate-800 overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-white">Alunos Registrados</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Exibindo {filteredStudents.length} de {students.length} discentes
            </CardDescription>
          </div>
          {(searchTerm || typeFilter !== 'todos' || statusFilter !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setTypeFilter('todos')
                setStatusFilter('todos')
              }}
              className="text-xs text-slate-400 hover:text-white h-7 px-2"
            >
              Limpar filtros
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-300">Nenhum aluno encontrado</p>
              <p className="text-xs text-slate-500">
                Ajuste os filtros de busca ou verifique se o CPF digitado está correto.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Aluno / Foto</th>
                    <th className="py-3 px-4">CPF</th>
                    <th className="py-3 px-4">Curso / Nível</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Documentos</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((student) => {
                    const approvedDocs =
                      student.documents?.filter((d) => d.status === 'aprovado').length || 0
                    const totalDocs = student.documents?.length || 0

                    return (
                      <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Aluno / Foto */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border border-slate-700 shrink-0">
                              <AvatarImage src={student.photoUrl} alt={student.fullName} />
                              <AvatarFallback className="bg-slate-800 text-[11px] text-white">
                                {student.fullName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <button
                                onClick={() => setViewStudent(student)}
                                className="font-semibold text-white hover:text-blue-400 text-left block truncate max-w-[220px]"
                              >
                                {student.fullName}
                              </button>
                              <span className="text-[11px] text-slate-400 block truncate max-w-[220px]">
                                {student.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* CPF */}
                        <td className="py-3 px-4 font-mono text-slate-300">{student.cpf}</td>

                        {/* Curso / Nível */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-200 truncate max-w-[200px]">
                              {student.courseName || 'Não vinculado'}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase px-1.5 py-0 ${
                                student.type === 'graduacao'
                                  ? 'border-blue-500/40 text-blue-300 bg-blue-950/30'
                                  : 'border-purple-500/40 text-purple-300 bg-purple-950/30'
                              }`}
                            >
                              {student.type === 'graduacao' ? 'Graduação' : 'Pós-Graduação'}
                            </Badge>
                          </div>
                        </td>

                        {/* Status com Marcador Visual */}
                        <td className="py-3 px-4">{renderStatusBadge(student.status)}</td>

                        {/* Documentos */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {approvedDocs}/{totalDocs} aprovados
                            </span>
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Ver Ficha */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewStudent(student)}
                              className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
                              title="Ver ficha completa"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ficha
                            </Button>

                            {/* Editar (apenas perfis com permissão gerencial) */}
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(student)}
                                className="h-8 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40"
                                title="Editar dados do aluno"
                              >
                                <Edit3 className="w-3.5 h-3.5 mr-1" /> Editar
                              </Button>
                            )}

                            {/* Excluir (apenas root e admin) */}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStudentToDelete(student)}
                                className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                                title="Excluir aluno do sistema"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* =========================================================================
          MODAL: FICHA COMPLETA DO ALUNO (Visualização detalhada)
         ========================================================================= */}
      <Dialog open={!!viewStudent} onOpenChange={(open) => !open && setViewStudent(null)}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-slate-200 max-h-[90vh] overflow-y-auto">
          {viewStudent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border-2 border-blue-500/40 shadow-lg">
                      <AvatarImage src={viewStudent.photoUrl} alt={viewStudent.fullName} />
                      <AvatarFallback className="bg-slate-800 text-base text-white">
                        {viewStudent.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                        {viewStudent.fullName}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-400">
                        Matrícula / ID:{' '}
                        <span className="font-mono text-slate-300">{viewStudent.id}</span> •
                        Inscrito em: {viewStudent.enrolledAt || '2024'}
                      </DialogDescription>
                      <div className="flex items-center gap-2 mt-1.5">
                        {renderStatusBadge(viewStudent.status)}
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-700 text-slate-300"
                        >
                          {viewStudent.type === 'graduacao' ? 'Graduação' : 'Pós-Graduação'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Ações no topo da ficha */}
                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const s = viewStudent
                          setViewStudent(null)
                          handleOpenEdit(s)
                        }}
                        className="h-8 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1 text-blue-400" /> Editar
                      </Button>
                    </div>
                  )}
                </div>
              </DialogHeader>

              {/* Seletor rápido de Status (apenas para quem gerencia) */}
              {canManage && (
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
                    Alterar status rápido:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={
                        viewStudent.status === 'ativo' || viewStudent.status === 'matriculado'
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => handleQuickStatusChange(viewStudent, 'ativo')}
                      className={`h-7 text-xs ${
                        viewStudent.status === 'ativo' || viewStudent.status === 'matriculado'
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Ativo
                    </Button>
                    <Button
                      size="sm"
                      variant={viewStudent.status === 'trancado' ? 'default' : 'outline'}
                      onClick={() => handleQuickStatusChange(viewStudent, 'trancado')}
                      className={`h-7 text-xs ${
                        viewStudent.status === 'trancado'
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Trancado
                    </Button>
                    <Button
                      size="sm"
                      variant={viewStudent.status === 'inativo' ? 'default' : 'outline'}
                      onClick={() => handleQuickStatusChange(viewStudent, 'inativo')}
                      className={`h-7 text-xs ${
                        viewStudent.status === 'inativo'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Inativo
                    </Button>
                  </div>
                </div>
              )}

              {/* Abas da Ficha: Resumo Acadêmico, Dados Pessoais, Lançamento de Notas & Freq, Documentos, Cobranças */}
              <Tabs defaultValue="resumo" className="w-full">
                <TabsList className="grid grid-cols-5 bg-slate-950 border border-slate-800 text-xs">
                  <TabsTrigger value="resumo" className="text-xs font-semibold text-blue-300">
                    Resumo Acadêmico
                  </TabsTrigger>
                  <TabsTrigger value="dados" className="text-xs">
                    Dados Pessoais
                  </TabsTrigger>
                  <TabsTrigger value="notas" className="text-xs">
                    Notas & Freq.
                  </TabsTrigger>
                  <TabsTrigger value="documentos" className="text-xs">
                    Docs ({viewStudent.documents?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="cobrancas" className="text-xs">
                    Cobranças ({selectedStudentCharges.length})
                  </TabsTrigger>
                </TabsList>

                {/* Aba: Resumo Acadêmico Consolidado */}
                <TabsContent value="resumo" className="space-y-4 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Média Geral */}
                    <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Média Geral das Notas
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span
                          className={`text-2xl font-bold font-mono ${
                            academicConsolidated.overallAverage >= ACADEMIC_RULES.MIN_PASSING_GRADE
                              ? 'text-emerald-400'
                              : academicConsolidated.overallAverage > 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                          }`}
                        >
                          {academicConsolidated.hasData
                            ? academicConsolidated.overallAverage.toFixed(1)
                            : '—'}
                        </span>
                        <span className="text-[11px] text-slate-500">/ 10,0</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">
                        Mínimo para aprovação: {ACADEMIC_RULES.MIN_PASSING_GRADE.toFixed(1)}
                      </span>
                    </div>

                    {/* Frequência Acumulada */}
                    <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        % Frequência Acumulada
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span
                          className={`text-2xl font-bold font-mono ${
                            academicConsolidated.overallAttendancePercent >=
                            ACADEMIC_RULES.MIN_PASSING_ATTENDANCE_PERCENT
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {academicConsolidated.hasData
                            ? `${academicConsolidated.overallAttendancePercent}%`
                            : '100%'}
                        </span>
                        {academicConsolidated.totalClasses > 0 && (
                          <span className="text-[11px] text-slate-400">
                            ({academicConsolidated.totalPresents}/
                            {academicConsolidated.totalClasses} aulas)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">
                        Mínimo legal MEC: {ACADEMIC_RULES.MIN_PASSING_ATTENDANCE_PERCENT}%
                      </span>
                    </div>

                    {/* Situação Acadêmica Geral */}
                    <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Situação Acadêmica MEC
                      </span>
                      <div className="mt-1.5">
                        {academicConsolidated.status === 'aprovado' ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-2.5 py-1">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                            Aprovado
                          </Badge>
                        ) : academicConsolidated.status === 'reprovado' ? (
                          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-xs px-2.5 py-1">
                            <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                            Reprovado
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs px-2.5 py-1">
                            <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                            Em Curso
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">
                        Critério: Nota ≥ 6,0 e Presença ≥ 75%
                      </span>
                    </div>
                  </div>

                  {/* Resumo Consolidado por Disciplina */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                      Desempenho por Disciplina
                    </h4>

                    {academicConsolidated.summaries.length === 0 ? (
                      <div className="p-6 rounded-lg bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
                        Nenhum registro de nota ou frequência lançado para este aluno ainda.
                        <p className="text-[11px] text-slate-500 mt-1">
                          Use a aba <strong>Notas & Freq.</strong> para realizar lançamentos
                          acadêmicos.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {academicConsolidated.summaries.map((s) => {
                          const badge = getAcademicStatusBadge(s.status)
                          const attBadge = getAttendanceBadge(s.attendancePercent)
                          return (
                            <div
                              key={s.subject}
                              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <p className="font-semibold text-white">{s.subject}</p>
                                <p className="text-[11px] text-slate-400">
                                  Semestre/Módulo:{' '}
                                  <span className="text-slate-300">{s.term || 'Atual'}</span> •{' '}
                                  {s.grades.length} avaliações • {s.totalClasses} aulas registradas
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Média</span>
                                  <span
                                    className={`font-mono font-bold ${
                                      s.averageGrade >= ACADEMIC_RULES.MIN_PASSING_GRADE
                                        ? 'text-emerald-400'
                                        : 'text-rose-400'
                                    }`}
                                  >
                                    {s.averageGrade.toFixed(1)}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Presença</span>
                                  <span className="font-mono font-semibold text-slate-200">
                                    {attBadge.label}
                                  </span>
                                </div>

                                <Badge variant="outline" className={`text-[10px] ${badge.color}`}>
                                  {badge.label}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Aba: Notas e Frequência Detalhadas */}
                <TabsContent value="notas" className="space-y-4 pt-2">
                  <StudentGradesAndAttendanceTab
                    student={viewStudent}
                    grades={grades}
                    attendance={attendance}
                    currentUser={currentUser}
                    onAddGrade={addGrade}
                    onUpdateGrade={updateGrade}
                    onDeleteGrade={deleteGrade}
                    onAddAttendance={addAttendance}
                    onUpdateAttendance={updateAttendance}
                    onDeleteAttendance={deleteAttendance}
                  />
                </TabsContent>

                {/* Aba 1: Dados Pessoais */}
                <TabsContent value="dados" className="space-y-4 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-400 block flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-400" /> E-mail Institucional /
                        Pessoal
                      </span>
                      <p className="text-white font-medium break-all">
                        {viewStudent.email || 'Não informado'}
                      </p>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-400 block flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-400" /> Telefone / WhatsApp
                      </span>
                      <p className="text-white font-medium">
                        {viewStudent.phone || 'Não informado'}
                      </p>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-400 block flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-400" /> CPF Cadastrado
                      </span>
                      <p className="text-white font-mono font-medium">{viewStudent.cpf}</p>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-400 block flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" /> Data de Nascimento
                      </span>
                      <p className="text-white font-medium">
                        {viewStudent.birthDate || 'Não informada'}
                      </p>
                    </div>

                    <div className="sm:col-span-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-400 block flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-blue-400" /> Curso Vinculado
                      </span>
                      <p className="text-white font-medium text-sm">{viewStudent.courseName}</p>
                      <p className="text-[11px] text-slate-400">
                        Código interno do curso:{' '}
                        <span className="font-mono text-slate-300">{viewStudent.courseId}</span>
                      </p>
                    </div>

                    <div className="sm:col-span-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-400 block flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" /> Endereço Residencial
                      </span>
                      <p className="text-white font-medium">
                        {viewStudent.address?.street || 'Rua não cadastrada'},{' '}
                        {viewStudent.address?.city || ''} - {viewStudent.address?.state || ''}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        CEP: {viewStudent.address?.zip || 'Não informado'}
                      </p>
                    </div>

                    {viewStudent.observations && (
                      <div className="sm:col-span-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-slate-400 block">Observações da Secretaria</span>
                        <p className="text-slate-300 italic">{viewStudent.observations}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Aba 2: Documentos */}
                <TabsContent value="documentos" className="space-y-3 pt-3">
                  {!viewStudent.documents || viewStudent.documents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Nenhum documento anexado para este aluno.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {viewStudent.documents.map((doc: StudentDocument) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                              <FileCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-white">{doc.name}</p>
                              <p className="text-[11px] text-slate-400">
                                Arquivo: {doc.fileName} • Enviado em: {doc.uploadedAt}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                doc.status === 'aprovado'
                                  ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30'
                                  : doc.status === 'rejeitado'
                                    ? 'border-rose-500/40 text-rose-300 bg-rose-950/30'
                                    : 'border-amber-500/40 text-amber-300 bg-amber-950/30'
                              }`}
                            >
                              {doc.status.toUpperCase()}
                            </Badge>

                            {doc.fileUrl && doc.fileUrl !== '#' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                className="h-7 text-xs text-blue-400 hover:text-white px-2"
                              >
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-3 h-3 mr-1" /> Abrir
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Aba 3: Cobranças vinculadas */}
                <TabsContent value="cobrancas" className="space-y-3 pt-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs text-slate-400">
                      Cobranças atreladas a este aluno no financeiro:
                    </span>
                    {onNavigateToFinanceiro && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const cpf = viewStudent.cpfRaw || viewStudent.cpf
                          setViewStudent(null)
                          onNavigateToFinanceiro({ studentCpf: cpf })
                        }}
                        className="h-7 text-xs border-emerald-500/40 text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Abrir todas no Financeiro
                      </Button>
                    )}
                  </div>

                  {selectedStudentCharges.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Nenhuma cobrança registrada para este aluno no módulo financeiro.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudentCharges.map((chg) => (
                        <div
                          key={chg.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-white">{chg.description}</p>
                              <p className="text-[11px] text-slate-400">
                                Código: <span className="font-mono text-slate-300">{chg.code}</span>{' '}
                                • Vencimento: {chg.dueDate}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                            <div className="text-left sm:text-right">
                              <p className="font-bold text-white text-sm">
                                R${' '}
                                {chg.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <Badge
                                variant="outline"
                                className={`text-[10px] mt-0.5 ${
                                  chg.status === 'pago'
                                    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30'
                                    : chg.status === 'atrasado'
                                      ? 'border-rose-500/40 text-rose-300 bg-rose-950/30'
                                      : 'border-amber-500/40 text-amber-300 bg-amber-950/30'
                                }`}
                              >
                                {chg.status.toUpperCase()}
                              </Badge>
                            </div>

                            {onNavigateToFinanceiro && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setViewStudent(null)
                                  onNavigateToFinanceiro({ chargeId: chg.id })
                                }}
                                className="h-7 text-xs text-blue-400 hover:text-white hover:bg-slate-800 px-2"
                                title="Abrir cobrança no módulo Financeiro"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                Abrir
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setViewStudent(null)}
                  className="border-slate-800 text-xs text-slate-300"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: EDITAR ALUNO
         ========================================================================= */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-400" /> Editar Dados do Aluno
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Modifique as informações e salve. As alterações são persistidas no PocketBase.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nome */}
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-slate-300">Nome Completo *</Label>
                <Input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                  placeholder="Nome completo do aluno"
                />
              </div>

              {/* CPF */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">CPF *</Label>
                <Input
                  value={editForm.cpf}
                  onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                  placeholder="000.000.000-00"
                />
              </div>

              {/* Data Nascimento */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">E-mail *</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                  placeholder="aluno@exemplo.com"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Telefone / WhatsApp</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* Tipo (Graduação / Pós) */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Tipo de Ingresso</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v: 'graduacao' | 'pos_graduacao') =>
                    setEditForm({ ...editForm, type: v })
                  }
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                    <SelectItem value="graduacao">Graduação</SelectItem>
                    <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Status no Sistema</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v: Student['status']) => setEditForm({ ...editForm, status: v })}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="trancado">Trancado</SelectItem>
                    <SelectItem value="matriculado">Matriculado</SelectItem>
                    <SelectItem value="pre_matricula">Pré-matrícula</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Curso */}
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-slate-300">Curso Vinculado</Label>
                <Select
                  value={editForm.courseId}
                  onValueChange={(cId) => {
                    const found = courses.find((c) => c.id === cId)
                    setEditForm({
                      ...editForm,
                      courseId: cId,
                      courseName: found ? found.name : editForm.courseName,
                    })
                  }}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                    <SelectValue placeholder="Selecione o curso" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs max-h-56">
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} ({course.level === 'graduacao' ? 'Graduação' : 'Pós'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Endereço */}
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-slate-300">Logradouro / Rua</Label>
                  <Input
                    value={editForm.street}
                    onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Cidade</Label>
                  <Input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">UF / CEP</Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Input
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-xs text-white uppercase"
                      placeholder="UF"
                      maxLength={2}
                    />
                    <Input
                      value={editForm.zip}
                      onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-xs text-white"
                      placeholder="CEP"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-slate-300">Observações Acadêmicas</Label>
                <Textarea
                  value={editForm.observations}
                  onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white min-h-[60px]"
                  placeholder="Informações adicionais sobre o aluno..."
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingStudent(null)}
              className="border-slate-800 text-xs text-slate-300"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving || !editForm.fullName || !editForm.cpf}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          ALERT DIALOG: CONFIRMAÇÃO DE EXCLUSÃO (Root / Admin)
         ========================================================================= */}
      <AlertDialog
        open={!!studentToDelete}
        onOpenChange={(open) => !open && setStudentToDelete(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Confirmar Exclusão de Aluno
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-300 space-y-2">
              <p>
                Tem certeza que deseja remover o cadastro do aluno{' '}
                <strong className="text-white">{studentToDelete?.fullName}</strong> (CPF:{' '}
                <span className="font-mono text-slate-200">{studentToDelete?.cpf}</span>)?
              </p>
              <p className="text-rose-400 font-medium">
                Esta ação remove o registro do banco de dados PocketBase.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="bg-slate-800 border-slate-700 text-xs text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Aluno'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export default AlunosModule
