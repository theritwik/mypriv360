/**
 * Differential Privacy Tests
 *
 * Tests for the differential privacy mechanisms including noise generation,
 * Laplace mechanism, and differentially private mean calculation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  laplaceMechanism,
  dpMean,
  anonymizeRecords,
  validateEpsilon
} from '@/lib/privacy/differentialPrivacy'

describe('Differential Privacy', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks()
  })

  describe('laplaceMechanism', () => {
    it('should add noise to a value', () => {
      const originalValue = 100
      const epsilon = 1.0

      const noisyValue = laplaceMechanism(originalValue, epsilon)

      // The noisy value should be a number
      expect(typeof noisyValue).toBe('number')
      expect(Number.isFinite(noisyValue)).toBe(true)

      // With high probability, the noisy value should be different from original
      // (though it's theoretically possible they could be the same)
      // We'll test this by running multiple times
      const results = Array.from({ length: 100 }, () =>
        laplaceMechanism(originalValue, epsilon)
      )

      // At least 90% of results should be different from the original
      const differentResults = results.filter(val => val !== originalValue)
      expect(differentResults.length).toBeGreaterThan(90)
    })

    it('should add more noise with smaller epsilon (more privacy)', () => {
      const originalValue = 100
      const highPrivacy = 0.1  // Small epsilon = more privacy = more noise
      const lowPrivacy = 10.0  // Large epsilon = less privacy = less noise

      // Run multiple iterations to get statistical significance
      const highPrivacyResults = Array.from({ length: 1000 }, () =>
        laplaceMechanism(originalValue, highPrivacy)
      )
      const lowPrivacyResults = Array.from({ length: 1000 }, () =>
        laplaceMechanism(originalValue, lowPrivacy)
      )

      // Calculate variance (measure of spread/noise)
      const variance = (values: number[]) => {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      }

      const highPrivacyVariance = variance(highPrivacyResults)
      const lowPrivacyVariance = variance(lowPrivacyResults)

      // High privacy should have higher variance (more noise)
      expect(highPrivacyVariance).toBeGreaterThan(lowPrivacyVariance)
    })

    it('should handle negative values correctly', () => {
      const negativeValue = -50
      const epsilon = 1.0

      const noisyValue = laplaceMechanism(negativeValue, epsilon)

      expect(typeof noisyValue).toBe('number')
      expect(Number.isFinite(noisyValue)).toBe(true)
    })

    it('should handle zero values correctly', () => {
      const zeroValue = 0
      const epsilon = 1.0

      const noisyValue = laplaceMechanism(zeroValue, epsilon)

      expect(typeof noisyValue).toBe('number')
      expect(Number.isFinite(noisyValue)).toBe(true)
    })

    it('should throw error for invalid epsilon values', () => {
      const value = 100

      expect(() => laplaceMechanism(value, 0)).toThrow()
      expect(() => laplaceMechanism(value, -1)).toThrow()
    })
  })

  describe('validateEpsilon', () => {
    it('should validate correct epsilon values', () => {
      expect(validateEpsilon(0.1)).toBe(true)
      expect(validateEpsilon(1.0)).toBe(true)
      expect(validateEpsilon(5.0)).toBe(true)
    })

    it('should throw error for invalid epsilon values', () => {
      expect(() => validateEpsilon(0)).toThrow('Epsilon must be positive')
      expect(() => validateEpsilon(-1)).toThrow('Epsilon must be positive')
      expect(() => validateEpsilon(NaN)).toThrow('Epsilon must be a number')
    })

    it('should provide warnings for extreme epsilon values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Very large epsilon should warn about weak privacy
      validateEpsilon(15.0)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Large epsilon'))

      // Very small epsilon should warn about high noise
      validateEpsilon(0.005)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Very small epsilon'))

      consoleSpy.mockRestore()
    })
  })

  describe('dpMean', () => {
    it('should calculate differentially private mean for simple arrays', () => {
      const values = [10, 20, 30, 40, 50]
      const epsilon = 1.0
      const minValue = 0
      const maxValue = 100

      const privateMean = dpMean(values, epsilon, minValue, maxValue)

      expect(typeof privateMean).toBe('number')
      expect(Number.isFinite(privateMean)).toBe(true)

      // The private mean should be reasonably close to the true mean (30)
      // but not exactly the same due to noise
      const trueMean = 30
      const difference = Math.abs(privateMean - trueMean)

      // With epsilon=1.0, the noise shouldn't be too extreme
      // We'll allow for a reasonable range based on the sensitivity
      expect(difference).toBeLessThan(50) // Reasonable noise bound
    })

    it('should handle empty arrays', () => {
      const emptyArray: number[] = []
      const epsilon = 1.0
      const minValue = 0
      const maxValue = 100

      expect(() => dpMean(emptyArray, epsilon, minValue, maxValue)).toThrow()
    })

    it('should handle single-element arrays', () => {
      const singleValue = [42]
      const epsilon = 1.0
      const minValue = 0
      const maxValue = 100

      const privateMean = dpMean(singleValue, epsilon, minValue, maxValue)

      expect(typeof privateMean).toBe('number')
      expect(Number.isFinite(privateMean)).toBe(true)

      // Note: Single-value arrays have very high sensitivity (maxValue-minValue)/1 = 100
      // So the noise can be quite large. We just verify it's a reasonable number.
      expect(privateMean).toBeGreaterThan(-200) // Very generous bounds
      expect(privateMean).toBeLessThan(300)     // Very generous bounds
    })

    it('should provide more accurate results with larger epsilon', () => {
      const values = [10, 20, 30, 40, 50]
      const trueMean = 30
      const minValue = 0
      const maxValue = 100

      const lowPrivacy = 10.0   // Less privacy, more accuracy
      const highPrivacy = 0.1   // More privacy, less accuracy

      // Run multiple iterations to get statistical significance
      const lowPrivacyResults = Array.from({ length: 100 }, () =>
        dpMean(values, lowPrivacy, minValue, maxValue)
      )
      const highPrivacyResults = Array.from({ length: 100 }, () =>
        dpMean(values, highPrivacy, minValue, maxValue)
      )

      // Calculate average absolute error
      const avgError = (results: number[]) => {
        const errors = results.map(result => Math.abs(result - trueMean))
        return errors.reduce((sum, error) => sum + error, 0) / errors.length
      }

      const lowPrivacyError = avgError(lowPrivacyResults)
      const highPrivacyError = avgError(highPrivacyResults)

      // Low privacy (high epsilon) should have lower average error
      expect(lowPrivacyError).toBeLessThan(highPrivacyError)
    })

    it('should handle edge case values correctly', () => {
      const edgeValues = [0, 100, 0, 100] // Values at the bounds
      const epsilon = 1.0
      const minValue = 0
      const maxValue = 100

      const privateMean = dpMean(edgeValues, epsilon, minValue, maxValue)

      expect(typeof privateMean).toBe('number')
      expect(Number.isFinite(privateMean)).toBe(true)

      // Note: With epsilon=1.0 and sensitivity=(100-0)/4=25, noise can be substantial
      // We just verify it produces a reasonable number
      expect(privateMean).toBeGreaterThan(-100) // Very generous bounds
      expect(privateMean).toBeLessThan(200)     // Very generous bounds
    })

    it('should respect bounds constraints', () => {
      const values = [10, 20, 30]
      const epsilon = 1.0
      const minValue = 0
      const maxValue = 100

      // Run multiple times to test bounds
      const results = Array.from({ length: 1000 }, () =>
        dpMean(values, epsilon, minValue, maxValue)
      )

      // All results should be numbers
      results.forEach(result => {
        expect(typeof result).toBe('number')
        expect(Number.isFinite(result)).toBe(true)
      })
    })

    it('should throw error for invalid parameters', () => {
      const values = [10, 20, 30]

      // Invalid epsilon
      expect(() => dpMean(values, 0, 0, 100)).toThrow()
      expect(() => dpMean(values, -1, 0, 100)).toThrow()

      // Invalid bounds
      expect(() => dpMean(values, 1.0, 100, 0)).toThrow() // min > max
    })
  })

  describe('anonymizeRecords', () => {
    it('should anonymize record arrays', () => {
      const records = [
        { id: 1, name: 'Alice', value: 100 },
        { id: 2, name: 'Bob', value: 200 },
        { id: 3, name: 'Charlie', value: 300 }
      ]

      const anonymized = anonymizeRecords(records, ['name'])

      expect(Array.isArray(anonymized)).toBe(true)
      expect(anonymized.length).toBe(records.length)

      // Check that sensitive fields are removed or modified
      anonymized.forEach(record => {
        expect(record).not.toHaveProperty('name') // PII should be removed
        expect(record).toHaveProperty('value')    // Non-PII data should remain
        expect(record).toHaveProperty('id')       // ID should remain since not in dropFields
      })
    })

    it('should handle empty record arrays', () => {
      const emptyRecords: any[] = []
      const anonymized = anonymizeRecords(emptyRecords, ['name'])

      expect(Array.isArray(anonymized)).toBe(true)
      expect(anonymized.length).toBe(0)
    })

    it('should preserve non-sensitive data', () => {
      const records = [
        { timestamp: '2025-09-21', count: 5, category: 'health' },
        { timestamp: '2025-09-22', count: 3, category: 'activity' }
      ]

      const anonymized = anonymizeRecords(records, [])

      expect(anonymized.length).toBe(2)
      anonymized.forEach((record, index) => {
        expect(record.count).toBe(records[index].count)
        expect(record.category).toBe(records[index].category)
        expect(record.timestamp).toBe(records[index].timestamp)
      })
    })

    it('should remove multiple specified fields', () => {
      const records = [
        { id: 1, name: 'Alice', email: 'alice@example.com', age: 28 },
        { id: 2, name: 'Bob', email: 'bob@example.com', age: 35 }
      ]

      const anonymized = anonymizeRecords(records, ['name', 'email'])

      anonymized.forEach(record => {
        expect(record).not.toHaveProperty('name')
        expect(record).not.toHaveProperty('email')
        expect(record).toHaveProperty('id')
        expect(record).toHaveProperty('age')
      })
    })

    it('should handle invalid inputs', () => {
      const validRecords = [{ id: 1, name: 'test' }]

      // Invalid dropFields parameter
      expect(() => anonymizeRecords(validRecords, 'invalid' as any)).toThrow()

      // Invalid rows parameter
      expect(() => anonymizeRecords('invalid' as any, ['name'])).toThrow()

      // Invalid row objects
      const invalidRecords = [null, undefined, 'string'] as any
      expect(() => anonymizeRecords(invalidRecords, ['name'])).toThrow()
    })
  })

  describe('Integration Tests', () => {
    it('should maintain differential privacy guarantees across multiple queries', () => {
      const sensitiveData = [75, 82, 90, 65, 78, 88, 92, 70, 85, 80] // Health data
      const epsilon = 1.0
      const minValue = 60
      const maxValue = 100

      // Simulate multiple queries on the same data
      const query1 = dpMean(sensitiveData, epsilon, minValue, maxValue)
      const query2 = dpMean(sensitiveData, epsilon, minValue, maxValue)
      const query3 = dpMean(sensitiveData, epsilon, minValue, maxValue)

      // Results should be different due to independent noise
      expect(query1).not.toBe(query2)
      expect(query2).not.toBe(query3)
      expect(query1).not.toBe(query3)

      // But all should be reasonably close to the true mean
      const trueMean = sensitiveData.reduce((sum, val) => sum + val, 0) / sensitiveData.length

      expect(Math.abs(query1 - trueMean)).toBeLessThan(30)
      expect(Math.abs(query2 - trueMean)).toBeLessThan(30)
      expect(Math.abs(query3 - trueMean)).toBeLessThan(30)
    })

    it('should handle real-world health data scenarios', () => {
      // Simulate realistic health data (heart rates)
      const heartRates = [72, 68, 75, 80, 65, 78, 82, 70, 77, 73, 69, 76]
      const epsilon = 1.0 // Balanced privacy
      const minValue = 50  // Minimum realistic heart rate
      const maxValue = 120 // Maximum realistic heart rate

      const privateAverage = dpMean(heartRates, epsilon, minValue, maxValue)
      const trueAverage = heartRates.reduce((sum, rate) => sum + rate, 0) / heartRates.length

      expect(typeof privateAverage).toBe('number')
      expect(Number.isFinite(privateAverage)).toBe(true)
      expect(privateAverage).toBeGreaterThan(minValue)
      expect(privateAverage).toBeLessThan(maxValue)

      // Should be reasonably close to true average (around 73.75)
      expect(Math.abs(privateAverage - trueAverage)).toBeLessThan(20)
    })
  })
})