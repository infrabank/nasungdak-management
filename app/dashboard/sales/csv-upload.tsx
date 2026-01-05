'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { bulkCreateSales } from './actions'
import { Button } from '@/components/ui/button'

interface CSVRow {
  날짜: string
  SKU: string
  판매수량: string
  비고?: string
}

export default function CSVUpload() {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      alert('CSV 파일만 업로드 가능합니다')
      return
    }

    setFile(selectedFile)
    setErrors([])

    // Parse and preview CSV
    Papa.parse<CSVRow>(selectedFile, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.slice(0, 5) // Preview first 5 rows
        setPreview(rows)

        // Basic validation
        const validationErrors: string[] = []
        results.data.forEach((row, index) => {
          if (!row.날짜) validationErrors.push(`${index + 1}행: 날짜 누락`)
          if (!row.SKU) validationErrors.push(`${index + 1}행: SKU 누락`)
          if (!row.판매수량) validationErrors.push(`${index + 1}행: 판매수량 누락`)
        })

        if (validationErrors.length > 0) {
          setErrors(validationErrors.slice(0, 10)) // Show first 10 errors
        }
      },
      error: (error) => {
        alert(`CSV 파싱 오류: ${error.message}`)
      },
    })
  }

  const handleUpload = async () => {
    if (!file) {
      alert('파일을 선택해주세요')
      return
    }

    if (errors.length > 0) {
      alert('CSV 파일에 오류가 있습니다. 오류를 수정한 후 다시 시도해주세요.')
      return
    }

    setIsUploading(true)

    Papa.parse<CSVRow>(file, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Server Action에 직렬화 가능한 데이터로 전달
          const result = await bulkCreateSales(JSON.parse(JSON.stringify(results.data)))

          if (result.success) {
            alert(`성공: ${result.successCount}건 등록, 실패: ${result.failedCount}건${result.errors && result.errors.length > 0 ? '\n\n오류:\n' + result.errors.join('\n') : ''}`)
            setIsOpen(false)
            setFile(null)
            setPreview([])
            setErrors([])
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          } else {
            alert(`업로드 실패: ${result.error}`)
          }
        } catch (error) {
          alert(`업로드 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
        } finally {
          setIsUploading(false)
        }
      },
      error: (error) => {
        alert(`CSV 파싱 오류: ${error.message}`)
        setIsUploading(false)
      },
    })
  }

  const downloadTemplate = () => {
    const template = '날짜,SKU,판매수량,비고\n2024-01-01,닭강정-대-001,50,테스트 데이터'
    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '판매_업로드_템플릿.csv'
    link.click()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block rounded-md bg-green-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
      >
        CSV 일괄 업로드
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => !isUploading && setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                  판매 CSV 일괄 업로드
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      CSV 파일 형식: 날짜,SKU,판매수량,비고
                    </p>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
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
                      className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none p-2"
                    />
                  </div>

                  {errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm font-semibold text-red-800 mb-2">
                        오류가 발견되었습니다:
                      </p>
                      <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        미리보기 (처음 5개 행)
                      </p>
                      <div className="overflow-x-auto border rounded-md">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">날짜</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">판매수량</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">비고</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {preview.map((row, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">{row.날짜}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">{row.SKU}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{row.판매수량}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">{row.비고 || '-'}</td>
                              </tr>
                            ))}
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
