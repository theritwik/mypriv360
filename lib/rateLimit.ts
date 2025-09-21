/**
 * Rate limiting utilities using fixed window approach
 * Stores rate limiting data in database for persistence across server restarts
 */

import { prisma } from './db'

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // PDP query endpoint limits
  '/api/pdp/query': {
    requests: 100,        // 100 requests
    windowMs: 60 * 1000, // per 1 minute
  },
  // Default limits for other endpoints
  default: {
    requests: 1000,       // 1000 requests
    windowMs: 60 * 1000, // per 1 minute
  },
} as const

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: Date
  retryAfter?: number // seconds until next request allowed
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public limit: number,
    public remaining: number,
    public resetTime: Date,
    public retryAfter: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * Check and update rate limit for an API key and endpoint
 * Uses fixed window rate limiting with database persistence
 *
 * @param apiKey - The API key to check
 * @param endpoint - The endpoint being accessed
 * @returns Promise<RateLimitResult> - Rate limit status
 * @throws RateLimitError if rate limit exceeded
 */
export async function checkRateLimit(
  apiKey: string,
  endpoint: string
): Promise<RateLimitResult> {
  // Get rate limit configuration for this endpoint
  const config = RATE_LIMIT_CONFIG[endpoint as keyof typeof RATE_LIMIT_CONFIG]
                || RATE_LIMIT_CONFIG.default

  // Calculate current window start (truncated to window boundaries)
  const now = new Date()
  const windowStart = new Date(
    Math.floor(now.getTime() / config.windowMs) * config.windowMs
  )

  // Calculate when this window resets
  const resetTime = new Date(windowStart.getTime() + config.windowMs)

  try {
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Try to find existing bucket for this window
      let bucket = await tx.rateLimitBucket.findUnique({
        where: {
          apiKey_endpoint_windowStart: {
            apiKey,
            endpoint,
            windowStart,
          },
        },
      })

      if (!bucket) {
        // Create new bucket for this window
        bucket = await tx.rateLimitBucket.create({
          data: {
            apiKey,
            endpoint,
            windowStart,
            requestCount: 1,
          },
        })

        return {
          allowed: true,
          limit: config.requests,
          remaining: config.requests - 1,
          resetTime,
        }
      }

      // Check if we've exceeded the limit
      if (bucket.requestCount >= config.requests) {
        const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000)

        return {
          allowed: false,
          limit: config.requests,
          remaining: 0,
          resetTime,
          retryAfter,
        }
      }

      // Increment the request count
      const updatedBucket = await tx.rateLimitBucket.update({
        where: { id: bucket.id },
        data: {
          requestCount: { increment: 1 },
        },
      })

      return {
        allowed: true,
        limit: config.requests,
        remaining: config.requests - updatedBucket.requestCount,
        resetTime,
      }
    })

    // If not allowed, throw rate limit error
    if (!result.allowed) {
      throw new RateLimitError(
        'Rate limit exceeded',
        result.limit,
        result.remaining,
        result.resetTime,
        result.retryAfter!
      )
    }

    return result
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }

    // Log database errors but don't block requests
    console.error('Rate limit check failed:', error)

    // Return allowing the request if database fails
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests,
      resetTime,
    }
  }
}

/**
 * Cleanup old rate limit buckets to prevent database bloat
 * Should be called periodically (e.g., via cron job)
 *
 * @param olderThanHours - Delete buckets older than this many hours (default: 24)
 * @returns Promise<number> - Number of buckets deleted
 */
export async function cleanupOldRateLimitBuckets(olderThanHours: number = 24): Promise<number> {
  const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000))

  try {
    const result = await prisma.rateLimitBucket.deleteMany({
      where: {
        windowStart: {
          lt: cutoffTime,
        },
      },
    })

    return result.count
  } catch (error) {
    console.error('Failed to cleanup old rate limit buckets:', error)
    return 0
  }
}

/**
 * Get rate limit status without incrementing the counter
 * Useful for checking current status in middleware or health checks
 *
 * @param apiKey - The API key to check
 * @param endpoint - The endpoint to check
 * @returns Promise<RateLimitResult> - Current rate limit status
 */
export async function getRateLimitStatus(
  apiKey: string,
  endpoint: string
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG[endpoint as keyof typeof RATE_LIMIT_CONFIG]
                || RATE_LIMIT_CONFIG.default

  const now = new Date()
  const windowStart = new Date(
    Math.floor(now.getTime() / config.windowMs) * config.windowMs
  )
  const resetTime = new Date(windowStart.getTime() + config.windowMs)

  try {
    const bucket = await prisma.rateLimitBucket.findUnique({
      where: {
        apiKey_endpoint_windowStart: {
          apiKey,
          endpoint,
          windowStart,
        },
      },
    })

    if (!bucket) {
      return {
        allowed: true,
        limit: config.requests,
        remaining: config.requests,
        resetTime,
      }
    }

    const remaining = Math.max(0, config.requests - bucket.requestCount)
    const allowed = remaining > 0

    return {
      allowed,
      limit: config.requests,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
    }
  } catch (error) {
    console.error('Failed to get rate limit status:', error)

    // Return allowing status if database fails
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests,
      resetTime,
    }
  }
}

/**
 * Reset rate limit for a specific API key and endpoint
 * Useful for administrative purposes
 *
 * @param apiKey - The API key to reset
 * @param endpoint - The endpoint to reset (optional, resets all if not provided)
 * @returns Promise<number> - Number of buckets deleted
 */
export async function resetRateLimit(
  apiKey: string,
  endpoint?: string
): Promise<number> {
  try {
    const whereClause: any = { apiKey }
    if (endpoint) {
      whereClause.endpoint = endpoint
    }

    const result = await prisma.rateLimitBucket.deleteMany({
      where: whereClause,
    })

    return result.count
  } catch (error) {
    console.error('Failed to reset rate limit:', error)
    return 0
  }
}