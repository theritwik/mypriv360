/**
 * Test the WebAssembly-enhanced differential privacy utilities
 */

import * as WasmDP from './wasm';

async function testWasmPrivacy() {
  console.log('🧪 Testing WebAssembly-Enhanced Differential Privacy');
  
  // Initialize the module
  console.log('\n📦 Initializing WASM module...');
  await WasmDP.initialize();
  
  // Check implementation info
  const info = WasmDP.getImplementationInfo();
  console.log('📊 Implementation Info:', JSON.stringify(info, null, 2));
  console.log(`✅ Using WebAssembly: ${info.usingWasm ? 'YES' : 'NO (fallback to JS)'}`);
  
  // Test Laplace mechanism
  console.log('\n🎲 Testing Laplace Mechanism:');
  const originalValue = 100;
  const epsilon = 0.1;
  
  for (let i = 0; i < 5; i++) {
    const noisyValue = WasmDP.laplaceMechanism(originalValue, epsilon);
    console.log(`  Original: ${originalValue}, Noisy: ${noisyValue.toFixed(2)}, Noise: ${(noisyValue - originalValue).toFixed(2)}`);
  }
  
  // Test Gaussian mechanism
  console.log('\n📊 Testing Gaussian Mechanism:');
  const delta = 0.00001;
  
  for (let i = 0; i < 5; i++) {
    const noisyValue = WasmDP.gaussianMechanism(originalValue, epsilon, delta);
    console.log(`  Original: ${originalValue}, Noisy: ${noisyValue.toFixed(2)}, Noise: ${(noisyValue - originalValue).toFixed(2)}`);
  }
  
  // Test DP mean
  console.log('\n📈 Testing Differentially Private Mean:');
  const testData = [25, 30, 28, 35, 22, 40, 33, 29, 31, 27];
  const trueMean = testData.reduce((a, b) => a + b) / testData.length;
  const privateMean = WasmDP.dpMean(testData, 0.5, 18, 65);
  
  console.log(`  True mean: ${trueMean.toFixed(2)}`);
  console.log(`  Private mean: ${privateMean.toFixed(2)}`);
  console.log(`  Noise added: ${(privateMean - trueMean).toFixed(2)}`);
  
  // Test record anonymization
  console.log('\n🔒 Testing Record Anonymization:');
  const users = [
    { id: 1, name: 'Alice', email: 'alice@test.com', age: 28, city: 'NYC' },
    { id: 2, name: 'Bob', email: 'bob@test.com', age: 34, city: 'SF' },
    { id: 3, name: 'Carol', email: 'carol@test.com', age: 29, city: 'LA' }
  ];
  
  const anonymized = WasmDP.anonymizeRecords(users, ['id', 'name', 'email']);
  console.log('  Original records:', users.length);
  console.log('  Anonymized sample:', JSON.stringify(anonymized[0], null, 2));
  
  // Test epsilon validation
  console.log('\n✅ Testing Epsilon Validation:');
  try {
    WasmDP.validateEpsilon(0.1, 'test');
    console.log('  Valid epsilon (0.1): ✅');
  } catch (error) {
    console.log('  Epsilon validation failed:', error instanceof Error ? error.message : String(error));
  }
  
  try {
    WasmDP.validateEpsilon(-0.1, 'test');
    console.log('  Invalid epsilon (-0.1): Should not reach here');
  } catch (error) {
    console.log('  Invalid epsilon (-0.1): ❌ Caught error correctly');
  }
  
  // Performance comparison
  console.log('\n⚡ Performance Comparison:');
  const iterations = 10000;
  
  console.time('WASM Laplace sampling');
  for (let i = 0; i < iterations; i++) {
    WasmDP.laplaceMechanism(100, 0.1);
  }
  console.timeEnd('WASM Laplace sampling');
  
  console.log('\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testWasmPrivacy().catch(console.error);
}

export default testWasmPrivacy;