import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { StudentPortalTab } from '@/types/portal'
import { AlunoPortalShell } from './AlunoPortalShell'
import { InstitutionalErrorBoundary } from '@/components/common/InstitutionalErrorBoundary'
import { AlunoInicioOverview } from './AlunoInicioOverview'
import { AlunoCursosModule } from './AlunoCursosModule'
import { AlunoMateriaisModule } from './AlunoMateriaisModule'
import { AlunoCalendarioModule } from './AlunoCalendarioModule'
import { AlunoNotificacoesModule } from './AlunoNotificacoesModule'
import { AlunoSuporteModule } from './AlunoSuporteModule'
import { AlunoPerfilModule } from './AlunoPerfilModule'
import { AlunoMinhasNotasModule } from '@/components/alunos/AlunoMinhasNotasModule'
import { AlunoBibliotecaModule } from './AlunoBibliotecaModule'
import { AlunoCobrancasModule } from './AlunoCobrancasModule'

export function AlunoPortalMaster() {
  const [activeTab, setActiveTab] = useState<StudentPortalTab>('inicio')

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return <AlunoInicioOverview setActiveTab={setActiveTab} />
      case 'perfil':
        return <AlunoPerfilModule />
      case 'cursos':
        return (
          <InstitutionalErrorBoundary
            fallbackTitle="Ambiente Virtual de Aprendizagem (EAD)"
            fallbackDescription="Não foi possível renderizar a trilha de aulas no momento. Suas notas e progresso continuam gravados com segurança."
            onNavigateHome={() => setActiveTab('inicio')}
          >
            <AlunoCursosModule />
          </InstitutionalErrorBoundary>
        )
      case 'materiais':
        return <AlunoMateriaisModule />
      case 'calendario':
        return <AlunoCalendarioModule />
      case 'notificacoes':
        return <AlunoNotificacoesModule />
      case 'minhas_notas':
        return <AlunoMinhasNotasModule />
      case 'biblioteca':
        return <AlunoBibliotecaModule />
      case 'cobrancas':
        return <AlunoCobrancasModule />
      case 'suporte':
        return <AlunoSuporteModule />
      default:
        return <AlunoInicioOverview setActiveTab={setActiveTab} />
    }
  }

  return (
    <AlunoPortalShell activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </AlunoPortalShell>
  )
}
