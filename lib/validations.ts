import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

// Consent Policy Schemas
export const consentPolicyCreateSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  status: z.enum(['GRANTED', 'RESTRICTED', 'REVOKED']),
  expiresAt: z.string().datetime().optional().nullable(),
})

export const consentPolicyUpdateSchema = z.object({
  id: z.string().min(1, 'Policy ID is required'),
  purpose: z.string().min(1, 'Purpose is required').optional(),
  scopes: z.array(z.string()).min(1, 'At least one scope is required').optional(),
  status: z.enum(['GRANTED', 'RESTRICTED', 'REVOKED']).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export const consentPolicyDeleteSchema = z.object({
  id: z.string().min(1, 'Policy ID is required'),
})

export type ConsentPolicyCreateInput = z.infer<typeof consentPolicyCreateSchema>
export type ConsentPolicyUpdateInput = z.infer<typeof consentPolicyUpdateSchema>
export type ConsentPolicyDeleteInput = z.infer<typeof consentPolicyDeleteSchema>