#!/usr/bin/env node

import { testConnection } from './clients/client.js';

/**
 * Test Temporal client connection
 */
async function main() {
  console.log('🚀 reg.ulate.ai - Temporal Client Test');
  console.log('=====================================');
  
  // Test connection
  const result = await testConnection();
  
  if (result.success) {
    console.log('\n🎉 SUCCESS! Temporal is ready for use');
    console.log(`   Namespace: ${result.namespace}`);
    console.log(`   Address: ${result.address}`);
    console.log(`   Active Workflows: ${result.workflowCount}`);
  } else {
    console.log('\n❌ FAILED! Check your configuration');
    console.log(`   Error: ${result.error}`);
    console.log(`   Namespace: ${result.namespace}`);
    console.log(`   Address: ${result.address}`);
    process.exit(1);
  }
}

// Run the test
main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
