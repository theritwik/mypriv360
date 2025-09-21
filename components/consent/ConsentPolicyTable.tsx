'use client'

import { useState, useTransition } from 'react'
import { StatusPill, ScopesBadgeList } from '../ui/badges'
import { Button } from '../ui/form'
import { deletePolicyJsonAction } from '@/app/dashboard/actions'

interface ConsentPolicy {
  id: string
  purpose: string
  scopes: string[]
  status: 'GRANTED' | 'RESTRICTED' | 'REVOKED'
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
  category: {
    key: string
    name: string
  }
}

interface ConsentPolicyTableProps {
  policies: ConsentPolicy[]
  onEdit: (policy: ConsentPolicy) => void
  onPoliciesChange: () => void
}

export function ConsentPolicyTable({ policies, onEdit, onPoliciesChange }: ConsentPolicyTableProps) {
  const [deletingPolicies, setDeletingPolicies] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const handleDelete = async (policy: ConsentPolicy) => {
    if (!confirm(`Are you sure you want to delete the ${policy.category.name} policy for ${policy.purpose}?`)) {
      return
    }

    setDeletingPolicies(prev => new Set([...prev, policy.id]))

    startTransition(async () => {
      try {
        const result = await deletePolicyJsonAction({ id: policy.id })
        if (result.success) {
          onPoliciesChange()
        } else {
          alert(`Failed to delete policy: ${result.error}`)
        }
      } catch (error) {
        alert(`Failed to delete policy: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setDeletingPolicies(prev => {
          const next = new Set(prev)
          next.delete(policy.id)
          return next
        })
      }
    })
  }

  const formatDate = (date: Date | null) => {
    if (!date) {return 'Never'}
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  if (policies.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">No consent policies</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first consent policy.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Consent Policies</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purpose
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scopes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {policy.category.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {policy.category.key}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={policy.purpose}>
                      {policy.purpose}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ScopesBadgeList scopes={policy.scopes} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusPill status={policy.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(policy.expiresAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(policy)}
                        disabled={isPending}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(policy)}
                        isLoading={deletingPolicies.has(policy.id)}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}