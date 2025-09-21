/**
 * Test API route demonstrating HTTP utilities usage
 *
 * This route shows how to use the centralized HTTP utilities
 * for consistent API responses and error handling.
 */

import { NextRequest } from 'next/server'
import { jsonOk, jsonError, zodError, handleApiError, ErrorCodes, HttpStatus } from '@/lib/http'
import { z } from 'zod'

// Test data validation schema
const testSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  category: z.enum(['health', 'finance', 'activity'], {
    errorMap: () => ({ message: 'Category must be one of: health, finance, activity' })
  })
})

/**
 * GET /api/test/http-utils
 * Test endpoint demonstrating successful responses
 */
export async function GET() {
  try {
    // Simulate some data
    const testData = {
      message: 'HTTP utilities are working correctly',
      timestamp: new Date().toISOString(),
      features: [
        'Consistent error shapes',
        'Zod validation integration',
        'Proper HTTP status codes',
        'TypeScript support'
      ]
    }

    return jsonOk(testData)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/test/http-utils
 * Test endpoint demonstrating validation and error handling
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Test Zod validation
    const validatedData = testSchema.parse(body)

    // Simulate processing
    const result = {
      success: true,
      processed: validatedData,
      processedAt: new Date().toISOString()
    }

    return jsonOk(result, HttpStatus.CREATED)
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return zodError(error, 'Invalid request data')
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return jsonError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_JSON,
        'Invalid JSON in request body'
      )
    }

    // Handle other errors
    return handleApiError(error)
  }
}

/**
 * PUT /api/test/http-utils
 * Test endpoint demonstrating various error scenarios
 */
export async function PUT(req: NextRequest) {
  try {
    const { scenario } = await req.json()

    switch (scenario) {
      case 'not-found':
        return jsonError(
          HttpStatus.NOT_FOUND,
          ErrorCodes.NOT_FOUND,
          'Test resource not found',
          { resource: 'test-item', id: '123' }
        )

      case 'unauthorized':
        return jsonError(
          HttpStatus.UNAUTHORIZED,
          ErrorCodes.UNAUTHORIZED,
          'Authentication required'
        )

      case 'validation':
        return jsonError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.VALIDATION_ERROR,
          'Validation failed',
          {
            fields: ['name', 'email'],
            errors: ['Name is required', 'Invalid email format']
          }
        )

      case 'rate-limit':
        return jsonError(
          HttpStatus.TOO_MANY_REQUESTS,
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          'Too many requests',
          {
            limit: 100,
            resetTime: Date.now() + 60000
          }
        )

      case 'success':
        return jsonOk({
          message: 'Test scenario executed successfully',
          scenario: 'success'
        })

      default:
        return jsonError(
          HttpStatus.BAD_REQUEST,
          'INVALID_SCENARIO',
          'Unknown test scenario',
          {
            validScenarios: ['not-found', 'unauthorized', 'validation', 'rate-limit', 'success']
          }
        )
    }
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/test/http-utils
 * Test endpoint demonstrating no-content responses
 */
export async function DELETE() {
  try {
    // Simulate deletion
    await new Promise(resolve => setTimeout(resolve, 100))

    return jsonOk({ message: 'Resource deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}