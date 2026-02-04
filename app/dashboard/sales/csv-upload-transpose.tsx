'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { bulkCreateSales } from './actions'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

interface CSVUploadTransposeProps {
  storeId?: string
}

export default function CSVUploadTranspose({
  storeId,
}: CSVUploadTransposeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('CSV 파일만 업로드 가능합니다')
      return
    }

    setFile(selectedFile)
    setErrors([])

    // Parse CSV
    Papa.parse(selectedFile, {
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Expected format:
          // Row 1: 날짜, SKU1, SKU2, SKU3, ...
          // Row 2: 2024-01-01, 10, 20, 30, ...
          // Row 3: 2024-01-02, 15, 25, 35, ...

          const rows = results.data as string[][]

          if (rows.length < 2) {
            setErrors(['CSV 파일에 충분한 데이터가 없습니다'])
            return
          }

          // First row is header (SKU names)
          const header = rows[0]
          if (header[0] !== '날짜' && header[0] !== 'date') {
            setErrors(['첫 번째 열은 "날짜" 헤더여야 합니다'])
            return
          }

          const skuNames = header.slice(1) // Skip '날짜' column

          // Preview transformation
          const preview: any[] = []
          for (let i = 1; i < Math.min(rows.length, 4); i++) {
            // Preview 3 dates
            const row = rows[i]
            const date = row[0]

            for (let j = 1; j < row.length && j < header.length; j++) {
              const quantity = row[j]
              if (
                quantity &&
                quantity.trim() !== '' &&
                parseFloat(quantity) > 0
              ) {
                preview.push({
                  date,
                  sku: skuNames[j - 1],
                  quantity,
                })
              }
            }
          }

          setPreviewData({
            header,
            rows,
            preview,
            skuCount: skuNames.length,
            dateCount: rows.length - 1,
          })
        } catch (error) {
          setErrors([
            `파싱 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
          ])
        }
      },
      error: (error) => {
        toast.error(`CSV 파싱 오류: ${error.message}`)
      },
    })
  }

  const handleUpload = async () => {
    if (!storeId) {
      toast.error(
        '매장을 먼저 선택해주세요. 상단에서 매장을 선택한 후 다시 시도해주세요.'
      )
      return
    }

    if (!file || !previewData) {
      toast.error('파일을 선택해주세요')
      return
    }

    if (errors.length > 0) {
      toast.error('CSV 파일에 오류가 있습니다')
      return
    }

    setIsUploading(true)

    try {
      const { header, rows } = previewData
      const skuNames = header.slice(1)

      // Transform data
      const salesData: Array<{ 날짜: string; SKU: string; 판매수량: string }> =
        []

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const date = row[0]

        if (!date || date.trim() === '') continue

        for (let j = 1; j < row.length && j < header.length; j++) {
          const quantity = row[j]
          if (quantity && quantity.trim() !== '' && parseFloat(quantity) > 0) {
            salesData.push({
              날짜: date,
              SKU: skuNames[j - 1],
              판매수량: quantity,
            })
          }
        }
      }

      const result = await bulkCreateSales(salesData, storeId)

      if (result.success) {
        toast.success(
          `성공: ${result.successCount}건 등록, 실패: ${result.failedCount}건`
        )
        if (result.errors && result.errors.length > 0) {
          toast.error(`오류:\n${result.errors.slice(0, 10).join('\n')}`)
        }
        setIsOpen(false)
        setFile(null)
        setPreviewData(null)
        setErrors([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        toast.error(`업로드 실패: ${result.error}`)
      }
    } catch (error) {
      toast.error(
        `업로드 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      )
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `날짜,닭강정_소,닭강정_중,닭강정_컵,떡볶이_1인분,떡볶이_컵
2024-01-01,50,30,20,15,10
2024-01-02,45,35,25,20,12
2024-01-03,55,40,22,18,11`
    const blob = new Blob(['\uFEFF' + template], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '판매_업로드_템플릿_가로형식.csv'
    link.click()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border-2 border-brutal-black bg-brutal-green px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
      >
        엑셀 형식 업로드
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => !isUploading && setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden border-3 border-brutal-black bg-brutal-white px-4 pb-4 pt-5 text-left shadow-brutal-lg transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
              <div>
                <h3 className="mb-4 text-lg font-semibold leading-6 text-gray-900">
                  판매 CSV 일괄 업로드 (엑셀 형식)
                </h3>

                <div className="space-y-4">
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                    <p className="mb-2 text-sm text-blue-800">
                      <strong>📊 엑셀 형식 안내</strong>
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-xs text-blue-700">
                      <li>첫 행: 날짜, SKU1, SKU2, SKU3, ...</li>
                      <li>이후 행: 날짜별로 각 SKU의 판매수량 입력</li>
                      <li>0 또는 빈 칸은 판매 기록 없음으로 처리</li>
                    </ul>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="mt-2 text-sm font-medium text-blue-700 underline hover:text-blue-900"
                    >
                      템플릿 다운로드
                    </button>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="block w-full cursor-pointer rounded-md border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 focus:outline-none"
                    />
                  </div>

                  {errors.length > 0 && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3">
                      <p className="mb-2 text-sm font-semibold text-red-800">
                        오류:
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {previewData && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-700">
                        파일 정보: {previewData.skuCount}개 SKU ×{' '}
                        {previewData.dateCount}개 날짜
                      </p>
                      <p className="mb-2 text-sm font-semibold text-gray-700">
                        변환 미리보기 (처음 일부만 표시)
                      </p>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                날짜
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                SKU
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                판매수량
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {previewData.preview.map(
                              (row: any, index: number) => (
                                <tr key={index}>
                                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                                    {row.date}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                                    {row.sku}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">
                                    {row.quantity}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading || !file || errors.length > 0}
                  className="w-full sm:col-start-2"
                >
                  {isUploading ? '업로드 중...' : '업로드'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsOpen(false)}
                  disabled={isUploading}
                  className="mt-3 w-full sm:col-start-1 sm:mt-0"
                >
                  취소
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
