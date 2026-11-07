import React, { useState } from 'react'
import { usePortal } from '@/context/PortalContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  GraduationCap,
  Calendar,
  Check,
  CheckCheck,
} from 'lucide-react'
import { StudentNotification } from '@/types/portal'

export function AlunoNotificacoesModule() {
  const { studentNotifications, markNotificationAsRead, markAllNotificationsAsRead, currentUser } =
    usePortal()

  const [filterMode, setFilterMode] = useState<'todas' | 'nao_lidas'>('todas')
  const [markingId, setMarkingId] = useState<string | null>(null)

  const effectiveStudentId = currentUser?.studentId || 'dbphexr97czw7cb'

  // Notificações do aluno logado
  const myNotifications = studentNotifications.filter(
    (n) => !n.studentId || n.studentId === effectiveStudentId,
  )

  const unreadCount = myNotifications.filter((n) => !n.read).length

  const filteredNotifications = myNotifications.filter((n) => {
    if (filterMode === 'nao_lidas') return !n.read
    return true
  })

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'academico':
        return <GraduationCap className="w-5 h-5 text-blue-400" />
      case 'financeiro':
        return <DollarSign className="w-5 h-5 text-emerald-400" />
      case 'prazo':
        return <Calendar className="w-5 h-5 text-amber-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-indigo-400" />
    }
  }

  const handleMarkOne = async (id: string) => {
    setMarkingId(id)
    await markNotificationAsRead(id)
    setMarkingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-400" />
            Central de Notificações & Alertas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Avisos da secretaria, confirmações financeiras, prazos acadêmicos e comunicados da
            coordenação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllNotificationsAsRead()}
              className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800 gap-1.5"
            >
              <CheckCheck className="w-4 h-4 text-blue-400" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtro (Todas x Não lidas) */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filterMode === 'todas' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('todas')}
            className={`h-7 text-xs ${
              filterMode === 'todas' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            Todas ({myNotifications.length})
          </Button>
          <Button
            size="sm"
            variant={filterMode === 'nao_lidas' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('nao_lidas')}
            className={`h-7 text-xs ${
              filterMode === 'nao_lidas' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            Não Lidas ({unreadCount})
          </Button>
        </div>

        <div className="text-slate-400 font-mono">
          {unreadCount === 0 ? 'Nenhuma pendente' : `${unreadCount} alerta(s) novo(s)`}
        </div>
      </div>

      {/* Lista de Notificações */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-8 text-center text-slate-400 text-xs sm:text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              Você não tem notificações {filterMode === 'nao_lidas' ? 'não lidas' : 'no momento'}.
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notif) => {
            const isRead = notif.read
            const isMarking = markingId === notif.id

            return (
              <Card
                key={notif.id}
                className={`transition-all border ${
                  isRead
                    ? 'bg-slate-900/40 border-slate-800/80'
                    : 'bg-gradient-to-r from-blue-950/30 to-slate-900 border-blue-800/50 shadow-md'
                }`}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl border shrink-0 ${
                        isRead
                          ? 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                          : 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                      }`}
                    >
                      {getCategoryIcon(notif.category)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            isRead ? 'text-slate-300' : 'text-white font-bold'
                          }`}
                        >
                          {notif.title}
                        </h3>
                        {!isRead && (
                          <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0">
                            Nova
                          </Badge>
                        )}
                        {notif.category && (
                          <Badge
                            variant="outline"
                            className="border-slate-700 text-slate-400 text-[10px] uppercase"
                          >
                            {notif.category}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>

                      <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                        {notif.created}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="self-end sm:self-center shrink-0">
                    {!isRead ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkOne(notif.id)}
                        disabled={isMarking}
                        className="text-xs text-blue-400 hover:text-white hover:bg-blue-950/40 gap-1 h-8"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Marcar como lida
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                        Lida
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
