import React from 'react'
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface KpiCardProps {
  title: string
  value: string
  subValue?: string
  calculationExplanation: string
  delta: number // percentage points or % change
  deltaLabel: string
  invertDeltaColor?: boolean // for inadimplência or expenses: higher might be worse
  icon: React.ComponentType<{ className?: string }>
  formatDelta?: (d: number) => string
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subValue,
  calculationExplanation,
  delta,
  deltaLabel,
  invertDeltaColor = false,
  icon: Icon,
}) => {
  const isPositive = delta > 0.05
  const isNegative = delta < -0.05
  const isNeutral = !isPositive && !isNegative

  // If invertDeltaColor is true: positive delta is red (bad, e.g. inadimplência subiu), negative is green
  let deltaColorClass = 'text-slate-500'
  if (isPositive) {
    deltaColorClass = invertDeltaColor ? 'text-rose-600' : 'text-emerald-600'
  } else if (isNegative) {
    deltaColorClass = invertDeltaColor ? 'text-emerald-600' : 'text-rose-600'
  }

  const DeltaIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  const formattedDeltaText = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`

  return (
    <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </CardTitle>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={`Como é calculado ${title}`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs p-2.5 bg-slate-900 text-white shadow-lg">
                <p className="font-semibold text-sky-300 mb-1">Como é calculado:</p>
                <p className="leading-relaxed">{calculationExplanation}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {subValue && <div className="text-xs text-slate-500 mt-0.5">{subValue}</div>}

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className={`flex items-center font-medium gap-1 ${deltaColorClass}`}>
            <DeltaIcon className="w-3.5 h-3.5" />
            <span>{isNeutral ? 'Estável' : formattedDeltaText}</span>
          </div>
          <span className="text-slate-400">{deltaLabel}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 line-clamp-1 italic">
          {calculationExplanation}
        </p>
      </CardContent>
    </Card>
  )
}
