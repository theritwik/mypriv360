import { NextRequest, NextResponse } from 'next/server'
import { requireSession, handleHttpError } from '@/lib/guards'
import { consentPolicyUpdateSchema } from '@/lib/validations'
import { getUserPolicy, upsertUserPolicy, deleteUserPolicy } from '@/lib/policyService'
import { jsonOk, jsonError, zodError, handleApiError, ErrorCodes } from '@/lib/http'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/consent/policies/[id]
 * Get a specific consent policy by ID for the authenticated user
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSession()
    const policy = await getUserPolicy(user.id, params.id)

    if (!policy) {
      return jsonError(404, ErrorCodes.NOT_FOUND, 'Policy not found')
    }

    return jsonOk(policy)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PATCH /api/consent/policies/[id]
 * Update a specific consent policy for the authenticated user
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSession()
    const body = await req.json()

    // Validate the request body
    const validatedData = consentPolicyUpdateSchema.parse({
      ...body,
      id: params.id,
    })

    // Check if policy exists
    const existingPolicy = await getUserPolicy(user.id, params.id)
    if (!existingPolicy) {
      return jsonError(404, ErrorCodes.NOT_FOUND, 'Policy not found')
    }

    // Update the policy
    const policy = await upsertUserPolicy(user.id, {
      id: params.id,
      categoryId: existingPolicy.categoryId, // Keep existing category
      purpose: validatedData.purpose ?? existingPolicy.purpose,
      scopes: validatedData.scopes ?? existingPolicy.scopes, // Already parsed by getUserPolicy
      status: validatedData.status ?? (existingPolicy.status as 'GRANTED' | 'RESTRICTED' | 'REVOKED'),
      expiresAt: validatedData.expiresAt !== undefined ? validatedData.expiresAt : existingPolicy.expiresAt?.toISOString() ?? null,
    })

    return jsonOk(policy)
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return zodError(error)
    }

    return handleApiError(error)
  }
}

/**
 * DELETE /api/consent/policies/[id]
 * Delete a specific consent policy for the authenticated user
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSession()

    // Check if policy exists
    const existingPolicy = await getUserPolicy(user.id, params.id)
    if (!existingPolicy) {
      return jsonError(404, ErrorCodes.NOT_FOUND, 'Policy not found')
    }

    // Delete the policy
    await deleteUserPolicy(user.id, params.id)

    return jsonOk({ message: 'Policy deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}