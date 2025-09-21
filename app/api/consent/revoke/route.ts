import { NextRequest, NextResponse } from 'next/server'
import { requireSession, handleHttpError } from '@/lib/guards'
import { prisma } from '@/lib/db'
import { logConsentEvent } from '@/lib/audit'
import { jsonOk, jsonError, zodError, handleApiError, ErrorCodes } from '@/lib/http'
import { z } from 'zod'

// Request validation schema
const revokeTokenSchema = z.object({
  tokenId: z.string().min(1, 'Token ID is required'),
})

/**
 * POST /api/consent/revoke
 * Revoke a consent token by setting its revoked status to true
 *
 * Request body:
 * {
 *   "tokenId": "clm123456789"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Token revoked successfully"
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify user session
    const user = await requireSession()

    // Parse and validate request body
    const body = await req.json()
    const { tokenId } = revokeTokenSchema.parse(body)

    // Find the token and ensure it belongs to the authenticated user
    const existingToken = await prisma.consentToken.findFirst({
      where: {
        id: tokenId,
        userId: user.id, // Ensure user can only revoke their own tokens
      },
    })

    if (!existingToken) {
      return jsonError(404, ErrorCodes.NOT_FOUND, 'Token not found or access denied', undefined,
        'The consent token you are trying to revoke does not exist or you do not have permission to revoke it')
    }

    // Check if token is already revoked
    if (existingToken.revoked) {
      return jsonError(400, 'TOKEN_ALREADY_REVOKED', 'Token is already revoked', undefined,
        'This consent token has already been revoked and is no longer active')
    }

    // Check if token has already expired
    if (existingToken.expiresAt < new Date()) {
      return jsonError(400, 'TOKEN_EXPIRED', 'Token has already expired', undefined,
        `This consent token expired on ${existingToken.expiresAt.toLocaleDateString()} and cannot be revoked`)
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

    // Log the token revocation event
    await logConsentEvent({
      userId: user.id,
      action: 'token-revoked',
      tokenId: tokenId,
      purpose: existingToken.purpose,
      categoryKeys: JSON.parse(existingToken.categories), // Parse JSON string back to array
      req,
    })

    return jsonOk({
      message: 'Token revoked successfully',
      tokenId: tokenId,
    })

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return zodError(error)
    }

    return handleApiError(error)
  }
}