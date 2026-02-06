import { getSalesMenus, getSkusForSelect } from './actions'
import MenuForm from './menu-form'
import { formatCurrency } from '@/lib/utils/format'

export default async function SalesMenusPage() {
  const [menus, skuOptions] = await Promise.all([
    getSalesMenus(),
    getSkusForSelect(),
  ])

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-brutal-black">
            판매 메뉴 관리
          </h1>
          <p className="mt-2 text-sm text-brutal-black/70">
            단품 메뉴와 세트 메뉴를 관리합니다
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <MenuForm skus={skuOptions} />
        </div>
      </div>

      <div className="mt-8">
        <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
          <table className="min-w-full">
            <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black"
                >
                  메뉴명
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-center text-sm font-black text-brutal-black"
                >
                  유형
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                >
                  판매가
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-black text-brutal-black"
                >
                  구성
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-center text-sm font-black text-brutal-black"
                >
                  상태
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-6">
                  <span className="sr-only">작업</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
              {menus.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm font-medium text-brutal-black"
                  >
                    등록된 메뉴가 없습니다
                  </td>
                </tr>
              ) : (
                menus.map((menu) => (
                  <tr key={menu.id}>
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-brutal-black">
                      {menu.menuName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-center text-sm">
                      <span
                        className={`inline-flex border-2 px-2 py-1 text-xs font-bold ${
                          menu.menuType === 'bundle'
                            ? 'border-brutal-black bg-brutal-blue text-brutal-black'
                            : 'border-brutal-black bg-brutal-white text-brutal-black'
                        }`}
                      >
                        {menu.menuType === 'bundle' ? '세트' : '단품'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                      {formatCurrency(Number(menu.basePrice))}
                    </td>
                    <td className="px-3 py-4 text-sm text-brutal-black/70">
                      {menu.items.length === 0 ? (
                        <span className="text-brutal-black/40">-</span>
                      ) : (
                        <div className="space-y-1">
                          {menu.items.map((item) => (
                            <div key={item.id} className="text-xs">
                              {item.skuName} ×{item.quantity}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-center text-sm">
                      <span
                        className={`inline-flex border-2 px-2 py-1 text-xs font-bold ${
                          menu.isActive
                            ? 'border-brutal-black bg-brutal-green text-brutal-black'
                            : 'border-brutal-black bg-brutal-white text-brutal-black'
                        }`}
                      >
                        {menu.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <MenuForm menu={menu} skus={skuOptions} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
