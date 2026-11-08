import React, { useState, useMemo } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BibliotecaAcervoTab } from './BibliotecaAcervoTab'
import { BibliotecaEmprestimosTab } from './BibliotecaEmprestimosTab'
import { BibliotecaHistoricoDevolucoesTab } from './BibliotecaHistoricoDevolucoesTab'
import { BookOpen, BookmarkCheck, Library, ShieldAlert, History } from 'lucide-react'

export function BibliotecaModule() {
  const { canAccessModule, libraryLoans } = usePortal()
  const [activeTab, setActiveTab] = useState<'acervo' | 'emprestimos' | 'historico'>('acervo')
  const [preSelectedBookId, setPreSelectedBookId] = useState<string | null>(null)

  const returnedCount = useMemo(() => {
    return libraryLoans.filter((l) => Boolean(l.returnedAt && l.returnedAt.trim().length > 0))
      .length
  }, [libraryLoans])

  // Dupla checagem de permissão RBAC (apenas root, admin, secretaria)
  if (!canAccessModule('biblioteca')) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Acesso Restrito à Gestão da Biblioteca</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Seu perfil não possui permissão para gerenciar o acervo e empréstimos físicos da
          instituição. Caso seja aluno, consulte seus empréstimos na aba "Minha Biblioteca" do
          portal do aluno.
        </p>
      </div>
    )
  }

  const handlePreSelectBook = (bookId: string) => {
    setPreSelectedBookId(bookId)
    setActiveTab('emprestimos')
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Library className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Biblioteca Institucional
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Controle integrado de acervo bibliográfico, disponibilidade de exemplares físicos e
            empréstimos.
          </p>
        </div>
      </div>

      {/* Abas: Acervo vs Empréstimos vs Histórico de Devoluções */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'acervo' | 'emprestimos' | 'historico')}
        className="space-y-4"
      >
        <TabsList className="bg-slate-900 border border-slate-800 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger
            value="acervo"
            className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Acervo de Livros
          </TabsTrigger>
          <TabsTrigger
            value="emprestimos"
            className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            Empréstimos Ativos
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2"
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico de Devoluções</span>
            {returnedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-emerald-300 border border-slate-700">
                {returnedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acervo" className="m-0 focus-visible:outline-none">
          <BibliotecaAcervoTab onPreSelectBookForLoan={handlePreSelectBook} />
        </TabsContent>

        <TabsContent value="emprestimos" className="m-0 focus-visible:outline-none">
          <BibliotecaEmprestimosTab
            preSelectedBookId={preSelectedBookId}
            onClearPreSelectedBook={() => setPreSelectedBookId(null)}
            onNavigateToHistory={() => setActiveTab('historico')}
          />
        </TabsContent>

        <TabsContent value="historico" className="m-0 focus-visible:outline-none">
          <BibliotecaHistoricoDevolucoesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
