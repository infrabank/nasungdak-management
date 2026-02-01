import { db } from '@/lib/db'
import { organizations, planFeatures, subscriptions } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

/**
 * SaaS 기능 플래그 시스템
 * 
 * 플랜별 기능 제한을 관리합니다.
 */

// 플랜 정의
export const PLANS = {
  free: {
    name: 'Free',
    nameKo: '무료',
    priceMonthly: 0,
    priceYearly: 0,
    maxStores: 1,
    maxUsers: 1,
    description: '소규모 매장을 위한 기본 기능',
  },
  basic: {
    name: 'Basic',
    nameKo: '베이직',
    priceMonthly: 29000,
    priceYearly: 290000,
    maxStores: 1,
    maxUsers: 3,
    description: '성장하는 매장을 위한 확장 기능',
  },
  standard: {
    name: 'Standard',
    nameKo: '스탠다드',
    priceMonthly: 79000,
    priceYearly: 790000,
    maxStores: 3,
    maxUsers: 10,
    description: '다매장 운영을 위한 통합 관리',
  },
  premium: {
    name: 'Premium',
    nameKo: '프리미엄',
    priceMonthly: 199000,
    priceYearly: 1990000,
    maxStores: -1, // 무제한
    maxUsers: -1, // 무제한
    description: '대규모 프랜차이즈를 위한 프리미엄 기능',
  },
  enterprise: {
    name: 'Enterprise',
    nameKo: '엔터프라이즈',
    priceMonthly: -1, // 협의
    priceYearly: -1,
    maxStores: -1,
    maxUsers: -1,
    description: '맞춤형 기업 솔루션',
  },
} as const

export type PlanType = keyof typeof PLANS

// 기능 키 정의
export const FEATURES = {
  // 기본 기능
  purchases: { name: '매입 관리', description: '매입 등록 및 조회' },
  sales: { name: '판매 관리', description: '판매 등록 및 조회' },
  'master-data': { name: '기초 데이터', description: '메뉴, 재료, SKU 관리' },
  
  // 확장 기능
  inventory: { name: '재고 관리', description: '실시간 재고 추적' },
  employees: { name: '직원 관리', description: '직원 및 출퇴근 관리' },
  'fixed-costs': { name: '고정비용', description: '고정비용 관리' },
  'oil-changes': { name: '기름 교체', description: '기름 교체 이력 관리' },
  
  // 고급 기능
  analytics: { name: '분석', description: '매출 및 원가 분석' },
  alerts: { name: '알림', description: '재고 부족 알림 (카카오)' },
  'csv-import': { name: 'CSV 가져오기', description: '대량 데이터 업로드' },
  'csv-export': { name: 'CSV 내보내기', description: '데이터 내보내기' },
  
  // 프리미엄 기능
  'multi-store': { name: '다매장', description: '여러 매장 통합 관리' },
  'api-access': { name: 'API 접근', description: 'REST API 사용' },
  'custom-reports': { name: '맞춤 리포트', description: '사용자 정의 리포트' },
  webhooks: { name: '웹훅', description: '외부 시스템 연동' },
  
  // 엔터프라이즈 기능
  'white-label': { name: '화이트 라벨', description: '브랜딩 커스터마이징' },
  sso: { name: 'SSO', description: '싱글 사인온' },
  'dedicated-support': { name: '전담 지원', description: '전담 기술 지원' },
} as const

export type FeatureKey = keyof typeof FEATURES

// 플랜별 기본 기능 설정
export const DEFAULT_PLAN_FEATURES: Record<PlanType, { features: FeatureKey[]; limits?: Partial<Record<FeatureKey, number>> }> = {
  free: {
    features: ['purchases', 'sales', 'master-data'],
    limits: {
      purchases: 100, // 월 100건
      sales: 100,
    },
  },
  basic: {
    features: ['purchases', 'sales', 'master-data', 'inventory', 'analytics', 'csv-import'],
    limits: {
      purchases: 1000,
      sales: 1000,
    },
  },
  standard: {
    features: [
      'purchases', 'sales', 'master-data', 'inventory', 'employees',
      'fixed-costs', 'oil-changes', 'analytics', 'alerts',
      'csv-import', 'csv-export', 'multi-store',
    ],
  },
  premium: {
    features: [
      'purchases', 'sales', 'master-data', 'inventory', 'employees',
      'fixed-costs', 'oil-changes', 'analytics', 'alerts',
      'csv-import', 'csv-export', 'multi-store',
      'api-access', 'custom-reports', 'webhooks',
    ],
  },
  enterprise: {
    features: Object.keys(FEATURES) as FeatureKey[],
  },
}

/**
 * 조직의 현재 플랜 조회
 */
async function fetchOrganizationPlan(organizationId: string): Promise<PlanType> {
  const org = await db.query.organizations.findFirst({
    where: and(
      eq(organizations.id, organizationId),
      isNull(organizations.deletedAt)
    ),
    columns: { plan: true },
  })

  return (org?.plan as PlanType) || 'free'
}

/**
 * 조직의 플랜 조회 (캐시됨)
 */
export async function getOrganizationPlan(organizationId: string): Promise<PlanType> {
  const getCached = unstable_cache(
    () => fetchOrganizationPlan(organizationId),
    ['org-plan', organizationId],
    { tags: [`org:${organizationId}`, 'plans'], revalidate: 300 } // 5분 캐시
  )
  return getCached()
}

/**
 * 특정 기능이 플랜에서 사용 가능한지 확인
 */
export function isPlanFeatureEnabled(plan: PlanType, feature: FeatureKey): boolean {
  const planConfig = DEFAULT_PLAN_FEATURES[plan]
  return planConfig.features.includes(feature)
}

/**
 * 기능의 사용 한도 조회
 */
export function getPlanFeatureLimit(plan: PlanType, feature: FeatureKey): number | null {
  const planConfig = DEFAULT_PLAN_FEATURES[plan]
  return planConfig.limits?.[feature] ?? null // null = 무제한
}

/**
 * 조직에서 특정 기능 사용 가능 여부 확인
 */
export async function canUseFeature(
  organizationId: string,
  feature: FeatureKey
): Promise<{ allowed: boolean; reason?: string; limit?: number }> {
  const plan = await getOrganizationPlan(organizationId)

  // 기능 활성화 여부
  if (!isPlanFeatureEnabled(plan, feature)) {
    const requiredPlan = Object.entries(DEFAULT_PLAN_FEATURES).find(
      ([, config]) => config.features.includes(feature)
    )?.[0] as PlanType | undefined

    return {
      allowed: false,
      reason: requiredPlan
        ? `이 기능은 ${PLANS[requiredPlan].nameKo} 플랜 이상에서 사용할 수 있습니다.`
        : '이 기능은 현재 플랜에서 사용할 수 없습니다.',
    }
  }

  // 사용 한도 체크 (추후 사용량 추적과 연동)
  const limit = getPlanFeatureLimit(plan, feature)
  if (limit !== null) {
    // TODO: 실제 사용량과 비교
    return { allowed: true, limit }
  }

  return { allowed: true }
}

/**
 * 기능 사용 전 검증 (Server Action에서 사용)
 */
export async function requireFeature(
  organizationId: string,
  feature: FeatureKey
): Promise<void> {
  const result = await canUseFeature(organizationId, feature)
  
  if (!result.allowed) {
    throw new Error(result.reason || '이 기능을 사용할 수 없습니다.')
  }
}

/**
 * 플랜 정보 조회
 */
export function getPlanInfo(plan: PlanType) {
  return {
    ...PLANS[plan],
    features: DEFAULT_PLAN_FEATURES[plan].features.map((key) => ({
      key,
      ...FEATURES[key],
      limit: DEFAULT_PLAN_FEATURES[plan].limits?.[key],
    })),
  }
}

/**
 * 모든 플랜 정보 조회 (가격 페이지용)
 */
export function getAllPlans() {
  return Object.entries(PLANS).map(([key, plan]) => ({
    id: key as PlanType,
    ...plan,
    features: DEFAULT_PLAN_FEATURES[key as PlanType].features.map((featureKey) => ({
      key: featureKey,
      ...FEATURES[featureKey],
    })),
  }))
}

/**
 * 플랜 업그레이드 가능 여부
 */
export function canUpgradeTo(currentPlan: PlanType, targetPlan: PlanType): boolean {
  const planOrder: PlanType[] = ['free', 'basic', 'standard', 'premium', 'enterprise']
  return planOrder.indexOf(targetPlan) > planOrder.indexOf(currentPlan)
}

/**
 * 플랜 다운그레이드 가능 여부 및 제한 사항
 */
export function canDowngradeTo(
  currentPlan: PlanType,
  targetPlan: PlanType,
  currentUsage: { stores: number; users: number }
): { allowed: boolean; reason?: string } {
  const targetConfig = PLANS[targetPlan]

  if (targetConfig.maxStores !== -1 && currentUsage.stores > targetConfig.maxStores) {
    return {
      allowed: false,
      reason: `${targetConfig.nameKo} 플랜은 최대 ${targetConfig.maxStores}개 매장만 지원합니다. 현재 ${currentUsage.stores}개 매장을 사용 중입니다.`,
    }
  }

  if (targetConfig.maxUsers !== -1 && currentUsage.users > targetConfig.maxUsers) {
    return {
      allowed: false,
      reason: `${targetConfig.nameKo} 플랜은 최대 ${targetConfig.maxUsers}명 사용자만 지원합니다. 현재 ${currentUsage.users}명이 사용 중입니다.`,
    }
  }

  return { allowed: true }
}
