'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '../ui/modal'
import { Button, Select } from '../ui/form'
import { StatusPill, ScopesBadgeList, Badge } from '../ui/badges'
import { revokeTokenJsonAction, getActiveTokensJsonAction } from '@/app/dashboard/actions'

interface ConsentToken {
  id: string
  token: string
  purpose: string
  scopes: string[]
  status: string
  expiresAt: Date
  createdAt: Date
  categoryKeys: string[]
  revoked?: boolean
}

interface TokenRevokeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TokenRevokeModal({ isOpen, onClose, onSuccess }: TokenRevokeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tokens, setTokens] = useState<ConsentToken[]>([])
  const [selectedToken, setSelectedToken] = useState<ConsentToken | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<{ tokenId: string }>({
    defaultValues: { tokenId: '' }
  })

  const tokenId = watch('tokenId')

  useEffect(() => {
    if (isOpen) {
      loadTokens()
    }
  }, [isOpen])

  useEffect(() => {
    const token = tokens.find(t => t.id === tokenId)
    setSelectedToken(token || null)
  }, [tokenId, tokens])

  const loadTokens = async () => {
    setIsLoading(true)
    try {
      const result = await getActiveTokensJsonAction()
      if (result.success) {
        setTokens(result.data)
      } else {
        alert(`Failed to load tokens: ${result.error}`)
      }
    } catch (error) {
      alert(`Failed to load tokens: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setSelectedToken(null)
    setTokens([])
    onClose()
  }

  const onSubmit = async (data: { tokenId: string }) => {
    if (!selectedToken) {return}

    const confirmed = confirm(
      `Are you sure you want to revoke the token for "${selectedToken.purpose}"? This action cannot be undone.`
    )
    if (!confirmed) {return}

    setIsSubmitting(true)

    try {
      const result = await revokeTokenJsonAction({ tokenId: data.tokenId })

      if (result.success) {
        onSuccess()
        handleClose()
      } else {
        alert(`Failed to revoke token: ${result.error}`)
      }
    } catch (error) {
      alert(`Failed to revoke token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const isExpired = (date: Date) => {
    return new Date(date) < new Date()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Revoke Consent Token" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div>
              <Select
                label="Select Token to Revoke"
                {...register('tokenId', { required: 'Please select a token' })}
                error={errors.tokenId?.message}
                required
              >
                <option value="">Choose a token...</option>
                {tokens.map(token => (
                  <option key={token.id} value={token.id}>
                    {token.purpose} ({token.categoryKeys.join(', ')}) - Expires {formatDate(token.expiresAt)}
                  </option>
                ))}
              </Select>
              {tokens.length === 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  No active tokens found. Issue a new token first.
                </p>
              )}
            </div>

            {selectedToken && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Token Details</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Purpose:</span>
                    <p className="mt-1 text-gray-900">{selectedToken.purpose}</p>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">Categories:</span>
                    <p className="mt-1 text-gray-900">{selectedToken.categoryKeys.join(', ')}</p>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">Scopes:</span>
                    <div className="mt-1">
                      <ScopesBadgeList scopes={selectedToken.scopes} />
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <div className="mt-1 flex items-center space-x-2">
                      {isExpired(selectedToken.expiresAt) ? (
                        <Badge variant="danger">Expired</Badge>
                      ) : selectedToken.revoked ? (
                        <StatusPill status="REVOKED" />
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                      {isExpired(selectedToken.expiresAt) && (
                        <span className="text-xs text-red-600">(Expired)</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <p className="mt-1 text-gray-900">{formatDate(selectedToken.createdAt)}</p>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">Expires:</span>
                    <p className="mt-1 text-gray-900">{formatDate(selectedToken.expiresAt)}</p>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Token (truncated):</span>
                  <p className="mt-1 font-mono text-xs text-gray-600 bg-gray-100 p-2 rounded break-all">
                    {selectedToken.token.substring(0, 50)}...
                  </p>
                </div>

                {isExpired(selectedToken.expiresAt) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-800">
                          This token has already expired and is no longer valid.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={isSubmitting}
            disabled={isSubmitting || !selectedToken || tokens.length === 0}
          >
            Revoke Token
          </Button>
        </div>
      </form>
    </Modal>
  )
}