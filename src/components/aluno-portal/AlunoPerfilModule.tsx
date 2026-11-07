import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  GraduationCap,
  Sparkles,
} from 'lucide-react'

export function AlunoPerfilModule() {
  const { currentUser, students, courses, updateStudentProfile } = usePortal()

  const currentStudent =
    students.find(
      (s) =>
        (currentUser?.studentId && s.id === currentUser.studentId) ||
        (currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()),
    ) || students[0]

  // Estado editável do perfil do aluno
  const [fullName, setFullName] = useState(
    currentUser?.name || currentStudent?.fullName || 'Aluno Demonstração',
  )
  const [phone, setPhone] = useState(currentStudent?.phone || '(11) 98765-4321')
  const [emergencyPhone, setEmergencyPhone] = useState(
    currentStudent?.emergencyContact?.phone || '(11) 91234-5678',
  )
  const [emergencyName, setEmergencyName] = useState(
    currentStudent?.emergencyContact?.name || 'Contato de Emergência',
  )
  const [addressStreet, setAddressStreet] = useState(
    currentStudent?.address?.street || 'Av. Paulista, 1000',
  )
  const [addressCity, setAddressCity] = useState(currentStudent?.address?.city || 'São Paulo')
  const [addressState, setAddressState] = useState(currentStudent?.address?.state || 'SP')
  const [addressZip, setAddressZip] = useState(currentStudent?.address?.zipCode || '01310-100')
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatar ||
      currentStudent?.avatarUrl ||
      'https://img.usecurling.com/ppl/medium?gender=male&seed=42',
  )

  const [isSaving, setIsSaving] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const myCourse =
    courses.find((c) => c.id === currentStudent?.courseId || c.title.includes('Software')) ||
    courses[0]

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackMessage(null)
    setIsSaving(true)

    try {
      await updateStudentProfile({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim(),
        phone: phone.trim(),
        emergencyContact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
          relationship: currentStudent?.emergencyContact?.relationship || 'Familiar',
        },
        address: {
          street: addressStreet.trim(),
          number: currentStudent?.address?.number || '1000',
          complement: currentStudent?.address?.complement || 'Apto 12',
          neighborhood: currentStudent?.address?.neighborhood || 'Bela Vista',
          city: addressCity.trim(),
          state: addressState.trim(),
          zipCode: addressZip.trim(),
        },
      })

      setFeedbackMessage({
        type: 'success',
        text: 'Dados do perfil acadêmico e de contato atualizados e persistidos com sucesso!',
      })
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Falha ao salvar alterações de perfil no banco de dados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-blue-400" />
            Meu Perfil & Cadastro Acadêmico
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Mantenha suas informações de contato, endereço e foto atualizadas junto à secretaria.
          </p>
        </div>

        <Badge
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-3 py-1 text-xs self-start sm:self-auto"
        >
          Matrícula Ativa: {currentStudent?.registrationNumber || '2026-ENG-001'}
        </Badge>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs sm:text-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-red-950/40 border-red-800/60 text-red-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Identificação e Foto do Aluno */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Identificação do Estudante
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Dados de registro vinculados à sua credencial institucional.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-blue-500 shadow-md bg-slate-800"
                />
              </div>

              <div className="space-y-2 flex-1 w-full">
                <label className="text-xs font-semibold text-slate-300 block">
                  URL da Foto de Perfil (Avatar):
                </label>
                <div className="flex gap-2">
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://img.usecurling.com/ppl/medium?..."
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAvatarUrl(
                        `https://img.usecurling.com/ppl/medium?gender=male&seed=${Math.floor(
                          Math.random() * 100,
                        )}`,
                      )
                    }
                    className="text-xs border-slate-700 text-slate-300 shrink-0"
                  >
                    Gerar Nova
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dica: utilize links CDN da instituição ou imagem pessoal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nome Completo:</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  E-mail Institucional:
                </label>
                <Input
                  value={currentUser?.email || 'aluno@portalcursos.ng'}
                  disabled
                  className="bg-slate-950/60 border-slate-800 text-xs text-slate-400 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500">
                  E-mail institucional gerenciado pelo administrador.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">CPF:</label>
                <Input
                  value={currentStudent?.cpf || '123.456.789-00'}
                  disabled
                  className="bg-slate-950/60 border-slate-800 text-xs text-slate-400 cursor-not-allowed font-mono"
                />
                <span className="text-[10px] text-slate-500">
                  Documento protegido e validado sob a LGPD.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Telefone / WhatsApp:</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Curso Matriculado */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              Curso e Informações Acadêmicas
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Vínculo pedagógico ativo no sistema escolar.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-400">Curso:</span>
              <p className="text-sm font-semibold text-white">
                {currentStudent?.courseName || myCourse?.title || 'Engenharia de Software'}
              </p>
              <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-[10px] mt-1 font-mono">
                {myCourse?.code || 'ENG-SOFT-01'}
              </Badge>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Turno / Modalidade:</span>
              <p className="text-sm font-semibold text-white">Noturno • Híbrido EAD</p>
              <span className="text-xs text-slate-400">
                Carga: {myCourse?.workloadHours || 360} horas
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Ano de Ingresso:</span>
              <p className="text-sm font-semibold text-white">2026/1</p>
              <span className="text-xs text-emerald-400">Status: Regular</span>
            </div>
          </CardContent>
        </Card>

        {/* Endereço e Contato de Emergência */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400" />
              Endereço Residencial & Contato de Emergência
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Para emissão de correspondências e contato com responsáveis se necessário.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Logradouro / Rua:</label>
                <Input
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">CEP:</label>
                <Input
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Cidade:</label>
                <Input
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">UF / Estado:</label>
                <Input
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  maxLength={2}
                  className="bg-slate-950 border-slate-800 text-xs text-white uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Nome do Contato de Emergência:
                </label>
                <Input
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Telefone de Emergência:
                </label>
                <Input
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-2 px-5 py-2 shadow-lg shadow-blue-600/30"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando Alterações...' : 'Salvar Alterações de Perfil'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
