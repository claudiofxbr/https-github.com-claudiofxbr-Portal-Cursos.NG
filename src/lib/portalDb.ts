// Camada de acesso ao PocketBase (Skip Cloud) para o PortalCursos.NG.
// Toda leitura/escrita de dados do portal passa por aqui: o PortalContext
// consome este módulo, e os módulos de UI continuam usando apenas o contexto.
import pb from '@/lib/pocketbase/client'
import {
  UserAccount,
  Student,
  Course,
  Charge,
  PriceTableItem,
  PriceAuditLog,
  BillingException,
  MaintenanceTicket,
  LgpdRequest,
  Expense,
  Grade,
  AttendanceRecord,
  LessonProgress,
  CourseMaterial,
  CalendarEvent,
  StudentNotification,
  StudentSupportTicket,
  Certificate,
  EadCourse,
  EadLesson,
  LibraryBook,
  LibraryLoan,
  LibraryLoanStatus,
  LibrarySettings,
} from '@/types/portal'
import {
  DEMO_ACCOUNTS,
  INITIAL_BILLING_EXCEPTIONS,
  INITIAL_CHARGES,
  INITIAL_COURSES,
  INITIAL_PRICE_AUDIT_LOGS,
  INITIAL_PRICE_TABLE,
  INITIAL_TICKETS,
  INITIAL_LGPD_REQUESTS,
  INITIAL_EXPENSES,
  INITIAL_STUDENTS,
  INITIAL_GRADES,
  INITIAL_ATTENDANCE,
} from '@/data/portalMockData'
export const COLLECTIONS = {
  students: 'students',
  courses: 'courses',
  charges: 'charges',
  prices: 'price_table_items',
  priceLogs: 'price_audit_logs',
  exceptions: 'billing_exceptions',
  tickets: 'maintenance_tickets',
  lgpd: 'lgpd_requests',
  expenses: 'expenses',
  grades: 'grades',
  attendance: 'attendance',
  lessonProgress: 'lesson_progress',
  courseMaterials: 'course_materials',
  calendarEvents: 'calendar_events',
  studentNotifications: 'student_notifications',
  studentSupportTickets: 'student_support_tickets',
  certificates: 'certificates',
  eadCourses: 'ead_courses',
  eadLessons: 'ead_lessons',
  libraryBooks: 'library_books',
  libraryLoans: 'library_loans',
  librarySettings: 'library_settings',
  appUsers: 'app_users',
  users: 'users',
} as const

// Conta compartilhada de serviço usada como fallback apenas quando não há
// usuário real autenticado no PocketBase (ex.: boot inicial antes do login).
const SERVICE_AUTH = {
  identity: 'portal@portalcursos.ng',
  password: 'PortalCursos#2025',
}

// Senha padrão dos 9 usuários demo na coleção users do PocketBase
export const DEMO_USER_PASSWORD = 'Portal#2025'

// URL pública de um arquivo armazenado no PocketBase.
export function pbFileUrl(collection: string, recordId: string, filename: string): string {
  const base = pb.baseUrl.replace(/\/$/, '')
  if (!filename) return ''
  return `${base}/api/files/${collection}/${recordId}/${encodeURIComponent(filename)}`
}

async function safeList<T>(run: () => Promise<T[]>, fallback: T[]): Promise<T[]> {
  try {
    return await run()
  } catch (err) {
    console.warn('[portalDb] falha ao carregar dados do banco, usando fallback local:', err)
    return fallback
  }
}

// ---------- auth ----------

let serviceAuthPromise: Promise<void> | null = null

// Garante que o cliente PocketBase tenha um token válido.
// Se um usuário já estiver autenticado na sessão real (pb.authStore.isValid),
// reutiliza essa sessão real diretamente. Caso contrário, autentica temporariamente
// com a conta de serviço compartilhada para viabilizar as leituras iniciais.
export async function ensureAuth(): Promise<void> {
  if (pb.authStore.isValid && pb.authStore.record) {
    return
  }

  if (!serviceAuthPromise) {
    serviceAuthPromise = pb
      .collection('users')
      .authWithPassword(SERVICE_AUTH.identity, SERVICE_AUTH.password)
      .then(() => undefined)
      .catch((err) => {
        serviceAuthPromise = null
        throw err
      })
  }
  return serviceAuthPromise
}

// Realiza login real por usuário contra a coleção `users` do PocketBase
export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ user: UserAccount; token: string }> {
  // Limpa promessa de conta de serviço ao fazer login real
  serviceAuthPromise = null

  const authData = await pb
    .collection('users')
    .authWithPassword(email.trim().toLowerCase(), password)
  const rec = authData.record as unknown as AnyRec
  const user = mapAuthUser(rec)
  return { user, token: authData.token }
}

// Encerra sessão real no PocketBase
export function logoutAuth(): void {
  pb.authStore.clear()
  serviceAuthPromise = null
}

// Solicita e-mail de redefinição de senha através do PocketBase Skip Cloud
export async function requestPasswordReset(
  email: string,
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const clean = email.trim().toLowerCase()
    await pb.collection('users').requestPasswordReset(clean)
    return { success: true }
  } catch (err) {
    // PocketBase retorna sucesso ou erro caso algo falhe na comunicação
    console.warn('[portalDb] requestPasswordReset:', err)
    return { success: false, error: err }
  }
}

// Confirma redefinição de senha com token recebido no link de e-mail
export async function confirmPasswordReset(
  token: string,
  password: string,
  passwordConfirm?: string,
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const confirm = passwordConfirm || password
    await pb.collection('users').confirmPasswordReset(token, password, confirm)
    return { success: true }
  } catch (err) {
    console.warn('[portalDb] confirmPasswordReset:', err)
    return { success: false, error: err }
  }
}

// Converte registro de autenticação PocketBase (users) para UserAccount
export function mapAuthUser(rec: AnyRec): UserAccount {
  return {
    id: str(rec.id),
    name: str(rec.name) || (rec.email ? str(rec.email).split('@')[0] : 'Usuário'),
    email: str(rec.email),
    role: (str(rec.role) || 'aluno') as UserAccount['role'],
    roleTitle: str(rec.roleTitle) || 'Membro Institucional',
    department: str(rec.department) || 'Campus Central',
    status: (str(rec.status) || 'ativo') as UserAccount['status'],
    cpf: str(rec.cpf),
    phone: str(rec.phone),
    avatar:
      str(rec.avatarUrl) ||
      (typeof rec.avatar === 'string' && rec.avatar
        ? pbFileUrl('users', str(rec.id), rec.avatar)
        : undefined),
    createdAt:
      str(rec.createdAtText) ||
      str(rec.created).split('T')[0] ||
      new Date().toISOString().split('T')[0],
    lastAccess: str(rec.lastAccessText) || 'Recente',
    studentId: str(rec.studentId) || undefined,
  }
}

// ---------- seed (executa uma vez, no primeiro load contra banco vazio) ----------

let seedPromise: Promise<void> | null = null

// Popula o banco com os dados de demonstração iniciais se as coleções
// estiverem vazias. Idempotente: cada coleção só é semeada se estiver vazia.
// Os IDs dos registros seed são os mesmos da demo, para que cobranças e
// exceções continuem apontando para os alunos e itens corretos.
export function seedIfEmpty(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const seed = async <T extends { id: string }>(
        collection: string,
        rows: T[],
        map: (row: T) => Record<string, unknown>,
      ) => {
        try {
          const existing = await pb.collection(collection).getList(1, 1)
          if (existing.totalItems > 0) return
          for (const row of rows) {
            try {
              await pb.collection(collection).create(map(row))
            } catch (createErr) {
              console.warn(`[portalDb] seed item in ${collection}:`, createErr)
            }
          }
        } catch (e) {
          console.warn(`[portalDb] seed ${collection}:`, e)
        }
      }

      await Promise.all([
        seed(COLLECTIONS.appUsers, DEMO_ACCOUNTS, (u) => ({
          name: u.name,
          email: u.email,
          role: u.role,
          roleTitle: u.roleTitle,
          department: u.department,
          status: u.status,
          cpf: u.cpf,
          phone: u.phone,
          avatar: u.avatar,
          createdAt: u.createdAt,
          lastAccess: u.lastAccess,
        })),
        seed(COLLECTIONS.students, INITIAL_STUDENTS, (s) => ({
          fullName: s.fullName,
          cpf: s.cpf,
          cpfRaw: s.cpfRaw,
          email: s.email,
          phone: s.phone,
          studentType: s.type,
          courseId: s.courseId,
          courseName: s.courseName,
          photoUrl: s.photoUrl,
          birthDate: s.birthDate,
          street: s.address.street,
          city: s.address.city,
          state: s.address.state,
          zip: s.address.zip,
          status: s.status,
          enrolledAt: s.enrolledAt,
          documents: s.documents,
          observations: s.observations || '',
        })),
        seed(COLLECTIONS.courses, INITIAL_COURSES, (c) => ({
          code: c.code,
          name: c.name,
          level: c.level,
          courseType: c.type,
          modality: c.modality,
          durationSemesters: c.durationSemesters,
          workloadHours: c.workloadHours,
          coordinator: c.coordinator,
          coordinatorId: c.coordinatorId || '',
          status: c.status,
          lockedForEditing: c.lockedForEditing,
          emecCode: c.emecCode,
          emecConcept: c.emecConcept,
          emecOrdinanceNumber: c.emecOrdinanceNumber,
          emecOrdinanceDate: c.emecOrdinanceDate,
          description: c.description,
          monthlyFee: c.monthlyFee,
          vacancies: c.vacancies,
          enrolledCount: c.enrolledCount,
        })),
        seed(COLLECTIONS.charges, INITIAL_CHARGES, (c) => ({
          code: c.code,
          studentId: c.studentId,
          studentName: c.studentName,
          studentCpf: c.studentCpf,
          category: c.category,
          description: c.description,
          amount: c.amount,
          dueDate: c.dueDate,
          status: c.status,
          method: c.method || '',
          paidAt: c.paidAt || '',
          pixCode: c.pixCode || '',
          pixQrUrl: c.pixQrUrl || '',
          receiptNumber: c.receiptNumber || '',
        })),
        seed(COLLECTIONS.prices, INITIAL_PRICE_TABLE, (p) => ({
          category: p.category,
          level: p.level,
          standardMonthlyFee: p.standardMonthlyFee,
          enrollmentFee: p.enrollmentFee,
          lateFeePercentage: p.lateFeePercentage,
          updatedAt: p.updatedAt,
          updatedBy: p.updatedBy,
        })),
        seed(COLLECTIONS.priceLogs, INITIAL_PRICE_AUDIT_LOGS, (l) => ({
          timestamp: l.timestamp,
          userName: l.userName,
          userRole: l.userRole,
          changeSummary: l.changeSummary,
          previousValue: l.previousValue,
          newValue: l.newValue,
        })),
        seed(COLLECTIONS.exceptions, INITIAL_BILLING_EXCEPTIONS, (x) => ({
          studentId: x.studentId,
          studentName: x.studentName,
          reason: x.reason,
          discountPercentage: x.discountPercentage,
          justification: x.justification,
          requestedBy: x.requestedBy,
          approvedBy: x.approvedBy || '',
          status: x.status,
          createdAt: x.createdAt,
        })),
        seed(COLLECTIONS.tickets, INITIAL_TICKETS, (t) => ({
          title: t.title,
          description: t.description,
          location: t.location,
          priority: t.priority,
          status: t.status,
          category: t.category,
          reporterName: t.reporterName,
          reporterRole: t.reporterRole,
          assignedTo: t.assignedTo || '',
          photoUrls: t.photoUrls,
          createdAt: t.createdAt,
          resolvedAt: t.resolvedAt || '',
        })),
        seed(COLLECTIONS.lgpd, INITIAL_LGPD_REQUESTS, (r) => ({
          requesterName: r.requesterName,
          requesterCpf: r.requesterCpf,
          requesterEmail: r.requesterEmail,
          requestType: r.requestType,
          reason: r.reason,
          legalRetentionPeriodDays: r.legalRetentionPeriodDays,
          legalRetentionDeadline: r.legalRetentionDeadline,
          status: r.status,
          legalJustification: r.legalJustification,
          createdAt: r.createdAt,
          dpoNotes: r.dpoNotes || '',
        })),
      ])
    })()
  }
  return seedPromise
}

// ---------- mapeamentos registro PocketBase -> tipo do app ----------

export type AnyRec = Record<string, unknown>

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback)

function mapStudent(rec: AnyRec): Student {
  const docs = Array.isArray(rec.documents) ? (rec.documents as Student['documents']) : []
  const photoFile = str(rec.photo)
  const docFiles = Array.isArray(rec.docFiles) ? (rec.docFiles as string[]) : []
  return {
    id: str(rec.id),
    fullName: str(rec.fullName),
    cpf: str(rec.cpf),
    cpfRaw: str(rec.cpfRaw) || str(rec.cpf).replace(/\D/g, ''),
    email: str(rec.email),
    phone: str(rec.phone),
    type: str(rec.studentType, 'graduacao') as Student['type'],
    courseId: str(rec.courseId),
    courseName: str(rec.courseName),
    photoUrl: photoFile ? pbFileUrl('students', str(rec.id), photoFile) : str(rec.photoUrl),
    birthDate: str(rec.birthDate),
    address: {
      city: str(rec.city),
      state: str(rec.state),
      street: str(rec.street),
      zip: str(rec.zip),
    },
    status: str(rec.status, 'matriculado') as Student['status'],
    enrolledAt: str(rec.enrolledAt),
    // Documentos com arquivo real recebem a URL pública do backend.
    documents: docs.map((d) => {
      const match = docFiles.find((f) => f === d.fileName || f.startsWith(d.id))
      return match ? { ...d, fileUrl: pbFileUrl('students', str(rec.id), match) } : d
    }),
    observations: str(rec.observations) || undefined,
    createdAt: str(rec.created) || str(rec.createdAt) || str(rec.enrolledAt),
    created: str(rec.created),
  }
}

function mapCourse(rec: AnyRec): Course {
  return {
    id: str(rec.id),
    code: str(rec.code),
    name: str(rec.name),
    level: str(rec.level, 'graduacao') as Course['level'],
    type: str(rec.courseType, 'bacharelado') as Course['type'],
    modality: str(rec.modality, 'presencial') as Course['modality'],
    durationSemesters: num(rec.durationSemesters),
    workloadHours: num(rec.workloadHours),
    coordinator: str(rec.coordinator),
    coordinatorId: str(rec.coordinatorId) || undefined,
    status: str(rec.status, 'ativo') as Course['status'],
    lockedForEditing: bool(rec.lockedForEditing),
    emecCode: str(rec.emecCode),
    emecConcept: num(rec.emecConcept),
    emecOrdinanceNumber: str(rec.emecOrdinanceNumber),
    emecOrdinanceDate: str(rec.emecOrdinanceDate),
    description: str(rec.description),
    monthlyFee: num(rec.monthlyFee),
    vacancies: num(rec.vacancies),
    enrolledCount: num(rec.enrolledCount),
  }
}

function mapCharge(rec: AnyRec): Charge {
  return {
    id: str(rec.id),
    code: str(rec.code),
    studentId: str(rec.studentId),
    studentName: str(rec.studentName),
    studentCpf: str(rec.studentCpf),
    category: str(rec.category, 'mensalidade') as Charge['category'],
    description: str(rec.description),
    amount: num(rec.amount),
    dueDate: str(rec.dueDate),
    status: str(rec.status, 'pendente') as Charge['status'],
    method: str(rec.method) ? (str(rec.method) as Charge['method']) : undefined,
    paidAt: str(rec.paidAt) || undefined,
    pixCode: str(rec.pixCode) || undefined,
    pixQrUrl: str(rec.pixQrUrl) || undefined,
    receiptNumber: str(rec.receiptNumber) || undefined,
    installments: num(rec.installments) > 0 ? num(rec.installments) : undefined,
    cardLast4: str(rec.cardLast4) || undefined,
    cardBrand: str(rec.cardBrand) || undefined,
  }
}

function mapPriceItem(rec: AnyRec): PriceTableItem {
  return {
    id: str(rec.id),
    category: str(rec.category),
    level: str(rec.level, 'graduacao') as PriceTableItem['level'],
    standardMonthlyFee: num(rec.standardMonthlyFee),
    enrollmentFee: num(rec.enrollmentFee),
    lateFeePercentage: num(rec.lateFeePercentage),
    updatedAt: str(rec.updatedAt),
    updatedBy: str(rec.updatedBy),
  }
}

function mapPriceLog(rec: AnyRec): PriceAuditLog {
  return {
    id: str(rec.id),
    timestamp: str(rec.timestamp),
    userName: str(rec.userName),
    userRole: str(rec.userRole),
    changeSummary: str(rec.changeSummary),
    previousValue: str(rec.previousValue),
    newValue: str(rec.newValue),
  }
}

function mapException(rec: AnyRec): BillingException {
  return {
    id: str(rec.id),
    studentId: str(rec.studentId),
    studentName: str(rec.studentName),
    reason: str(rec.reason),
    discountPercentage: num(rec.discountPercentage),
    justification: str(rec.justification),
    requestedBy: str(rec.requestedBy),
    approvedBy: str(rec.approvedBy) || undefined,
    status: str(rec.status, 'pendente') as BillingException['status'],
    createdAt: str(rec.createdAt),
  }
}

function mapTicket(rec: AnyRec): MaintenanceTicket {
  const files = Array.isArray(rec.photo) ? (rec.photo as string[]) : []
  const urlsFromFiles = files
    .filter((f) => !!f)
    .map((f) => pbFileUrl('maintenance_tickets', str(rec.id), f))
  const legacy = Array.isArray(rec.photoUrls)
    ? ((rec.photoUrls as unknown[]).filter((u) => typeof u === 'string') as string[])
    : []
  return {
    id: str(rec.id),
    title: str(rec.title),
    description: str(rec.description),
    location: str(rec.location),
    priority: str(rec.priority, 'media') as MaintenanceTicket['priority'],
    status: str(rec.status, 'aberto') as MaintenanceTicket['status'],
    category: str(rec.category, 'outro') as MaintenanceTicket['category'],
    reporterName: str(rec.reporterName),
    reporterRole: str(rec.reporterRole),
    assignedTo: str(rec.assignedTo) || undefined,
    photoUrls: urlsFromFiles.length > 0 ? urlsFromFiles : legacy,
    createdAt: str(rec.createdAt),
    resolvedAt: str(rec.resolvedAt) || undefined,
  }
}

function mapLgpd(rec: AnyRec): LgpdRequest {
  return {
    id: str(rec.id),
    requesterName: str(rec.requesterName),
    requesterCpf: str(rec.requesterCpf),
    requesterEmail: str(rec.requesterEmail),
    requestType: str(rec.requestType, 'acesso') as LgpdRequest['requestType'],
    reason: str(rec.reason),
    legalRetentionPeriodDays: num(rec.legalRetentionPeriodDays),
    legalRetentionDeadline: str(rec.legalRetentionDeadline),
    status: str(rec.status, 'em_analise') as LgpdRequest['status'],
    legalJustification: str(rec.legalJustification),
    createdAt: str(rec.createdAt),
    dpoNotes: str(rec.dpoNotes) || undefined,
  }
}

function mapExpense(rec: AnyRec): Expense {
  return {
    id: str(rec.id),
    description: str(rec.description),
    category: str(rec.category, 'outros') as Expense['category'],
    amount: num(rec.amount),
    date: str(rec.date),
    status: str(rec.status, 'pago') as Expense['status'],
    courseId: str(rec.courseId) || undefined,
    notes: str(rec.notes) || undefined,
    createdAt: str(rec.created || rec.createdAt),
  }
}

function mapGrade(rec: AnyRec): Grade {
  return {
    id: str(rec.id),
    studentId: str(rec.studentId),
    studentName: str(rec.studentName) || undefined,
    studentCpf: str(rec.studentCpf) || undefined,
    courseId: str(rec.courseId) || undefined,
    subject: str(rec.subject),
    term: str(rec.term) || undefined,
    assessmentType: str(rec.assessmentType) || undefined,
    weight: typeof rec.weight === 'number' ? rec.weight : undefined,
    value: num(rec.value),
    date: str(rec.date) || undefined,
    teacherId: str(rec.teacherId) || undefined,
    teacherName: str(rec.teacherName) || undefined,
    observations: str(rec.observations) || undefined,
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

function mapAttendance(rec: AnyRec): AttendanceRecord {
  return {
    id: str(rec.id),
    studentId: str(rec.studentId),
    studentName: str(rec.studentName) || undefined,
    studentCpf: str(rec.studentCpf) || undefined,
    courseId: str(rec.courseId) || undefined,
    subject: str(rec.subject),
    term: str(rec.term) || undefined,
    date: str(rec.date),
    status: str(rec.status, 'presente') as AttendanceRecord['status'],
    hours: num(rec.hours, 2),
    teacherId: str(rec.teacherId) || undefined,
    teacherName: str(rec.teacherName) || undefined,
    justification: str(rec.justification) || undefined,
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

function mapAppUser(rec: AnyRec): UserAccount {
  return {
    id: str(rec.id),
    name: str(rec.name),
    email: str(rec.email),
    role: str(rec.role, 'aluno') as UserAccount['role'],
    roleTitle: str(rec.roleTitle),
    department: str(rec.department),
    status: str(rec.status, 'ativo') as UserAccount['status'],
    cpf: str(rec.cpf),
    phone: str(rec.phone),
    avatar: str(rec.avatar),
    createdAt: str(rec.createdAt),
    lastAccess: str(rec.lastAccess),
    studentId: str(rec.studentId) || undefined,
  }
}

export function mapLessonProgress(rec: AnyRec): LessonProgress {
  return {
    id: str(rec.id),
    studentId: str(rec.studentId),
    courseId: str(rec.courseId),
    moduleName: str(rec.moduleName),
    lessonId: str(rec.lessonId),
    lessonTitle: str(rec.lessonTitle),
    durationMinutes: num(rec.durationMinutes, 30),
    status: str(rec.status, 'nao_iniciado') as LessonProgress['status'],
    completedAt: str(rec.completedAt) || undefined,
    lastWatchedSeconds: num(rec.lastWatchedSeconds, 0),
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function mapCourseMaterial(rec: AnyRec): CourseMaterial {
  return {
    id: str(rec.id),
    courseId: str(rec.courseId),
    courseName: str(rec.courseName) || undefined,
    subject: str(rec.subject),
    title: str(rec.title),
    description: str(rec.description) || undefined,
    type: str(rec.type, 'pdf') as CourseMaterial['type'],
    fileUrl: str(rec.fileUrl) || undefined,
    externalUrl: str(rec.externalUrl) || undefined,
    fileSize: str(rec.fileSize) || undefined,
    weekOrModule: str(rec.weekOrModule) || undefined,
    uploadedBy: str(rec.uploadedBy) || undefined,
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function mapCalendarEvent(rec: AnyRec): CalendarEvent {
  return {
    id: str(rec.id),
    courseId: str(rec.courseId) || undefined,
    studentId: str(rec.studentId) || undefined,
    title: str(rec.title),
    description: str(rec.description) || undefined,
    subject: str(rec.subject) || undefined,
    type: str(rec.type, 'institucional') as CalendarEvent['type'],
    startDate: str(rec.startDate),
    endDate: str(rec.endDate) || undefined,
    locationOrLink: str(rec.locationOrLink) || undefined,
    weight: str(rec.weight) || undefined,
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function mapStudentNotification(rec: AnyRec): StudentNotification {
  return {
    id: str(rec.id),
    studentId: str(rec.studentId),
    title: str(rec.title),
    message: str(rec.message),
    type: str(rec.type, 'aviso') as StudentNotification['type'],
    read: Boolean(rec.read),
    actionUrl: str(rec.actionUrl) || undefined,
    readAt: str(rec.readAt) || undefined,
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function mapStudentSupportTicket(rec: AnyRec): StudentSupportTicket {
  return {
    id: str(rec.id),
    studentId: str(rec.studentId),
    studentName: str(rec.studentName) || undefined,
    studentEmail: str(rec.studentEmail) || undefined,
    courseName: str(rec.courseName) || undefined,
    protocol: str(rec.protocol),
    subject: str(rec.subject),
    category: str(rec.category, 'outro') as StudentSupportTicket['category'],
    priority: str(rec.priority, 'media') as StudentSupportTicket['priority'],
    status: str(rec.status, 'aberto') as StudentSupportTicket['status'],
    message: str(rec.message),
    response: str(rec.response) || undefined,
    respondedBy: str(rec.respondedBy) || undefined,
    respondedAt: str(rec.respondedAt) || undefined,
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function mapCertificate(rec: AnyRec): Certificate {
  const statusStr = str(rec.status, 'ativo')
  const validStatus: 'ativo' | 'revogado' | 'substituido' =
    statusStr === 'revogado' || statusStr === 'substituido' ? statusStr : 'ativo'

  return {
    id: str(rec.id),
    studentId: str(rec.studentId),
    studentName: str(rec.studentName),
    studentCpf: str(rec.studentCpf) || undefined,
    courseId: str(rec.courseId),
    courseName: str(rec.courseName),
    courseLevel: str(rec.courseLevel) || undefined,
    workloadHours: num(rec.workloadHours, 0),
    issueDate: str(rec.issueDate) || new Date().toISOString().slice(0, 10),
    verificationCode: str(rec.verificationCode),
    issuedBy: str(rec.issuedBy),
    issuedByUserId: str(rec.issuedByUserId) || undefined,
    averageGrade: typeof rec.averageGrade === 'number' ? rec.averageGrade : undefined,
    attendancePercent:
      typeof rec.attendancePercent === 'number' ? rec.attendancePercent : undefined,
    status: validStatus,
    revokedAt: str(rec.revokedAt) || undefined,
    revokedBy: str(rec.revokedBy) || undefined,
    revokedByUserId: str(rec.revokedByUserId) || undefined,
    revocationReason: str(rec.revocationReason) || undefined,
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function parseVideoUrl(rawUrl: string): {
  provider: 'youtube' | 'vimeo' | 'mp4' | 'outro'
  embedId: string
  normalizedEmbedUrl?: string
} {
  const url = (rawUrl || '').trim()
  if (!url) return { provider: 'outro', embedId: '' }

  // YouTube matchers:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  )
  if (ytMatch && ytMatch[1]) {
    const embedId = ytMatch[1]
    return {
      provider: 'youtube',
      embedId,
      normalizedEmbedUrl: `https://www.youtube.com/embed/${embedId}?rel=0`,
    }
  }

  // Vimeo matcher:
  // - https://vimeo.com/123456789
  // - https://player.vimeo.com/video/123456789
  const vimeoMatch = url.match(
    /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|)(\d+))/i,
  )
  if (vimeoMatch && vimeoMatch[1]) {
    const embedId = vimeoMatch[1]
    return {
      provider: 'vimeo',
      embedId,
      normalizedEmbedUrl: `https://player.vimeo.com/video/${embedId}`,
    }
  }

  // MP4 direto:
  if (/\.mp4(\?.*)?$/i.test(url)) {
    return {
      provider: 'mp4',
      embedId: url,
      normalizedEmbedUrl: url,
    }
  }

  return {
    provider: 'outro',
    embedId: url,
    normalizedEmbedUrl: url,
  }
}

export function mapEadCourse(rec: AnyRec): EadCourse {
  let enrolled: string[] = []
  if (Array.isArray(rec.enrolledStudentIds)) {
    enrolled = rec.enrolledStudentIds.map(String)
  } else if (typeof rec.enrolledStudentIds === 'string') {
    try {
      const parsed = JSON.parse(rec.enrolledStudentIds)
      if (Array.isArray(parsed)) enrolled = parsed.map(String)
    } catch {
      enrolled = []
    }
  }

  return {
    id: str(rec.id),
    title: str(rec.title),
    description: str(rec.description),
    workloadHours: num(rec.workloadHours, 20),
    catalogCourseId: str(rec.catalogCourseId) || undefined,
    catalogCourseName: str(rec.catalogCourseName) || undefined,
    thumbnail: str(rec.thumbnail) || undefined,
    status: (str(rec.status, 'publicado') as EadCourse['status']) || 'publicado',
    instructorId: str(rec.instructorId) || undefined,
    instructorName: str(rec.instructorName) || undefined,
    enrolledStudentIds: enrolled,
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function mapEadLesson(rec: AnyRec): EadLesson {
  const provider = str(rec.videoProvider, 'youtube') as EadLesson['videoProvider']
  return {
    id: str(rec.id),
    eadCourseId: str(rec.eadCourseId),
    title: str(rec.title),
    description: str(rec.description) || undefined,
    moduleName: str(rec.moduleName) || undefined,
    orderIndex: num(rec.orderIndex, 1),
    videoUrl: str(rec.videoUrl),
    videoProvider: provider,
    videoEmbedId: str(rec.videoEmbedId) || undefined,
    durationMinutes: num(rec.durationMinutes, 15),
    isOptional: Boolean(rec.isOptional),
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function computeLoanStatus(dueDateStr: string, returnedAtStr?: string): LibraryLoanStatus {
  if (returnedAtStr && returnedAtStr.trim().length > 0) {
    return 'devolvido'
  }
  const todayIso = new Date().toISOString().slice(0, 10)
  if (dueDateStr && dueDateStr < todayIso) {
    return 'atrasado'
  }
  return 'ativo'
}

export function mapLibraryBook(rec: AnyRec): LibraryBook {
  const total = num(rec.totalCopies, 1)
  return {
    id: str(rec.id),
    title: str(rec.title),
    author: str(rec.author),
    isbn: str(rec.isbn) || undefined,
    publisher: str(rec.publisher) || undefined,
    year: rec.year !== undefined && rec.year !== null ? num(rec.year) : undefined,
    category: str(rec.category) || undefined,
    description: str(rec.description) || undefined,
    totalCopies: total,
    availableCopies: total, // recalculado dinamicamente com base nos empréstimos ativos
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function mapLibraryLoan(rec: AnyRec): LibraryLoan {
  const due = str(rec.dueDate)
  const ret = str(rec.returnedAt) || undefined
  let renewalHistory: string[] = []
  if (Array.isArray(rec.renewalHistory)) {
    renewalHistory = rec.renewalHistory.map(String)
  } else if (typeof rec.renewalHistory === 'string' && rec.renewalHistory.trim().length > 0) {
    try {
      const parsed = JSON.parse(rec.renewalHistory)
      if (Array.isArray(parsed)) renewalHistory = parsed.map(String)
    } catch {
      renewalHistory = []
    }
  }

  return {
    id: str(rec.id),
    bookId: str(rec.bookId),
    bookTitle: str(rec.bookTitle) || undefined,
    bookAuthor: str(rec.bookAuthor) || undefined,
    studentId: str(rec.studentId),
    studentName: str(rec.studentName) || undefined,
    studentCpf: str(rec.studentCpf) || undefined,
    loanDate: str(rec.loanDate),
    dueDate: due,
    returnedAt: ret,
    renewals: num(rec.renewals, 0),
    renewalHistory,
    notes: str(rec.notes) || undefined,
    status: computeLoanStatus(due, ret),
    lastOverdueNotifiedAt: str(rec.lastOverdueNotifiedAt) || undefined,
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export function mapLibrarySettings(rec: AnyRec): LibrarySettings {
  return {
    id: str(rec.id),
    maxRenewals: num(rec.maxRenewals, 2),
    renewalDays: num(rec.renewalDays, 7),
    libraryEmail: str(rec.libraryEmail) || 'biblioteca@portalcursos.ng',
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

export const DEFAULT_LIBRARY_SETTINGS: LibrarySettings = {
  maxRenewals: 2,
  renewalDays: 7,
  libraryEmail: 'biblioteca@portalcursos.ng',
}

// ---------- loaders ----------

// Carrega todos os dados do banco (com seed inicial em coleções vazias).
// Cada loader tem fallback local: banco indisponível não pode derrubar o app.
export async function loadAllData(): Promise<{
  users: UserAccount[]
  students: Student[]
  courses: Course[]
  charges: Charge[]
  priceTable: PriceTableItem[]
  priceAuditLogs: PriceAuditLog[]
  billingExceptions: BillingException[]
  tickets: MaintenanceTicket[]
  lgpdRequests: LgpdRequest[]
  expenses: Expense[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  lessonProgress: LessonProgress[]
  courseMaterials: CourseMaterial[]
  calendarEvents: CalendarEvent[]
  studentNotifications: StudentNotification[]
  studentSupportTickets: StudentSupportTicket[]
  certificates: Certificate[]
  eadCourses: EadCourse[]
  eadLessons: EadLesson[]
  libraryBooks: LibraryBook[]
  libraryLoans: LibraryLoan[]
  librarySettings: LibrarySettings
}> {
  await ensureAuth()
  await seedIfEmpty()

  const [
    users,
    students,
    courses,
    charges,
    priceTable,
    priceAuditLogs,
    billingExceptions,
    tickets,
    lgpdRequests,
    expenses,
    grades,
    attendance,
    lessonProgress,
    courseMaterials,
    calendarEvents,
    studentNotifications,
    studentSupportTickets,
    certificates,
    eadCourses,
    eadLessons,
    rawLibraryBooks,
    libraryLoans,
    librarySettingsList,
  ] = await Promise.all([
    safeList(async () => {
      // Tenta carregar usuários da coleção `users` (auth real)
      try {
        const authUsers = await pb.collection('users').getFullList({ sort: 'name' })
        // Filtra a conta de serviço compartilhada da exibição pública de membros
        const filtered = authUsers
          .filter((u) => u.email !== SERVICE_AUTH.identity)
          .map((u) => mapAuthUser(u as unknown as AnyRec))
        if (filtered.length > 0) return filtered
      } catch {
        // fallback para app_users
      }
      return (await pb.collection(COLLECTIONS.appUsers).getFullList({ sort: 'name' })).map(
        mapAppUser,
      )
    }, DEMO_ACCOUNTS),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.students).getFullList({ sort: '-created' })).map(
          mapStudent,
        ),
      INITIAL_STUDENTS,
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.courses).getFullList({ sort: '-created' })).map(mapCourse),
      INITIAL_COURSES,
    ),
    safeList(async () => {
      try {
        return (await pb.collection(COLLECTIONS.charges).getFullList({ sort: '-created' })).map(
          mapCharge,
        )
      } catch {
        return (await pb.collection(COLLECTIONS.charges).getFullList()).map(mapCharge)
      }
    }, INITIAL_CHARGES),
    safeList(
      async () => (await pb.collection(COLLECTIONS.prices).getFullList()).map(mapPriceItem),
      INITIAL_PRICE_TABLE,
    ),
    safeList(async () => {
      try {
        return (await pb.collection(COLLECTIONS.priceLogs).getFullList({ sort: '-created' })).map(
          mapPriceLog,
        )
      } catch {
        return (await pb.collection(COLLECTIONS.priceLogs).getFullList()).map(mapPriceLog)
      }
    }, INITIAL_PRICE_AUDIT_LOGS),
    safeList(async () => {
      try {
        return (await pb.collection(COLLECTIONS.exceptions).getFullList({ sort: '-created' })).map(
          mapException,
        )
      } catch {
        return (await pb.collection(COLLECTIONS.exceptions).getFullList()).map(mapException)
      }
    }, INITIAL_BILLING_EXCEPTIONS),
    safeList(async () => {
      try {
        return (await pb.collection(COLLECTIONS.tickets).getFullList({ sort: '-created' })).map(
          mapTicket,
        )
      } catch {
        return (await pb.collection(COLLECTIONS.tickets).getFullList()).map(mapTicket)
      }
    }, INITIAL_TICKETS),
    safeList(async () => {
      try {
        return (await pb.collection(COLLECTIONS.lgpd).getFullList({ sort: '-created' })).map(
          mapLgpd,
        )
      } catch {
        return (await pb.collection(COLLECTIONS.lgpd).getFullList()).map(mapLgpd)
      }
    }, INITIAL_LGPD_REQUESTS),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.expenses).getFullList({ sort: '-date' })).map(mapExpense),
      INITIAL_EXPENSES,
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.grades).getFullList({ sort: '-created' })).map(mapGrade),
      INITIAL_GRADES,
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.attendance).getFullList({ sort: '-date' })).map(
          mapAttendance,
        ),
      INITIAL_ATTENDANCE,
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.lessonProgress).getFullList({ sort: 'lessonId' })).map(
          mapLessonProgress,
        ),
      [],
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.courseMaterials).getFullList({ sort: '-created' })).map(
          mapCourseMaterial,
        ),
      [],
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.calendarEvents).getFullList({ sort: 'startDate' })).map(
          mapCalendarEvent,
        ),
      [],
    ),
    safeList(
      async () =>
        (
          await pb.collection(COLLECTIONS.studentNotifications).getFullList({ sort: '-created' })
        ).map(mapStudentNotification),
      [],
    ),
    safeList(
      async () =>
        (
          await pb.collection(COLLECTIONS.studentSupportTickets).getFullList({ sort: '-created' })
        ).map(mapStudentSupportTicket),
      [],
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.certificates).getFullList({ sort: '-created' })).map(
          mapCertificate,
        ),
      [],
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.eadCourses).getFullList({ sort: '-created' })).map(
          mapEadCourse,
        ),
      [],
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.eadLessons).getFullList({ sort: 'orderIndex' })).map(
          mapEadLesson,
        ),
      [],
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.libraryBooks).getFullList({ sort: 'title' })).map(
          mapLibraryBook,
        ),
      [],
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.libraryLoans).getFullList({ sort: '-created' })).map(
          mapLibraryLoan,
        ),
      [],
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.librarySettings).getFullList({ limit: 1 })).map(
          mapLibrarySettings,
        ),
      [DEFAULT_LIBRARY_SETTINGS],
    ),
  ])

  const librarySettings: LibrarySettings =
    librarySettingsList.length > 0 ? librarySettingsList[0] : DEFAULT_LIBRARY_SETTINGS

  // Deriva cópias disponíveis em cada livro: totalCopies - empréstimos ativos daquele bookId
  const activeLoansByBook: Record<string, number> = {}
  libraryLoans.forEach((l) => {
    if (!l.returnedAt) {
      activeLoansByBook[l.bookId] = (activeLoansByBook[l.bookId] || 0) + 1
    }
  })
  const libraryBooks = rawLibraryBooks.map((b) => {
    const activeCount = activeLoansByBook[b.id] || 0
    return {
      ...b,
      availableCopies: Math.max(0, b.totalCopies - activeCount),
    }
  })

  return {
    users,
    students,
    courses,
    charges,
    priceTable,
    priceAuditLogs,
    billingExceptions,
    tickets,
    lgpdRequests,
    expenses,
    grades,
    attendance,
    lessonProgress,
    courseMaterials,
    calendarEvents,
    studentNotifications,
    studentSupportTickets,
    certificates,
    eadCourses,
    eadLessons,
    libraryBooks,
    libraryLoans,
    librarySettings,
  }
}

// ---------- writers ----------

async function safeWrite<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run()
  } catch (err) {
    console.warn('[portalDb] falha ao gravar no banco:', err)
    return fallback
  }
}

function buildFormData(data: Record<string, unknown>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    if (value instanceof File) {
      fd.append(key, value)
    } else if (Array.isArray(value) && value.every((v) => v instanceof File)) {
      value.forEach((f) => fd.append(key, f as File))
    } else if (Array.isArray(value) || typeof value === 'object') {
      fd.append(key, JSON.stringify(value))
    } else {
      fd.append(key, String(value))
    }
  }
  return fd
}

export const portalDb = {
  createStudent: (student: Student) =>
    safeWrite(
      async () => {
        const docFiles = student.documents
          .map((d) => d.pendingFile)
          .filter((f): f is File => f instanceof File)
        const rec = await pb.collection(COLLECTIONS.students).create(
          buildFormData({
            fullName: student.fullName,
            cpf: student.cpf,
            cpfRaw: student.cpfRaw,
            email: student.email,
            phone: student.phone,
            studentType: student.type,
            courseId: student.courseId,
            courseName: student.courseName,
            photo: student.photoFile,
            photoUrl: student.photoFile ? '' : student.photoUrl,
            birthDate: student.birthDate,
            street: student.address.street,
            city: student.address.city,
            state: student.address.state,
            zip: student.address.zip,
            status: student.status,
            enrolledAt: student.enrolledAt,
            documents: JSON.stringify(
              student.documents.map(({ pendingFile: _f, ...rest }) => rest),
            ),
            docFiles: docFiles.length > 0 ? docFiles : undefined,
            observations: student.observations || '',
            ...(student.id && student.id.length >= 15 ? { id: student.id } : {}),
          }),
        )
        return mapStudent(rec as unknown as AnyRec)
      },
      null as Student | null,
    ),

  updateStudent: (studentId: string, updates: Partial<Student>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.fullName !== undefined) payload.fullName = updates.fullName
        if (updates.cpf !== undefined) payload.cpf = updates.cpf
        if (updates.cpfRaw !== undefined) payload.cpfRaw = updates.cpfRaw
        if (updates.email !== undefined) payload.email = updates.email
        if (updates.phone !== undefined) payload.phone = updates.phone
        if (updates.type !== undefined) payload.studentType = updates.type
        if (updates.courseId !== undefined) payload.courseId = updates.courseId
        if (updates.courseName !== undefined) payload.courseName = updates.courseName
        if (updates.photoUrl !== undefined) payload.photoUrl = updates.photoUrl
        if (updates.birthDate !== undefined) payload.birthDate = updates.birthDate
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.observations !== undefined) payload.observations = updates.observations
        if (updates.address !== undefined) {
          if (updates.address.street !== undefined) payload.street = updates.address.street
          if (updates.address.city !== undefined) payload.city = updates.address.city
          if (updates.address.state !== undefined) payload.state = updates.address.state
          if (updates.address.zip !== undefined) payload.zip = updates.address.zip
        }
        if (updates.documents !== undefined) {
          payload.documents = JSON.stringify(
            updates.documents.map(({ pendingFile: _f, ...rest }) => rest),
          )
        }
        try {
          const rec = await pb.collection(COLLECTIONS.students).update(studentId, payload)
          return mapStudent(rec as unknown as AnyRec)
        } catch {
          const found = await pb
            .collection(COLLECTIONS.students)
            .getFirstListItem(
              `id = "${studentId}" || cpfRaw = "${(updates.cpf || '').replace(/\D/g, '')}"`,
            )
          if (found) {
            const rec = await pb.collection(COLLECTIONS.students).update(found.id, payload)
            return mapStudent(rec as unknown as AnyRec)
          }
          throw new Error('Student not found')
        }
      },
      null as Student | null,
    ),

  deleteStudent: (studentId: string) =>
    safeWrite(async () => {
      try {
        await pb.collection(COLLECTIONS.students).delete(studentId)
        return true
      } catch {
        const found = await pb
          .collection(COLLECTIONS.students)
          .getFirstListItem(`id = "${studentId}"`)
        if (found) {
          await pb.collection(COLLECTIONS.students).delete(found.id)
          return true
        }
        throw new Error('Student not found for delete')
      }
    }, false),

  createCourse: (course: Course) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          code: course.code,
          name: course.name,
          level: course.level,
          courseType: course.type,
          modality: course.modality,
          durationSemesters: course.durationSemesters,
          workloadHours: course.workloadHours,
          coordinator: course.coordinator,
          coordinatorId: course.coordinatorId || '',
          status: course.status,
          lockedForEditing: course.lockedForEditing,
          emecCode: course.emecCode,
          emecConcept: course.emecConcept,
          emecOrdinanceNumber: course.emecOrdinanceNumber,
          emecOrdinanceDate: course.emecOrdinanceDate,
          description: course.description,
          monthlyFee: course.monthlyFee,
          vacancies: course.vacancies,
          enrolledCount: course.enrolledCount,
        }
        if (course.id && course.id.length >= 15) {
          payload.id = course.id
        }
        const rec = await pb.collection(COLLECTIONS.courses).create(payload)
        return mapCourse(rec as unknown as AnyRec)
      },
      null as Course | null,
    ),

  toggleCourseLock: (courseId: string, locked: boolean) =>
    safeWrite(
      async () => {
        try {
          const rec = await pb
            .collection(COLLECTIONS.courses)
            .update(courseId, { lockedForEditing: locked })
          return mapCourse(rec as unknown as AnyRec)
        } catch {
          const found = await pb
            .collection(COLLECTIONS.courses)
            .getFirstListItem(`id = "${courseId}"`)
          if (found) {
            const rec = await pb
              .collection(COLLECTIONS.courses)
              .update(found.id, { lockedForEditing: locked })
            return mapCourse(rec as unknown as AnyRec)
          }
          throw new Error('Course not found')
        }
      },
      null as Course | null,
    ),

  updateCourse: (courseId: string, updates: Partial<Course>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.name !== undefined) payload.name = updates.name
        if (updates.code !== undefined) payload.code = updates.code
        if (updates.level !== undefined) payload.level = updates.level
        if (updates.type !== undefined) payload.courseType = updates.type
        if (updates.modality !== undefined) payload.modality = updates.modality
        if (updates.durationSemesters !== undefined)
          payload.durationSemesters = updates.durationSemesters
        if (updates.workloadHours !== undefined) payload.workloadHours = updates.workloadHours
        if (updates.coordinator !== undefined) payload.coordinator = updates.coordinator
        if (updates.coordinatorId !== undefined) payload.coordinatorId = updates.coordinatorId
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.lockedForEditing !== undefined)
          payload.lockedForEditing = updates.lockedForEditing
        if (updates.emecCode !== undefined) payload.emecCode = updates.emecCode
        if (updates.emecConcept !== undefined) payload.emecConcept = updates.emecConcept
        if (updates.emecOrdinanceNumber !== undefined)
          payload.emecOrdinanceNumber = updates.emecOrdinanceNumber
        if (updates.emecOrdinanceDate !== undefined)
          payload.emecOrdinanceDate = updates.emecOrdinanceDate
        if (updates.description !== undefined) payload.description = updates.description
        if (updates.monthlyFee !== undefined) payload.monthlyFee = updates.monthlyFee
        if (updates.vacancies !== undefined) payload.vacancies = updates.vacancies
        if (updates.enrolledCount !== undefined) payload.enrolledCount = updates.enrolledCount

        try {
          const rec = await pb.collection(COLLECTIONS.courses).update(courseId, payload)
          return mapCourse(rec as unknown as AnyRec)
        } catch {
          const found = await pb
            .collection(COLLECTIONS.courses)
            .getFirstListItem(`id = "${courseId}" || code = "${updates.code || ''}"`)
          if (found) {
            const rec = await pb.collection(COLLECTIONS.courses).update(found.id, payload)
            return mapCourse(rec as unknown as AnyRec)
          }
          throw new Error('Course not found')
        }
      },
      null as Course | null,
    ),

  createAppUser: (user: UserAccount, password?: string) =>
    safeWrite(
      async () => {
        const userPassword = password || user.password || DEMO_USER_PASSWORD

        // Cria na coleção de autenticação real `users`
        try {
          const authPayload: Record<string, unknown> = {
            email: user.email,
            emailVisibility: false,
            password: userPassword,
            passwordConfirm: userPassword,
            name: user.name,
            role: user.role,
            roleTitle: user.roleTitle,
            department: user.department,
            status: user.status || 'ativo',
            cpf: user.cpf || '',
            phone: user.phone || '',
            avatarUrl: user.avatar || '',
            createdAtText: user.createdAt || new Date().toISOString().split('T')[0],
            lastAccessText: user.lastAccess || 'Recente',
          }
          const authRec = await pb.collection('users').create(authPayload)
          return mapAuthUser(authRec as unknown as AnyRec)
        } catch (authErr) {
          console.warn(
            '[portalDb] Erro ao criar usuário na auth collection users, tentando app_users:',
            authErr,
          )
        }

        // Fallback em app_users
        const payload: Record<string, unknown> = {
          name: user.name,
          email: user.email,
          role: user.role,
          roleTitle: user.roleTitle,
          department: user.department,
          status: user.status,
          cpf: user.cpf,
          phone: user.phone,
          avatar: user.avatar,
          createdAt: user.createdAt,
          lastAccess: user.lastAccess,
        }
        if (user.id && user.id.length >= 15) {
          payload.id = user.id
        }
        const rec = await pb.collection(COLLECTIONS.appUsers).create(payload)
        return mapAppUser(rec as unknown as AnyRec)
      },
      null as UserAccount | null,
    ),

  updateAppUser: (userId: string, updates: Partial<UserAccount>) =>
    safeWrite(
      async () => {
        // Tenta atualizar na coleção `users` do PocketBase
        try {
          const authPayload: Record<string, unknown> = {}
          if (updates.name !== undefined) authPayload.name = updates.name
          if (updates.role !== undefined) authPayload.role = updates.role
          if (updates.roleTitle !== undefined) authPayload.roleTitle = updates.roleTitle
          if (updates.department !== undefined) authPayload.department = updates.department
          if (updates.status !== undefined) authPayload.status = updates.status
          if (updates.cpf !== undefined) authPayload.cpf = updates.cpf
          if (updates.phone !== undefined) authPayload.phone = updates.phone
          if (updates.avatar !== undefined) authPayload.avatarUrl = updates.avatar
          if (updates.lastAccess !== undefined) authPayload.lastAccessText = updates.lastAccess

          // Atualiza pelo ID ou busca por e-mail
          let targetId = userId
          try {
            const rec = await pb.collection('users').update(targetId, authPayload)
            return mapAuthUser(rec as unknown as AnyRec)
          } catch {
            if (updates.email) {
              const found = await pb
                .collection('users')
                .getFirstListItem(`email = "${updates.email}"`)
              if (found) {
                const rec = await pb.collection('users').update(found.id, authPayload)
                return mapAuthUser(rec as unknown as AnyRec)
              }
            }
          }
        } catch (e) {
          console.warn('[portalDb] Falha ao atualizar na coleção users, tentando app_users:', e)
        }

        // Fallback para app_users
        const payload: Record<string, unknown> = {}
        if (updates.name !== undefined) payload.name = updates.name
        if (updates.role !== undefined) payload.role = updates.role
        if (updates.roleTitle !== undefined) payload.roleTitle = updates.roleTitle
        if (updates.department !== undefined) payload.department = updates.department
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.cpf !== undefined) payload.cpf = updates.cpf
        if (updates.phone !== undefined) payload.phone = updates.phone
        if (updates.avatar !== undefined) payload.avatar = updates.avatar
        if (updates.lastAccess !== undefined) payload.lastAccess = updates.lastAccess

        try {
          const rec = await pb.collection(COLLECTIONS.appUsers).update(userId, payload)
          return mapAppUser(rec as unknown as AnyRec)
        } catch {
          const found = await pb
            .collection(COLLECTIONS.appUsers)
            .getFirstListItem(`id = "${userId}" || email = "${updates.email || ''}"`)
          if (found) {
            const rec = await pb.collection(COLLECTIONS.appUsers).update(found.id, payload)
            return mapAppUser(rec as unknown as AnyRec)
          }
          throw new Error('User not found')
        }
      },
      null as UserAccount | null,
    ),

  createCharge: (charge: Charge) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          code: charge.code,
          studentId: charge.studentId,
          studentName: charge.studentName,
          studentCpf: charge.studentCpf,
          category: charge.category,
          description: charge.description,
          amount: charge.amount,
          dueDate: charge.dueDate,
          status: charge.status,
          method: charge.method || '',
          paidAt: charge.paidAt || '',
          pixCode: charge.pixCode || '',
          pixQrUrl: charge.pixQrUrl || '',
          receiptNumber: charge.receiptNumber || '',
          installments: charge.installments || 1,
          cardLast4: charge.cardLast4 || '',
          cardBrand: charge.cardBrand || '',
        }
        if (charge.id && charge.id.length >= 15) {
          payload.id = charge.id
        }
        const rec = await pb.collection(COLLECTIONS.charges).create(payload)
        return mapCharge(rec as unknown as AnyRec)
      },
      null as Charge | null,
    ),

  updateCharge: (chargeId: string, updates: Partial<Charge>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.method !== undefined) payload.method = updates.method
        if (updates.paidAt !== undefined) payload.paidAt = updates.paidAt
        if (updates.receiptNumber !== undefined) payload.receiptNumber = updates.receiptNumber
        if (updates.installments !== undefined) payload.installments = updates.installments
        if (updates.cardLast4 !== undefined) payload.cardLast4 = updates.cardLast4
        if (updates.cardBrand !== undefined) payload.cardBrand = updates.cardBrand
        try {
          const rec = await pb.collection(COLLECTIONS.charges).update(chargeId, payload)
          return mapCharge(rec as unknown as AnyRec)
        } catch {
          const found = await pb
            .collection(COLLECTIONS.charges)
            .getFirstListItem(`id = "${chargeId}" || code = "${updates.code || ''}"`)
          if (found) {
            const rec = await pb.collection(COLLECTIONS.charges).update(found.id, payload)
            return mapCharge(rec as unknown as AnyRec)
          }
          throw new Error('Charge not found')
        }
      },
      null as Charge | null,
    ),

  updatePriceItem: (itemId: string, updates: Partial<PriceTableItem>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.standardMonthlyFee !== undefined)
          payload.standardMonthlyFee = Number(updates.standardMonthlyFee)
        if (updates.enrollmentFee !== undefined)
          payload.enrollmentFee = Number(updates.enrollmentFee)
        if (updates.lateFeePercentage !== undefined)
          payload.lateFeePercentage = Number(updates.lateFeePercentage)
        if (updates.updatedAt !== undefined) payload.updatedAt = updates.updatedAt
        if (updates.updatedBy !== undefined) payload.updatedBy = updates.updatedBy

        // Tenta atualizar pelo ID (se for registro já existente no PocketBase)
        try {
          const rec = await pb.collection(COLLECTIONS.prices).update(itemId, payload)
          return mapPriceItem(rec as unknown as AnyRec)
        } catch {
          // Se o registro tiver ID local ou id seed diferente, tenta localizar por categoria/nível
          const found = await pb
            .collection(COLLECTIONS.prices)
            .getFirstListItem(`id = "${itemId}" || category = "${updates.category || ''}"`)
          if (found) {
            const rec = await pb.collection(COLLECTIONS.prices).update(found.id, payload)
            return mapPriceItem(rec as unknown as AnyRec)
          }
          throw new Error('Price item not found')
        }
      },
      null as PriceTableItem | null,
    ),

  createPriceLog: (log: PriceAuditLog) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          timestamp: log.timestamp,
          userName: log.userName,
          userRole: log.userRole,
          changeSummary: log.changeSummary,
          previousValue: log.previousValue,
          newValue: log.newValue,
        }
        if (log.id && log.id.length >= 15) {
          payload.id = log.id
        }
        const rec = await pb.collection(COLLECTIONS.priceLogs).create(payload)
        return mapPriceLog(rec as unknown as AnyRec)
      },
      null as PriceAuditLog | null,
    ),

  createException: (exc: BillingException) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          studentId: exc.studentId,
          studentName: exc.studentName,
          reason: exc.reason,
          discountPercentage: exc.discountPercentage,
          justification: exc.justification,
          requestedBy: exc.requestedBy,
          approvedBy: exc.approvedBy || '',
          status: exc.status,
          createdAt: exc.createdAt,
        }
        if (exc.id && exc.id.length >= 15) {
          payload.id = exc.id
        }
        const rec = await pb.collection(COLLECTIONS.exceptions).create(payload)
        return mapException(rec as unknown as AnyRec)
      },
      null as BillingException | null,
    ),

  updateException: (excId: string, updates: Partial<BillingException>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.approvedBy !== undefined) payload.approvedBy = updates.approvedBy
        try {
          const rec = await pb.collection(COLLECTIONS.exceptions).update(excId, payload)
          return mapException(rec as unknown as AnyRec)
        } catch {
          const found = await pb
            .collection(COLLECTIONS.exceptions)
            .getFirstListItem(`id = "${excId}"`)
          if (found) {
            const rec = await pb.collection(COLLECTIONS.exceptions).update(found.id, payload)
            return mapException(rec as unknown as AnyRec)
          }
          throw new Error('Exception not found')
        }
      },
      null as BillingException | null,
    ),

  createTicket: (ticket: MaintenanceTicket) =>
    safeWrite(
      async () => {
        const body: Record<string, unknown> = {
          title: ticket.title,
          description: ticket.description,
          location: ticket.location,
          priority: ticket.priority,
          status: ticket.status,
          category: ticket.category,
          reporterName: ticket.reporterName,
          reporterRole: ticket.reporterRole,
          assignedTo: ticket.assignedTo || '',
          photoUrls: ticket.photoFiles?.length ? '' : JSON.stringify(ticket.photoUrls),
          photo: ticket.photoFiles?.[0],
          createdAt: ticket.createdAt,
          resolvedAt: ticket.resolvedAt || '',
        }
        if (ticket.id && ticket.id.length >= 15) {
          body.id = ticket.id
        }
        const rec = await pb.collection(COLLECTIONS.tickets).create(buildFormData(body))
        return mapTicket(rec as unknown as AnyRec)
      },
      null as MaintenanceTicket | null,
    ),

  updateTicket: (ticketId: string, updates: Partial<MaintenanceTicket>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.assignedTo !== undefined) payload.assignedTo = updates.assignedTo
        if (updates.resolvedAt !== undefined) payload.resolvedAt = updates.resolvedAt
        try {
          const rec = await pb.collection(COLLECTIONS.tickets).update(ticketId, payload)
          return mapTicket(rec as unknown as AnyRec)
        } catch {
          const found = await pb
            .collection(COLLECTIONS.tickets)
            .getFirstListItem(`id = "${ticketId}"`)
          if (found) {
            const rec = await pb.collection(COLLECTIONS.tickets).update(found.id, payload)
            return mapTicket(rec as unknown as AnyRec)
          }
          throw new Error('Ticket not found')
        }
      },
      null as MaintenanceTicket | null,
    ),

  createLgpdRequest: (req: LgpdRequest) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          requesterName: req.requesterName,
          requesterCpf: req.requesterCpf,
          requesterEmail: req.requesterEmail,
          requestType: req.requestType,
          reason: req.reason,
          legalRetentionPeriodDays: req.legalRetentionPeriodDays,
          legalRetentionDeadline: req.legalRetentionDeadline,
          status: req.status,
          legalJustification: req.legalJustification,
          createdAt: req.createdAt,
          dpoNotes: req.dpoNotes || '',
        }
        if (req.id && req.id.length >= 15) {
          payload.id = req.id
        }
        const rec = await pb.collection(COLLECTIONS.lgpd).create(payload)
        return mapLgpd(rec as unknown as AnyRec)
      },
      null as LgpdRequest | null,
    ),

  updateLgpdRequest: (reqId: string, updates: Partial<LgpdRequest>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.dpoNotes !== undefined) payload.dpoNotes = updates.dpoNotes
        if (updates.legalJustification !== undefined)
          payload.legalJustification = updates.legalJustification
        try {
          const rec = await pb.collection(COLLECTIONS.lgpd).update(reqId, payload)
          return mapLgpd(rec as unknown as AnyRec)
        } catch {
          const found = await pb.collection(COLLECTIONS.lgpd).getFirstListItem(`id = "${reqId}"`)
          if (found) {
            const rec = await pb.collection(COLLECTIONS.lgpd).update(found.id, payload)
            return mapLgpd(rec as unknown as AnyRec)
          }
          throw new Error('LGPD request not found')
        }
      },
      null as LgpdRequest | null,
    ),

  createExpense: (expense: Omit<Expense, 'id' | 'createdAt'> & { id?: string }) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          description: expense.description,
          category: expense.category,
          amount: Number(expense.amount),
          date: expense.date,
          status: expense.status || 'pago',
          courseId: expense.courseId || '',
          notes: expense.notes || '',
        }
        if (expense.id && expense.id.length >= 15) {
          payload.id = expense.id
        }
        const rec = await pb.collection(COLLECTIONS.expenses).create(payload)
        return mapExpense(rec as unknown as AnyRec)
      },
      null as Expense | null,
    ),

  deleteExpense: (expenseId: string) =>
    safeWrite(async () => {
      try {
        await pb.collection(COLLECTIONS.expenses).delete(expenseId)
        return true
      } catch {
        const found = await pb
          .collection(COLLECTIONS.expenses)
          .getFirstListItem(`id = "${expenseId}"`)
        if (found) {
          await pb.collection(COLLECTIONS.expenses).delete(found.id)
          return true
        }
        throw new Error('Expense not found')
      }
    }, false),

  createGrade: (grade: Omit<Grade, 'id' | 'created' | 'updated'> & { id?: string }) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          studentId: grade.studentId,
          studentName: grade.studentName || '',
          studentCpf: grade.studentCpf || '',
          courseId: grade.courseId || '',
          subject: grade.subject,
          term: grade.term || '',
          assessmentType: grade.assessmentType || 'P1',
          weight: typeof grade.weight === 'number' ? grade.weight : 1,
          value: Number(grade.value),
          date: grade.date || '',
          teacherId: grade.teacherId || '',
          teacherName: grade.teacherName || '',
          observations: grade.observations || '',
        }
        if (grade.id && grade.id.length >= 15) {
          payload.id = grade.id
        }
        const rec = await pb.collection(COLLECTIONS.grades).create(payload)
        return mapGrade(rec as unknown as AnyRec)
      },
      null as Grade | null,
    ),

  updateGrade: (gradeId: string, updates: Partial<Grade>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.subject !== undefined) payload.subject = updates.subject
        if (updates.term !== undefined) payload.term = updates.term
        if (updates.assessmentType !== undefined) payload.assessmentType = updates.assessmentType
        if (updates.weight !== undefined) payload.weight = updates.weight
        if (updates.value !== undefined) payload.value = Number(updates.value)
        if (updates.date !== undefined) payload.date = updates.date
        if (updates.teacherName !== undefined) payload.teacherName = updates.teacherName
        if (updates.observations !== undefined) payload.observations = updates.observations
        try {
          const rec = await pb.collection(COLLECTIONS.grades).update(gradeId, payload)
          return mapGrade(rec as unknown as AnyRec)
        } catch {
          const found = await pb
            .collection(COLLECTIONS.grades)
            .getFirstListItem(`id = "${gradeId}"`)
          if (found) {
            const rec = await pb.collection(COLLECTIONS.grades).update(found.id, payload)
            return mapGrade(rec as unknown as AnyRec)
          }
          throw new Error('Grade not found')
        }
      },
      null as Grade | null,
    ),

  deleteGrade: (gradeId: string) =>
    safeWrite(async () => {
      try {
        await pb.collection(COLLECTIONS.grades).delete(gradeId)
        return true
      } catch {
        const found = await pb.collection(COLLECTIONS.grades).getFirstListItem(`id = "${gradeId}"`)
        if (found) {
          await pb.collection(COLLECTIONS.grades).delete(found.id)
          return true
        }
        throw new Error('Grade not found')
      }
    }, false),

  createAttendance: (att: Omit<AttendanceRecord, 'id' | 'created' | 'updated'> & { id?: string }) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          studentId: att.studentId,
          studentName: att.studentName || '',
          studentCpf: att.studentCpf || '',
          courseId: att.courseId || '',
          subject: att.subject,
          term: att.term || '',
          date: att.date,
          status: att.status || 'presente',
          hours: Number(att.hours || 2),
          teacherId: att.teacherId || '',
          teacherName: att.teacherName || '',
          justification: att.justification || '',
        }
        if (att.id && att.id.length >= 15) {
          payload.id = att.id
        }
        const rec = await pb.collection(COLLECTIONS.attendance).create(payload)
        return mapAttendance(rec as unknown as AnyRec)
      },
      null as AttendanceRecord | null,
    ),

  updateAttendance: (attId: string, updates: Partial<AttendanceRecord>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.subject !== undefined) payload.subject = updates.subject
        if (updates.term !== undefined) payload.term = updates.term
        if (updates.date !== undefined) payload.date = updates.date
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.hours !== undefined) payload.hours = Number(updates.hours)
        if (updates.teacherName !== undefined) payload.teacherName = updates.teacherName
        if (updates.justification !== undefined) payload.justification = updates.justification
        try {
          const rec = await pb.collection(COLLECTIONS.attendance).update(attId, payload)
          return mapAttendance(rec as unknown as AnyRec)
        } catch {
          const found = await pb
            .collection(COLLECTIONS.attendance)
            .getFirstListItem(`id = "${attId}"`)
          if (found) {
            const rec = await pb.collection(COLLECTIONS.attendance).update(found.id, payload)
            return mapAttendance(rec as unknown as AnyRec)
          }
          throw new Error('Attendance not found')
        }
      },
      null as AttendanceRecord | null,
    ),

  deleteAttendance: (attId: string) =>
    safeWrite(async () => {
      try {
        await pb.collection(COLLECTIONS.attendance).delete(attId)
        return true
      } catch {
        const found = await pb
          .collection(COLLECTIONS.attendance)
          .getFirstListItem(`id = "${attId}"`)
        if (found) {
          await pb.collection(COLLECTIONS.attendance).delete(found.id)
          return true
        }
        throw new Error('Attendance not found')
      }
    }, false),

  // --- Portal do Aluno: Aulas e Progresso ---
  updateLessonProgress: (
    studentId: string,
    courseId: string,
    lessonId: string,
    updates: Partial<LessonProgress>,
  ) =>
    safeWrite(
      async () => {
        // Tenta achar pelo índice composto (studentId + lessonId)
        let recId = updates.id
        if (!recId) {
          try {
            const found = await pb
              .collection(COLLECTIONS.lessonProgress)
              .getFirstListItem(`studentId = "${studentId}" && lessonId = "${lessonId}"`)
            recId = found.id
          } catch {
            // se não existir ainda, criamos
          }
        }

        const payload: Record<string, unknown> = {
          studentId,
          courseId,
          lessonId,
        }
        if (updates.moduleName) payload.moduleName = updates.moduleName
        if (updates.lessonTitle) payload.lessonTitle = updates.lessonTitle
        if (updates.durationMinutes !== undefined) payload.durationMinutes = updates.durationMinutes
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.completedAt !== undefined) payload.completedAt = updates.completedAt
        if (updates.lastWatchedSeconds !== undefined)
          payload.lastWatchedSeconds = updates.lastWatchedSeconds

        if (recId) {
          const updatedRec = await pb.collection(COLLECTIONS.lessonProgress).update(recId, payload)
          return mapLessonProgress(updatedRec as unknown as AnyRec)
        } else {
          const newRec = await pb.collection(COLLECTIONS.lessonProgress).create(payload)
          return mapLessonProgress(newRec as unknown as AnyRec)
        }
      },
      null as LessonProgress | null,
    ),

  // --- Portal do Aluno: Notificações ---
  markNotificationAsRead: (notificationId: string) =>
    safeWrite(
      async () => {
        const payload = {
          read: true,
          readAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        }
        const rec = await pb
          .collection(COLLECTIONS.studentNotifications)
          .update(notificationId, payload)
        return mapStudentNotification(rec as unknown as AnyRec)
      },
      null as StudentNotification | null,
    ),

  markAllNotificationsAsRead: (studentId: string) =>
    safeWrite(async () => {
      const unread = await pb
        .collection(COLLECTIONS.studentNotifications)
        .getFullList({ filter: `studentId = "${studentId}" && read = false` })
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16)
      for (const item of unread) {
        await pb.collection(COLLECTIONS.studentNotifications).update(item.id, {
          read: true,
          readAt: now,
        })
      }
      return true
    }, false),

  // --- Portal do Aluno: Suporte ---
  createStudentSupportTicket: (ticket: Omit<StudentSupportTicket, 'id' | 'created' | 'updated'>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          studentId: ticket.studentId,
          studentName: ticket.studentName || '',
          studentEmail: ticket.studentEmail || '',
          courseName: ticket.courseName || '',
          protocol: ticket.protocol || `SUP-${Date.now().toString().slice(-6)}`,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status || 'aberto',
          message: ticket.message,
          response: ticket.response || '',
          respondedBy: ticket.respondedBy || '',
          respondedAt: ticket.respondedAt || '',
        }
        const rec = await pb.collection(COLLECTIONS.studentSupportTickets).create(payload)
        return mapStudentSupportTicket(rec as unknown as AnyRec)
      },
      null as StudentSupportTicket | null,
    ),

  // --- Portal do Aluno: Edição de Perfil do Aluno ---
  // --- Certificados Acadêmicos ---
  createCertificate: (cert: Omit<Certificate, 'id' | 'created' | 'updated'> & { id?: string }) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          studentId: cert.studentId,
          studentName: cert.studentName,
          studentCpf: cert.studentCpf || '',
          courseId: cert.courseId,
          courseName: cert.courseName,
          courseLevel: cert.courseLevel || '',
          workloadHours: cert.workloadHours,
          issueDate: cert.issueDate,
          verificationCode: cert.verificationCode,
          issuedBy: cert.issuedBy,
          issuedByUserId: cert.issuedByUserId || '',
          averageGrade: cert.averageGrade !== undefined ? cert.averageGrade : 0,
          attendancePercent: cert.attendancePercent !== undefined ? cert.attendancePercent : 0,
          status: cert.status || 'ativo',
          ...(cert.id && cert.id.length >= 15 ? { id: cert.id } : {}),
        }
        const rec = await pb.collection(COLLECTIONS.certificates).create(payload)
        return mapCertificate(rec as unknown as AnyRec)
      },
      null as Certificate | null,
    ),

  updateCertificateStatus: (
    certId: string,
    status: 'ativo' | 'revogado' | 'substituido',
    audit?: {
      revokedAt?: string
      revokedBy?: string
      revokedByUserId?: string
      revocationReason?: string
    },
  ) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = { status }
        if (audit) {
          if (audit.revokedAt !== undefined) payload.revokedAt = audit.revokedAt
          if (audit.revokedBy !== undefined) payload.revokedBy = audit.revokedBy
          if (audit.revokedByUserId !== undefined) payload.revokedByUserId = audit.revokedByUserId
          if (audit.revocationReason !== undefined)
            payload.revocationReason = audit.revocationReason
        }
        const rec = await pb.collection(COLLECTIONS.certificates).update(certId, payload)
        return mapCertificate(rec as unknown as AnyRec)
      },
      null as Certificate | null,
    ),

  updateStudentProfile: (
    studentId: string,
    userId: string,
    updates: {
      phone?: string
      street?: string
      city?: string
      state?: string
      zip?: string
      photoUrl?: string
      photoFile?: File
      name?: string
      observations?: string
    },
  ) =>
    safeWrite(async () => {
      // Atualiza students
      if (studentId) {
        const studentPayload: Record<string, unknown> = {}
        if (updates.phone !== undefined) studentPayload.phone = updates.phone
        if (updates.street !== undefined) studentPayload.street = updates.street
        if (updates.city !== undefined) studentPayload.city = updates.city
        if (updates.state !== undefined) studentPayload.state = updates.state
        if (updates.zip !== undefined) studentPayload.zip = updates.zip
        if (updates.photoUrl !== undefined) studentPayload.photoUrl = updates.photoUrl
        if (updates.photoFile instanceof File) studentPayload.photo = updates.photoFile
        if (updates.name !== undefined) studentPayload.fullName = updates.name
        if (updates.observations !== undefined) studentPayload.observations = updates.observations

        await pb.collection(COLLECTIONS.students).update(studentId, buildFormData(studentPayload))
      }

      // Atualiza users (auth)
      if (userId) {
        const userPayload: Record<string, unknown> = {}
        if (updates.phone !== undefined) userPayload.phone = updates.phone
        if (updates.name !== undefined) userPayload.name = updates.name
        if (updates.photoUrl !== undefined) userPayload.avatarUrl = updates.photoUrl
        if (updates.photoFile instanceof File) userPayload.avatar = updates.photoFile

        await pb.collection('users').update(userId, buildFormData(userPayload))
      }

      return true
    }, false),

  // ---------- EAD (Cursos e Videoaulas) ----------

  createEadCourse: (data: Omit<EadCourse, 'id' | 'created' | 'updated'>) =>
    safeWrite(
      async () => {
        const payload = {
          title: data.title,
          description: data.description || '',
          workloadHours: data.workloadHours || 20,
          catalogCourseId: data.catalogCourseId || '',
          catalogCourseName: data.catalogCourseName || '',
          thumbnail: data.thumbnail || '',
          status: data.status || 'publicado',
          instructorId: data.instructorId || '',
          instructorName: data.instructorName || '',
          enrolledStudentIds: JSON.stringify(data.enrolledStudentIds || []),
        }
        const rec = await pb.collection(COLLECTIONS.eadCourses).create(payload)
        return mapEadCourse(rec as unknown as AnyRec)
      },
      null as EadCourse | null,
    ),

  updateEadCourse: (
    courseId: string,
    updates: Partial<Omit<EadCourse, 'id' | 'created' | 'updated'>>,
  ) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.title !== undefined) payload.title = updates.title
        if (updates.description !== undefined) payload.description = updates.description
        if (updates.workloadHours !== undefined) payload.workloadHours = updates.workloadHours
        if (updates.catalogCourseId !== undefined) payload.catalogCourseId = updates.catalogCourseId
        if (updates.catalogCourseName !== undefined)
          payload.catalogCourseName = updates.catalogCourseName
        if (updates.thumbnail !== undefined) payload.thumbnail = updates.thumbnail
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.instructorId !== undefined) payload.instructorId = updates.instructorId
        if (updates.instructorName !== undefined) payload.instructorName = updates.instructorName
        if (updates.enrolledStudentIds !== undefined) {
          payload.enrolledStudentIds = JSON.stringify(updates.enrolledStudentIds)
        }
        const rec = await pb.collection(COLLECTIONS.eadCourses).update(courseId, payload)
        return mapEadCourse(rec as unknown as AnyRec)
      },
      null as EadCourse | null,
    ),

  deleteEadCourse: (courseId: string) =>
    safeWrite(async () => {
      // Exclui também as aulas vinculadas
      try {
        const lessons = await pb.collection(COLLECTIONS.eadLessons).getFullList({
          filter: `eadCourseId = "${courseId}"`,
        })
        for (const l of lessons) {
          await pb
            .collection(COLLECTIONS.eadLessons)
            .delete(l.id)
            .catch(() => null)
        }
      } catch {
        /* intentionally ignored */
      }
      await pb.collection(COLLECTIONS.eadCourses).delete(courseId)
      return true
    }, false),

  createEadLesson: (data: Omit<EadLesson, 'id' | 'created' | 'updated'>) =>
    safeWrite(
      async () => {
        const parsed = parseVideoUrl(data.videoUrl)
        const payload = {
          eadCourseId: data.eadCourseId,
          title: data.title,
          description: data.description || '',
          moduleName: data.moduleName || 'Módulo 1: Introdução',
          orderIndex: data.orderIndex ?? 1,
          videoUrl: data.videoUrl,
          videoProvider: data.videoProvider || parsed.provider,
          videoEmbedId: data.videoEmbedId || parsed.embedId,
          durationMinutes: data.durationMinutes || 15,
          isOptional: Boolean(data.isOptional),
        }
        const rec = await pb.collection(COLLECTIONS.eadLessons).create(payload)
        return mapEadLesson(rec as unknown as AnyRec)
      },
      null as EadLesson | null,
    ),

  updateEadLesson: (
    lessonId: string,
    updates: Partial<Omit<EadLesson, 'id' | 'created' | 'updated'>>,
  ) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.title !== undefined) payload.title = updates.title
        if (updates.description !== undefined) payload.description = updates.description
        if (updates.moduleName !== undefined) payload.moduleName = updates.moduleName
        if (updates.orderIndex !== undefined) payload.orderIndex = updates.orderIndex
        if (updates.videoUrl !== undefined) {
          payload.videoUrl = updates.videoUrl
          const parsed = parseVideoUrl(updates.videoUrl)
          payload.videoProvider = updates.videoProvider || parsed.provider
          payload.videoEmbedId = updates.videoEmbedId || parsed.embedId
        } else {
          if (updates.videoProvider !== undefined) payload.videoProvider = updates.videoProvider
          if (updates.videoEmbedId !== undefined) payload.videoEmbedId = updates.videoEmbedId
        }
        if (updates.durationMinutes !== undefined) payload.durationMinutes = updates.durationMinutes
        if (updates.isOptional !== undefined) payload.isOptional = updates.isOptional

        const rec = await pb.collection(COLLECTIONS.eadLessons).update(lessonId, payload)
        return mapEadLesson(rec as unknown as AnyRec)
      },
      null as EadLesson | null,
    ),

  deleteEadLesson: (lessonId: string) =>
    safeWrite(async () => {
      await pb.collection(COLLECTIONS.eadLessons).delete(lessonId)
      return true
    }, false),

  reorderEadLessons: (orderedLessonIds: string[]) =>
    safeWrite(async () => {
      for (let i = 0; i < orderedLessonIds.length; i++) {
        const id = orderedLessonIds[i]
        await pb
          .collection(COLLECTIONS.eadLessons)
          .update(id, { orderIndex: i + 1 })
          .catch(() => null)
      }
      return true
    }, false),

  createLibraryBook: (data: Omit<LibraryBook, 'id' | 'availableCopies' | 'created' | 'updated'>) =>
    safeWrite(
      async () => {
        const payload = {
          title: data.title,
          author: data.author,
          isbn: data.isbn || '',
          publisher: data.publisher || '',
          year: data.year ?? null,
          category: data.category || '',
          description: data.description || '',
          totalCopies: data.totalCopies ?? 1,
        }
        const rec = await pb.collection(COLLECTIONS.libraryBooks).create(payload)
        return mapLibraryBook(rec as unknown as AnyRec)
      },
      null as LibraryBook | null,
    ),

  updateLibraryBook: (
    bookId: string,
    updates: Partial<Omit<LibraryBook, 'id' | 'availableCopies' | 'created' | 'updated'>>,
  ) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.title !== undefined) payload.title = updates.title
        if (updates.author !== undefined) payload.author = updates.author
        if (updates.isbn !== undefined) payload.isbn = updates.isbn
        if (updates.publisher !== undefined) payload.publisher = updates.publisher
        if (updates.year !== undefined) payload.year = updates.year
        if (updates.category !== undefined) payload.category = updates.category
        if (updates.description !== undefined) payload.description = updates.description
        if (updates.totalCopies !== undefined) payload.totalCopies = updates.totalCopies

        const rec = await pb.collection(COLLECTIONS.libraryBooks).update(bookId, payload)
        return mapLibraryBook(rec as unknown as AnyRec)
      },
      null as LibraryBook | null,
    ),

  deleteLibraryBook: (bookId: string) =>
    safeWrite(async () => {
      await pb.collection(COLLECTIONS.libraryBooks).delete(bookId)
      return true
    }, false),

  createLibraryLoan: (
    data: Omit<LibraryLoan, 'id' | 'status' | 'renewals' | 'created' | 'updated'> & {
      renewals?: number
    },
  ) =>
    safeWrite(
      async () => {
        const payload = {
          bookId: data.bookId,
          bookTitle: data.bookTitle || '',
          studentId: data.studentId,
          studentName: data.studentName || '',
          studentCpf: data.studentCpf || '',
          loanDate: data.loanDate,
          dueDate: data.dueDate,
          returnedAt: data.returnedAt || '',
          renewals: data.renewals ?? 0,
          notes: data.notes || '',
        }
        const rec = await pb.collection(COLLECTIONS.libraryLoans).create(payload)
        return mapLibraryLoan(rec as unknown as AnyRec)
      },
      null as LibraryLoan | null,
    ),

  returnLibraryLoan: (loanId: string, returnDate?: string) =>
    safeWrite(
      async () => {
        const isoDate = returnDate || new Date().toISOString().slice(0, 10)
        const rec = await pb.collection(COLLECTIONS.libraryLoans).update(loanId, {
          returnedAt: isoDate,
        })
        return mapLibraryLoan(rec as unknown as AnyRec)
      },
      null as LibraryLoan | null,
    ),

  renewLibraryLoan: (
    loanId: string,
    newDueDate: string,
    currentRenewals: number,
    newHistory?: string[],
  ) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          dueDate: newDueDate,
          renewals: currentRenewals + 1,
        }
        if (newHistory) {
          payload.renewalHistory = JSON.stringify(newHistory)
        }
        const rec = await pb.collection(COLLECTIONS.libraryLoans).update(loanId, payload)
        return mapLibraryLoan(rec as unknown as AnyRec)
      },
      null as LibraryLoan | null,
    ),

  deleteLibraryLoan: (loanId: string) =>
    safeWrite(async () => {
      await pb.collection(COLLECTIONS.libraryLoans).delete(loanId)
      return true
    }, false),

  saveLibrarySettings: (settings: {
    id?: string
    maxRenewals: number
    renewalDays: number
    libraryEmail?: string
  }) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          maxRenewals: Math.max(0, Math.min(20, Math.round(settings.maxRenewals))),
          renewalDays: Math.max(1, Math.min(90, Math.round(settings.renewalDays))),
          libraryEmail: (settings.libraryEmail || 'biblioteca@portalcursos.ng')
            .trim()
            .toLowerCase(),
        }
        let rec
        if (settings.id) {
          rec = await pb.collection(COLLECTIONS.librarySettings).update(settings.id, payload)
        } else {
          // Tenta atualizar o primeiro registro se existir
          const existing = await pb
            .collection(COLLECTIONS.librarySettings)
            .getFullList({ limit: 1 })
          if (existing.length > 0) {
            rec = await pb.collection(COLLECTIONS.librarySettings).update(existing[0].id, payload)
          } else {
            rec = await pb.collection(COLLECTIONS.librarySettings).create(payload)
          }
        }
        return mapLibrarySettings(rec as unknown as AnyRec)
      },
      null as LibrarySettings | null,
    ),

  triggerOverdueNotifications: () =>
    safeWrite(async () => {
      const res = await pb.send('/backend/v1/library/notify-overdue', {
        method: 'POST',
      })
      return res as {
        success: boolean
        overdueCount: number
        sentCount: number
        skippedCount: number
        details?: Array<{
          loanId: string
          studentName?: string
          recipients?: string[]
          sent?: boolean
        }>
      }
    }, null),
}
