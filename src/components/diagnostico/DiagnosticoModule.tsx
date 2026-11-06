import React from 'react'
import { usePortal } from '@/context/PortalContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  QrCode,
  GitBranch,
  Calendar,
  Layers,
  Sparkles,
  Server,
  Activity,
} from 'lucide-react'

export function DiagnosticoModule() {
  const { diagnostic, refreshDiagnostic, currentUser } = usePortal()
  const { toast } = useToast()

  const handleRefresh = () => {
    refreshDiagnostic()
    toast({
      title: 'Diagnóstico Atualizado',
      description: 'Latências e checagens de integridade recalculadas com sucesso.',
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-purple-400" />
            Diagnóstico do Sistema & Telemetria
          </h1>
          <p className="text-xs text-slate-400">
            Saúde dos subsistemas, estado de migrações, gateway Pix, versão do build e roadmap
          </p>
        </div>

        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs h-9"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Atualizar Métricas
        </Button>
      </div>

      {/* Visão de Saúde Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 flex items-center justify-between">
              Estado Geral
              <Activity className="w-4 h-4 text-emerald-400" />
            </span>
            <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" /> Saudável (100%)
            </div>
            <p className="text-[11px] text-slate-500">Todos os micro-serviços operacionais</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 flex items-center justify-between">
              Gateway Pix (Mock)
              <QrCode className="w-4 h-4 text-blue-400" />
            </span>
            <div className="text-xl font-bold text-blue-400">Sandbox Ativo</div>
            <p className="text-[11px] text-slate-500">QR Code e Copia-e-Cola operantes</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 flex items-center justify-between">
              Migrações DDL
              <Database className="w-4 h-4 text-indigo-400" />
            </span>
            <div className="text-xl font-bold text-white">
              {diagnostic.databaseMigrations.appliedCount} aplicadas
            </div>
            <p className="text-[11px] text-slate-500 font-mono">0 pendentes (Up-to-date)</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-slate-400 flex items-center justify-between">
              Versão & Hash
              <GitBranch className="w-4 h-4 text-purple-400" />
            </span>
            <div className="text-xl font-bold text-purple-300 font-mono">
              {diagnostic.version.split(' ')[0]}
            </div>
            <p className="text-[11px] text-slate-500 font-mono">Commit: {diagnostic.gitCommit}</p>
          </CardContent>
        </Card>
      </div>

      {/* Latência e Status por Subsistema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Módulos */}
        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              Estado dos Módulos do Sistema
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Checagem de integridade interna e latência em milissegundos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {diagnostic.modulesStatus.map((m) => (
              <div
                key={m.name}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-200">{m.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-400">{m.latencyMs}ms</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/30 text-emerald-400"
                  >
                    OK
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Informações Técnicas & Gateway Pix */}
        <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Configuração do Gateway Pix & Banco de Dados
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Parâmetros do ambiente Sandbox e estado da infraestrutura
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Provedor Pix:</span>
                <span className="font-semibold text-white">{diagnostic.pixGateway.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Modo de Operação:</span>
                <span className="font-mono text-amber-400">Simulação Navegável (Mock)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Webhook de Notificação:</span>
                <span className="font-mono text-[11px] text-slate-300">
                  {diagnostic.pixGateway.webhookStatus}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Última Migração:</span>
                <span className="font-mono text-[11px] text-blue-300">
                  {diagnostic.databaseMigrations.lastMigration}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data/Hora do Build:</span>
                <span className="font-mono text-[11px] text-slate-400">{diagnostic.buildTime}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/40 text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Arquitetura PDR (Requisitos do Projeto)
              </span>
              <p className="text-[11px] text-slate-400">
                Esta versão consolida o portão de segurança inicial, formulários de matrícula com
                upload de documentos, catálogo de cursos com proteção e-MEC contra alteração
                indevida, cobranças com Pix demonstrativo e chamados prediais.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roadmap do Portal */}
      <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Roadmap do PortalCursos.NG
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Evolução funcional entre as fases de demonstração e produção
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diagnostic.roadmap.map((phase) => (
              <div
                key={phase.version}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-white">
                      {phase.version}
                    </span>
                    <h3 className="text-xs text-slate-400">{phase.title}</h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase ${
                      phase.status === 'concluido'
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                        : 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                    }`}
                  >
                    {phase.status === 'concluido' ? 'Concluído' : 'Em Desenvolvimento'}
                  </Badge>
                </div>

                <ul className="space-y-1 text-xs text-slate-300">
                  {phase.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[11px]">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${phase.status === 'concluido' ? 'bg-emerald-400' : 'bg-blue-400'}`}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
