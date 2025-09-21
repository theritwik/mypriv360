/**
 * Consolidated Zod validation schemas for the MyPriv360 application
 * This file exports all validation schemas used across API routes and server actions
 */

import { z } from 'zod'

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/** Common ID schema for database identifiers */
export const idSchema = z.string().min(1, 'ID is required')

/** Email validation schema */
export const emailSchema = z.string().email('Please enter a valid email address')

/** Password validation schema with security requirements */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

/** Date/time schema that accepts ISO strings and converts to Date */
export const dateTimeSchema = z.string().datetime().transform(str => new Date(str))

/** Optional date/time schema */
export const optionalDateTimeSchema = dateTimeSchema.optional().nullable()

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/** Sign-in request validation */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

/** Sign-up request validation */
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

// ============================================================================
// CONSENT TOKEN SCHEMAS
// ============================================================================

/** Issue consent token request schema */
export const issueTokenSchema = z.object({
  purpose: z.string().min(1, 'Purpose is required').max(200, 'Purpose must be less than 200 characters'),
  categories: z.array(z.string()).min(1, 'At least one category is required').max(10, 'Maximum 10 categories allowed'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required').max(20, 'Maximum 20 scopes allowed'),
  ttlMinutes: z.number().int().min(1, 'TTL must be at least 1 minute').max(10080, 'TTL cannot exceed 1 week (10080 minutes)'),
})

/** Revoke consent token request schema */
export const revokeTokenSchema = z.object({
  tokenId: idSchema,
})

/** Token verification response schema */
export const tokenPayloadSchema = z.object({
  sub: z.string(), // User ID
  purpose: z.string(),
  categories: z.array(z.string()),
  scopes: z.array(z.string()),
  iat: z.number(),
  exp: z.number(),
  jti: z.string(), // Token ID
})

export type IssueTokenInput = z.infer<typeof issueTokenSchema>
export type RevokeTokenInput = z.infer<typeof revokeTokenSchema>
export type TokenPayload = z.infer<typeof tokenPayloadSchema>

// ============================================================================
// CONSENT POLICY SCHEMAS
// ============================================================================

/** Consent policy status enum */
export const consentStatusSchema = z.enum(['GRANTED', 'RESTRICTED', 'REVOKED'])

/** Create consent policy schema */
export const consentPolicyCreateSchema = z.object({
  categoryId: idSchema,
  purpose: z.string().min(1, 'Purpose is required').max(200, 'Purpose must be less than 200 characters'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required').max(20, 'Maximum 20 scopes allowed'),
  status: consentStatusSchema,
  expiresAt: z.string().datetime().optional().nullable(),
})

/** Update consent policy schema */
export const consentPolicyUpdateSchema = z.object({
  id: idSchema,
  purpose: z.string().min(1, 'Purpose is required').max(200, 'Purpose must be less than 200 characters').optional(),
  scopes: z.array(z.string()).min(1, 'At least one scope is required').max(20, 'Maximum 20 scopes allowed').optional(),
  status: consentStatusSchema.optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

/** Delete consent policy schema */
export const consentPolicyDeleteSchema = z.object({
  id: idSchema,
})

export type ConsentPolicyCreateInput = z.infer<typeof consentPolicyCreateSchema>
export type ConsentPolicyUpdateInput = z.infer<typeof consentPolicyUpdateSchema>
export type ConsentPolicyDeleteInput = z.infer<typeof consentPolicyDeleteSchema>

// ============================================================================
// DATA REGISTRATION SCHEMAS
// ============================================================================

/** Data registration request schema */
export const registerDataSchema = z.object({
  categoryKey: z.string().min(1, 'Category key is required').max(50, 'Category key must be less than 50 characters'),
  payload: z.record(z.any()).refine(
    (data) => Object.keys(data).length > 0,
    'Payload must not be empty'
  ).refine(
    (data) => Object.keys(data).length <= 100,
    'Payload cannot have more than 100 fields'
  ),
})

export type RegisterDataInput = z.infer<typeof registerDataSchema>

// ============================================================================
// DIFFERENTIAL PRIVACY QUERY SCHEMAS
// ============================================================================

/** Supported aggregation types */
export const aggregationTypeSchema = z.enum(['mean', 'count', 'sum', 'min', 'max', 'stddev', 'median'])

/** Differential privacy query schema */
export const dpQuerySchema = z.object({
  category: z.string().min(1, 'Category is required').max(50, 'Category must be less than 50 characters'),
  purpose: z.string().min(1, 'Purpose is required').max(200, 'Purpose must be less than 200 characters'),
  epsilon: z.number()
    .min(0.01, 'Epsilon must be at least 0.01')
    .max(10, 'Epsilon cannot exceed 10 (too low privacy)')
    .optional()
    .default(1.0),
  aggregations: z.array(aggregationTypeSchema)
    .min(1, 'At least one aggregation is required')
    .max(5, 'Maximum 5 aggregations allowed')
    .optional()
    .default(['count']),
  filters: z.record(z.any()).optional(),
})

export type DPQueryInput = z.infer<typeof dpQuerySchema>
export type AggregationType = z.infer<typeof aggregationTypeSchema>

// ============================================================================
// API CLIENT SCHEMAS
// ============================================================================

/** API client status enum */
export const apiClientStatusSchema = z.enum(['ACTIVE', 'REVOKED'])

/** Create API client schema */
export const createApiClientSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
})

/** Update API client schema */
export const updateApiClientSchema = z.object({
  id: idSchema,
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
  status: apiClientStatusSchema,
})

/** Delete API client schema */
export const deleteApiClientSchema = z.object({
  id: idSchema,
})

/** Regenerate API key schema */
export const regenerateApiKeySchema = z.object({
  id: idSchema,
})

export type CreateApiClientInput = z.infer<typeof createApiClientSchema>
export type UpdateApiClientInput = z.infer<typeof updateApiClientSchema>
export type DeleteApiClientInput = z.infer<typeof deleteApiClientSchema>
export type RegenerateApiKeyInput = z.infer<typeof regenerateApiKeySchema>

// ============================================================================
// AUDIT LOG SCHEMAS
// ============================================================================

/** Audit log outcome enum */
export const auditOutcomeSchema = z.enum(['SUCCESS', 'DENIED', 'ERROR'])

/** Audit log filters schema */
export const auditFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  apiClient: z.string().optional(),
  endpoint: z.string().optional(),
  category: z.string().optional(),
  purpose: z.string().optional(),
  outcome: auditOutcomeSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type AuditFilters = z.infer<typeof auditFiltersSchema>
export type AuditOutcome = z.infer<typeof auditOutcomeSchema>

// ============================================================================
// DATA CATEGORY SCHEMAS
// ============================================================================

/** Create data category schema */
export const createDataCategorySchema = z.object({
  key: z.string()
    .min(1, 'Key is required')
    .max(50, 'Key must be less than 50 characters')
    .regex(/^[a-z0-9_-]+$/, 'Key can only contain lowercase letters, numbers, hyphens, and underscores'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
})

/** Update data category schema */
export const updateDataCategorySchema = z.object({
  id: idSchema,
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
})

export type CreateDataCategoryInput = z.infer<typeof createDataCategorySchema>
export type UpdateDataCategoryInput = z.infer<typeof updateDataCategorySchema>

// ============================================================================
// FORM DATA HELPERS
// ============================================================================

/** Helper to extract and validate data from FormData */
export function parseFormData<T>(formData: FormData, schema: z.ZodSchema<T>): T {
  const data: Record<string, any> = {}

  // Use Array.from to avoid iterator issues
  const entries = Array.from(formData.entries())

  for (const [key, value] of entries) {
    if (key.includes('[]') || key.includes('.')) {
      // Handle array or nested object notation
      const cleanKey = key.replace('[]', '')
      if (!data[cleanKey]) {
        data[cleanKey] = []
      }
      if (Array.isArray(data[cleanKey])) {
        data[cleanKey].push(value)
      }
    } else if (data[key]) {
      // Convert to array if multiple values for same key
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]]
      }
      data[key].push(value)
    } else {
      data[key] = value
    }
  }

  return schema.parse(data)
}

/** Helper to validate JSON request body */
export async function parseJsonBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON in request body')
    }
    throw error
  }
}

// ============================================================================
// VALIDATION ERROR HANDLING
// ============================================================================

/** Convert Zod error to user-friendly message */
export function formatZodError(error: z.ZodError): string {
  const firstError = error.errors[0]
  if (!firstError) {return 'Validation failed'}

  const path = firstError.path.length > 0 ? ` in ${firstError.path.join('.')}` : ''
  return `${firstError.message}${path}`
}

/** Check if error is a Zod validation error */
export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export common Zod utilities
export { z } from 'zod'