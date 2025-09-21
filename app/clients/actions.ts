'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/guards'
import { db } from '@/lib/db'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

export type ApiClientData = {
  id: string
  name: string
  apiKey?: string  // Make optional since we don't always return it
  description?: string
  status?: string
  lastUsedAt?: Date | null
  createdAt: Date
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable()
})

const updateClientSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
  status: z.enum(['ACTIVE', 'REVOKED'])
})

/**
 * Get all API clients for the current user
 */
export async function getApiClientsAction(): Promise<ActionResult<ApiClientData[]>> {
  try {
    const user = await requireSession()

    const clients = await db.apiClient.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return { success: true, data: clients }
  } catch (error) {
    console.error('Failed to get API clients:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get API clients'
    }
  }
}

/**
 * Create a new API client with generated API key
 */
export async function createApiClientAction(
  input: { name: string; description?: string | null }
): Promise<ActionResult<{ client: ApiClientData; apiKey: string }>> {
  try {
    const user = await requireSession()

    // Validate input
    const validatedData = createClientSchema.parse(input)

    // Generate secure API key (UUID v4)
    const apiKey = uuidv4()

    // For demo purposes, we'll store the key in plain text
    // In production, you should hash it with bcrypt
    const hashedKey = process.env.NODE_ENV === 'production'
      ? await bcrypt.hash(apiKey, 12)
      : apiKey

    // Create the client
    const client = await db.apiClient.create({
      data: {
        name: validatedData.name,
        apiKey: hashedKey
      },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    })

    // Revalidate the clients page
    revalidatePath('/clients')

    return {
      success: true,
      data: {
        client,
        apiKey: apiKey // Return plain key only once for user to copy
      }
    }
  } catch (error) {
    console.error('Failed to create API client:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create API client'
    }
  }
}

/**
 * Update an existing API client
 */
export async function updateApiClientAction(
  input: { id: string; name: string; description?: string | null; status: 'ACTIVE' | 'REVOKED' }
): Promise<ActionResult<ApiClientData>> {
  try {
    const user = await requireSession()

    // Validate input
    const validatedData = updateClientSchema.parse(input)

    // Update the client
    const client = await db.apiClient.updateMany({
      where: {
        id: validatedData.id
      },
      data: {
        name: validatedData.name
      }
    })

    if (client.count === 0) {
      return {
        success: false,
        error: 'API client not found'
      }
    }

    // Fetch updated client
    const updatedClient = await db.apiClient.findUnique({
      where: { id: validatedData.id },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    })

    // Revalidate the clients page
    revalidatePath('/clients')

    return {
      success: true,
      data: updatedClient!
    }
  } catch (error) {
    console.error('Failed to update API client:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update API client'
    }
  }
}

/**
 * Delete an API client
 */
export async function deleteApiClientAction(
  input: { id: string }
): Promise<ActionResult<void>> {
  try {
    const user = await requireSession()

    // Delete the client
    const result = await db.apiClient.deleteMany({
      where: {
        id: input.id
      }
    })

    if (result.count === 0) {
      return {
        success: false,
        error: 'API client not found'
      }
    }

    // Revalidate the clients page
    revalidatePath('/clients')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Failed to delete API client:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete API client'
    }
  }
}

/**
 * Regenerate API key for a client
 */
export async function regenerateApiKeyAction(
  input: { id: string }
): Promise<ActionResult<{ apiKey: string }>> {
  try {
    const user = await requireSession()

    // Generate new secure API key
    const apiKey = uuidv4()

    // For demo purposes, we'll store the key in plain text
    // In production, you should hash it with bcrypt
    const hashedKey = process.env.NODE_ENV === 'production'
      ? await bcrypt.hash(apiKey, 12)
      : apiKey

    // Update the client with new key
    const result = await db.apiClient.updateMany({
      where: {
        id: input.id
      },
      data: {
        apiKey: hashedKey
      }
    })

    if (result.count === 0) {
      return {
        success: false,
        error: 'API client not found'
      }
    }

    // Revalidate the clients page
    revalidatePath('/clients')

    return {
      success: true,
      data: { apiKey }
    }
  } catch (error) {
    console.error('Failed to regenerate API key:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate API key'
    }
  }
}