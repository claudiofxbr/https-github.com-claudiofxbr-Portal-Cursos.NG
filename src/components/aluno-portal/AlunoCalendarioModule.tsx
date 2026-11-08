import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Video,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { CalendarEvent, DAY_OF_WEEK_LABELS, DAY_OF_WEEK_SHORT } from '@/types/portal'

export function AlunoCalendarioModule() {
  const { calendarEvents, currentUser, students, classes, classSchedules } = usePortal()

  const [filterType, setFilterType] = useState<string>('todos')
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-03')

  const currentStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
    ) || students[0]

  const effectiveStudentId = currentUser?.studentId || currentStudent?.id || 'dbphexr97czw7cb'

  // Turmas em que o aluno está matriculado
  const myEnrolledClasses = classes.filter((c) => c.studentIds?.includes(effectiveStudentId))

  // Horários semanais das turmas do aluno
  const myClassSchedulesWithClass = myEnrolledClasses
    .flatMap((cls) => {
      const schedules = classSchedules.filter((s) => s.classId === cls.id)
      return schedules.map((sched) => ({
        ...sched,
        classItem: cls,
      }))
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Lista de eventos
  const eventsList: CalendarEvent[] =
    calendarEvents.length > 0
      ? calendarEvents
      : [
          {
            id: 'ev-1',
            studentId: effectiveStudentId,
            courseId: 'crs-eng-soft',
            title: 'Entrega da Atividade Prática 01: Diagrama C4',
            description: 'Envio do PDF com modelagem dos níveis Contexto, Contêiner e Componente.',
            type: 'entrega',
            startDate: '2026-03-25 23:59',
            subject: 'Arquitetura de Software',
            locationOrLink: 'Portal de Trabalhos',
          },
          {
            id: 'ev-2',
            studentId: effectiveStudentId,
            courseId: 'crs-eng-soft',
            title: 'Avaliação Bimestral 01: Banco de Dados',
            description: 'Prova teórica e prática com 10 questões de álgebra relacional e SQL.',
            type: 'prova',
            startDate: '2026-04-10 19:30',
            endDate: '2026-04-10 21:30',
            subject: 'Banco de Dados',
            locationOrLink: 'Laboratório Virtual AVA',
          },
          {
            id: 'ev-3',
            studentId: effectiveStudentId,
            courseId: 'crs-eng-soft',
            title: 'Mentoria Síncrona com Coordenador',
            description:
              'Dúvidas ao vivo sobre carreiras de engenharia de software e certificações.',
            type: 'aula_ao_vivo',
            startDate: '2026-03-20 20:00',
            endDate: '2026-03-20 21:00',
            subject: 'Coordenação Pedagógica',
            locationOrLink: 'Sala Google Meet (link via e-mail)',
          },
          {
            id: 'ev-4',
            studentId: effectiveStudentId,
            courseId: 'crs-eng-soft',
            title: 'Data Limite para Trancamento / Ajuste de Matrícula',
            description: 'Prazo estipulado pelo calendário acadêmico oficial 2026/1.',
            type: 'prazo',
            startDate: '2026-03-31 18:00',
            subject: 'Secretaria Acadêmica',
          },
        ]

  // Eventos do aluno ou gerais
  const myEvents = eventsList.filter((e) => !e.studentId || e.studentId === effectiveStudentId)

  // Filtragem por tipo
  const filteredEvents = myEvents.filter((e) => {
    if (filterType === 'todos') return true
    return e.type === filterType
  })

  // Ordenação cronológica por data
  filteredEvents.sort((a, b) => a.startDate.localeCompare(b.startDate))

  const getTypeBadge = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'entrega':
      case 'trabalho':
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] uppercase">
            {type === 'trabalho' ? 'Trabalho' : 'Entrega'}
          </Badge>
        )
      case 'prova':
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] uppercase">
            Avaliação
          </Badge>
        )
      case 'aula_ao_vivo':
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase">
            Ao Vivo
          </Badge>
        )
      case 'prazo':
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] uppercase">
            Prazo Oficial
          </Badge>
        )
      default:
        return <Badge className="bg-slate-800 text-slate-300 text-[10px] uppercase">Evento</Badge>
    }
  }

  const getTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'entrega':
      case 'trabalho':
        return <FileText className="w-5 h-5 text-amber-400" />
      case 'prova':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'aula_ao_vivo':
        return <Video className="w-5 h-5 text-blue-400" />
      default:
        return <CalendarIcon className="w-5 h-5 text-purple-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-400" />
            Calendário Acadêmico & Prazos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Acompanhe datas de provas, entregas de trabalhos, mentorias síncronas e prazos
            institucionais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-indigo-500/30 text-indigo-300 bg-indigo-500/10 text-xs px-3 py-1"
          >
            Março — Abril 2026
          </Badge>
        </div>
      </div>

      {/* Seção Nova: Meus Horários Semanais de Aula */}
      {myEnrolledClasses.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Minhas Aulas & Horários Semanais
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Grade de horários das turmas em que você está regularmente matriculado
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="border-blue-500/30 text-blue-300 bg-blue-500/10 text-xs w-fit"
              >
                {myEnrolledClasses.length} turma(s) vinculada(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {myClassSchedulesWithClass.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                Você está matriculado em turmas, mas os horários ainda estão sendo definidos pela
                coordenação.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {myClassSchedulesWithClass.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-xs font-semibold">
                          {DAY_OF_WEEK_LABELS[item.dayOfWeek]} ({DAY_OF_WEEK_SHORT[item.dayOfWeek]})
                        </Badge>
                        <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.startTime} - {item.endTime}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-1 line-clamp-1">
                        {item.classItem.name}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {item.classItem.courseName}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {item.room || 'Ambiente a confirmar'}
                      </span>
                      <span className="text-slate-400">Prof. {item.classItem.professorName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Barra de Filtro de Categoria */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Filtrar:
          </span>
          {['todos', 'entrega', 'prova', 'aula_ao_vivo', 'prazo'].map((t) => (
            <Button
              key={t}
              size="sm"
              variant={filterType === t ? 'default' : 'outline'}
              onClick={() => setFilterType(t)}
              className={`h-7 text-xs capitalize ${
                filterType === t
                  ? 'bg-indigo-600 text-white'
                  : 'border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t === 'aula_ao_vivo' ? 'Ao Vivo' : t}
            </Button>
          ))}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filteredEvents.length} compromisso(s) na grade
        </div>
      </div>

      {/* Grid de Prazos em Lista / Timeline */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-8 text-center text-slate-400 text-xs sm:text-sm">
              Nenhum evento registrado nesta categoria.
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((ev) => (
            <Card
              key={ev.id}
              className="bg-slate-900/70 border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
            >
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Ícone estilizado */}
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 shrink-0">
                    {getTypeIcon(ev.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{ev.title}</h3>
                      {getTypeBadge(ev.type)}
                    </div>

                    <p className="text-xs text-slate-300">{ev.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                      {ev.subject && (
                        <span className="text-indigo-400 font-medium">{ev.subject}</span>
                      )}
                      {ev.locationOrLink && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {ev.locationOrLink}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bloco de Data e Horário em Destaque */}
                <div className="self-end sm:self-center shrink-0 text-left sm:text-right bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/60 min-w-[150px]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{ev.startDate}</span>
                  </div>
                  {ev.endDate && (
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Até: {ev.endDate.split(' ')[1] || ev.endDate}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Horário de Brasília
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
