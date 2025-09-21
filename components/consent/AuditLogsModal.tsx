'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '../ui/modal'
import { Button, Select, Input } from '../ui/form'
import { Badge } from '../ui/badges'
import { getAuditLogsJsonAction } from '@/app/dashboard/actions'

interface AccessLog {
  id: string
  userId: string | null
  clientId: string | null
  action: string
  resource: string
  outcome: 'SUCCESS' | 'DENIED' | 'ERROR'
  ipAddress: string | null
  userAgent: string | null
  metadata: any
  createdAt: Date
}

interface AuditLogsModalProps {
  isOpen: boolean
  onClose: () => void
}

const OUTCOME_COLORS: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  SUCCESS: 'success',
  DENIED: 'danger',
  ERROR: 'warning'
}

const ACTION_FILTERS = [
  'CREATE_POLICY',
  'UPDATE_POLICY',
  'DELETE_POLICY',
  'ISSUE_TOKEN',
  'REVOKE_TOKEN',
  'QUERY_DATA',
  'REGISTER_DATA',
  'AUTHENTICATE',
  'UNAUTHORIZED'
]

export function AuditLogsModal({ isOpen, onClose }: AuditLogsModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AccessLog[]>([])
  const [filters, setFilters] = useState({
    action: '',
    outcome: '',
    userId: '',
    search: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadLogs()
    }
  }, [isOpen])

  useEffect(() => {
    applyFilters()
  }, [logs, filters])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const result = await getAuditLogsJsonAction({ limit: 100 })
      if (result.success) {
        setLogs(result.data)
      } else {
        alert(`Failed to load audit logs: ${result.error}`)
      }
    } catch (error) {
      alert(`Failed to load audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...logs]

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action)
    }

    if (filters.outcome) {
      filtered = filtered.filter(log => log.outcome === filters.outcome)
    }

    if (filters.userId) {
      filtered = filtered.filter(log =>
        log.userId?.toLowerCase().includes(filters.userId.toLowerCase())
      )
    }

    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(log =>
        log.resource.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        (log.ipAddress && log.ipAddress.includes(search)) ||
        (log.userAgent && log.userAgent.toLowerCase().includes(search))
      )
    }

    setFilteredLogs(filtered)
  }

  const clearFilters = () => {
    setFilters({
      action: '',
      outcome: '',
      userId: '',
      search: ''
    })
  }

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

  const formatMetadata = (metadata: any) => {
    if (!metadata || typeof metadata !== 'object') {return null}

    return Object.entries(metadata)
      .filter(([key, value]) => value !== null)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audit Logs" size="xl">
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Filters</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Action"
              value={filters.action}
              onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
            >
              <option value="">All Actions</option>
              {ACTION_FILTERS.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>

            <Select
              label="Outcome"
              value={filters.outcome}
              onChange={(e) => setFilters(prev => ({ ...prev, outcome: e.target.value }))}
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESS">Success</option>
              <option value="DENIED">Denied</option>
              <option value="ERROR">Error</option>
            </Select>

            <Input
              label="User ID"
              type="text"
              placeholder="Filter by user..."
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
            />

            <Input
              label="Search"
              type="text"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>

        {/* Logs Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">
                  Access Logs ({filteredLogs.length} of {logs.length})
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadLogs}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-sm font-medium text-gray-900">No logs found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  No audit logs match your current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Outcome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {log.userId ? (
                            <span className="text-gray-900">{log.userId}</span>
                          ) : (
                            <span className="text-gray-500 italic">Anonymous</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {log.action.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={log.resource}>
                          {log.resource}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            variant={OUTCOME_COLORS[log.outcome] || 'default'}
                          >
                            {log.outcome}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {log.ipAddress || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {formatMetadata(log.metadata) || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}