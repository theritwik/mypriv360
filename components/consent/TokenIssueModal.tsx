'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../ui/modal'
import { Button, Input, Select } from '../ui/form'
import { ScopesBadgeList } from '../ui/badges'
import { issueTokenJsonAction } from '@/app/dashboard/actions'

const tokenFormSchema = z.object({
  purpose: z.string().min(1, 'Purpose is required').max(500, 'Purpose must be less than 500 characters'),
  categoryKeys: z.array(z.string()).min(1, 'At least one category is required'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  ttlHours: z.number().min(1, 'TTL must be at least 1 hour').max(8760, 'TTL cannot exceed 1 year (8760 hours)')
})

type TokenFormData = z.infer<typeof tokenFormSchema>

interface DataCategory {
  key: string
  name: string
  description: string
}

interface TokenIssueModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (token: string) => void
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

const TTL_PRESETS = [
  { label: '1 Hour', hours: 1 },
  { label: '6 Hours', hours: 6 },
  { label: '1 Day', hours: 24 },
  { label: '1 Week', hours: 168 },
  { label: '1 Month', hours: 720 },
  { label: '3 Months', hours: 2160 },
  { label: '6 Months', hours: 4320 },
  { label: '1 Year', hours: 8760 }
]

export function TokenIssueModal({ isOpen, onClose, onSuccess, categories }: TokenIssueModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [customTtl, setCustomTtl] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<TokenFormData>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: {
      purpose: '',
      categoryKeys: [],
      scopes: [],
      ttlHours: 24
    }
  })

  const handleClose = () => {
    reset()
    setSelectedCategories([])
    setSelectedScopes([])
    setCustomTtl(false)
    onClose()
  }

  const toggleCategory = (categoryKey: string) => {
    const newCategories = selectedCategories.includes(categoryKey)
      ? selectedCategories.filter(k => k !== categoryKey)
      : [...selectedCategories, categoryKey]

    setSelectedCategories(newCategories)
    setValue('categoryKeys', newCategories, { shouldValidate: true })
  }

  const toggleScope = (scope: string) => {
    const newScopes = selectedScopes.includes(scope)
      ? selectedScopes.filter(s => s !== scope)
      : [...selectedScopes, scope]

    setSelectedScopes(newScopes)
    setValue('scopes', newScopes, { shouldValidate: true })
  }

  const handleTtlPreset = (hours: number) => {
    setValue('ttlHours', hours, { shouldValidate: true })
    setCustomTtl(false)
  }

  const onSubmit = async (data: TokenFormData) => {
    setIsSubmitting(true)

    try {
      const result = await issueTokenJsonAction({
        purpose: data.purpose,
        categoryKeys: selectedCategories,
        scopes: selectedScopes,
        ttlHours: data.ttlHours
      })

      if (result.success) {
        onSuccess(result.data.token)
        handleClose()
      } else {
        alert(`Failed to issue token: ${result.error}`)
      }
    } catch (error) {
      alert(`Failed to issue token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const ttlHours = watch('ttlHours')

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Issue Consent Token" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Input
            label="Purpose"
            type="text"
            placeholder="Describe the purpose for this token..."
            {...register('purpose')}
            error={errors.purpose?.message}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Categories <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map(category => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => toggleCategory(category.key)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedCategories.includes(category.key)
                      ? 'border-blue-300 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium text-sm">{category.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{category.key}</div>
                  <div className="text-xs text-gray-600 mt-1">{category.description}</div>
                </button>
              ))}
            </div>
            {errors.categoryKeys && (
              <p className="text-sm text-red-600">{errors.categoryKeys.message}</p>
            )}
          </div>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time to Live (TTL)
          </label>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {TTL_PRESETS.map(preset => (
                <button
                  key={preset.hours}
                  type="button"
                  onClick={() => handleTtlPreset(preset.hours)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    ttlHours === preset.hours && !customTtl
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomTtl(true)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  customTtl
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                Custom
              </button>
            </div>

            {customTtl && (
              <div className="w-40">
                <Input
                  label="Hours"
                  type="number"
                  min={1}
                  max={8760}
                  {...register('ttlHours', { valueAsNumber: true })}
                  error={errors.ttlHours?.message}
                />
              </div>
            )}

            {ttlHours && (
              <p className="text-sm text-gray-600">
                Token will expire in {ttlHours} hours ({Math.round(ttlHours / 24)} days)
              </p>
            )}
          </div>
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
            Issue Token
          </Button>
        </div>
      </form>
    </Modal>
  )
}