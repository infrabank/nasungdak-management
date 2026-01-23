import { MenuCategory } from '@/lib/db/schema'
import MenuForm from './menu-form'

interface MenuCardProps {
  menu: MenuCategory
}

export default function MenuCard({ menu }: MenuCardProps) {
  return (
    <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-4">
      <div className="flex justify-between items-start mb-2">
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
      
      <div className="text-sm font-medium text-brutal-black mb-4 flex items-start">
        <span className="mr-2 mt-0.5">📝</span>
        <span>{menu.description || '설명 없음'}</span>
      </div>

      <div className="border-t-2 border-brutal-black/20 pt-3 flex justify-end">
        <MenuForm menu={menu} />
      </div>
    </div>
  )
}
