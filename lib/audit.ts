import { prisma } from './db'

/**
 * Parameters for logging access events
 */
export interface LogAccessParams {
  userId: string
  apiClientId?: string | null
  endpoint: string
  action: string
  categoryKeys?: string[]
  purpose?: string | null
  tokenId?: string | null
  req: Request
}

/**
 * Extract client IP address from request headers defensively
 *
 * @param req - The incoming Request object
 * @returns The client IP address or 'unknown' if unable to determine
 */
export function extractClientIp(req: Request): string {
  try {
    // Try various headers that proxies/load balancers might set
    const forwardedFor = req.headers.get('x-forwarded-for')
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ips = forwardedFor.split(',').map(ip => ip.trim())
      const firstIp = ips[0]
      if (firstIp && firstIp !== '::1' && firstIp !== '127.0.0.1') {
        return firstIp
      }
    }

    // Try other common headers
    const realIp = req.headers.get('x-real-ip')
    if (realIp && realIp !== '::1' && realIp !== '127.0.0.1') {
      return realIp
    }

    const cfConnectingIp = req.headers.get('cf-connecting-ip') // Cloudflare
    if (cfConnectingIp) {
      return cfConnectingIp
    }

    const trueClientIp = req.headers.get('true-client-ip') // Cloudflare Enterprise
    if (trueClientIp) {
      return trueClientIp
    }

    // Fallback to unknown if we can't determine the real IP
    return 'unknown'
  } catch (error) {
    console.warn('Failed to extract client IP:', error)
    return 'unknown'
  }
}

/**
 * Extract User-Agent from request headers defensively
 *
 * @param req - The incoming Request object
 * @returns The User-Agent string or 'unknown' if not available
 */
export function extractUserAgent(req: Request): string {
  try {
    const userAgent = req.headers.get('user-agent')
    if (userAgent && userAgent.trim().length > 0) {
      // Truncate very long user agent strings to prevent abuse
      return userAgent.length > 500 ? userAgent.substring(0, 500) + '...' : userAgent
    }
    return 'unknown'
  } catch (error) {
    console.warn('Failed to extract user agent:', error)
    return 'unknown'
  }
}

/**
 * Log an access event to the AccessLog table
 *
 * @param params - Access logging parameters
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * // In an API route
 * await logAccess({
 *   userId: user.id,
 *   apiClientId: apiClient.id,
 *   endpoint: '/api/data/query',
 *   action: 'query',
 *   categoryKeys: ['health', 'financial'],
 *   purpose: 'medical-research',
 *   tokenId: 'token123',
 *   req
 * })
 * ```
 */
export async function logAccess(params: LogAccessParams): Promise<void> {
  const {
    userId,
    apiClientId,
    endpoint,
    action,
    categoryKeys = [],
    purpose,
    tokenId,
    req
  } = params

  try {
    // Extract client information defensively
    const clientIp = extractClientIp(req)
    const userAgent = extractUserAgent(req)

    // Create the access log entry
    await prisma.accessLog.create({
      data: {
        userId,
        apiClientId: apiClientId || null,
        endpoint,
        action,
        categoryKeys,
        purpose: purpose || null,
        tokenId: tokenId || null,
        ip: clientIp,
        userAgent,
      },
    })
  } catch (error) {
    // Log the error but don't throw - we don't want audit logging failures
    // to break the main API functionality
    console.error('Failed to log access event:', {
      error,
      userId,
      endpoint,
      action,
    })
  }
}

/**
 * Log authentication events (sign-in, sign-out, etc.)
 *
 * @param params - Authentication event parameters
 */
export async function logAuthEvent(params: {
  userId: string
  action: 'signin' | 'signout' | 'signup' | 'password-change'
  req: Request
  success: boolean
  errorCode?: string
}): Promise<void> {
  const { userId, action, req, success, errorCode } = params

  try {
    const clientIp = extractClientIp(req)
    const userAgent = extractUserAgent(req)

    await prisma.accessLog.create({
      data: {
        userId,
        apiClientId: null,
        endpoint: '/auth',
        action: `${action}${success ? '_success' : '_failure'}`,
        categoryKeys: [],
        purpose: errorCode || null,
        tokenId: null,
        ip: clientIp,
        userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to log auth event:', {
      error,
      userId,
      action,
    })
  }
}

/**
 * Log consent token events (issuance, revocation)
 *
 * @param params - Consent token event parameters
 */
export async function logConsentEvent(params: {
  userId: string
  action: 'token-issued' | 'token-revoked'
  tokenId: string
  purpose: string
  categoryKeys: string[]
  req: Request
}): Promise<void> {
  const { userId, action, tokenId, purpose, categoryKeys, req } = params

  try {
    const clientIp = extractClientIp(req)
    const userAgent = extractUserAgent(req)

    await prisma.accessLog.create({
      data: {
        userId,
        apiClientId: null,
        endpoint: '/api/consent',
        action,
        categoryKeys,
        purpose,
        tokenId,
        ip: clientIp,
        userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to log consent event:', {
      error,
      userId,
      action,
      tokenId,
    })
  }
}

/**
 * Log policy management events
 *
 * @param params - Policy event parameters
 */
export async function logPolicyEvent(params: {
  userId: string
  action: 'policy-created' | 'policy-updated' | 'policy-deleted'
  categoryKey: string
  purpose: string
  req: Request
}): Promise<void> {
  const { userId, action, categoryKey, purpose, req } = params

  try {
    const clientIp = extractClientIp(req)
    const userAgent = extractUserAgent(req)

    await prisma.accessLog.create({
      data: {
        userId,
        apiClientId: null,
        endpoint: '/api/consent/policies',
        action,
        categoryKeys: [categoryKey],
        purpose,
        tokenId: null,
        ip: clientIp,
        userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to log policy event:', {
      error,
      userId,
      action,
      categoryKey,
    })
  }
}

/**
 * Get access logs for a user with optional filtering
 *
 * @param params - Query parameters for access logs
 * @returns Promise<AccessLog[]> - Array of access log entries
 */
export async function getUserAccessLogs(params: {
  userId: string
  limit?: number
  offset?: number
  action?: string
  endpoint?: string
  startDate?: Date
  endDate?: Date
}) {
  const {
    userId,
    limit = 50,
    offset = 0,
    action,
    endpoint,
    startDate,
    endDate
  } = params

  try {
    const where: any = { userId }

    if (action) {
      where.action = action
    }

    if (endpoint) {
      where.endpoint = endpoint
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = startDate
      }
      if (endDate) {
        where.createdAt.lte = endDate
      }
    }

    return await prisma.accessLog.findMany({
      where,
      include: {
        apiClient: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 100), // Cap at 100 records
      skip: offset,
    })
  } catch (error) {
    console.error('Failed to get user access logs:', error)
    return []
  }
}