import { NextRequest, NextResponse } from 'next/server'
import { requireSession, handleHttpError } from '@/lib/guards'
import { getDataCategories } from '@/lib/policyService'
import { jsonOk, handleApiError } from '@/lib/http'

/**
 * GET /api/consent/categories
 * Get all available data categories
 */
export async function GET(req: NextRequest) {
  try {
    // Require authentication to prevent unauthorized enumeration
    await requireSession()

    const categories = await getDataCategories()

    return jsonOk(categories)
  } catch (error) {
    return handleApiError(error)
  }
}