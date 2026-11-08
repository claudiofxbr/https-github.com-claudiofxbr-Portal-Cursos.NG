/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0021 - Envio de e-mail de atraso com sintaxe estrita PocketBase MailerMessage
 * to: [{ address: string, name?: string }]
 */
migrate(
  (app) => {
    try {
      const now = new Date()
      const todayIso = now.toISOString().slice(0, 10)
      const nowFullIso = now.toISOString()

      // Localiza empréstimo atrasado
      const overdueList = app.findRecordsByFilter(
        'library_loans',
        `returnedAt = "" && dueDate < "${todayIso}"`,
        'dueDate',
        10,
        0,
      )

      if (!overdueList || overdueList.length === 0) {
        console.log('[LibraryEmailTest] Nenhum empréstimo atrasado encontrado para teste.')
        return
      }

      const loan = overdueList[0]
      const studentId = loan.getString('studentId')
      let studentName = loan.getString('studentName') || 'Aluno'
      let bookTitle = loan.getString('bookTitle') || 'Obra da Biblioteca'
      const dueDate = loan.getString('dueDate')

      let studentEmail = ''
      try {
        if (studentId) {
          const st = app.findRecordById('students', studentId)
          if (st) {
            studentEmail = st.getString('email')
            const fn = st.getString('fullName')
            if (fn) studentName = fn
          }
        }
      } catch (_) {}

      let libraryEmail = 'biblioteca@portalcursos.ng'
      try {
        const settings = app.findRecordsByFilter('library_settings', 'id != ""', '-created', 1, 0)
        if (settings && settings.length > 0) {
          const le = settings[0].getString('libraryEmail')
          if (le) libraryEmail = le.trim()
        }
      } catch (_) {}

      // Formato exigido: array de objetos { address: string, name?: string }
      const recipients = []
      if (studentEmail && studentEmail.includes('@')) {
        recipients.push({ address: studentEmail.trim(), name: studentName })
      }
      if (libraryEmail && libraryEmail.includes('@')) {
        recipients.push({ address: libraryEmail.trim(), name: 'Biblioteca PortalCursos.NG' })
      }

      const senderAddress = app.settings().meta.senderAddress || libraryEmail
      const senderName = app.settings().meta.senderName || 'Biblioteca PortalCursos.NG'

      console.log(
        `[LibraryEmailTest] Disparando e-mail de teste para ${recipients.map((r) => r.address).join(', ')}...`,
      )

      const mailer = app.newMailClient()
      const message = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: recipients,
        subject: `[Aviso de Atraso] Devolução de "${bookTitle}" pendente na Biblioteca`,
        html: `
          <div style="font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:20px;border-radius:8px;">
            <h2 style="color:#38bdf8;">PortalCursos.NG &bull; Biblioteca</h2>
            <p>Olá, <strong>${studentName}</strong>,</p>
            <p>Este é um aviso automático de que a obra <strong>${bookTitle}</strong> está atrasada desde <strong>${dueDate}</strong>.</p>
            <p>Por favor, devolva no balcão ou renove via Portal do Aluno.</p>
            <p style="color:#94a3b8;font-size:12px;">Contato: ${libraryEmail}</p>
          </div>
        `,
      })

      mailer.send(message)
      console.log('[LibraryEmailTest] E-mail enviado com sucesso!')

      loan.set('lastOverdueNotifiedAt', nowFullIso)
      app.save(loan)
    } catch (err) {
      console.error('[LibraryEmailTest] Erro ao enviar e-mail de teste:', err)
    }
  },
  () => {},
)
