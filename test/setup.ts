/**
 * Vitest Test Setup
 * 
 * Global test configuration and mocks for the MyPriv360 application.
 */

import { vi } from 'vitest'

// Set actual environment variables for JWT testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-vitest-testing-only-not-for-production'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb'

// Mock environment variables (keeping this for backward compatibility)
vi.mock('process', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-key-for-vitest-testing-only-not-for-production',
    NEXTAUTH_SECRET: 'test-nextauth-secret',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
    NODE_ENV: 'test'
  }
}))

// Mock Prisma client for tests
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    consentToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn()
    },
    apiClient: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn()
    },
    dataCategory: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    sampleData: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    accessLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}))

// Mock NextAuth
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn()
}))

// Mock Next.js
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({ 
      data, 
      status: options?.status || 200,
      headers: new Map()
    }))
  }
}))

// Mock crypto for Node.js compatibility (but let jose library use real crypto)
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      }
    }
  })
}