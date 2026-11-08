/// <reference path="../pb_data/types.d.ts" />
/**
 * Expande os valores aceitos no campo `category` da coleção `charges` para suportar
 * taxas avulsas institucionais e assegura campos opcionais para metadata da taxa.
 *
 * Categorias suportadas:
 * - 'matricula'
 * - 'mensalidade'
 * - 'renegociacao'
 * - 'taxa_segunda_via' (Segunda Via de Documentos)
 * - 'taxa_biblioteca' (Multas e Taxas da Biblioteca)
 * - 'taxa_material' (Material Didático e Apostilas)
 * - 'taxa_rematricula' (Taxa de Matrícula/Rematrícula Avulsa)
 * - 'taxa_diploma' (Segunda Via de Certificado ou Diploma)
 * - 'taxa_trancamento' (Taxa Administrativa de Trancamento)
 * - 'taxa_avulsa' (Outras taxas avulsas institucionais)
 */
migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('charges')
      const field = col.fields.getByName('category')
      if (field) {
        field.values = [
          'matricula',
          'mensalidade',
          'renegociacao',
          'taxa_segunda_via',
          'taxa_biblioteca',
          'taxa_material',
          'taxa_rematricula',
          'taxa_diploma',
          'taxa_trancamento',
          'taxa_avulsa',
        ]
      }
      app.save(col)
    } catch (err) {
      console.warn('[0021_add_fee_categories_to_charges] Erro:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('charges')
      const field = col.fields.getByName('category')
      if (field) {
        field.values = ['matricula', 'mensalidade', 'renegociacao']
      }
      app.save(col)
    } catch (_) {}
  },
)
