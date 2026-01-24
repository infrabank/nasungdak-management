'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { bulkCreateIngredients } from './actions'
import { Button } from '@/components/ui/button'

interface CSVRow {
  재료명: string
  단위: string
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
          if (!row.재료명) validationErrors.push(`${index + 1}행: 재료명 누락`)
          if (!row.단위) validationErrors.push(`${index + 1}행: 단위 누락`)
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
          const result = await bulkCreateIngredients(results.data)

          if (result.success) {
            alert(`성공: ${result.successCount}건 등록, 실패: ${result.failedCount}건`)
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
    const template = '재료명,단위,설명,활성\n닭고기,kg,신선한 닭고기,true\n고추장,g,매콤한 고추장,true'
    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '재료_업로드_템플릿.csv'
    link.click()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-green border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
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

            <div className="relative transform overflow-hidden bg-brutal-white border-3 border-brutal-black shadow-brutal-lg px-4 pb-4 pt-5 text-left transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                  재료 CSV 일괄 업로드
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      CSV 파일 형식: 재료명,단위,설명,활성 (활성: true 또는 false, 기본값: true)
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
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">재료명</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">단위</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">설명</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">활성</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {preview.map((row, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">{row.재료명}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">{row.단위}</td>
                                <td className="px-3 py-2 text-xs">{row.설명 || '-'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-center">{row.활성 || 'true'}</td>
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
