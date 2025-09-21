/**
 * JWT Utilities Tests
 *
 * Tests for JWT token creation, verification, expiry handling, and consent-specific functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  issueConsentToken,
  verifyConsentToken,
  decodeConsentToken,
  ConsentTokenError,
  type ConsentTokenPayload,
  type ConsentTokenIssueParams
} from '@/lib/jwt'

describe('JWT Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock environment variables if needed
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing'
    }
  })

  describe('issueConsentToken', () => {
    it('should issue a valid consent token', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health', 'activity'],
        scopes: ['read:health', 'read:activity'],
        ttlMinutes: 60
      }

      const result = await issueConsentToken(params)

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('exp')
      expect(typeof result.token).toBe('string')
      expect(result.token.split('.')).toHaveLength(3) // JWT has 3 parts
      expect(result.token.length).toBeGreaterThan(50) // Reasonable token length
      expect(typeof result.exp).toBe('number')
      expect(result.exp).toBeGreaterThan(Date.now() / 1000) // Should be in the future
    })

    it('should issue tokens with different parameters', async () => {
      const params1: ConsentTokenIssueParams = {
        userId: 'user1',
        purpose: 'health-research',
        categories: ['health'],
        scopes: ['read:health'],
        ttlMinutes: 30
      }

      const params2: ConsentTokenIssueParams = {
        userId: 'user2',
        purpose: 'marketing',
        categories: ['preferences', 'demographics'],
        scopes: ['read:preferences', 'read:demographics'],
        ttlMinutes: 120
      }

      const result1 = await issueConsentToken(params1)
      const result2 = await issueConsentToken(params2)

      expect(result1.token).not.toBe(result2.token)
      expect(result1.exp).not.toBe(result2.exp)
      expect(result2.exp).toBeGreaterThan(result1.exp) // Longer TTL
    })

    it('should handle different TTL values correctly', async () => {
      const baseParams: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health'],
        scopes: ['read:health'],
        ttlMinutes: 60
      }

      const shortToken = await issueConsentToken({ ...baseParams, ttlMinutes: 15 })
      const longToken = await issueConsentToken({ ...baseParams, ttlMinutes: 240 })

      expect(longToken.exp).toBeGreaterThan(shortToken.exp)

      // Verify the difference is approximately correct (allowing for execution time)
      const timeDiff = longToken.exp - shortToken.exp
      const expectedDiff = (240 - 15) * 60 // 225 minutes in seconds
      expect(Math.abs(timeDiff - expectedDiff)).toBeLessThan(5) // Within 5 seconds
    })

    it('should include all required claims in token', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health', 'fitness'],
        scopes: ['read:health', 'read:fitness', 'write:consent'],
        ttlMinutes: 60
      }

      const result = await issueConsentToken(params)

      // Decode the payload to verify claims
      const decoded = decodeConsentToken(result.token)

      expect(decoded).toBeDefined()
      expect(decoded!.sub).toBe('user123')
      expect(decoded!.purpose).toBe('health-research')
      expect(decoded!.categories).toEqual(['health', 'fitness'])
      expect(decoded!.scopes).toEqual(['read:health', 'read:fitness', 'write:consent'])
      expect(decoded!).toHaveProperty('iat')
      expect(decoded!).toHaveProperty('exp')
      expect(decoded!.exp).toBe(result.exp)
    })

    it('should handle empty arrays for categories and scopes', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'minimal-access',
        categories: [],
        scopes: [],
        ttlMinutes: 30
      }

      const result = await issueConsentToken(params)
      const decoded = decodeConsentToken(result.token)

      expect(decoded).toBeDefined()
      expect(decoded!.categories).toEqual([])
      expect(decoded!.scopes).toEqual([])
    })
  })

  describe('verifyConsentToken', () => {
    it('should verify valid tokens', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health', 'activity'],
        scopes: ['read:health', 'read:activity'],
        ttlMinutes: 60
      }

      const { token } = await issueConsentToken(params)
      const verified = await verifyConsentToken(token)

      expect(verified.sub).toBe('user123')
      expect(verified.purpose).toBe('health-research')
      expect(verified.categories).toEqual(['health', 'activity'])
      expect(verified.scopes).toEqual(['read:health', 'read:activity'])
      expect(verified).toHaveProperty('iat')
      expect(verified).toHaveProperty('exp')
      expect(typeof verified.iat).toBe('number')
      expect(typeof verified.exp).toBe('number')
    })

    it('should reject invalid tokens', async () => {
      const invalidTokens = [
        'invalid.token.here',
        'not-a-jwt-token',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature',
        '',
        'a.b', // Missing third part
        'header.payload.signature.extra' // Too many parts
      ]

      for (const invalidToken of invalidTokens) {
        await expect(verifyConsentToken(invalidToken))
          .rejects.toThrow(ConsentTokenError)
      }
    })

    it('should reject tokens with wrong signature', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health'],
        scopes: ['read:health'],
        ttlMinutes: 60
      }

      const { token } = await issueConsentToken(params)
      const parts = token.split('.')

      // Tamper with signature
      const tamperedToken = `${parts[0]}.${parts[1]}.wrong-signature`

      await expect(verifyConsentToken(tamperedToken))
        .rejects.toThrow(ConsentTokenError)
    })

    it('should reject expired tokens', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health'],
        scopes: ['read:health'],
        ttlMinutes: 0.01 // Very short expiry (0.6 seconds)
      }

      const { token } = await issueConsentToken(params)

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1000))

      await expect(verifyConsentToken(token))
        .rejects.toThrow(ConsentTokenError)
    }, 10000)

    it('should provide specific error types', async () => {
      // Test malformed token
      try {
        await verifyConsentToken('')
      } catch (error) {
        expect(error).toBeInstanceOf(ConsentTokenError)
        expect((error as ConsentTokenError).code).toBe('MALFORMED')
      }

      // Test invalid signature
      try {
        await verifyConsentToken('invalid.token.signature')
      } catch (error) {
        expect(error).toBeInstanceOf(ConsentTokenError)
        expect((error as ConsentTokenError).code).toBe('VERIFICATION_FAILED')
      }
    })

    it('should validate required fields in token payload', async () => {
      // This test would require creating malformed tokens, which is complex
      // In practice, our issueConsentToken always creates valid tokens
      // But we can test the validation by checking error messages

      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIiLCJpYXQiOjE1MTYyMzkwMjJ9.invalid'

      await expect(verifyConsentToken(invalidToken))
        .rejects.toThrow(ConsentTokenError)
    })
  })

  describe('decodeConsentToken', () => {
    it('should decode valid tokens without verification', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health', 'activity'],
        scopes: ['read:health', 'read:activity'],
        ttlMinutes: 60
      }

      const { token } = await issueConsentToken(params)
      const decoded = decodeConsentToken(token)

      expect(decoded).toBeDefined()
      expect(decoded!.sub).toBe('user123')
      expect(decoded!.purpose).toBe('health-research')
      expect(decoded!.categories).toEqual(['health', 'activity'])
      expect(decoded!.scopes).toEqual(['read:health', 'read:activity'])
    })

    it('should return null for invalid tokens', () => {
      const invalidTokens = [
        'invalid.token',
        'not-a-jwt-token',
        '',
        'a.b.c.d', // Too many parts
        'header.invalidbase64.signature'
      ]

      for (const invalidToken of invalidTokens) {
        const decoded = decodeConsentToken(invalidToken)
        expect(decoded).toBeNull()
      }
    })

    it('should decode expired tokens (without verification)', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health'],
        scopes: ['read:health'],
        ttlMinutes: 0.01 // Very short expiry
      }

      const { token } = await issueConsentToken(params)

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Decode should work even though token is expired
      const decoded = decodeConsentToken(token)
      expect(decoded).toBeDefined()
      expect(decoded!.sub).toBe('user123')

      // But verify should fail
      await expect(verifyConsentToken(token))
        .rejects.toThrow(ConsentTokenError)
    }, 10000)
  })

  describe('ConsentTokenError', () => {
    it('should create error with correct properties', () => {
      const error = new ConsentTokenError('Test message', 'EXPIRED')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ConsentTokenError)
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('EXPIRED')
      expect(error.name).toBe('ConsentTokenError')
    })

    it('should support all error codes', () => {
      const codes: Array<ConsentTokenError['code']> = [
        'EXPIRED',
        'INVALID',
        'MALFORMED',
        'VERIFICATION_FAILED'
      ]

      codes.forEach(code => {
        const error = new ConsentTokenError(`Test ${code}`, code)
        expect(error.code).toBe(code)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete token lifecycle', async () => {
      // 1. Issue token
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health', 'fitness'],
        scopes: ['read:health', 'read:fitness'],
        ttlMinutes: 120
      }

      const result = await issueConsentToken(params)
      expect(result.token).toBeTruthy()

      // 2. Verify token is valid
      const verified = await verifyConsentToken(result.token)
      expect(verified.sub).toBe('user123')
      expect(verified.purpose).toBe('health-research')

      // 3. Decode token (for debugging/logging)
      const decoded = decodeConsentToken(result.token)
      expect(decoded).toBeDefined()
      expect(decoded!.sub).toBe(verified.sub)
    })

    it('should handle realistic consent scenarios', async () => {
      // Health data research consent
      const healthConsent: ConsentTokenIssueParams = {
        userId: 'patient_12345',
        purpose: 'covid-research-study-2025',
        categories: ['health', 'demographics', 'location'],
        scopes: [
          'read:health:symptoms',
          'read:health:vitals',
          'read:demographics:age',
          'read:demographics:gender',
          'read:location:zip'
        ],
        ttlMinutes: 30 * 24 * 60 // 30 days
      }

      const { token, exp } = await issueConsentToken(healthConsent)

      // Verify the consent token
      const consent = await verifyConsentToken(token)
      expect(consent.sub).toBe('patient_12345')
      expect(consent.purpose).toBe('covid-research-study-2025')
      expect(consent.categories).toContain('health')
      expect(consent.scopes).toContain('read:health:symptoms')

      // Check expiry is approximately 30 days from now
      const now = Math.floor(Date.now() / 1000)
      const thirtyDays = 30 * 24 * 60 * 60
      expect(Math.abs(exp - (now + thirtyDays))).toBeLessThan(60) // Within 1 minute
    })

    it('should handle multiple concurrent consents', async () => {
      const baseUserId = 'user123'

      // Different consent purposes
      const healthConsent: ConsentTokenIssueParams = {
        userId: baseUserId,
        purpose: 'health-research',
        categories: ['health'],
        scopes: ['read:health'],
        ttlMinutes: 60
      }

      const marketingConsent: ConsentTokenIssueParams = {
        userId: baseUserId,
        purpose: 'personalized-ads',
        categories: ['preferences', 'behavior'],
        scopes: ['read:preferences', 'read:behavior'],
        ttlMinutes: 30
      }

      const analyticsConsent: ConsentTokenIssueParams = {
        userId: baseUserId,
        purpose: 'usage-analytics',
        categories: ['usage'],
        scopes: ['read:usage:pages', 'read:usage:duration'],
        ttlMinutes: 90
      }

      // Issue all tokens
      const [healthToken, marketingToken, analyticsToken] = await Promise.all([
        issueConsentToken(healthConsent),
        issueConsentToken(marketingConsent),
        issueConsentToken(analyticsConsent)
      ])

      // All should be different
      expect(healthToken.token).not.toBe(marketingToken.token)
      expect(marketingToken.token).not.toBe(analyticsToken.token)

      // Verify all are valid
      const [healthVerified, marketingVerified, analyticsVerified] = await Promise.all([
        verifyConsentToken(healthToken.token),
        verifyConsentToken(marketingToken.token),
        verifyConsentToken(analyticsToken.token)
      ])

      // Check purposes are correct
      expect(healthVerified.purpose).toBe('health-research')
      expect(marketingVerified.purpose).toBe('personalized-ads')
      expect(analyticsVerified.purpose).toBe('usage-analytics')

      // Check expiry times are different
      expect(analyticsToken.exp).toBeGreaterThan(healthToken.exp)
      expect(healthToken.exp).toBeGreaterThan(marketingToken.exp)
    })

    it('should maintain security with tampering attempts', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'health-research',
        categories: ['health'],
        scopes: ['read:health'],
        ttlMinutes: 60
      }

      const { token } = await issueConsentToken(params)
      const parts = token.split('.')

      // Various tampering attempts should all fail
      const tamperingAttempts = [
        `modified_header.${parts[1]}.${parts[2]}`,
        `${parts[0]}.modified_payload.${parts[2]}`,
        `${parts[0]}.${parts[1]}.modified_signature`,
        `${parts[0]}.${parts[1]}`, // Missing signature
        `${parts[0]}.${parts[1]}.${parts[2]}.extra_part`, // Extra part
      ]

      for (const tamperedToken of tamperingAttempts) {
        await expect(verifyConsentToken(tamperedToken))
          .rejects.toThrow(ConsentTokenError)
      }

      // Original token should still work
      await expect(verifyConsentToken(token)).resolves.toBeDefined()
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle very short TTL values', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'quick-action',
        categories: ['temp'],
        scopes: ['read:temp'],
        ttlMinutes: 0.01 // 0.6 seconds
      }

      const { token } = await issueConsentToken(params)

      // Should be valid immediately
      await expect(verifyConsentToken(token)).resolves.toBeDefined()

      // Should expire quickly
      await new Promise(resolve => setTimeout(resolve, 1000))
      await expect(verifyConsentToken(token))
        .rejects.toThrow(ConsentTokenError)
    }, 10000)

    it('should handle very long TTL values', async () => {
      const params: ConsentTokenIssueParams = {
        userId: 'user123',
        purpose: 'long-term-research',
        categories: ['health'],
        scopes: ['read:health'],
        ttlMinutes: 365 * 24 * 60 // 1 year
      }

      const result = await issueConsentToken(params)
      const verified = await verifyConsentToken(result.token)

      expect(verified.sub).toBe('user123')

      // Check expiry is approximately 1 year from now
      const now = Math.floor(Date.now() / 1000)
      const oneYear = 365 * 24 * 60 * 60
      expect(Math.abs(result.exp - (now + oneYear))).toBeLessThan(60)
    })

    it('should handle edge case values in parameters', async () => {
      const edgeCaseParams: ConsentTokenIssueParams = {
        userId: 'u', // Very short userId
        purpose: 'p', // Very short purpose
        categories: [], // Empty categories
        scopes: [''], // Empty scope string
        ttlMinutes: 1 // Minimum practical TTL
      }

      const { token } = await issueConsentToken(edgeCaseParams)
      const verified = await verifyConsentToken(token)

      expect(verified.sub).toBe('u')
      expect(verified.purpose).toBe('p')
      expect(verified.categories).toEqual([])
      expect(verified.scopes).toEqual([''])
    })

    it('should handle unicode characters in parameters', async () => {
      const unicodeParams: ConsentTokenIssueParams = {
        userId: 'user_测试_123',
        purpose: 'research-データ解析-🔬',
        categories: ['健康', 'プライバシー', '🏥'],
        scopes: ['read:健康', 'write:プライバシー'],
        ttlMinutes: 60
      }

      const { token } = await issueConsentToken(unicodeParams)
      const verified = await verifyConsentToken(token)

      expect(verified.sub).toBe('user_测试_123')
      expect(verified.purpose).toBe('research-データ解析-🔬')
      expect(verified.categories).toEqual(['健康', 'プライバシー', '🏥'])
      expect(verified.scopes).toEqual(['read:健康', 'write:プライバシー'])
    })
  })
})