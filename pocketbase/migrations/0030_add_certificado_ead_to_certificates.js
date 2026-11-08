/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0030: Adiciona suporte ao tipo 'certificado_ead' na coleção 'certificates'.
 * Permite que certificados de conclusão de curso EAD sejam registrados de forma unificada
 * e distinguíveis pelo campo `docType: 'certificado_ead'` e código `CEAD-XXXX-XXXX`.
 */
migrate(
  (app) => {
    const certificates = app.findCollectionByNameOrId('certificates')
    if (!certificates) {
      console.log('[0030] Coleção certificates não encontrada, ignorando.')
      return
    }

    const docTypeField = certificates.fields.getByName('docType')
    if (docTypeField) {
      const values = docTypeField.values || []
      if (!values.includes('certificado_ead')) {
        docTypeField.values = [...values, 'certificado_ead']
        certificates.fields.add(docTypeField)
        app.save(certificates)
        console.log('[0030] Campo docType atualizado com valor "certificado_ead".')
      } else {
        console.log('[0030] Valor "certificado_ead" já presente em docType.')
      }
    } else {
      // Caso não exista o campo docType, adiciona como SelectField
      certificates.fields.add(
        new SelectField({
          name: 'docType',
          maxSelect: 1,
          values: ['certificado', 'diploma', 'certificado_ead'],
          required: false,
        }),
      )
      app.save(certificates)
      console.log('[0030] Campo docType criado com "certificado", "diploma" e "certificado_ead".')
    }
  },
  (app) => {
    const certificates = app.findCollectionByNameOrId('certificates')
    if (!certificates) return

    const docTypeField = certificates.fields.getByName('docType')
    if (docTypeField) {
      docTypeField.values = (docTypeField.values || []).filter((v) => v !== 'certificado_ead')
      certificates.fields.add(docTypeField)
      app.save(certificates)
      console.log('[0030:down] Valor "certificado_ead" removido de docType.')
    }
  },
)
