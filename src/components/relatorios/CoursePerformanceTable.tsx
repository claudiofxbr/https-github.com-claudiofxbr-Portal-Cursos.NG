import React, { useState } from 'react'
import {
  ArrowUpDown,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Percent,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export interface CoursePerformanceData {
  courseId: string
  courseCode: string
  courseName: string
  level: string
  modality: string
  vacancies: number
  enrolledStudents: number
  occupancyRate: number // %
  revenue: number
  pendingAmount: number
  defaultRate: number // %
  ticketMedio: number
}

interface CoursePerformanceTableProps {
  data: CoursePerformanceData[]
}

type SortField = 'courseName' | 'enrolledStudents' | 'occupancyRate' | 'revenue' | 'defaultRate'

export const CoursePerformanceTable: React.FC<CoursePerformanceTableProps> = ({ data }) => {
  const [sortField, setSortField] = useState<SortField>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    const factor = sortOrder === 'asc' ? 1 : -1
    if (sortField === 'courseName') {
      return factor * a.courseName.localeCompare(b.courseName)
    }
    return factor * (a[sortField] - b[sortField])
  })

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-700" />
              Desempenho Financeiro e Ocupação por Curso
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Receita arrecadada, alunos matriculados, taxa de ocupação das vagas autorizadas e
              inadimplência segmentada por curso.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> &gt;75% Ocupado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> 50-75% Alerta
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;50% Crítico
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('courseName')}
                >
                  <div className="flex items-center gap-1">
                    Curso & Nível
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('enrolledStudents')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Alunos
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none min-w-[140px]"
                  onClick={() => handleSort('occupancyRate')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Taxa de Ocupação
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Receita (Paga)
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('defaultRate')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Inadimplência
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedData.map((item) => {
                let occupancyBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'
                let occupancyProgressColor = 'bg-emerald-500'
                if (item.occupancyRate < 50) {
                  occupancyBadgeColor = 'text-rose-700 bg-rose-50 border-rose-200'
                  occupancyProgressColor = 'bg-rose-500'
                } else if (item.occupancyRate < 75) {
                  occupancyBadgeColor = 'text-amber-700 bg-amber-50 border-amber-200'
                  occupancyProgressColor = 'bg-amber-500'
                }

                return (
                  <tr key={item.courseId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{item.courseName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-500">{item.courseCode}</span>
                        <span>•</span>
                        <span className="capitalize">{item.level.replace('_', ' ')}</span>
                        <span>•</span>
                        <span className="uppercase text-[10px]">{item.modality}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-slate-700">
                      <div className="flex items-center justify-end gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{item.enrolledStudents}</span>
                        <span className="text-slate-400 text-[11px]">/ {item.vacancies}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-between w-full max-w-[130px] text-[11px]">
                          <Badge
                            variant="outline"
                            className={`${occupancyBadgeColor} text-[10px] px-1.5 py-0`}
                          >
                            {item.occupancyRate.toFixed(1)}%
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.enrolledStudents}/{item.vacancies}
                          </span>
                        </div>
                        <div className="w-full max-w-[130px] bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${occupancyProgressColor} transition-all`}
                            style={{ width: `${Math.min(100, item.occupancyRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                      R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          item.defaultRate > 15
                            ? 'text-rose-600'
                            : item.defaultRate > 5
                              ? 'text-amber-600'
                              : 'text-slate-600'
                        }`}
                      >
                        {item.defaultRate.toFixed(1)}%
                      </span>
                      {item.pendingAmount > 0 && (
                        <span className="block text-[10px] text-slate-400">
                          (R${' '}
                          {item.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          )
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      R$ {item.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
