# Changelog

All notable changes to the MyPriv360 SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-21

### Added
- Initial release of MyPriv360 SDK
- `MyPriv360` class with full TypeScript support
- Constructor with `baseUrl` and `apiKey` configuration
- `setConsentToken()` method for consent management
- `queryAnonymized()` method for differential privacy queries
- Support for multiple aggregation functions: mean, sum, count, min, max, stddev
- Configurable epsilon (ε) privacy parameter
- Comprehensive error handling and validation
- Built-in network request handling with fetch API
- TypeScript type definitions for all interfaces
- Support for ESM and CommonJS module formats
- Detailed documentation and usage examples
- Automated build system with tsup
- Comprehensive test suite

### Features
- **Privacy-First Design**: Built-in differential privacy with configurable epsilon values
- **Consent Management**: Token-based consent verification for all data queries
- **Statistical Aggregations**: Support for common statistical functions with privacy guarantees
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Cross-Platform**: Works in Node.js, browser, and edge environments
- **Zero Dependencies**: No runtime dependencies for minimal bundle size
- **Error Handling**: Detailed error messages and validation for all operations
- **Developer Experience**: Comprehensive documentation, examples, and TypeScript intellisense

### Supported Aggregations
- `mean` - Average value with differential privacy
- `sum` - Total sum with noise addition
- `count` - Record count with privacy protection
- `min` - Minimum value (with privacy considerations)
- `max` - Maximum value (with privacy considerations)
- `stddev` - Standard deviation with differential privacy

### Supported Data Categories
- `health` - Health and medical data
- `activity` - Activity and fitness data
- `demographics` - Demographic information
- Custom categories as supported by the API

### Privacy Parameters
- Epsilon (ε) range: 0.1 to 10.0
- Default epsilon: 1.0 (balanced privacy/accuracy)
- Automatic validation and error handling

### API Compatibility
- Compatible with MyPriv360 API v1.0
- Supports `/api/pdp/query` endpoint
- Bearer token authentication
- JSON request/response format

### Build Outputs
- ESM module: `dist/index.mjs`
- CommonJS module: `dist/index.js`
- TypeScript declarations: `dist/index.d.ts`
- Source maps included for debugging

### Documentation
- Comprehensive README with usage examples
- TypeScript type definitions with JSDoc comments
- Example file with real-world usage patterns
- Test suite demonstrating all features

## [Unreleased]

### Planned
- Batch query support for multiple categories
- Caching layer for repeated queries
- Streaming query results for large datasets
- Additional aggregation functions (median, percentiles)
- Query result visualization helpers
- Integration with popular frameworks (React hooks, Vue composables)
- Performance monitoring and metrics
- Advanced error recovery mechanisms

---

For more information, visit the [MyPriv360 Documentation](https://docs.mypriv360.com) or [GitHub Repository](https://github.com/mypriv360/sdk).