import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { ModuleKey } from '@/types/portal'
import { PortalGateGuard } from '@/components/auth/PortalGateGuard'
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
import { RelatoriosModule } from '@/components/relatorios/RelatoriosModule'
import { AlunosModule } from '@/components/alunos/AlunosModule'
import { AlunoMinhasNotasModule } from '@/components/alunos/AlunoMinhasNotasModule'
import { AlunoPortalMaster } from '@/components/aluno-portal/AlunoPortalMaster'

export default function Index() {
  const { currentUser, canAccessModule } = usePortal()
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard')

  // Se o usuário logado for do papel ALUNO, renderiza o PORTAL DO ALUNO completo e dedicado
  if (currentUser && currentUser.role === 'aluno') {
    return (
      <PortalGateGuard>
        <AlunoPortalMaster />
      </PortalGateGuard>
    )
  }

  // Se o módulo ativo não for acessível pelo perfil atual, volta para dashboard
  const safeActiveModule = canAccessModule(activeModule) ? activeModule : 'dashboard'

  return (
    <PortalGateGuard>
      {!currentUser ? (
        <LoginModalScreen />
      ) : (
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
          {safeActiveModule === 'alunos' && <AlunosModule />}
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
          {safeActiveModule === 'financeiro' && <FinanceiroModule />}
          {safeActiveModule === 'relatorios' && <RelatoriosModule />}
          {safeActiveModule === 'usuarios' && <UsuariosEquipeModule />}
          {safeActiveModule === 'manutencao' && <ManutencaoModule />}
          {safeActiveModule === 'lgpd' && <LgpdModule />}
          {safeActiveModule === 'diagnostico' && <DiagnosticoModule />}
        </PortalShell>
      )}
    </PortalGateGuard>
  )
}
