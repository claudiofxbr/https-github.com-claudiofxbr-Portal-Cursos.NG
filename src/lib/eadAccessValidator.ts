import { Student, EadCourse } from '@/types/portal'

export type EadAccessStatus =
  | 'autorizado'
  | 'bloqueado_situacao_cadastral'
  | 'nao_matriculado'
  | 'curso_inativo'
  | 'sem_permissao'

export interface EadEligibilityResult {
  isEligibleToStudy: boolean
  canToggleProgress: boolean
  status: EadAccessStatus
  reasonTitle: string
  reasonMessage: string
  studentStatus?: Student['status']
  studentStatusLabel: string
}

/**
 * Status do aluno que autorizam estudo ativo de aulas EAD:
 * 'ativo' e 'matriculado' estudam normalmente.
 * 'trancado', 'inativo', 'pre_matricula', 'concluido' ou qualquer outro
 * recebem suspensão/bloqueio com mensagem orientadora clara.
 */
export function isStudentEligibleForEadStudy(student?: Student | null): boolean {
  if (!student) return false
  const norm = (student.status || '').toLowerCase().trim()
  return norm === 'ativo' || norm === 'matriculado'
}

export function getStudentStatusLabel(status?: Student['status'] | string): string {
  if (!status) return 'Desconhecido'
  const norm = status.toLowerCase().trim()
  switch (norm) {
    case 'ativo':
      return 'Ativo'
    case 'matriculado':
      return 'Matriculado'
    case 'trancado':
      return 'Trancado'
    case 'inativo':
      return 'Inativo'
    case 'pre_matricula':
      return 'Pré-matrícula'
    case 'concluido':
      return 'Concluído'
    default:
      return status
  }
}

/**
 * Avalia a elegibilidade cadastral do aluno para acesso e estudo no ambiente EAD.
 */
export function checkEadEligibility(student?: Student | null): EadEligibilityResult {
  if (!student) {
    return {
      isEligibleToStudy: false,
      canToggleProgress: false,
      status: 'bloqueado_situacao_cadastral',
      reasonTitle: 'Cadastro de Aluno Não Identificado',
      reasonMessage:
        'Não foi possível localizar o registro cadastral do seu perfil. Entre em contato com a secretaria acadêmica.',
      studentStatusLabel: 'Não identificado',
    }
  }

  const eligible = isStudentEligibleForEadStudy(student)
  const statusLabel = getStudentStatusLabel(student.status)

  if (eligible) {
    return {
      isEligibleToStudy: true,
      canToggleProgress: true,
      status: 'autorizado',
      reasonTitle: 'Acesso Autorizado',
      reasonMessage:
        'Matrícula regular. Você está autorizado a assistir aulas e registrar seu progresso.',
      studentStatus: student.status,
      studentStatusLabel: statusLabel,
    }
  }

  const norm = (student.status || '').toLowerCase().trim()
  let specificMessage =
    'Seu acesso às aulas EAD e ao registro de progresso está suspenso devido à sua situação cadastral.'

  if (norm === 'trancado') {
    specificMessage =
      'Sua matrícula está atualmente com status TRANCADO. O acesso ao conteúdo das videoaulas e a marcação de aulas concluídas estão suspensos até a reativação da matrícula pela secretaria acadêmica.'
  } else if (norm === 'inativo') {
    specificMessage =
      'Sua matrícula consta como INATIVA no sistema. O acesso ao ambiente EAD está suspenso. Procure a secretaria acadêmica para regularizar seu vínculo.'
  } else if (norm === 'pre_matricula') {
    specificMessage =
      'Sua matrícula ainda está em fase de PRÉ-MATRÍCULA. Aguarde a validação dos documentos pela secretaria para liberação das aulas.'
  } else if (norm === 'concluido') {
    specificMessage =
      'Seu curso consta como CONCLUÍDO. O período letivo foi encerrado e não há novas videoaulas pendentes para conclusão.'
  }

  return {
    isEligibleToStudy: false,
    canToggleProgress: false,
    status: 'bloqueado_situacao_cadastral',
    reasonTitle: `Acesso ao EAD Suspenso (${statusLabel})`,
    reasonMessage: specificMessage,
    studentStatus: student.status,
    studentStatusLabel: statusLabel,
  }
}

/**
 * Valida se um curso EAD está ativo/disponível para estudo pelo aluno.
 * Cursos com status diferente de 'publicado' são considerados inativos para o aluno.
 */
export function isEadCourseActive(course?: EadCourse | null): boolean {
  if (!course) return false
  return (course.status || '').toLowerCase().trim() === 'publicado'
}

/**
 * Valida se o aluno tem autorização para o curso EAD específico:
 * 1. O aluno deve estar na lista enrolledStudentIds (ou sem restrição caso não haja enrolledStudentIds)
 * 2. O curso deve estar ativo (publicado)
 */
export function checkEadCourseAccess(
  course: EadCourse | null | undefined,
  studentId: string,
): {
  hasAccess: boolean
  isCourseActive: boolean
  isEnrolled: boolean
  errorMessage?: string
} {
  if (!course) {
    return {
      hasAccess: false,
      isCourseActive: false,
      isEnrolled: false,
      errorMessage: 'Curso EAD não encontrado ou inexistente.',
    }
  }

  const active = isEadCourseActive(course)
  if (!active) {
    return {
      hasAccess: false,
      isCourseActive: false,
      isEnrolled: false,
      errorMessage:
        'Curso indisponível no momento. A coordenação suspendeu temporariamente a exibição deste conteúdo.',
    }
  }

  const enrolledIds = course.enrolledStudentIds || []
  const isEnrolled = enrolledIds.length === 0 || enrolledIds.includes(studentId)

  if (!isEnrolled) {
    return {
      hasAccess: false,
      isCourseActive: true,
      isEnrolled: false,
      errorMessage:
        'Você não tem permissão para acessar este curso EAD. Conteúdo restrito aos alunos matriculados.',
    }
  }

  return {
    hasAccess: true,
    isCourseActive: true,
    isEnrolled: true,
  }
}
