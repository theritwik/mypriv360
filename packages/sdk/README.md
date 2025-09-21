# MyPriv360 SDK

[![npm version](https://badge.fury.io/js/%40mypriv360%2Fsdk.svg)](https://badge.fury.io/js/%40mypriv360%2Fsdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official TypeScript/JavaScript SDK for the MyPriv360 privacy-first data platform. This SDK provides a simple interface for performing differential privacy queries while maintaining strong privacy guarantees.

## Features

- 🔒 **Privacy-First**: Built-in differential privacy with configurable epsilon values
- 🛡️ **Consent Management**: Token-based consent verification for all queries
- 📊 **Statistical Aggregations**: Support for mean, sum, count, min, max, and standard deviation
- 🌐 **Cross-Platform**: Works in Node.js, browser, and edge environments
- 📘 **TypeScript Ready**: Full type definitions included
- 🚀 **Zero Dependencies**: Lightweight with no external runtime dependencies

## Installation

```bash
npm install @mypriv360/sdk
```

```bash
yarn add @mypriv360/sdk
```

```bash
pnpm add @mypriv360/sdk
```

## Quick Start

```typescript
import MyPriv360 from '@mypriv360/sdk';

// Initialize the client
const client = new MyPriv360({
  baseUrl: 'https://api.mypriv360.com',
  apiKey: 'your-api-key-here'
});

// Set user consent token (obtained from your consent flow)
client.setConsentToken('user-consent-token');

// Query anonymized health data
const result = await client.queryAnonymized({
  category: 'health',
  purpose: 'research',
  epsilon: 1.0,
  aggregations: ['mean', 'count']
});

if (result.success) {
  console.log('Health data statistics:', result.data.results);
  console.log('Privacy level (ε):', result.data.epsilon);
  console.log('Records included:', result.data.recordCount);
} else {
  console.error('Query failed:', result.error);
}
```

## API Reference

### Constructor

```typescript
const client = new MyPriv360({
  baseUrl: string,    // API endpoint URL
  apiKey: string      // Your API authentication key
});
```

### Methods

#### `setConsentToken(token: string): void`

Sets the consent token required for data queries. This token should be obtained from your user consent flow.

```typescript
client.setConsentToken('user-consent-token-123');
```

#### `queryAnonymized(options): Promise<QueryResult>`

Performs a differential privacy query on user data.

**Parameters:**

```typescript
interface QueryAnonymizedOptions {
  category: string;           // Data category: 'health', 'activity', 'demographics'
  purpose: string;            // Query purpose: 'research', 'analytics', etc.
  epsilon?: number;           // Privacy parameter (0-10, default: 1.0)
  aggregations?: string[];    // Statistics: ['mean', 'sum', 'count', 'min', 'max', 'stddev']
}
```

**Returns:**

```typescript
interface QueryResult {
  success: boolean;
  data?: {
    results: Record<string, number>;  // Statistical results
    epsilon: number;                  // Privacy level used
    category: string;                 // Data category
    purpose: string;                  // Query purpose
    timestamp: string;                // Query timestamp
    recordCount: number;              // Records included
  };
  error?: string;                     // Error message if failed
  details?: string;                   // Additional error details
}
```

#### Utility Methods

```typescript
client.getBaseUrl(): string          // Get configured base URL
client.hasConsentToken(): boolean    // Check if consent token is set
client.clearConsentToken(): void     // Clear current consent token
```

## Usage Examples

### Health Data Analytics

```typescript
// Query average daily steps with high privacy
const stepsResult = await client.queryAnonymized({
  category: 'health',
  purpose: 'fitness-analytics',
  epsilon: 0.5,  // High privacy
  aggregations: ['mean', 'count', 'stddev']
});

if (stepsResult.success) {
  const { mean, count, stddev } = stepsResult.data.results;
  console.log(`Average steps: ${mean.toFixed(0)} ± ${stddev.toFixed(0)} (n=${count})`);
}
```

### Research Query with Multiple Categories

```typescript
// Research query with balanced privacy
const researchData = await client.queryAnonymized({
  category: 'demographics',
  purpose: 'medical-research',
  epsilon: 1.0,
  aggregations: ['count', 'mean']
});
```

### Low-Privacy Analytics

```typescript
// Internal analytics with lower privacy requirements
const analyticsResult = await client.queryAnonymized({
  category: 'activity',
  purpose: 'product-analytics',
  epsilon: 2.0,  // Lower privacy, higher accuracy
  aggregations: ['sum', 'mean', 'max']
});
```

## Privacy Parameters

### Epsilon (ε) Values

The epsilon parameter controls the privacy-accuracy tradeoff:

- **ε = 0.1**: Maximum privacy, significant noise added
- **ε = 0.5**: High privacy, moderate noise
- **ε = 1.0**: Balanced privacy and accuracy (default)
- **ε = 2.0**: Lower privacy, higher accuracy
- **ε = 5.0**: Minimal privacy, maximum accuracy

### Supported Aggregations

| Function | Description | Use Case |
|----------|-------------|----------|
| `mean` | Average value | General statistics |
| `sum` | Total sum | Totals, cumulative data |
| `count` | Number of records | Population counts |
| `min` | Minimum value | Range analysis |
| `max` | Maximum value | Range analysis |
| `stddev` | Standard deviation | Variability analysis |

## Error Handling

The SDK provides detailed error information for troubleshooting:

```typescript
const result = await client.queryAnonymized({
  category: 'health',
  purpose: 'research'
});

if (!result.success) {
  console.error('Error:', result.error);
  console.error('Details:', result.details);
  
  // Common error scenarios:
  // - "Consent token not set" - Call setConsentToken() first
  // - "Invalid epsilon value" - Use value between 0 and 10
  // - "Invalid aggregation functions" - Use supported aggregations
  // - "HTTP 401: Unauthorized" - Check your API key
  // - "HTTP 404: Not Found" - Verify base URL
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import MyPriv360, { 
  QueryAnonymizedOptions, 
  QueryResult, 
  MyPriv360Options 
} from '@mypriv360/sdk';

// Type-safe configuration
const options: MyPriv360Options = {
  baseUrl: 'https://api.mypriv360.com',
  apiKey: process.env.MYPRIV360_API_KEY!
};

const client = new MyPriv360(options);

// Type-safe queries
const queryOpts: QueryAnonymizedOptions = {
  category: 'health',
  purpose: 'research',
  epsilon: 1.0,
  aggregations: ['mean', 'count']
};

const result: QueryResult = await client.queryAnonymized(queryOpts);
```

## Environment Setup

### Node.js

```typescript
import MyPriv360 from '@mypriv360/sdk';

const client = new MyPriv360({
  baseUrl: process.env.MYPRIV360_BASE_URL!,
  apiKey: process.env.MYPRIV360_API_KEY!
});
```

### Browser

```html
<script type="module">
  import MyPriv360 from 'https://unpkg.com/@mypriv360/sdk@latest/dist/index.mjs';
  
  const client = new MyPriv360({
    baseUrl: 'https://api.mypriv360.com',
    apiKey: 'your-api-key'
  });
</script>
```

### Next.js / React

```typescript
// lib/privacy-client.ts
import MyPriv360 from '@mypriv360/sdk';

export const privacyClient = new MyPriv360({
  baseUrl: process.env.NEXT_PUBLIC_MYPRIV360_BASE_URL!,
  apiKey: process.env.MYPRIV360_API_KEY!
});

// components/HealthStats.tsx
import { useState, useEffect } from 'react';
import { privacyClient } from '../lib/privacy-client';

export function HealthStats({ consentToken }: { consentToken: string }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      privacyClient.setConsentToken(consentToken);
      const result = await privacyClient.queryAnonymized({
        category: 'health',
        purpose: 'dashboard',
        aggregations: ['mean', 'count']
      });
      
      if (result.success) {
        setStats(result.data);
      }
    }
    
    fetchStats();
  }, [consentToken]);

  return stats ? (
    <div>
      <p>Average: {stats.results.mean}</p>
      <p>Count: {stats.results.count}</p>
    </div>
  ) : (
    <p>Loading...</p>
  );
}
```

## Best Practices

### 1. Secure API Key Storage

Never expose your API key in client-side code:

```typescript
// ❌ Don't do this
const client = new MyPriv360({
  baseUrl: 'https://api.mypriv360.com',
  apiKey: 'sk_live_abc123' // Exposed in browser!
});

// ✅ Do this instead (server-side)
const client = new MyPriv360({
  baseUrl: process.env.MYPRIV360_BASE_URL!,
  apiKey: process.env.MYPRIV360_API_KEY! // Server environment variable
});
```

### 2. Choose Appropriate Epsilon Values

Consider your privacy requirements:

```typescript
// Medical research - high privacy required
const medicalQuery = {
  category: 'health',
  purpose: 'medical-research',
  epsilon: 0.5  // High privacy
};

// Internal analytics - balanced approach
const analyticsQuery = {
  category: 'activity', 
  purpose: 'product-analytics',
  epsilon: 1.0  // Balanced
};
```

### 3. Handle Consent Token Lifecycle

Properly manage consent tokens:

```typescript
class PrivacyAnalytics {
  private client: MyPriv360;
  
  constructor() {
    this.client = new MyPriv360({
      baseUrl: process.env.MYPRIV360_BASE_URL!,
      apiKey: process.env.MYPRIV360_API_KEY!
    });
  }

  async analyzeWithUserConsent(userId: string, consentToken: string) {
    // Set consent token for this session
    this.client.setConsentToken(consentToken);
    
    try {
      const result = await this.client.queryAnonymized({
        category: 'health',
        purpose: 'analytics'
      });
      
      return result;
    } finally {
      // Clear token after use for security
      this.client.clearConsentToken();
    }
  }
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://docs.mypriv360.com)
- 💬 [Community Forum](https://community.mypriv360.com)
- 🐛 [Issue Tracker](https://github.com/mypriv360/sdk/issues)
- 📧 [Email Support](mailto:support@mypriv360.com)

## Changelog

### v1.0.0

- Initial release
- Differential privacy queries
- Consent token management
- TypeScript support
- Comprehensive error handling