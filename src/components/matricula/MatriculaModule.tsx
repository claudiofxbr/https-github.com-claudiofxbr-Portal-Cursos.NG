import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { generateId } from '@/lib/id'
import { Student, StudentDocument, PriceTableItem, ModuleKey } from '@/types/portal'
import { MatriculaCheckoutStep, StudentFormData, PaymentOutcome } from './MatriculaCheckoutStep'
import { MatriculaSuccessStep } from './MatriculaSuccessStep'
import { findPriceForCourse, MatchedPrice } from './matriculaPriceHelper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  GraduationCap,
  Search,
  Upload,
  UserPlus,
  Camera,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  IdCard,
  ArrowRight,
} from 'lucide-react'

const statusColor: Record<string, string> = {
  matriculado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pre_matricula: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  trancado: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  concluido: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
}

const docStatusIcon = {
  pendente: <Clock className="w-3 h-3 text-amber-400" />,
  aprovado: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  rejeitado: <XCircle className="w-3 h-3 text-rose-400" />,
}

interface MatriculaModuleProps {
  onNavigateToModule?: (module: ModuleKey) => void
}

export function MatriculaModule({ onNavigateToModule }: MatriculaModuleProps = {}) {
  const {
    students,
    courses,
    priceTable,
    addStudent,
    searchStudentsByCpf,
    updateStudent,
    currentUser,
  } = usePortal()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'listagem' | 'nova'>('listagem')
  const [cpfQuery, setCpfQuery] = useState('')

  // Sub-etapas do fluxo de Nova Matrícula: dados -> checkout -> confirmacao
  const [enrollmentStep, setEnrollmentStep] = useState<'form' | 'checkout' | 'success'>('form')
  const [pendingStudentData, setPendingStudentData] = useState<StudentFormData | null>(null)
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null)
  const [lastPaymentOutcome, setLastPaymentOutcome] = useState<PaymentOutcome | null>(null)
  const [manualPriceOverride, setManualPriceOverride] = useState<PriceTableItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCpf, setFormCpf] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formBirth, setFormBirth] = useState('')
  const [formType, setFormType] = useState<'graduacao' | 'pos_graduacao'>('graduacao')
  const [formCourse, setFormCourse] = useState('')
  const [formCity, setFormCity] = useState('')
  const [formState, setFormState] = useState('')
  const [formStreet, setFormStreet] = useState('')
  const [formZip, setFormZip] = useState('')
  const [formObs, setFormObs] = useState('')
  const [formPhoto, setFormPhoto] = useState<string | null>(null)
  // Arquivo original da foto (enviado ao banco, não só o preview base64).
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null)
  const [formDocs, setFormDocs] = useState<StudentDocument[]>([])

  const filteredStudents = cpfQuery ? searchStudentsByCpf(cpfQuery) : students
  const coursesForType = courses.filter(
    (c) => c.level === (formType === 'graduacao' ? 'graduacao' : 'pos_graduacao'),
  )

  const resetForm = () => {
    setFormName('')
    setFormCpf('')
    setFormEmail('')
    setFormPhone('')
    setFormBirth('')
    setFormType('graduacao')
    setFormCourse('')
    setFormCity('')
    setFormState('')
    setFormStreet('')
    setFormZip('')
    setFormObs('')
    setFormPhoto(null)
    setFormPhotoFile(null)
    setFormDocs([])
    setPendingStudentData(null)
    setCreatedStudent(null)
    setLastPaymentOutcome(null)
    setManualPriceOverride(null)
    setEnrollmentStep('form')
  }

  // Preço calculado da tabela conforme o curso selecionado
  const selectedCourseObj = courses.find((c) => c.id === formCourse)
  const defaultMatchedPrice = findPriceForCourse(selectedCourseObj, formType, priceTable)

  const activeMatchedPrice: MatchedPrice | null = manualPriceOverride
    ? {
        item: manualPriceOverride,
        suggestedFee: manualPriceOverride.enrollmentFee,
        monthlyFee: manualPriceOverride.standardMonthlyFee,
        isExactCategoryMatch: true,
      }
    : defaultMatchedPrice

  // Formatação de CPF (000.000.000-00)
  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    let out = digits
    if (digits.length > 9)
      out = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    else if (digits.length > 6)
      out = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    else if (digits.length > 3) out = `${digits.slice(0, 3)}.${digits.slice(3)}`
    return out
  }

  // Limites de upload (demonstração, mas com validação real no cliente):
  // foto 3x4 até 2 MB; documentos até 5 MB cada.
  const MAX_PHOTO_BYTES = 2 * 1024 * 1024
  const MAX_DOC_BYTES = 5 * 1024 * 1024
  const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const ACCEPTED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

  const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace('.0', '')} MB`

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast({
        title: 'Formato de foto não suportado',
        description: 'Envie a foto 3x4 em JPG, PNG ou WEBP.',
        variant: 'destructive',
      })
      return
    }

    if (file.size > MAX_PHOTO_BYTES) {
      toast({
        title: 'Foto muito grande',
        description: `A foto 3x4 deve ter até ${formatBytes(MAX_PHOTO_BYTES)} (arquivo: ${formatBytes(file.size)}).`,
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFormPhoto(reader.result as string)
      setFormPhotoFile(file)
      toast({
        title: 'Foto carregada',
        description: `${file.name} anexado à matrícula.`,
      })
    }
    reader.onerror = () => {
      toast({
        title: 'Erro ao ler a foto',
        description: 'Não foi possível processar o arquivo. Tente novamente.',
        variant: 'destructive',
      })
    }
    reader.readAsDataURL(file)
  }

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    const validDocs: StudentDocument[] = []
    let rejected = 0

    files.forEach((file) => {
      if (!ACCEPTED_DOC_TYPES.includes(file.type) || file.size > MAX_DOC_BYTES) {
        rejected += 1
        return
      }

      validDocs.push({
        id: generateId('doc'),
        name: file.name,
        type: 'outro',
        fileUrl: '#',
        fileName: file.name,
        uploadedAt: new Date().toISOString().split('T')[0],
        status: 'pendente',
        pendingFile: file,
      })
    })

    if (validDocs.length > 0) {
      setFormDocs((prev) => [...prev, ...validDocs])
    }

    if (rejected > 0) {
      toast({
        title: 'Alguns documentos foram recusados',
        description: `Cada documento deve ter até ${formatBytes(MAX_DOC_BYTES)} e ser PDF, JPG, PNG ou WEBP. ${rejected} arquivo(s) fora dos limites.`,
        variant: 'destructive',
      })
    }

    if (validDocs.length > 0) {
      toast({
        title: 'Documentos anexados',
        description: `${validDocs.length} arquivo(s) aguardando validação pela secretaria.`,
      })
    }
  }

  // Valida formulário e avança para a etapa final de pagamento
  const handleProceedToCheckout = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formName || !formCpf || !formEmail || !formCourse) {
      toast({
        title: 'Formulário incompleto',
        description: 'Preencha nome, CPF, e-mail e curso para prosseguir.',
        variant: 'destructive',
      })
      return
    }

    if (formCpf.replace(/\D/g, '').length !== 11) {
      toast({
        title: 'CPF inválido',
        description: 'Informe um CPF com 11 dígitos para a busca normalizada.',
        variant: 'destructive',
      })
      return
    }

    const selectedCourse = courses.find((c) => c.id === formCourse)
    if (!selectedCourse) {
      toast({
        title: 'Curso inválido',
        description: 'Selecione um curso válido do catálogo e-MEC.',
        variant: 'destructive',
      })
      return
    }

    const studentData: StudentFormData = {
      fullName: formName,
      cpf: formatCpf(formCpf),
      email: formEmail,
      phone: formPhone,
      birthDate: formBirth || '2000-01-01',
      type: formType,
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      address: {
        street: formStreet,
        city: formCity,
        state: formState,
        zip: formZip,
      },
      photoUrl: formPhoto || 'https://img.usecurling.com/ppl/medium?gender=male&seed=500',
      photoFile: formPhotoFile || undefined,
      documents: formDocs,
      observations: formObs,
    }

    setPendingStudentData(studentData)
    setEnrollmentStep('checkout')
  }

  // Ao confirmar o pagamento no checkout demonstrativo (Pix, Cartão ou Depois)
  const handleConfirmCheckout = async (outcome: PaymentOutcome) => {
    if (!pendingStudentData) return

    setIsSubmitting(true)
    try {
      const studentPayload: Omit<Student, 'id' | 'enrolledAt' | 'cpfRaw'> = {
        fullName: pendingStudentData.fullName,
        cpf: pendingStudentData.cpf,
        email: pendingStudentData.email,
        phone: pendingStudentData.phone,
        type: pendingStudentData.type,
        courseId: pendingStudentData.courseId,
        courseName: pendingStudentData.courseName,
        photoUrl: pendingStudentData.photoUrl,
        photoFile: pendingStudentData.photoFile,
        birthDate: pendingStudentData.birthDate,
        address: pendingStudentData.address,
        status: outcome.status === 'pago' ? 'matriculado' : 'pre_matricula',
        documents: pendingStudentData.documents,
        observations: pendingStudentData.observations,
      }

      const chargeOptions = {
        amount: outcome.amount,
        category: 'matricula' as const,
        description: `Taxa de Matrícula - ${pendingStudentData.courseName}${outcome.priceCategory ? ` (${outcome.priceCategory})` : ''}`,
        status: outcome.status,
        method: outcome.method,
        paidAt: outcome.paidAt,
        receiptNumber: outcome.receiptNumber,
        priceCategory: outcome.priceCategory,
        pixCode: outcome.pixCode,
        pixQrUrl: outcome.pixQrUrl,
        cardLast4: outcome.cardLast4,
        cardBrand: outcome.cardBrand,
        installments: outcome.installments,
        skipCharge: false,
      }

      const created = await addStudent(studentPayload, chargeOptions)

      setCreatedStudent(created)
      setLastPaymentOutcome(outcome)
      setEnrollmentStep('success')

      if (outcome.status === 'pago') {
        toast({
          title: 'Matrícula confirmada e paga!',
          description: `Pagamento simulado via cartão aprovado. Recibo: ${outcome.receiptNumber}. Aluno matriculado com sucesso!`,
        })
      } else if (outcome.type === 'pix') {
        toast({
          title: 'Matrícula registrada com Pix pendente',
          description: 'A cobrança foi criada no módulo Financeiro e aguarda baixa/confirmação.',
        })
      } else {
        toast({
          title: 'Pré-matrícula registrada!',
          description: 'Cobrança de matrícula gerada para acerto posterior pela secretaria.',
        })
      }
    } catch (err) {
      console.error('[MatriculaModule] Erro ao concluir matrícula:', err)
      toast({
        title: 'Erro ao concluir matrícula',
        description: 'Ocorreu uma falha ao persistir a matrícula. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-400" />
            Matrículas & Alunos
          </h1>
          <p className="text-xs text-slate-400">
            Graduação e Pós-Graduação com envio de documentos e foto • Perfil: {currentUser?.role}
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit text-xs border-blue-500/40 text-blue-400 bg-blue-950/40"
        >
          {students.length} alunos no acervo
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-slate-900 border border-slate-800 grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="listagem" className="text-xs">
            Alunos Matriculados ({students.length})
          </TabsTrigger>
          <TabsTrigger value="nova" className="text-xs">
            Nova Matrícula (Grad/Pós)
          </TabsTrigger>
        </TabsList>

        {/* LISTAGEM + BUSCA POR CPF NORMALIZADO */}
        <TabsContent value="listagem" className="space-y-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar aluno por CPF (normalizado: só dígitos, sem pontos)"
              value={cpfQuery}
              onChange={(e) => setCpfQuery(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-700 text-white text-sm placeholder:text-slate-500"
            />
          </div>
          {cpfQuery && (
            <p className="text-[11px] text-slate-500">
              Filtrando por CPF normalizado:{' '}
              <span className="font-mono text-blue-400">{cpfQuery.replace(/\D/g, '')}</span> —{' '}
              {filteredStudents.length} resultado(s)
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="bg-slate-900/60 border-slate-800 text-slate-100">
                <CardContent className="p-4 flex gap-4">
                  <Avatar className="w-14 h-14 border border-slate-700 shrink-0">
                    <AvatarImage src={student.photoUrl} alt={student.fullName} />
                    <AvatarFallback className="bg-slate-800 text-white">
                      {student.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {student.fullName}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${statusColor[student.status]}`}
                      >
                        {student.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                      <span className="font-mono text-slate-300">CPF: {student.cpf}</span>
                      <span>{student.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-indigo-500/15 text-indigo-300"
                      >
                        {student.type === 'graduacao' ? 'Graduação' : 'Pós-Graduação'}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-slate-800 text-slate-300"
                      >
                        {student.courseName}
                      </Badge>
                    </div>

                    {/* Documentos */}
                    <div className="pt-1.5 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Documentos ({student.documents.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {student.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[10px]"
                          >
                            {docStatusIcon[doc.status]}
                            <span className="text-slate-300 truncate max-w-[110px]">
                              {doc.name}
                            </span>
                          </div>
                        ))}
                        {student.documents.length === 0 && (
                          <span className="text-[10px] text-slate-500">
                            Nenhum documento enviado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações secretaria */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {student.status === 'pre_matricula' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            updateStudent(student.id, { status: 'matriculado' })
                            toast({
                              title: 'Matrícula confirmada!',
                              description: `${student.fullName} agora está matriculado(a).`,
                            })
                          }}
                          className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Confirmar Matrícula
                        </Button>
                      )}
                      {student.status === 'matriculado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateStudent(student.id, { status: 'trancado' })
                            toast({
                              title: 'Matrícula trancada',
                              description: `${student.fullName} está em trancamento acadêmico.`,
                            })
                          }}
                          className="h-7 text-[11px] border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          Trancar Matrícula
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-400 border border-dashed border-slate-800 rounded-xl">
              Nenhum aluno encontrado com este CPF. Limpe a busca para ver todos.
            </div>
          )}
        </TabsContent>

        {/* NOVA MATRÍCULA */}
        <TabsContent value="nova" className="mt-4">
          {enrollmentStep === 'success' && createdStudent ? (
            <MatriculaSuccessStep
              student={createdStudent}
              paymentOutcome={lastPaymentOutcome}
              onReset={() => {
                resetForm()
                setActiveTab('listagem')
              }}
              onNavigateToStudents={
                onNavigateToModule ? () => onNavigateToModule('alunos') : undefined
              }
              onNavigateToFinancial={
                onNavigateToModule ? () => onNavigateToModule('financeiro') : undefined
              }
            />
          ) : enrollmentStep === 'checkout' && pendingStudentData ? (
            <MatriculaCheckoutStep
              formData={pendingStudentData}
              selectedCourse={selectedCourseObj}
              matchedPrice={activeMatchedPrice}
              priceTable={priceTable}
              onSelectPriceItem={(item) => setManualPriceOverride(item)}
              onConfirmPayment={handleConfirmCheckout}
              onBack={() => setEnrollmentStep('form')}
              isSubmitting={isSubmitting}
            />
          ) : (
            <form onSubmit={handleProceedToCheckout} className="space-y-4">
              <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-400" />
                    Dados Pessoais do Ingressante
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Graduação ou Pós-Graduação — o CPF é normalizado (apenas dígitos) para busca e
                    cobrança
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Nome Completo *</label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="ex: Marcos Aurélio Ribeiro"
                      className="bg-slate-950 border-slate-700 text-white text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">CPF *</label>
                    <Input
                      value={formCpf}
                      onChange={(e) => setFormCpf(formatCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      className="bg-slate-950 border-slate-700 text-white text-sm font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">E-mail *</label>
                    <Input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="aluno@exemplo.com.br"
                      className="bg-slate-950 border-slate-700 text-white text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Telefone</label>
                    <Input
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="(11) 90000-0000"
                      className="bg-slate-950 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Data de Nascimento</label>
                    <Input
                      type="date"
                      value={formBirth}
                      onChange={(e) => setFormBirth(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Tipo de Ingresso *</label>
                    <Select
                      value={formType}
                      onValueChange={(v) => {
                        setFormType(v as any)
                        setFormCourse('')
                      }}
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-700 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        <SelectItem value="graduacao">Graduação</SelectItem>
                        <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs text-slate-300">Curso de Destino *</label>
                    <Select value={formCourse} onValueChange={setFormCourse}>
                      <SelectTrigger className="bg-slate-950 border-slate-700 text-white text-sm">
                        <SelectValue placeholder="Selecione o curso" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-60">
                        {coursesForType.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name} ({course.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Endereço */}
              <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    Endereço de Contato
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Comprovante de residência pode ser anexado nos documentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs text-slate-300">Logradouro</label>
                    <Input
                      value={formStreet}
                      onChange={(e) => setFormStreet(e.target.value)}
                      placeholder="Rua, Avenida, número, bairro"
                      className="bg-slate-950 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Cidade</label>
                    <Input
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="ex: São Paulo"
                      className="bg-slate-950 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Estado (UF)</label>
                    <Input
                      value={formState}
                      onChange={(e) => setFormState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="ex: SP"
                      className="bg-slate-950 border-slate-700 text-white text-sm uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">CEP</label>
                    <Input
                      value={formZip}
                      onChange={(e) => setFormZip(e.target.value)}
                      placeholder="00000-000"
                      className="bg-slate-950 border-slate-700 text-white text-sm font-mono"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Upload de Foto & Documentos */}
              <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    Foto do Aluno & Documentos Obrigatórios
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Os arquivos são lidos no navegador (base64/locais) e ficam pendentes de
                    validação da secretaria
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Foto */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-400" /> Foto 3x4 do Aluno
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg border border-slate-700 bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
                        {formPhoto ? (
                          <img
                            src={formPhoto}
                            alt="Prévia"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <IdCard className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <span className="flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-dashed border-slate-600 bg-slate-950 text-xs text-slate-300 hover:bg-slate-900 hover:border-blue-500 transition-colors">
                          <Camera className="w-3.5 h-3.5" />
                          {formPhoto ? 'Trocar foto' : 'Enviar foto'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Docs */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" /> Documentos (RG,
                      Histórico, Diploma)
                    </label>
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleDocUpload}
                        className="hidden"
                      />
                      <span className="flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-dashed border-slate-600 bg-slate-950 text-xs text-slate-300 hover:bg-slate-900 hover:border-emerald-500 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        Adicionar arquivos
                      </span>
                    </label>
                    {formDocs.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {formDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-[11px]"
                          >
                            <span className="truncate text-slate-300">{doc.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {docStatusIcon[doc.status]}
                              <button
                                type="button"
                                onClick={() =>
                                  setFormDocs((prev) => prev.filter((d) => d.id !== doc.id))
                                }
                                className="text-slate-500 hover:text-rose-400 text-xs px-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs text-slate-300">Observações da Matrícula</label>
                    <textarea
                      value={formObs}
                      onChange={(e) => setFormObs(e.target.value)}
                      placeholder="Informações adicionais: bolsas, transferência, necessidades especiais..."
                      rows={2}
                      className="w-full rounded-md bg-slate-950 border border-slate-700 text-white text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 pb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-sm"
                >
                  Limpar Formulário
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-6"
                >
                  Avançar para Pagamento & Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
