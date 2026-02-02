'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { bulkCreateMenus } from './actions'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

interface CSVRow {
  메뉴명: string
  설명?: string
  활성?: string
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
      toast.error('CSV 파일만 업로드 가능합니다')
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
          if (!row.메뉴명) validationErrors.push(`${index + 1}행: 메뉴명 누락`)
        })

        if (validationErrors.length > 0) {
          setErrors(validationErrors.slice(0, 10)) // Show first 10 errors
        }
      },
      error: (error) => {
        toast.error(`CSV 파싱 오류: ${error.message}`)
      },
    })
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('파일을 선택해주세요')
      return
    }

    if (errors.length > 0) {
      toast.error(
        'CSV 파일에 오류가 있습니다. 오류를 수정한 후 다시 시도해주세요.'
      )
      return
    }

    setIsUploading(true)

    Papa.parse<CSVRow>(file, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const result = await bulkCreateMenus(results.data)

          if (result.success) {
            toast.success(
              `성공: ${result.successCount}건 등록, 실패: ${result.failedCount}건`
            )
            setIsOpen(false)
            setFile(null)
            setPreview([])
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
      },
      error: (error) => {
        toast.error(`CSV 파싱 오류: ${error.message}`)
        setIsUploading(false)
      },
    })
  }

  const downloadTemplate = () => {
    const template =
      '메뉴명,설명,활성\n닭강정,매콤달콤한 닭강정,true\n양념치킨,매콤한 양념치킨,true'
    const blob = new Blob(['\uFEFF' + template], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '메뉴_업로드_템플릿.csv'
    link.click()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border-2 border-brutal-black bg-brutal-green px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
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

            <div className="relative transform overflow-hidden border-3 border-brutal-black bg-brutal-white px-4 pb-4 pt-5 text-left shadow-brutal-lg transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <div>
                <h3 className="mb-4 text-lg font-semibold leading-6 text-gray-900">
                  메뉴 CSV 일괄 업로드
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm text-gray-600">
                      CSV 파일 형식: 메뉴명,설명,활성 (활성: true 또는 false,
                      기본값: true)
                    </p>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="text-sm text-blue-600 underline hover:text-blue-800"
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
                        오류가 발견되었습니다:
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-700">
                        미리보기 (처음 5개 행)
                      </p>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                메뉴명
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                설명
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                                활성
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {preview.map((row, index) => (
                              <tr key={index}>
                                <td className="whitespace-nowrap px-3 py-2 text-xs">
                                  {row.메뉴명}
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  {row.설명 || '-'}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-center text-xs">
                                  {row.활성 || 'true'}
                                </td>
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
