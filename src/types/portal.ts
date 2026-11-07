export type UserRole =
  | 'root'
  | 'admin'
  | 'secretaria'
  | 'financeiro'
  | 'academico'
  | 'matricula'
  | 'coordenador'
  | 'professor'
  | 'aluno'

export interface UserAccount {
  id: string
  name: string
  email: string
  role: UserRole
  roleTitle: string
  department: string
  avatar?: string
  cpf?: string
  phone?: string
  status: 'ativo' | 'inativo' | 'bloqueado'
  createdAt: string
  lastAccess?: string
}

export type ModuleKey =
  | 'dashboard'
  | 'matriculas'
  | 'cursos'
  | 'financeiro'
  | 'usuarios'
  | 'manutencao'
  | 'lgpd'
  | 'diagnostico'

export interface ModulePermission {
  key: ModuleKey
  label: string
  description: string
  icon: string
  requiredRoles: UserRole[]
}

export interface StudentDocument {
  id: string
  name: string
  type: 'rg' | 'cpf' | 'historico' | 'diploma' | 'comprovante_residencia' | 'outro'
  fileUrl: string
  fileName: string
  uploadedAt: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  /** Arquivo selecionado no formulário, enviado ao banco no cadastro. */
  pendingFile?: File
}

export interface Student {
  id: string
  fullName: string
  cpf: string // pode conter formatação ou limpo
  cpfRaw: string // apenas dígitos
  email: string
  phone: string
  type: 'graduacao' | 'pos_graduacao'
  courseId: string
  courseName: string
  photoUrl: string
  birthDate: string
  address: {
    city: string
    state: string
    street: string
    zip: string
  }
  status: 'matriculado' | 'pre_matricula' | 'trancado' | 'concluido'
  enrolledAt: string
  documents: StudentDocument[]
  observations?: string
  /** Arquivo de foto selecionado no formulário, enviado ao banco no cadastro. */
  photoFile?: File
}

export interface Course {
  id: string
  code: string
  name: string
  level: 'graduacao' | 'pos_graduacao' | 'extensao'
  type: 'bacharelado' | 'licenciatura' | 'tecnologo' | 'especializacao' | 'mba'
  modality: 'presencial' | 'ead' | 'semipresencial'
  durationSemesters: number
  workloadHours: number
  coordinator: string
  status: 'ativo' | 'em_revisao' | 'trancado'
  lockedForEditing: boolean // trancado contra alteração indevida
  emecCode: string
  emecConcept: number // 1 a 5
  emecOrdinanceNumber: string // Portaria MEC nº XXX/Ano
  emecOrdinanceDate: string
  description: string
  monthlyFee: number
  vacancies: number
  enrolledCount: number
}

export interface Charge {
  id: string
  code: string
  studentId: string
  studentName: string
  studentCpf: string
  category:
    | 'mensalidade'
    | 'matricula'
    | 'rematricula'
    | 'taxa_diploma'
    | 'segunda_chamada'
    | 'outro'
  description: string
  amount: number
  dueDate: string
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  method?: 'pix' | 'cartao' | 'isencao'
  paidAt?: string
  pixCode?: string
  pixQrUrl?: string
  receiptNumber?: string
}

export interface PriceTableItem {
  id: string
  category: string
  level: 'graduacao' | 'pos_graduacao'
  standardMonthlyFee: number
  enrollmentFee: number
  lateFeePercentage: number
  updatedAt: string
  updatedBy: string
}

export interface PriceAuditLog {
  id: string
  timestamp: string
  userName: string
  userRole: string
  changeSummary: string
  previousValue: string
  newValue: string
}

export interface BillingException {
  id: string
  studentId: string
  studentName: string
  reason: string
  discountPercentage: number
  justification: string
  requestedBy: string
  approvedBy?: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  createdAt: string
}

export interface MaintenanceTicket {
  id: string
  title: string
  description: string
  location: string
  priority: 'baixa' | 'media' | 'alta' | 'urgente'
  status: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado'
  category: 'eletrica' | 'hidraulica' | 'ar_condicionado' | 'alvenaria' | 'ti_redes' | 'outro'
  reporterName: string
  reporterRole: string
  assignedTo?: string
  photoUrls: string[]
  createdAt: string
  resolvedAt?: string
  /** Arquivos de foto selecionados no formulário, enviados ao banco no cadastro. */
  photoFiles?: File[]
}

export interface LgpdRequest {
  id: string
  requesterName: string
  requesterCpf: string
  requesterEmail: string
  requestType: 'eliminacao' | 'acesso' | 'retificacao' | 'portabilidade'
  reason: string
  legalRetentionPeriodDays: number
  legalRetentionDeadline: string
  status: 'em_analise' | 'retido_legalmente' | 'executado' | 'negado'
  legalJustification: string
  createdAt: string
  dpoNotes?: string
}

export interface SystemDiagnostic {
  version: string
  gitCommit: string
  buildTime: string
  environment: string
  overallStatus: 'healthy' | 'degraded' | 'maintenance'
  pixGateway: {
    status: 'simulado_ativo' | 'online' | 'degradado'
    provider: string
    mockMode: boolean
    webhookStatus: string
  }
  databaseMigrations: {
    migrationVersion: string
    appliedCount: number
    pendingCount: number
    lastMigration: string
    status: 'up_to_date' | 'pending'
  }
  modulesStatus: {
    name: string
    status: 'ok' | 'aviso'
    latencyMs: number
  }[]
  roadmap: {
    version: string
    title: string
    status: 'concluido' | 'planejado' | 'em_desenvolvimento'
    items: string[]
  }[]
}
