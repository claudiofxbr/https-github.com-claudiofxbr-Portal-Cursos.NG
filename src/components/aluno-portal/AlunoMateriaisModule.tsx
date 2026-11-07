import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FolderDown,
  Search,
  FileText,
  Video,
  Code,
  FileSpreadsheet,
  Download,
  ExternalLink,
  BookOpen,
  Filter,
} from 'lucide-react'
import { CourseMaterial } from '@/types/portal'

export function AlunoMateriaisModule() {
  const { courseMaterials } = usePortal()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('todos')
  const [selectedSubject, setSelectedSubject] = useState<string>('todos')

  // Se não houver materiais do banco, fornecemos um acervo inicial rico
  const materialsList: CourseMaterial[] =
    courseMaterials.length > 0
      ? courseMaterials
      : [
          {
            id: 'mat-1',
            courseId: 'crs-eng-soft',
            courseName: 'Engenharia de Software',
            subject: 'Arquitetura de Software',
            title: 'Apostila Completa: Clean Architecture & SOLID',
            description: 'Guia institucional com exemplos práticos em TypeScript e diagramas C4.',
            type: 'pdf',
            fileUrl: '#',
            fileSize: '4.8 MB',
            weekOrModule: 'Módulo 1',
            uploadedBy: 'Prof. Carlos Mendes',
            created: '2026-02-15',
            updated: '2026-02-15',
          },
          {
            id: 'mat-2',
            courseId: 'crs-eng-soft',
            courseName: 'Engenharia de Software',
            subject: 'Banco de Dados',
            title: 'Manual de Modelagem Relacional e Índices B-Tree',
            description: 'Normas de 1FN a 3FN, planos de execução e otimização de consultas.',
            type: 'pdf',
            fileUrl: '#',
            fileSize: '3.2 MB',
            weekOrModule: 'Módulo 2',
            uploadedBy: 'Profa. Mariana Costa',
            created: '2026-02-20',
            updated: '2026-02-20',
          },
          {
            id: 'mat-3',
            courseId: 'crs-eng-soft',
            courseName: 'Engenharia de Software',
            subject: 'Engenharia de Requisitos',
            title: 'Repositório de Exemplos: Histórias de Usuário & BDD',
            description: 'Templates de critérios de aceitação e automação com Cucumber/Gherkin.',
            type: 'codigo',
            externalUrl: 'https://github.com',
            fileSize: 'Git Repo',
            weekOrModule: 'Módulo 1',
            uploadedBy: 'Coordenação Acadêmica',
            created: '2026-02-25',
            updated: '2026-02-25',
          },
          {
            id: 'mat-4',
            courseId: 'crs-eng-soft',
            courseName: 'Engenharia de Software',
            subject: 'Gestão de Projetos Ágeis',
            title: 'Planilha de Capacidade, Burndown & Métricas Scrum',
            description:
              'Planilha parametrizada para cálculo de velocidade da sprint e débito técnico.',
            type: 'planilha',
            fileUrl: '#',
            fileSize: '1.4 MB',
            weekOrModule: 'Módulo 3',
            uploadedBy: 'Prof. Lucas Rocha',
            created: '2026-03-01',
            updated: '2026-03-01',
          },
          {
            id: 'mat-5',
            courseId: 'crs-eng-soft',
            courseName: 'Engenharia de Software',
            subject: 'Arquitetura de Software',
            title: 'Webinar Gravado: Microsserviços e Event-Driven',
            description: 'Sessão síncrona com estudo de caso de mensageria assíncrona.',
            type: 'video',
            externalUrl: '#',
            fileSize: 'Gravação HD',
            weekOrModule: 'Módulo 2',
            uploadedBy: 'Prof. Carlos Mendes',
            created: '2026-03-05',
            updated: '2026-03-05',
          },
        ]

  // Lista de disciplinas para filtro
  const uniqueSubjects = Array.from(new Set(materialsList.map((m) => m.subject))).filter(Boolean)

  // Filtragem
  const filteredMaterials = materialsList.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = selectedType === 'todos' || m.type === selectedType
    const matchesSubject = selectedSubject === 'todos' || m.subject === selectedSubject

    return matchesSearch && matchesType && matchesSubject
  })

  const getIconForType = (type: CourseMaterial['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />
      case 'video':
        return <Video className="w-5 h-5 text-blue-400" />
      case 'codigo':
        return <Code className="w-5 h-5 text-emerald-400" />
      case 'planilha':
      case 'outro':
        return <FileSpreadsheet className="w-5 h-5 text-teal-400" />
      default:
        return <FileText className="w-5 h-5 text-indigo-400" />
    }
  }

  const getTypeBadge = (type: CourseMaterial['type']) => {
    switch (type) {
      case 'pdf':
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] uppercase">
            PDF
          </Badge>
        )
      case 'video':
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase">
            Vídeo
          </Badge>
        )
      case 'codigo':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] uppercase">
            Código
          </Badge>
        )
      case 'planilha':
      case 'outro':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] uppercase">
            {type === 'planilha' ? 'Planilha' : 'Documento'}
          </Badge>
        )
      default:
        return <Badge className="bg-slate-800 text-slate-300 text-[10px] uppercase">Arquivo</Badge>
    }
  }

  const handleDownloadMaterial = (mat: CourseMaterial) => {
    // Feedback amigável para download do material
    const blob = new Blob(
      [
        `PortalCursos.NG - Acervo Acadêmico\n` +
          `Material: ${mat.title}\n` +
          `Disciplina: ${mat.subject}\n` +
          `Módulo: ${mat.weekOrModule || 'Geral'}\n` +
          `Professor: ${mat.uploadedBy || 'Corpo Docente'}\n` +
          `Descrição: ${mat.description || 'Conteúdo oficial do curso.'}\n\n` +
          `Acesso verificado via Portal do Aluno em ${new Date().toLocaleString('pt-BR')}`,
      ],
      { type: 'text/plain;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${mat.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FolderDown className="w-6 h-6 text-indigo-400" />
            Materiais de Estudo & Acervo Pedagógico
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Apostilas, slides, templates, planilhas e leituras complementares organizadas por
            disciplina.
          </p>
        </div>

        <Badge
          variant="outline"
          className="border-indigo-500/30 text-indigo-300 bg-indigo-500/10 self-start sm:self-auto"
        >
          {filteredMaterials.length} itens disponíveis
        </Badge>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Pesquisar por título, disciplina ou assunto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Tipo:</span>
            </div>
            {['todos', 'pdf', 'video', 'codigo', 'planilha'].map((type) => (
              <Button
                key={type}
                size="sm"
                variant={selectedType === type ? 'default' : 'outline'}
                onClick={() => setSelectedType(type)}
                className={`h-7 text-xs uppercase ${
                  selectedType === type
                    ? 'bg-indigo-600 text-white'
                    : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtro secundário por disciplina */}
        {uniqueSubjects.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto text-xs pt-1 border-t border-slate-800/60">
            <span className="text-slate-400 shrink-0">Disciplina:</span>
            <Button
              size="sm"
              variant={selectedSubject === 'todos' ? 'secondary' : 'ghost'}
              onClick={() => setSelectedSubject('todos')}
              className="h-6 text-[11px] px-2 text-slate-300"
            >
              Todas
            </Button>
            {uniqueSubjects.map((sub) => (
              <Button
                key={sub}
                size="sm"
                variant={selectedSubject === sub ? 'secondary' : 'ghost'}
                onClick={() => setSelectedSubject(sub)}
                className="h-6 text-[11px] px-2 text-slate-300 whitespace-nowrap"
              >
                {sub}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Materiais */}
      {filteredMaterials.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800">
          <CardContent className="p-8 text-center text-slate-400 text-xs sm:text-sm">
            Nenhum material de estudo encontrado com os filtros selecionados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((mat) => (
            <Card
              key={mat.id}
              className="bg-slate-900/70 border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                      {getIconForType(mat.type)}
                    </div>
                    <div>
                      <span className="text-[11px] text-indigo-400 font-medium block">
                        {mat.subject}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {mat.weekOrModule || 'Geral'}
                      </span>
                    </div>
                  </div>
                  {getTypeBadge(mat.type)}
                </div>

                <div>
                  <CardTitle className="text-sm font-semibold text-white leading-snug">
                    {mat.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-300 mt-1 line-clamp-2">
                    {mat.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400">
                    Por: <span className="text-slate-300">{mat.uploadedBy || 'Coordenação'}</span>
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">
                    Tamanho: {mat.fileSize || 'Doc'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {mat.externalUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(mat.externalUrl, '_blank')}
                      className="h-7 text-xs border-slate-700 text-slate-200 hover:bg-slate-800 gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Link
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleDownloadMaterial(mat)}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Baixar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
