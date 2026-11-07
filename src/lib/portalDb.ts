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
} from '@/types/portal'
import {
  DEMO_ACCOUNTS,
  INITIAL_COURSES,
  INITIAL_CHARGES,
  INITIAL_PRICE_TABLE,
  INITIAL_PRICE_AUDIT_LOGS,
  INITIAL_BILLING_EXCEPTIONS,
  INITIAL_TICKETS,
  INITIAL_LGPD_REQUESTS,
  INITIAL_STUDENTS,
} from '@/data/portalMockData'

const COLLECTIONS = {
  students: 'students',
  courses: 'courses',
  charges: 'charges',
  prices: 'price_table_items',
  priceLogs: 'price_audit_logs',
  exceptions: 'billing_exceptions',
  tickets: 'maintenance_tickets',
  lgpd: 'lgpd_requests',
} as const

// Conta compartilhada de demonstração usada pela app para autenticar no
// PocketBase (criada pela migration). As credenciais são públicas por design:
// o acesso dos 9 perfis continua client-side, como na demo.
const DEMO_AUTH = {
  identity: 'portal@portalcursos.ng',
  password: 'PortalCursos#2025',
}

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

let authPromise: Promise<void> | null = null

// Autentica a app no PocketBase com a conta demo compartilhada e renova a
// sessão quando expira (as chamadas subsequentes reutilizam o token em cache).
export function ensureAuth(): Promise<void> {
  if (!authPromise) {
    authPromise = pb
      .collection('users')
      .authWithPassword(DEMO_AUTH.identity, DEMO_AUTH.password)
      .then(() => undefined)
      .catch((err) => {
        // Permite nova tentativa no próximo load (rede instável, backend fora).
        authPromise = null
        throw err
      })
  }
  return authPromise
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
          await Promise.all(
            rows.map((row) => pb.collection(collection).create({ id: row.id, ...map(row) })),
          )
        } catch (e) {
          console.warn(`[portalDb] seed ${collection}:`, e)
        }
      }

      await Promise.all([
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

type AnyRec = Record<string, unknown>

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

// ---------- loaders ----------

// Carrega todos os dados do banco (com seed inicial em coleções vazias).
// Cada loader tem fallback local: banco indisponível não pode derrubar o app.
export async function loadAllData(): Promise<{
  students: Student[]
  courses: Course[]
  charges: Charge[]
  priceTable: PriceTableItem[]
  priceAuditLogs: PriceAuditLog[]
  billingExceptions: BillingException[]
  tickets: MaintenanceTicket[]
  lgpdRequests: LgpdRequest[]
}> {
  await ensureAuth()
  await seedIfEmpty()

  const [
    students,
    courses,
    charges,
    priceTable,
    priceAuditLogs,
    billingExceptions,
    tickets,
    lgpdRequests,
  ] = await Promise.all([
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
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.charges).getFullList({ sort: '-created' })).map(mapCharge),
      INITIAL_CHARGES,
    ),
    safeList(
      async () => (await pb.collection(COLLECTIONS.prices).getFullList()).map(mapPriceItem),
      INITIAL_PRICE_TABLE,
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.priceLogs).getFullList({ sort: '-created' })).map(
          mapPriceLog,
        ),
      INITIAL_PRICE_AUDIT_LOGS,
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.exceptions).getFullList({ sort: '-created' })).map(
          mapException,
        ),
      INITIAL_BILLING_EXCEPTIONS,
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.tickets).getFullList({ sort: '-created' })).map(mapTicket),
      INITIAL_TICKETS,
    ),
    safeList(
      async () =>
        (await pb.collection(COLLECTIONS.lgpd).getFullList({ sort: '-created' })).map(mapLgpd),
      INITIAL_LGPD_REQUESTS,
    ),
  ])

  return {
    students,
    courses,
    charges,
    priceTable,
    priceAuditLogs,
    billingExceptions,
    tickets,
    lgpdRequests,
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
        if (updates.cpf !== undefined) payload.cpf = updates.cpf
        if (updates.cpfRaw !== undefined) payload.cpfRaw = updates.cpfRaw
        if (updates.email !== undefined) payload.email = updates.email
        if (updates.phone !== undefined) payload.phone = updates.phone
        if (updates.status !== undefined) payload.status = updates.status
        if (updates.observations !== undefined) payload.observations = updates.observations
        if (updates.documents !== undefined) {
          payload.documents = JSON.stringify(
            updates.documents.map(({ pendingFile: _f, ...rest }) => rest),
          )
        }
        const rec = await pb.collection(COLLECTIONS.students).update(studentId, payload)
        return mapStudent(rec as unknown as AnyRec)
      },
      null as Student | null,
    ),

  updateCourse: (courseId: string, updates: Partial<Course>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = { ...updates, type: undefined }
        const rec = await pb.collection(COLLECTIONS.courses).update(courseId, payload)
        return mapCourse(rec as unknown as AnyRec)
      },
      null as Course | null,
    ),

  createCharge: (charge: Charge) =>
    safeWrite(
      async () => {
        const rec = await pb.collection(COLLECTIONS.charges).create(
          buildFormData({
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
          }),
        )
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
        const rec = await pb.collection(COLLECTIONS.charges).update(chargeId, payload)
        return mapCharge(rec as unknown as AnyRec)
      },
      null as Charge | null,
    ),

  updatePriceItem: (itemId: string, updates: Partial<PriceTableItem>) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {}
        if (updates.standardMonthlyFee !== undefined)
          payload.standardMonthlyFee = updates.standardMonthlyFee
        if (updates.enrollmentFee !== undefined) payload.enrollmentFee = updates.enrollmentFee
        if (updates.lateFeePercentage !== undefined)
          payload.lateFeePercentage = updates.lateFeePercentage
        if (updates.updatedAt !== undefined) payload.updatedAt = updates.updatedAt
        if (updates.updatedBy !== undefined) payload.updatedBy = updates.updatedBy
        const rec = await pb.collection(COLLECTIONS.prices).update(itemId, payload)
        return mapPriceItem(rec as unknown as AnyRec)
      },
      null as PriceTableItem | null,
    ),

  createPriceLog: (log: PriceAuditLog) =>
    safeWrite(
      async () => {
        const rec = await pb.collection(COLLECTIONS.priceLogs).create({
          timestamp: log.timestamp,
          userName: log.userName,
          userRole: log.userRole,
          changeSummary: log.changeSummary,
          previousValue: log.previousValue,
          newValue: log.newValue,
        })
        return mapPriceLog(rec as unknown as AnyRec)
      },
      null as PriceAuditLog | null,
    ),

  createException: (exc: BillingException) =>
    safeWrite(
      async () => {
        const rec = await pb.collection(COLLECTIONS.exceptions).create({
          studentId: exc.studentId,
          studentName: exc.studentName,
          reason: exc.reason,
          discountPercentage: exc.discountPercentage,
          justification: exc.justification,
          requestedBy: exc.requestedBy,
          approvedBy: exc.approvedBy || '',
          status: exc.status,
          createdAt: exc.createdAt,
        })
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
        const rec = await pb.collection(COLLECTIONS.exceptions).update(excId, payload)
        return mapException(rec as unknown as AnyRec)
      },
      null as BillingException | null,
    ),

  createTicket: (ticket: MaintenanceTicket) =>
    safeWrite(
      async () => {
        const rec = await pb.collection(COLLECTIONS.tickets).create(
          buildFormData({
            title: ticket.title,
            description: ticket.description,
            location: ticket.location,
            priority: ticket.priority,
            status: ticket.status,
            category: ticket.category,
            reporterName: ticket.reporterName,
            reporterRole: ticket.reporterRole,
            assignedTo: ticket.assignedTo || '',
            // Se houver arquivo real, o backend gera a URL; senão mantém a demo.
            photoUrls: ticket.photoFiles?.length ? '' : JSON.stringify(ticket.photoUrls),
            photo: ticket.photoFiles?.[0],
            createdAt: ticket.createdAt,
            resolvedAt: ticket.resolvedAt || '',
          }),
        )
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
        const rec = await pb.collection(COLLECTIONS.tickets).update(ticketId, payload)
        return mapTicket(rec as unknown as AnyRec)
      },
      null as MaintenanceTicket | null,
    ),

  createLgpdRequest: (req: LgpdRequest) =>
    safeWrite(
      async () => {
        const rec = await pb.collection(COLLECTIONS.lgpd).create({
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
        })
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
        const rec = await pb.collection(COLLECTIONS.lgpd).update(reqId, payload)
        return mapLgpd(rec as unknown as AnyRec)
      },
      null as LgpdRequest | null,
    ),
}
