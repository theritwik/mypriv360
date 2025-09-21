/**
 * Example usage of the WebAssembly-enhanced differential privacy library
 * This demonstrates the identical interface to the JS version with potential WASM acceleration
 */

import * as PrivacyWasm from './wasm';

export async function exampleUsage() {
  // Initialize the WASM module (optional but recommended for performance)
  console.log('🔧 Initializing privacy module...');
  await PrivacyWasm.initialize();
  
  // Check if WASM acceleration is active
  const info = PrivacyWasm.getImplementationInfo();
  console.log(`⚡ Using WebAssembly acceleration: ${info.usingWasm ? 'YES' : 'NO'}`);
  console.log(`🔒 Available features: ${info.features.join(', ')}`);
  
  // Example 1: Protect a user count with differential privacy
  console.log('\n📊 Example 1: Private User Count');
  const actualUserCount = 1247;
  const epsilon = 0.1; // Strong privacy
  const privateCount = PrivacyWasm.laplaceMechanism(actualUserCount, epsilon);
  
  console.log(`Actual count: ${actualUserCount}`);
  console.log(`Private count: ${Math.round(privateCount)}`);
  console.log(`Noise magnitude: ${Math.abs(privateCount - actualUserCount).toFixed(1)}`);
  
  // Example 2: Compute private average age
  console.log('\n👥 Example 2: Private Average Age');
  const ages = [23, 34, 28, 45, 31, 29, 38, 26, 33, 41, 27, 35, 30, 42, 25];
  const trueAverage = ages.reduce((a, b) => a + b) / ages.length;
  const privateAverage = PrivacyWasm.dpMean(ages, 0.5, 18, 65);
  
  console.log(`True average age: ${trueAverage.toFixed(1)} years`);
  console.log(`Private average age: ${privateAverage.toFixed(1)} years`);
  
  // Example 3: Advanced Gaussian mechanism (stronger privacy guarantees)
  console.log('\n🎯 Example 3: Gaussian Mechanism');
  const salary = 75000;
  const epsilonGaussian = 0.1;
  const delta = 0.00001; // Failure probability
  const privateSalary = PrivacyWasm.gaussianMechanism(salary, epsilonGaussian, delta);
  
  console.log(`Actual salary: $${salary.toLocaleString()}`);
  console.log(`Private salary: $${Math.round(privateSalary).toLocaleString()}`);
  
  // Example 4: Data anonymization
  console.log('\n🔐 Example 4: Record Anonymization');
  const sensitiveRecords = [
    { 
      employeeId: 'EMP001', 
      name: 'Alice Johnson', 
      email: 'alice@company.com', 
      department: 'Engineering',
      salary: 95000,
      age: 29
    },
    { 
      employeeId: 'EMP002', 
      name: 'Bob Smith', 
      email: 'bob@company.com', 
      department: 'Marketing',
      salary: 78000,
      age: 34
    },
    { 
      employeeId: 'EMP003', 
      name: 'Carol Davis', 
      email: 'carol@company.com', 
      department: 'Engineering',
      salary: 102000,
      age: 31
    }
  ];
  
  // Remove direct identifiers for data sharing
  const anonymizedRecords = PrivacyWasm.anonymizeRecords(
    sensitiveRecords, 
    ['employeeId', 'name', 'email']
  );
  
  console.log('Original record count:', sensitiveRecords.length);
  console.log('Anonymized sample:', {
    department: anonymizedRecords[0].department,
    salary: anonymizedRecords[0].salary,
    age: anonymizedRecords[0].age
  });
  
  // Example 5: Validate privacy parameters
  console.log('\n✅ Example 5: Parameter Validation');
  try {
    PrivacyWasm.validateEpsilon(0.05, 'salary analysis');
    console.log('✓ Valid epsilon for salary analysis');
  } catch (error) {
    console.log('✗ Invalid epsilon:', error instanceof Error ? error.message : String(error));
  }
  
  // Performance demonstration
  console.log('\n⚡ Performance Test:');
  const startTime = performance.now();
  const iterations = 1000;
  
  for (let i = 0; i < iterations; i++) {
    PrivacyWasm.laplaceMechanism(Math.random() * 1000, 0.1);
  }
  
  const endTime = performance.now();
  const avgTime = (endTime - startTime) / iterations;
  
  console.log(`Processed ${iterations} privacy operations`);
  console.log(`Average time per operation: ${avgTime.toFixed(3)}ms`);
  console.log(`Implementation: ${info.usingWasm ? 'WebAssembly' : 'JavaScript fallback'}`);
  
  return {
    usingWasm: info.usingWasm,
    performanceMs: avgTime,
    features: info.features
  };
}

// Export for use in other modules
export default exampleUsage;

// Run example if executed directly
if (require.main === module) {
  exampleUsage().then(result => {
    console.log('\n📋 Summary:', result);
  }).catch(console.error);
}