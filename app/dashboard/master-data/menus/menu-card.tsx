import { MenuCategory } from '@/lib/db/schema'
import MenuForm from './menu-form'

interface MenuCardProps {
  menu: MenuCategory
}

export default function MenuCard({ menu }: MenuCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="font-semibold text-gray-900">
          <span className="mr-1">🍗</span>
          {menu.menuName}
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
            menu.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {menu.isActive ? '활성' : '비활성'}
        </span>
      </div>
      
      <div className="text-sm text-gray-600 mb-4 flex items-start">
        <span className="mr-2 mt-0.5">📝</span>
        <span>{menu.description || '설명 없음'}</span>
      </div>

      <div className="border-t border-gray-100 pt-3 flex justify-end">
        <MenuForm menu={menu} />
      </div>
    </div>
  )
}
