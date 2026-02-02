import { MenuCategory } from '@/lib/db/schema'
import MenuForm from './menu-form'

interface MenuCardProps {
  menu: MenuCategory
}

export default function MenuCard({ menu }: MenuCardProps) {
  return (
    <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
      <div className="mb-2 flex items-start justify-between">
        <div className="font-bold text-brutal-black">
          <span className="mr-1">🍗</span>
          {menu.menuName}
        </div>
        <span
          className={`inline-flex border-2 border-brutal-black px-2 py-1 text-xs font-bold leading-5 ${
            menu.isActive
              ? 'bg-brutal-green text-brutal-black'
              : 'bg-brutal-white text-brutal-black'
          }`}
        >
          {menu.isActive ? '활성' : '비활성'}
        </span>
      </div>

      <div className="mb-4 flex items-start text-sm font-medium text-brutal-black">
        <span className="mr-2 mt-0.5">📝</span>
        <span>{menu.description || '설명 없음'}</span>
      </div>

      <div className="flex justify-end border-t-2 border-brutal-black/20 pt-3">
        <MenuForm menu={menu} />
      </div>
    </div>
  )
}
