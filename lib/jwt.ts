import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key')
const ALGORITHM = 'HS256'

// Type definitions
export interface ConsentTokenPayload extends JWTPayload {
  sub: string // userId
  purpose: string
  categories: string[]
  scopes: string[]
  iat: number
  exp: number
}

export interface ConsentTokenIssueParams {
  userId: string
  purpose: string
  categories: string[]
  scopes: string[]
  ttlMinutes: number
}

export interface ConsentTokenResult {
  token: string
  exp: number
}

export class ConsentTokenError extends Error {
  constructor(
    message: string,
    public code: 'EXPIRED' | 'INVALID' | 'MALFORMED' | 'VERIFICATION_FAILED'
  ) {
    super(message)
    this.name = 'ConsentTokenError'
  }
}

/**
 * Issue a new consent token with the specified parameters
 * @param params - Token parameters including userId, purpose, categories, scopes, and TTL
 * @returns Promise containing the signed JWT token and expiration timestamp
 */
export async function issueConsentToken(
  params: ConsentTokenIssueParams
): Promise<ConsentTokenResult>

/**
 * Issue a new consent token with separate parameters (overload for backward compatibility)
 */
export async function issueConsentToken(
  userId: string,
  purpose: string,
  categories: string[],
  scopes: string[],
  expiresAt: Date
): Promise<{ token: string; expiresAt: Date }>

export async function issueConsentToken(
  paramsOrUserId: ConsentTokenIssueParams | string,
  purpose?: string,
  categories?: string[],
  scopes?: string[],
  expiresAt?: Date
): Promise<ConsentTokenResult | { token: string; expiresAt: Date }> {
  // Handle overloaded function calls
  let params: ConsentTokenIssueParams

  if (typeof paramsOrUserId === 'string') {
    // Legacy function signature
    if (!purpose || !categories || !scopes || !expiresAt) {
      throw new ConsentTokenError('Missing required parameters', 'INVALID')
    }

    const ttlMinutes = Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 60)
    params = {
      userId: paramsOrUserId,
      purpose,
      categories,
      scopes,
      ttlMinutes,
    }

    const result = await _issueToken(params)
    return {
      token: result.token,
      expiresAt: new Date(result.exp * 1000),
    }
  } else {
    // New object-based signature
    params = paramsOrUserId
    return _issueToken(params)
  }
}

async function _issueToken(params: ConsentTokenIssueParams): Promise<ConsentTokenResult> {
  const { userId, purpose, categories, scopes, ttlMinutes } = params

  const now = Math.floor(Date.now() / 1000)
  const exp = now + (ttlMinutes * 60)

  try {
    const token = await new SignJWT({
      purpose,
      categories,
      scopes,
    })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(userId)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(JWT_SECRET)

    return {
      token,
      exp,
    }
  } catch (error) {
    throw new ConsentTokenError(
      'Failed to issue consent token',
      'VERIFICATION_FAILED'
    )
  }
}

/**
 * Verify and decode a consent token
 * @param token - The JWT token to verify
 * @returns Promise containing the decoded token payload
 * @throws ConsentTokenError for invalid, expired, or malformed tokens
 */
export async function verifyConsentToken(token: string): Promise<ConsentTokenPayload> {
  if (!token || typeof token !== 'string') {
    throw new ConsentTokenError(
      'Token must be a non-empty string',
      'MALFORMED'
    )
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: [ALGORITHM],
    })

    // Validate required fields
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new ConsentTokenError(
        'Token missing required subject (userId)',
        'INVALID'
      )
    }

    if (!payload.purpose || typeof payload.purpose !== 'string') {
      throw new ConsentTokenError(
        'Token missing required purpose',
        'INVALID'
      )
    }

    if (!Array.isArray(payload.categories)) {
      throw new ConsentTokenError(
        'Token missing or invalid categories array',
        'INVALID'
      )
    }

    if (!Array.isArray(payload.scopes)) {
      throw new ConsentTokenError(
        'Token missing or invalid scopes array',
        'INVALID'
      )
    }

    if (!payload.iat || typeof payload.iat !== 'number') {
      throw new ConsentTokenError(
        'Token missing or invalid issued at timestamp',
        'INVALID'
      )
    }

    if (!payload.exp || typeof payload.exp !== 'number') {
      throw new ConsentTokenError(
        'Token missing or invalid expiration timestamp',
        'INVALID'
      )
    }

    return payload as ConsentTokenPayload
  } catch (error) {
    if (error instanceof ConsentTokenError) {
      throw error
    }

    // Handle jose-specific errors
    if (error instanceof Error) {
      if (error.message.includes('exp')) {
        throw new ConsentTokenError(
          'Token has expired',
          'EXPIRED'
        )
      }

      if (error.message.includes('signature')) {
        throw new ConsentTokenError(
          'Token signature verification failed',
          'VERIFICATION_FAILED'
        )
      }
    }

    throw new ConsentTokenError(
      'Token verification failed',
      'VERIFICATION_FAILED'
    )
  }
}

/**
 * Extract token payload without verification (for debugging/logging)
 * @param token - The JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export function decodeConsentToken(token: string): ConsentTokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {return null}

    if (!parts[1]) {return null}

    const payload = JSON.parse(atob(parts[1]))
    return payload as ConsentTokenPayload
  } catch {
    return null
  }
}

/**
 * Revoke a consent token by marking it as revoked in the database
 * @param tokenId - The database ID of the token to revoke
 * @param userId - The user ID to ensure ownership
 * @returns Promise that resolves when token is revoked
 * @throws Error if token not found or access denied
 */
export async function revokeConsentToken(tokenId: string, userId: string): Promise<void> {
  const { prisma } = await import('./db')

  // Find the token and ensure it belongs to the user
  const existingToken = await prisma.consentToken.findFirst({
    where: {
      id: tokenId,
      userId: userId,
    },
  })

  if (!existingToken) {
    throw new Error('Token not found or access denied')
  }

  // Check if token is already revoked
  if (existingToken.revoked) {
    throw new Error('Token is already revoked')
  }

  // Check if token has already expired
  if (existingToken.expiresAt < new Date()) {
    throw new Error('Token has already expired')
  }

  // Revoke the token
  await prisma.consentToken.update({
    where: {
      id: tokenId,
    },
    data: {
      revoked: true,
    },
  })
}