'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/guards'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export type AuditLogWithDetails = {
  id: string
  userId: string
  apiClientId: string | null
  endpoint: string
  action: string
  categoryKeys: string[]
  purpose: string | null
  tokenId: string | null
  ip: string | null
  userAgent: string | null
  createdAt: Date
  metadata?: any
  resource?: string | null
  outcome?: string | null
  ipAddress?: string | null
  apiClient?: {
    name: string
    id: string
  } | null
  client?: {
    name: string
    id: string
    description?: string
  } | null
}

export type AuditFilters = {
  startDate?: string
  endDate?: string
  apiClient?: string
  endpoint?: string
  category?: string
  purpose?: string
  outcome?: string
  page?: number
  limit?: number
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const auditFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  apiClient: z.string().optional(),
  endpoint: z.string().optional(),
  category: z.string().optional(),
  purpose: z.string().optional(),
  outcome: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

/**
 * Get paginated audit logs with filters
 */
export async function getAuditLogsAction(
  filters: AuditFilters
): Promise<ActionResult<{ logs: AuditLogWithDetails[]; totalCount: number; hasMore: boolean }>> {
  try {
    const user = await requireSession()

    // Validate filters
    const validatedFilters = auditFiltersSchema.parse(filters)
    const { page, limit, startDate, endDate, apiClient, endpoint, category, purpose } = validatedFilters

    // Build where clause
    const where: any = {
      userId: user.id
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // API client filter
    if (apiClient) {
      where.apiClient = {
        name: {
          contains: apiClient,
          mode: 'insensitive'
        }
      }
    }

    // Endpoint filter
    if (endpoint) {
      where.endpoint = {
        contains: endpoint,
        mode: 'insensitive'
      }
    }

    // Category filter (search in categoryKeys array)
    if (category) {
      where.categoryKeys = {
        has: category
      }
    }

    // Purpose filter
    if (purpose) {
      where.OR = [
        {
          purpose: {
            contains: purpose,
            mode: 'insensitive'
          }
        },
        {
          action: {
            contains: purpose,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Get total count for pagination
    const totalCount = await prisma.accessLog.count({ where })

    // Get paginated results
    const logs = await prisma.accessLog.findMany({
      where,
      include: {
        apiClient: {
          select: {
            name: true,
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    const hasMore = totalCount > page * limit

    // Transform logs to parse JSON strings back to arrays
    const transformedLogs = logs.map(log => ({
      ...log,
      categoryKeys: JSON.parse(log.categoryKeys)
    }))

    return {
      success: true,
      data: {
        logs: transformedLogs,
        totalCount,
        hasMore
      }
    }
  } catch (error) {
    console.error('Failed to get audit logs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get audit logs'
    }
  }
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogsCsvAction(
  filters: AuditFilters
): Promise<ActionResult<string>> {
  try {
    const user = await requireSession()

    // Get all logs matching filters (no pagination for export)
    const filtersForExport = { ...filters, page: 1, limit: 10000 }
    const result = await getAuditLogsAction(filtersForExport)

    if (!result.success) {
      return result
    }

    const { logs } = result.data

    // CSV headers
    const headers = [
      'Timestamp',
      'User ID',
      'Client',
      'Action',
      'Endpoint',
      'IP Address',
      'User Agent',
      'Categories',
      'Purpose'
    ]

    // Convert logs to CSV rows
    const rows = logs.map(log => {
      const categories = log.categoryKeys.join('; ')

      return [
        log.createdAt.toISOString(),
        log.userId,
        log.apiClient?.name || '',
        log.action,
        log.endpoint,
        log.ip || '',
        log.userAgent || '',
        categories,
        log.purpose || ''
      ]
    })

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(field =>
          // Escape fields containing commas, quotes, or newlines
          typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
            ? `"${field.replace(/"/g, '""')}"`
            : field
        ).join(',')
      )
    ].join('\n')

    return {
      success: true,
      data: csvContent
    }
  } catch (error) {
    console.error('Failed to export audit logs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export audit logs'
    }
  }
}

/**
 * Get unique API clients for filter dropdown
 */
export async function getApiClientsAction(): Promise<ActionResult<{ name: string; id: string }[]>> {
  try {
    const user = await requireSession()

    const clients = await prisma.apiClient.findMany({
      select: {
        name: true,
        id: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return {
      success: true,
      data: clients
    }
  } catch (error) {
    console.error('Failed to get API clients:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get API clients'
    }
  }
}

/**
 * Get unique endpoints for filter dropdown
 */
export async function getEndpointsAction(): Promise<ActionResult<string[]>> {
  try {
    const user = await requireSession()

    const logs = await prisma.accessLog.findMany({
      where: {
        userId: user.id
      },
      select: {
        endpoint: true
      },
      distinct: ['endpoint'],
      orderBy: {
        endpoint: 'asc'
      },
      take: 100 // Limit to prevent overwhelming dropdown
    })

    const endpoints = logs.map(log => log.endpoint)

    return {
      success: true,
      data: endpoints
    }
  } catch (error) {
    console.error('Failed to get endpoints:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get endpoints'
    }
  }
}