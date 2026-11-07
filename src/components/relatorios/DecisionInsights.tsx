import React from 'react'
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CoursePerformanceData } from './CoursePerformanceTable'

export interface DecisionInsight {
  type: 'danger' | 'warning' | 'success' | 'info'
  title: string
  message: string
  actionHint?: string
}

interface DecisionInsightsProps {
  insights: DecisionInsight[]
}

export const DecisionInsights: React.FC<DecisionInsightsProps> = ({ insights }) => {
  if (insights.length === 0) return null

  return (
    <Card className="border-slate-200/80 shadow-sm bg-gradient-to-br from-slate-50 to-white">
      <CardHeader className="pb-2.5">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Sugestões & Observações para Apoio à Tomada de Decisão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((ins, index) => {
            let borderClass = 'border-slate-200'
            let bgClass = 'bg-white'
            let textClass = 'text-slate-800'
            let Icon = Info
            let iconColor = 'text-sky-600'

            if (ins.type === 'danger') {
              borderClass = 'border-rose-200'
              bgClass = 'bg-rose-50/50'
              textClass = 'text-rose-950'
              Icon = AlertTriangle
              iconColor = 'text-rose-600'
            } else if (ins.type === 'warning') {
              borderClass = 'border-amber-200'
              bgClass = 'bg-amber-50/50'
              textClass = 'text-amber-950'
              Icon = AlertTriangle
              iconColor = 'text-amber-600'
            } else if (ins.type === 'success') {
              borderClass = 'border-emerald-200'
              bgClass = 'bg-emerald-50/50'
              textClass = 'text-emerald-950'
              Icon = CheckCircle2
              iconColor = 'text-emerald-600'
            }

            return (
              <div
                key={index}
                className={`p-3 rounded-lg border ${borderClass} ${bgClass} flex flex-col justify-between text-xs transition-shadow hover:shadow-sm`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
                    <span className={textClass}>{ins.title}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{ins.message}</p>
                </div>
                {ins.actionHint && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] font-medium text-slate-500 flex items-center gap-1">
                    <span className="text-sky-700 font-semibold">Ação sugerida:</span>
                    <span className="truncate">{ins.actionHint}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
