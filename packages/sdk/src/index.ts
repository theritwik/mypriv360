/**
 * MyPriv360 SDK - Privacy-first data platform client
 * 
 * This SDK provides a TypeScript interface for interacting with the MyPriv360 
 * privacy-first data platform, enabling differential privacy queries and 
 * consent management.
 */

export interface MyPriv360Options {
  /** Base URL of the MyPriv360 API (e.g., 'https://api.mypriv360.com') */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
}

export interface QueryAnonymizedOptions {
  /** Data category to query (e.g., 'health', 'activity', 'demographics') */
  category: string;
  /** Purpose of the data query (e.g., 'research', 'analytics') */
  purpose: string;
  /** 
   * Privacy parameter epsilon (ε) for differential privacy.
   * Lower values = more privacy, higher values = more accuracy.
   * Default: 1.0
   */
  epsilon?: number;
  /** 
   * Statistical aggregations to perform on the data.
   * Supported: ['mean', 'sum', 'count', 'min', 'max', 'stddev']
   * Default: ['mean']
   */
  aggregations?: string[];
}

export interface QueryResult {
  /** Whether the query was successful */
  success: boolean;
  /** Query results data */
  data?: {
    /** Statistical results for each requested aggregation */
    results: Record<string, number>;
    /** Epsilon value used for privacy */
    epsilon: number;
    /** Data category queried */
    category: string;
    /** Query purpose */
    purpose: string;
    /** Timestamp of the query */
    timestamp: string;
    /** Number of records included in the aggregation */
    recordCount: number;
  };
  /** Error message if query failed */
  error?: string;
  /** Detailed error information for debugging */
  details?: string;
}

export interface ConsentToken {
  /** The consent token string */
  token: string;
  /** Token expiration timestamp */
  expiresAt: string;
  /** Granted permissions */
  permissions: string[];
}

/**
 * MyPriv360 SDK Client
 * 
 * Provides methods to interact with the MyPriv360 privacy-first data platform,
 * including differential privacy queries and consent token management.
 * 
 * @example
 * ```typescript
 * const client = new MyPriv360({
 *   baseUrl: 'https://api.mypriv360.com',
 *   apiKey: 'your-api-key'
 * });
 * 
 * // Set consent token (obtained from user consent flow)
 * client.setConsentToken('consent-token-from-user');
 * 
 * // Query anonymized health data
 * const result = await client.queryAnonymized({
 *   category: 'health',
 *   purpose: 'research',
 *   epsilon: 1.0,
 *   aggregations: ['mean', 'count']
 * });
 * 
 * if (result.success) {
 *   console.log('Health data mean:', result.data.results.mean);
 *   console.log('Record count:', result.data.results.count);
 * }
 * ```
 */
export class MyPriv360 {
  private baseUrl: string;
  private apiKey: string;
  private consentToken?: string;

  /**
   * Creates a new MyPriv360 SDK client instance.
   * 
   * @param opts - Configuration options for the client
   */
  constructor(opts: MyPriv360Options) {
    if (!opts.baseUrl) {
      throw new Error('baseUrl is required');
    }
    if (!opts.apiKey) {
      throw new Error('apiKey is required');
    }

    this.baseUrl = opts.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    this.apiKey = opts.apiKey;
  }

  /**
   * Sets the consent token for data queries.
   * This token should be obtained from the user's consent flow.
   * 
   * @param token - The consent token from the user
   */
  setConsentToken(token: string): void {
    if (!token) {
      throw new Error('Consent token cannot be empty');
    }
    this.consentToken = token;
  }

  /**
   * Queries anonymized data using differential privacy.
   * 
   * This method performs privacy-preserving aggregations on user data
   * by adding statistical noise to protect individual privacy while
   * maintaining data utility for analysis.
   * 
   * @param opts - Query configuration options
   * @returns Promise resolving to query results or error information
   * 
   * @example
   * ```typescript
   * // Query health data with default epsilon (1.0)
   * const result = await client.queryAnonymized({
   *   category: 'health',
   *   purpose: 'research',
   *   aggregations: ['mean', 'count']
   * });
   * 
   * // Query with custom privacy parameter
   * const privateResult = await client.queryAnonymized({
   *   category: 'activity',
   *   purpose: 'analytics', 
   *   epsilon: 0.5, // More privacy
   *   aggregations: ['mean', 'stddev']
   * });
   * ```
   */
  async queryAnonymized(opts: QueryAnonymizedOptions): Promise<QueryResult> {
    if (!this.consentToken) {
      return {
        success: false,
        error: 'Consent token not set. Call setConsentToken() first.',
        details: 'A consent token is required for all data queries to ensure user privacy consent.'
      };
    }

    if (!opts.category) {
      return {
        success: false,
        error: 'category is required',
        details: 'Specify the data category to query (e.g., "health", "activity", "demographics")'
      };
    }

    if (!opts.purpose) {
      return {
        success: false,
        error: 'purpose is required',
        details: 'Specify the purpose of the query (e.g., "research", "analytics")'
      };
    }

    const epsilon = opts.epsilon ?? 1.0;
    const aggregations = opts.aggregations ?? ['mean'];

    // Validate epsilon value
    if (epsilon <= 0 || epsilon > 10) {
      return {
        success: false,
        error: 'Invalid epsilon value',
        details: 'Epsilon must be between 0 (exclusive) and 10 (inclusive). Lower values provide more privacy.'
      };
    }

    // Validate aggregations
    const supportedAggregations = ['mean', 'sum', 'count', 'min', 'max', 'stddev'];
    const invalidAggregations = aggregations.filter(agg => !supportedAggregations.includes(agg));
    if (invalidAggregations.length > 0) {
      return {
        success: false,
        error: 'Invalid aggregation functions',
        details: `Unsupported aggregations: ${invalidAggregations.join(', ')}. Supported: ${supportedAggregations.join(', ')}`
      };
    }

    try {
      const url = `${this.baseUrl}/api/pdp/query`;
      const requestBody = {
        category: opts.category,
        purpose: opts.purpose,
        epsilon: epsilon,
        aggregations: aggregations,
        consentToken: this.consentToken
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'MyPriv360-SDK/1.0.0'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
          details: responseData.details || 'Request failed with no additional details'
        };
      }

      // Validate response structure
      if (!responseData.success) {
        return {
          success: false,
          error: responseData.error || 'Query failed',
          details: responseData.details || 'No additional error details provided'
        };
      }

      return {
        success: true,
        data: {
          results: responseData.results || {},
          epsilon: responseData.epsilon || epsilon,
          category: opts.category,
          purpose: opts.purpose,
          timestamp: responseData.timestamp || new Date().toISOString(),
          recordCount: responseData.recordCount || 0
        }
      };

    } catch (error) {
      // Handle network errors, JSON parsing errors, etc.
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        error: 'Request failed',
        details: `Network or parsing error: ${errorMessage}`
      };
    }
  }

  /**
   * Gets the current base URL configuration.
   * 
   * @returns The configured base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Checks if a consent token is currently set.
   * 
   * @returns True if consent token is set, false otherwise
   */
  hasConsentToken(): boolean {
    return !!this.consentToken;
  }

  /**
   * Clears the current consent token.
   * This will require setting a new token before making queries.
   */
  clearConsentToken(): void {
    this.consentToken = undefined;
  }
}

// Default export
export default MyPriv360;