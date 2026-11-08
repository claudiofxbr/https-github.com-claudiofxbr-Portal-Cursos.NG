import React, { useState, useMemo } from 'react'
import { usePortal } from '@/context/PortalContext'
import {
  ClassItem,
  ClassSchedule,
  DayOfWeek,
  DAY_OF_WEEK_LABELS,
  DAY_OF_WEEK_SHORT,
} from '@/types/portal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Calendar,
  Users,
  Clock,
  Plus,
  Search,
  Filter,
  GraduationCap,
  Trash2,
  Edit,
  UserCheck,
  UserMinus,
  DoorOpen,
  CalendarCheck,
  Percent,
  BookOpen,
  ClipboardCheck,
} from 'lucide-react'
import { ClassAttendanceManager } from './ClassAttendanceManager'

export function TurmasModule() {
  const {
    classes,
    classSchedules,
    courses,
    users,
    students,
    attendance,
    currentUser,
    createClass,
    updateClass,
    deleteClass,
    createClassSchedule,
    deleteClassSchedule,
    enrollStudentsInClass,
    removeStudentFromClass,
    saveBatchAttendance,
  } = usePortal()

  const { toast } = useToast()

  // Permissões
  const isGestor = ['root', 'admin', 'secretaria', 'coordenador'].includes(currentUser?.role || '')
  const isProfessorOnly = currentUser?.role === 'professor'

  // Filtros
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  // Modais
  const [isClassModalOpen, setIsClassModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [selectedClassForDetails, setSelectedClassForDetails] = useState<ClassItem | null>(null)
  const [detailActiveTab, setDetailActiveTab] = useState<'schedules' | 'students' | 'attendance'>(
    'schedules',
  )

  // Sub-modais dentro de detalhes
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [enrollSearch, setEnrollSearch] = useState('')
  const [selectedStudentsToEnroll, setSelectedStudentsToEnroll] = useState<string[]>([])

  // Formulário de Turma
  const [className, setClassName] = useState('')
  const [classCourseId, setClassCourseId] = useState('')
  const [classProfessorUserId, setClassProfessorUserId] = useState('')
  const [classTerm, setClassTerm] = useState('')
  const [classCapacity, setClassCapacity] = useState('30')
  const [classStatus, setClassStatus] = useState<'planejada' | 'em_andamento' | 'encerrada'>(
    'planejada',
  )
  const [classNotes, setClassNotes] = useState('')

  // Formulário de Horário
  const [schedDay, setSchedDay] = useState<DayOfWeek>('segunda')
  const [schedStartTime, setSchedStartTime] = useState('08:00')
  const [schedEndTime, setSchedEndTime] = useState('11:40')
  const [schedRoom, setSchedRoom] = useState('Sala 101')

  // Lista de professores disponíveis (usuários da equipe, excluindo alunos)
  const availableProfessors = useMemo(() => {
    return users.filter((u) => u.role !== 'aluno')
  }, [users])

  // Turmas visíveis (se for professor, apenas as dele; se gestor, todas)
  const visibleClasses = useMemo(() => {
    return classes.filter((c) => {
      if (isProfessorOnly && c.professorUserId !== currentUser?.id) {
        return false
      }
      if (courseFilter !== 'todos' && c.courseId !== courseFilter) {
        return false
      }
      if (statusFilter !== 'todos' && c.status !== statusFilter) {
        return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = c.name.toLowerCase().includes(q)
        const matchCourse = c.courseName?.toLowerCase().includes(q)
        const matchProf = c.professorName?.toLowerCase().includes(q)
        const matchTerm = c.term.toLowerCase().includes(q)
        if (!matchName && !matchCourse && !matchProf && !matchTerm) return false
      }
      return true
    })
  }, [classes, isProfessorOnly, currentUser, courseFilter, statusFilter, search])

  // KPIs
  const kpis = useMemo(() => {
    const total = visibleClasses.length
    const emAndamento = visibleClasses.filter((c) => c.status === 'em_andamento').length
    const totalAlunosAlocados = visibleClasses.reduce(
      (acc, c) => acc + (c.studentIds?.length || 0),
      0,
    )
    const totalCapacidade = visibleClasses.reduce((acc, c) => acc + (c.capacity || 0), 0)
    const taxaOcupacao =
      totalCapacidade > 0 ? Math.round((totalAlunosAlocados / totalCapacidade) * 100) : 0
    return { total, emAndamento, totalAlunosAlocados, taxaOcupacao }
  }, [visibleClasses])

  // Turma selecionada sincronizada com o estado
  const activeDetailClass = useMemo(() => {
    if (!selectedClassForDetails) return null
    return classes.find((c) => c.id === selectedClassForDetails.id) || selectedClassForDetails
  }, [classes, selectedClassForDetails])

  // Horários da turma selecionada
  const activeClassSchedules = useMemo(() => {
    if (!activeDetailClass) return []
    return classSchedules
      .filter((s) => s.classId === activeDetailClass.id)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [classSchedules, activeDetailClass])

  // Alunos matriculados na turma selecionada
  const enrolledStudents = useMemo(() => {
    if (!activeDetailClass?.studentIds) return []
    const ids = new Set(activeDetailClass.studentIds)
    return students.filter((s) => ids.has(s.id))
  }, [students, activeDetailClass])

  // Alunos elegíveis para inclusão na turma (apenas ativos/matriculados que ainda não estão nela)
  const eligibleStudents = useMemo(() => {
    if (!activeDetailClass) return []
    const alreadyEnrolled = new Set(activeDetailClass.studentIds || [])
    return students
      .filter((s) => !alreadyEnrolled.has(s.id))
      .filter((s) => {
        if (!enrollSearch.trim()) return true
        const q = enrollSearch.toLowerCase()
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.cpf.includes(q) ||
          s.cpfRaw.includes(q) ||
          s.courseName.toLowerCase().includes(q)
        )
      })
  }, [students, activeDetailClass, enrollSearch])

  // Abrir modal de criação
  const handleOpenCreateModal = () => {
    setEditingClass(null)
    setClassName('')
    setClassCourseId(courses[0]?.id || '')
    setClassProfessorUserId(
      availableProfessors.find((u) => u.role === 'professor')?.id ||
        availableProfessors[0]?.id ||
        '',
    )
    setClassTerm('2026/1')
    setClassCapacity('35')
    setClassStatus('planejada')
    setClassNotes('')
    setIsClassModalOpen(true)
  }

  // Abrir modal de edição
  const handleOpenEditModal = (cls: ClassItem) => {
    setEditingClass(cls)
    setClassName(cls.name)
    setClassCourseId(cls.courseId)
    setClassProfessorUserId(cls.professorUserId)
    setClassTerm(cls.term)
    setClassCapacity(String(cls.capacity))
    setClassStatus(cls.status)
    setClassNotes(cls.notes || '')
    setIsClassModalOpen(true)
  }

  // Salvar Turma (Create/Update)
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!className.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o nome da turma.',
        variant: 'destructive',
      })
      return
    }
    if (!classCourseId) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione um curso.',
        variant: 'destructive',
      })
      return
    }
    if (!classProfessorUserId) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione um professor da equipe.',
        variant: 'destructive',
      })
      return
    }

    const matchedCourse = courses.find((c) => c.id === classCourseId)
    const matchedProf = users.find((u) => u.id === classProfessorUserId)
    const capacityNum = Math.max(1, parseInt(classCapacity, 10) || 30)

    if (editingClass) {
      const updated = await updateClass(editingClass.id, {
        name: className.trim(),
        courseId: classCourseId,
        courseName: matchedCourse?.name || editingClass.courseName,
        professorUserId: classProfessorUserId,
        professorName: matchedProf?.name || editingClass.professorName,
        term: classTerm.trim() || '2026/1',
        capacity: capacityNum,
        status: classStatus,
        notes: classNotes.trim(),
      })
      if (updated) {
        toast({
          title: 'Turma atualizada',
          description: `Turma "${updated.name}" atualizada com sucesso.`,
        })
        setIsClassModalOpen(false)
        if (selectedClassForDetails?.id === updated.id) {
          setSelectedClassForDetails(updated)
        }
      } else {
        toast({
          title: 'Erro ao atualizar',
          description: 'Não foi possível salvar as alterações.',
          variant: 'destructive',
        })
      }
    } else {
      const created = await createClass({
        name: className.trim(),
        courseId: classCourseId,
        courseName: matchedCourse?.name || '',
        professorUserId: classProfessorUserId,
        professorName: matchedProf?.name || '',
        term: classTerm.trim() || '2026/1',
        capacity: capacityNum,
        status: classStatus,
        studentIds: [],
        notes: classNotes.trim(),
      })
      if (created) {
        toast({
          title: 'Turma criada',
          description: `Turma "${created.name}" cadastrada com sucesso.`,
        })
        setIsClassModalOpen(false)
      } else {
        toast({
          title: 'Erro ao criar',
          description: 'Não foi possível cadastrar a turma.',
          variant: 'destructive',
        })
      }
    }
  }

  // Excluir turma
  const handleDeleteClass = async (cls: ClassItem) => {
    if (
      !confirm(
        `Deseja realmente excluir a turma "${cls.name}"? Todos os horários vinculados serão removidos.`,
      )
    ) {
      return
    }
    const ok = await deleteClass(cls.id)
    if (ok) {
      toast({ title: 'Turma excluída', description: 'A turma e seus horários foram removidos.' })
      if (selectedClassForDetails?.id === cls.id) {
        setSelectedClassForDetails(null)
      }
    }
  }

  // Adicionar Horário
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeDetailClass) return
    if (!schedStartTime || !schedEndTime) {
      toast({
        title: 'Horário inválido',
        description: 'Informe horário de início e término.',
        variant: 'destructive',
      })
      return
    }
    const created = await createClassSchedule({
      classId: activeDetailClass.id,
      dayOfWeek: schedDay,
      startTime: schedStartTime,
      endTime: schedEndTime,
      room: schedRoom.trim() || 'Sala Padrão',
    })
    if (created) {
      toast({
        title: 'Horário adicionado',
        description: `${DAY_OF_WEEK_LABELS[schedDay]} das ${schedStartTime} às ${schedEndTime} cadastrado.`,
      })
      setIsScheduleModalOpen(false)
    } else {
      toast({
        title: 'Erro ao adicionar',
        description: 'Não foi possível salvar o horário.',
        variant: 'destructive',
      })
    }
  }

  // Remover Horário
  const handleDeleteSchedule = async (schedId: string) => {
    if (!confirm('Deseja remover este horário da grade?')) return
    const ok = await deleteClassSchedule(schedId)
    if (ok) {
      toast({ title: 'Horário removido', description: 'O horário foi retirado da grade.' })
    }
  }

  // Matricular alunos selecionados
  const handleEnrollStudents = async () => {
    if (!activeDetailClass || selectedStudentsToEnroll.length === 0) return
    const currentCount = activeDetailClass.studentIds?.length || 0
    const newTotal = currentCount + selectedStudentsToEnroll.length
    if (newTotal > activeDetailClass.capacity) {
      toast({
        title: 'Capacidade excedida',
        description: `Esta turma comporta no máximo ${activeDetailClass.capacity} alunos (atualmente ${currentCount}). Você selecionou ${selectedStudentsToEnroll.length}.`,
        variant: 'destructive',
      })
      return
    }

    const ok = await enrollStudentsInClass(activeDetailClass.id, selectedStudentsToEnroll)
    if (ok) {
      toast({
        title: 'Alunos matriculados',
        description: `${selectedStudentsToEnroll.length} aluno(s) vinculado(s) à turma com sucesso.`,
      })
      setIsEnrollModalOpen(false)
      setSelectedStudentsToEnroll([])
    } else {
      toast({
        title: 'Erro ao matricular',
        description: 'Não foi possível matricular os alunos.',
        variant: 'destructive',
      })
    }
  }

  // Desmatricular aluno
  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!activeDetailClass) return
    if (!confirm(`Remover o aluno "${studentName}" desta turma?`)) return
    const ok = await removeStudentFromClass(activeDetailClass.id, studentId)
    if (ok) {
      toast({ title: 'Aluno removido', description: `${studentName} foi desvinculado da turma.` })
    }
  }

  const getStatusBadge = (status: ClassItem['status']) => {
    switch (status) {
      case 'em_andamento':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Em Andamento
          </Badge>
        )
      case 'planejada':
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Planejada
          </Badge>
        )
      case 'encerrada':
        return (
          <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/30">
            Encerrada
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            Gestão de Turmas e Horários
          </h1>
          <p className="text-sm text-slate-400">
            Controle de turmas letivas, vinculação de professores por ID, grade de horários semanais
            e alocação de alunos.
          </p>
        </div>

        {isGestor && (
          <Button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Turma
          </Button>
        )}
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center justify-between">
              Total de Turmas
              <CalendarCheck className="w-4 h-4 text-blue-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-white">{kpis.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            {kpis.emAndamento} turmas em andamento no semestre
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center justify-between">
              Alunos Alocados
              <Users className="w-4 h-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-400">
              {kpis.totalAlunosAlocados}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            Matrículas ativas nas turmas visíveis
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center justify-between">
              Taxa de Ocupação Média
              <Percent className="w-4 h-4 text-indigo-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-400">
              {kpis.taxaOcupacao}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            Vagas preenchidas sobre o total ofertado
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center justify-between">
              Grade Semanal
              <Clock className="w-4 h-4 text-amber-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400">
              {classSchedules.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            Horários de aula configurados no sistema
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Buscar por turma, professor, curso ou período..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Filtrar por Curso" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="todos">Todos os Cursos</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                <SelectValue placeholder="Status da Turma" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="planejada">Planejada</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Turmas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleClasses.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-300">Nenhuma turma encontrada</p>
            <p className="text-xs text-slate-500 mt-1">
              Tente ajustar os filtros ou cadastre uma nova turma.
            </p>
          </div>
        ) : (
          visibleClasses.map((cls) => {
            const enrolledCount = cls.studentIds?.length || 0
            const percentFilled = Math.min(100, Math.round((enrolledCount / cls.capacity) * 100))
            const schedules = classSchedules.filter((s) => s.classId === cls.id)

            return (
              <Card
                key={cls.id}
                className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{cls.name}</span>
                        {getStatusBadge(cls.status)}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        {cls.courseName}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-3">
                  <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Professor:</span>
                      <span className="font-medium text-white flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                        {cls.professorName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Período Letivo:</span>
                      <span className="font-mono text-slate-200">{cls.term}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Horários Semanais:</span>
                      <span className="font-semibold text-blue-400">
                        {schedules.length > 0
                          ? schedules.map((s) => DAY_OF_WEEK_SHORT[s.dayOfWeek]).join(', ')
                          : 'Sem horários'}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Ocupação */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Vagas Ocupadas</span>
                      <span className="text-white font-medium">
                        {enrolledCount} / {cls.capacity} ({percentFilled}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percentFilled >= 100
                            ? 'bg-rose-500'
                            : percentFilled >= 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>
                </CardContent>

                {/* Ações da Turma */}
                <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedClassForDetails(cls)
                        setDetailActiveTab('schedules')
                      }}
                      className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 text-xs"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Horários & Alunos ({enrolledCount})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedClassForDetails(cls)
                        setDetailActiveTab('attendance')
                      }}
                      className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-xs"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                      Chamada
                    </Button>
                  </div>

                  {isGestor && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEditModal(cls)}
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        title="Editar Turma"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteClass(cls)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-400"
                        title="Excluir Turma"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal de Criação / Edição de Turma */}
      <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Editar Turma' : 'Criar Nova Turma'}</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Preencha os dados da turma letiva, vinculando o curso e o professor por ID.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClass} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Nome da Turma *</Label>
              <Input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ex: ADS 2026/1 - Turma Noturna A"
                className="bg-slate-950 border-slate-800 text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Curso Vinculado *</Label>
              <Select value={classCourseId} onValueChange={setClassCourseId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Selecione o curso" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Professor Responsável (por ID do Usuário) *
              </Label>
              <Select value={classProfessorUserId} onValueChange={setClassProfessorUserId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Selecione o professor" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {availableProfessors.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.roleTitle || p.role}) - ID: {p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Período Letivo *</Label>
                <Input
                  value={classTerm}
                  onChange={(e) => setClassTerm(e.target.value)}
                  placeholder="Ex: 2026/1"
                  className="bg-slate-950 border-slate-800 text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Capacidade Máxima (Alunos) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={classCapacity}
                  onChange={(e) => setClassCapacity(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Status</Label>
              <Select
                value={classStatus}
                onValueChange={(v: 'planejada' | 'em_andamento' | 'encerrada') => setClassStatus(v)}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="planejada">Planejada</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="encerrada">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Observações / Sala Principal</Label>
              <Input
                value={classNotes}
                onChange={(e) => setClassNotes(e.target.value)}
                placeholder="Ex: Aulas no Bloco B - Laboratório de Informática 3"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsClassModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white">
                {editingClass ? 'Salvar Alterações' : 'Criar Turma'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Completo: Detalhes da Turma, Grade de Horários e Alocação de Alunos */}
      {activeDetailClass && (
        <Dialog
          open={!!selectedClassForDetails}
          onOpenChange={(open) => !open && setSelectedClassForDetails(null)}
        >
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {activeDetailClass.name}
                    {getStatusBadge(activeDetailClass.status)}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs mt-1">
                    {activeDetailClass.courseName} • Período {activeDetailClass.term} • Professor:{' '}
                    {activeDetailClass.professorName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs
              value={detailActiveTab}
              onValueChange={(v) =>
                setDetailActiveTab(v as 'schedules' | 'students' | 'attendance')
              }
              className="w-full mt-2"
            >
              <TabsList className="bg-slate-950 border border-slate-800">
                <TabsTrigger
                  value="schedules"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Grade de Horários ({activeClassSchedules.length})
                </TabsTrigger>
                <TabsTrigger
                  value="students"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Alunos Matriculados ({enrolledStudents.length}/{activeDetailClass.capacity})
                </TabsTrigger>
                <TabsTrigger
                  value="attendance"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
                  Chamada da Turma
                </TabsTrigger>
              </TabsList>

              {/* Aba: Grade de Horários */}
              <TabsContent value="schedules" className="space-y-4 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Dias e Horários de Aula</h3>
                    <p className="text-xs text-slate-400">
                      Configuração das aulas presenciais ou síncronas da turma.
                    </p>
                  </div>

                  {isGestor && (
                    <Button
                      size="sm"
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar Horário
                    </Button>
                  )}
                </div>

                {activeClassSchedules.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/60 rounded-lg border border-slate-800">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">
                      Nenhum horário cadastrado para esta turma.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                    {activeClassSchedules.map((sched) => (
                      <div
                        key={sched.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 font-medium">
                            {DAY_OF_WEEK_LABELS[sched.dayOfWeek]}
                          </Badge>
                          <div>
                            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              {sched.startTime} às {sched.endTime}
                            </p>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <DoorOpen className="w-3.5 h-3.5 text-slate-500" />
                              {sched.room || 'Sem sala definida'}
                            </p>
                          </div>
                        </div>

                        {isGestor && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteSchedule(sched.id)}
                            className="h-8 w-8 text-slate-400 hover:text-rose-400"
                            title="Remover horário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Aba: Alunos Matriculados */}
              <TabsContent value="students" className="space-y-4 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Alunos Vinculados à Turma</h3>
                    <p className="text-xs text-slate-400">
                      Ocupação: {enrolledStudents.length} de {activeDetailClass.capacity} vagas
                      preenchidas.
                    </p>
                  </div>

                  {isGestor && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedStudentsToEnroll([])
                        setEnrollSearch('')
                        setIsEnrollModalOpen(true)
                      }}
                      disabled={enrolledStudents.length >= activeDetailClass.capacity}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Matricular Alunos
                    </Button>
                  )}
                </div>

                {enrolledStudents.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/60 rounded-lg border border-slate-800">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">
                      Nenhum aluno matriculado nesta turma ainda.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                    {enrolledStudents.map((st) => (
                      <div
                        key={st.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white border border-slate-700">
                            {st.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{st.fullName}</p>
                            <p className="text-xs text-slate-400">
                              CPF: {st.cpf} • {st.email}
                            </p>
                          </div>
                        </div>

                        {isGestor && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveStudent(st.id, st.fullName)}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 h-8"
                          >
                            <UserMinus className="w-3.5 h-3.5 mr-1" />
                            Remover
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Aba: Chamada da Turma */}
              <TabsContent value="attendance" className="space-y-4 pt-3">
                <ClassAttendanceManager
                  classItem={activeDetailClass}
                  enrolledStudents={enrolledStudents}
                  attendanceRecords={attendance}
                  canManage={
                    isGestor ||
                    (currentUser?.role === 'professor' &&
                      activeDetailClass.professorUserId === currentUser.id)
                  }
                  teacherId={currentUser?.id}
                  teacherName={currentUser?.name}
                  onSaveAttendance={saveBatchAttendance}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-3">
              <Button
                variant="outline"
                onClick={() => setSelectedClassForDetails(null)}
                className="border-slate-800 text-slate-300 hover:text-white"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Adicionar Horário à Turma */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Horário de Aula</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Defina o dia da semana, faixa de horário e ambiente de aula.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSchedule} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Dia da Semana *</Label>
              <Select value={schedDay} onValueChange={(v: DayOfWeek) => setSchedDay(v)}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {(Object.keys(DAY_OF_WEEK_LABELS) as DayOfWeek[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DAY_OF_WEEK_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Hora de Início *</Label>
                <Input
                  type="time"
                  value={schedStartTime}
                  onChange={(e) => setSchedStartTime(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Hora de Término *</Label>
                <Input
                  type="time"
                  value={schedEndTime}
                  onChange={(e) => setSchedEndTime(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Sala / Ambiente</Label>
              <Input
                value={schedRoom}
                onChange={(e) => setSchedRoom(e.target.value)}
                placeholder="Ex: Sala 204 - Bloco C"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white">
                Salvar Horário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Matricular Alunos da Base */}
      <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Matricular Alunos na Turma</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Selecione os alunos da base para vincular à turma {activeDetailClass?.name}. Vagas
              restantes:{' '}
              {(activeDetailClass?.capacity || 0) - (activeDetailClass?.studentIds?.length || 0)}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 flex-1 overflow-hidden flex flex-col">
            <Input
              placeholder="Buscar aluno por nome, CPF ou curso..."
              value={enrollSearch}
              onChange={(e) => setEnrollSearch(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white text-xs"
            />

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950/40 p-1">
              {eligibleStudents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  Nenhum aluno disponível para matrícula com estes critérios.
                </p>
              ) : (
                eligibleStudents.map((st) => {
                  const isChecked = selectedStudentsToEnroll.includes(st.id)
                  return (
                    <div
                      key={st.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedStudentsToEnroll((prev) => prev.filter((id) => id !== st.id))
                        } else {
                          setSelectedStudentsToEnroll((prev) => [...prev, st.id])
                        }
                      }}
                      className={`p-2.5 flex items-center justify-between rounded cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-950/40 border border-blue-500/30'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                        />
                        <div>
                          <p className="text-xs font-semibold text-white">{st.fullName}</p>
                          <p className="text-[11px] text-slate-400">
                            CPF: {st.cpf} • {st.courseName}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEnrollModalOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEnrollStudents}
              disabled={selectedStudentsToEnroll.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs disabled:opacity-50"
            >
              Confirmar Matrícula ({selectedStudentsToEnroll.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
