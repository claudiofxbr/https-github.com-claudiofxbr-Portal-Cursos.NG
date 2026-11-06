import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Course } from '@/types/portal'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  BookOpen,
  Lock,
  Unlock,
  Award,
  FileCheck,
  Building2,
  Users,
  Clock,
  PlusCircle,
  Edit2,
  ShieldAlert,
} from 'lucide-react'

export function CursosModule() {
  const { courses, toggleCourseLock, updateCourse, addCourse, currentUser } = usePortal()
  const { toast } = useToast()

  const [filterLevel, setFilterLevel] = useState<string>('todos')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewCourse, setIsNewCourse] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [level, setLevel] = useState<'graduacao' | 'pos_graduacao'>('graduacao')
  const [type, setType] = useState<Course['type']>('bacharelado')
  const [modality, setModality] = useState<Course['modality']>('presencial')
  const [durationSemesters, setDurationSemesters] = useState(8)
  const [workloadHours, setWorkloadHours] = useState(3200)
  const [coordinator, setCoordinator] = useState('')
  const [emecCode, setEmecCode] = useState('')
  const [emecConcept, setEmecConcept] = useState(5)
  const [emecOrdinanceNumber, setEmecOrdinanceNumber] = useState('')
  const [emecOrdinanceDate, setEmecOrdinanceDate] = useState('')
  const [monthlyFee, setMonthlyFee] = useState(1200)
  const [vacancies, setVacancies] = useState(100)
  const [description, setDescription] = useState('')

  const canManageCourses =
    currentUser?.role === 'root' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'academico' ||
    currentUser?.role === 'coordenador'

  const filteredCourses = courses.filter((c) => {
    if (filterLevel === 'todos') return true
    return c.level === filterLevel
  })

  const openNewCourseModal = () => {
    setIsNewCourse(true)
    setEditingCourse(null)
    setName('')
    setCode(`CRS-${Date.now().toString().slice(-4)}`)
    setLevel('graduacao')
    setType('bacharelado')
    setModality('presencial')
    setDurationSemesters(8)
    setWorkloadHours(3200)
    setCoordinator(currentUser?.name || '')
    setEmecCode('1099999')
    setEmecConcept(5)
    setEmecOrdinanceNumber('Portaria SERES/MEC nº 000/2025')
    setEmecOrdinanceDate('2025-01-01')
    setMonthlyFee(990)
    setVacancies(80)
    setDescription('')
    setIsModalOpen(true)
  }

  const openEditModal = (c: Course) => {
    if (c.lockedForEditing && currentUser?.role !== 'root') {
      toast({
        title: 'Curso Trancado',
        description:
          'Este curso está trancado contra alteração indevida por diretriz da Reitoria. Somente o perfil Root pode destrancá-lo ou editá-lo diretamente.',
        variant: 'destructive',
      })
      return
    }

    setIsNewCourse(false)
    setEditingCourse(c)
    setName(c.name)
    setCode(c.code)
    setLevel(c.level === 'extensao' ? 'graduacao' : c.level)
    setType(c.type)
    setModality(c.modality)
    setDurationSemesters(c.durationSemesters)
    setWorkloadHours(c.workloadHours)
    setCoordinator(c.coordinator)
    setEmecCode(c.emecCode)
    setEmecConcept(c.emecConcept)
    setEmecOrdinanceNumber(c.emecOrdinanceNumber)
    setEmecOrdinanceDate(c.emecOrdinanceDate)
    setMonthlyFee(c.monthlyFee)
    setVacancies(c.vacancies)
    setDescription(c.description)
    setIsModalOpen(true)
  }

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault()

    if (isNewCourse) {
      addCourse({
        name,
        code,
        level,
        type,
        modality,
        durationSemesters: Number(durationSemesters),
        workloadHours: Number(workloadHours),
        coordinator,
        status: 'ativo',
        lockedForEditing: false,
        emecCode,
        emecConcept: Number(emecConcept),
        emecOrdinanceNumber,
        emecOrdinanceDate,
        description,
        monthlyFee: Number(monthlyFee),
        vacancies: Number(vacancies),
      })
      toast({
        title: 'Curso adicionado ao catálogo',
        description: `${name} foi registrado com sucesso com dados regulatórios e-MEC.`,
      })
    } else if (editingCourse) {
      updateCourse(editingCourse.id, {
        name,
        code,
        level,
        type,
        modality,
        durationSemesters: Number(durationSemesters),
        workloadHours: Number(workloadHours),
        coordinator,
        emecCode,
        emecConcept: Number(emecConcept),
        emecOrdinanceNumber,
        emecOrdinanceDate,
        description,
        monthlyFee: Number(monthlyFee),
        vacancies: Number(vacancies),
      })
      toast({
        title: 'Curso atualizado',
        description: `Dados de ${name} foram gravados com sucesso.`,
      })
    }
    setIsModalOpen(false)
  }

  const handleToggleLock = (course: Course) => {
    if (currentUser?.role !== 'root' && currentUser?.role !== 'admin') {
      toast({
        title: 'Ação restrita',
        description:
          'Apenas Administradores e Root podem alterar o trancamento de curso no catálogo.',
        variant: 'destructive',
      })
      return
    }

    toggleCourseLock(course.id)
    toast({
      title: course.lockedForEditing ? 'Curso destrancado' : 'Curso trancado com sucesso',
      description: course.lockedForEditing
        ? `${course.name} agora aceita modificações de coordenadores.`
        : `${course.name} foi blindado contra edições não autorizadas.`,
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Catálogo de Cursos & Regulação e-MEC
          </h1>
          <p className="text-xs text-slate-400">
            Conceitos MEC, portarias oficiais, vagas e mecanismo de trancamento contra alterações
            indevidas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageCourses && (
            <Button
              onClick={openNewCourseModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Novo Curso
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filtrar por nível:</span>
          <div className="flex gap-1.5">
            {['todos', 'graduacao', 'pos_graduacao'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterLevel === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {lvl === 'todos' ? 'Todos' : lvl === 'graduacao' ? 'Graduação' : 'Pós-Graduação'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Trancado = Protegido contra edição
          </span>
        </div>
      </div>

      {/* Grid de Cursos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCourses.map((course) => {
          return (
            <Card
              key={course.id}
              className={`border transition-all ${
                course.lockedForEditing
                  ? 'bg-slate-900/50 border-amber-500/20 hover:border-amber-500/40'
                  : 'bg-slate-900/70 border-slate-800 hover:border-indigo-500/40'
              } text-slate-100`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="bg-indigo-500/20 text-indigo-300 text-[10px] font-mono"
                      >
                        {course.code}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase border-slate-700 text-slate-300"
                      >
                        {course.level === 'graduacao' ? 'Graduação' : 'Pós-Graduação'} •{' '}
                        {course.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase border-slate-700 text-slate-300"
                      >
                        {course.modality}
                      </Badge>
                    </div>
                    <CardTitle className="text-base text-white">{course.name}</CardTitle>
                  </div>

                  {/* Lock Indicator */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleLock(course)}
                      title={
                        course.lockedForEditing
                          ? 'Curso trancado contra alteração. Clique para alternar (Admin/Root)'
                          : 'Curso destrancado. Clique para trancar.'
                      }
                      className={`p-1.5 rounded-lg border transition-all ${
                        course.lockedForEditing
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {course.lockedForEditing ? (
                        <div className="flex items-center gap-1 text-[11px] font-medium pr-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Trancado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-medium pr-1">
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Aberto</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
                <CardDescription className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {course.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                {/* Dados regulatórios e-MEC */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-400" />
                      Código e-MEC:{' '}
                      <strong className="text-white font-mono">{course.emecCode}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-amber-300">
                      <Award className="w-3.5 h-3.5" />
                      Conceito MEC: {course.emecConcept} / 5
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {course.emecOrdinanceNumber} ({course.emecOrdinanceDate})
                    </span>
                  </div>
                </div>

                {/* Métricas de oferta */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Mensalidade</span>
                    <span className="font-semibold text-emerald-400">
                      R$ {course.monthlyFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Carga Horária</span>
                    <span className="font-semibold text-slate-200">{course.workloadHours}h</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Vagas Ocupadas</span>
                    <span className="font-semibold text-blue-400">
                      {course.enrolledCount} / {course.vacancies}
                    </span>
                  </div>
                </div>

                {/* Footer ações */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500 text-[11px] truncate max-w-[200px]">
                    Coord: {course.coordinator}
                  </span>
                  <div className="flex items-center gap-2">
                    {course.lockedForEditing && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Bloqueado p/ alteração
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(course)}
                      className="h-7 text-xs border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              {isNewCourse ? 'Novo Curso do Catálogo' : `Editar Curso: ${name}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Dados acadêmicos e atos regulatórios do e-MEC (Portaria e Conceito)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCourse} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Nome do Curso *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Engenharia de Software"
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Código de Referência</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ex: ENG-SOFT-01"
                  className="bg-slate-900 border-slate-700 text-white text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Nível Acadêmico</label>
                <Select value={level} onValueChange={(v) => setLevel(v as any)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="graduacao">Graduação</SelectItem>
                    <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Tipo de Titulação</label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="bacharelado">Bacharelado</SelectItem>
                    <SelectItem value="tecnologo">Tecnólogo</SelectItem>
                    <SelectItem value="licenciatura">Licenciatura</SelectItem>
                    <SelectItem value="especializacao">Especialização</SelectItem>
                    <SelectItem value="mba">MBA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Modalidade</label>
                <Select value={modality} onValueChange={(v) => setModality(v as any)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="ead">EAD 100%</SelectItem>
                    <SelectItem value="semipresencial">Semipresencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Regulatório e-MEC */}
            <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-950/20 space-y-3">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Atos Regulatórios e-MEC
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">Código e-MEC</label>
                  <Input
                    value={emecCode}
                    onChange={(e) => setEmecCode(e.target.value)}
                    placeholder="1092841"
                    className="bg-slate-900 border-slate-700 text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">Conceito de Curso (1 a 5)</label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={emecConcept}
                    onChange={(e) => setEmecConcept(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">Data da Portaria</label>
                  <Input
                    type="date"
                    value={emecOrdinanceDate}
                    onChange={(e) => setEmecOrdinanceDate(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Número da Portaria e Veículo</label>
                <Input
                  value={emecOrdinanceNumber}
                  onChange={(e) => setEmecOrdinanceNumber(e.target.value)}
                  placeholder="Portaria SERES/MEC nº 214/2022"
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Mensalidade Padrão (R$)</label>
                <Input
                  type="number"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Carga Horária Total (h)</label>
                <Input
                  type="number"
                  value={workloadHours}
                  onChange={(e) => setWorkloadHours(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Vagas Ofertadas</label>
                <Input
                  type="number"
                  value={vacancies}
                  onChange={(e) => setVacancies(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Coordenador do Curso</label>
              <Input
                value={coordinator}
                onChange={(e) => setCoordinator(e.target.value)}
                placeholder="Prof. Nome do Coordenador"
                className="bg-slate-900 border-slate-700 text-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Ementa e Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumo formativo do curso..."
                rows={3}
                className="w-full rounded-md bg-slate-900 border border-slate-700 text-white text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-slate-700 bg-slate-900 text-slate-300 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                Salvar Curso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
