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
  status: 'ativo' | 'inativo' | 'bloqueado'
  cpf?: string
  phone?: string
  avatar?: string
  createdAt?: string
  lastAccess?: string
  password?: string // Opcional no cadastro/seed demo
  studentId?: string // Vínculo explícito com cadastro de aluno (Student.id)
}
export type ModuleKey =
  | 'dashboard'
  | 'turmas'
  | 'alunos'
  | 'matriculas'
  | 'diplomas'
  | 'cursos'
  | 'ead'
  | 'biblioteca'
  | 'financeiro'
  | 'relatorios'
  | 'usuarios'
  | 'manutencao'
  | 'lgpd'
  | 'diagnostico'
  | 'minhas_notas'
  | 'portal_aluno'
  | 'professor_area'

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
  status: 'ativo' | 'inativo' | 'trancado' | 'matriculado' | 'pre_matricula' | 'concluido'
  enrolledAt: string
  documents: StudentDocument[]
  observations?: string
  /** Observações acadêmicas específicas do histórico escolar (editável por perfis autorizados). */
  transcriptNotes?: string
  /** Data/hora de criação do registro no banco (PocketBase created autodate). */
  createdAt?: string
  created?: string
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
  /** ID do usuário (coleção `users`) vinculado ao curso — vínculo professor↔curso por ID. */
  coordinatorId?: string
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
    | 'renegociacao'
    | 'rematricula'
    | 'taxa_segunda_via'
    | 'taxa_biblioteca'
    | 'taxa_material'
    | 'taxa_rematricula'
    | 'taxa_diploma'
    | 'taxa_trancamento'
    | 'taxa_avulsa'
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
  installments?: number
  cardLast4?: string
  cardBrand?: string
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

export type ExpenseCategory =
  | 'folha_pagamento'
  | 'infraestrutura'
  | 'marketing'
  | 'tecnologia'
  | 'impostos'
  | 'servicos_terceiros'
  | 'outros'

export type ExpenseStatus = 'pago' | 'pendente' | 'agendado' | 'cancelado'

export interface Expense {
  id: string
  description: string
  category: ExpenseCategory
  amount: number
  date: string // YYYY-MM-DD
  status: ExpenseStatus
  courseId?: string
  notes?: string
  createdAt?: string
}

export type GradeAssessmentType =
  | 'P1'
  | 'P2'
  | 'P3'
  | 'Trabalho'
  | 'Projeto'
  | 'Seminário'
  | 'Exame Final'
  | 'Outro'

export interface Grade {
  id: string
  studentId: string
  studentName?: string
  studentCpf?: string
  courseId?: string
  subject: string
  term?: string // ex: "2024.2"
  assessmentType?: string
  weight?: number // peso opcional (ex: 5)
  value: number // valor de 0 a 10
  date?: string // YYYY-MM-DD
  teacherId?: string
  teacherName?: string
  observations?: string
  createdAt?: string
  created?: string
  updated?: string
}
export type AttendanceStatus = 'presente' | 'falta' | 'falta_justificada'

export interface AttendanceRecord {
  id: string
  studentId: string
  studentName?: string
  studentCpf?: string
  courseId?: string
  subject: string
  term?: string
  date: string // YYYY-MM-DD
  status: AttendanceStatus
  hours: number // horas de aula
  teacherId?: string
  teacherName?: string
  justification?: string
  created?: string
  updated?: string
}

// Parâmetros acadêmicos institucionais
export const ACADEMIC_RULES = {
  MIN_PASSING_GRADE: 6.0,
  MIN_PASSING_ATTENDANCE_PERCENT: 75.0,
} as const

// Resumo consolidado por disciplina para um aluno
export interface SubjectAcademicSummary {
  subject: string
  term?: string
  grades: Grade[]
  attendance: AttendanceRecord[]
  averageGrade: number
  totalClasses: number
  presentsCount: number
  absencesCount: number
  justifiedAbsencesCount: number
  attendancePercent: number
  status: 'aprovado' | 'reprovado_nota' | 'reprovado_frequencia' | 'reprovado_ambos' | 'em_curso'
}

// --- Tipos para o Portal do Aluno ---
export type LessonStatus = 'nao_iniciado' | 'em_andamento' | 'concluido'

export interface LessonProgress {
  id: string
  studentId: string
  courseId: string
  moduleName: string
  lessonId: string
  lessonTitle: string
  durationMinutes: number
  status: LessonStatus
  completedAt?: string
  lastWatchedSeconds: number
  created?: string
  updated?: string
}

export type MaterialType = 'pdf' | 'slide' | 'video' | 'codigo' | 'planilha' | 'link' | 'outro'

export interface CourseMaterial {
  id: string
  courseId: string
  courseName?: string
  subject: string
  title: string
  description?: string
  type: MaterialType
  fileUrl?: string
  externalUrl?: string
  fileSize?: string
  weekOrModule?: string
  uploadedBy?: string
  created?: string
  updated?: string
}

export type CalendarEventType =
  | 'prova'
  | 'trabalho'
  | 'entrega'
  | 'aula_ao_vivo'
  | 'prazo'
  | 'feriado'
  | 'institucional'

export interface CalendarEvent {
  id: string
  courseId?: string
  studentId?: string
  title: string
  description?: string
  subject?: string
  type: CalendarEventType
  startDate: string
  endDate?: string
  locationOrLink?: string
  weight?: string
  created?: string
  updated?: string
}

export type NotificationType = 'academico' | 'financeiro' | 'aviso' | 'urgente' | 'sistema'

export interface StudentNotification {
  id: string
  studentId: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  actionUrl?: string
  readAt?: string
  created?: string
  updated?: string
}

export type StudentPortalTab =
  | 'inicio'
  | 'perfil'
  | 'cursos'
  | 'materiais'
  | 'calendario'
  | 'notificacoes'
  | 'minhas_notas'
  | 'certificados'
  | 'biblioteca'
  | 'cobrancas'
  | 'suporte'

export type AcademicDocType = 'certificado' | 'diploma'

export interface Certificate {
  id: string
  studentId: string
  studentName: string
  studentCpf?: string
  courseId: string
  courseName: string
  courseLevel?: string
  workloadHours: number
  issueDate: string // YYYY-MM-DD
  verificationCode: string // ex: CERT-XXXX-XXXX ou DIPL-XXXX-XXXX
  issuedBy: string
  issuedByUserId?: string
  averageGrade?: number
  attendancePercent?: number
  status: 'ativo' | 'revogado' | 'substituido'
  docType?: AcademicDocType // 'certificado' ou 'diploma'
  graduationDate?: string // Data de colação de grau (específico de diploma)
  revokedAt?: string
  revokedBy?: string
  revokedByUserId?: string
  revocationReason?: string
  created?: string
  updated?: string
}

export type SupportCategory =
  | 'academico'
  | 'secretaria'
  | 'financeiro'
  | 'tecnico'
  | 'diploma_certificados'
  | 'ti'
  | 'outro'
  | 'outros'

export type SupportPriority = 'baixa' | 'media' | 'alta' | 'urgente'
export type SupportStatus =
  | 'aberto'
  | 'em_analise'
  | 'em_atendimento'
  | 'respondido'
  | 'resolvido'
  | 'fechado'

export interface StudentSupportTicket {
  id: string
  studentId: string
  studentName?: string
  studentEmail?: string
  courseName?: string
  protocol: string
  subject: string
  category: SupportCategory
  priority: SupportPriority
  status: SupportStatus
  message: string
  description?: string
  response?: string
  respondedBy?: string
  respondedAt?: string
  resolvedAt?: string
  created?: string
  updated?: string
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

export type EadVideoProvider = 'youtube' | 'vimeo' | 'mp4' | 'outro'

export interface EadLesson {
  id: string
  eadCourseId: string
  title: string
  description?: string
  moduleName?: string
  orderIndex: number
  videoUrl: string
  videoProvider: EadVideoProvider
  videoEmbedId?: string
  durationMinutes: number
  isOptional?: boolean
  created?: string
  updated?: string
}

export interface EadCourse {
  id: string
  title: string
  description: string
  workloadHours: number
  catalogCourseId?: string
  catalogCourseName?: string
  thumbnail?: string
  status: 'publicado' | 'rascunho' | 'arquivado'
  instructorId?: string
  instructorName?: string
  enrolledStudentIds: string[]
  created?: string
  updated?: string
}

export interface LibraryBook {
  id: string
  title: string
  author: string
  isbn?: string
  publisher?: string
  year?: number
  category?: string
  description?: string
  totalCopies: number
  availableCopies: number
  created?: string
  updated?: string
}

export type LibraryLoanStatus = 'ativo' | 'devolvido' | 'atrasado'

export interface LibraryLoan {
  id: string
  bookId: string
  bookTitle?: string
  bookAuthor?: string
  studentId: string
  studentName?: string
  studentCpf?: string
  loanDate: string // YYYY-MM-DD
  dueDate: string // YYYY-MM-DD
  returnedAt?: string // YYYY-MM-DD
  renewals: number
  renewalHistory?: string[] // lista de datas/timestamps ISO das renovações efetuadas
  notes?: string
  status: LibraryLoanStatus
  lastOverdueNotifiedAt?: string // timestamp ISO do último envio de e-mail de atraso (anti-spam)
  created?: string
  updated?: string
}

export interface LibrarySettings {
  id?: string
  maxRenewals: number // limite máximo de renovações por empréstimo (padrão 2)
  renewalDays: number // dias concedidos a cada renovação (padrão 7)
  libraryEmail?: string // e-mail oficial da biblioteca que recebe cópia dos avisos de atraso
  created?: string
  updated?: string
}

export type DayOfWeek = 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado'

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
}

export const DAY_OF_WEEK_SHORT: Record<DayOfWeek, string> = {
  domingo: 'Dom',
  segunda: 'Seg',
  terca: 'Ter',
  quarta: 'Qua',
  quinta: 'Qui',
  sexta: 'Sex',
  sabado: 'Sáb',
}

export type ClassStatus = 'planejada' | 'em_andamento' | 'encerrada'

export interface ClassSchedule {
  id: string
  classId: string
  dayOfWeek: DayOfWeek
  startTime: string // "HH:mm", ex: "19:15"
  endTime: string // "HH:mm", ex: "22:30"
  room?: string // sala, lab ou link virtual
  created?: string
  updated?: string
}

export interface ClassItem {
  id: string
  name: string
  courseId: string
  courseName?: string
  professorUserId: string
  professorName?: string
  term: string // ex: "2025.1", "2025.2"
  capacity: number
  status: ClassStatus
  studentIds: string[]
  notes?: string
  schedules?: ClassSchedule[]
  created?: string
  updated?: string
}
