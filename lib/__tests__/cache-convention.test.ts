import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 캐시 무효화 단일 소스 규약 테스트.
 *
 * 이 코드베이스는 "mutation마다 revalidateTag 문자열을 직접 나열"하다가
 * 매장별/전체 태그 불일치로 캐시가 안 털리는 버그가 반복됐다.
 * 모든 서버 액션은 lib/cache-tags.ts의 그룹 함수(revalidateXxxData)만 사용해야 하며,
 * 원시 revalidateTag() 호출을 직접 하면 이 테스트가 실패한다.
 */

function collectTsFiles(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir, { recursive: true }) as string[]
  } catch {
    return []
  }
  return entries
    .filter((name) => typeof name === 'string' && name.endsWith('.ts'))
    .map((name) => join(dir, name))
}

describe('cache invalidation 단일 소스 규약', () => {
  it('app/ 서버 액션은 revalidateTag를 직접 호출하지 않는다 (cache-tags 헬퍼 사용)', () => {
    const appDir = join(process.cwd(), 'app')
    const files = collectTsFiles(appDir)
    // 방어: 파일을 못 찾으면 테스트 경로 문제이므로 실패시킨다
    expect(files.length).toBeGreaterThan(0)

    const offenders = files.filter((file) => {
      const src = readFileSync(file, 'utf8')
      return /\brevalidateTag\s*\(/.test(src)
    })

    expect(
      offenders,
      `revalidateTag 직접 호출 금지 — lib/cache-tags.ts의 그룹 함수를 사용하세요:\n${offenders.join('\n')}`
    ).toEqual([])
  })
})
