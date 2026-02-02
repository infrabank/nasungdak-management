/**
 * Rate Limiting 유틸리티
 *
 * In-memory 방식 (서버리스 환경에서는 Upstash Redis 권장)
 *
 * 사용법:
 * ```typescript
 * import { rateLimit, RateLimitError } from '@/lib/rate-limit'
 *
 * // Server Action에서 사용
 * export async function createPurchase(formData: FormData) {
 *   const ip = headers().get('x-forwarded-for') || 'unknown'
 *   const { success, remaining } = await rateLimit.check(ip, 'purchases:create')
 *
 *   if (!success) {
 *     return { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }
 *   }
 *
 *   // ... 실제 로직
 * }
 * ```
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  maxRequests: number // 허용 요청 수
  windowMs: number // 시간 윈도우 (밀리초)
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

// 기본 설정
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  // 일반 읽기 작업
  'default:read': { maxRequests: 100, windowMs: 60 * 1000 }, // 분당 100회

  // 쓰기 작업
  'default:write': { maxRequests: 30, windowMs: 60 * 1000 }, // 분당 30회

  // 로그인 시도
  'auth:login': { maxRequests: 20, windowMs: 5 * 60 * 1000 }, // 5분당 20회

  // 벌크 업로드
  'bulk:upload': { maxRequests: 5, windowMs: 60 * 1000 }, // 분당 5회

  // 분석 쿼리 (무거운 작업)
  'analysis:query': { maxRequests: 10, windowMs: 60 * 1000 }, // 분당 10회

  // 매입 등록
  'purchases:create': { maxRequests: 50, windowMs: 60 * 1000 }, // 분당 50회

  // 판매 등록
  'sales:create': { maxRequests: 50, windowMs: 60 * 1000 }, // 분당 50회
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // 주기적으로 만료된 항목 정리 (5분마다)
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }
  }

  /**
   * Rate limit 체크
   * @param identifier - 식별자 (IP, userId 등)
   * @param action - 액션 타입 (config 키)
   * @returns Rate limit 결과
   */
  check(identifier: string, action: string = 'default:read'): RateLimitResult {
    const config = DEFAULT_CONFIGS[action] || DEFAULT_CONFIGS['default:read']
    const key = `${action}:${identifier}`
    const now = Date.now()

    const entry = this.store.get(key)

    // 새로운 윈도우 시작
    if (!entry || now >= entry.resetAt) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + config.windowMs,
      }
      this.store.set(key, newEntry)

      return {
        success: true,
        remaining: config.maxRequests - 1,
        resetAt: newEntry.resetAt,
      }
    }

    // 기존 윈도우에서 카운트 증가
    entry.count++

    if (entry.count > config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
      }
    }

    return {
      success: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    }
  }

  /**
   * 특정 식별자의 rate limit 리셋
   */
  reset(identifier: string, action?: string): void {
    if (action) {
      this.store.delete(`${action}:${identifier}`)
    } else {
      // 해당 identifier의 모든 action 리셋
      for (const key of this.store.keys()) {
        if (key.endsWith(`:${identifier}`)) {
          this.store.delete(key)
        }
      }
    }
  }

  /**
   * 만료된 항목 정리
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// 싱글톤 인스턴스
export const rateLimit = new InMemoryRateLimiter()

/**
 * Rate limit 에러 클래스
 */
export class RateLimitError extends Error {
  public resetAt: number
  public remaining: number

  constructor(resetAt: number, remaining: number = 0) {
    super('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
    this.name = 'RateLimitError'
    this.resetAt = resetAt
    this.remaining = remaining
  }

  /**
   * 대기해야 하는 시간 (초)
   */
  get retryAfter(): number {
    return Math.ceil((this.resetAt - Date.now()) / 1000)
  }
}

/**
 * Rate limit 체크 후 실패 시 에러 throw
 */
export function checkRateLimit(
  identifier: string,
  action: string = 'default:read'
): void {
  const result = rateLimit.check(identifier, action)

  if (!result.success) {
    throw new RateLimitError(result.resetAt, result.remaining)
  }
}

/**
 * Server Action용 rate limit 래퍼
 *
 * @example
 * ```typescript
 * export async function createPurchase(formData: FormData) {
 *   return withRateLimit(
 *     getClientIP(),
 *     'purchases:create',
 *     async () => {
 *       // 실제 로직
 *     }
 *   )
 * }
 * ```
 */
export async function withRateLimit<T>(
  identifier: string,
  action: string,
  fn: () => Promise<T>
): Promise<T | { success: false; error: string; retryAfter?: number }> {
  const result = rateLimit.check(identifier, action)

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
    return {
      success: false,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter,
    }
  }

  return fn()
}

/**
 * 클라이언트 IP 추출 (Next.js headers에서)
 */
export function getClientIP(headersList: Headers): string {
  // Vercel/Cloudflare 프록시 헤더
  const forwardedFor = headersList.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // 기타 프록시 헤더
  const realIP = headersList.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return 'unknown'
}
