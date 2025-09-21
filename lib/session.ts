'use server'

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here-please-change-in-production'
const secret = new TextEncoder().encode(JWT_SECRET)

export interface SessionData {
  userId: string
  email: string
  iat: number
  exp: number
}

/**
 * Create a session for a user
 */
export async function createSession(userId: string, email: string) {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  const cookieStore = cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })

  return token
}

/**
 * Get the current session
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('session')?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, secret)
    
    // Validate payload structure
    if (typeof payload.userId === 'string' && typeof payload.email === 'string') {
      return {
        userId: payload.userId,
        email: payload.email,
        iat: payload.iat || 0,
        exp: payload.exp || 0
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Destroy the session
 */
export async function destroySession() {
  const cookieStore = cookies()
  cookieStore.delete('session')
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null && session.exp > Date.now() / 1000
}