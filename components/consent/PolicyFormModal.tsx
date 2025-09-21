'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../ui/modal'
import { Button, Input, Select } from '../ui/form'
import { ScopesBadgeList } from '../ui/badges'
import { createPolicyJsonAction, updatePolicyJsonAction } from '@/app/dashboard/actions'

const policyFormSchema = z.object({
  categoryKey: z.string().min(1, 'Category is required'),
  purpose: z.string().min(1, 'Purpose is required').max(500, 'Purpose must be less than 500 characters'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  status: z.enum(['GRANTED', 'RESTRICTED', 'REVOKED']),
  expiresAt: z.string().optional().refine((val) => {
    if (!val) {return true}
    const date = new Date(val)
    return date > new Date()
  }, 'Expiry date must be in the future')
})

type PolicyFormData = z.infer<typeof policyFormSchema>

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

interface DataCategory {
  key: string
  name: string
  description: string
}

interface PolicyFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  policy?: ConsentPolicy | null
  categories: DataCategory[]
}

const AVAILABLE_SCOPES = [
  'read',
  'write',
  'delete',
  'share',
  'analyze',
  'export',
  'backup',
  'restore'
]

export function PolicyFormModal({ isOpen, onClose, onSuccess, policy, categories }: PolicyFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>(policy?.scopes || [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<PolicyFormData>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      categoryKey: policy?.category.key || '',
      purpose: policy?.purpose || '',
      scopes: policy?.scopes || [],
      status: policy?.status || 'GRANTED',
      expiresAt: policy?.expiresAt ?
        new Date(policy.expiresAt).toISOString().slice(0, 16) : ''
    }
  })

  const handleClose = () => {
    reset()
    setSelectedScopes([])
    onClose()
  }

  const toggleScope = (scope: string) => {
    const newScopes = selectedScopes.includes(scope)
      ? selectedScopes.filter(s => s !== scope)
      : [...selectedScopes, scope]

    setSelectedScopes(newScopes)
    setValue('scopes', newScopes, { shouldValidate: true })
  }

  const onSubmit = async (data: PolicyFormData) => {
    setIsSubmitting(true)

    try {
      const formData = {
        ...data,
        scopes: selectedScopes,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null
      }

      let result
      if (policy) {
        // Update existing policy
        result = await updatePolicyJsonAction({
          id: policy.id,
          ...formData
        })
      } else {
        // Create new policy
        result = await createPolicyJsonAction(formData)
      }

      if (result.success) {
        onSuccess()
        handleClose()
      } else {
        alert(`Failed to ${policy ? 'update' : 'create'} policy: ${result.error}`)
      }
    } catch (error) {
      alert(`Failed to ${policy ? 'update' : 'create'} policy: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`${policy ? 'Edit' : 'Create'} Consent Policy`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Select
            label="Data Category"
            {...register('categoryKey')}
            error={errors.categoryKey?.message}
            required
          >
            <option value="">Select a category...</option>
            {categories.map(category => (
              <option key={category.key} value={category.key}>
                {category.name} ({category.key})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Input
            label="Purpose"
            type="text"
            placeholder="Describe the purpose of this consent policy..."
            {...register('purpose')}
            error={errors.purpose?.message}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scopes <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map(scope => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedScopes.includes(scope)
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
            {selectedScopes.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Selected scopes:</p>
                <ScopesBadgeList scopes={selectedScopes} />
              </div>
            )}
            {errors.scopes && (
              <p className="text-sm text-red-600">{errors.scopes.message}</p>
            )}
          </div>
        </div>

        <div>
          <Select
            label="Status"
            {...register('status')}
            error={errors.status?.message}
            required
          >
            <option value="GRANTED">Granted</option>
            <option value="RESTRICTED">Restricted</option>
            <option value="REVOKED">Revoked</option>
          </Select>
        </div>

        <div>
          <Input
            label="Expiry Date (Optional)"
            type="datetime-local"
            {...register('expiresAt')}
            error={errors.expiresAt?.message}
          />
          <p className="mt-1 text-sm text-gray-600">
            Leave empty for no expiration
          </p>
        </div>

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
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {policy ? 'Update' : 'Create'} Policy
          </Button>
        </div>
      </form>
    </Modal>
  )
}