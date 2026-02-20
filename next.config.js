// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Disable client-side router cache to ensure fresh data after mutations
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },

  // 이미지 최적화 설정
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },

  // 빌드 최적화
  poweredByHeader: false,

  // 로깅 설정
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // 보안 헤더 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://*.neon.tech wss://*.neon.tech",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "form-action 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
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
    console.warn(
      'Sentry DSN is set but @sentry/nextjs is not installed. Skipping Sentry integration.'
    )
  }
}

module.exports = finalConfig
