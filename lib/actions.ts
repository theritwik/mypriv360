'use server'

import { signInSchema, signUpSchema } from './validations'
import { prisma } from './db'
import { hashPassword, verifyPassword } from './passwords'
import { createSession } from './session'

export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    // Validate input
    const validatedData = signInSchema.parse({ email, password })

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (!user) {
      return { error: 'Invalid email or password' }
    }

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash)
    
    if (!isValidPassword) {
      return { error: 'Invalid email or password' }
    }

    // Create session
    await createSession(user.id, user.email)

    // Return success - let client handle redirect
    return { success: true, userId: user.id, email: user.email }
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return { error: 'Please check your email and password format' }
    }

    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    // Validate input
    const validatedData = signUpSchema.parse({ email, password })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return { error: 'User with this email already exists' }
    }

    // Create new user
    const hashedPassword = await hashPassword(validatedData.password)
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash: hashedPassword,
      },
    })

    // Create session
    await createSession(newUser.id, newUser.email)

    // Return success - let client handle redirect
    return { success: true, userId: newUser.id }
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return { error: 'Please check your input format' }
    }

    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'An unexpected error occurred. Please try again.' }
  }
}