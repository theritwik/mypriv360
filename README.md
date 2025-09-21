# MyPriv360 Privacy-First Data Platform

A privacy-by-design platform implementing differential privacy, consent management, and secure data access controls.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (Next.js)                            │
├─────────────────────────┬───────────────────────┬───────────────────────────┤
│    Dashboard UI         │   Consent Management  │   Admin Interface        │
│  - Data visualizations │  - Category selection  │  - Policy management     │
│  - Privacy controls     │  - Scope definitions   │  - User administration   │
└─────────────────────────┴───────────────────────┴───────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Layer (Next.js App Router)                   │
├──────────────────┬──────────────────┬──────────────────┬───────────────────┤
│   /api/consent   │   /api/data      │     /api/pdp     │    /api/auth      │
│  - Issue tokens │  - Register data │ - Private queries│ - Authentication  │
│  - Revoke access │  - Data ingress  │ - DP algorithms  │ - Session mgmt    │
└──────────────────┴──────────────────┴──────────────────┴───────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Core Libraries                                   │
├──────────────────┬──────────────────┬──────────────────┬───────────────────┤
│   Differential   │   JWT Utilities  │   HTTP Utilities │   Database Layer  │
│    Privacy       │  - Token issue   │  - Error handling│   (Prisma ORM)    │
│  - Laplace mech  │  - Verification  │  - Response fmt  │  - User models    │
│  - DP algorithms │  - Expiry checks │  - Validation    │  - Consent policies│
└──────────────────┴──────────────────┴──────────────────┴───────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          External SDK Package                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  @mypriv360/sdk - TypeScript SDK for external applications                 │
│  - Token-based authentication                                              │
│  - Differential privacy queries                                            │
│  - Type-safe API interactions                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Database                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Users │ ConsentPolicies │ ConsentTokens │ DataCategories │ SampleData      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL database
- TypeScript 5+

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mypriv360"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"
JWT_SECRET="your-jwt-secret-for-consent-tokens"

# Optional: Development
NODE_ENV="development"
```

### Local Development Scripts

```bash
# Install dependencies
npm install

# Database setup
npm run db:migrate          # Run database migrations
npm run db:generate         # Generate Prisma client
npm run db:push            # Push schema changes (development)
npm run db:studio          # Open Prisma Studio GUI

# Development server
npm run dev                # Start Next.js development server (port 3000)

# Testing
npm test                   # Run test suite with Vitest
npm run test:ui           # Open Vitest UI
npm run test:coverage     # Generate test coverage report

# Build & Production
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Run ESLint

# SDK Development (in packages/sdk/)
cd packages/sdk
npm run build             # Build SDK package
npm run test              # Test SDK functionality
npm run examples          # Run SDK examples
```

## Data Categories & Policies

### Adding New Data Categories

1. **Database Seed** (for initial setup):
```typescript
// prisma/seed.ts
const categories = [
  { key: 'health', name: 'Health & Medical Data' },
  { key: 'location', name: 'Location Data' },
  { key: 'biometric', name: 'Biometric Information' },
  { key: 'behavioral', name: 'Behavioral Analytics' }
];
```

2. **API Endpoint** (runtime):
```bash
curl -X POST http://localhost:3000/api/consent/categories \
  -H "Content-Type: application/json" \
  -d '{"key": "financial", "name": "Financial Information"}'
```

### Creating Consent Policies

```bash
curl -X POST http://localhost:3000/api/consent/policies \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "categoryKey": "health",
    "status": "GRANTED",
    "scopes": ["read", "analytics"],
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

## Token Management & Data Access

### 1. Issue Consent Token

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/consent/issue \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_12345",
    "purpose": "health-research-study",
    "categories": ["health", "demographics"],
    "scopes": ["read:health:vitals", "read:demographics:age"],
    "ttlMinutes": 1440
  }' \
  | jq '.token'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1737504000
}
```

### 2. Query Data with Differential Privacy

**cURL Example:**
```bash
# Set token from previous step
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3000/api/pdp/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT AVG(heart_rate) FROM health_data WHERE age > 18",
    "epsilon": 1.0,
    "categories": ["health"]
  }'
```

**Response:**
```json
{
  "success": true,
  "result": 72.3,
  "epsilon_used": 1.0,
  "record_count": 1250,
  "query_id": "query_abc123"
}
```

### 3. Using the TypeScript SDK

**Installation:**
```bash
npm install @mypriv360/sdk
```

**Basic Usage:**
```typescript
import MyPriv360 from '@mypriv360/sdk';

// Initialize client
const client = new MyPriv360({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-consent-token-here'
});

// Query anonymized data
const result = await client.queryAnonymized({
  categories: ['health', 'demographics'],
  aggregation: 'mean',
  column: 'heart_rate',
  filters: { age: { gte: 18, lte: 65 } },
  epsilon: 1.0
});

console.log(`Average heart rate: ${result.value}`);
// Average heart rate: 72.3

// Register new data
await client.registerData({
  userId: 'user_123',
  category: 'health',
  data: { heart_rate: 75, timestamp: new Date() }
});
```

**Advanced SDK Usage:**
```typescript
// Batch operations
const results = await Promise.all([
  client.queryAnonymized({
    categories: ['health'],
    aggregation: 'mean',
    column: 'heart_rate',
    epsilon: 0.5
  }),
  client.queryAnonymized({
    categories: ['health'],
    aggregation: 'stddev',
    column: 'heart_rate',
    epsilon: 0.5
  })
]);

// Error handling
try {
  const result = await client.queryAnonymized({
    categories: ['restricted_category'],
    aggregation: 'mean',
    column: 'sensitive_data',
    epsilon: 2.0 // High epsilon = low privacy
  });
} catch (error) {
  if (error.code === 'INSUFFICIENT_PRIVACY') {
    console.log('Query rejected: privacy threshold not met');
  }
}
```

## API Reference

### Authentication Endpoints
- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/session` - Get current session

### Consent Management
- `POST /api/consent/issue` - Issue consent token
- `POST /api/consent/revoke` - Revoke consent token
- `GET /api/consent/policies` - List user consent policies
- `POST /api/consent/policies` - Create consent policy
- `GET /api/consent/categories` - List data categories

### Data Operations
- `POST /api/data/register` - Register new data point
- `GET /api/data/categories` - List available categories

### Privacy-Preserving Queries
- `POST /api/pdp/query` - Execute differentially private query

## Privacy Parameters

### Differential Privacy (DP) Configuration

| Epsilon (ε) | Privacy Level | Use Case | Noise Level |
|-------------|---------------|----------|-------------|
| 0.1         | High Privacy  | Sensitive medical data | High |
| 1.0         | Moderate      | General analytics | Medium |
| 10.0        | Low Privacy   | Public statistics | Low |

### Token Expiry Settings

| Purpose | Default TTL | Max TTL | Recommended |
|---------|-------------|---------|-------------|
| Research | 7 days | 30 days | 24 hours |
| Analytics | 1 hour | 24 hours | 8 hours |
| One-time | 15 minutes | 2 hours | 30 minutes |

## Development Guidelines

### Adding New API Endpoints

1. **Create route handler:**
```typescript
// app/api/your-endpoint/route.ts
import { jsonOk, jsonError } from '@/lib/http';
import { verifyConsentToken } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const payload = await verifyConsentToken(token);
    
    // Your logic here
    
    return jsonOk({ result: 'success' });
  } catch (error) {
    return jsonError(401, 'UNAUTHORIZED', 'Invalid token');
  }
}
```

2. **Add corresponding SDK method:**
```typescript
// packages/sdk/src/index.ts
async yourNewMethod(params: YourParams): Promise<YourResult> {
  return this.request('/api/your-endpoint', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}
```

### Testing Strategy

- **Unit Tests**: Core library functions (differential privacy, JWT)
- **Integration Tests**: API endpoints with database
- **SDK Tests**: Client library functionality
- **End-to-End**: Full user workflows

Run specific test suites:
```bash
npm test lib/privacy/differentialPrivacy.test.ts  # Privacy algorithms
npm test lib/jwt.test.ts                         # JWT functionality
npm test lib/http.test.ts                        # HTTP utilities
```

## Troubleshooting

### Styling not showing?

If Tailwind CSS classes aren't rendering properly or styles appear broken:

1. **Stop the development server** (Ctrl+C in terminal)
2. **Delete the Next.js cache**: 
   ```bash
   rm -rf .next
   # On Windows:
   rmdir /s .next
   ```
3. **Restart the development server**:
   ```bash
   npm run dev
   ```
4. **Verify Tailwind classes render** - check that colors, spacing, and layouts display correctly

This clears Next.js build cache that might be preventing Tailwind from processing properly.

### Common Issues

**Database Connection:**
```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Reset database
npm run db:migrate:reset
```

**Token Issues:**
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Check token expiry
curl -X POST http://localhost:3000/api/auth/verify \
  -d "token=your-token-here"
```

**Build Errors:**
```bash
# Clear Next.js cache
rm -rf .next/

# Regenerate Prisma client
npm run db:generate
```

For more detailed documentation, see the individual `/docs` directory or API endpoint documentation at `/api/docs` when running in development mode.