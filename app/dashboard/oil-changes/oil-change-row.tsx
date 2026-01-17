'use client'

import { formatDate } from '@/lib/utils/format'
import type { OilChangeHistory } from '@/lib/db/schema'

interface OilChangeRowProps {
  oilChange: OilChangeHistory
}

export default function OilChangeRow({ oilChange }: OilChangeRowProps) {
  const fryerTypeColor = oilChange.fryerType === '초벌' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(new Date(oilChange.changeDate), 'yyyy-MM-dd')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${fryerTypeColor}`}>
          {oilChange.fryerType}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {oilChange.usageDays ? `${oilChange.usageDays}일` : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="max-w-xs truncate">
          {oilChange.notes || '-'}
        </div>
      </td>
    </tr>
  )
}