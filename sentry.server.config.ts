// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // 환경 설정
  environment: process.env.NODE_ENV,

  // 서버 사이드 에러 처리
  beforeSend(event, hint) {
    const error = hint.originalException

    // 특정 에러 무시 (예: 인증 관련)
    if (error instanceof Error) {
      if (error.message.includes('로그인이 필요합니다')) {
        return null // 이 에러는 Sentry에 보내지 않음
      }
      if (error.message.includes('접근 권한이 없습니다')) {
        return null
      }
    }

    return event
  },

  // 민감한 데이터 스크러빙
  beforeSendTransaction(event) {
    // SQL 쿼리에서 민감한 데이터 제거
    if (event.spans) {
      event.spans = event.spans.map((span) => {
        if (span.data && span.data['db.statement']) {
          // 비밀번호 등 민감 정보 마스킹
          span.data['db.statement'] = span.data['db.statement']
            .replace(/password_hash\s*=\s*'[^']*'/gi, "password_hash='[REDACTED]'")
        }
        return span
      })
    }
    return event
  },
})
