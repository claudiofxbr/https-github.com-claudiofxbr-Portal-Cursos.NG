import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import {
  UserAccount,
  UserRole,
  Student,
  Course,
  Charge,
  PriceTableItem,
  PriceAuditLog,
  BillingException,
  MaintenanceTicket,
  LgpdRequest,
  SystemDiagnostic,
  ModuleKey,
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
  INITIAL_DIAGNOSTIC,
} from '@/data/portalMockData'
import { generateId } from '@/lib/id'

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
  login: (email: string, password?: string) => boolean
  loginAsDemoRole: (role: UserRole) => void
  logout: () => void
  users: UserAccount[]
  updateUserRole: (userId: string, newRole: UserRole) => void
  createUser: (user: Omit<UserAccount, 'id' | 'createdAt'>) => void

  // Permissions
  canAccessModule: (module: ModuleKey) => boolean

  // Students & Matricula
  students: Student[]
  addStudent: (student: Omit<Student, 'id' | 'enrolledAt' | 'cpfRaw'>) => Student
  updateStudent: (studentId: string, updates: Partial<Student>) => void
  searchStudentsByCpf: (cpfQuery: string) => Student[]

  // Courses
  courses: Course[]
  toggleCourseLock: (courseId: string) => void
  updateCourse: (courseId: string, updates: Partial<Course>) => void
  addCourse: (course: Omit<Course, 'id' | 'enrolledCount'>) => void

  // Financial
  charges: Charge[]
  payChargePix: (chargeId: string) => void
  payChargeCard: (chargeId: string, cardInfo: { last4: string; holder: string }) => void
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

  // Diagnostic
  diagnostic: SystemDiagnostic
  refreshDiagnostic: () => void
}

const PortalContext = createContext<PortalContextType | undefined>(undefined)

const STORAGE_KEYS = {
  GATE: 'portalcursos_gate_unlocked',
  CURRENT_USER_ID: 'portalcursos_current_user_id',
  STUDENTS: 'portalcursos_students',
  COURSES: 'portalcursos_courses',
  CHARGES: 'portalcursos_charges',
  PRICES: 'portalcursos_prices',
  PRICE_LOGS: 'portalcursos_price_logs',
  EXCEPTIONS: 'portalcursos_exceptions',
  TICKETS: 'portalcursos_tickets',
  LGPD: 'portalcursos_lgpd',
  USERS: 'portalcursos_users',
  GATE_LOCK: 'portalcursos_gate_lock',
  LOGIN_LOCK: 'portalcursos_login_lock',
}

// Limites de bloqueio por tentativas falhas (portão e login)
const MAX_FAILED_ATTEMPTS = 4
const GATE_LOCKOUT_MS = 30_000 // 30s
const LOGIN_LOCKOUT_MS = 25_000 // 25s

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

  // Auth state
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const loaded = loadJsonState<UserAccount>(STORAGE_KEYS.USERS, DEMO_ACCOUNTS)
    return loaded.length > 0 ? loaded : DEMO_ACCOUNTS
  })
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    // Correção de falha de controle de acesso: antes, sem sessão salva o app
    // inicializava logado como ADMIN (DEMO_ACCOUNTS[1]) e qualquer id salvo
    // caía de volta no admin — burlando o login e o RBAC. Agora: sem sessão
    // válida, ninguém está logado.
    const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)
    if (!savedId) return null
    return users.find((u) => u.id === savedId) || null
  })
  const [loginLock, setLoginLock] = useState<LockState>(() =>
    loadLockState(STORAGE_KEYS.LOGIN_LOCK),
  )
  const loginAttempts = loginLock.attempts
  const isLoginLockedOut = loginLock.lockedUntil > Date.now()
  useLockExpiry(loginLock.lockedUntil, () => setLoginLock(UNLOCKED_LOCK))

  // Ref com a lista de usuários sempre atualizada: o login lido por closures
  // antigas (ex.: setTimeout do auto-login pós-cadastro) não via o usuário
  // recém-criado e o login automático falhava silenciosamente.
  const usersRef = useRef(users)
  usersRef.current = users

  // Domain states
  const [students, setStudents] = useState<Student[]>(() =>
    loadJsonState<Student>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS),
  )
  const [courses, setCourses] = useState<Course[]>(() =>
    loadJsonState<Course>(STORAGE_KEYS.COURSES, INITIAL_COURSES),
  )
  const [charges, setCharges] = useState<Charge[]>(() =>
    loadJsonState<Charge>(STORAGE_KEYS.CHARGES, INITIAL_CHARGES),
  )
  const [priceTable, setPriceTable] = useState<PriceTableItem[]>(() =>
    loadJsonState<PriceTableItem>(STORAGE_KEYS.PRICES, INITIAL_PRICE_TABLE),
  )
  const [priceAuditLogs, setPriceAuditLogs] = useState<PriceAuditLog[]>(() =>
    loadJsonState<PriceAuditLog>(STORAGE_KEYS.PRICE_LOGS, INITIAL_PRICE_AUDIT_LOGS),
  )
  const [billingExceptions, setBillingExceptions] = useState<BillingException[]>(() =>
    loadJsonState<BillingException>(STORAGE_KEYS.EXCEPTIONS, INITIAL_BILLING_EXCEPTIONS),
  )
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(() =>
    loadJsonState<MaintenanceTicket>(STORAGE_KEYS.TICKETS, INITIAL_TICKETS),
  )
  const [lgpdRequests, setLgpdRequests] = useState<LgpdRequest[]>(() =>
    loadJsonState<LgpdRequest>(STORAGE_KEYS.LGPD, INITIAL_LGPD_REQUESTS),
  )
  const [diagnostic, setDiagnostic] = useState<SystemDiagnostic>(INITIAL_DIAGNOSTIC)

  // Sync to local storage for realistic experience during session.
  // Toda escrita passa por persistJson (try/catch): quota cheia ou modo
  // privado não podem derrubar o app no meio de uma ação do usuário.
  useEffect(() => {
    persistJson(STORAGE_KEYS.GATE, isGateUnlocked)
  }, [isGateUnlocked])

  useEffect(() => {
    if (currentUser) {
      persistJson(STORAGE_KEYS.CURRENT_USER_ID, currentUser.id)
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID)
      } catch {
        // idem: falha de storage não derruba o logout
      }
    }
  }, [currentUser])

  useEffect(() => {
    persistJson(STORAGE_KEYS.STUDENTS, students)
  }, [students])

  useEffect(() => {
    persistJson(STORAGE_KEYS.COURSES, courses)
  }, [courses])

  useEffect(() => {
    persistJson(STORAGE_KEYS.CHARGES, charges)
  }, [charges])

  useEffect(() => {
    persistJson(STORAGE_KEYS.PRICES, priceTable)
  }, [priceTable])

  // Auditoria tarifária e exceções de cobrança persistem JUNTAS com a tabela:
  // antes só a tabela sobrevivia ao reload, quebrando a trilha de auditoria.
  useEffect(() => {
    persistJson(STORAGE_KEYS.PRICE_LOGS, priceAuditLogs)
  }, [priceAuditLogs])

  useEffect(() => {
    persistJson(STORAGE_KEYS.EXCEPTIONS, billingExceptions)
  }, [billingExceptions])

  // Estado de bloqueio (portão/login) persistido: reload não zera o lockout
  useEffect(() => {
    persistJson(STORAGE_KEYS.GATE_LOCK, gateLock)
  }, [gateLock])

  useEffect(() => {
    persistJson(STORAGE_KEYS.LOGIN_LOCK, loginLock)
  }, [loginLock])

  useEffect(() => {
    persistJson(STORAGE_KEYS.TICKETS, tickets)
  }, [tickets])

  useEffect(() => {
    persistJson(STORAGE_KEYS.LGPD, lgpdRequests)
  }, [lgpdRequests])

  useEffect(() => {
    persistJson(STORAGE_KEYS.USERS, users)
  }, [users])

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
  const login = (email: string): boolean => {
    if (isLoginLockedOut) return false

    const found = usersRef.current.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (found) {
      setCurrentUser(found)
      setLoginLock(UNLOCKED_LOCK)
      return true
    }

    const nextAttempts = loginAttempts + 1
    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      setLoginLock({ attempts: nextAttempts, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS })
    } else {
      setLoginLock({ attempts: nextAttempts, lockedUntil: 0 })
    }
    return false
  }

  const loginAsDemoRole = (role: UserRole) => {
    const found = users.find((u) => u.role === role) || DEMO_ACCOUNTS.find((u) => u.role === role)
    if (found) {
      setCurrentUser(found)
      setLoginLock(UNLOCKED_LOCK)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID)
    } catch {
      // idem
    }
  }

  const updateUserRole = (userId: string, newRole: UserRole) => {
    // Controle de escalonamento de privilégios: somente Root concede o papel
    // Root e somente Root altera contas Root (não bastava o check na UI).
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

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              role: newRole,
              roleTitle: roleLabels[newRole],
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
              roleTitle: roleLabels[newRole],
            }
          : null,
      )
    }
  }

  const createUser = (userData: Omit<UserAccount, 'id' | 'createdAt'>) => {
    const newUser: UserAccount = {
      ...userData,
      id: generateId('user'),
      createdAt: new Date().toISOString().split('T')[0],
      lastAccess: 'Nunca',
    }
    setUsers((prev) => [newUser, ...prev])
  }

  // Permission check
  const canAccessModule = (moduleKey: ModuleKey): boolean => {
    if (!currentUser) return false
    if (currentUser.role === 'root') return true // root pode tudo

    const moduleDef = MODULE_PERMISSIONS.find((m) => m.key === moduleKey)
    if (!moduleDef) return false

    return moduleDef.requiredRoles.includes(currentUser.role)
  }

  // Students & Matricula
  const addStudent = (studentData: Omit<Student, 'id' | 'enrolledAt' | 'cpfRaw'>): Student => {
    const rawCpf = (studentData.cpf || '').replace(/\D/g, '')
    const newStudent: Student = {
      ...studentData,
      id: generateId('std'),
      cpfRaw: rawCpf,
      enrolledAt: new Date().toISOString().split('T')[0],
    }

    setStudents((prev) => [newStudent, ...prev])

    // Se houver curso correspondente, atualiza contador de inscritos
    setCourses((prev) =>
      prev.map((c) =>
        c.id === newStudent.courseId ? { ...c, enrolledCount: c.enrolledCount + 1 } : c,
      ),
    )

    // Cria cobrança de matrícula inicial automática
    const newCharge: Charge = {
      id: generateId('chg'),
      code: `COB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      studentCpf: newStudent.cpf,
      category: 'matricula',
      description: `Taxa de Matrícula Inicial - ${newStudent.courseName}`,
      amount: newStudent.type === 'graduacao' ? 350 : 290,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pendente',
      pixCode: `00020126580014br.gov.bcb.pix0136cob-portalcursos-std-${newStudent.id}520400005303986540${newStudent.type === 'graduacao' ? '350.00' : '290.00'}5802BR5924PORTALCURSOS NG ENSINO6009SAO PAULO62070503***6304XXXX`,
      pixQrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=portalcursos_pix_${newStudent.id}`,
    }
    setCharges((prev) => [newCharge, ...prev])

    return newStudent
  }

  const updateStudent = (studentId: string, updates: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s
        const nextCpf = updates.cpf ? updates.cpf : s.cpf
        const rawCpf = nextCpf.replace(/\D/g, '')
        return {
          ...s,
          ...updates,
          cpfRaw: rawCpf,
        }
      }),
    )
  }

  const searchStudentsByCpf = (cpfQuery: string): Student[] => {
    const clean = cpfQuery.replace(/\D/g, '')
    if (!clean) return students
    return students.filter((s) => s.cpfRaw.includes(clean) || s.cpf.includes(cpfQuery))
  }

  // Courses
  const toggleCourseLock = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, lockedForEditing: !c.lockedForEditing } : c)),
    )
  }

  const updateCourse = (courseId: string, updates: Partial<Course>) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c
        if (c.lockedForEditing && currentUser?.role !== 'root') {
          // Apenas root pode burlar trava de edição
          return c
        }
        return { ...c, ...updates }
      }),
    )
  }

  const addCourse = (courseData: Omit<Course, 'id' | 'enrolledCount'>) => {
    const newCourse: Course = {
      ...courseData,
      id: generateId('crs'),
      enrolledCount: 0,
    }
    setCourses((prev) => [newCourse, ...prev])
  }

  // Financial
  const payChargePix = (chargeId: string) => {
    setCharges((prev) =>
      prev.map((chg) =>
        chg.id === chargeId
          ? {
              ...chg,
              status: 'pago',
              method: 'pix',
              paidAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
              receiptNumber: generateId('REC'),
            }
          : chg,
      ),
    )
  }

  const payChargeCard = (chargeId: string, _cardInfo: { last4: string; holder: string }) => {
    setCharges((prev) =>
      prev.map((chg) =>
        chg.id === chargeId
          ? {
              ...chg,
              status: 'pago',
              method: 'cartao',
              paidAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
              receiptNumber: generateId('REC-CARD'),
            }
          : chg,
      ),
    )
  }

  const updatePriceTableItem = (id: string, updates: Partial<PriceTableItem>, reason: string) => {
    const currentItem = priceTable.find((p) => p.id === id)
    if (!currentItem) return

    // Sanitiza valores monetários: NaN/undefined/negativos não podem corromper
    // a tabela nem os registros de auditoria (ex.: "R$ NaN").
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

    // Registra auditoria
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
  }

  const updateBillingExceptionStatus = (id: string, status: 'aprovado' | 'rejeitado') => {
    setBillingExceptions((prev) =>
      prev.map((exc) =>
        exc.id === id
          ? {
              ...exc,
              status,
              approvedBy: currentUser?.name || 'Diretoria Financeira',
            }
          : exc,
      ),
    )
  }

  // Maintenance
  const addTicket = (ticketData: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'status'>) => {
    const newTicket: MaintenanceTicket = {
      ...ticketData,
      id: generateId('tkt'),
      status: 'aberto',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    }
    setTickets((prev) => [newTicket, ...prev])
  }

  const updateTicketStatus = (id: string, status: MaintenanceTicket['status']) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              resolvedAt:
                status === 'concluido'
                  ? new Date().toISOString().replace('T', ' ').slice(0, 16)
                  : t.resolvedAt,
            }
          : t,
      ),
    )
  }

  // LGPD
  const addLgpdRequest = (reqData: Omit<LgpdRequest, 'id' | 'createdAt'>) => {
    const newReq: LgpdRequest = {
      ...reqData,
      id: generateId('lgpd'),
      createdAt: new Date().toISOString().split('T')[0],
    }
    setLgpdRequests((prev) => [newReq, ...prev])
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
        loginAsDemoRole,
        logout,
        users,
        updateUserRole,
        createUser,
        canAccessModule,
        students,
        addStudent,
        updateStudent,
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
        diagnostic,
        refreshDiagnostic,
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
