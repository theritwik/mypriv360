'use client'

import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  }

  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    secondary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  }

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}

interface StatusPillProps {
  status: 'GRANTED' | 'RESTRICTED' | 'REVOKED'
}

export function StatusPill({ status }: StatusPillProps) {
  const statusConfig = {
    GRANTED: { variant: 'success' as const, label: 'Granted' },
    RESTRICTED: { variant: 'warning' as const, label: 'Restricted' },
    REVOKED: { variant: 'danger' as const, label: 'Revoked' }
  }

  const config = statusConfig[status]

  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface ScopesBadgeListProps {
  scopes: string[]
}

export function ScopesBadgeList({ scopes }: ScopesBadgeListProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map((scope, index) => (
        <Badge key={index} variant="secondary" size="sm">
          {scope}
        </Badge>
      ))}
    </div>
  )
}