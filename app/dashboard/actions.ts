'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/guards'
import {
  consentPolicyCreateSchema,
  consentPolicyUpdateSchema,
  consentPolicyDeleteSchema
} from '@/lib/validations'
import {
  listUserPolicies,
  upsertUserPolicy,
  deleteUserPolicy,
  getDataCategories,
} from '@/lib/policyService'
import { issueConsentToken, revokeConsentToken } from '@/lib/jwt'
import { db } from '@/lib/db'

// Server action return types
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * List all consent policies for the current user
 */
export async function listPoliciesAction(): Promise<ActionResult<Awaited<ReturnType<typeof listUserPolicies>>>> {
  try {
    const user = await requireSession()
    const policies = await listUserPolicies(user.id)
    return { success: true, data: policies }
  } catch (error) {
    console.error('Failed to list policies:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list policies'
    }
  }
}

/**
 * Create or update a consent policy
 */
export async function upsertPolicyAction(formData: FormData): Promise<ActionResult<Awaited<ReturnType<typeof upsertUserPolicy>>>> {
  try {
    const user = await requireSession()

    // Extract data from FormData
    const data = {
      id: formData.get('id') as string || undefined,
      categoryId: formData.get('categoryId') as string,
      purpose: formData.get('purpose') as string,
      scopes: (formData.get('scopes') as string)?.split(',').filter(Boolean) || [],
      status: formData.get('status') as 'GRANTED' | 'RESTRICTED' | 'REVOKED',
      expiresAt: formData.get('expiresAt') as string || null,
    }

    // Validate the data
    const validatedData = consentPolicyCreateSchema.parse(data)

    // Upsert the policy
    const policy = await upsertUserPolicy(user.id, {
      ...validatedData,
      id: data.id,
    })

    // Revalidate the dashboard page to show updated data
    revalidatePath('/dashboard')

    return { success: true, data: policy }
  } catch (error) {
    console.error('Failed to upsert policy:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save policy'
    }
  }
}

/**
 * Delete a consent policy
 */
export async function deletePolicyAction(formData: FormData): Promise<ActionResult<void>> {
  try {
    const user = await requireSession()

    const data = {
      id: formData.get('id') as string,
    }

    // Validate the data
    const validatedData = consentPolicyDeleteSchema.parse(data)

    // Delete the policy
    await deleteUserPolicy(user.id, validatedData.id)

    // Revalidate the dashboard page to show updated data
    revalidatePath('/dashboard')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Failed to delete policy:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete policy'
    }
  }
}

/**
 * Get all available data categories for form dropdowns
 */
export async function getCategoriesAction(): Promise<ActionResult<Awaited<ReturnType<typeof getDataCategories>>>> {
  try {
    const categories = await getDataCategories()
    return { success: true, data: categories }
  } catch (error) {
    console.error('Failed to get categories:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get categories'
    }
  }
}

/**
 * Typed action for JSON data (for client-side forms)
 */
export async function upsertPolicyJsonAction(
  input: {
    id?: string
    categoryId: string
    purpose: string
    scopes: string[]
    status: 'GRANTED' | 'RESTRICTED' | 'REVOKED'
    expiresAt?: string | null
  }
): Promise<ActionResult<Awaited<ReturnType<typeof upsertUserPolicy>>>> {
  try {
    const user = await requireSession()

    // Validate the data
    const validatedData = consentPolicyCreateSchema.parse(input)

    // Upsert the policy
    const policy = await upsertUserPolicy(user.id, {
      ...validatedData,
      id: input.id,
    })

    // Revalidate the dashboard page
    revalidatePath('/dashboard')

    return { success: true, data: policy }
  } catch (error) {
    console.error('Failed to upsert policy (JSON):', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save policy'
    }
  }
}

/**
 * Typed action for deleting policy with JSON data
 */
export async function deletePolicyJsonAction(
  input: { id: string }
): Promise<ActionResult<void>> {
  try {
    const user = await requireSession()

    // Validate the data
    const validatedData = consentPolicyDeleteSchema.parse(input)

    // Delete the policy
    await deleteUserPolicy(user.id, validatedData.id)

    // Revalidate the dashboard page
    revalidatePath('/dashboard')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Failed to delete policy (JSON):', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete policy'
    }
  }
}

/**
 * Get policies with JSON response
 */
export async function getPoliciesJsonAction(): Promise<ActionResult<Awaited<ReturnType<typeof listUserPolicies>>>> {
  return listPoliciesAction()
}

/**
 * Get categories with JSON response
 */
export async function getCategoriesJsonAction(): Promise<ActionResult<Awaited<ReturnType<typeof getDataCategories>>>> {
  return getCategoriesAction()
}

/**
 * Create policy with JSON data
 */
export async function createPolicyJsonAction(
  input: {
    categoryKey: string
    purpose: string
    scopes: string[]
    status: 'GRANTED' | 'RESTRICTED' | 'REVOKED'
    expiresAt?: string | null
  }
): Promise<ActionResult<Awaited<ReturnType<typeof upsertUserPolicy>>>> {
  try {
    const user = await requireSession()

    // Find the category by key
    const categories = await getDataCategories()
    const category = categories.find(c => c.key === input.categoryKey)
    if (!category) {
      return { success: false, error: 'Invalid category' }
    }

    // Map to expected format
    const policyData = {
      categoryId: category.id,
      purpose: input.purpose,
      scopes: input.scopes,
      status: input.status,
      expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
    }

    // Validate and create
    const validatedData = consentPolicyCreateSchema.parse(policyData)
    const policy = await upsertUserPolicy(user.id, validatedData)

    revalidatePath('/dashboard')
    return { success: true, data: policy }
  } catch (error) {
    console.error('Failed to create policy (JSON):', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create policy'
    }
  }
}

/**
 * Update policy with JSON data
 */
export async function updatePolicyJsonAction(
  input: {
    id: string
    categoryKey: string
    purpose: string
    scopes: string[]
    status: 'GRANTED' | 'RESTRICTED' | 'REVOKED'
    expiresAt?: string | null
  }
): Promise<ActionResult<Awaited<ReturnType<typeof upsertUserPolicy>>>> {
  try {
    const user = await requireSession()

    // Find the category by key
    const categories = await getDataCategories()
    const category = categories.find(c => c.key === input.categoryKey)
    if (!category) {
      return { success: false, error: 'Invalid category' }
    }

    // Map to expected format
    const policyData = {
      purpose: input.purpose,
      scopes: input.scopes,
      status: input.status,
      expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
    }

    // Validate and update (add categoryId for upsert, ensure required fields)
    const validatedData = consentPolicyUpdateSchema.parse(policyData)
    const policy = await upsertUserPolicy(user.id, {
      id: input.id,
      categoryId: category.id,
      purpose: validatedData.purpose || input.purpose,
      scopes: validatedData.scopes || input.scopes,
      status: validatedData.status || input.status,
      expiresAt: validatedData.expiresAt
    })

    revalidatePath('/dashboard')
    return { success: true, data: policy }
  } catch (error) {
    console.error('Failed to update policy (JSON):', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update policy'
    }
  }
}

/**
 * Issue a consent token
 */
export async function issueTokenJsonAction(
  input: {
    purpose: string
    categoryKeys: string[]
    scopes: string[]
    ttlHours: number
  }
): Promise<ActionResult<{ token: string; expires: Date }>> {
  try {
    const user = await requireSession()

    const { issueConsentToken } = await import('@/lib/jwt')

    // Calculate expiry
    const expiresAt = new Date(Date.now() + (input.ttlHours * 60 * 60 * 1000))

    // Issue token
    const tokenData = await issueConsentToken(
      user.id,
      input.purpose,
      input.categoryKeys,
      input.scopes,
      expiresAt
    )

    return {
      success: true,
      data: {
        token: tokenData.token,
        expires: tokenData.expiresAt
      }
    }
  } catch (error) {
    console.error('Failed to issue token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to issue token'
    }
  }
}

/**
 * Revoke a consent token
 */
export async function revokeTokenJsonAction(
  input: { tokenId: string }
): Promise<ActionResult<void>> {
  try {
    const user = await requireSession()

    const { revokeConsentToken } = await import('@/lib/jwt')

    await revokeConsentToken(input.tokenId, user.id)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Failed to revoke token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke token'
    }
  }
}

/**
 * Get active consent tokens for user
 */
export async function getActiveTokensJsonAction(): Promise<ActionResult<any[]>> {
  try {
    const user = await requireSession()
    const { prisma } = await import('@/lib/db')

    const tokens = await prisma.consentToken.findMany({
      where: {
        userId: user.id,
        revoked: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return { success: true, data: tokens }
  } catch (error) {
    console.error('Failed to get active tokens:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tokens'
    }
  }
}

/**
 * Get audit logs
 */
export async function getAuditLogsJsonAction(
  input?: { limit?: number }
): Promise<ActionResult<any[]>> {
  try {
    const user = await requireSession()
    const { prisma } = await import('@/lib/db')

    const logs = await prisma.accessLog.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: input?.limit || 50
    })

    return { success: true, data: logs }
  } catch (error) {
    console.error('Failed to get audit logs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get audit logs'
    }
  }
}

/**
 * Load demo health data with realistic values
 */
export async function loadDemoHealthData(): Promise<ActionResult<void>> {
  try {
    const user = await requireSession()
    const { prisma } = await import('@/lib/db')

    // Generate realistic health data
    const generateStepsData = () => {
      // Generate 30 days of step data (3000-15000 steps per day)
      return Array.from({ length: 30 }, () =>
        Math.floor(Math.random() * 12000) + 3000
      )
    }

    const generateHeartRateData = () => {
      // Generate 30 days of average heart rate (60-100 BPM)
      return Array.from({ length: 30 }, () =>
        Math.floor(Math.random() * 40) + 60
      )
    }

    // Ensure health category exists
    let healthCategory = await prisma.dataCategory.findUnique({
      where: { key: 'health' }
    })

    if (!healthCategory) {
      healthCategory = await prisma.dataCategory.create({
        data: {
          key: 'health',
          name: 'Health Data'
        }
      })
    }

    // Create sample health data record
    const healthData = {
      steps: generateStepsData(),
      heartrate: generateHeartRateData()
    }

    // Store as SampleData entry
    await prisma.sampleData.upsert({
      where: {
        id: `${user.id}-health` // Use a composite ID since there's no composite unique constraint
      },
      update: {
        payload: healthData
      },
      create: {
        userId: user.id,
        categoryKey: 'health',
        payload: healthData
      }
    })

    // Create a consent policy for telemedicine if it doesn't exist
    const existingPolicy = await prisma.consentPolicy.findFirst({
      where: {
        userId: user.id,
        categoryId: healthCategory.id,
        purpose: 'telemedicine'
      }
    })

    if (!existingPolicy) {
      await upsertUserPolicy(user.id, {
        categoryId: healthCategory.id,
        purpose: 'telemedicine',
        scopes: ['read', 'analyze', 'aggregate'],
        status: 'GRANTED',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      })
    }

    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Failed to load demo health data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load demo health data'
    }
  }
}

/**
 * Load demo data for demonstration
 */
export async function loadDemoDataJsonAction(): Promise<ActionResult<void>> {
  try {
    const user = await requireSession()
    const { prisma } = await import('@/lib/db')

    // Check if demo data already exists
    const existingPolicies = await listUserPolicies(user.id)
    if (existingPolicies.length > 0) {
      return {
        success: false,
        error: 'Demo data already exists. Clear existing policies first.'
      }
    }

    // Get or create demo categories
    const categories = [
      { key: 'personal', name: 'Personal Information' },
      { key: 'financial', name: 'Financial Data' },
      { key: 'behavioral', name: 'Behavioral Data' }
    ]

    const createdCategories = []
    for (const cat of categories) {
      let category = await prisma.dataCategory.findUnique({
        where: { key: cat.key }
      })

      if (!category) {
        category = await prisma.dataCategory.create({
          data: cat
        })
      }
      createdCategories.push(category)
    }

    // Create demo policies
    const demoPolicies = [
      {
        categoryId: createdCategories[0].id,
        purpose: 'User account management and personalization',
        scopes: ['read', 'write'],
        status: 'GRANTED' as const,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      },
      {
        categoryId: createdCategories[1].id,
        purpose: 'Payment processing and fraud prevention',
        scopes: ['read', 'analyze'],
        status: 'GRANTED' as const,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      },
      {
        categoryId: createdCategories[2].id,
        purpose: 'Analytics and service improvement',
        scopes: ['read', 'analyze'],
        status: 'RESTRICTED' as const,
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 180 days
      }
    ]

    for (const policyData of demoPolicies) {
      await upsertUserPolicy(user.id, policyData)
    }

    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('Failed to load demo data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load demo data'
    }
  }
}

/**
 * Query differential privacy mean for steps data (direct database access)
 */
export async function queryDPStepsMean(): Promise<ActionResult<{ dpMean: number; token: string }>> {
  try {
    const user = await requireSession()
    const { prisma } = await import('@/lib/db')

    // First issue a consent token for telemedicine
    const tokenResult = await issueTokenJsonAction({
      purpose: 'telemedicine',
      categoryKeys: ['health'],
      scopes: ['read', 'analyze', 'aggregate'],
      ttlHours: 24
    })

    if (!tokenResult.success) {
      return { success: false, error: `Failed to issue consent token: ${tokenResult.error}` }
    }

    // Directly query the sample data
    const healthData = await prisma.sampleData.findFirst({
      where: {
        userId: user.id,
        categoryKey: 'health'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!healthData || !healthData.payload) {
      return {
        success: false,
        error: 'No health data found. Please load demo data first.'
      }
    }

    // Extract steps data from payload
    const payload = healthData.payload as any
    const stepsArray = payload.steps

    if (!Array.isArray(stepsArray) || stepsArray.length === 0) {
      return {
        success: false,
        error: 'No steps data found in health records.'
      }
    }

    // Apply differential privacy to compute mean
    const { dpMean } = await import('@/lib/privacy/differentialPrivacy')
    const epsilon = 1.0
    const bounds = { min: 0, max: 20000 } // Reasonable bounds for daily steps

    const privateMean = dpMean(stepsArray, epsilon, bounds.min, bounds.max)

    // Log the access for audit purposes
    try {
      await prisma.accessLog.create({
        data: {
          userId: user.id,
          endpoint: '/dashboard/dp-query',
          action: 'query',
          categoryKeys: ['health'],
          purpose: 'telemedicine',
          ip: 'internal',
          userAgent: 'dashboard'
        }
      })
    } catch (logError) {
      console.warn('Failed to log access:', logError)
    }

    return {
      success: true,
      data: {
        dpMean: privateMean,
        token: tokenResult.data.token
      }
    }
  } catch (error) {
    console.error('Failed to query DP steps mean:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query DP steps mean'
    }
  }
}