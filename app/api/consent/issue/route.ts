import { NextRequest, NextResponse } from 'next/server'
import { requireSession, handleHttpError, ensureConsentAllowed } from '@/lib/guards'
import { issueConsentToken } from '@/lib/jwt'
import { prisma } from '@/lib/db'
import { logConsentEvent } from '@/lib/audit'
import { jsonOk, jsonError, zodError, handleApiError, HttpStatus } from '@/lib/http'
import { z } from 'zod'

// Request validation schema
const issueTokenSchema = z.object({
  purpose: z.string().min(1, 'Purpose is required'),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  ttlMinutes: z.number().int().min(1).max(10080), // Max 1 week (7 * 24 * 60)
})

/**
 * POST /api/consent/issue
 * Issue a new consent token after verifying user session and consent policies
 *
 * Request body:
 * {
 *   "purpose": "data-export",
 *   "categories": ["health", "financial"],
 *   "scopes": ["read", "export"],
 *   "ttlMinutes": 60
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "expiresAt": "2025-09-21T15:30:00.000Z",
 *     "tokenId": "clm123456789"
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify user session
    const user = await requireSession()

    // Parse and validate request body
    const body = await req.json()
    const { purpose, categories, scopes, ttlMinutes } = issueTokenSchema.parse(body)

    // Check if user has granted consent for all requested categories/scopes/purpose
    await ensureConsentAllowed({
      userId: user.id,
      categories,
      purpose,
      scopes,
    })

    // Issue the JWT token
    const { token, exp } = await issueConsentToken({
      userId: user.id,
      purpose,
      categories,
      scopes,
      ttlMinutes,
    })

    // Save the token to the database
    const expiresAt = new Date(exp * 1000) // Convert Unix timestamp to Date
    const consentToken = await prisma.consentToken.create({
      data: {
        userId: user.id,
        jwt: token,
        purpose,
        categories,
        scopes,
        expiresAt,
        revoked: false,
      },
    })

    // Log the token issuance event
    await logConsentEvent({
      userId: user.id,
      action: 'token-issued',
      tokenId: consentToken.id,
      purpose,
      categoryKeys: categories,
      req,
    })

    // Return the token information
    return jsonOk({
      token,
      expiresAt: expiresAt.toISOString(),
      tokenId: consentToken.id,
    }, HttpStatus.CREATED)

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return zodError(error)
    }

    return handleApiError(error)
  }
}