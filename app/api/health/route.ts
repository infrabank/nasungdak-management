import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: CheckResult
  }
}

interface CheckResult {
  status: 'pass' | 'fail'
  responseTime?: number
  message?: string
}

const startTime = Date.now()

/**
 * GET /api/health
 * 
 * 헬스체크 엔드포인트 - 시스템 상태 확인
 * 
 * 응답 예시:
 * ```json
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-01-31T12:00:00.000Z",
 *   "version": "0.1.0",
 *   "uptime": 3600000,
 *   "checks": {
 *     "database": { "status": "pass", "responseTime": 12 }
 *   }
 * }
 * ```
 */
export async function GET() {
  const checks: HealthStatus['checks'] = {
    database: await checkDatabase(),
  }

  // 전체 상태 결정
  const allPassed = Object.values(checks).every((c) => c.status === 'pass')
  const allFailed = Object.values(checks).every((c) => c.status === 'fail')

  const status: HealthStatus = {
    status: allPassed ? 'healthy' : allFailed ? 'unhealthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: Date.now() - startTime,
    checks,
  }

  // 상태에 따른 HTTP 상태 코드
  const httpStatus = status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503

  return NextResponse.json(status, { status: httpStatus })
}

/**
 * 데이터베이스 연결 체크
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()

  try {
    // 간단한 쿼리로 연결 확인
    await db.execute(sql`SELECT 1`)

    return {
      status: 'pass',
      responseTime: Date.now() - start,
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
    }
  }
}

/**
 * HEAD /api/health
 * 
 * 간단한 활성 상태 체크 (모니터링 도구용)
 */
export async function HEAD() {
  try {
    await db.execute(sql`SELECT 1`)
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
