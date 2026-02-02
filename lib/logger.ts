/**
 * 구조화된 로깅 시스템
 *
 * 환경별 로그 레벨:
 * - development: debug
 * - production: info
 *
 * 사용법:
 * ```typescript
 * import { logger } from '@/lib/logger'
 *
 * logger.info('사용자 로그인', { userId: '123', email: 'user@example.com' })
 * logger.error('데이터베이스 오류', { error: err.message, query: 'SELECT ...' })
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  // 추적용 메타데이터
  requestId?: string
  userId?: string
  storeId?: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

class Logger {
  private minLevel: LogLevel

  constructor() {
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined
    this.minLevel =
      envLevel || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel]
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    }
  }

  private output(entry: LogEntry): void {
    const json = JSON.stringify(entry)

    switch (entry.level) {
      case 'debug':
        console.debug(json)
        break
      case 'info':
        console.info(json)
        break
      case 'warn':
        console.warn(json)
        break
      case 'error':
        console.error(json)
        break
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatEntry('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.output(this.formatEntry('info', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatEntry('warn', message, context))
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.output(this.formatEntry('error', message, context))
    }
  }

  /**
   * 요청 컨텍스트가 포함된 로거 생성
   */
  withContext(baseContext: LogContext): ContextLogger {
    return new ContextLogger(this, baseContext)
  }
}

class ContextLogger {
  constructor(
    private logger: Logger,
    private baseContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.baseContext, ...context }
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.mergeContext(context))
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.mergeContext(context))
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.mergeContext(context))
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(message, this.mergeContext(context))
  }
}

// 싱글톤 인스턴스
export const logger = new Logger()

// 유틸리티 함수들

/**
 * Server Action에서 사용할 로거 생성
 */
export function createActionLogger(
  actionName: string,
  storeId?: string,
  userId?: string
) {
  return logger.withContext({
    action: actionName,
    ...(storeId && { storeId }),
    ...(userId && { userId }),
  })
}

/**
 * 에러 객체를 로그 컨텍스트로 변환
 */
export function errorToContext(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack:
        process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }
  return { error: String(error) }
}

/**
 * 데이터베이스 쿼리 로깅
 */
export function logQuery(
  operation: string,
  table: string,
  duration?: number,
  context?: LogContext
): void {
  logger.debug(`DB ${operation}`, {
    table,
    ...(duration !== undefined && { durationMs: duration }),
    ...context,
  })
}

/**
 * API 요청 로깅
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: LogContext
): void {
  const level =
    statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
  logger[level](`${method} ${path}`, {
    statusCode,
    durationMs: duration,
    ...context,
  })
}
