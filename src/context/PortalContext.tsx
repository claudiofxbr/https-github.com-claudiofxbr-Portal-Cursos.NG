import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  UserRole,
  UserAccount,
  ModuleKey,
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
  SystemDiagnostic,
} from '@/types/portal'
import {
  PORTAL_GATE_PASSCODE,
  MODULE_PERMISSIONS,
  DEMO_ACCOUNTS,
  INITIAL_COURSES,
  INITIAL_STUDENTS,
  INITIAL_CHARGES,
  INITIAL_PRICE_TABLE,
  INITIAL_PRICE_AUDIT_LOGS,
  INITIAL_BILLING_EXCEPTIONS,
  INITIAL_TICKETS,
  INITIAL_LGPD_REQUESTS,
  INITIAL_EXPENSES,
  INITIAL_DIAGNOSTIC,
  INITIAL_GRADES,
  INITIAL_ATTENDANCE,
} from '@/data/portalMockData'
import { generateId } from '@/lib/id'
import pb from '@/lib/pocketbase/client'
import {
  portalDb,
  loadAllData,
  loginWithPassword,
  logoutAuth,
  requestPasswordReset,
  confirmPasswordReset,
  mapAuthUser,
  AnyRec,
  parseVideoUrl,
} from '@/lib/portalDb'
import { calculateConsolidatedAttendance } from '@/lib/academicCalculations'

interface PortalContextType {
  // Gate
  isGateUnlocked: boolean
  gateAttempts: number
  isGateLockedOut: boolean
  unlockGate: (code: string) => boolean
  lockGate: () => void

  // Auth
  currentUser: UserAccount | null
  loginAttempts: number
  isLoginLockedOut: boolean
  login: (email: string, password?: string) => Promise<boolean> | boolean
  logout: () => void
  users: UserAccount[]
  updateUserRole: (userId: string, newRole: UserRole) => void
  createUser: (
    user: Omit<UserAccount, 'id' | 'createdAt'>,
    password?: string,
  ) => Promise<UserAccount | null>
  requestPasswordResetEmail: (
    email: string,
  ) => Promise<{ success: boolean; genericMessage: string }>
  confirmPasswordResetWithToken: (
    token: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>

  // Permissions
  canAccessModule: (module: ModuleKey) => boolean

  // Students & Matricula
  students: Student[]
  addStudent: (
    student: Omit<Student, 'id' | 'enrolledAt' | 'cpfRaw'>,
    chargeOptions?: {
      amount?: number
      category?: Charge['category']
      description?: string
      status?: Charge['status']
      method?: Charge['method']
      paidAt?: string
      receiptNumber?: string
      priceCategory?: string
      dueDate?: string
      skipCharge?: boolean
      pixCode?: string
      pixQrUrl?: string
      installments?: number
      cardLast4?: string
      cardBrand?: string
    },
  ) => Promise<Student> | Student
  createCharge: (charge: Charge) => Promise<Charge>
  updateStudent: (studentId: string, updates: Partial<Student>) => Promise<Student | null>
  deleteStudent: (studentId: string) => Promise<boolean>
  searchStudentsByCpf: (cpfQuery: string) => Student[]

  // Courses
  courses: Course[]
  toggleCourseLock: (courseId: string) => void
  updateCourse: (courseId: string, updates: Partial<Course>) => void
  addCourse: (course: Omit<Course, 'id' | 'enrolledCount'>) => void

  // Financial
  charges: Charge[]
  payChargePix: (chargeId: string) => void
  payChargeCard: (
    chargeId: string,
    cardInfo: {
      last4: string
      holder: string
      installments?: number
      cardBrand?: string
      totalAmount?: number
    },
  ) => void
  priceTable: PriceTableItem[]
  priceAuditLogs: PriceAuditLog[]
  updatePriceTableItem: (id: string, updates: Partial<PriceTableItem>, reason: string) => void
  billingExceptions: BillingException[]
  createBillingException: (exception: Omit<BillingException, 'id' | 'createdAt' | 'status'>) => void
  updateBillingExceptionStatus: (id: string, status: 'aprovado' | 'rejeitado') => void

  // Maintenance
  tickets: MaintenanceTicket[]
  addTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'status'>) => void
  updateTicketStatus: (id: string, status: MaintenanceTicket['status']) => void

  // LGPD
  lgpdRequests: LgpdRequest[]
  addLgpdRequest: (req: Omit<LgpdRequest, 'id' | 'createdAt'>) => void
  updateLgpdStatus: (id: string, status: LgpdRequest['status'], notes?: string) => void

  // Relatórios & Despesas
  expenses: Expense[]
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>
  deleteExpense: (id: string) => Promise<boolean>

  // Notas e Frequência
  grades: Grade[]
  attendance: AttendanceRecord[]
  addGrade: (grade: Omit<Grade, 'id' | 'created' | 'updated'>) => Promise<Grade>
  updateGrade: (id: string, updates: Partial<Grade>) => Promise<Grade | null>
  deleteGrade: (id: string) => Promise<boolean>
  addAttendance: (
    att: Omit<AttendanceRecord, 'id' | 'created' | 'updated'>,
  ) => Promise<AttendanceRecord>
  updateAttendance: (
    id: string,
    updates: Partial<AttendanceRecord>,
  ) => Promise<AttendanceRecord | null>
  deleteAttendance: (id: string) => Promise<boolean>

  // Certificates
  certificates: Certificate[]
  issueCertificate: (params: {
    studentId: string
    courseId?: string
    issuedBy?: string
  }) => Promise<
    { certificate: Certificate; error?: string } | { certificate?: null; error: string }
  >
  revokeCertificate: (certificateId: string, options?: { reason?: string }) => Promise<boolean>
  getStudentCertificate: (studentId: string) => Certificate | undefined
  getStudentCertificates: (studentId: string) => Certificate[]

  // EAD (Cursos e Videoaulas)
  eadCourses: EadCourse[]
  eadLessons: EadLesson[]
  createEadCourse: (
    data: Omit<EadCourse, 'id' | 'created' | 'updated'>,
  ) => Promise<EadCourse | null>
  updateEadCourse: (
    id: string,
    updates: Partial<Omit<EadCourse, 'id' | 'created' | 'updated'>>,
  ) => Promise<EadCourse | null>
  deleteEadCourse: (id: string) => Promise<boolean>
  enrollStudentsInEadCourse: (courseId: string, studentIds: string[]) => Promise<boolean>
  createEadLesson: (
    data: Omit<EadLesson, 'id' | 'created' | 'updated'>,
  ) => Promise<EadLesson | null>
  updateEadLesson: (
    id: string,
    updates: Partial<Omit<EadLesson, 'id' | 'created' | 'updated'>>,
  ) => Promise<EadLesson | null>
  deleteEadLesson: (id: string) => Promise<boolean>
  reorderEadLessons: (orderedLessonIds: string[]) => Promise<boolean>

  // Biblioteca (Acervo & Empréstimos)
  libraryBooks: LibraryBook[]
  libraryLoans: LibraryLoan[]
  createLibraryBook: (
    data: Omit<LibraryBook, 'id' | 'availableCopies' | 'created' | 'updated'>,
  ) => Promise<LibraryBook | null>
  updateLibraryBook: (
    id: string,
    updates: Partial<Omit<LibraryBook, 'id' | 'availableCopies' | 'created' | 'updated'>>,
  ) => Promise<LibraryBook | null>
  deleteLibraryBook: (id: string) => Promise<boolean>
  createLibraryLoan: (data: {
    bookId: string
    studentId: string
    dueDate: string
    loanDate?: string
    notes?: string
  }) => Promise<{ success: boolean; loan?: LibraryLoan; error?: string }>
  returnLibraryLoan: (
    loanId: string,
    returnDate?: string,
  ) => Promise<{ success: boolean; loan?: LibraryLoan; error?: string }>
  renewLibraryLoan: (
    loanId: string,
    additionalDays?: number,
  ) => Promise<{ success: boolean; loan?: LibraryLoan; error?: string }>
  deleteLibraryLoan: (id: string) => Promise<boolean>

  // Diagnostic
  diagnostic: SystemDiagnostic
  refreshDiagnostic: () => void

  // Portal do Aluno
  lessonProgress: LessonProgress[]
  courseMaterials: CourseMaterial[]
  calendarEvents: CalendarEvent[]
  studentNotifications: StudentNotification[]
  studentSupportTickets: StudentSupportTicket[]
  updateLessonProgress: (
    lessonId: string,
    updates: Partial<LessonProgress>,
    courseId?: string,
    moduleName?: string,
    lessonTitle?: string,
  ) => Promise<LessonProgress | null>
  markNotificationAsRead: (notificationId: string) => Promise<boolean>
  markAllNotificationsAsRead: () => Promise<boolean>
  createStudentSupportTicket: (
    ticket: Omit<StudentSupportTicket, 'id' | 'created' | 'updated' | 'protocol' | 'studentId'>,
  ) => Promise<StudentSupportTicket | null>
  updateStudentProfile: (updates: {
    phone?: string
    street?: string
    city?: string
    state?: string
    zip?: string
    photoUrl?: string
    photoFile?: File
    name?: string
    observations?: string
  }) => Promise<boolean>

  // Estado de sincronização com o banco
  isBackendReady: boolean
  isSyncing: boolean
}

const PortalContext = createContext<PortalContextType | undefined>(undefined)

const STORAGE_KEYS = {
  GATE: 'portalcursos_gate_unlocked',
  CURRENT_USER_ID: 'portalcursos_current_user_id',
  CURRENT_USER_EMAIL: 'portalcursos_current_user_email',
  CURRENT_USER_ROLE: 'portalcursos_current_user_role',
  GATE_LOCK: 'portalcursos_gate_lock',
  LOGIN_LOCK: 'portalcursos_login_lock',
  RESET_LOCK: 'portalcursos_reset_lock',
}

// Limites de bloqueio por tentativas falhas (portão e login)
const MAX_FAILED_ATTEMPTS = 4
const GATE_LOCKOUT_MS = 30_000 // 30s
const LOGIN_LOCKOUT_MS = 25_000 // 25s
const MAX_RESET_ATTEMPTS = 3
const RESET_LOCKOUT_MS = 60_000 // 1 min

interface LockState {
  attempts: number
  lockedUntil: number
}

const UNLOCKED_LOCK: LockState = { attempts: 0, lockedUntil: 0 }

// Grava no localStorage sem derrubar o app (quota cheia, modo privado etc.)
function persistJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Persistência é uma conveniência da demo: falha silenciosa é aceitável.
  }
}

// Lê o estado de bloqueio (tentativas + expiração) validando a estrutura:
// dados corrompidos ou manipulados manualmente voltam ao estado limpo.
function loadLockState(key: string): LockState {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return UNLOCKED_LOCK
    const parsed = JSON.parse(raw) as Partial<LockState> | null
    if (!parsed || typeof parsed !== 'object') return UNLOCKED_LOCK

    const attempts = Number(parsed.attempts)
    const lockedUntil = Number(parsed.lockedUntil)
    const safeAttempts = Number.isFinite(attempts) && attempts >= 0 ? Math.floor(attempts) : 0
    const safeUntil = Number.isFinite(lockedUntil) && lockedUntil > 0 ? lockedUntil : 0

    // Bloqueio já expirado enquanto a página estava fechada: recomeça limpo.
    if (safeUntil > 0 && safeUntil <= Date.now()) return UNLOCKED_LOCK

    return { attempts: safeAttempts, lockedUntil: safeUntil }
  } catch {
    return UNLOCKED_LOCK
  }
}

// Re-renderiza no instante em que um bloqueio expira e limpa o timer se o
// provider desmontar (nada de setState após unmount).
function useLockExpiry(lockedUntil: number, onExpire: () => void) {
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (lockedUntil <= Date.now()) return
    const timer = window.setTimeout(() => onExpireRef.current(), lockedUntil - Date.now())
    return () => window.clearTimeout(timer)
  }, [lockedUntil])
}

// Carrega listas do localStorage com validação: dados corrompidos ou
// manipulados manualmente não podem derrubar o app (JSON.parse lançando
// exceção => tela branca) nem injetar estruturas malformadas no estado.
function loadJsonState<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  // Gate state
  const [isGateUnlocked, setIsGateUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.GATE) === 'true'
    } catch {
      return false
    }
  })
  // Lockout persistido: recarregar a página não zera o bloqueio por tentativas
  // falhas (antes vivia só em memória e um F5 bastava para brute force).
  const [gateLock, setGateLock] = useState<LockState>(() => loadLockState(STORAGE_KEYS.GATE_LOCK))
  const gateAttempts = gateLock.attempts
  const isGateLockedOut = gateLock.lockedUntil > Date.now()
  useLockExpiry(gateLock.lockedUntil, () => setGateLock(UNLOCKED_LOCK))

  // Auth & Session state
  const [users, setUsers] = useState<UserAccount[]>(DEMO_ACCOUNTS)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    // 1. Tenta restaurar do PocketBase authStore nativo (sessão real)
    try {
      if (pb.authStore.isValid && pb.authStore.record) {
        const authRec = pb.authStore.record as unknown as AnyRec
        // Não restaura a conta de serviço compartilhada como usuário de tela
        if (authRec.email !== 'portal@portalcursos.ng') {
          return mapAuthUser(authRec)
        }
      }
    } catch {
      // continua para fallback
    }

    // 2. Fallback de localStorage
    try {
      const savedEmail = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_EMAIL)
      const savedRole = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ROLE)
      const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)
      if (savedEmail && savedEmail !== 'portal@portalcursos.ng') {
        const match = DEMO_ACCOUNTS.find(
          (u) =>
            u.email.toLowerCase() === savedEmail.toLowerCase() ||
            u.id === savedId ||
            (savedRole && u.role === savedRole),
        )
        if (match) return match
      }
      return null
    } catch {
      return null
    }
  })

  const [loginLock, setLoginLock] = useState<LockState>(() =>
    loadLockState(STORAGE_KEYS.LOGIN_LOCK),
  )
  const loginAttempts = loginLock.attempts
  const isLoginLockedOut = loginLock.lockedUntil > Date.now()
  useLockExpiry(loginLock.lockedUntil, () => setLoginLock(UNLOCKED_LOCK))

  // Domain states
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS)
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES)
  const [charges, setCharges] = useState<Charge[]>(INITIAL_CHARGES)
  const [priceTable, setPriceTable] = useState<PriceTableItem[]>(INITIAL_PRICE_TABLE)
  const [priceAuditLogs, setPriceAuditLogs] = useState<PriceAuditLog[]>(INITIAL_PRICE_AUDIT_LOGS)
  const [billingExceptions, setBillingExceptions] = useState<BillingException[]>(
    INITIAL_BILLING_EXCEPTIONS,
  )
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(INITIAL_TICKETS)
  const [lgpdRequests, setLgpdRequests] = useState<LgpdRequest[]>(INITIAL_LGPD_REQUESTS)
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES)
  const [grades, setGrades] = useState<Grade[]>(INITIAL_GRADES)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE)
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([])
  const [courseMaterials, setCourseMaterials] = useState<CourseMaterial[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [studentNotifications, setStudentNotifications] = useState<StudentNotification[]>([])
  const [studentSupportTickets, setStudentSupportTickets] = useState<StudentSupportTicket[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [eadCourses, setEadCourses] = useState<EadCourse[]>([])
  const [eadLessons, setEadLessons] = useState<EadLesson[]>([])
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([])
  const [libraryLoans, setLibraryLoans] = useState<LibraryLoan[]>([])
  const [diagnostic, setDiagnostic] = useState<SystemDiagnostic>(INITIAL_DIAGNOSTIC)

  const [isBackendReady, setIsBackendReady] = useState<boolean>(false)
  const [isSyncing, setIsSyncing] = useState<boolean>(true)

  // Ref com a lista de usuários sempre atualizada
  const usersRef = useRef(users)
  usersRef.current = users

  // Carrega todos os dados do banco no boot (idempotente)
  const bootFromDatabase = useCallback(async () => {
    setIsSyncing(true)
    try {
      const data = await loadAllData()
      if (data.users && data.users.length > 0) setUsers(data.users)
      if (data.students && data.students.length > 0) setStudents(data.students)
      if (data.courses && data.courses.length > 0) setCourses(data.courses)
      if (data.charges && data.charges.length > 0) setCharges(data.charges)
      if (data.priceTable && data.priceTable.length > 0) setPriceTable(data.priceTable)
      if (data.priceAuditLogs && data.priceAuditLogs.length > 0)
        setPriceAuditLogs(data.priceAuditLogs)
      if (data.billingExceptions && data.billingExceptions.length > 0)
        setBillingExceptions(data.billingExceptions)
      if (data.tickets && data.tickets.length > 0) setTickets(data.tickets)
      if (data.lgpdRequests && data.lgpdRequests.length > 0) setLgpdRequests(data.lgpdRequests)
      if (data.expenses && data.expenses.length > 0) setExpenses(data.expenses)
      if (data.grades && data.grades.length > 0) setGrades(data.grades)
      if (data.attendance && data.attendance.length > 0) setAttendance(data.attendance)
      if (data.lessonProgress) setLessonProgress(data.lessonProgress)
      if (data.courseMaterials) setCourseMaterials(data.courseMaterials)
      if (data.calendarEvents) setCalendarEvents(data.calendarEvents)
      if (data.studentNotifications) setStudentNotifications(data.studentNotifications)
      if (data.studentSupportTickets) setStudentSupportTickets(data.studentSupportTickets)
      if (data.certificates) setCertificates(data.certificates)
      if (data.eadCourses) setEadCourses(data.eadCourses)
      if (data.eadLessons) setEadLessons(data.eadLessons)
      if (data.libraryBooks) setLibraryBooks(data.libraryBooks)
      if (data.libraryLoans) setLibraryLoans(data.libraryLoans)

      // Re-valida sessão contra os dados do PocketBase
      try {
        if (pb.authStore.isValid && pb.authStore.record) {
          const rec = pb.authStore.record as unknown as AnyRec
          if (rec.email !== 'portal@portalcursos.ng') {
            const authUser = mapAuthUser(rec)
            // Complementa com dados da lista se houver
            const foundInList = data.users.find(
              (u) => u.id === authUser.id || u.email.toLowerCase() === authUser.email.toLowerCase(),
            )
            setCurrentUser(foundInList || authUser)
          }
        } else {
          const savedEmail = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_EMAIL)
          const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)
          const savedRole = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ROLE)
          if (savedEmail && savedEmail !== 'portal@portalcursos.ng') {
            const list = data.users.length > 0 ? data.users : DEMO_ACCOUNTS
            const matched = list.find(
              (u) =>
                (savedEmail && u.email.toLowerCase() === savedEmail.toLowerCase()) ||
                (savedId && u.id === savedId) ||
                (savedRole && u.role === savedRole),
            )
            if (matched) {
              setCurrentUser(matched)
            }
          }
        }
      } catch {
        // localStorage indisponível
      }

      setIsBackendReady(true)
    } catch (err) {
      console.warn('[PortalContext] Erro ao carregar dados do banco:', err)
      // Mantém fallbacks locais, sem tela branca
      setIsBackendReady(false)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    bootFromDatabase()
  }, [bootFromDatabase])

  // Persistência local mínima apenas para portão, sessão e locks
  useEffect(() => {
    persistJson(STORAGE_KEYS.GATE, isGateUnlocked)
  }, [isGateUnlocked])

  useEffect(() => {
    if (currentUser) {
      persistJson(STORAGE_KEYS.CURRENT_USER_ID, currentUser.id)
      persistJson(STORAGE_KEYS.CURRENT_USER_EMAIL, currentUser.email)
      persistJson(STORAGE_KEYS.CURRENT_USER_ROLE, currentUser.role)
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID)
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_EMAIL)
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ROLE)
      } catch {
        // falha silenciosa
      }
    }
  }, [currentUser])

  useEffect(() => {
    persistJson(STORAGE_KEYS.GATE_LOCK, gateLock)
  }, [gateLock])

  useEffect(() => {
    persistJson(STORAGE_KEYS.LOGIN_LOCK, loginLock)
  }, [loginLock])

  // Gate functions
  const unlockGate = (code: string): boolean => {
    if (isGateLockedOut) return false

    const cleanInput = code.trim().toUpperCase()
    if (cleanInput === PORTAL_GATE_PASSCODE) {
      setIsGateUnlocked(true)
      setGateLock(UNLOCKED_LOCK)
      return true
    }

    const nextAttempts = gateAttempts + 1
    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      setGateLock({ attempts: nextAttempts, lockedUntil: Date.now() + GATE_LOCKOUT_MS })
    } else {
      setGateLock({ attempts: nextAttempts, lockedUntil: 0 })
    }
    return false
  }

  const lockGate = () => {
    setIsGateUnlocked(false)
    try {
      localStorage.removeItem(STORAGE_KEYS.GATE)
    } catch {
      // falha de storage não derruba o lock
    }
  }

  // Auth functions
  const login = async (email: string, password?: string): Promise<boolean> => {
    if (isLoginLockedOut) return false

    const clean = email.trim().toLowerCase()
    const pass = password || ''

    if (!clean || !pass) {
      const nextAttempts = loginAttempts + 1
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        setLoginLock({ attempts: nextAttempts, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS })
      } else {
        setLoginLock({ attempts: nextAttempts, lockedUntil: 0 })
      }
      return false
    }

    try {
      // Autenticação real no servidor PocketBase (coleção users)
      const { user } = await loginWithPassword(clean, pass)
      setCurrentUser(user)
      setLoginLock(UNLOCKED_LOCK)

      // Atualiza lastAccess no servidor de forma não bloqueante
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16)
      portalDb.updateAppUser(user.id, { lastAccess: nowStr }).catch(() => {})
      return true
    } catch (err) {
      console.warn('[PortalContext] Falha de autenticação real no servidor:', err)

      const nextAttempts = loginAttempts + 1
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        setLoginLock({ attempts: nextAttempts, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS })
      } else {
        setLoginLock({ attempts: nextAttempts, lockedUntil: 0 })
      }
      return false
    }
  }

  const logout = () => {
    logoutAuth()
    setCurrentUser(null)
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID)
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_EMAIL)
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ROLE)
    } catch {
      // silencioso
    }
  }

  // Recuperação de senha com mensagem de sucesso genérica (não revela se o e-mail existe)
  const requestPasswordResetEmail = async (
    email: string,
  ): Promise<{ success: boolean; genericMessage: string }> => {
    const clean = email.trim().toLowerCase()
    const genericMessage =
      'Se o e-mail informado estiver cadastrado no PortalCursos.NG, você receberá uma mensagem com instruções e link para criar uma nova senha.'

    if (!clean) {
      return { success: false, genericMessage: 'Informe um e-mail válido.' }
    }

    try {
      await requestPasswordReset(clean)
      return { success: true, genericMessage }
    } catch (err) {
      console.warn('[PortalContext] requestPasswordResetEmail:', err)
      // Mantém mensagem genérica por segurança para não enumerar usuários
      return { success: true, genericMessage }
    }
  }

  const confirmPasswordResetWithToken = async (
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token.trim()) {
      return { success: false, error: 'Token de redefinição não fornecido ou inválido.' }
    }
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'A nova senha deve possuir no mínimo 8 caracteres.',
      }
    }

    try {
      const res = await confirmPasswordReset(token.trim(), newPassword)
      if (res.success) {
        return { success: true }
      }
      return {
        success: false,
        error: 'O link de redefinição expirou ou é inválido. Solicite uma nova recuperação.',
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha ao redefinir a senha no servidor.',
      }
    }
  }

  const updateUserRole = (userId: string, newRole: UserRole) => {
    const target = usersRef.current.find((u) => u.id === userId)
    if (!target) return
    if ((newRole === 'root' || target.role === 'root') && currentUser?.role !== 'root') return

    const roleLabels: Record<UserRole, string> = {
      root: 'Super Administrador (Root)',
      admin: 'Administrador(a) Geral',
      secretaria: 'Chefe de Secretaria',
      financeiro: 'Gestor(a) Financeiro',
      academico: 'Pró-Reitor(a) Acadêmico',
      matricula: 'Analista de Matrícula',
      coordenador: 'Coordenador(a) de Curso',
      professor: 'Docente Permanente',
      aluno: 'Aluno(a) Regular',
    }

    const roleTitle = roleLabels[newRole]

    // Atualização otimista no estado
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              role: newRole,
              roleTitle,
            }
          : u,
      ),
    )

    if (currentUser?.id === userId) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              role: newRole,
              roleTitle,
            }
          : null,
      )
    }

    // Persiste no banco PocketBase
    portalDb
      .updateAppUser(userId, { role: newRole, roleTitle, email: target.email })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao persistir role do usuário:', err)
      })
  }

  const createUser = async (
    userData: Omit<UserAccount, 'id' | 'createdAt'>,
    password?: string,
  ): Promise<UserAccount | null> => {
    const newUser: UserAccount = {
      ...userData,
      id: generateId('user'),
      createdAt: new Date().toISOString().split('T')[0],
      lastAccess: 'Nunca',
    }
    setUsers((prev) => [newUser, ...prev])

    // Persiste no PocketBase
    try {
      const created = await portalDb.createAppUser(newUser, password)
      if (created) {
        setUsers((prev) => prev.map((u) => (u.id === newUser.id ? created : u)))
        return created
      }
      return newUser
    } catch (err) {
      console.warn('[PortalContext] Falha ao criar usuário no banco:', err)
      return newUser
    }
  }

  // Permission check
  const canAccessModule = (moduleKey: ModuleKey): boolean => {
    if (!currentUser) return false
    if (currentUser.role === 'root') return true

    const moduleDef = MODULE_PERMISSIONS.find((m) => m.key === moduleKey)
    if (!moduleDef) return false

    return moduleDef.requiredRoles.includes(currentUser.role)
  }

  // Students & Matricula
  const addStudent = async (
    studentData: Omit<Student, 'id' | 'enrolledAt' | 'cpfRaw'>,
    chargeOptions?: {
      amount?: number
      category?: Charge['category']
      description?: string
      status?: Charge['status']
      method?: Charge['method']
      paidAt?: string
      receiptNumber?: string
      priceCategory?: string
      dueDate?: string
      skipCharge?: boolean
      pixCode?: string
      pixQrUrl?: string
      installments?: number
      cardLast4?: string
      cardBrand?: string
    },
  ): Promise<Student> => {
    const rawCpf = (studentData.cpf || '').replace(/\D/g, '')
    const tempId = generateId('std')
    const newStudent: Student = {
      ...studentData,
      id: tempId,
      cpfRaw: rawCpf,
      enrolledAt: new Date().toISOString().split('T')[0],
    }

    // Atualização otimista imediata
    setStudents((prev) => [newStudent, ...prev])

    // Se houver curso correspondente, atualiza contador de inscritos
    setCourses((prev) =>
      prev.map((c) =>
        c.id === newStudent.courseId ? { ...c, enrolledCount: c.enrolledCount + 1 } : c,
      ),
    )

    let createdCharge: Charge | null = null

    if (!chargeOptions?.skipCharge) {
      const chargeAmount =
        typeof chargeOptions?.amount === 'number'
          ? chargeOptions.amount
          : newStudent.type === 'graduacao'
            ? 350
            : 290

      const chargeStatus = chargeOptions?.status || 'pendente'
      const chargeMethod = chargeOptions?.method
      const chargePaidAt = chargeOptions?.paidAt
      const chargeReceipt = chargeOptions?.receiptNumber
      const chargeCategory = chargeOptions?.category || 'matricula'
      const chargeDesc =
        chargeOptions?.description ||
        `Taxa de Matrícula - ${newStudent.courseName}${chargeOptions?.priceCategory ? ` (${chargeOptions.priceCategory})` : ''}`

      const newCharge: Charge = {
        id: generateId('chg'),
        code: `COB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        studentId: newStudent.id,
        studentName: newStudent.fullName,
        studentCpf: newStudent.cpf,
        category: chargeCategory,
        description: chargeDesc,
        amount: chargeAmount,
        dueDate:
          chargeOptions?.dueDate ||
          new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: chargeStatus,
        method: chargeMethod,
        paidAt: chargePaidAt,
        receiptNumber: chargeReceipt,
        pixCode:
          chargeOptions?.pixCode ||
          `00020126580014br.gov.bcb.pix0136cob-portalcursos-std-${newStudent.id}520400005303986540${chargeAmount.toFixed(2)}5802BR5924PORTALCURSOS NG ENSINO6009SAO PAULO62070503***6304XXXX`,
        pixQrUrl:
          chargeOptions?.pixQrUrl ||
          `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=portalcursos_pix_${newStudent.id}`,
        installments: chargeOptions?.installments,
        cardLast4: chargeOptions?.cardLast4,
        cardBrand: chargeOptions?.cardBrand,
      }

      setCharges((prev) => [newCharge, ...prev])
      createdCharge = newCharge
    }

    // Persiste no PocketBase (incluindo upload real de foto e arquivos de documentos)
    try {
      const created = await portalDb.createStudent(newStudent)
      if (created) {
        setStudents((prev) => prev.map((s) => (s.id === tempId ? created : s)))
        if (createdCharge) {
          const persistedCharge = await portalDb.createCharge({
            ...createdCharge,
            studentId: created.id,
          })
          if (persistedCharge) {
            setCharges((prev) =>
              prev.map((c) => (c.id === createdCharge!.id ? persistedCharge : c)),
            )
          }
        }
        return created
      } else if (createdCharge) {
        const persistedCharge = await portalDb.createCharge(createdCharge)
        if (persistedCharge) {
          setCharges((prev) => prev.map((c) => (c.id === createdCharge!.id ? persistedCharge : c)))
        }
      }
    } catch (err) {
      console.warn('[PortalContext] Erro ao salvar aluno no banco:', err)
      if (createdCharge) {
        portalDb.createCharge(createdCharge).catch(() => {})
      }
    }

    return newStudent
  }

  const createCharge = async (charge: Charge): Promise<Charge> => {
    setCharges((prev) => [charge, ...prev])
    try {
      await portalDb.createCharge(charge)
    } catch (err) {
      console.warn('[PortalContext] Erro ao salvar cobrança no banco:', err)
    }
    return charge
  }

  const updateStudent = async (
    studentId: string,
    updates: Partial<Student>,
  ): Promise<Student | null> => {
    const rawCpf = updates.cpf ? updates.cpf.replace(/\D/g, '') : undefined
    const localMerged = {
      ...updates,
      ...(rawCpf !== undefined ? { cpfRaw: rawCpf } : {}),
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s
        return {
          ...s,
          ...localMerged,
          address: {
            ...s.address,
            ...(updates.address || {}),
          },
        }
      }),
    )

    try {
      const updated = await portalDb.updateStudent(studentId, localMerged)
      if (updated) {
        setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)))
        return updated
      }
      return null
    } catch (err) {
      console.warn('[PortalContext] Falha ao atualizar aluno no banco:', err)
      return null
    }
  }

  const deleteStudent = async (studentId: string): Promise<boolean> => {
    // Apenas root e admin podem excluir alunos
    if (!currentUser || (currentUser.role !== 'root' && currentUser.role !== 'admin')) {
      console.warn('[PortalContext] Tentativa não autorizada de excluir aluno:', currentUser?.role)
      return false
    }

    setStudents((prev) => prev.filter((s) => s.id !== studentId))

    try {
      const ok = await portalDb.deleteStudent(studentId)
      return ok
    } catch (err) {
      console.warn('[PortalContext] Falha ao excluir aluno no banco:', err)
      return false
    }
  }

  const searchStudentsByCpf = (cpfQuery: string): Student[] => {
    const clean = cpfQuery.replace(/\D/g, '')
    if (!clean) return students
    return students.filter((s) => s.cpfRaw.includes(clean) || s.cpf.includes(cpfQuery))
  }

  // Courses
  const toggleCourseLock = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId)
    const nextLocked = course ? !course.lockedForEditing : true

    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, lockedForEditing: nextLocked } : c)),
    )

    portalDb.toggleCourseLock(courseId, nextLocked).catch((err) => {
      console.warn('[PortalContext] Falha ao alterar trava de edição do curso no banco:', err)
    })
  }

  const updateCourse = (courseId: string, updates: Partial<Course>) => {
    const target = courses.find((c) => c.id === courseId)
    if (target?.lockedForEditing && currentUser?.role !== 'root') {
      return
    }

    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c
        return { ...c, ...updates }
      }),
    )

    portalDb
      .updateCourse(courseId, updates)
      .then((updated) => {
        if (updated) {
          setCourses((prev) => prev.map((c) => (c.id === courseId ? updated : c)))
        }
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao atualizar curso no banco:', err)
      })
  }

  const addCourse = (courseData: Omit<Course, 'id' | 'enrolledCount'>) => {
    const newCourse: Course = {
      ...courseData,
      id: generateId('crs'),
      enrolledCount: 0,
    }
    setCourses((prev) => [newCourse, ...prev])

    portalDb
      .createCourse(newCourse)
      .then((created) => {
        if (created) {
          setCourses((prev) => prev.map((c) => (c.id === newCourse.id ? created : c)))
        }
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao criar curso no banco:', err)
      })
  }

  // Financial
  const payChargePix = (chargeId: string) => {
    const paidAt = new Date().toISOString().replace('T', ' ').slice(0, 16)
    const receiptNumber = generateId('REC')

    setCharges((prev) =>
      prev.map((chg) =>
        chg.id === chargeId
          ? {
              ...chg,
              status: 'pago',
              method: 'pix',
              paidAt,
              receiptNumber,
            }
          : chg,
      ),
    )

    portalDb
      .updateCharge(chargeId, {
        status: 'pago',
        method: 'pix',
        paidAt,
        receiptNumber,
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao atualizar cobrança PIX no banco:', err)
      })
  }

  const payChargeCard = (
    chargeId: string,
    cardInfo: {
      last4: string
      holder: string
      installments?: number
      cardBrand?: string
      totalAmount?: number
    },
  ) => {
    const paidAt = new Date().toISOString().replace('T', ' ').slice(0, 16)
    const receiptNumber = generateId('REC-CARD')

    setCharges((prev) =>
      prev.map((chg) =>
        chg.id === chargeId
          ? {
              ...chg,
              status: 'pago',
              method: 'cartao',
              paidAt,
              receiptNumber,
              installments: cardInfo.installments ?? chg.installments ?? 1,
              cardLast4: cardInfo.last4 || chg.cardLast4,
              cardBrand: cardInfo.cardBrand || chg.cardBrand,
            }
          : chg,
      ),
    )

    portalDb
      .updateCharge(chargeId, {
        status: 'pago',
        method: 'cartao',
        paidAt,
        receiptNumber,
        installments: cardInfo.installments ?? 1,
        cardLast4: cardInfo.last4,
        cardBrand: cardInfo.cardBrand,
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao atualizar cobrança Cartão no banco:', err)
      })
  }

  const updatePriceTableItem = (id: string, updates: Partial<PriceTableItem>, reason: string) => {
    const currentItem = priceTable.find((p) => p.id === id)
    if (!currentItem) return

    const safeUpdates: Partial<PriceTableItem> = { ...updates }
    if ('standardMonthlyFee' in safeUpdates) {
      const v = Number(safeUpdates.standardMonthlyFee)
      safeUpdates.standardMonthlyFee =
        Number.isFinite(v) && v >= 0 ? v : currentItem.standardMonthlyFee
    }
    if ('enrollmentFee' in safeUpdates) {
      const v = Number(safeUpdates.enrollmentFee)
      safeUpdates.enrollmentFee = Number.isFinite(v) && v >= 0 ? v : currentItem.enrollmentFee
    }
    if ('lateFeePercentage' in safeUpdates) {
      const v = Number(safeUpdates.lateFeePercentage)
      safeUpdates.lateFeePercentage =
        Number.isFinite(v) && v >= 0 && v <= 100 ? v : currentItem.lateFeePercentage
    }

    const now = new Date().toISOString().split('T')[0]
    const updatedBy = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrador'

    const logEntry: PriceAuditLog = {
      id: generateId('log'),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      userName: currentUser?.name || 'Sistema',
      userRole: currentUser?.role || 'admin',
      changeSummary: reason || 'Atualização de tabela tarifária',
      previousValue: `Mensal: R$ ${currentItem.standardMonthlyFee.toFixed(2)} | Matrícula: R$ ${currentItem.enrollmentFee.toFixed(2)}`,
      newValue: `Mensal: R$ ${(safeUpdates.standardMonthlyFee ?? currentItem.standardMonthlyFee).toFixed(2)} | Matrícula: R$ ${(safeUpdates.enrollmentFee ?? currentItem.enrollmentFee).toFixed(2)}`,
    }

    setPriceAuditLogs((prev) => [logEntry, ...prev])
    setPriceTable((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...safeUpdates, updatedAt: now, updatedBy } : p)),
    )

    // Persistência no PocketBase: item de preço + log de auditoria
    portalDb
      .updatePriceItem(id, {
        ...safeUpdates,
        category: currentItem.category,
        updatedAt: now,
        updatedBy,
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao atualizar item de preço no banco:', err)
      })

    portalDb.createPriceLog(logEntry).catch((err) => {
      console.warn('[PortalContext] Falha ao registrar log de auditoria de preço no banco:', err)
    })
  }

  const createBillingException = (
    exceptionData: Omit<BillingException, 'id' | 'createdAt' | 'status'>,
  ) => {
    const newExc: BillingException = {
      ...exceptionData,
      id: generateId('exc'),
      status: 'pendente',
      createdAt: new Date().toISOString().split('T')[0],
    }
    setBillingExceptions((prev) => [newExc, ...prev])

    portalDb
      .createException(newExc)
      .then((created) => {
        if (created) {
          setBillingExceptions((prev) => prev.map((e) => (e.id === newExc.id ? created : e)))
        }
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao gravar exceção de cobrança no banco:', err)
      })
  }

  const updateBillingExceptionStatus = (id: string, status: 'aprovado' | 'rejeitado') => {
    const approvedBy = currentUser?.name || 'Diretoria Financeira'
    setBillingExceptions((prev) =>
      prev.map((exc) =>
        exc.id === id
          ? {
              ...exc,
              status,
              approvedBy,
            }
          : exc,
      ),
    )

    portalDb.updateException(id, { status, approvedBy }).catch((err) => {
      console.warn('[PortalContext] Falha ao atualizar status da exceção no banco:', err)
    })
  }

  // Maintenance
  const addTicket = (ticketData: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'status'>) => {
    const tempId = generateId('tkt')
    const newTicket: MaintenanceTicket = {
      ...ticketData,
      id: tempId,
      status: 'aberto',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    }
    setTickets((prev) => [newTicket, ...prev])

    portalDb
      .createTicket(newTicket)
      .then((created) => {
        if (created) {
          setTickets((prev) => prev.map((t) => (t.id === tempId ? created : t)))
        }
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao cadastrar chamado de manutenção no banco:', err)
      })
  }

  const updateTicketStatus = (id: string, status: MaintenanceTicket['status']) => {
    const resolvedAt =
      status === 'concluido' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined

    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              resolvedAt: resolvedAt !== undefined ? resolvedAt : t.resolvedAt,
            }
          : t,
      ),
    )

    portalDb
      .updateTicket(id, {
        status,
        ...(resolvedAt ? { resolvedAt } : {}),
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao atualizar status do chamado no banco:', err)
      })
  }

  // LGPD
  const addLgpdRequest = (reqData: Omit<LgpdRequest, 'id' | 'createdAt'>) => {
    const tempId = generateId('lgpd')
    const newReq: LgpdRequest = {
      ...reqData,
      id: tempId,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setLgpdRequests((prev) => [newReq, ...prev])

    portalDb
      .createLgpdRequest(newReq)
      .then((created) => {
        if (created) {
          setLgpdRequests((prev) => prev.map((r) => (r.id === tempId ? created : r)))
        }
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao criar solicitação LGPD no banco:', err)
      })
  }

  const updateLgpdStatus = (id: string, status: LgpdRequest['status'], notes?: string) => {
    setLgpdRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              dpoNotes: notes || r.dpoNotes,
            }
          : r,
      ),
    )

    portalDb
      .updateLgpdRequest(id, {
        status,
        ...(notes ? { dpoNotes: notes } : {}),
      })
      .catch((err) => {
        console.warn('[PortalContext] Falha ao atualizar status LGPD no banco:', err)
      })
  }

  // Relatórios / Despesas
  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
    const tempId = generateId('exp')
    const now = new Date().toISOString()
    const newExp: Expense = {
      ...expenseData,
      id: tempId,
      createdAt: now,
    }
    setExpenses((prev) => [newExp, ...prev])

    try {
      const created = await portalDb.createExpense(newExp)
      if (created) {
        setExpenses((prev) => prev.map((e) => (e.id === tempId ? created : e)))
        return created
      }
    } catch (err) {
      console.warn('[PortalContext] Falha ao criar despesa no banco:', err)
    }
    return newExp
  }

  const deleteExpense = async (id: string): Promise<boolean> => {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    try {
      const ok = await portalDb.deleteExpense(id)
      return ok
    } catch (err) {
      console.warn('[PortalContext] Falha ao excluir despesa do banco:', err)
      return false
    }
  }

  // Notas
  const addGrade = async (gradeData: Omit<Grade, 'id' | 'created' | 'updated'>): Promise<Grade> => {
    const tempId = generateId('grd-')
    const now = new Date().toISOString()
    const newGrade: Grade = {
      ...gradeData,
      id: tempId,
      created: now,
      updated: now,
    }
    setGrades((prev) => [newGrade, ...prev])

    try {
      const created = await portalDb.createGrade(newGrade)
      if (created) {
        setGrades((prev) => prev.map((g) => (g.id === tempId ? created : g)))
        return created
      }
    } catch (err) {
      console.warn('[PortalContext] Falha ao salvar nota no banco:', err)
    }
    return newGrade
  }

  const updateGrade = async (id: string, updates: Partial<Grade>): Promise<Grade | null> => {
    setGrades((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates, updated: new Date().toISOString() } : g)),
    )
    try {
      const updated = await portalDb.updateGrade(id, updates)
      if (updated) {
        setGrades((prev) => prev.map((g) => (g.id === id ? updated : g)))
        return updated
      }
    } catch (err) {
      console.warn('[PortalContext] Falha ao atualizar nota no banco:', err)
    }
    return null
  }

  const deleteGrade = async (id: string): Promise<boolean> => {
    setGrades((prev) => prev.filter((g) => g.id !== id))
    try {
      const ok = await portalDb.deleteGrade(id)
      return ok
    } catch (err) {
      console.warn('[PortalContext] Falha ao excluir nota do banco:', err)
      return false
    }
  }

  // Frequência
  const addAttendance = async (
    attData: Omit<AttendanceRecord, 'id' | 'created' | 'updated'>,
  ): Promise<AttendanceRecord> => {
    const tempId = generateId('att-')
    const now = new Date().toISOString()
    const newAtt: AttendanceRecord = {
      ...attData,
      id: tempId,
      created: now,
      updated: now,
    }
    setAttendance((prev) => [newAtt, ...prev])

    try {
      const created = await portalDb.createAttendance(newAtt)
      if (created) {
        setAttendance((prev) => prev.map((a) => (a.id === tempId ? created : a)))
        return created
      }
    } catch (err) {
      console.warn('[PortalContext] Falha ao salvar frequência no banco:', err)
    }
    return newAtt
  }

  const updateAttendance = async (
    id: string,
    updates: Partial<AttendanceRecord>,
  ): Promise<AttendanceRecord | null> => {
    setAttendance((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates, updated: new Date().toISOString() } : a)),
    )
    try {
      const updated = await portalDb.updateAttendance(id, updates)
      if (updated) {
        setAttendance((prev) => prev.map((a) => (a.id === id ? updated : a)))
        return updated
      }
    } catch (err) {
      console.warn('[PortalContext] Falha ao atualizar frequência no banco:', err)
    }
    return null
  }

  const deleteAttendance = async (id: string): Promise<boolean> => {
    setAttendance((prev) => prev.filter((a) => a.id !== id))
    try {
      const ok = await portalDb.deleteAttendance(id)
      return ok
    } catch (err) {
      console.warn('[PortalContext] Falha ao excluir frequência do banco:', err)
      return false
    }
  }

  // --- Gestão de Certificados ---
  const getStudentCertificates = useCallback(
    (studentId: string): Certificate[] => {
      const student = students.find((s) => s.id === studentId)
      const cleanCpf = student?.cpfRaw || student?.cpf.replace(/\D/g, '')
      return certificates
        .filter((c) => {
          if (c.studentId === studentId) return true
          if (cleanCpf && c.studentCpf && c.studentCpf.replace(/\D/g, '') === cleanCpf) return true
          if (student && c.studentName.toLowerCase() === student.fullName.toLowerCase()) return true
          return false
        })
        .sort((a, b) => {
          const dateA = a.created || a.issueDate
          const dateB = b.created || b.issueDate
          return dateB.localeCompare(dateA)
        })
    },
    [certificates, students],
  )

  const getStudentCertificate = useCallback(
    (studentId: string): Certificate | undefined => {
      const list = getStudentCertificates(studentId)
      return list.find((c) => c.status === 'ativo')
    },
    [getStudentCertificates],
  )

  const issueCertificate = async (params: {
    studentId: string
    courseId?: string
    issuedBy?: string
  }): Promise<
    { certificate: Certificate; error?: string } | { certificate?: null; error: string }
  > => {
    // 1. Validação de permissões
    const allowedRoles: UserRole[] = ['root', 'admin', 'secretaria', 'coordenador']
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      return {
        certificate: null,
        error:
          'Apenas a Secretaria Geral, Coordenação ou Administradores podem emitir certificados.',
      }
    }

    // 2. Busca o aluno
    const student = students.find((s) => s.id === params.studentId)
    if (!student) {
      return { certificate: null, error: 'Aluno não encontrado no cadastro.' }
    }

    // 3. Localiza certificados ativos anteriores para substituir automaticamente
    const cleanStudentCpf = student.cpfRaw || student.cpf.replace(/\D/g, '')
    const activeExistingCertificates = certificates.filter((c) => {
      if (c.status !== 'ativo') return false
      if (c.studentId === student.id) return true
      if (c.studentCpf && c.studentCpf.replace(/\D/g, '') === cleanStudentCpf) return true
      if (c.studentName.toLowerCase() === student.fullName.toLowerCase()) return true
      return false
    })

    // 4. Busca o curso correspondente
    const targetCourseId = params.courseId || student.courseId
    const course = courses.find(
      (c) =>
        c.id === targetCourseId ||
        c.code === targetCourseId ||
        c.name.toLowerCase() === student.courseName.toLowerCase(),
    )

    // 5. Calcula resumo acadêmico com as notas e presenças do aluno (por studentId, CPF ou nome)
    const cleanCpf = student.cpfRaw || student.cpf.replace(/\D/g, '')
    const studentGrades = grades.filter(
      (g) =>
        g.studentId === student.id ||
        (g.studentCpf && g.studentCpf.replace(/\D/g, '') === cleanCpf) ||
        (g.studentName && g.studentName.toLowerCase() === student.fullName.toLowerCase()),
    )
    const studentAttendance = attendance.filter(
      (a) =>
        a.studentId === student.id ||
        (a.studentCpf && a.studentCpf.replace(/\D/g, '') === cleanCpf) ||
        (a.studentName && a.studentName.toLowerCase() === student.fullName.toLowerCase()),
    )

    // Cálculo consolidado
    let totalGrade = 0
    let gradeCount = 0
    studentGrades.forEach((g) => {
      if (typeof g.value === 'number') {
        totalGrade += g.value
        gradeCount += 1
      }
    })
    const averageGrade = gradeCount > 0 ? Number((totalGrade / gradeCount).toFixed(1)) : 0

    // Frequência consolidada MEC (presenças manuais + videoaulas EAD concluídas)
    const consolidatedAtt = calculateConsolidatedAttendance(
      student.id,
      studentAttendance,
      eadCourses,
      eadLessons,
      lessonProgress,
      student.cpf,
    )
    const attendancePercent = consolidatedAtt.overallAttendancePercent

    // Critérios MEC: nota >= 6.0 e frequência >= 75%
    const isGradeApproved = averageGrade >= 6.0
    const isAttendanceApproved = attendancePercent >= 75.0

    if (!isGradeApproved || !isAttendanceApproved) {
      const reasons: string[] = []
      if (!isGradeApproved) {
        reasons.push(
          `Média geral ${averageGrade.toFixed(1)} inferior ao mínimo exigido pelo MEC (6,0)`,
        )
      }
      if (!isAttendanceApproved) {
        reasons.push(
          `Frequência apurada ${attendancePercent.toFixed(1)}% inferior ao mínimo legal do MEC (75,0%)`,
        )
      }
      return {
        certificate: null,
        error: `Emissão bloqueada por pendência acadêmica: ${reasons.join('; ')}.`,
      }
    }

    // 6. Gera código de verificação único e legível: CERT-XXXX-XXXX
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase()
    const randomHex2 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const verificationCode = `CERT-${randomHex}-${randomHex2}`

    const workloadHours = course?.workloadHours || (student.type === 'pos_graduacao' ? 420 : 3600)
    const courseLevel = course?.level || student.type || 'graduacao'
    const todayStr = new Date().toISOString().slice(0, 10)

    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      studentId: student.id,
      studentName: student.fullName,
      studentCpf: student.cpf,
      courseId: course?.id || student.courseId,
      courseName: course?.name || student.courseName,
      courseLevel,
      workloadHours,
      issueDate: todayStr,
      verificationCode,
      issuedBy: params.issuedBy || currentUser.name || 'Secretaria Acadêmica',
      issuedByUserId: currentUser.id,
      averageGrade,
      attendancePercent,
      status: 'ativo',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    // Se havia certificados ativos anteriores, substitui-os automaticamente
    const nowIso = new Date().toISOString()
    const autoRevokeReason = 'Substituído por nova emissão'
    const supersededAudit = {
      revokedAt: nowIso,
      revokedBy: currentUser.name || params.issuedBy || 'Sistema',
      revokedByUserId: currentUser.id,
      revocationReason: autoRevokeReason,
    }

    const previousIds = activeExistingCertificates.map((c) => c.id)

    // Atualização otimista: insere o novo e marca anteriores como 'substituido'
    setCertificates((prev) => {
      const updatedPrev = prev.map((c) =>
        previousIds.includes(c.id)
          ? {
              ...c,
              status: 'substituido' as const,
              ...supersededAudit,
            }
          : c,
      )
      return [newCert, ...updatedPrev]
    })

    // Notifica o aluno se existir
    const notification: StudentNotification = {
      id: `notif-${Date.now()}`,
      studentId: student.id,
      title: '🎓 Certificado de Conclusão Disponível',
      message: `Seu certificado do curso ${newCert.courseName} foi emitido com sucesso e já está disponível para download.`,
      type: 'academico',
      read: false,
      actionUrl: '/portal-aluno',
      created: new Date().toISOString(),
    }
    setStudentNotifications((prev) => [notification, ...prev])

    // Persiste no PocketBase: marca anteriores como 'substituido' no banco
    for (const oldCert of activeExistingCertificates) {
      try {
        await portalDb.updateCertificateStatus(oldCert.id, 'substituido', supersededAudit)
      } catch (err) {
        console.warn(`[PortalContext] Falha ao substituir certificado anterior ${oldCert.id}:`, err)
      }
    }

    // Persiste o novo certificado no PocketBase
    try {
      const persisted = await portalDb.createCertificate(newCert)
      if (persisted) {
        setCertificates((prev) =>
          prev.map((c) => (c.verificationCode === verificationCode ? persisted : c)),
        )
        return { certificate: persisted }
      }
    } catch (err) {
      console.warn('[PortalContext] Falha ao persistir certificado no banco:', err)
    }

    return { certificate: newCert }
  }

  const revokeCertificate = async (
    certificateId: string,
    options?: { reason?: string },
  ): Promise<boolean> => {
    const allowedRoles: UserRole[] = ['root', 'admin', 'secretaria']
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      return false
    }

    const nowIso = new Date().toISOString()
    const auditData = {
      revokedAt: nowIso,
      revokedBy: currentUser.name || 'Secretaria Acadêmica',
      revokedByUserId: currentUser.id,
      revocationReason: options?.reason || 'Revogado manualmente pela Secretaria Acadêmica',
    }

    setCertificates((prev) =>
      prev.map((c) =>
        c.id === certificateId
          ? {
              ...c,
              status: 'revogado',
              ...auditData,
            }
          : c,
      ),
    )

    try {
      await portalDb.updateCertificateStatus(certificateId, 'revogado', auditData)
      return true
    } catch (err) {
      console.warn('[PortalContext] Falha ao revogar certificado:', err)
      return false
    }
  }

  // --- Portal do Aluno: Métodos ---
  const updateLessonProgress = async (
    lessonId: string,
    updates: Partial<LessonProgress>,
    courseId?: string,
    moduleName?: string,
    lessonTitle?: string,
  ): Promise<LessonProgress | null> => {
    // Acha o aluno vinculado
    const student =
      students.find(
        (s) =>
          (currentUser?.studentId && s.id === currentUser.studentId) ||
          (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
      ) || students[0]

    const effectiveStudentId = currentUser?.studentId || student?.id || 'dbphexr97czw7cb'
    const effectiveCourseId = courseId || student?.courseId || 'crs-eng-soft'

    // Otimista
    setLessonProgress((prev) => {
      const idx = prev.findIndex(
        (p) => p.lessonId === lessonId && p.studentId === effectiveStudentId,
      )
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], ...updates, updated: new Date().toISOString() }
        return next
      }
      const newItem: LessonProgress = {
        id: `lp-${Date.now()}`,
        studentId: effectiveStudentId,
        courseId: effectiveCourseId,
        moduleName: moduleName || 'Geral',
        lessonId,
        lessonTitle: lessonTitle || 'Aula',
        durationMinutes: updates.durationMinutes || 30,
        status: updates.status || 'em_andamento',
        completedAt: updates.completedAt,
        lastWatchedSeconds: updates.lastWatchedSeconds || 0,
      }
      return [...prev, newItem]
    })

    try {
      const saved = await portalDb.updateLessonProgress(
        effectiveStudentId,
        effectiveCourseId,
        lessonId,
        {
          ...updates,
          moduleName,
          lessonTitle,
        },
      )
      if (saved) {
        setLessonProgress((prev) => {
          const filtered = prev.filter(
            (p) => !(p.lessonId === lessonId && p.studentId === effectiveStudentId),
          )
          return [...filtered, saved]
        })
        return saved
      }
    } catch (e) {
      console.warn('[PortalContext] Erro ao salvar progresso de aula:', e)
    }
    return null
  }

  const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
    setStudentNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n,
      ),
    )
    try {
      const res = await portalDb.markNotificationAsRead(notificationId)
      return Boolean(res)
    } catch (e) {
      console.warn('[PortalContext] Erro ao marcar notificação como lida:', e)
      return false
    }
  }

  const markAllNotificationsAsRead = async (): Promise<boolean> => {
    const student =
      students.find(
        (s) =>
          (currentUser?.studentId && s.id === currentUser.studentId) ||
          (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
      ) || students[0]
    const effectiveStudentId = currentUser?.studentId || student?.id || 'dbphexr97czw7cb'

    setStudentNotifications((prev) =>
      prev.map((n) => (n.studentId === effectiveStudentId ? { ...n, read: true } : n)),
    )

    try {
      return await portalDb.markAllNotificationsAsRead(effectiveStudentId)
    } catch (e) {
      console.warn('[PortalContext] Erro ao marcar todas as notificações:', e)
      return false
    }
  }

  const createStudentSupportTicket = async (
    ticket: Omit<StudentSupportTicket, 'id' | 'created' | 'updated' | 'protocol' | 'studentId'>,
  ): Promise<StudentSupportTicket | null> => {
    const student =
      students.find(
        (s) =>
          (currentUser?.studentId && s.id === currentUser.studentId) ||
          (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
      ) || students[0]
    const effectiveStudentId = currentUser?.studentId || student?.id || 'dbphexr97czw7cb'
    const protocol = `SUP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

    const optimistic: StudentSupportTicket = {
      id: `tick-${Date.now()}`,
      studentId: effectiveStudentId,
      studentName: currentUser?.name || student?.fullName || 'Aluno',
      studentEmail: currentUser?.email || student?.email || 'aluno@portalcursos.ng',
      courseName: student?.courseName || 'Engenharia de Software',
      protocol,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status || 'aberto',
      message: ticket.message,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    setStudentSupportTickets((prev) => [optimistic, ...prev])

    try {
      const saved = await portalDb.createStudentSupportTicket({
        studentId: effectiveStudentId,
        studentName: optimistic.studentName,
        studentEmail: optimistic.studentEmail,
        courseName: optimistic.courseName,
        protocol,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: optimistic.status,
        message: ticket.message,
      })
      if (saved) {
        setStudentSupportTickets((prev) => prev.map((t) => (t.id === optimistic.id ? saved : t)))
        return saved
      }
    } catch (e) {
      console.warn('[PortalContext] Erro ao criar ticket de suporte:', e)
    }
    return optimistic
  }

  const updateStudentProfile = async (updates: {
    phone?: string
    street?: string
    city?: string
    state?: string
    zip?: string
    photoUrl?: string
    photoFile?: File
    name?: string
    observations?: string
  }): Promise<boolean> => {
    const student =
      students.find(
        (s) =>
          (currentUser?.studentId && s.id === currentUser.studentId) ||
          (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
      ) || students[0]
    const effectiveStudentId = currentUser?.studentId || student?.id || 'dbphexr97czw7cb'
    const effectiveUserId = currentUser?.id || 'user-aluno'

    // Atualização otimista
    if (student) {
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== effectiveStudentId) return s
          return {
            ...s,
            fullName: updates.name !== undefined ? updates.name : s.fullName,
            phone: updates.phone !== undefined ? updates.phone : s.phone,
            photoUrl: updates.photoUrl !== undefined ? updates.photoUrl : s.photoUrl,
            observations:
              updates.observations !== undefined ? updates.observations : s.observations,
            address: {
              ...s.address,
              street: updates.street !== undefined ? updates.street : s.address.street,
              city: updates.city !== undefined ? updates.city : s.address.city,
              state: updates.state !== undefined ? updates.state : s.address.state,
              zip: updates.zip !== undefined ? updates.zip : s.address.zip,
            },
          }
        }),
      )
    }

    if (currentUser) {
      const updatedUser: UserAccount = {
        ...currentUser,
        name: updates.name !== undefined ? updates.name : currentUser.name,
        phone: updates.phone !== undefined ? updates.phone : currentUser.phone,
        avatar: updates.photoUrl !== undefined ? updates.photoUrl : currentUser.avatar,
      }
      setCurrentUser(updatedUser)
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)))
    }

    try {
      return await portalDb.updateStudentProfile(effectiveStudentId, effectiveUserId, updates)
    } catch (e) {
      console.warn('[PortalContext] Erro ao atualizar perfil do aluno:', e)
      return false
    }
  }

  // --- EAD: Métodos ---
  const createEadCourse = async (
    data: Omit<EadCourse, 'id' | 'created' | 'updated'>,
  ): Promise<EadCourse | null> => {
    const tempId = `ead-crs-${Date.now()}`
    const optimistic: EadCourse = {
      ...data,
      id: tempId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    setEadCourses((prev) => [optimistic, ...prev])

    try {
      const saved = await portalDb.createEadCourse(data)
      if (saved) {
        setEadCourses((prev) => prev.map((c) => (c.id === tempId ? saved : c)))
        return saved
      }
    } catch (err) {
      console.warn('[PortalContext] Erro ao criar curso EAD no banco:', err)
    }
    return optimistic
  }

  const updateEadCourse = async (
    id: string,
    updates: Partial<Omit<EadCourse, 'id' | 'created' | 'updated'>>,
  ): Promise<EadCourse | null> => {
    setEadCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updated: new Date().toISOString() } : c)),
    )

    try {
      const saved = await portalDb.updateEadCourse(id, updates)
      if (saved) {
        setEadCourses((prev) => prev.map((c) => (c.id === id ? saved : c)))
        return saved
      }
    } catch (err) {
      console.warn('[PortalContext] Erro ao atualizar curso EAD:', err)
    }
    return null
  }

  const deleteEadCourse = async (id: string): Promise<boolean> => {
    setEadCourses((prev) => prev.filter((c) => c.id !== id))
    setEadLessons((prev) => prev.filter((l) => l.eadCourseId !== id))

    try {
      return await portalDb.deleteEadCourse(id)
    } catch (err) {
      console.warn('[PortalContext] Erro ao excluir curso EAD:', err)
      return false
    }
  }

  const enrollStudentsInEadCourse = async (
    courseId: string,
    studentIds: string[],
  ): Promise<boolean> => {
    setEadCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? { ...c, enrolledStudentIds: studentIds, updated: new Date().toISOString() }
          : c,
      ),
    )

    try {
      const updated = await portalDb.updateEadCourse(courseId, { enrolledStudentIds: studentIds })
      return Boolean(updated)
    } catch (err) {
      console.warn('[PortalContext] Erro ao matricular alunos no EAD:', err)
      return false
    }
  }

  const createEadLesson = async (
    data: Omit<EadLesson, 'id' | 'created' | 'updated'>,
  ): Promise<EadLesson | null> => {
    const tempId = `ead-les-${Date.now()}`
    const parsed = parseVideoUrl(data.videoUrl)
    const optimistic: EadLesson = {
      ...data,
      id: tempId,
      videoProvider: data.videoProvider || (parsed.provider as EadLesson['videoProvider']),
      videoEmbedId: data.videoEmbedId || parsed.embedId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    setEadLessons((prev) => [...prev, optimistic])

    try {
      const saved = await portalDb.createEadLesson(data)
      if (saved) {
        setEadLessons((prev) => prev.map((l) => (l.id === tempId ? saved : l)))
        return saved
      }
    } catch (err) {
      console.warn('[PortalContext] Erro ao criar aula EAD:', err)
    }
    return optimistic
  }

  const updateEadLesson = async (
    id: string,
    updates: Partial<Omit<EadLesson, 'id' | 'created' | 'updated'>>,
  ): Promise<EadLesson | null> => {
    setEadLessons((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates, updated: new Date().toISOString() } : l)),
    )

    try {
      const saved = await portalDb.updateEadLesson(id, updates)
      if (saved) {
        setEadLessons((prev) => prev.map((l) => (l.id === id ? saved : l)))
        return saved
      }
    } catch (err) {
      console.warn('[PortalContext] Erro ao atualizar aula EAD:', err)
    }
    return null
  }

  const deleteEadLesson = async (id: string): Promise<boolean> => {
    setEadLessons((prev) => prev.filter((l) => l.id !== id))

    try {
      return await portalDb.deleteEadLesson(id)
    } catch (err) {
      console.warn('[PortalContext] Erro ao excluir aula EAD:', err)
      return false
    }
  }

  const reorderEadLessons = async (orderedLessonIds: string[]): Promise<boolean> => {
    setEadLessons((prev) => {
      return prev.map((l) => {
        const idx = orderedLessonIds.indexOf(l.id)
        if (idx >= 0) {
          return { ...l, orderIndex: idx + 1 }
        }
        return l
      })
    })

    try {
      return await portalDb.reorderEadLessons(orderedLessonIds)
    } catch (err) {
      console.warn('[PortalContext] Erro ao reordenar aulas EAD:', err)
      return false
    }
  }

  // Diagnostic
  const refreshDiagnostic = () => {
    setDiagnostic((prev) => ({
      ...prev,
      buildTime: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' BRT',
      modulesStatus: prev.modulesStatus.map((m) => ({
        ...m,
        latencyMs: Math.floor(4 + Math.random() * 12),
      })),
    }))
  }

  // ---------- Biblioteca (Acervo & Empréstimos) ----------

  const createLibraryBook = async (
    data: Omit<LibraryBook, 'id' | 'availableCopies' | 'created' | 'updated'>,
  ): Promise<LibraryBook | null> => {
    const tempId = generateId()
    const optimistic: LibraryBook = {
      ...data,
      id: tempId,
      availableCopies: data.totalCopies,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    setLibraryBooks((prev) => [optimistic, ...prev])
    try {
      const saved = await portalDb.createLibraryBook(data)
      if (saved) {
        setLibraryBooks((prev) => prev.map((b) => (b.id === tempId ? saved : b)))
        return saved
      }
      return optimistic
    } catch {
      return optimistic
    }
  }

  const updateLibraryBook = async (
    id: string,
    updates: Partial<Omit<LibraryBook, 'id' | 'availableCopies' | 'created' | 'updated'>>,
  ): Promise<LibraryBook | null> => {
    setLibraryBooks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        const newTotal = updates.totalCopies !== undefined ? updates.totalCopies : b.totalCopies
        const activeLoans = libraryLoans.filter((l) => l.bookId === id && !l.returnedAt).length
        return {
          ...b,
          ...updates,
          totalCopies: newTotal,
          availableCopies: Math.max(0, newTotal - activeLoans),
          updated: new Date().toISOString(),
        }
      }),
    )
    try {
      const saved = await portalDb.updateLibraryBook(id, updates)
      if (saved) {
        setLibraryBooks((prev) =>
          prev.map((b) => {
            if (b.id !== id) return b
            const activeLoans = libraryLoans.filter((l) => l.bookId === id && !l.returnedAt).length
            return {
              ...saved,
              availableCopies: Math.max(0, saved.totalCopies - activeLoans),
            }
          }),
        )
        return saved
      }
      return null
    } catch {
      return null
    }
  }

  const deleteLibraryBook = async (id: string): Promise<boolean> => {
    const hasActiveLoan = libraryLoans.some((l) => l.bookId === id && !l.returnedAt)
    if (hasActiveLoan) {
      return false
    }
    setLibraryBooks((prev) => prev.filter((b) => b.id !== id))
    try {
      return await portalDb.deleteLibraryBook(id)
    } catch {
      return true
    }
  }

  const createLibraryLoan = async (data: {
    bookId: string
    studentId: string
    dueDate: string
    loanDate?: string
    notes?: string
  }): Promise<{ success: boolean; loan?: LibraryLoan; error?: string }> => {
    const book = libraryBooks.find((b) => b.id === data.bookId)
    if (!book) {
      return { success: false, error: 'Obra não encontrada no acervo.' }
    }
    if (book.availableCopies <= 0) {
      return {
        success: false,
        error: `Não há exemplares disponíveis de "${book.title}" no momento (${book.totalCopies} de ${book.totalCopies} emprestados).`,
      }
    }

    const student = students.find((s) => s.id === data.studentId)
    const effectiveLoanDate = data.loanDate || new Date().toISOString().slice(0, 10)
    const tempId = generateId()
    const optimistic: LibraryLoan = {
      id: tempId,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      studentId: data.studentId,
      studentName: student?.fullName || 'Aluno',
      studentCpf: student?.cpf,
      loanDate: effectiveLoanDate,
      dueDate: data.dueDate,
      renewals: 0,
      notes: data.notes,
      status: 'ativo',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    setLibraryLoans((prev) => [optimistic, ...prev])
    setLibraryBooks((prev) =>
      prev.map((b) =>
        b.id === book.id ? { ...b, availableCopies: Math.max(0, b.availableCopies - 1) } : b,
      ),
    )

    try {
      const saved = await portalDb.createLibraryLoan({
        bookId: book.id,
        bookTitle: book.title,
        studentId: data.studentId,
        studentName: student?.fullName,
        studentCpf: student?.cpf,
        loanDate: effectiveLoanDate,
        dueDate: data.dueDate,
        notes: data.notes,
      })
      if (saved) {
        setLibraryLoans((prev) => prev.map((l) => (l.id === tempId ? saved : l)))
        return { success: true, loan: saved }
      }
      return { success: true, loan: optimistic }
    } catch (err) {
      console.warn('[PortalContext] Erro ao criar empréstimo:', err)
      return { success: true, loan: optimistic }
    }
  }

  const returnLibraryLoan = async (
    loanId: string,
    returnDate?: string,
  ): Promise<{ success: boolean; loan?: LibraryLoan; error?: string }> => {
    const loan = libraryLoans.find((l) => l.id === loanId)
    if (!loan) {
      return { success: false, error: 'Empréstimo não encontrado.' }
    }
    if (loan.returnedAt) {
      return { success: false, error: 'Este empréstimo já foi devolvido anteriormente.' }
    }

    const isoDate = returnDate || new Date().toISOString().slice(0, 10)
    const updatedLoan: LibraryLoan = {
      ...loan,
      returnedAt: isoDate,
      status: 'devolvido',
      updated: new Date().toISOString(),
    }

    setLibraryLoans((prev) => prev.map((l) => (l.id === loanId ? updatedLoan : l)))
    setLibraryBooks((prev) =>
      prev.map((b) =>
        b.id === loan.bookId
          ? { ...b, availableCopies: Math.min(b.totalCopies, b.availableCopies + 1) }
          : b,
      ),
    )

    try {
      const saved = await portalDb.returnLibraryLoan(loanId, isoDate)
      if (saved) {
        setLibraryLoans((prev) => prev.map((l) => (l.id === loanId ? saved : l)))
        return { success: true, loan: saved }
      }
      return { success: true, loan: updatedLoan }
    } catch {
      return { success: true, loan: updatedLoan }
    }
  }

  const renewLibraryLoan = async (
    loanId: string,
    additionalDays = 7,
  ): Promise<{ success: boolean; loan?: LibraryLoan; error?: string }> => {
    const loan = libraryLoans.find((l) => l.id === loanId)
    if (!loan) {
      return { success: false, error: 'Empréstimo não encontrado.' }
    }
    if (loan.returnedAt) {
      return { success: false, error: 'Não é possível renovar um empréstimo já devolvido.' }
    }

    const baseDate = new Date(loan.dueDate + 'T12:00:00')
    baseDate.setDate(baseDate.getDate() + additionalDays)
    const newDueDate = baseDate.toISOString().slice(0, 10)
    const todayIso = new Date().toISOString().slice(0, 10)

    const updatedLoan: LibraryLoan = {
      ...loan,
      dueDate: newDueDate,
      renewals: loan.renewals + 1,
      status: newDueDate < todayIso ? 'atrasado' : 'ativo',
      updated: new Date().toISOString(),
    }

    setLibraryLoans((prev) => prev.map((l) => (l.id === loanId ? updatedLoan : l)))

    try {
      const saved = await portalDb.renewLibraryLoan(loanId, newDueDate, loan.renewals)
      if (saved) {
        setLibraryLoans((prev) => prev.map((l) => (l.id === loanId ? saved : l)))
        return { success: true, loan: saved }
      }
      return { success: true, loan: updatedLoan }
    } catch {
      return { success: true, loan: updatedLoan }
    }
  }

  const deleteLibraryLoan = async (id: string): Promise<boolean> => {
    const loan = libraryLoans.find((l) => l.id === id)
    setLibraryLoans((prev) => prev.filter((l) => l.id !== id))
    if (loan && !loan.returnedAt) {
      setLibraryBooks((prev) =>
        prev.map((b) =>
          b.id === loan.bookId
            ? { ...b, availableCopies: Math.min(b.totalCopies, b.availableCopies + 1) }
            : b,
        ),
      )
    }
    try {
      return await portalDb.deleteLibraryLoan(id)
    } catch {
      return true
    }
  }

  return (
    <PortalContext.Provider
      value={{
        isGateUnlocked,
        gateAttempts,
        isGateLockedOut,
        unlockGate,
        lockGate,
        currentUser,
        loginAttempts,
        isLoginLockedOut,
        login,
        logout,
        users,
        updateUserRole,
        createUser,
        requestPasswordResetEmail,
        confirmPasswordResetWithToken,
        canAccessModule,
        students,
        addStudent,
        createCharge,
        updateStudent,
        deleteStudent,
        searchStudentsByCpf,
        courses,
        toggleCourseLock,
        updateCourse,
        addCourse,
        charges,
        payChargePix,
        payChargeCard,
        priceTable,
        priceAuditLogs,
        updatePriceTableItem,
        billingExceptions,
        createBillingException,
        updateBillingExceptionStatus,
        tickets,
        addTicket,
        updateTicketStatus,
        lgpdRequests,
        addLgpdRequest,
        updateLgpdStatus,
        expenses,
        addExpense,
        deleteExpense,
        grades,
        attendance,
        addGrade,
        updateGrade,
        deleteGrade,
        addAttendance,
        updateAttendance,
        deleteAttendance,
        diagnostic,
        refreshDiagnostic,
        lessonProgress,
        courseMaterials,
        calendarEvents,
        studentNotifications,
        studentSupportTickets,
        updateLessonProgress,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        createStudentSupportTicket,
        updateStudentProfile,
        certificates,
        issueCertificate,
        revokeCertificate,
        getStudentCertificate,
        getStudentCertificates,
        eadCourses,
        eadLessons,
        createEadCourse,
        updateEadCourse,
        deleteEadCourse,
        enrollStudentsInEadCourse,
        createEadLesson,
        updateEadLesson,
        deleteEadLesson,
        reorderEadLessons,
        libraryBooks,
        libraryLoans,
        createLibraryBook,
        updateLibraryBook,
        deleteLibraryBook,
        createLibraryLoan,
        returnLibraryLoan,
        renewLibraryLoan,
        deleteLibraryLoan,
        isBackendReady,
        isSyncing,
      }}
    >
      {children}
    </PortalContext.Provider>
  )
}

export function usePortal() {
  const context = useContext(PortalContext)
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider')
  }
  return context
}
