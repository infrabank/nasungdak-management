// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // 이미지 최적화 설정
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // 빌드 최적화
  poweredByHeader: false,

  // 로깅 설정
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

// Sentry 설정 (SENTRY_DSN이 설정되고 @sentry/nextjs가 설치된 경우에만 활성화)
let finalConfig = nextConfig

if (process.env.SENTRY_DSN) {
  try {
    const { withSentryConfig } = require('@sentry/nextjs')

    const sentryWebpackPluginOptions = {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    }

    finalConfig = withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  } catch {
    // @sentry/nextjs not installed, skip Sentry integration
    console.warn('Sentry DSN is set but @sentry/nextjs is not installed. Skipping Sentry integration.')
  }
}

module.exports = finalConfig
