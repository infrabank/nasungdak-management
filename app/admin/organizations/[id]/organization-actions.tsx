'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  toggleOrganizationStatus,
  updateOrganizationPlan,
  deleteOrganization,
  extendTrial,
} from '../../actions'
import { toast } from 'sonner'
import { Power, Trash2, Clock, CreditCard, AlertTriangle } from 'lucide-react'
import { PLANS, type PlanType } from '@/lib/features'

interface Props {
  organization: {
    id: string
    name: string
    isActive: boolean
    plan: string
    maxStores: number
    maxUsers: number
    trialEndsAt: Date | null
  }
}

export default function OrganizationActions({ organization }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)

  const handleToggleStatus = async () => {
    setIsLoading(true)
    try {
      const result = await toggleOrganizationStatus(organization.id)
      if (result.success) {
        toast.success(
          organization.isActive
            ? '조직이 비활성화되었습니다'
            : '조직이 활성화되었습니다'
        )
        router.refresh()
      } else {
        toast.error(result.error || '처리 중 오류가 발생했습니다')
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const result = await deleteOrganization(organization.id)
      if (result.success) {
        toast.success('조직이 삭제되었습니다')
        router.push('/admin')
      } else {
        toast.error(result.error || '삭제 중 오류가 발생했습니다')
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleToggleStatus}
          disabled={isLoading}
          className={`inline-flex items-center gap-2 border-2 border-brutal-black px-4 py-2 text-sm font-bold shadow-brutal transition-all hover:shadow-brutal-lg disabled:opacity-50 ${
            organization.isActive
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          <Power className="h-4 w-4" />
          {organization.isActive ? '비활성화' : '활성화'}
        </button>

        <button
          onClick={() => setShowPlanModal(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 border-2 border-brutal-black bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800 shadow-brutal transition-all hover:shadow-brutal-lg disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          플랜 변경
        </button>

        <button
          onClick={() => setShowTrialModal(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 border-2 border-brutal-black bg-purple-100 px-4 py-2 text-sm font-bold text-purple-800 shadow-brutal transition-all hover:shadow-brutal-lg disabled:opacity-50"
        >
          <Clock className="h-4 w-4" />
          체험 연장
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 border-2 border-brutal-black bg-red-100 px-4 py-2 text-sm font-bold text-red-800 shadow-brutal transition-all hover:shadow-brutal-lg disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          삭제
        </button>
      </div>

      {/* Plan Change Modal */}
      {showPlanModal && (
        <PlanModal
          organization={organization}
          onClose={() => setShowPlanModal(false)}
          onSuccess={() => {
            setShowPlanModal(false)
            router.refresh()
          }}
        />
      )}

      {/* Trial Extension Modal */}
      {showTrialModal && (
        <TrialModal
          organization={organization}
          onClose={() => setShowTrialModal(false)}
          onSuccess={() => {
            setShowTrialModal(false)
            router.refresh()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal-lg">
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">조직 삭제</h3>
            </div>
            <p className="mb-6 text-brutal-black/70">
              <strong>{organization.name}</strong> 조직을 삭제하시겠습니까?
              <br />이 작업은 취소할 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="border-2 border-brutal-black bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-brutal disabled:opacity-50"
              >
                {isLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PlanModal({
  organization,
  onClose,
  onSuccess,
}: {
  organization: Props['organization']
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedPlan, setSelectedPlan] = useState(organization.plan)
  const [maxStores, setMaxStores] = useState(organization.maxStores)
  const [maxUsers, setMaxUsers] = useState(organization.maxUsers)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await updateOrganizationPlan(
        organization.id,
        selectedPlan,
        maxStores,
        maxUsers
      )
      if (result.success) {
        toast.success('플랜이 변경되었습니다')
        onSuccess()
      } else {
        toast.error(result.error || '변경 중 오류가 발생했습니다')
      }
    } catch {
      toast.error('변경 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const planOptions = [
    'free',
    'starter',
    'growth',
    'pro',
    'enterprise',
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal-lg"
      >
        <h3 className="mb-4 text-lg font-bold text-brutal-black">플랜 변경</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-brutal-black">
              플랜
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => {
                const plan = e.target.value as PlanType
                setSelectedPlan(plan)
                if (PLANS[plan]) {
                  setMaxStores(PLANS[plan].maxStores)
                  setMaxUsers(PLANS[plan].maxUsers)
                }
              }}
              className="w-full border-2 border-brutal-black bg-brutal-white px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
            >
              {planOptions.map((plan) => (
                <option key={plan} value={plan}>
                  {PLANS[plan]?.nameKo || plan}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-brutal-black">
                최대 매장 수
              </label>
              <input
                type="number"
                value={maxStores}
                onChange={(e) => setMaxStores(parseInt(e.target.value) || 0)}
                min={-1}
                className="w-full border-2 border-brutal-black bg-brutal-white px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
              />
              <p className="mt-1 text-xs text-brutal-black/50">-1 = 무제한</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-brutal-black">
                최대 사용자 수
              </label>
              <input
                type="number"
                value={maxUsers}
                onChange={(e) => setMaxUsers(parseInt(e.target.value) || 0)}
                min={-1}
                className="w-full border-2 border-brutal-black bg-brutal-white px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
              />
              <p className="mt-1 text-xs text-brutal-black/50">-1 = 무제한</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal disabled:opacity-50"
          >
            {isLoading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

function TrialModal({
  organization,
  onClose,
  onSuccess,
}: {
  organization: Props['organization']
  onClose: () => void
  onSuccess: () => void
}) {
  const [days, setDays] = useState(7)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await extendTrial(organization.id, days)
      if (result.success) {
        toast.success(`체험 기간이 ${days}일 연장되었습니다`)
        onSuccess()
      } else {
        toast.error(result.error || '연장 중 오류가 발생했습니다')
      }
    } catch {
      toast.error('연장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal-lg"
      >
        <h3 className="mb-4 text-lg font-bold text-brutal-black">
          체험 기간 연장
        </h3>

        <div>
          <label className="mb-2 block text-sm font-bold text-brutal-black">
            연장 일수
          </label>
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`border-2 border-brutal-black px-4 py-2 text-sm font-bold ${
                  days === d
                    ? 'bg-brutal-yellow'
                    : 'bg-brutal-white hover:bg-brutal-yellow/20'
                }`}
              >
                {d}일
              </button>
            ))}
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
              min={1}
              className="w-20 border-2 border-brutal-black bg-brutal-white px-3 py-2 text-center font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
            />
          </div>
          <p className="mt-2 text-sm text-brutal-black/50">
            현재 체험 종료:{' '}
            {organization.trialEndsAt
              ? new Date(organization.trialEndsAt).toLocaleDateString('ko-KR')
              : '없음'}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="border-2 border-brutal-black bg-brutal-yellow px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal disabled:opacity-50"
          >
            {isLoading ? '연장 중...' : '연장'}
          </button>
        </div>
      </form>
    </div>
  )
}
