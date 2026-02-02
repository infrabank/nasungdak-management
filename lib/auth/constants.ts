/**
 * 인증 관련 상수
 *
 * 모든 JWT 서명/검증에서 이 모듈의 SESSION_SECRET를 사용합니다.
 */

/**
 * JWT 서명에 사용되는 비밀키
 * 환경변수 SESSION_SECRET이 설정되지 않은 경우 빌드 시 에러 발생
 */
function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET

  if (!secret) {
    // 개발 환경에서는 경고만 출력
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[AUTH] SESSION_SECRET이 설정되지 않았습니다. 기본값을 사용합니다.'
      )
      return new TextEncoder().encode('development-only-secret-key')
    }

    // 프로덕션에서는 에러 발생
    throw new Error(
      'SESSION_SECRET 환경변수가 설정되지 않았습니다. 보안을 위해 반드시 설정해주세요.'
    )
  }

  return new TextEncoder().encode(secret)
}

export const SESSION_SECRET = getSessionSecret()

/**
 * 세션 유효 기간 (밀리초)
 * 기본값: 7일
 */
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000

/**
 * JWT 만료 시간 (jose 포맷)
 */
export const JWT_EXPIRATION = '7d'

/**
 * 쿠키 이름
 */
export const SESSION_COOKIE_NAME = 'session'
export const ADMIN_SESSION_COOKIE_NAME = 'admin_session'
