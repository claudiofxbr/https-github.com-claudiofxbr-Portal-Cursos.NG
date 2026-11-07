import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart as PieIcon, TrendingUp, BarChart3 } from 'lucide-react'

interface CategoryData {
  category: string
  label: string
  amount: number
  count: number
  percentage: number
}

interface MonthlyEvolutionData {
  monthKey: string
  monthLabel: string
  receitas: number
  despesas: number
  lucro: number
}

interface FinancialChartsProps {
  categoriesData: CategoryData[]
  evolutionData: MonthlyEvolutionData[]
}

const CATEGORY_COLORS = [
  '#0284c7', // sky-600
  '#0d9488', // teal-600
  '#f59e0b', // amber-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
  '#10b981', // emerald-500
]

const formatCurrency = (val: number) =>
  `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  categoriesData,
  evolutionData,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Evolução da Receita vs. Despesas e Lucro (Linha/Área) */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-700" />
            Evolução Temporal: Receitas vs. Despesas
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Acompanhamento histórico mensal de liquidação de mensalidades e custos operacionais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  formatter={(val: number) => [
                    `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                <Line
                  type="monotone"
                  dataKey="receitas"
                  name="Receita (Cobranças Pagas)"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="despesas"
                  name="Despesas Pagas"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#e11d48' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="lucro"
                  name="Lucro Líquido"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Receita por Categoria (Barras / Distribuição) */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-700" />
            Distribuição de Receitas por Categoria
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Origem da arrecadação líquida (Mensalidades, Matrículas, Taxas, Certificados e Outros).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoriesData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-xs text-slate-400">
              Sem dados de receita no período.
            </div>
          ) : (
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoriesData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={formatCurrency}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    formatter={(val: number) => [
                      `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      'Receita',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#0284c7" radius={[0, 4, 4, 0]}>
                    {categoriesData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
