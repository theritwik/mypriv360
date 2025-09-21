import { NextRequest, NextResponse } from 'next/server'
import { requireSession, handleHttpError } from '@/lib/guards'
import { prisma } from '@/lib/db'
import { logAccess } from '@/lib/audit'
import { jsonOk, jsonError, zodError, handleApiError, ErrorCodes, HttpStatus } from '@/lib/http'
import { z } from 'zod'

// Request validation schema
const registerDataSchema = z.object({
  categoryKey: z.string().min(1, 'Category key is required'),
  payload: z.record(z.any()).refine(
    (data) => Object.keys(data).length > 0,
    'Payload must not be empty'
  ),
})

/**
 * POST /api/data/register
 * Register sample data for the authenticated user in a specific category
 *
 * Request body:
 * {
 *   "categoryKey": "health",
 *   "payload": {
 *     "heartRate": 72,
 *     "bloodPressure": "120/80",
 *     "temperature": 98.6,
 *     "recordedAt": "2025-09-21T10:30:00Z"
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "clm987654321",
 *     "userId": "clm123456789",
 *     "categoryKey": "health",
 *     "payload": { ... },
 *     "createdAt": "2025-09-21T10:30:15.123Z"
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify user session
    const user = await requireSession()

    // Parse and validate request body
    const body = await req.json()
    const { categoryKey, payload } = registerDataSchema.parse(body)

    // Validate that the categoryKey exists in the DataCategory table
    const dataCategory = await prisma.dataCategory.findUnique({
      where: { key: categoryKey },
    })

    if (!dataCategory) {
      return jsonError(400, ErrorCodes.NOT_FOUND, `Invalid category key: ${categoryKey}`)
    }

    // Create the sample data entry
    const sampleData = await prisma.sampleData.create({
      data: {
        userId: user.id,
        categoryKey,
        payload,
      },
    })

    // Log the data registration event
    await logAccess({
      userId: user.id,
      endpoint: '/api/data/register',
      action: 'register',
      categoryKeys: [categoryKey],
      purpose: 'data-storage',
      req,
    })

    // Return the created entry
    return jsonOk({
      id: sampleData.id,
      userId: sampleData.userId,
      categoryKey: sampleData.categoryKey,
      payload: sampleData.payload,
      createdAt: sampleData.createdAt.toISOString(),
    }, HttpStatus.CREATED)

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return zodError(error)
    }

    // Handle other errors
    return handleApiError(error)
  }
}