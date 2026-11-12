import React, { useMemo, useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Course, CourseMaterial } from '@/types/portal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  BookOpen,
  Search,
  Clock,
  User,
  Layers,
  GraduationCap,
  FileText,
  Video,
  Code,
  FileSpreadsheet,
  LibraryBig,
  Award,
  Users,
} from 'lucide-react'

const LEVEL_LABELS: Record<Course['level'], string> = {
  graduacao: 'Graduação',
  pos_graduacao: 'Pós-Graduação',
  extensao: 'Extensão',
}

const TYPE_LABELS: Record<Course['type'], string> = {
  bacharelado: 'Bacharelado',
  licenciatura: 'Licenciatura',
  tecnologo: 'Tecnológico',
  especializacao: 'Especialização',
  mba: 'MBA',
}

const MODALITY_LABELS: Record<Course['modality'], string> = {
  presencial: 'Presencial',
  ead: 'EAD',
  semipresencial: 'Semipresencial',
}

export function CourseLibraryModule() {
  const { courses, courseMaterials } = usePortal()
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('todos')
  const [typeFilter, setTypeFilter] = useState<string>('todos')
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase()
    return courses.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.coordinator.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      const matchesLevel = levelFilter === 'todos' || c.level === levelFilter
      const matchesType = typeFilter === 'todos' || c.type === typeFilter
      return matchesSearch && matchesLevel && matchesType
    })
  }, [courses, search, levelFilter, typeFilter])

  const selectedCourse = selectedCourseId
    ? courses.find((c) => c.id === selectedCourseId) || null
    : null

  const courseMaterialsFor = (courseId: string): CourseMaterial[] =>
    courseMaterials.filter((m) => m.courseId === courseId)

  const getMaterialIcon = (type: CourseMaterial['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400" />
      case 'video':
        return <Video className="w-4 h-4 text-blue-400" />
      case 'codigo':
        return <Code className="w-4 h-4 text-emerald-400" />
      default:
        return <FileSpreadsheet className="w-4 h-4 text-teal-400" />
    }
  }

  const getMaterialTypeLabel = (type: CourseMaterial['type']) => {
    switch (type) {
      case 'pdf':
        return 'PDF'
      case 'video':
        return 'Vídeo'
      case 'codigo':
        return 'Código'
      case 'planilha':
        return 'Planilha'
      default:
        return 'Documento'
    }
  }

  // ===== Tela de detalhe do curso =====
  if (selectedCourse) {
    const materials = courseMaterialsFor(selectedCourse.id)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCourseId(null)}
            className="border-slate-700 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar à Biblioteca
          </Button>
          <span className="text-[11px] font-mono text-slate-500">
            Biblioteca de Cursos / {selectedCourse.code}
          </span>
        </div>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase">
                    {LEVEL_LABELS[selectedCourse.level]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                    {TYPE_LABELS[selectedCourse.type]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                    {MODALITY_LABELS[selectedCourse.modality]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      selectedCourse.status === 'ativo'
                        ? 'border-emerald-500/40 text-emerald-400'
                        : 'border-amber-500/40 text-amber-400'
                    }`}
                  >
                    {selectedCourse.status === 'ativo' ? 'Ativo' : 'Em revisão'}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <LibraryBig className="w-5 h-5 text-blue-400" />
                  {selectedCourse.name}
                </h2>
                <p className="text-xs font-mono text-slate-500">
                  Código: {selectedCourse.code} • e-MEC {selectedCourse.emecCode}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <Award className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  Conceito {selectedCourse.emecConcept}/5
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Descrição</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{selectedCourse.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5" /> Carga Horária
                </div>
                <p className="text-sm font-semibold text-white">
                  {selectedCourse.workloadHours.toLocaleString('pt-BR')} h
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Layers className="w-3.5 h-3.5" /> Duração
                </div>
                <p className="text-sm font-semibold text-white">
                  {selectedCourse.durationSemesters} semestres
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <User className="w-3.5 h-3.5" /> Coordenação
                </div>
                <p className="text-sm font-semibold text-white truncate">
                  {selectedCourse.coordinator}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Users className="w-3.5 h-3.5" /> Matriculados
                </div>
                <p className="text-sm font-semibold text-white">
                  {selectedCourse.enrolledCount} / {selectedCourse.vacancies} vagas
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <p className="text-[11px] text-slate-500 mb-1">Normativa MEC</p>
              <p className="text-xs text-slate-300">
                {selectedCourse.emecOrdinanceNumber} • Publicada em{' '}
                {selectedCourse.emecOrdinanceDate.split('-').reverse().join('/')}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Materiais e Recursos Vinculados
                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                  {materials.length}
                </Badge>
              </h3>
              {materials.length === 0 ? (
                <p className="text-xs text-slate-500 p-3 rounded-lg border border-dashed border-slate-800">
                  Nenhum material acadêmico vinculado a este curso ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getMaterialIcon(m.type)}
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{m.title}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {m.subject}
                            {m.weekOrModule ? ` • ${m.weekOrModule}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-700 text-slate-400 shrink-0"
                      >
                        {getMaterialTypeLabel(m.type)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== Listagem da Biblioteca de Cursos =====
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LibraryBig className="w-5 h-5 text-blue-400" />
            Biblioteca de Cursos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Catálogo navegável dos cursos da instituição com seus materiais e recursos acadêmicos.
          </p>
        </div>
        <Badge variant="outline" className="text-[11px] border-slate-700 text-slate-300">
          {filteredCourses.length} de {courses.length} cursos
        </Badge>
      </div>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código, área ou coordenador..."
              className="pl-9 bg-slate-950/60 border-slate-800 text-sm text-white placeholder:text-slate-600"
            />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full md:w-48 bg-slate-950/60 border-slate-800 text-sm text-white">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              <SelectItem value="todos">Todos os níveis</SelectItem>
              <SelectItem value="graduacao">Graduação</SelectItem>
              <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
              <SelectItem value="extensao">Extensão</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-48 bg-slate-950/60 border-slate-800 text-sm text-white">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="bacharelado">Bacharelado</SelectItem>
              <SelectItem value="licenciatura">Licenciatura</SelectItem>
              <SelectItem value="tecnologo">Tecnológico</SelectItem>
              <SelectItem value="especializacao">Especialização</SelectItem>
              <SelectItem value="mba">MBA</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filteredCourses.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-10 text-center space-y-2">
            <GraduationCap className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">Nenhum curso encontrado.</p>
            <p className="text-xs text-slate-500">Ajuste a busca ou os filtros de nível e tipo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCourses.map((course) => {
            const materialCount = courseMaterialsFor(course.id).length
            return (
              <button
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className="text-left rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-blue-500/40 transition-all p-5 space-y-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase">
                      {LEVEL_LABELS[course.level]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-slate-700 text-slate-400"
                    >
                      {MODALITY_LABELS[course.modality]}
                    </Badge>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {course.code}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-snug">{course.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">{TYPE_LABELS[course.type]}</p>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/70">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {course.workloadHours.toLocaleString('pt-BR')} h
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {materialCount}{' '}
                    {materialCount === 1 ? 'material' : 'materiais'}
                  </span>
                  <span className="text-blue-400">Ver detalhes →</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
