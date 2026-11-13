import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { ModuleKey } from '@/types/portal'
import { LoginModalScreen } from '@/components/auth/LoginModalScreen'
import { PortalShell } from '@/components/layout/PortalShell'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { MatriculaModule } from '@/components/matricula/MatriculaModule'
import { CursosModule } from '@/components/cursos/CursosModule'
import { FinanceiroModule } from '@/components/financeiro/FinanceiroModule'
import { UsuariosEquipeModule } from '@/components/usuarios/UsuariosEquipeModule'
import { ManutencaoModule } from '@/components/manutencao/ManutencaoModule'
import { LgpdModule } from '@/components/lgpd/LgpdModule'
import { DiagnosticoModule } from '@/components/diagnostico/DiagnosticoModule'
import { AgentesModule } from '@/components/agentes/AgentesModule'
import { RelatoriosModule } from '@/components/relatorios/RelatoriosModule'
import { AlunosModule } from '@/components/alunos/AlunosModule'
import { AlunoMinhasNotasModule } from '@/components/alunos/AlunoMinhasNotasModule'
import { AlunoPortalMaster } from '@/components/aluno-portal/AlunoPortalMaster'
import { InstitutionalErrorBoundary } from '@/components/common/InstitutionalErrorBoundary'
import { EADModule } from '@/components/ead/EADModule'
import { ProfessorAreaModule } from '@/components/professor/ProfessorAreaModule'
import { BibliotecaModule } from '@/components/biblioteca/BibliotecaModule'
import { CourseLibraryModule } from '@/components/cursos/CourseLibraryModule'
import { DiplomasCertificadosModule } from '@/components/diplomas/DiplomasCertificadosModule'
import { TurmasModule } from '@/components/turmas/TurmasModule'
import { GestaoInscricoesModule } from '@/components/matriculas/GestaoInscricoesModule'

export default function Index() {
  const { currentUser, canAccessModule } = usePortal()
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard')
  // Parâmetros de navegação cruzada entre módulos
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null)
  const [targetChargeId, setTargetChargeId] = useState<string | null>(null)
  const [targetStudentCpf, setTargetStudentCpf] = useState<string | null>(null)

  const handleNavigateToAlunos = (studentId: string) => {
    setTargetStudentId(studentId)
    if (canAccessModule('alunos')) {
      setActiveModule('alunos')
    }
  }

  const handleNavigateToFinanceiro = (options?: { chargeId?: string; studentCpf?: string }) => {
    if (options?.chargeId) setTargetChargeId(options.chargeId)
    if (options?.studentCpf) setTargetStudentCpf(options.studentCpf)
    if (canAccessModule('financeiro')) {
      setActiveModule('financeiro')
    }
  }

  // Se não houver usuário logado, renderiza diretamente a LoginModalScreen
  // (SPEC-INIT-001 Decisão 1: portão vira parte da tela de login, sem tela separada)
  if (!currentUser) {
    return <LoginModalScreen />
  }

  // Se o usuário logado for do papel ALUNO, renderiza o PORTAL DO ALUNO completo e dedicado
  // Protegido por ErrorBoundary institucional configurado para SPEC-INIT-001
  if (currentUser.role === 'aluno') {
    return (
      <InstitutionalErrorBoundary
        fallbackTitle="Instabilidade no Portal do Aluno"
        fallbackDescription="Ocorreu uma falha inesperada na interface. Conforme a política de integridade, a sessão foi encerrada por segurança."
      >
        <AlunoPortalMaster />
      </InstitutionalErrorBoundary>
    )
  }

  // Se o módulo ativo não for acessível pelo perfil atual, volta para dashboard
  const safeActiveModule = canAccessModule(activeModule) ? activeModule : 'dashboard'

  return (
    <InstitutionalErrorBoundary
      fallbackTitle="Instabilidade no Sistema"
      fallbackDescription="Ocorreu uma falha inesperada na aplicação. O estado da sessão foi descartado por segurança."
    >
      <PortalShell
        activeModule={safeActiveModule}
        setActiveModule={(mod) => {
          if (canAccessModule(mod)) {
            setActiveModule(mod)
          }
        }}
      >
        {safeActiveModule === 'dashboard' && (
          <DashboardOverview onNavigate={(mod) => setActiveModule(mod)} />
        )}
        {safeActiveModule === 'minhas_notas' && <AlunoMinhasNotasModule />}
        {safeActiveModule === 'alunos' && (
          <AlunosModule
            initialStudentId={targetStudentId}
            onClearInitialStudent={() => setTargetStudentId(null)}
            onNavigateToFinanceiro={handleNavigateToFinanceiro}
          />
        )}
        {safeActiveModule === 'matriculas' && (
          <MatriculaModule
            onNavigateToModule={(mod) => {
              if (canAccessModule(mod)) {
                setActiveModule(mod)
              }
            }}
          />
        )}
        {safeActiveModule === 'cursos' && <CursosModule />}
        {safeActiveModule === 'turmas' && <TurmasModule />}
        {safeActiveModule === 'ead' && <EADModule />}
        {safeActiveModule === 'financeiro' && (
          <FinanceiroModule
            initialChargeId={targetChargeId}
            initialStudentCpf={targetStudentCpf}
            onClearInitialFilters={() => {
              setTargetChargeId(null)
              setTargetStudentCpf(null)
            }}
            onNavigateToAluno={handleNavigateToAlunos}
          />
        )}
        {safeActiveModule === 'relatorios' && (
          <RelatoriosModule onNavigateToStudent={handleNavigateToAlunos} />
        )}
        {safeActiveModule === 'diplomas' && <DiplomasCertificadosModule />}
        {safeActiveModule === 'usuarios' && <UsuariosEquipeModule />}
        {safeActiveModule === 'manutencao' && <ManutencaoModule />}
        {safeActiveModule === 'lgpd' && <LgpdModule />}
        {safeActiveModule === 'diagnostico' && <DiagnosticoModule />}
        {safeActiveModule === 'agentes' && <AgentesModule />}
        {safeActiveModule === 'professor_area' && (
          <ProfessorAreaModule onNavigateToStudent={handleNavigateToAlunos} />
        )}
        {safeActiveModule === 'biblioteca' && <BibliotecaModule />}
        {safeActiveModule === 'biblioteca_cursos' && <CourseLibraryModule />}
        {safeActiveModule === 'gestao_inscricoes' && <GestaoInscricoesModule />}
      </PortalShell>
    </InstitutionalErrorBoundary>
  )
}
