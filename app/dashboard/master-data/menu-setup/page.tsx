import { getIngredients } from '../ingredients/actions'
import MenuSetupWizard from './menu-setup-wizard'

export default async function MenuSetupPage() {
  const ingredients = await getIngredients()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-brutal-black">
          메뉴 셋업 마법사
        </h1>
        <p className="mt-2 text-sm font-medium text-brutal-black/70">
          메뉴 + 재료 + SKU를 한번에 등록합니다
        </p>
      </div>

      <MenuSetupWizard existingIngredients={ingredients} />
    </div>
  )
}
