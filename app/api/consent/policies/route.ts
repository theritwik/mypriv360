import { NextRequest, NextResponse } from 'next/server'
import { requireSession, handleHttpError } from '@/lib/guards'
import { consentPolicyCreateSchema } from '@/lib/validations'
import { listUserPolicies, upsertUserPolicy, getDataCategories } from '@/lib/policyService'
import { jsonOk, jsonError, zodError, handleApiError, ErrorCodes, HttpStatus } from '@/lib/http'
import { z } from 'zod'

/**
 * GET /api/consent/policies
 * List all consent policies for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireSession()
    const policies = await listUserPolicies(user.id)

    return jsonOk(policies)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/consent/policies
 * Create a new consent policy for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireSession()
    const body = await req.json()

    // Validate the request body
    const validatedData = consentPolicyCreateSchema.parse(body)

    // Create the policy
    const policy = await upsertUserPolicy(user.id, validatedData)

    return jsonOk(policy, HttpStatus.CREATED)
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return zodError(error)
    }

    return handleApiError(error)
  }
}

/**
 * PUT /api/consent/policies
 * Update an existing consent policy for the authenticated user
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireSession()
    const body = await req.json()

    if (!body.id) {
      return jsonError(400, ErrorCodes.VALIDATION_ERROR, 'Policy ID is required for updates')
    }

    // Validate the request body (id is required for updates)
    const validatedData = consentPolicyCreateSchema.parse(body)

    // Update the policy
    const policy = await upsertUserPolicy(user.id, {
      ...validatedData,
      id: body.id,
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