import { PriceTableItem, Course } from '@/types/portal'

export interface MatchedPrice {
  item: PriceTableItem
  suggestedFee: number // matrícula
  monthlyFee: number // mensalidade
  isExactCategoryMatch: boolean
}

/**
 * Localiza na tabela de preços o item correspondente ao curso e nível da matrícula.
 *
 * Estratégia de correspondência:
 * 1. Filtra itens do mesmo nível ('graduacao' ou 'pos_graduacao').
 * 2. Compara palavras-chave entre o nome/código/tipo do curso e o título da categoria da tabela
 *    (ex.: 'Engenharia', 'ADS' / 'Computação' / 'Tecnólogo', 'IA' / 'Tecnologia', 'Direito').
 * 3. Se houver correspondência semântica, usa o item encontrado.
 * 4. Se não encontrar uma categoria específica mas houver itens no mesmo nível, seleciona o primeiro
 *    como padrão do nível.
 * 5. Se não houver itens cadastrados para o nível, retorna null (para exibir aviso).
 */
export function findPriceForCourse(
  course: Course | undefined,
  level: 'graduacao' | 'pos_graduacao',
  priceTable: PriceTableItem[],
): MatchedPrice | null {
  const sameLevelItems = priceTable.filter((p) => p.level === level)
  if (sameLevelItems.length === 0) {
    return null
  }

  if (!course) {
    const fallback = sameLevelItems[0]
    return {
      item: fallback,
      suggestedFee: fallback.enrollmentFee,
      monthlyFee: fallback.standardMonthlyFee,
      isExactCategoryMatch: false,
    }
  }

  const courseText = `${course.name} ${course.code} ${course.type} ${course.modality}`.toLowerCase()

  // Procura por correspondência mais forte
  let bestItem: PriceTableItem | null = null
  let bestScore = 0

  for (const item of sameLevelItems) {
    const catLower = item.category.toLowerCase()
    let score = 0

    // Engenharia
    if (courseText.includes('engenharia') && catLower.includes('engenharia')) score += 5
    // ADS / Tecnólogo / EAD
    if (
      (courseText.includes('desenvolvimento') ||
        courseText.includes('ads') ||
        courseText.includes('tecnol')) &&
      (catLower.includes('tecnólog') || catLower.includes('computação') || catLower.includes('ead'))
    ) {
      score += 5
    }
    // IA / Machine Learning
    if (
      (courseText.includes('inteligência') ||
        courseText.includes('ia') ||
        courseText.includes('machine')) &&
      (catLower.includes('ia') || catLower.includes('tecnologia'))
    ) {
      score += 5
    }
    // Direito / Gestão / Compliance
    if (
      (courseText.includes('direito') ||
        courseText.includes('lgpd') ||
        courseText.includes('gestão')) &&
      (catLower.includes('direito') || catLower.includes('gestão'))
    ) {
      score += 5
    }
    // Modalidade
    if (course.modality === 'presencial' && catLower.includes('presencial')) score += 2
    if (course.modality === 'ead' && catLower.includes('ead')) score += 2

    if (score > bestScore) {
      bestScore = score
      bestItem = item
    }
  }

  if (bestItem && bestScore > 0) {
    return {
      item: bestItem,
      suggestedFee: bestItem.enrollmentFee,
      monthlyFee: bestItem.standardMonthlyFee,
      isExactCategoryMatch: true,
    }
  }

  // Fallback para o primeiro item do mesmo nível
  const fallback = sameLevelItems[0]
  return {
    item: fallback,
    suggestedFee: fallback.enrollmentFee,
    monthlyFee: fallback.standardMonthlyFee,
    isExactCategoryMatch: false,
  }
}
