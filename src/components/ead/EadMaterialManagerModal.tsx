import React, { useState, useMemo } from 'react'
import { EadLesson, EadMaterial, EadMaterialType } from '@/types/portal'
import { usePortal } from '@/context/PortalContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  PlusCircle,
  ExternalLink,
  Edit2,
  Trash2,
  FileCode2,
  BookmarkCheck,
  BookOpen,
  Link as LinkIcon,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'

interface EadMaterialManagerModalProps {
  lesson: EadLesson | null
  courseTitle?: string
  isOpen: boolean
  onClose: () => void
}

const MATERIAL_TYPES: {
  type: EadMaterialType
  label: string
  icon: React.ReactNode
  color: string
}[] = [
  {
    type: 'link',
    label: 'Link Externo',
    icon: <LinkIcon className="w-3.5 h-3.5" />,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    type: 'pdf',
    label: 'PDF / Documento',
    icon: <FileText className="w-3.5 h-3.5" />,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    type: 'exercicio',
    label: 'Exercício / Desafio',
    icon: <FileCode2 className="w-3.5 h-3.5" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    type: 'artigo',
    label: 'Artigo / Leitura',
    icon: <BookmarkCheck className="w-3.5 h-3.5" />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    type: 'referencia',
    label: 'Referência Bibliográfica',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    type: 'outro',
    label: 'Outro Material',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    color: 'bg-slate-50 text-slate-700 border-slate-200',
  },
]

export function EadMaterialManagerModal({
  lesson,
  courseTitle,
  isOpen,
  onClose,
}: EadMaterialManagerModalProps) {
  const { eadMaterials, createEadMaterial, updateEadMaterial, deleteEadMaterial } = usePortal()

  // Lista de materiais desta aula
  const lessonMaterials = useMemo(() => {
    if (!lesson) return []
    return eadMaterials
      .filter((m) => m.lessonId === lesson.id)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  }, [eadMaterials, lesson])

  // Estado do formulário interno (para criar ou editar)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<EadMaterialType>('link')
  const [url, setUrl] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Confirmação de exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleOpenCreateForm = () => {
    setEditingMaterialId(null)
    setTitle('')
    setDescription('')
    setType('link')
    setUrl('')
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleOpenEditForm = (mat: EadMaterial) => {
    setEditingMaterialId(mat.id)
    setTitle(mat.title)
    setDescription(mat.description || '')
    setType(mat.type || 'link')
    setUrl(mat.url)
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleCancelForm = () => {
    setIsFormOpen(false)
    setEditingMaterialId(null)
    setFormError(null)
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lesson) return

    if (!title.trim()) {
      setFormError('Informe o título do material complementar.')
      return
    }

    if (!url.trim()) {
      setFormError('Informe a URL do material (link externo, PDF, Google Drive, artigo, etc.).')
      return
    }

    // Validação básica de URL
    let cleanUrl = url.trim()
    if (
      !cleanUrl.startsWith('http://') &&
      !cleanUrl.startsWith('https://') &&
      !cleanUrl.startsWith('mailto:')
    ) {
      cleanUrl = `https://${cleanUrl}`
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      if (editingMaterialId) {
        await updateEadMaterial(editingMaterialId, {
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          url: cleanUrl,
        })
      } else {
        const nextOrder = (lessonMaterials[lessonMaterials.length - 1]?.orderIndex || 0) + 1
        await createEadMaterial({
          lessonId: lesson.id,
          eadCourseId: lesson.eadCourseId,
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          url: cleanUrl,
          orderIndex: nextOrder,
        })
      }

      setIsFormOpen(false)
      setEditingMaterialId(null)
      setTitle('')
      setDescription('')
      setUrl('')
    } catch (err) {
      console.error('Erro ao salvar material complementar:', err)
      setFormError('Não foi possível salvar o material. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async (materialId: string) => {
    try {
      await deleteEadMaterial(materialId)
      setDeletingId(null)
    } catch (err) {
      console.error('Erro ao excluir material complementar:', err)
    }
  }

  if (!lesson) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                Materiais Complementares da Aula
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {courseTitle ? `${courseTitle} • ` : ''}Aula:{' '}
                <span className="font-semibold text-slate-700">{lesson.title}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Banner Informativo MEC */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-medium text-slate-800">Uso pedagógico e frequência institucional</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Os materiais complementares servem para enriquecer os estudos (slides, leituras e
              exercícios). Eles{' '}
              <strong className="text-slate-700">
                não afetam o cálculo de frequência MEC nem o progresso da aula
              </strong>{' '}
              — a aula só é concluída pelo botão de conclusão no AVA.
            </p>
          </div>
        </div>

        {/* Formulário de Adição / Edição */}
        {isFormOpen ? (
          <form
            onSubmit={handleSaveForm}
            className="p-4 bg-indigo-50/50 border border-indigo-200/80 rounded-xl space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
                {editingMaterialId ? (
                  <Edit2 className="w-3.5 h-3.5" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                {editingMaterialId ? 'Editar Material Complementar' : 'Novo Material Complementar'}
              </h4>
              <Badge
                variant="outline"
                className="text-[10px] bg-white border-indigo-200 text-indigo-700"
              >
                Aula {lesson.orderIndex || 1}
              </Badge>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="mat-title" className="text-xs font-semibold text-slate-700">
                Título do material *
              </Label>
              <Input
                id="mat-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Slides da Aula (PDF) ou Exercícios Práticos"
                className="text-xs bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mat-type" className="text-xs font-semibold text-slate-700">
                  Tipo de material
                </Label>
                <Select value={type} onValueChange={(val) => setType(val as EadMaterialType)}>
                  <SelectTrigger id="mat-type" className="text-xs bg-white">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map((t) => (
                      <SelectItem key={t.type} value={t.type} className="text-xs">
                        <div className="flex items-center gap-2">
                          {t.icon}
                          <span>{t.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-url" className="text-xs font-semibold text-slate-700">
                  Link / URL de Acesso *
                </Label>
                <Input
                  id="mat-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/... ou https://..."
                  className="text-xs bg-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mat-desc" className="text-xs font-semibold text-slate-700">
                Descrição / Instruções aos alunos (opcional)
              </Label>
              <Textarea
                id="mat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instruções de leitura, capítulos recomendados ou orientações sobre o exercício..."
                rows={2}
                className="text-xs bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelForm}
                disabled={isSubmitting}
                className="text-xs text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {isSubmitting
                  ? 'Salvando...'
                  : editingMaterialId
                    ? 'Atualizar Material'
                    : 'Adicionar à Aula'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {lessonMaterials.length} material(is) cadastrado(s)
            </span>
            <Button
              size="sm"
              onClick={handleOpenCreateForm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Adicionar Material
            </Button>
          </div>
        )}

        {/* Lista de Materiais Cadastrados */}
        <div className="space-y-2 mt-2">
          {lessonMaterials.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                Nenhum material complementar cadastrado para esta aula
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Clique no botão acima para adicionar links de apostilas em PDF, Google Drive,
                artigos de apoio ou exercícios práticos.
              </p>
            </div>
          ) : (
            lessonMaterials.map((mat, idx) => {
              const typeMeta = MATERIAL_TYPES.find((t) => t.type === mat.type) || MATERIAL_TYPES[0]
              const isDeleting = deletingId === mat.id

              return (
                <div
                  key={mat.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs font-bold text-slate-900 truncate">{mat.title}</h5>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${typeMeta.color}`}
                        >
                          {typeMeta.icon}
                          {typeMeta.label}
                        </Badge>
                      </div>

                      {mat.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">{mat.description}</p>
                      )}

                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 underline truncate max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{mat.url}</span>
                      </a>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    {isDeleting ? (
                      <div className="flex items-center gap-1.5 bg-red-50 p-1.5 rounded-md border border-red-200">
                        <span className="text-[10px] text-red-700 font-medium">Excluir?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleConfirmDelete(mat.id)}
                          className="h-6 px-2 text-[10px]"
                        >
                          Sim
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingId(null)}
                          className="h-6 px-2 text-[10px]"
                        >
                          Não
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditForm(mat)}
                          className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                          title="Editar material"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(mat.id)}
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir material"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
