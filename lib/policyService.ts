import { prisma } from './db'
import { ConsentPolicyCreateInput, ConsentPolicyUpdateInput } from './validations'
import type { ConsentPolicy, DataCategory } from '@prisma/client'

// Type for policy with category information
export type PolicyWithCategory = ConsentPolicy & {
  category: DataCategory
}

/**
 * List all consent policies for a user with category information
 */
export async function listUserPolicies(userId: string): Promise<PolicyWithCategory[]> {
  return await prisma.consentPolicy.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Create or update a consent policy for a user
 */
export async function upsertUserPolicy(
  userId: string,
  data: ConsentPolicyCreateInput & { id?: string }
): Promise<PolicyWithCategory> {
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
        scopes,
        status,
        expiresAt: expirationDate,
      },
      include: { category: true },
    })
    return updatedPolicy
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
          scopes,
          status,
          expiresAt: expirationDate,
        },
        include: { category: true },
      })
      return updatedPolicy
    } else {
      // Create new policy
      const newPolicy = await prisma.consentPolicy.create({
        data: {
          userId,
          categoryId,
          purpose,
          scopes,
          status,
          expiresAt: expirationDate,
        },
        include: { category: true },
      })
      return newPolicy
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
): Promise<PolicyWithCategory | null> {
  return await prisma.consentPolicy.findFirst({
    where: {
      id: policyId,
      userId,
    },
    include: { category: true },
  })
}

/**
 * Get all available data categories
 */
export async function getDataCategories() {
  return await prisma.dataCategory.findMany({
    orderBy: { name: 'asc' },
  })
}