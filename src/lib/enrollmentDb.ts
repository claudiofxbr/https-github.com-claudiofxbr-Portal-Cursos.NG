import { Enrollment, EnrollmentStatusEvent } from '@/types/portal'
import pb from '@/lib/pocketbase/client'
import { COLLECTIONS, AnyRec, str, num } from '@/lib/portalDb'

// Parse tolerante do histórico de status (json) gravado pela migração 0042
function parseStatusHistory(raw: unknown): EnrollmentStatusEvent[] | undefined {
  try {
    if (!raw) return undefined
    const arr: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(arr) || arr.length === 0) return undefined
    const events = arr
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map((e) => ({
        from: (typeof e.from === 'string' ? e.from : '') as EnrollmentStatusEvent['from'],
        to: (typeof e.to === 'string' ? e.to : '') as EnrollmentStatusEvent['to'],
        by: typeof e.by === 'string' ? e.by : '',
        at: typeof e.at === 'string' ? e.at : '',
        note: typeof e.note === 'string' && e.note ? e.note : undefined,
      }))
      .filter((e) => !!e.to)
    return events.length > 0 ? events : undefined
  } catch {
    return undefined
  }
}

// Mapeia um registro PocketBase da coleção course_enrollments para o tipo Enrollment
export function mapEnrollment(rec: AnyRec): Enrollment {
  return {
    id: str(rec.id),
    studentId: str(rec.studentId),
    studentName: str(rec.studentName),
    studentEmail: str(rec.studentEmail) || undefined,
    courseId: str(rec.courseId),
    courseCode: str(rec.courseCode),
    courseName: str(rec.courseName),
    courseLevel: (str(rec.courseLevel) || undefined) as Enrollment['courseLevel'],
    courseModality: (str(rec.courseModality) || undefined) as Enrollment['courseModality'],
    workloadHours: num(rec.workloadHours, 0),
    period: str(rec.period) || undefined,
    requestedPeriod: str(rec.requestedPeriod) || undefined,
    status: str(rec.status) as Enrollment['status'],
    requestedAt: str(rec.requestedAt),
    notes: str(rec.notes) || undefined,
    reviewedBy: str(rec.reviewedBy) || undefined,
    reviewedAt: str(rec.reviewedAt) || undefined,
    rejectionReason: str(rec.rejectionReason) || undefined,
    statusHistory: parseStatusHistory(rec.statusHistory),
    created: str(rec.created),
    updated: str(rec.updated),
  }
}

// Escrita tolerante: falha de rede/permissão não derruba o fluxo — a inscrição
// permanece no estado em memória (padrão dos demais módulos do portal).
async function safeWrite<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run()
  } catch (err) {
    console.warn('[enrollmentDb] falha ao gravar/ler inscrições:', err)
    return fallback
  }
}

export const enrollmentDb = {
  createEnrollment: (data: Omit<Enrollment, 'id' | 'created' | 'updated'>) =>
    safeWrite(
      async () => {
        const rec = await pb.collection(COLLECTIONS.courseEnrollments).create({
          studentId: data.studentId,
          studentName: data.studentName,
          studentEmail: data.studentEmail || '',
          courseId: data.courseId,
          courseCode: data.courseCode,
          courseName: data.courseName,
          courseLevel: data.courseLevel || '',
          courseModality: data.courseModality || '',
          workloadHours: data.workloadHours,
          period: data.period || '',
          requestedPeriod: data.requestedPeriod || '',
          status: data.status,
          requestedAt: data.requestedAt,
          notes: data.notes || '',
          reviewedBy: data.reviewedBy || '',
          reviewedAt: data.reviewedAt || '',
        })
        return mapEnrollment(rec as unknown as AnyRec)
      },
      null as Enrollment | null,
    ),

  listEnrollments: () =>
    safeWrite(async () => {
      const recs = await pb.collection(COLLECTIONS.courseEnrollments).getFullList({
        sort: '-created',
      })
      return recs.map((r) => mapEnrollment(r as unknown as AnyRec))
    }, [] as Enrollment[]),

  // Atualização de status pela equipe (root/admin/secretaria/matrícula):
  // grava status, motivo de recusa e o evento completo no histórico.
  updateEnrollmentStatus: (
    enrollmentId: string,
    data: {
      status: EnrollmentStatusEvent['to']
      rejectionReason?: string
      reviewedBy?: string
      reviewedAt?: string
      statusHistory?: EnrollmentStatusEvent[]
    },
  ) =>
    safeWrite(
      async () => {
        const payload: Record<string, unknown> = {
          status: data.status,
          reviewedBy: data.reviewedBy || '',
          reviewedAt: data.reviewedAt || '',
          rejectionReason: data.rejectionReason || '',
        }
        if (data.statusHistory) {
          payload.statusHistory = JSON.stringify(data.statusHistory)
        }
        const rec = await pb.collection(COLLECTIONS.courseEnrollments).update(enrollmentId, payload)
        return mapEnrollment(rec as unknown as AnyRec)
      },
      null as Enrollment | null,
    ),
}
