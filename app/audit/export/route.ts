import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guards'
import { exportAuditLogsCsvAction } from '../actions'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireSession()

    // Get search params
    const searchParams = request.nextUrl.searchParams
    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      apiClient: searchParams.get('apiClient') || undefined,
      endpoint: searchParams.get('endpoint') || undefined,
      category: searchParams.get('category') || undefined,
      purpose: searchParams.get('purpose') || undefined,
      outcome: searchParams.get('outcome') as 'SUCCESS' | 'DENIED' | 'ERROR' | undefined,
    }

    // Export CSV data
    const result = await exportAuditLogsCsvAction(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Create streaming response
    const headers = new Headers({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    return new NextResponse(result.data, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    )
  }
}