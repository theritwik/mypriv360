/**
 * MyPriv360 SDK Usage Examples
 * 
 * This file demonstrates how to use the MyPriv360 SDK for privacy-first
 * data queries with differential privacy.
 */

import MyPriv360 from './src/index';

// Example 1: Basic Health Data Query
async function basicHealthQuery() {
  // Initialize the SDK client
  const client = new MyPriv360({
    baseUrl: 'http://localhost:3000', // Your MyPriv360 API endpoint
    apiKey: 'your-api-key-here'       // Your API key
  });

  try {
    // Set consent token (obtained from user consent flow)
    client.setConsentToken('user-consent-token-123');

    // Query average health metrics with differential privacy
    const result = await client.queryAnonymized({
      category: 'health',
      purpose: 'research',
      epsilon: 1.0,
      aggregations: ['mean', 'count', 'stddev']
    });

    if (result.success && result.data) {
      console.log('✅ Health Data Query Results:');
      console.log(`   Average: ${result.data.results.mean?.toFixed(2)}`);
      console.log(`   Count: ${result.data.results.count}`);
      console.log(`   Std Dev: ${result.data.results.stddev?.toFixed(2)}`);
      console.log(`   Privacy Level (ε): ${result.data.epsilon}`);
      console.log(`   Records: ${result.data.recordCount}`);
    } else {
      console.error('❌ Query failed:', result.error);
      if (result.details) {
        console.error('   Details:', result.details);
      }
    }
  } catch (error) {
    console.error('❌ SDK Error:', error);
  }
}

// Example 2: High Privacy Research Query
async function highPrivacyResearch() {
  const client = new MyPriv360({
    baseUrl: 'http://localhost:3000',
    apiKey: 'your-api-key-here'
  });

  client.setConsentToken('research-consent-token-456');

  // Use lower epsilon for higher privacy
  const result = await client.queryAnonymized({
    category: 'health', 
    purpose: 'medical-research',
    epsilon: 0.5,  // Higher privacy, more noise
    aggregations: ['mean', 'count']
  });

  if (result.success && result.data) {
    console.log('🔒 High Privacy Research Results:');
    console.log(`   Private Mean: ${result.data.results.mean?.toFixed(2)}`);
    console.log(`   Count: ${result.data.results.count}`);
    console.log(`   Privacy Budget Used: ε=${result.data.epsilon}`);
  }
}

// Example 3: Multiple Category Analytics
async function multiCategoryAnalytics() {
  const client = new MyPriv360({
    baseUrl: 'http://localhost:3000',
    apiKey: 'your-api-key-here'
  });

  client.setConsentToken('analytics-consent-token-789');

  const categories = ['health', 'activity', 'demographics'];
  
  for (const category of categories) {
    console.log(`\n📊 Analyzing ${category} data...`);
    
    const result = await client.queryAnonymized({
      category,
      purpose: 'product-analytics',
      epsilon: 1.5,
      aggregations: ['count', 'mean', 'max']
    });

    if (result.success && result.data) {
      console.log(`   Category: ${category}`);
      console.log(`   Count: ${result.data.results.count}`);
      console.log(`   Mean: ${result.data.results.mean?.toFixed(2)}`);
      console.log(`   Max: ${result.data.results.max?.toFixed(2)}`);
    }
    
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Example 4: Error Handling Best Practices
async function robustQueryWithErrorHandling() {
  const client = new MyPriv360({
    baseUrl: 'http://localhost:3000',
    apiKey: 'your-api-key-here'
  });

  // Check if consent token is set
  if (!client.hasConsentToken()) {
    console.log('Setting consent token...');
    client.setConsentToken('robust-consent-token-101');
  }

  try {
    const result = await client.queryAnonymized({
      category: 'health',
      purpose: 'dashboard',
      epsilon: 2.0,
      aggregations: ['mean', 'count', 'min', 'max']
    });

    if (result.success && result.data) {
      // Process successful result
      console.log('📈 Dashboard Health Metrics:');
      const { results } = result.data;
      
      console.log(`   Range: ${results.min?.toFixed(0)} - ${results.max?.toFixed(0)}`);
      console.log(`   Average: ${results.mean?.toFixed(1)}`);
      console.log(`   Sample Size: ${results.count}`);
      
      return results;
    } else {
      // Handle specific error cases
      switch (result.error) {
        case 'Consent token not set':
          console.error('🔐 Please obtain user consent first');
          break;
        case 'Invalid epsilon value':
          console.error('⚠️ Privacy parameter out of range');
          break;
        default:
          console.error('❌ Query failed:', result.error);
      }
      
      return null;
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return null;
  } finally {
    // Clean up consent token for security
    client.clearConsentToken();
    console.log('🧹 Consent token cleared');
  }
}

// Example 5: Node.js Server Integration
async function serverSideIntegration(userConsentToken: string, userId: string) {
  // In a real application, this would be called from your API route
  const client = new MyPriv360({
    baseUrl: process.env.MYPRIV360_BASE_URL || 'http://localhost:3000',
    apiKey: process.env.MYPRIV360_API_KEY || 'fallback-key'
  });

  // Set user-specific consent token
  client.setConsentToken(userConsentToken);

  // Query user's health data for their dashboard
  const healthStats = await client.queryAnonymized({
    category: 'health',
    purpose: 'user-dashboard',
    epsilon: 1.0,
    aggregations: ['mean', 'count', 'stddev']
  });

  // Query activity data
  const activityStats = await client.queryAnonymized({
    category: 'activity', 
    purpose: 'user-dashboard',
    epsilon: 1.0,
    aggregations: ['sum', 'mean', 'max']
  });

  // Return combined dashboard data
  return {
    userId,
    timestamp: new Date().toISOString(),
    health: healthStats.success ? healthStats.data : null,
    activity: activityStats.success ? activityStats.data : null,
    privacy: {
      consentVerified: true,
      privacyLevel: 'standard'
    }
  };
}

// Example 6: TypeScript Types Usage
import type { QueryAnonymizedOptions, QueryResult } from './src/index';

function createTypedQuery(category: string): QueryAnonymizedOptions {
  return {
    category,
    purpose: 'research',
    epsilon: 1.0,
    aggregations: ['mean', 'count']
  };
}

async function processTypedResult(result: QueryResult): Promise<void> {
  if (result.success && result.data) {
    // TypeScript provides full type safety
    const mean: number = result.data.results.mean ?? 0;
    const count: number = result.data.results.count ?? 0;
    const epsilon: number = result.data.epsilon;
    
    console.log(`Processed ${count} records with mean ${mean} (ε=${epsilon})`);
  }
}

// Run examples (uncomment to test)
async function runExamples() {
  console.log('🚀 MyPriv360 SDK Examples\n');
  
  try {
    await basicHealthQuery();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await highPrivacyResearch();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await robustQueryWithErrorHandling();
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Uncomment to run examples:
// runExamples();

export {
  basicHealthQuery,
  highPrivacyResearch,
  multiCategoryAnalytics,
  robustQueryWithErrorHandling,
  serverSideIntegration,
  createTypedQuery,
  processTypedResult
};