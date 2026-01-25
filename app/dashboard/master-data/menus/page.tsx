import { getMenus, deleteMenu } from './actions'
import MenuForm from './menu-form'
import CSVUpload from './csv-upload'
import MenuCard from './menu-card'

export default async function MenusPage() {
  const menus = await getMenus()

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
           <h1 className="text-2xl sm:text-3xl font-bold text-brutal-black">메뉴 카테고리</h1>
           <p className="mt-1 text-sm text-brutal-black/70">
             메뉴 카테고리 등록 및 관리
           </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CSVUpload />
          <MenuForm />
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {menus.length === 0 ? (
            <div className="text-center py-10 font-medium text-brutal-black/70 bg-brutal-white border-3 border-dashed border-brutal-black">
              등록된 메뉴가 없습니다
            </div>
          ) : (
            menus.map((menu) => <MenuCard key={menu.id} menu={menu} />)
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
            <table className="min-w-full">
              <thead className="bg-brutal-yellow border-b-3 border-brutal-black">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black">
                    메뉴명
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                    설명
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-sm font-black text-brutal-black">
                    활성
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6">
                    <span className="sr-only">작업</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
                {menus.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm font-medium text-brutal-black">
                      등록된 메뉴가 없습니다
                    </td>
                  </tr>
                ) : (
                  menus.map((menu) => (
                    <tr key={menu.id}>
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-brutal-black">
                        {menu.menuName}
                      </td>
                      <td className="px-3 py-4 text-sm text-brutal-black/70">
                        {menu.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-bold border-2 ${
                            menu.isActive
                              ? 'bg-brutal-green border-brutal-black text-brutal-black'
                              : 'bg-brutal-white border-brutal-black text-brutal-black'
                          }`}
                        >
                          {menu.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                        <MenuForm menu={menu} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
