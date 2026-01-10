'use client'

import { formatDate, formatCurrency } from '@/lib/utils/format'
import { OilChangeHistory } from '@/lib/db/schema'

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
        {oilChange.oilType}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {Number(oilChange.quantity).toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(Number(oilChange.unitPrice))}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {formatCurrency(Number(oilChange.totalCost))}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {oilChange.usageDays ? `${oilChange.usageDays}일` : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {oilChange.supplierName}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="max-w-xs truncate">
          {oilChange.notes || '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex space-x-2">
          <button
            className="text-blue-600 hover:text-blue-900"
            onClick={() => {
              // TODO: Implement edit functionality
              console.log('Edit oil change:', oilChange.id)
            }}
          >
            수정
          </button>
          <button
            className="text-red-600 hover:text-red-900"
            onClick={() => {
              // TODO: Implement delete functionality
              console.log('Delete oil change:', oilChange.id)
            }}
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}