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
  const [targetEadCourseId, setTargetEadCourseId] = useState<string | null>(null)
  const [targetBibliotecaSearch, setTargetBibliotecaSearch] = useState<string>('')

  const handleOpenEadCourse = (courseId?: string | null) => {
    if (courseId) {
      setTargetEadCourseId(courseId)
    }
    setActiveTab('cursos')
  }

  const handleNavigateToBiblioteca = (searchQuery?: string) => {
    if (searchQuery) {
      setTargetBibliotecaSearch(searchQuery)
    } else {
      setTargetBibliotecaSearch('')
    }
    setActiveTab('biblioteca')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <AlunoInicioOverview setActiveTab={setActiveTab} onOpenEadCourse={handleOpenEadCourse} />
        )
      case 'perfil':
        return <AlunoPerfilModule />
      case 'cursos':
        return (
          <InstitutionalErrorBoundary
            fallbackTitle="Ambiente Virtual de Aprendizagem (EAD)"
            fallbackDescription="Não foi possível renderizar a trilha de aulas no momento. Suas notas e progresso continuam gravados com segurança."
            onNavigateHome={() => {
              setTargetEadCourseId(null)
              setActiveTab('inicio')
            }}
          >
            <AlunoCursosModule
              initialEadCourseId={targetEadCourseId}
              onClearInitialEadCourseId={() => setTargetEadCourseId(null)}
              onNavigateToBiblioteca={handleNavigateToBiblioteca}
            />
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
        return (
          <AlunoBibliotecaModule
            initialSearch={targetBibliotecaSearch}
            initialTab={targetBibliotecaSearch ? 'acervo' : 'meus_emprestimos'}
          />
        )
      case 'cobrancas':
        return <AlunoCobrancasModule />
      case 'suporte':
        return <AlunoSuporteModule />
      default:
        return (
          <AlunoInicioOverview setActiveTab={setActiveTab} onOpenEadCourse={handleOpenEadCourse} />
        )
    }
  }

  return (
    <AlunoPortalShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenEadCourse={handleOpenEadCourse}
    >
      {renderContent()}
    </AlunoPortalShell>
  )
}
