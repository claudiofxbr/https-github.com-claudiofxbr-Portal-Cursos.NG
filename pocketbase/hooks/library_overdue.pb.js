/// <reference path="../pb_data/types.d.ts" />

/**
 * Notificação automática de empréstimos atrasados da Biblioteca - PortalCursos.NG
 *
 * Requisitos:
 * 1. Envio real de e-mail via $app.newMailClient().send(message) com to: [{ address, name }]
 * 2. Rotina agendada diária (cronAdd "library_overdue_check") rodando todo dia às 08:00 UTC.
 * 3. Destinatários: e-mail do aluno (via students) + e-mail fixo da biblioteca configurado em library_settings.
 * 4. Anti-spam: lastOverdueNotifiedAt no empréstimo - máximo 1 e-mail por empréstimo por dia (formato YYYY-MM-DD).
 * 5. Conteúdo em português, claro e profissional: aluno, título da obra, data de vencimento, dias de atraso,
 *    orientações de devolução/renovação e identidade PortalCursos.NG.
 * 6. Disparo adicional em update de empréstimo (onRecordAfterUpdateSuccess com e.next()) e rota manual
 *    POST /backend/v1/library/notify-overdue para acionamento sob demanda via UI ou testes.
 */

// -------------------------------------------------------------
// 1. Cron diário agendado no servidor
// Roda todo dia às 08:00 UTC (0 8 * * *)
// -------------------------------------------------------------
cronAdd('library_overdue_check', '0 8 * * *', () => {
  try {
    const app = $app
    const now = new Date()
    const todayIso = now.toISOString().slice(0, 10)
    const nowFullIso = now.toISOString()

    console.log(`[LibraryEmail] [Cron] Verificando empréstimos atrasados em ${todayIso}`)

    // Carrega library_settings
    let maxRenewals = 2
    let libraryEmail = 'biblioteca@portalcursos.ng'
    try {
      const list = app.findRecordsByFilter('library_settings', 'id != ""', '-created', 1, 0)
      if (list && list.length > 0) {
        const email = list[0].getString('libraryEmail')
        if (email && email.trim().length > 0) libraryEmail = email.trim()
        const mr = list[0].getInt('maxRenewals')
        if (mr !== undefined && mr !== null) maxRenewals = mr
      }
    } catch (err) {
      console.log('[LibraryEmail] Aviso ao carregar library_settings no cron:', err)
    }

    const overdueLoans = app.findRecordsByFilter(
      'library_loans',
      `returnedAt = "" && dueDate < "${todayIso}"`,
      'dueDate',
      200,
      0,
    )

    let sentCount = 0
    let skippedCount = 0

    const senderAddress = app.settings().meta.senderAddress || libraryEmail
    const senderName = app.settings().meta.senderName || 'Biblioteca PortalCursos.NG'

    for (let i = 0; i < overdueLoans.length; i++) {
      const loan = overdueLoans[i]
      const loanId = loan.id
      const lastNotified = loan.getString('lastOverdueNotifiedAt') || ''

      // Anti-spam: pula se já notificado hoje
      if (lastNotified.startsWith(todayIso)) {
        skippedCount++
        continue
      }

      const studentId = loan.getString('studentId')
      let studentName = loan.getString('studentName') || 'Aluno'
      let bookTitle = loan.getString('bookTitle') || 'Obra da Biblioteca'
      const dueDate = loan.getString('dueDate')

      let studentEmail = ''
      try {
        if (studentId) {
          const student = app.findRecordById('students', studentId)
          if (student) {
            studentEmail = student.getString('email')
            const fn = student.getString('fullName')
            if (fn) studentName = fn
          }
        }
      } catch (_) {}

      if (!studentEmail) {
        try {
          const userList = app.findRecordsByFilter(
            'users',
            `studentId = "${studentId}" || email = "aluno@portalcursos.ng"`,
            '-created',
            1,
            0,
          )
          if (userList.length > 0) studentEmail = userList[0].getString('email')
        } catch (_) {}
      }

      let bookAuthor = ''
      try {
        const bookId = loan.getString('bookId')
        if (bookId) {
          const book = app.findRecordById('library_books', bookId)
          if (book) {
            bookAuthor = book.getString('author')
            const bt = book.getString('title')
            if (bt) bookTitle = bt
          }
        }
      } catch (_) {}

      // Calcula dias de atraso
      let daysOverdue = 1
      try {
        const dueT = new Date(dueDate + 'T00:00:00Z').getTime()
        const todayT = new Date(todayIso + 'T00:00:00Z').getTime()
        daysOverdue = Math.max(1, Math.floor((todayT - dueT) / (1000 * 60 * 60 * 24)))
      } catch (_) {}

      // Formatar data
      let dueDateBr = dueDate
      const parts = dueDate.slice(0, 10).split('-')
      if (parts.length === 3) dueDateBr = parts[2] + '/' + parts[1] + '/' + parts[0]

      const recipients = []
      if (studentEmail && studentEmail.includes('@')) {
        recipients.push({ address: studentEmail.trim(), name: studentName })
      }
      if (libraryEmail && libraryEmail.includes('@')) {
        recipients.push({ address: libraryEmail.trim(), name: 'Biblioteca PortalCursos.NG' })
      }

      if (recipients.length === 0) {
        skippedCount++
        continue
      }

      const emailSubject = `[Aviso de Atraso] Devolução de "${bookTitle}" pendente na Biblioteca`
      const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Aviso de Atraso - Biblioteca</title></head>
<body style="margin:0;padding:24px 12px;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" style="max-width:580px;margin:0 auto;background-color:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;" cellspacing="0" cellpadding="0">
    <tr>
      <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:24px 28px;">
        <span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#93c5fd;display:block;margin-bottom:4px;">Sistema Acadêmico</span>
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;">PortalCursos.NG &bull; Biblioteca</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 28px 16px 28px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:#f1f5f9;">Olá, <strong>${studentName}</strong>,</p>
        <p style="margin:0 0 20px 0;font-size:14px;color:#cbd5e1;line-height:1.6;">
          Identificamos que o prazo para devolução da obra abaixo emprestada pela Biblioteca Universitária do <strong>PortalCursos.NG</strong> está <span style="color:#f87171;font-weight:700;">atrasado</span>.
        </p>
        <div style="background-color:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin-bottom:20px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:4px;">Obra Emprestada</div>
          <div style="font-size:16px;font-weight:700;color:#38bdf8;margin-bottom:4px;">${bookTitle}</div>
          ${bookAuthor ? `<div style="font-size:13px;color:#cbd5e1;margin-bottom:12px;">Autor: ${bookAuthor}</div>` : ''}
          <div style="border-top:1px solid #1e293b;padding-top:10px;font-size:12px;color:#94a3b8;">
            Prazo previsto: <strong style="color:#f87171;">${dueDateBr}</strong> &bull; Atraso: <strong style="color:#f87171;">${daysOverdue} dia${daysOverdue === 1 ? '' : 's'}</strong>
          </div>
        </div>
        <div style="background-color:#1e293b;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;margin-bottom:20px;">
          <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#e2e8f0;">Orientações para regularização:</p>
          <ul style="margin:0;padding-left:18px;font-size:12px;color:#94a3b8;line-height:1.6;">
            <li><strong>Devolução presencial:</strong> Entregue o exemplar físico no balcão da Biblioteca.</li>
            <li><strong>Renovação online:</strong> Caso ainda possua renovações disponíveis (limite de ${maxRenewals} vezes) e a obra não esteja reservada, renove pelo Portal do Aluno.</li>
          </ul>
        </div>
        <p style="margin:0;font-size:12px;color:#64748b;">
          Dúvidas? Entre em contato com a coordenação da biblioteca em <a href="mailto:${libraryEmail}" style="color:#60a5fa;">${libraryEmail}</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#0f172a;border-top:1px solid #334155;padding:16px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#64748b;">PortalCursos.NG &bull; Notificação Automática do Módulo Biblioteca</p>
      </td>
    </tr>
  </table>
</body>
</html>`

      try {
        const mailer = app.newMailClient()
        const message = new MailerMessage({
          from: {
            address: senderAddress,
            name: senderName,
          },
          to: recipients,
          subject: emailSubject,
          html: emailHtml,
        })
        mailer.send(message)
        sentCount++
        loan.set('lastOverdueNotifiedAt', nowFullIso)
        app.save(loan)
        console.log(
          `[LibraryEmail] [Cron] E-mail enviado com sucesso para empréstimo ${loanId} (to: ${recipients.map((r) => r.address).join(', ')})`,
        )
      } catch (sendErr) {
        console.error(
          `[LibraryEmail] [Cron] Falha ao enviar e-mail para empréstimo ${loanId}:`,
          sendErr,
        )
      }
    }

    console.log(
      `[LibraryEmail] [Cron] Concluído: ${sentCount} enviados, ${skippedCount} pulados de ${overdueLoans.length} empréstimos atrasados.`,
    )
  } catch (err) {
    console.error('[LibraryEmail] [Cron] Erro fatal:', err)
  }
})

// -------------------------------------------------------------
// 2. Disparo imediato em atualização de empréstimo (onRecordAfterUpdateSuccess)
// Sempre invoca e.next() no bloco finally
// -------------------------------------------------------------
onRecordAfterUpdateSuccess((e) => {
  try {
    const loan = e.record
    const returnedAt = loan.getString('returnedAt')
    const dueDate = loan.getString('dueDate')
    const now = new Date()
    const todayIso = now.toISOString().slice(0, 10)
    const nowFullIso = now.toISOString()

    if (!returnedAt && dueDate && dueDate < todayIso) {
      const lastNotified = loan.getString('lastOverdueNotifiedAt') || ''
      if (!lastNotified.startsWith(todayIso)) {
        console.log(
          `[LibraryEmail] [Hook] Empréstimo ${loan.id} atualizado em atraso. Disparando aviso...`,
        )

        const app = $app
        let libraryEmail = 'biblioteca@portalcursos.ng'
        let maxRenewals = 2
        try {
          const list = app.findRecordsByFilter('library_settings', 'id != ""', '-created', 1, 0)
          if (list && list.length > 0) {
            const email = list[0].getString('libraryEmail')
            if (email && email.trim().length > 0) libraryEmail = email.trim()
            const mr = list[0].getInt('maxRenewals')
            if (mr !== undefined && mr !== null) maxRenewals = mr
          }
        } catch (_) {}

        const studentId = loan.getString('studentId')
        let studentName = loan.getString('studentName') || 'Aluno'
        let bookTitle = loan.getString('bookTitle') || 'Obra da Biblioteca'

        let studentEmail = ''
        try {
          if (studentId) {
            const student = app.findRecordById('students', studentId)
            if (student) {
              studentEmail = student.getString('email')
              const fn = student.getString('fullName')
              if (fn) studentName = fn
            }
          }
        } catch (_) {}

        if (!studentEmail) {
          try {
            const userList = app.findRecordsByFilter(
              'users',
              `studentId = "${studentId}" || email = "aluno@portalcursos.ng"`,
              '-created',
              1,
              0,
            )
            if (userList.length > 0) studentEmail = userList[0].getString('email')
          } catch (_) {}
        }

        let bookAuthor = ''
        try {
          const bookId = loan.getString('bookId')
          if (bookId) {
            const book = app.findRecordById('library_books', bookId)
            if (book) {
              bookAuthor = book.getString('author')
              const bt = book.getString('title')
              if (bt) bookTitle = bt
            }
          }
        } catch (_) {}

        let daysOverdue = 1
        try {
          const dueT = new Date(dueDate + 'T00:00:00Z').getTime()
          const todayT = new Date(todayIso + 'T00:00:00Z').getTime()
          daysOverdue = Math.max(1, Math.floor((todayT - dueT) / (1000 * 60 * 60 * 24)))
        } catch (_) {}

        let dueDateBr = dueDate
        const parts = dueDate.slice(0, 10).split('-')
        if (parts.length === 3) dueDateBr = parts[2] + '/' + parts[1] + '/' + parts[0]

        const recipients = []
        if (studentEmail && studentEmail.includes('@')) {
          recipients.push({ address: studentEmail.trim(), name: studentName })
        }
        if (libraryEmail && libraryEmail.includes('@')) {
          recipients.push({ address: libraryEmail.trim(), name: 'Biblioteca PortalCursos.NG' })
        }

        if (recipients.length > 0) {
          const senderAddress = app.settings().meta.senderAddress || libraryEmail
          const senderName = app.settings().meta.senderName || 'Biblioteca PortalCursos.NG'

          const emailSubject = `[Aviso de Atraso] Devolução de "${bookTitle}" pendente na Biblioteca`
          const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Aviso de Atraso - Biblioteca</title></head>
<body style="margin:0;padding:24px 12px;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" style="max-width:580px;margin:0 auto;background-color:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;" cellspacing="0" cellpadding="0">
    <tr>
      <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:24px 28px;">
        <span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#93c5fd;display:block;margin-bottom:4px;">Sistema Acadêmico</span>
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;">PortalCursos.NG &bull; Biblioteca</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 28px 16px 28px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:#f1f5f9;">Olá, <strong>${studentName}</strong>,</p>
        <p style="margin:0 0 20px 0;font-size:14px;color:#cbd5e1;line-height:1.6;">
          Identificamos que o prazo para devolução da obra abaixo emprestada pela Biblioteca Universitária do <strong>PortalCursos.NG</strong> está <span style="color:#f87171;font-weight:700;">atrasado</span>.
        </p>
        <div style="background-color:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin-bottom:20px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:4px;">Obra Emprestada</div>
          <div style="font-size:16px;font-weight:700;color:#38bdf8;margin-bottom:4px;">${bookTitle}</div>
          ${bookAuthor ? `<div style="font-size:13px;color:#cbd5e1;margin-bottom:12px;">Autor: ${bookAuthor}</div>` : ''}
          <div style="border-top:1px solid #1e293b;padding-top:10px;font-size:12px;color:#94a3b8;">
            Prazo previsto: <strong style="color:#f87171;">${dueDateBr}</strong> &bull; Atraso: <strong style="color:#f87171;">${daysOverdue} dia${daysOverdue === 1 ? '' : 's'}</strong>
          </div>
        </div>
        <div style="background-color:#1e293b;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;margin-bottom:20px;">
          <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#e2e8f0;">Orientações para regularização:</p>
          <ul style="margin:0;padding-left:18px;font-size:12px;color:#94a3b8;line-height:1.6;">
            <li><strong>Devolução presencial:</strong> Entregue o exemplar físico no balcão da Biblioteca.</li>
            <li><strong>Renovação online:</strong> Caso ainda possua renovações disponíveis (limite de ${maxRenewals} vezes) e a obra não esteja reservada, renove pelo Portal do Aluno.</li>
          </ul>
        </div>
        <p style="margin:0;font-size:12px;color:#64748b;">
          Dúvidas? Entre em contato com a coordenação da biblioteca em <a href="mailto:${libraryEmail}" style="color:#60a5fa;">${libraryEmail}</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#0f172a;border-top:1px solid #334155;padding:16px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#64748b;">PortalCursos.NG &bull; Notificação Automática do Módulo Biblioteca</p>
      </td>
    </tr>
  </table>
</body>
</html>`

          const mailer = app.newMailClient()
          const message = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: recipients,
            subject: emailSubject,
            html: emailHtml,
          })
          mailer.send(message)
          loan.set('lastOverdueNotifiedAt', nowFullIso)
          app.save(loan)
          console.log(`[LibraryEmail] [Hook] E-mail enviado com sucesso para ${loan.id}`)
        }
      }
    }
  } catch (err) {
    console.error('[LibraryEmail] [Hook] Erro no update do empréstimo:', err)
  } finally {
    e.next()
  }
}, 'library_loans')

// -------------------------------------------------------------
// 3. Rota HTTP sob demanda para o painel / testes
// POST /backend/v1/library/notify-overdue
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/library/notify-overdue', (e) => {
  try {
    const app = $app
    const now = new Date()
    const todayIso = now.toISOString().slice(0, 10)
    const nowFullIso = now.toISOString()

    let maxRenewals = 2
    let libraryEmail = 'biblioteca@portalcursos.ng'
    try {
      const list = app.findRecordsByFilter('library_settings', 'id != ""', '-created', 1, 0)
      if (list && list.length > 0) {
        const email = list[0].getString('libraryEmail')
        if (email && email.trim().length > 0) libraryEmail = email.trim()
        const mr = list[0].getInt('maxRenewals')
        if (mr !== undefined && mr !== null) maxRenewals = mr
      }
    } catch (_) {}

    const overdueLoans = app.findRecordsByFilter(
      'library_loans',
      `returnedAt = "" && dueDate < "${todayIso}"`,
      'dueDate',
      200,
      0,
    )

    let sentCount = 0
    let skippedCount = 0
    const details = []

    const senderAddress = app.settings().meta.senderAddress || libraryEmail
    const senderName = app.settings().meta.senderName || 'Biblioteca PortalCursos.NG'

    for (let i = 0; i < overdueLoans.length; i++) {
      const loan = overdueLoans[i]
      const loanId = loan.id
      const lastNotified = loan.getString('lastOverdueNotifiedAt') || ''

      if (lastNotified.startsWith(todayIso)) {
        skippedCount++
        details.push({ loanId, status: 'skipped_already_notified_today', lastNotified })
        continue
      }

      const studentId = loan.getString('studentId')
      let studentName = loan.getString('studentName') || 'Aluno'
      let bookTitle = loan.getString('bookTitle') || 'Obra da Biblioteca'
      const dueDate = loan.getString('dueDate')

      let studentEmail = ''
      try {
        if (studentId) {
          const student = app.findRecordById('students', studentId)
          if (student) {
            studentEmail = student.getString('email')
            const fn = student.getString('fullName')
            if (fn) studentName = fn
          }
        }
      } catch (_) {}

      if (!studentEmail) {
        try {
          const userList = app.findRecordsByFilter(
            'users',
            `studentId = "${studentId}" || email = "aluno@portalcursos.ng"`,
            '-created',
            1,
            0,
          )
          if (userList.length > 0) studentEmail = userList[0].getString('email')
        } catch (_) {}
      }

      let bookAuthor = ''
      try {
        const bookId = loan.getString('bookId')
        if (bookId) {
          const book = app.findRecordById('library_books', bookId)
          if (book) {
            bookAuthor = book.getString('author')
            const bt = book.getString('title')
            if (bt) bookTitle = bt
          }
        }
      } catch (_) {}

      let daysOverdue = 1
      try {
        const dueT = new Date(dueDate + 'T00:00:00Z').getTime()
        const todayT = new Date(todayIso + 'T00:00:00Z').getTime()
        daysOverdue = Math.max(1, Math.floor((todayT - dueT) / (1000 * 60 * 60 * 24)))
      } catch (_) {}

      let dueDateBr = dueDate
      const parts = dueDate.slice(0, 10).split('-')
      if (parts.length === 3) dueDateBr = parts[2] + '/' + parts[1] + '/' + parts[0]

      const recipients = []
      if (studentEmail && studentEmail.includes('@')) {
        recipients.push({ address: studentEmail.trim(), name: studentName })
      }
      if (libraryEmail && libraryEmail.includes('@')) {
        recipients.push({ address: libraryEmail.trim(), name: 'Biblioteca PortalCursos.NG' })
      }

      if (recipients.length === 0) {
        skippedCount++
        details.push({ loanId, status: 'skipped_no_recipients' })
        continue
      }

      const emailSubject = `[Aviso de Atraso] Devolução de "${bookTitle}" pendente na Biblioteca`
      const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Aviso de Atraso - Biblioteca</title></head>
<body style="margin:0;padding:24px 12px;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" style="max-width:580px;margin:0 auto;background-color:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;" cellspacing="0" cellpadding="0">
    <tr>
      <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:24px 28px;">
        <span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#93c5fd;display:block;margin-bottom:4px;">Sistema Acadêmico</span>
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;">PortalCursos.NG &bull; Biblioteca</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 28px 16px 28px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:#f1f5f9;">Olá, <strong>${studentName}</strong>,</p>
        <p style="margin:0 0 20px 0;font-size:14px;color:#cbd5e1;line-height:1.6;">
          Identificamos que o prazo para devolução da obra abaixo emprestada pela Biblioteca Universitária do <strong>PortalCursos.NG</strong> está <span style="color:#f87171;font-weight:700;">atrasado</span>.
        </p>
        <div style="background-color:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin-bottom:20px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:4px;">Obra Emprestada</div>
          <div style="font-size:16px;font-weight:700;color:#38bdf8;margin-bottom:4px;">${bookTitle}</div>
          ${bookAuthor ? `<div style="font-size:13px;color:#cbd5e1;margin-bottom:12px;">Autor: ${bookAuthor}</div>` : ''}
          <div style="border-top:1px solid #1e293b;padding-top:10px;font-size:12px;color:#94a3b8;">
            Prazo previsto: <strong style="color:#f87171;">${dueDateBr}</strong> &bull; Atraso: <strong style="color:#f87171;">${daysOverdue} dia${daysOverdue === 1 ? '' : 's'}</strong>
          </div>
        </div>
        <div style="background-color:#1e293b;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;margin-bottom:20px;">
          <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#e2e8f0;">Orientações para regularização:</p>
          <ul style="margin:0;padding-left:18px;font-size:12px;color:#94a3b8;line-height:1.6;">
            <li><strong>Devolução presencial:</strong> Entregue o exemplar físico no balcão da Biblioteca.</li>
            <li><strong>Renovação online:</strong> Caso ainda possua renovações disponíveis (limite de ${maxRenewals} vezes) e a obra não esteja reservada, renove pelo Portal do Aluno.</li>
          </ul>
        </div>
        <p style="margin:0;font-size:12px;color:#64748b;">
          Dúvidas? Entre em contato com a coordenação da biblioteca em <a href="mailto:${libraryEmail}" style="color:#60a5fa;">${libraryEmail}</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#0f172a;border-top:1px solid #334155;padding:16px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#64748b;">PortalCursos.NG &bull; Notificação Automática do Módulo Biblioteca</p>
      </td>
    </tr>
  </table>
</body>
</html>`

      let sentOk = false
      try {
        const mailer = app.newMailClient()
        const message = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: recipients,
          subject: emailSubject,
          html: emailHtml,
        })
        mailer.send(message)
        sentOk = true
        sentCount++
        loan.set('lastOverdueNotifiedAt', nowFullIso)
        app.save(loan)
      } catch (err) {
        console.error(`[LibraryEmail] [API] Erro ao enviar para ${loanId}:`, err)
      }

      details.push({
        loanId,
        studentName,
        recipients: recipients.map((r) => r.address),
        sent: sentOk,
      })
    }

    return e.json(200, {
      success: true,
      overdueCount: overdueLoans.length,
      sentCount,
      skippedCount,
      details,
    })
  } catch (err) {
    console.error('[LibraryEmail] [API] Erro interno:', err)
    return e.json(500, { success: false, error: String(err) })
  }
})
