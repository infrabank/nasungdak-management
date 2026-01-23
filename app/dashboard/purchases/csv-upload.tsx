'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { bulkCreatePurchases } from './actions'
import { Button } from '@/components/ui/button'

interface CSVRow {
  날짜: string
  메뉴: string
  재료: string
  공급업체: string
  수량: string
  단가: string
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
          if (!row.메뉴) validationErrors.push(`${index + 1}행: 메뉴 누락`)
          if (!row.재료) validationErrors.push(`${index + 1}행: 재료 누락`)
          if (!row.공급업체) validationErrors.push(`${index + 1}행: 공급업체 누락`)
          if (!row.수량) validationErrors.push(`${index + 1}행: 수량 누락`)
          if (!row.단가) validationErrors.push(`${index + 1}행: 단가 누락`)
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
          const result = await bulkCreatePurchases(JSON.parse(JSON.stringify(results.data)))

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
    const template = '날짜,메뉴,재료,공급업체,수량,단가,비고\n2024-01-01,닭강정,닭고기,ABC공급업체,10.5,5000,테스트 데이터'
    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '매입_업로드_템플릿.csv'
    link.click()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block bg-brutal-green border-2 border-brutal-black px-3 py-2 text-center text-sm font-bold text-brutal-black shadow-brutal-sm hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
      >
        CSV 일괄 업로드
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-brutal-black/75 transition-opacity"
              onClick={() => !isUploading && setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden bg-brutal-white border-3 border-brutal-black shadow-brutal px-4 pb-4 pt-5 text-left sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <div>
                <h3 className="text-lg font-black leading-6 text-brutal-black mb-4">
                  매입 CSV 일괄 업로드
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-brutal-black mb-2">
                      CSV 파일 형식: 날짜,메뉴,재료,공급업체,수량,단가,비고
                    </p>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="text-sm font-bold text-brutal-black underline underline-offset-2 hover:bg-brutal-yellow px-1"
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
                      className="block w-full text-sm font-medium text-brutal-black border-2 border-brutal-black cursor-pointer bg-brutal-white p-2"
                    />
                  </div>

                  {errors.length > 0 && (
                    <div className="bg-brutal-pink border-2 border-brutal-black p-3">
                      <p className="text-sm font-bold text-brutal-black mb-2">
                        오류가 발견되었습니다:
                      </p>
                      <ul className="text-sm font-medium text-brutal-black list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-brutal-black mb-2">
                        미리보기 (처음 5개 행)
                      </p>
                      <div className="overflow-x-auto border-2 border-brutal-black">
                        <table className="min-w-full text-sm">
                          <thead className="bg-brutal-yellow border-b-2 border-brutal-black">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-bold text-brutal-black">날짜</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-brutal-black">메뉴</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-brutal-black">재료</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-brutal-black">공급업체</th>
                              <th className="px-3 py-2 text-right text-xs font-bold text-brutal-black">수량</th>
                              <th className="px-3 py-2 text-right text-xs font-bold text-brutal-black">단가</th>
                            </tr>
                          </thead>
                          <tbody className="bg-brutal-white divide-y-2 divide-brutal-black/20">
                            {preview.map((row, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">{row.날짜}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">{row.메뉴}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">{row.재료}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">{row.공급업체}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">{row.수량}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">{row.단가}</td>
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
