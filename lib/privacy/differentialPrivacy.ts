/**
 * Differential Privacy Utilities
 *
 * This module provides basic differential privacy mechanisms for protecting user data
 * while allowing statistical analysis. These are simplified implementations for
 * demonstration purposes and should be reviewed by privacy experts before production use.
 */

/**
 * Generate noise from the Laplace distribution
 * @private
 */
function sampleLaplace(scale: number): number {
  // Generate uniform random number between -0.5 and 0.5
  const u = Math.random() - 0.5

  // Apply inverse Laplace CDF: scale * sign(u) * ln(1 - 2|u|)
  return scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u))
}

/**
 * Applies the Laplace mechanism to add differential privacy noise to a numeric value
 *
 * **When to use**: When you need to release a single numeric statistic (count, sum, etc.)
 * while providing formal differential privacy guarantees.
 *
 * **How it works**: Adds calibrated Laplace noise proportional to the sensitivity
 * divided by epsilon (privacy parameter). Lower epsilon = more privacy = more noise.
 *
 * **Demo example**:
 * ```typescript
 * // Original count of users with condition
 * const actualCount = 127;
 *
 * // Add noise for epsilon = 0.1 (high privacy)
 * const noisyCount = laplaceMechanism(actualCount, 0.1);
 * console.log(noisyCount); // e.g., 134.7
 *
 * // Less noise for epsilon = 1.0 (moderate privacy)
 * const moderateNoisyCount = laplaceMechanism(actualCount, 1.0);
 * console.log(moderateNoisyCount); // e.g., 128.2
 * ```
 *
 * @param value - The true numeric value to be protected
 * @param epsilon - Privacy parameter (0 < ε ≤ 1). Lower values = more privacy = more noise
 * @param sensitivity - Global sensitivity of the query (default: 1 for counting queries)
 * @returns The value with Laplace noise added for differential privacy
 */
export function laplaceMechanism(
  value: number,
  epsilon: number,
  sensitivity: number = 1
): number {
  if (epsilon <= 0) {
    throw new Error('Epsilon must be positive')
  }

  if (sensitivity <= 0) {
    throw new Error('Sensitivity must be positive')
  }

  const scale = sensitivity / epsilon
  const noise = sampleLaplace(scale)

  return value + noise
}

/**
 * Computes a differentially private mean of numeric values
 *
 * **When to use**: When you need to compute and release the average of a dataset
 * while protecting individual contributions to that average.
 *
 * **How it works**: Adds Laplace noise calibrated to the sensitivity of the mean
 * operation. For bounded data in range [a,b], sensitivity is (b-a)/n where n is
 * the number of values.
 *
 * **Demo example**:
 * ```typescript
 * // Ages of users: [25, 30, 28, 35, 22, 40, 33, 29]
 * const ages = [25, 30, 28, 35, 22, 40, 33, 29];
 *
 * // True mean: 30.25
 * const trueMean = ages.reduce((a, b) => a + b) / ages.length;
 *
 * // DP mean with epsilon = 0.5
 * const privateMean = dpMean(ages, 0.5, 18, 65); // age range 18-65
 * console.log(`True: ${trueMean}, Private: ${privateMean}`);
 * // Output: True: 30.25, Private: 31.8 (example)
 * ```
 *
 * @param values - Array of numeric values to compute mean for
 * @param epsilon - Privacy parameter (0 < ε ≤ 1)
 * @param minValue - Minimum possible value in the dataset (for sensitivity calculation)
 * @param maxValue - Maximum possible value in the dataset (for sensitivity calculation)
 * @returns Differentially private mean
 */
export function dpMean(
  values: number[],
  epsilon: number,
  minValue: number,
  maxValue: number
): number {
  if (values.length === 0) {
    throw new Error('Cannot compute mean of empty array')
  }

  if (epsilon <= 0) {
    throw new Error('Epsilon must be positive')
  }

  if (minValue >= maxValue) {
    throw new Error('minValue must be less than maxValue')
  }

  // Calculate true mean
  const trueMean = values.reduce((sum, val) => sum + val, 0) / values.length

  // Sensitivity for mean query with bounded data
  // For mean of n values in range [a,b], sensitivity is (b-a)/n
  const sensitivity = (maxValue - minValue) / values.length

  // Apply Laplace mechanism
  return laplaceMechanism(trueMean, epsilon, sensitivity)
}

/**
 * Anonymizes records by removing specified fields (k-anonymity approach)
 *
 * **When to use**: When you need to share datasets but want to remove direct
 * identifiers or quasi-identifiers that could lead to re-identification.
 *
 * **How it works**: Creates new objects with specified fields removed. This is
 * a basic anonymization technique - more sophisticated methods like generalization
 * and suppression may be needed for stronger privacy guarantees.
 *
 * **Demo example**:
 * ```typescript
 * // Original user records
 * const users = [
 *   { id: 1, name: 'Alice', email: 'alice@example.com', age: 28, city: 'NYC' },
 *   { id: 2, name: 'Bob', email: 'bob@example.com', age: 34, city: 'SF' },
 *   { id: 3, name: 'Carol', email: 'carol@example.com', age: 29, city: 'LA' }
 * ];
 *
 * // Remove direct identifiers for sharing
 * const anonymized = anonymizeRecords(users, ['id', 'name', 'email']);
 * console.log(anonymized);
 * // Output: [
 * //   { age: 28, city: 'NYC' },
 * //   { age: 34, city: 'SF' },
 * //   { age: 29, city: 'LA' }
 * // ]
 *
 * // For stronger anonymization, also remove quasi-identifiers
 * const strongerAnonymized = anonymizeRecords(users, ['id', 'name', 'email', 'city']);
 * console.log(strongerAnonymized);
 * // Output: [{ age: 28 }, { age: 34 }, { age: 29 }]
 * ```
 *
 * @param rows - Array of objects to anonymize
 * @param dropFields - Array of field names to remove from each object
 * @returns Array of anonymized objects with specified fields removed
 */
export function anonymizeRecords<T extends Record<string, any>>(
  rows: T[],
  dropFields: string[]
): Partial<T>[] {
  if (!Array.isArray(rows)) {
    throw new Error('rows must be an array')
  }

  if (!Array.isArray(dropFields)) {
    throw new Error('dropFields must be an array')
  }

  return rows.map(row => {
    if (!row || typeof row !== 'object') {
      throw new Error('Each row must be an object')
    }

    // Create a shallow copy and remove specified fields
    const anonymized = { ...row }

    dropFields.forEach(field => {
      delete anonymized[field]
    })

    return anonymized
  })
}

/**
 * Utility function to validate epsilon values for differential privacy
 *
 * @param epsilon - Privacy parameter to validate
 * @param context - Context description for error messages
 * @returns true if valid, throws error if invalid
 */
export function validateEpsilon(epsilon: number, context: string = 'operation'): boolean {
  if (typeof epsilon !== 'number' || isNaN(epsilon)) {
    throw new Error(`Epsilon must be a number for ${context}`)
  }

  if (epsilon <= 0) {
    throw new Error(`Epsilon must be positive for ${context}`)
  }

  if (epsilon > 10) {
    console.warn(`Warning: Large epsilon value (${epsilon}) provides weak privacy for ${context}`)
  }

  if (epsilon < 0.01) {
    console.warn(`Warning: Very small epsilon value (${epsilon}) will add significant noise for ${context}`)
  }

  return true
}