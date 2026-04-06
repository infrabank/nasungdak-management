import { getIngredients } from './actions'
import IngredientsPageClient from './ingredients-page-client'

export default async function IngredientsPage() {
  const ingredients = await getIngredients()

  return <IngredientsPageClient initialIngredients={ingredients} />
}
