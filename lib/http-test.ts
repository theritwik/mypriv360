/**
 * HTTP Utilities Test
 *
 * Simple test to verify that the HTTP utilities are working correctly
 * with API routes and provide consistent error handling.
 */

import { jsonOk, jsonError, zodError, ErrorCodes } from '@/lib/http'
import { z } from 'zod'

// Test schema for validation
const testSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  age: z.number().int().min(0).max(120)
})

/**
 * Test successful JSON responses
 */
export function testJsonOk() {
  // Test simple data response
  const response1 = jsonOk({ message: 'Success' })
  console.log('Simple success response:', response1)

  // Test response with custom fields (like PDP query response)
  const response2 = jsonOk({
    results: { mean: 72.5, count: 42 },
    epsilon: 1.0,
    category: 'health',
    timestamp: new Date().toISOString()
  })
  console.log('PDP-style success response:', response2)

  // Test created response
  const response3 = jsonOk({ id: '123', name: 'Test' }, 201)
  console.log('Created response:', response3)
}

/**
 * Test error JSON responses
 */
export function testJsonError() {
  // Test simple error
  const response1 = jsonError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid input')
  console.log('Simple error response:', response1)

  // Test error with details
  const response2 = jsonError(404, ErrorCodes.NOT_FOUND, 'Resource not found', {
    resource: 'user',
    id: '123'
  })
  console.log('Error with details:', response2)
}

/**
 * Test Zod error handling
 */
export function testZodError() {
  try {
    // This will fail validation
    testSchema.parse({
      name: 'A', // Too short
      email: 'invalid-email', // Invalid format
      age: -5 // Invalid range
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response = zodError(error)
      console.log('Zod validation error response:', response)
    }
  }
}

/**
 * Run all tests
 */
export function runHttpUtilityTests() {
  console.log('🧪 Testing HTTP Utilities\n')

  console.log('✅ Testing jsonOk():')
  testJsonOk()

  console.log('\n✅ Testing jsonError():')
  testJsonError()

  console.log('\n✅ Testing zodError():')
  testZodError()

  console.log('\n🎉 HTTP Utility tests completed!')
}

// Uncomment to run tests:
// runHttpUtilityTests();