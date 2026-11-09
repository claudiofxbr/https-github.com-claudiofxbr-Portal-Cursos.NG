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

// sessionStorage keys usados pelo portal do aluno para sobreviver a reload (F5)
// no meio de uma aula: aba ativa + curso EAD aberto. Sessão de autenticação em si
// permanece no PocketBase (authStore), não aqui.
const STORAGE_ACTIVE_TAB = 'portalcursos.activeTab'
const STORAGE_ACTIVE_EAD_COURSE = 'portalcursos.activeEadCourseId'

const VALID_STUDENT_TABS: StudentPortalTab[] = [
  'inicio',
  'perfil',
  'cursos',
  'materiais',
  'calendario',
  'notificacoes',
  'minhas_notas',
  'biblioteca',
  'cobrancas',
  'suporte',
]

function readStoredTab(): StudentPortalTab {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_ACTIVE_TAB)
    if (stored && (VALID_STUDENT_TABS as string[]).includes(stored)) {
      return stored as StudentPortalTab
    }
  } catch {
    // sessionStorage indisponível: comportamento padrão (aba Início)
  }
  return 'inicio'
}

function readStoredEadCourseId(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_ACTIVE_EAD_COURSE)
  } catch {
    return null
  }
}

function clearStoredEadCourseId() {
  try {
    window.sessionStorage.removeItem(STORAGE_ACTIVE_EAD_COURSE)
  } catch {
    // silencioso
  }
}

export function AlunoPortalMaster() {
  const [activeTab, setActiveTab] = useState<StudentPortalTab>(readStoredTab)
  const [targetEadCourseId, setTargetEadCourseId] = useState<string | null>(readStoredEadCourseId)
  const [targetEadLessonId, setTargetEadLessonId] = useState<string | null>(null)
  const [targetBibliotecaSearch, setTargetBibliotecaSearch] = useState<string>('')

  const handleOpenEadCourse = (courseId?: string | null, lessonId?: string | null) => {
    // Defensivo: notificações/atalhos podem chegar com IDs vazios ou malformados
    // (ex.: aula removida do banco). Nesse caso abre a lista "Meus Cursos"
    // normalmente, mantendo o aluno logado — nunca uma exceção até o portão.
    const cleanCourseId = typeof courseId === 'string' && courseId.trim() ? courseId.trim() : null
    const cleanLessonId = typeof lessonId === 'string' && lessonId.trim() ? lessonId.trim() : null
    setTargetEadCourseId(cleanCourseId)
    setTargetEadLessonId(cleanLessonId)
    if (cleanCourseId) {
      try {
        window.sessionStorage.setItem(STORAGE_ACTIVE_EAD_COURSE, cleanCourseId)
      } catch {
        // sessão de reload indisponível: navegação funciona do mesmo modo
      }
    }
    setActiveTab('cursos')
    try {
      window.sessionStorage.setItem(STORAGE_ACTIVE_TAB, 'cursos')
    } catch {
      // silencioso
    }
  }

  const handleNavigateToBiblioteca = (searchQuery?: string) => {
    if (searchQuery) {
      setTargetBibliotecaSearch(searchQuery)
    } else {
      setTargetBibliotecaSearch('')
    }
    setActiveTab('biblioteca')
    try {
      window.sessionStorage.setItem(STORAGE_ACTIVE_TAB, 'biblioteca')
    } catch {
      // silencioso
    }
  }

  const handleTabChange = (tab: StudentPortalTab) => {
    setTargetEadCourseId(null)
    setTargetEadLessonId(null)
    clearStoredEadCourseId()
    setActiveTab(tab)
    try {
      window.sessionStorage.setItem(STORAGE_ACTIVE_TAB, tab)
    } catch {
      // silencioso
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <AlunoInicioOverview
            setActiveTab={handleTabChange}
            onOpenEadCourse={handleOpenEadCourse}
          />
        )
      case 'perfil':
        return <AlunoPerfilModule />
      case 'cursos':
        return (
          <InstitutionalErrorBoundary
            fallbackTitle="Ambiente Virtual de Aprendizagem (EAD)"
            fallbackDescription="Não foi possível renderizar a trilha de aulas no momento. Suas notas e progresso continuam gravados com segurança."
            onNavigateHome={() => {
              handleTabChange('inicio')
            }}
          >
            <AlunoCursosModule
              initialEadCourseId={targetEadCourseId}
              initialEadLessonId={targetEadLessonId}
              onClearInitialEadCourseId={() => {
                setTargetEadCourseId(null)
                setTargetEadLessonId(null)
              }}
              onNavigateToBiblioteca={handleNavigateToBiblioteca}
            />
          </InstitutionalErrorBoundary>
        )
      case 'materiais':
        return <AlunoMateriaisModule />
      case 'calendario':
        return <AlunoCalendarioModule />
      case 'notificacoes':
        return (
          <AlunoNotificacoesModule
            onOpenEadCourseAndLesson={(courseId, lessonId) =>
              handleOpenEadCourse(courseId, lessonId)
            }
            onNavigateTab={(tab) => {
              if ((VALID_STUDENT_TABS as string[]).includes(tab)) {
                handleTabChange(tab as StudentPortalTab)
              }
            }}
          />
        )
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
          <AlunoInicioOverview
            setActiveTab={handleTabChange}
            onOpenEadCourse={handleOpenEadCourse}
          />
        )
    }
  }

  return (
    <AlunoPortalShell
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onOpenEadCourse={handleOpenEadCourse}
    >
      {renderContent()}
    </AlunoPortalShell>
  )
}
