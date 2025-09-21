'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badges'
import { Button, Input, Select } from '@/components/ui/form'
import {
  getAuditLogsAction,
  exportAuditLogsCsvAction,
  getApiClientsAction,
  getEndpointsAction,
  type AuditLogWithDetails,
  type AuditFilters
} from './actions'

interface FilterFormProps {
  filters: AuditFilters
  onFiltersChange: (filters: AuditFilters) => void
  onExport: () => void
  isExporting: boolean
}

function FilterForm({ filters, onFiltersChange, onExport, isExporting }: FilterFormProps) {
  const [clients, setClients] = useState<{ name: string; description?: string }[]>([])
  const [endpoints, setEndpoints] = useState<string[]>([])

  useEffect(() => {
    loadFilterOptions()
  }, [])

  const loadFilterOptions = async () => {
    try {
      const [clientsResult, endpointsResult] = await Promise.all([
        getApiClientsAction(),
        getEndpointsAction()
      ])

      if (clientsResult.success) {
        setClients(clientsResult.data)
      }

      if (endpointsResult.success) {
        setEndpoints(endpointsResult.data)
      }
    } catch (error) {
      console.error('Failed to load filter options:', error)
    }
  }

  const updateFilter = (key: keyof AuditFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
      page: 1 // Reset to first page when filters change
    })
  }

  const clearFilters = () => {
    onFiltersChange({ page: 1, limit: 20 })
  }

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Filters</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
          >
            Clear All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            isLoading={isExporting}
            disabled={isExporting}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Input
            label="Start Date"
            type="date"
            value={filters.startDate || weekAgo}
            onChange={(e) => updateFilter('startDate', e.target.value)}
          />
        </div>

        <div>
          <Input
            label="End Date"
            type="date"
            value={filters.endDate || today}
            onChange={(e) => updateFilter('endDate', e.target.value)}
          />
        </div>

        <div>
          <Select
            label="API Client"
            value={filters.apiClient || ''}
            onChange={(e) => updateFilter('apiClient', e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map(client => (
              <option key={client.name} value={client.name}>
                {client.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Select
            label="Outcome"
            value={filters.outcome || ''}
            onChange={(e) => updateFilter('outcome', e.target.value)}
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="DENIED">Denied</option>
            <option value="ERROR">Error</option>
          </Select>
        </div>

        <div>
          <Select
            label="Endpoint"
            value={filters.endpoint || ''}
            onChange={(e) => updateFilter('endpoint', e.target.value)}
          >
            <option value="">All Endpoints</option>
            {endpoints.map(endpoint => (
              <option key={endpoint} value={endpoint}>
                {endpoint}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Input
            label="Category"
            type="text"
            placeholder="Filter by category..."
            value={filters.category || ''}
            onChange={(e) => updateFilter('category', e.target.value)}
          />
        </div>

        <div>
          <Input
            label="Purpose"
            type="text"
            placeholder="Filter by purpose..."
            value={filters.purpose || ''}
            onChange={(e) => updateFilter('purpose', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

interface AuditTableProps {
  logs: AuditLogWithDetails[]
  isLoading: boolean
}

function AuditTable({ logs, isLoading }: AuditTableProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date))
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'SUCCESS': return 'success'
      case 'DENIED': return 'danger'
      case 'ERROR': return 'warning'
      default: return 'secondary'
    }
  }

  const extractMetadata = (metadata: any) => {
    if (!metadata || typeof metadata !== 'object') {return null}

    const category = metadata.category || metadata.categoryKey
    const purpose = metadata.purpose

    return { category, purpose }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading audit logs...</span>
        </div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">No audit logs found</h3>
          <p className="mt-2 text-sm text-gray-500">
            No logs match your current filters. Try adjusting the date range or clearing filters.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purpose
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => {
              const meta = extractMetadata(log.metadata)
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.client ? (
                      <div>
                        <div className="font-medium text-gray-900">{log.client.name}</div>
                        {log.client.description && (
                          <div className="text-gray-500 text-xs">{log.client.description}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">No client</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={log.resource || undefined}>
                    {log.resource || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getOutcomeColor(log.outcome || 'unknown')}>
                      {log.outcome || 'Unknown'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {meta?.category || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {meta?.purpose || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ipAddress || '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface PaginationProps {
  currentPage: number
  totalCount: number
  pageSize: number
  hasMore: boolean
  onPageChange: (page: number) => void
  isLoading: boolean
}

function Pagination({ currentPage, totalCount, pageSize, hasMore, onPageChange, isLoading }: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex-1 flex justify-between sm:hidden">
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasMore || isLoading}
        >
          Next
        </Button>
      </div>

      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalCount}</span> results
          </p>
        </div>

        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber
              if (totalPages <= 5) {
                pageNumber = i + 1
              } else if (currentPage <= 3) {
                pageNumber = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i
              } else {
                pageNumber = currentPage - 2 + i
              }

              const isActive = pageNumber === currentPage

              return (
                <button
                  key={pageNumber}
                  onClick={() => onPageChange(pageNumber)}
                  disabled={isLoading}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    isActive
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {pageNumber}
                </button>
              )
            })}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasMore || isLoading}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default function AuditClient() {
  const [logs, setLogs] = useState<AuditLogWithDetails[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [filters, setFilters] = useState<AuditFilters>({
    page: 1,
    limit: 20,
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Week ago
    endDate: new Date().toISOString().split('T')[0] // Today
  })

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getAuditLogsAction(filters)
      if (result.success) {
        setLogs(result.data.logs)
        setTotalCount(result.data.totalCount)
        setHasMore(result.data.hasMore)
      } else {
        console.error('Failed to load logs:', result.error)
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleFiltersChange = (newFilters: AuditFilters) => {
    setFilters(newFilters)
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Build query string for export endpoint
      const params = new URLSearchParams()
      if (filters.startDate) {params.append('startDate', filters.startDate)}
      if (filters.endDate) {params.append('endDate', filters.endDate)}
      if (filters.apiClient) {params.append('apiClient', filters.apiClient)}
      if (filters.endpoint) {params.append('endpoint', filters.endpoint)}
      if (filters.category) {params.append('category', filters.category)}
      if (filters.purpose) {params.append('purpose', filters.purpose)}
      if (filters.outcome) {params.append('outcome', filters.outcome)}

      // Use the streaming CSV export endpoint
      const response = await fetch(`/audit/export?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Download the CSV file
      const blob = await response.blob()
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track access patterns and monitor compliance activities
          </p>
        </div>

        <FilterForm
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onExport={handleExport}
          isExporting={isExporting}
        />

        <AuditTable logs={logs} isLoading={isLoading} />

        {totalCount > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={filters.page || 1}
              totalCount={totalCount}
              pageSize={filters.limit || 20}
              hasMore={hasMore}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  )
}