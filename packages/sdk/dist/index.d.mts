/**
 * MyPriv360 SDK - Privacy-first data platform client
 *
 * This SDK provides a TypeScript interface for interacting with the MyPriv360
 * privacy-first data platform, enabling differential privacy queries and
 * consent management.
 */
interface MyPriv360Options {
    /** Base URL of the MyPriv360 API (e.g., 'https://api.mypriv360.com') */
    baseUrl: string;
    /** API key for authentication */
    apiKey: string;
}
interface QueryAnonymizedOptions {
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
interface QueryResult {
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
interface ConsentToken {
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
declare class MyPriv360 {
    private baseUrl;
    private apiKey;
    private consentToken?;
    /**
     * Creates a new MyPriv360 SDK client instance.
     *
     * @param opts - Configuration options for the client
     */
    constructor(opts: MyPriv360Options);
    /**
     * Sets the consent token for data queries.
     * This token should be obtained from the user's consent flow.
     *
     * @param token - The consent token from the user
     */
    setConsentToken(token: string): void;
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
    queryAnonymized(opts: QueryAnonymizedOptions): Promise<QueryResult>;
    /**
     * Gets the current base URL configuration.
     *
     * @returns The configured base URL
     */
    getBaseUrl(): string;
    /**
     * Checks if a consent token is currently set.
     *
     * @returns True if consent token is set, false otherwise
     */
    hasConsentToken(): boolean;
    /**
     * Clears the current consent token.
     * This will require setting a new token before making queries.
     */
    clearConsentToken(): void;
}

export { ConsentToken, MyPriv360, MyPriv360Options, QueryAnonymizedOptions, QueryResult, MyPriv360 as default };
