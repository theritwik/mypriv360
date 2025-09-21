import { NextRequest, NextResponse } from 'next/server'
import {
  requireApiClient,
  requireConsentToken,
  handleHttpError,
  ensureConsentAllowed
} from '@/lib/guards'
import { prisma } from '@/lib/db'
import { dpMean, laplaceMechanism, anonymizeRecords } from '@/lib/privacy/differentialPrivacy'
import { logAccess } from '@/lib/audit'
import { jsonOk, jsonError, zodError, handleApiError, ErrorCodes } from '@/lib/http'
import { checkRateLimit, RateLimitError } from '@/lib/rateLimit'
import { z } from 'zod'

// Request validation schema
const querySchema = z.object({
  category: z.string().min(1, 'Category is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  epsilon: z.number().min(0.01).max(10).optional().default(1.0),
  aggregations: z.array(z.enum(['mean', 'count', 'sum', 'min', 'max'])).optional().default(['count']),
})

/**
 * POST /api/pdp/query
 * Privacy Data Platform query endpoint with differential privacy
 *
 * Headers:
 * - x-api-key: API client authentication
 * - Authorization: Bearer <ConsentToken>
 *
 * Request body:
 * {
 *   "category": "health",
 *   "purpose": "medical-research",
 *   "epsilon": 1.0,
 *   "aggregations": ["mean", "count"]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "category": "health",
 *     "userId": "user123",
 *     "recordCount": 42,
 *     "aggregations": {
 *       "mean": 72.5,
 *       "count": 42
 *     },
 *     "privacyParams": {
 *       "epsilon": 1.0,
 *       "mechanism": "laplace"
 *     }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify API client
    const apiClient = await requireApiClient(req)

    // Rate limiting check
    let rateLimitStatus;
    try {
      rateLimitStatus = await checkRateLimit(apiClient.apiKey, '/api/pdp/query')
    } catch (error) {
      if (error instanceof RateLimitError) {
        const retryAfterSeconds = Math.ceil((error.resetTime.getTime() - Date.now()) / 1000)
        return new NextResponse(
          JSON.stringify({
            error: 'RATE_LIMIT_EXCEEDED',
            message: error.message,
            retryAfter: error.retryAfter
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfterSeconds.toString(),
              'X-RateLimit-Limit': error.limit.toString(),
              'X-RateLimit-Remaining': error.remaining.toString(),
              'X-RateLimit-Reset': Math.floor(error.resetTime.getTime() / 1000).toString()
            }
          }
        )
      }
      throw error
    }

    // Verify consent token
    const authHeader = req.headers.get('authorization')
    const tokenPayload = await requireConsentToken(authHeader)

    // Parse and validate request body
    const body = await req.json()
    const { category, purpose, epsilon, aggregations } = querySchema.parse(body)

    // Ensure consent allows this category and purpose
    await ensureConsentAllowed({
      userId: tokenPayload.sub,
      categories: [category],
      purpose,
      scopes: ['read', 'aggregate'], // Require read and aggregate scopes
    })

    // Validate that the category exists
    const dataCategory = await prisma.dataCategory.findUnique({
      where: { key: category },
    })

    if (!dataCategory) {
      return jsonError(400, ErrorCodes.NOT_FOUND, `Invalid category: ${category}`, undefined,
        `The data category '${category}' is not recognized. Please check available categories and try again`)
    }

    // Load user's sample data for the category
    const sampleData = await prisma.sampleData.findMany({
      where: {
        userId: tokenPayload.sub,
        categoryKey: category,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Extract client information for logging
    const clientIp = req.headers.get('x-forwarded-for') ||
                     req.headers.get('x-real-ip') ||
                     'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Log the access attempt using centralized audit logging
    await logAccess({
      userId: tokenPayload.sub,
      apiClientId: apiClient.id,
      endpoint: '/api/pdp/query',
      action: 'query',
      categoryKeys: [category],
      purpose,
      tokenId: await getTokenIdFromJwt(tokenPayload, req),
      req,
    })

    // Prepare aggregation results
    const results: Record<string, any> = {}
    const recordCount = sampleData.length

    // Apply differential privacy to record count
    results.count = Math.max(0, Math.round(laplaceMechanism(recordCount, epsilon)))

    if (recordCount === 0) {
      return jsonOk({
        category,
        userId: tokenPayload.sub,
        results,
        epsilon,
        recordCount: results.count,
        timestamp: new Date().toISOString(),
        message: 'No data available for the specified category',
      })
    }

    // Process aggregations based on payload data
    for (const aggregation of aggregations) {
      switch (aggregation) {
        case 'count':
          // Already computed above
          break

        case 'mean':
          // Attempt to compute mean from numeric fields in payloads
          const numericValues = extractNumericValues(sampleData)
          if (numericValues.length > 0) {
            // Estimate reasonable bounds for the data (this should be configured per category)
            const bounds = estimateDataBounds(numericValues, category)
            results.mean = dpMean(numericValues, epsilon / aggregations.length, bounds.min, bounds.max)
          } else {
            results.mean = null
          }
          break

        case 'sum':
          const sumValues = extractNumericValues(sampleData)
          if (sumValues.length > 0) {
            const trueSum = sumValues.reduce((a, b) => a + b, 0)
            results.sum = laplaceMechanism(trueSum, epsilon / aggregations.length)
          } else {
            results.sum = null
          }
          break

        case 'min':
          const minValues = extractNumericValues(sampleData)
          if (minValues.length > 0) {
            const trueMin = Math.min(...minValues)
            results.min = laplaceMechanism(trueMin, epsilon / aggregations.length)
          } else {
            results.min = null
          }
          break

        case 'max':
          const maxValues = extractNumericValues(sampleData)
          if (maxValues.length > 0) {
            const trueMax = Math.max(...maxValues)
            results.max = laplaceMechanism(trueMax, epsilon / aggregations.length)
          } else {
            results.max = null
          }
          break
      }
    }

    // Return anonymized results with consistent structure and rate limit headers
    const responseData = {
      success: true,
      results,
      epsilon,
      category,
      purpose,
      timestamp: new Date().toISOString(),
      recordCount: results.count,
      metadata: {
        dataCategory: dataCategory.name,
        apiClient: apiClient.name,
        queryTime: new Date().toISOString(),
      }
    };

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': rateLimitStatus.limit.toString(),
        'X-RateLimit-Remaining': rateLimitStatus.remaining.toString(),
        'X-RateLimit-Reset': Math.floor(rateLimitStatus.resetTime.getTime() / 1000).toString()
      }
    })

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return zodError(error)
    }

    // Use centralized error handling
    return handleApiError(error)
  }
}

/**
 * Extract numeric values from sample data payloads
 */
function extractNumericValues(sampleData: any[]): number[] {
  const values: number[] = []

  for (const sample of sampleData) {
    if (sample.payload && typeof sample.payload === 'object') {
      for (const [key, value] of Object.entries(sample.payload)) {
        if (typeof value === 'number' && !isNaN(value)) {
          values.push(value)
        }
      }
    }
  }

  return values
}

/**
 * Estimate reasonable bounds for data based on category
 */
function estimateDataBounds(values: number[], category: string): { min: number; max: number } {
  if (values.length === 0) {
    // Return default bounds if no values
    return { min: 0, max: 100 }
  }

  const sortedValues = [...values].sort((a, b) => a - b)
  const actualMin = sortedValues[0]!
  const actualMax = sortedValues[sortedValues.length - 1]!

  // Category-specific bounds (these should be configurable)
  switch (category) {
    case 'health':
      return {
        min: Math.min(actualMin, 0),
        max: Math.max(actualMax, 200), // e.g., heart rate, temperature ranges
      }
    case 'financial':
      return {
        min: Math.min(actualMin, 0),
        max: Math.max(actualMax, 10000), // transaction amounts
      }
    case 'location':
      return {
        min: Math.min(actualMin, -180),
        max: Math.max(actualMax, 180), // latitude/longitude ranges
      }
    default:
      // Conservative bounds based on actual data
      const range = actualMax - actualMin
      return {
        min: actualMin - range * 0.1,
        max: actualMax + range * 0.1,
      }
  }
}

/**
 * Get token ID from JWT payload by looking it up in the database
 */
async function getTokenIdFromJwt(tokenPayload: any, req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {return null}

    const token = authHeader.split(' ')[1]
    if (!token) {return null}

    const consentToken = await prisma.consentToken.findFirst({
      where: {
        jwt: token,
        userId: tokenPayload.sub,
      },
    })

    return consentToken?.id || null
  } catch (error) {
    console.warn('Failed to get token ID:', error)
    return null
  }
}