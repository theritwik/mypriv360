import { prisma } from './db'
import { ConsentPolicyCreateInput, ConsentPolicyUpdateInput } from './validations'
import type { ConsentPolicy, DataCategory } from '@prisma/client'

// Type for policy with category information
export type PolicyWithCategory = ConsentPolicy & {
  category: DataCategory
}

// Type for policy with parsed scopes for client consumption  
export type PolicyWithCategoryParsed = Omit<PolicyWithCategory, 'scopes' | 'status'> & {
  scopes: string[]
  status: 'GRANTED' | 'RESTRICTED' | 'REVOKED'
}

/**
 * Transform policy to parse JSON scopes for client consumption
 */
export function transformPolicyForClient(policy: PolicyWithCategory): PolicyWithCategoryParsed {
  return {
    ...policy,
    scopes: JSON.parse(policy.scopes),
    status: policy.status as 'GRANTED' | 'RESTRICTED' | 'REVOKED' // Cast status to proper type
  }
}

/**
 * List all consent policies for a user with category information
 */
export async function listUserPolicies(userId: string): Promise<PolicyWithCategoryParsed[]> {
  const policies = await prisma.consentPolicy.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })
  
  return policies.map(transformPolicyForClient)
}

/**
 * Create or update a consent policy for a user
 */
export async function upsertUserPolicy(
  userId: string,
  data: ConsentPolicyCreateInput & { id?: string }
): Promise<PolicyWithCategoryParsed> {
  const { id, categoryId, purpose, scopes, status, expiresAt } = data

  // Parse expiresAt if provided
  const expirationDate = expiresAt ? new Date(expiresAt) : null

  if (id) {
    // Update existing policy
    const updatedPolicy = await prisma.consentPolicy.update({
      where: {
        id,
        userId, // Ensure user can only update their own policies
      },
      data: {
        purpose,
        scopes: JSON.stringify(scopes), // Store array as JSON string
        status,
        expiresAt: expirationDate,
      },
      include: { category: true },
    })
    return transformPolicyForClient(updatedPolicy as PolicyWithCategory)
  } else {
    // Check if policy already exists for this user/category/purpose combination
    const existingPolicy = await prisma.consentPolicy.findFirst({
      where: {
        userId,
        categoryId,
        purpose,
      },
      include: { category: true },
    })

    if (existingPolicy) {
      // Update existing policy
      const updatedPolicy = await prisma.consentPolicy.update({
        where: { id: existingPolicy.id },
        data: {
          scopes: JSON.stringify(scopes), // Store array as JSON string
          status,
          expiresAt: expirationDate,
        },
        include: { category: true },
      })
      return transformPolicyForClient(updatedPolicy as PolicyWithCategory)
    } else {
      // Create new policy
      const newPolicy = await prisma.consentPolicy.create({
        data: {
          userId,
          categoryId,
          purpose,
          scopes: JSON.stringify(scopes), // Store array as JSON string
          status,
          expiresAt: expirationDate,
        },
        include: { category: true },
      })
      return transformPolicyForClient(newPolicy as PolicyWithCategory)
    }
  }
}

/**
 * Delete a consent policy for a user
 */
export async function deleteUserPolicy(userId: string, policyId: string): Promise<void> {
  await prisma.consentPolicy.delete({
    where: {
      id: policyId,
      userId, // Ensure user can only delete their own policies
    },
  })
}

/**
 * Get a single consent policy by ID for a user
 */
export async function getUserPolicy(
  userId: string,
  policyId: string
): Promise<PolicyWithCategoryParsed | null> {
  const policy = await prisma.consentPolicy.findFirst({
    where: {
      id: policyId,
      userId,
    },
    include: { category: true },
  })
  
  return policy ? transformPolicyForClient(policy) : null
}

/**
 * Get all available data categories
 */
export async function getDataCategories() {
  return await prisma.dataCategory.findMany({
    orderBy: { name: 'asc' },
  })
}